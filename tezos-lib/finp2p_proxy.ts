import {
  BigMapAbstraction,
  MichelsonMap,
  OriginationOperation} from "@taquito/taquito"
import { MichelsonV1Expression } from "@taquito/rpc";
import { getPkhfromPk, encodeKey, validateContractAddress } from '@taquito/utils';
import { TaquitoWrapper, OperationResult } from "./taquito_wrapper";
import { ContractsLibrary } from '@taquito/contracts-library';
import { HttpBackend } from '@taquito/http-utils';
import { b58cdecode, prefix } from '@taquito/utils';

import * as finp2p_proxy_code from '../dist/michelson/finp2p_proxy.json';
import * as fa2_code from '../dist/michelson/fa2.json';
import * as authorization_code from '../dist/michelson/authorization.json';
import * as auth_init from '../dist/michelson/auth_init.json';

/** Interfaces/types for smart contract's entrypoints parameters and storage */

export type address = string
export type nat = bigint
export type key = string
export type bytes = Uint8Array
export type token_amount = bigint
export type asset_id = bytes
export type operation_hash = Uint8Array
export type nonce = Uint8Array
export type timestamp = Date
export type signature = string

let utf8 = new TextEncoder()
let utf8dec = new TextDecoder()

function to_str(x : any) : string {
  if (typeof x === 'string') { return x }
  return JSON.stringify(x)
}

export interface fa2_token {
  address: address;
  id: nat;
}

export interface create_fa2_token {
  address: address;
  id?: nat;
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

export interface create_asset_param {
  asset_id: asset_id;
  new_token_info: [create_fa2_token, MichelsonMap<string, bytes>];
}

export interface issue_tokens_param {
  nonce: finp2p_nonce;
  asset_id: asset_id;
  dst_account: key;
  amount: token_amount;
  shg: bytes;
  signature?: signature;
}

export interface redeem_tokens_param {
  nonce: finp2p_nonce;
  asset_id: asset_id;
  src_account: key;
  amount: token_amount;
  signature: signature;
}

export interface BatchParam {
  kind: 'transfer_tokens' | 'create_asset' | 'issue_tokens' | 'redeem_tokens';
  param: transfer_tokens_param | create_asset_param | issue_tokens_param | redeem_tokens_param;
  kt1? : address;
}

export interface operation_ttl  {
  ttl : bigint, /* in seconds */
  allowed_in_the_future : bigint /* in seconds */
}

export interface proxy_storage {
  operation_ttl: operation_ttl;
  live_operations: BigMapAbstraction;
  finp2p_assets: BigMapAbstraction;
  admin: address;
  next_token_ids: BigMapAbstraction;
}

interface initial_storage {
  operation_ttl: operation_ttl; /* in seconds */
  live_operations: MichelsonMap<bytes, timestamp>;
  finp2p_assets: MichelsonMap<asset_id, fa2_token>;
  admin: address;
  next_token_ids: MichelsonMap<address, nat>;
}

export interface fa2_storage {
  auth_contract : address,
  paused : boolean,
  ledger : BigMapAbstraction,
  operators : BigMapAbstraction,
  token_metadata : BigMapAbstraction,
  total_supply : BigMapAbstraction,
  max_token_id : bigint,
  metadata: MichelsonMap<string, bytes>
}

type op_status =
  'applied' | 'failed' | 'backtracked' | 'skipped'

export interface op_receipt {
  kind: string,
  asset_id: string,
  amount?: bigint;
  src_account? : Buffer,
  dst_account? : Buffer,
  status?: op_status,
  errors?: any,
  block?: string,
  level?: number,
  confirmations?: number,
  confirmed: boolean,
  node_agree?: boolean,
}

/** Auxiliary functions to encode entrypoints' parameters into Michelson */

export namespace Michelson {

  export function bytes_to_hex(b: Uint8Array): string {
    return Buffer.from(b.buffer, b.byteOffset, b.length).toString("hex");
  }

  export function maybe_bytes(k : key) : MichelsonV1Expression {
    if (k.substring(0,2) == '0x') {
      return { bytes : k.substring(2) }
    } else {
      return { string : k }
    }
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

  export function create_fa2_token(token: create_fa2_token): MichelsonV1Expression {
    let id =
      mk_opt(token.id,
             ((id) => { return { int: id.toString() }}))
    return {
      prim: 'Pair',
      args: [
        { /* address */ string: token.address },
        /* id */ id
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
        /* src_account */ maybe_bytes(tt.src_account),
        /* dst_account */ maybe_bytes(tt.dst_account),
        { /* amount */ int: tt.amount.toString() },
        { /* shg */ bytes: bytes_to_hex(tt.shg) },
        /* signature */ maybe_bytes(tt.signature)
      ]
    }
  }

  function mk_opt<T>(v: T | undefined, conv: ((_: T) => MichelsonV1Expression)): MichelsonV1Expression {
    return (v === undefined) ? { prim: 'None' } : { prim: 'Some', args : [conv(v)] }
  }

  function mk_map<K, V>(
    m: Map<K, V>,
    mk_key: ((_: K) => MichelsonV1Expression),
    mk_value: ((_: V) => MichelsonV1Expression)): MichelsonV1Expression {
    let arr = [...m.entries()]
    let res = arr.map(([k, v]) => { return { prim: 'Elt', args: [mk_key(k), mk_value(v)] } })
    return res
  }

  export function create_asset_param(ca : create_asset_param) : MichelsonV1Expression {
    let [fa2t, info] = ca.new_token_info
    let mich_info =
      [...info.entries()]
        .sort(([k1, _v1], [k2, _v2]) => {
          return (new String(k1)).localeCompare(k2)
        })
        .map(([k, b]) => {
          return { prim: 'Elt',
                   args: [
                     { string: k }, { bytes: bytes_to_hex(b) }
                   ] }
        });
    let mich_new_token_info =
      {
        prim: 'Pair',
        args: [
          create_fa2_token(fa2t),
          mich_info
        ]
      }
    return {
      prim: 'Pair',
      args: [
        { /* asset_id */ bytes: bytes_to_hex(ca.asset_id) },
        /* new_token_info */ mich_new_token_info
      ]
    }
  }

  export function issue_tokens_param(it: issue_tokens_param): MichelsonV1Expression {
    let mich_signature =
      mk_opt(it.signature,
             ((s) => { return maybe_bytes(s) }))
    return {
      prim: 'Pair',
      args: [
        /* nonce */ finp2p_nonce(it.nonce),
        { /* asset_id */ bytes: bytes_to_hex(it.asset_id) },
        /* dst_account */ maybe_bytes(it.dst_account),
        { /* amount */ int: it.amount.toString() },
        { /* shg */ bytes: bytes_to_hex(it.shg) },
        /* signature */ mich_signature
      ]
    }
  }

  export function redeem_tokens_param(rt: redeem_tokens_param): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        /* nonce */ finp2p_nonce(rt.nonce),
        { /* asset_id */ bytes: bytes_to_hex(rt.asset_id) },
        /* src_account */ maybe_bytes(rt.src_account),
        { /* amount */ int: rt.amount.toString() },
        /* signature */ maybe_bytes(rt.signature)
      ]
    }
  }

  export function add_accredited_param(addr : address, data : bytes) : MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        { string: addr },
        { bytes: bytes_to_hex(data) }
      ]
    }
  }

  export function get_asset_balance_param(public_key : key, asset_id : asset_id) : MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        maybe_bytes(public_key),
        { bytes: bytes_to_hex(asset_id) }
      ]
    }
  }

}

export interface explorer_url {
  kind : 'TzKT',
  url : string,
}

export interface config {
  url : string,
  admin : address;
  finp2p_proxy_address? : address;
  finp2p_fa2_address? : address;
  finp2p_auth_address? : address;
  debug? : boolean;
  confirmations? : number;
  explorer_url? : explorer_url;
}

export class FinP2PTezos {

  taquito : TaquitoWrapper
  config : config
  contracts : ContractsLibrary

  constructor(config : config) {
    this.taquito = new TaquitoWrapper(config.url, config.debug);
    this.check_config(config);
    this.config = config;
    this.contracts = new ContractsLibrary();
    this.taquito.addExtension(this.contracts);
  }

  check_config (c : config) {
    if (c.finp2p_auth_address !== undefined &&
        validateContractAddress(c.finp2p_auth_address) !== 3) {
        throw new Error("Invalid Auth contract address")
    }
    if (c.finp2p_fa2_address !== undefined &&
        validateContractAddress(c.finp2p_fa2_address) !== 3) {
        throw new Error("Invalid FA2 contract address")
    }
    if (c.finp2p_proxy_address !== undefined &&
        validateContractAddress(c.finp2p_proxy_address) !== 3) {
        throw new Error("Invalid Proxy contract address")
    }
  }

  /**
   * @description Re-export `wait_inclusion` for ease of use.
   * By default, waits for the number of confirmations in the `config`.
   * @see TaquitoWrapper.wait_inclusion for details
  */
  async wait_inclusion(op : OperationResult, confirmations = this.config.confirmations) {
    return await this.taquito.wait_inclusion(op, confirmations)
  }

  async init (p : { operation_ttl : operation_ttl,
                    fa2_metadata : Map<string,bytes> }) {
    var accredit = false
    if (this.config.finp2p_auth_address === undefined) {
      let op = await this.deployFinp2pAuth()
      await op.confirmation()
      this.config.finp2p_auth_address = op.contractAddress
      console.log('Auth', op.contractAddress)
      accredit = true
    }
    if (this.config.finp2p_fa2_address === undefined) {
      if (typeof this.config.finp2p_auth_address === 'string') {
        let op = await this.deployFinp2pFA2(this.config.finp2p_auth_address, p.fa2_metadata)
        await op.confirmation()
        this.config.finp2p_fa2_address = op.contractAddress
        console.log('FA2', op.contractAddress)
      }}
    if (this.config.finp2p_proxy_address === undefined) {
      let op = await this.deployFinp2pProxy(p.operation_ttl)
      await op.confirmation()
      this.config.finp2p_proxy_address = op.contractAddress
      console.log('Proxy', op.contractAddress)
      accredit = true
    }
    this.add_finp2p_contracts();
    if (accredit && typeof this.config.finp2p_proxy_address === 'string') {
      console.log('Adding Proxy to accredited contracts')
      let op = await this.add_accredited(this.config.finp2p_proxy_address,
                                         this.proxy_accreditation)
      await this.taquito.wait_inclusion(op)
    }
  }

  async deployFinp2pProxy(
    operation_ttl : operation_ttl,
    admin = this.config.admin): Promise<OriginationOperation> {
    let initial_storage: initial_storage = {
      operation_ttl,
      live_operations: new MichelsonMap(),
      finp2p_assets: new MichelsonMap(),
      admin,
      next_token_ids: new MichelsonMap(),
    }
    this.taquito.debug("Deploying new FinP2P Proxy smart contract")
    return this.taquito.contract.originate({
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
    this.taquito.debug("Deploying new FinP2P Authorization smart contract")
    return this.taquito.contract.originate({
      code: authorization_code,
      storage: initial_storage
    });
  }

  async deployFinp2pFA2(
    auth_contract = this.config.finp2p_auth_address,
    metadata : Map<string, bytes>
  ): Promise<OriginationOperation> {
    let mich_metadata = new MichelsonMap<string, bytes>()
    metadata.forEach((b, k) => {
      mich_metadata.set(k, b)
    })
    let initial_storage = {
      auth_contract,
      paused : false,
      ledger : new MichelsonMap<[nat, address], nat>(),
      operators : new MichelsonMap<[address, [address, nat]], void>(),
      token_metadata : new MichelsonMap<nat, [nat, Map<string, bytes>]>(),
      total_supply : new MichelsonMap<nat, nat>(),
      max_token_id : BigInt(0),
      metadata: mich_metadata
    }
    this.taquito.debug("Deploying new FinP2P FA2 asset smart contract")
    return this.taquito.contract.originate({
      code: fa2_code,
      storage: initial_storage
    });
  }

  async add_to_contracts(kt1 : address | undefined) {
    if (kt1 !== undefined) {
      const [script, entrypoints] = await Promise.all([
        this.taquito.rpc.getNormalizedScript(kt1),
        this.taquito.rpc.getEntrypoints(kt1)
      ])
      this.contracts.addContract({
        kt1: { script, entrypoints }
      })
    }
  }

  add_finp2p_contracts () {
    // Don't wait for promises to resolve
    this.add_to_contracts(this.config.finp2p_auth_address)
    this.add_to_contracts(this.config.finp2p_fa2_address)
    this.add_to_contracts(this.config.finp2p_proxy_address)
  }


  get_contract_address(kind : 'Proxy' | 'FA2' |'Auth',
                       addr : address | undefined,
                       kt1? : address
                      ) : address {
    if (kt1 !== undefined) {
      return kt1
    } else if (addr !== undefined) {
      return addr
    } else {
      throw (new Error(`FinP2P ${kind} contract undefined`))
    }
  }

  get_proxy_address(kt1? : address) : address {
    return this.get_contract_address('Proxy', this.config.finp2p_proxy_address, kt1)
  }

  get_auth_address(kt1? : address) {
    return this.get_contract_address('Auth', this.config.finp2p_auth_address, kt1)
  }

  get_fa2_address(kt1? : address) {
    return this.get_contract_address('FA2', this.config.finp2p_fa2_address, kt1)
  }

  gen_new_token(symbol: string, asset_id: string, token_id?: number): [create_fa2_token, MichelsonMap<string, bytes>]{
    const m: Object = { symbol : symbol, name : asset_id, decimals : '0' };

    let fa2_token = {
      address : this.get_fa2_address(),
      id : (token_id === undefined) ? undefined : BigInt(token_id)
    }
    let metadata = new MichelsonMap<string, Uint8Array>()
    Object.entries(m).forEach(
        ([k, v]) => metadata.set (k, utf8.encode(to_str(v)))
    )
    return [fa2_token, metadata]
  }


  /**
   * @description Call the entry-point `transfer_tokens` of the FinP2P proxy
   * @param tt: the parameters of the transfer
   * @param kt1 : optional address of the contract
   * @returns operation injection result
   */
  async transfer_tokens(
    tt : transfer_tokens_param,
    kt1? : address)
  : Promise<OperationResult> {
    let addr = this.get_proxy_address(kt1)
    // let contract = await this.taquito.contract.at(kt1)
    return this.taquito.send(addr, 'transfer_tokens', Michelson.transfer_tokens_param(tt))
  }

  /**
   * @description Call the entry-point `create_asset` of the FinP2P proxy
   * @param ca: the parameters of the new asset
   * @param kt1 : optional address of the contract
   * @returns operation injection result
   */
  async create_asset(
    ca: create_asset_param,
    kt1? : address)
  : Promise<OperationResult> {
    let addr = this.get_proxy_address(kt1)
    return this.taquito.send(addr, 'create_asset', Michelson.create_asset_param(ca))
  }

  /**
   * @description Call the entry-point `issue_tokens` of the FinP2P proxy
   * @param it: the parameters of the issuance
   * @param kt1 : optional address of the contract
   * @returns operation injection result
   */
  async issue_tokens(
    it: issue_tokens_param,
    kt1? : address)
  : Promise<OperationResult> {
    let addr = this.get_proxy_address(kt1)
    return this.taquito.send(addr, 'issue_tokens', Michelson.issue_tokens_param(it))
  }

  /**
   * @description Call the entry-point `redeem_tokens` of the FinP2P proxy
   * @param rt: the parameters of the redeem
   * @param kt1 : optional address of the contract
   * @returns operation injection result
   */
  async redeem_tokens(
    rt: redeem_tokens_param,
    kt1? : address)
  : Promise<OperationResult> {
    let addr = this.get_proxy_address(kt1)
    return this.taquito.send(addr, 'redeem_tokens', Michelson.redeem_tokens_param(rt))
  }

  /**
   * Retrieve the FinP2P proxy contract current storage
   * @param kt1 : optional address of the proxy contract
   * @returns a promise with the current storage
   */
  async get_proxy_storage(
    kt1?: address)
  : Promise<proxy_storage> {
    let addr = this.get_proxy_address(kt1)
    const contract = await this.taquito.contract.at(addr)
    let storage = await contract.storage() as proxy_storage
    return storage
  }

  /**
   * Retrieve the FinP2P FA2 contract current storage
   * @param kt1 : optional address of the FA2 contract
   * @returns a promise with the current storage
   */
  async get_fa2_storage(
    kt1?: address)
  : Promise<fa2_storage> {
    let addr = this.get_fa2_address(kt1)
    const contract = await this.taquito.contract.at(addr)
    let storage = await contract.storage() as fa2_storage
    return storage
  }


  proxy_accreditation = new Uint8Array([0])
  owner_accreditation = new Uint8Array([1])

  async add_accredited(new_accredited : address,
                       accreditatiaon : Uint8Array,
                       kt1?:address)
  : Promise<OperationResult> {
    let addr = this.get_auth_address(kt1)
    return this.taquito.send(addr, 'add_accredited',
                     Michelson.add_accredited_param(new_accredited,
                                                    accreditatiaon))
  }

  /**
   * @description Make a batch call to the FinP2P proxy
   * @param p: the list of entry-points and parameters (anm optionally contract
   * addresses) with which to call the contract
   * @returns operation injection result
   */
  async batch(
    p: BatchParam[])
  : Promise<OperationResult> {
    let _this = this
    const params = p.map(function (bp) {
      switch (bp.kind) {
        case 'transfer_tokens':
          let v_tt = <transfer_tokens_param>bp.param
          let kt1_tt  = _this.get_proxy_address(bp.kt1)
          return {
            amount : 0,
            to : kt1_tt,
            parameter : { entrypoint: bp.kind,
                          value: Michelson.transfer_tokens_param(v_tt) }
          }
        case 'issue_tokens':
          let v_it = <issue_tokens_param>bp.param
          let kt1_it  = _this.get_proxy_address(bp.kt1)
          return {
            amount : 0,
            to : kt1_it,
            parameter : { entrypoint: bp.kind,
                          value: Michelson.issue_tokens_param(v_it) }
          }
        case 'create_asset':
          let v_ca = <create_asset_param>bp.param
          let kt1_ca  = _this.get_proxy_address(bp.kt1)
          return {
            amount : 0,
            to : kt1_ca,
            parameter : { entrypoint: bp.kind,
                          value: Michelson.create_asset_param(v_ca) }
          }
        case 'redeem_tokens':
          let v_rt = <redeem_tokens_param>bp.param
          let kt1_rt  = _this.get_proxy_address(bp.kt1)
          return {
            amount : 0,
            to : kt1_rt,
            parameter : { entrypoint: bp.kind,
                          value: Michelson.redeem_tokens_param(v_rt) }
          }
        default:
          throw `batch: switch not exhaustive. Case ${bp.kind} not covered`
      }
    })
    return await this.taquito.batch_transactions(params);
  }


  /**
   * @description Retrieve balance of account in a given asset
   * @param public_key: the public key of the account for which to lookup the balance
   * (either as a base58-check encoded string, e.g. 'sppk...' or an hexadecimal
   * representation of the key with the curve prefix and starting with `0x`)
   * @param asset_id: the finId of the asset (encoded)
   * @returns a bigint representing the balance
   * @throws `Error` if the asset id is not known by the contract or if the
   * FA2 is an external FA2 (this last case needs to be implemented)
   */
  async get_asset_balance(
    public_key : key,
    asset_id : asset_id,
    kt1?: address) : Promise<BigInt> {
    let addr = this.get_proxy_address(kt1)
    const contract = await this.taquito.contract.at(addr)
    let pk = public_key
    if (public_key.substring(0,2) == '0x') {
      pk = encodeKey(public_key.substring(2))
    }
    try {
      let balance =
        await contract.contractViews.get_asset_balance(
          [pk, asset_id]
        ).executeView({ viewCaller : addr }) as bigint | undefined
      return (balance || BigInt(0))
    } catch (e : any) {
      const matches = e.message.match(/.*failed with: {\"string\":\"(\w+)\"}/);
      if (matches) {
        throw Error (matches[1])
      } else { throw e }
    }
  }

  async get_tzkt_receipt(op : OperationResult,
                         explorer_url : { kind : 'TzKT', url : string }) :
  Promise<op_receipt> {
    const ops = await (new HttpBackend()).createRequest<any>(
      {
        url: explorer_url.url + '/v1/operations/' + op.hash,
        method: 'GET'
      }
    )
    const get_pk_bytes = (pk : any) => {
      if (pk === undefined) { return undefined }
      return Buffer.from(b58cdecode(pk, prefix['sppk']))
    }
    const op0 = ops[0]
    const v = op0.parameter.value
    return {
      kind : ops[0].parameter.entrypoint as string,
      asset_id : utf8dec.decode(Buffer.from(v.asset_id, 'hex')),
      amount : (v.amount === undefined) ? undefined : BigInt(v.amount as string),
      src_account : get_pk_bytes(v.src_account),
      dst_account : get_pk_bytes(v.dst_account),
      status: op0.status ? op0.status as op_status : undefined,
      block: op0.block ? op0.block as string : undefined,
      level: op0.level ? op0.level as number : undefined,
      errors: op0.errors ? op0.errors : undefined,
      confirmed: false, // placeholder
    }
  }

  async get_receipt(op : OperationResult,
                    { throw_on_fail = true,
                      throw_on_unconfirmed = false,
                      check_with_node = true,
                      throw_on_node_error = false } = {}) :
  Promise<op_receipt> {
    if (this.config.explorer_url === undefined) {
      throw Error('Cannot get receipt, no explorer configured')
    }
    let head_p = this.taquito.rpc.getBlockHeader({ block: 'head' })
    let receipt : op_receipt
    switch (this.config.explorer_url.kind) {
      case 'TzKT':
        receipt = await this.get_tzkt_receipt(op, this.config.explorer_url)
        break
    }
    if (receipt.level) {
      let head = await head_p
      receipt.confirmations = head.level - receipt.level
      receipt.confirmed = (this.config.confirmations === undefined) ||
        (receipt.confirmations >= this.config.confirmations)
    }
    if (check_with_node && receipt.block) {
      try {
        const block = await this.taquito.rpc.getBlock({ block: receipt.block })
        const found =
          block.operations.find((l) => {
            return l.find((block_op) => {
              return (block_op.hash === op.hash)
            })
          })
        if (found) { receipt.node_agree = true }
        else { receipt.node_agree = false }
      } catch (e) {
        if (throw_on_node_error) {
          throw new InclusionError(op, receipt)
        }
      }
      if (receipt.node_agree === false) {
        throw new InclusionError(op, receipt)
      }
    }
    if (throw_on_fail && receipt.status !== 'applied') {
      throw new InclusionError(op, receipt)
    }
    if (throw_on_unconfirmed && !receipt.confirmed) {
      throw new InclusionError(op, receipt)
    }
    return receipt
  }

}


export class InclusionError extends Error {

  op : OperationResult
  receipt : op_receipt

  constructor(op : OperationResult, receipt : op_receipt, ...params: any[]) {
    super(...params)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InclusionError)
    }

    this.name = 'InclusionError'
    this.op = op
    this.receipt = receipt
  }

}
