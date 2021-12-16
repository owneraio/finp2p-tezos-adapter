import {
  TezosToolkit,
  BigMapAbstraction,
  MichelsonMap,
  OpKind,
  createTransferOperation,
  TransferParams,
  RPCOperation,
  OriginationOperation,
  createRevealOperation,
  TransactionOperation,
  Operation,
  WalletOperation
} from "@taquito/taquito"
import { defaultRPCOptions, MichelsonV1Expression } from "@taquito/rpc";
import { localForger, LocalForger } from '@taquito/local-forging';
import { encodeOpHash } from '@taquito/utils';
import { assert } from 'console';

import * as finp2p_proxy_code from '../dist/michelson/finp2p_proxy.json';
import * as fa2_code from '../dist/michelson/fa2.json';
import * as authorization_code from '../dist/michelson/authorization.json';
import * as auth_init from '../dist/michelson/auth_init.json';

/** Interfaces/types for smart contract's entrypoints parameters and storage */

type address = string
type nat = bigint
type key = string
type bytes = Uint8Array
type token_amount = bigint
type asset_id = bytes
type operation_hash = Uint8Array
type nonce = Uint8Array
type timestamp = Date
type signature = string

export interface fa2_token {
  address: address;
  id: nat;
}

export interface finp2p_nonce {
  nonce: nonce;
  timestamp: timestamp;
}

export interface transfer_tokens_param {
  nonce: finp2p_nonce;
  asset_id: asset_id;
  src_account: key;
  dst_account: key;
  amount: token_amount;
  shg: bytes;
  signature: signature;
}

export interface issue_tokens_param {
  nonce: finp2p_nonce;
  asset_id: asset_id;
  dst_account: key;
  amount: token_amount;
  shg: bytes;
  signature?: signature;
  new_token_info?: [fa2_token, Map<string, bytes>];
}

export interface redeem_tokens_param {
  nonce: finp2p_nonce;
  asset_id: asset_id;
  src_account: key;
  amount: token_amount;
  signature: signature;
}

export interface BatchParam {
  kind: 'transfer_tokens' | 'issue_tokens' | 'redeem_tokens';
  param: transfer_tokens_param | issue_tokens_param | redeem_tokens_param;
}

export interface storage {
  operation_ttl: nat; /* in seconds */
  live_operations: BigMapAbstraction;
  finp2p_assets: BigMapAbstraction;
  admin: address;
}

interface initial_storage {
  operation_ttl: nat; /* in seconds */
  live_operations: MichelsonMap<bytes, timestamp>;
  finp2p_assets: MichelsonMap<asset_id, fa2_token>;
  admin: address;
}

/** Auxiliary functions to encode entrypoints' parameters into Michelson */

namespace Michelson {

  export function bytes_to_hex(b: Uint8Array): string {
    return Buffer.from(b.buffer).toString("hex");
  }

  export function fa2_token(token: fa2_token): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        { /* address */ string: token.address },
        { /* id */ int: token.id.toString() }
      ]
    }
  }

  export function finp2p_nonce(n: finp2p_nonce): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        { /* nonce */ bytes: bytes_to_hex(n.nonce) },
        { /* timestamp */ string: n.timestamp.toISOString() }
      ]
    }
  }

  export function transfer_tokens_param(tt: transfer_tokens_param): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        /* nonce */ finp2p_nonce(tt.nonce),
        { /* asset_id */ bytes: bytes_to_hex(tt.asset_id) },
        { /* src_account */ string: tt.src_account },
        { /* dst_account */ string: tt.dst_account },
        { /* amount */ int: tt.amount.toString() },
        { /* shg */ bytes: bytes_to_hex(tt.shg) },
        { /* signature */ string: tt.signature }
      ]
    }
  }

  function mk_opt<T>(v: T | undefined, conv: ((_: T) => MichelsonV1Expression)): MichelsonV1Expression {
    return (v === undefined) ? { prim: 'None' } : conv(v)!;
  }

  function mk_map<K, V>(
    m: Map<K, V>,
    mk_key: ((_: K) => MichelsonV1Expression),
    mk_value: ((_: V) => MichelsonV1Expression)): MichelsonV1Expression {
    let arr = [...m.entries()]
    let res = arr.map(([k, v]) => { return { prim: 'Elt', args: [mk_key(k), mk_value(v)] } })
    return res
  }

  export function issue_tokens_param(it: issue_tokens_param): MichelsonV1Expression {
    let mich_signature =
      mk_opt(it.signature,
        ((s) => { return { string: s } }))
    let mich_new_token_info =
      mk_opt(it.new_token_info,
        (([fa2t, info]) => {
          let mich_info = [...info.entries()].map(([k, b]) => {
            return { prim: 'Elt', args: [{ string: k }, { bytes: bytes_to_hex(b) }] }
          });
          return {
            prim: 'Pair',
            args: [
              fa2_token(fa2t),
              mich_info
            ]
          }
        }))
    return {
      prim: 'Pair',
      args: [
        /* nonce */ finp2p_nonce(it.nonce),
        { /* asset_id */ bytes: bytes_to_hex(it.asset_id) },
        { /* dst_account */ string: it.dst_account },
        { /* amount */ int: it.amount.toString() },
        { /* shg */ bytes: bytes_to_hex(it.shg) },
        /* signature */ mich_signature,
        /* new_token_info */ mich_new_token_info
      ]
    }
  }

  export function redeem_tokens_param(rt: redeem_tokens_param): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        /* nonce */ finp2p_nonce(rt.nonce),
        { /* asset_id */ bytes: bytes_to_hex(rt.asset_id) },
        { /* src_account */ string: rt.src_account },
        { /* amount */ int: rt.amount.toString() },
        { /* signature */ string: rt.signature }
      ]
    }
  }

}


/** Some wrapper functions on top of Taquito to make calls, transfer xtz and reveal public keys.
 * With these functions, we have a better control on the operations hashs being injected.
*/

export interface operation_result {
  hash: string;
}

class InjectionError extends Error {

  op : operation_result
  error : any
  
  constructor(op : operation_result, error : any, ...params: any[]) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InjectionError)
    }

    this.name = 'InjectionError'
    // Failed operation
    this.op = op
    this.error = error
  }

}
function toStrRec(input: any): any {
  Object.keys(input).forEach(k => {
    let elt = input[k]
    if (elt === undefined || elt === null) {
      input[k] = undefined
    } else if (typeof elt === 'object') {
      input[k] = toStrRec(elt);
    } else {
      input[k] = elt.toString();
    }
  });
  return input;
}

export interface config {
  admin : address;
  finp2p_proxy_address? : address;
  finp2p_fa2_address? : address;
  finp2p_auth_address? : address;
  debug? : boolean;
}

export class FinP2PTezos {

  tezosToolkit : TezosToolkit
  config : config
  forger : LocalForger

  constructor(tk: TezosToolkit, config : config) {
    this.tezosToolkit = tk;
    // Forge operations locally (instead of using RPCs to the node)
    this.tezosToolkit.setForgerProvider(localForger);
    this.config = config;
    if (this.config.debug === undefined) { this.config.debug = false }
    this.forger = new LocalForger()
  }

  async init (p : { operation_ttl : bigint, fa2_metadata : Map<string,bytes> }) {
    if (this.config.finp2p_auth_address === undefined) {
      let op = await this.deployFinp2pAuth()
      op.confirmation()
      this.config.finp2p_auth_address = op.contractAddress
    }
    if (this.config.finp2p_fa2_address === undefined) {
      if (typeof this.config.finp2p_auth_address === 'string') {
      let op = await this.deployFinp2pFA2(this.config.finp2p_auth_address, p.fa2_metadata)
      op.confirmation()
      this.config.finp2p_fa2_address = op.contractAddress
    }}
    if (this.config.finp2p_proxy_address === undefined) {
      let op = await this.deployFinp2pProxy(p.operation_ttl)
      op.confirmation()
      this.config.finp2p_proxy_address = op.contractAddress
    }
  }

  private debug (message?: any, ...optionalParams: any[]) {
    if (this.config.debug) { console.log(message, optionalParams) }
  }

  async deployFinp2pProxy(
    operation_ttl: bigint,
    admin = this.config.admin): Promise<OriginationOperation> {
    let initial_storage: initial_storage = {
      operation_ttl,
      live_operations: new MichelsonMap(),
      finp2p_assets: new MichelsonMap(),
      admin
    }
    this.debug("Deploying new FinP2P Proxy smart contract")
    return this.tezosToolkit.contract.originate({
      code: finp2p_proxy_code,
      storage: initial_storage
    });
  }

  async deployFinp2pAuth(admin = this.config.admin): Promise<OriginationOperation> {      
    let initial_storage = {
      storage: { 
        admin,
        accredited : new MichelsonMap()
      },
      authorize : auth_init[2].args[0] // code
    }
    this.debug("Deploying new FinP2P Authorization smart contract")
    return this.tezosToolkit.contract.originate({
      code: authorization_code,
      storage: initial_storage
    });
  }

  async deployFinp2pFA2(
    auth_contract = this.config.finp2p_auth_address,
    metadata : Map<string, bytes>
    ): Promise<OriginationOperation> {      
    let mich_metadata = [...metadata.entries()].map(([k, b]) => {
      return { prim: 'Elt', args: [{ string: k }, { bytes: Michelson.bytes_to_hex(b) }] }
    }) 
    let initial_storage = {
      auth_contract,
      pending_admin: { prim : 'None' },
      paused : {prim : 'False'},
      ledger : [],
      operators : [],
      token_metadata : [],
      metadata: mich_metadata
    }
    this.debug("Deploying new FinP2P FA2 asset smart contract")
    return this.tezosToolkit.contract.originate({
      code: fa2_code,
      storage: initial_storage
    });
  }

  private async sign_and_inject (
    kind : 'transaction' | 'origination' | 'revelation', 
    contents: Array<RPCOperation>) {
    let tk = this.tezosToolkit
    let branch = await tk.rpc.getBlockHash({ block: 'head~2' });
    let strop = toStrRec({ branch, contents })
    let forgedOp = await this.forger.forge(strop)
    let signOp = await tk.signer.sign(forgedOp, new Uint8Array([3]));
    let hash = encodeOpHash(signOp.sbytes);
    try {
      let injectedOpHash = await tk.rpc.injectOperation(signOp.sbytes)
      assert(injectedOpHash == hash);
      return { hash }
    } catch (error) {
      throw new InjectionError({ hash }, error, `Error while injecting ${kind}`)
    }
  }

  /** 
   * @description This function allows to reveal an address's public key on the blockchain.
   * The address is supposed to have some XTZ on it for the revelation to work.
   * The functions throws "WalletAlreadyRevealed" if the public key is already
   * revealed.
   * @returns injection result
   */
  async revealWallet(): Promise<operation_result> {
    let tk = this.tezosToolkit
    var opHash = null;
    let estimate = await tk.estimate.reveal();
    if (estimate == undefined) {
      throw "WalletAlreadyRevealed";
    }
    let publicKey = await tk.signer.publicKey();
    let source = await tk.signer.publicKeyHash();
    let revealParams = {
      fee: estimate.suggestedFeeMutez,
      gasLimit: estimate.gasLimit,
      storageLimit: estimate.storageLimit
    };
    let rpcRevealOperation = await createRevealOperation(revealParams, source, publicKey);
    let contract = await tk.rpc.getContract(source);
    let counter = parseInt(contract.counter || '0', 10)
    let contents = [{
      ...rpcRevealOperation,
      source,
      counter: counter + 1
    }]
    return this.sign_and_inject('revelation', contents)
  }


  /**
   * @description Generic auxiliary function for transfers and contracts calls
   * @param transferParams : the transaction's parameters
   * @returns injection result
   */
  async make_transactions(transfersParams: Array<TransferParams>): Promise<operation_result> {
    let tk = this.tezosToolkit
    let source = await tk.signer.publicKeyHash();
    let contract = await tk.rpc.getContract(source);
    let counter = parseInt(contract.counter || '0', 10)
    let contents: Array<RPCOperation> = []
    await Promise.all(
      transfersParams.map(async function (transferParams) {
        let estimate = await tk.estimate.transfer(transferParams);
        const rpcTransferOperation = await createTransferOperation({
          ...transferParams,
          fee: estimate.suggestedFeeMutez,
          gasLimit: estimate.gasLimit,
          storageLimit: estimate.storageLimit
        });
        counter++;
        let v = {
          ...rpcTransferOperation,
          source,
          counter: counter,
        };
        contents.push(v)
      }));
    return this.sign_and_inject('transaction', contents)
  }

  /**
   * @description Instantiation of function `make_call` to transfer the given amount of
   * xtz from an account to the others.
   * @param destinations : the transfers' destinations
   * @param amount: the amount to transfer in Tez (will be converted internally to muTez)
   * @returns operation injection result
   */
  async transfer_xtz(destinations: string[], amount: number): Promise<operation_result> {
    let tk = this.tezosToolkit
    var dests: TransferParams[] = [];
    destinations.forEach(function (dest) {
      let e = { amount: amount, to: dest };
      dests.push(e)
    });
    return await this.make_transactions(dests);
  }

  async send(
    kt1: string,
    entrypoint: string,
    value: MichelsonV1Expression): Promise<operation_result> {
    return await this.make_transactions([{
      amount: 0,
      to: kt1,
      parameter: { entrypoint, value }
    }]);
  }
  // await op.confirmation(confirmations);

  /**
   * @description Call the entry-point `transfer_tokens` of the FinP2P proxy
   * @param kt1 : address of the contract
   * @param tt: the parameters of the transfer
   * @returns operation injection result
   */
  async transfer_tokens(
    kt1: string,
    tt: transfer_tokens_param)
    : Promise<operation_result> {
    let contract = await this.tezosToolkit.contract.at(kt1)
    return this.send(kt1, 'transfer_tokens', Michelson.transfer_tokens_param(tt))
  }

  /**
   * @description Call the entry-point `issue_tokens` of the FinP2P proxy
   * @param this.tezosToolkit : Tezos toolkit
   * @param kt1 : address of the contract
   * @param it: the parameters of the issuance
   * @returns operation injection result
   */
  async issue_tokens(
    kt1: string,
    it: issue_tokens_param)
    : Promise<operation_result> {
    return this.send(kt1, 'issue_tokens', Michelson.issue_tokens_param(it))
  }

  /**
   * @description Call the entry-point `redeem_tokens` of the FinP2P proxy
   * @param tk : Tezos toolkit
   * @param kt1 : address of the contract
   * @param rt: the parameters of the redeem
   * @returns operation injection result
   */
  async redeem_tokens(
    kt1: string,
    rt: redeem_tokens_param)
    : Promise<operation_result> {
    return this.send(kt1, 'redeem_tokens', Michelson.redeem_tokens_param(rt))
  }

  /**
   * Make a batch call to the FinP2P proxy
   * @param kt1 : address of the contract
   * @param p: the list of entry-points and parameters with which to call the contract
   * @returns operation injection result
   */
  async batch(
    kt1: string,
    p: BatchParam[])
    : Promise<operation_result> {
    const l = p.map(function (bp) {
      switch (bp.kind) {
        case 'transfer_tokens':
          let v_tt = <transfer_tokens_param>bp.param
          return { entrypoint: bp.kind, value: Michelson.transfer_tokens_param(v_tt) }
        case 'issue_tokens':
          let v_it = <issue_tokens_param>bp.param
          return { entrypoint: bp.kind, value: Michelson.issue_tokens_param(v_it) }
        case 'redeem_tokens':
          let v_rt = <redeem_tokens_param>bp.param
          return { entrypoint: bp.kind, value: Michelson.redeem_tokens_param(v_rt) }
        default:
          throw `batch: switch not exhaustive. Case ${bp.kind} not covered`
      }
    })
    const params = l.map(function (parameter) {
      return {
        //kind: <OpKind.TRANSACTION>OpKind.TRANSACTION,
        amount: 0,
        to: kt1,
        parameter
      }
    })
    return await this.make_transactions(params);
  }

  /**
   * Retrieve the FinP2P proxy contract current storage
   * @param tk : Tezos toolkit
   * @param kt1 : address of the proxy contract
   * @returns a promise with the current storage
   */
  async storage(
    kt1: string)
    : Promise<storage> {
    const contract = await this.tezosToolkit.contract.at(kt1)
    let storage = await contract.storage() as storage // TODO: convert?
    return storage
  }

  async admin(
    kt1: string,
    stor?: storage
  )
    : Promise<string> {
    let st = (stor == undefined) ? await this.storage(kt1) : stor!
    return st.admin
  }
}