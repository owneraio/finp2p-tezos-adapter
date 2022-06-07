import {
  OpKind,
  BigMapAbstraction,
  MichelsonMap,
  OriginationOperation,
  Signer,
  TransferParams,
} from '@taquito/taquito';
import { BlockResponse, MichelsonV1Expression } from '@taquito/rpc';
import { encodeKey, validateContractAddress } from '@taquito/utils';
import {
  TaquitoWrapper,
  BatchResult,
  OperationResult,
  contractAddressOfOpHash,
} from './taquito_wrapper';
import { ContractsLibrary } from '@taquito/contracts-library';
import { HttpBackend } from '@taquito/http-utils';
import { b58cdecode, prefix, getPkhfromPk } from '@taquito/utils';
import { ParameterSchema } from '@taquito/michelson-encoder';
const PromiseAny : <T>(_ : Promise<T>[]) => Promise<T> = require('promise-any');
import { BigNumber } from 'bignumber.js';

import * as finp2pProxyCode from '../dist/michelson/finp2p_proxy.json';
import * as fa2Code from '../dist/michelson/fa2.json';
import * as authorizationCode from '../dist/michelson/authorization.json';
import * as authInit from '../dist/michelson/auth_init.json';

/** Interfaces/types for smart contract's entrypoints parameters and storage */

export type Address = string;
export type Nat = bigint;
export type Key = string;
export type Bytes = Uint8Array;
export type TokenAmount = bigint;
export type AssetId = Bytes;
export type Operationhash = Uint8Array;
export type Nonce = Uint8Array;
export type Timestamp = Date;
export type Signature = string;
export type Finp2pHoldId = Bytes;
export type FA2HoldId = Nat;
export type Opaque = Bytes;

let utf8 = new TextEncoder();
let utf8dec = new TextDecoder();

function BigIntNumber(b : BigNumber) : bigint {
  return BigInt('0x' + b.toString(16));
}

function toStr(x : any) : string {
  if (typeof x === 'string') { return x; }
  return JSON.stringify(x);
}

function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop);
}

export interface FA2Token {
  address: Address;
  id: Nat;
}

export interface CreateFA2Token {
  address: Address;
  id?: Nat;
}

export interface Finp2pNonce {
  nonce: Nonce;
  timestamp: Timestamp;
}

export interface HoldInfo {
  fa2_hold_id: FA2HoldId;
  held_asset: AssetId;
}

export interface BalanceInfo {
  balance: bigint;
  on_hold: bigint;
}

export interface TransferTokensParam {
  nonce: Finp2pNonce;
  asset_id: AssetId;
  src_account: Key;
  dst_account: Key;
  amount: TokenAmount;
  shg: Bytes;
  signature: Signature;
}

export interface CreateAssetParam {
  asset_id: AssetId;
  new_token_info: [CreateFA2Token, MichelsonMap<string, Bytes>];
}

export interface IssueTokensParam {
  nonce: Finp2pNonce;
  asset_id: AssetId;
  dst_account: Key;
  amount: TokenAmount;
  shg: Bytes;
  signature?: Signature;
}

export interface RedeemTokensParam {
  nonce: Finp2pNonce;
  asset_id: AssetId;
  src_account: Key;
  amount: TokenAmount;
  signature: Signature;
}

export interface FinIdHoldDst {
  kind: 'FinId',
  key: Key,
}

export interface TezosHoldDst {
  kind : 'Tezos',
  pkh : string,
}

export interface OtherHoldDst {
  kind : 'Other',
  dst : Opaque,
}

export type SupportedHoldDst = FinIdHoldDst | TezosHoldDst;
export type HoldDst = SupportedHoldDst | OtherHoldDst;

export interface HoldAHG {
  nonce : Finp2pNonce;
  asset_id : Bytes;
  src_account : Key;
  dst_account : Key;
  amount : Opaque;
}

export interface HoldSHG {
  asset_type : string;
  asset_id : Bytes;
  src_account_type : Opaque;
  src_account : Opaque;
  dst_account_type? : string;
  dst_account? : HoldDst;
  amount : TokenAmount;
  expiration : Nat;
}

export interface HoldTokensParam {
  hold_id : Finp2pHoldId;
  ahg : HoldAHG;
  shg : HoldSHG;
  signature? : Signature;
}

export interface ReleaseHoldParam {
  hold_id : Finp2pHoldId;
  asset_id? : AssetId;
  amount? : TokenAmount;
  src_account? : Key;
  dst? : HoldDst;
}

export interface RollbackHoldParam {
  hold_id : Finp2pHoldId;
  asset_id? : AssetId;
  amount? : TokenAmount;
  src_account? : Key;
}

type CleanupParam = string[] | undefined;

type BatchEntryPoint =
  | 'transfer_tokens'
  | 'create_asset'
  | 'issue_tokens'
  | 'redeem_tokens'
  | 'hold_tokens'
  | 'release_hold'
  | 'rollback_hold'
  | 'hold_tokens'
  | 'cleanup'
  | 'update_admins'
  | 'add_admins'
  | 'remove_admins'
  | 'update_operation_ttl'
  | 'update_fa2_token';

type ProxyBatchParam =
  | TransferTokensParam
  | CreateAssetParam
  | IssueTokensParam
  | RedeemTokensParam
  | HoldTokensParam
  | ReleaseHoldParam
  | RollbackHoldParam
  | CleanupParam
  | Address[]
  | Address[]
  | Address[]
  | OperationTTL
  | [AssetId, FA2Token];

export interface BatchParam {
  kind: BatchEntryPoint;
  param: ProxyBatchParam;
  kt1? : Address;
}

export interface OperationTTL  {
  ttl : bigint, /* in seconds */
  allowed_in_the_future : bigint /* in seconds */
}

export interface ProxyStorage {
  operation_ttl: OperationTTL;
  live_operations: BigMapAbstraction;
  finp2p_assets: BigMapAbstraction;
  admins: Address[];
  next_token_ids: BigMapAbstraction;
  holds: BigMapAbstraction;
  escrow_totals: BigMapAbstraction;
  external_addresses: BigMapAbstraction;
}

interface InitialProxyStorage {
  operation_ttl: OperationTTL; /* in seconds */
  live_operations: MichelsonMap<Bytes, Timestamp>;
  finp2p_assets: MichelsonMap<AssetId, FA2Token>;
  admins: Address[];
  next_token_ids: MichelsonMap<Address, Nat>;
  holds: MichelsonMap<Finp2pHoldId, HoldInfo>;
  escrow_totals: MichelsonMap<[Key, FA2Token], TokenAmount>;
  external_addresses: MichelsonMap<Key, Address>;
}

export interface FA2Storage {
  auth_contract : Address,
  paused : boolean,
  ledger : BigMapAbstraction,
  operators : BigMapAbstraction,
  token_metadata : BigMapAbstraction,
  total_supply : BigMapAbstraction,
  max_token_id : BigNumber,
  metadata : BigMapAbstraction,
  max_hold_id : BigNumber,
  holds : BigMapAbstraction,
  holds_totals : BigMapAbstraction,
}

type OpStatus =
  'applied' | 'failed' | 'backtracked' | 'skipped';

export interface OpReceipt {
  kind: 'Receipt',
  entrypoint: string,
  assetId: string,
  amount?: bigint;
  srcAccount? : Buffer,
  dstAccount? : Buffer,
  status?: OpStatus,
  errors?: any,
  block?: string,
  level?: number,
  confirmations?: number,
  confirmed: boolean,
}

export interface OpPendingReceipt {
  kind: 'PendingReceipt'
  reason: string,
  confirmations?: number,
  confirmed: boolean,
}

/** Auxiliary functions to encode entrypoints' parameters into Michelson */

export namespace Michelson {

  export function bytesToHex(b: Uint8Array): string {
    return Buffer.from(b.buffer, b.byteOffset, b.length).toString('hex');
  }

  export function maybeBytes(k : Key) : MichelsonV1Expression {
    if (k.substring(0, 2) == '0x') {
      return { bytes : k.substring(2) };
    } else {
      return { string : k };
    }
  }

  function mkOpt<T>(v: T | undefined, conv: ((_: T) => MichelsonV1Expression)): MichelsonV1Expression {
    return (v === undefined) ? { prim: 'None' } : { prim: 'Some', args : [conv(v)] };
  }

  // function mkMap<K, V>(
  //   m: Map<K, V>,
  //   mkKey: ((_: K) => MichelsonV1Expression),
  //   mkValue: ((_: V) => MichelsonV1Expression)): MichelsonV1Expression {
  //   let arr = [...m.entries()];
  //   let res = arr.map(([k, v]) => { return { prim: 'Elt', args: [mkKey(k), mkValue(v)] }; });
  //   return res;
  // }

  export function fa2Token(token: FA2Token): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        { /* address */ string: token.address },
        { /* id */ int: token.id.toString() },
      ],
    };
  }

  export function boolean(b: boolean): MichelsonV1Expression {
    return {
      prim: b ? 'True' : 'False',
    };
  }

  export function createFa2Token(token: CreateFA2Token): MichelsonV1Expression {
    let id =
      mkOpt(token.id,
        (tid => { return { int: tid.toString() };}));
    return {
      prim: 'Pair',
      args: [
        { /* address */ string: token.address },
        /* id */ id,
      ],
    };
  }

  export function finp2pNonce(n: Finp2pNonce): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        { /* nonce */ bytes: bytesToHex(n.nonce) },
        { /* timestamp */ string: n.timestamp.toISOString() },
      ],
    };
  }

  export function transferTokensParam(tt: TransferTokensParam): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        /* nonce */ finp2pNonce(tt.nonce),
        { /* asset_id */ bytes: bytesToHex(tt.asset_id) },
        /* src_account */ maybeBytes(tt.src_account),
        /* dst_account */ maybeBytes(tt.dst_account),
        { /* amount */ int: tt.amount.toString() },
        { /* shg */ bytes: bytesToHex(tt.shg) },
        /* signature */ maybeBytes(tt.signature),
      ],
    };
  }

  export function createAssetParam(ca : CreateAssetParam) : MichelsonV1Expression {
    let [fa2t, info] = ca.new_token_info;
    let michInfo =
      [...info.entries()]
        .sort(([k1], [k2]) => {
          return (new String(k1)).localeCompare(k2);
        })
        .map(([k, b]) => {
          return { prim: 'Elt',
            args: [
              { string: k }, { bytes: bytesToHex(b) },
            ] };
        });
    let michNewTokenInfo =
      {
        prim: 'Pair',
        args: [
          createFa2Token(fa2t),
          michInfo,
        ],
      };
    return {
      prim: 'Pair',
      args: [
        { /* asset_id */ bytes: bytesToHex(ca.asset_id) },
        /* new_token_info */ michNewTokenInfo,
      ],
    };
  }

  export function issueTokensParam(it: IssueTokensParam): MichelsonV1Expression {
    let michSignature =
      mkOpt(it.signature,
        (s => { return maybeBytes(s); }));
    return {
      prim: 'Pair',
      args: [
        /* nonce */ finp2pNonce(it.nonce),
        { /* asset_id */ bytes: bytesToHex(it.asset_id) },
        /* dst_account */ maybeBytes(it.dst_account),
        { /* amount */ int: it.amount.toString() },
        { /* shg */ bytes: bytesToHex(it.shg) },
        /* signature */ michSignature,
      ],
    };
  }

  export function redeemTokensParam(rt: RedeemTokensParam): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        /* nonce */ finp2pNonce(rt.nonce),
        { /* asset_id */ bytes: bytesToHex(rt.asset_id) },
        /* src_account */ maybeBytes(rt.src_account),
        { /* amount */ int: rt.amount.toString() },
        /* signature */ maybeBytes(rt.signature),
      ],
    };
  }

  export function supportedHoldDst(dst: SupportedHoldDst): MichelsonV1Expression {
    switch (dst.kind) {
      case 'FinId':
        return { prim: 'Left', args: [maybeBytes(dst.key)] };
      case 'Tezos':
        return { prim: 'Right', args: [maybeBytes(dst.pkh)] };
    }
  }

  export function holdDst(dst: HoldDst): MichelsonV1Expression {
    switch (dst.kind) {
      case 'Other' :
        return {
          prim: 'Right',
          args: [{ bytes: bytesToHex(dst.dst) }],
        };
      default:
        return {
          prim: 'Left',
          args: [supportedHoldDst(dst)],
        };
    }
  }

  export function holdAHG(ahg: HoldAHG): MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        /* nonce */ finp2pNonce(ahg.nonce),
        { /* asset_id */ bytes: bytesToHex(ahg.asset_id) },
        /* src_account */ maybeBytes(ahg.src_account),
        /* dst_account */ maybeBytes(ahg.dst_account),
        { /* amount */ bytes: bytesToHex(ahg.amount) },
      ],
    };
  }

  export function holdSHG(shg: HoldSHG): MichelsonV1Expression {
    let dstAccountType =
      mkOpt(shg.dst_account_type,
        (s => { return  { string: s }; }));
    let dstAccount =
      mkOpt(shg.dst_account,
        (dst => { return holdDst(dst); }));
    return {
      prim: 'Pair',
      args: [
        { /* asset_type */ string: shg.asset_type },
        { /* asset_id */ bytes: bytesToHex(shg.asset_id) },
        { /* src_account_type */ bytes: bytesToHex(shg.src_account_type) },
        { /* src_account */ bytes: bytesToHex(shg.src_account) },
        dstAccountType,
        dstAccount,
        { /* amount */ int: shg.amount.toString() },
        { /* expiration */ int : shg.expiration.toString() },
      ],
    };
  }

  export function holdTokensParam(ht: HoldTokensParam): MichelsonV1Expression {
    let michSignature =
      mkOpt(ht.signature,
        (s => { return maybeBytes(s); }));
    return {
      prim: 'Pair',
      args: [
        { /* hold_id */ bytes: bytesToHex(ht.hold_id) },
        /* ahg */ holdAHG(ht.ahg),
        /* shg */ holdSHG(ht.shg),
        /* signature */ michSignature,
      ],
    };
  }

  export function releaseHoldParam(eh: ReleaseHoldParam): MichelsonV1Expression {
    let assetId = mkOpt(eh.asset_id, (s => { return { bytes : bytesToHex(s) }; }));
    let amount = mkOpt(eh.amount, (s => { return { int : s.toString() }; }));
    let srcAccount = mkOpt(eh.src_account, (s => { return maybeBytes(s); }));
    let dstAccount = mkOpt(eh.dst, (d => { return holdDst(d); }));
    return {
      prim: 'Pair',
      args: [
        { /* hold_id */ bytes: bytesToHex(eh.hold_id) },
        assetId,
        amount,
        srcAccount,
        dstAccount,
      ],
    };
  }

  export function rollbackHoldParam(rh: RollbackHoldParam): MichelsonV1Expression {
    let assetId = mkOpt(rh.asset_id, (s => { return { bytes : bytesToHex(s) }; }));
    let amount = mkOpt(rh.amount, (s => { return { int : s.toString() }; }));
    let srcAccount = mkOpt(rh.src_account, (s => { return maybeBytes(s); }));
    return {
      prim: 'Pair',
      args: [
        { /* hold_id */ bytes: bytesToHex(rh.hold_id) },
        assetId,
        amount,
        srcAccount,
      ],
    };
  }

  export function addAccreditedParam(addr : Address, data : Bytes) : MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        { string: addr },
        { bytes: bytesToHex(data) },
      ],
    };
  }

  export function getAssetBalanceParam(publicKey : Key, assetId : AssetId) : MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        maybeBytes(publicKey),
        { bytes: bytesToHex(assetId) },
      ],
    };
  }

  export function cleanupParam(ophs : string[]) : MichelsonV1Expression {
    return ophs.map(bytes => {
      return { bytes };
    });
  }

  export function updateAdminsParam(addrs : Address[]) : MichelsonV1Expression {
    return addrs.map(addr => { return { string: addr };});
  }
  export const addAdminsParam = updateAdminsParam;
  export const removeAdminsParam = updateAdminsParam;

  export function updateOperationTtlParam(
    { ttl, allowed_in_the_future } : OperationTTL,
  ) : MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        { /* ttl */ int: ttl.toString() },
        { /* allowed_in_the_future */ int: allowed_in_the_future.toString() },
      ],
    };
  }

  export function updateFa2TokenParam([assetId, token] : [AssetId, FA2Token])
    : MichelsonV1Expression {
    return {
      prim: 'Pair',
      args: [
        { bytes: bytesToHex(assetId) },
        fa2Token(token),
      ],
    };
  }

}

export interface CallOptions {
  kt1? : Address,
  sender? : Address,
  cleanup? : boolean,
  minCleanup? : number,
}

export interface Explorer {
  kind : 'TzKT' | 'tzstats',
  url : string,
}

export interface Config {
  url : string,
  admins : Address[];
  finp2pProxyAddress? : Address;
  finp2pFA2Address? : Address;
  finp2pAuthAddress? : Address;
  debug? : boolean;
  confirmations? : number;
  explorers? : Explorer[];
  autoCleanup? : boolean;
  minCleanup? : number;
}


export class ReceiptError extends Error {

  op : OperationResult;

  receipts : OpReceipt[];

  constructor(op : OperationResult, receipts : OpReceipt[], ...params: any[]) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ReceiptError);
    }

    this.name = 'ReceiptError';
    this.op = op;
    this.receipts = receipts;
  }

}


export class FinP2PTezos {

  taquito : TaquitoWrapper;

  config : Config;

  contracts : ContractsLibrary;

  default_sender : Address;

  defaultCallOptions : CallOptions = {
    cleanup : true,
    minCleanup : 8,
  };

  // internal counter to choose source in a round robin manner
  private counter : number;

  constructor(config : Config) {
    this.checkConfig(config);
    this.config = config;
    this.contracts = new ContractsLibrary();
    this.taquito = new TaquitoWrapper(config.url, config.debug);
    this.taquito.addExtension(this.contracts);
    if (this.config.minCleanup !== undefined) {
      this.defaultCallOptions.minCleanup = this.config.minCleanup;
    }
    if (this.config.autoCleanup !== undefined) {
      this.defaultCallOptions.cleanup = this.config.autoCleanup;
    }
    // this.defaultCallOptions.sender = config.admins[0];
    this.default_sender = config.admins[0];
    this.counter = 0;
  }

  checkConfig(c : Config) {
    if (c.finp2pAuthAddress !== undefined &&
        validateContractAddress(c.finp2pAuthAddress) !== 3) {
      throw new Error('Invalid Auth contract address');
    }
    if (c.finp2pFA2Address !== undefined &&
        validateContractAddress(c.finp2pFA2Address) !== 3) {
      throw new Error('Invalid FA2 contract address');
    }
    if (c.finp2pProxyAddress !== undefined &&
        validateContractAddress(c.finp2pProxyAddress) !== 3) {
      throw new Error('Invalid Proxy contract address');
    }
  }

  public async registerSigner(signer : Signer, source? : string) {
    if (source == undefined)
      source = await signer.publicKeyHash();
    await this.taquito.registerSigner(signer, source);
    if (source == this.default_sender) {
      this.taquito.setSignerProvider(signer);
    }
  }

  public async init(p : { operationTTL : OperationTTL,
    fa2Metadata : Object }) {
    var accredit = false;
    if (this.config.finp2pAuthAddress === undefined) {
      let op = await this.deployFinp2pAuth();
      await this.taquito.waitInclusion(op);
      let addr = contractAddressOfOpHash(op.hash);
      this.config.finp2pAuthAddress = addr;
      console.log('Auth', addr);
      accredit = true;
    }
    if (this.config.finp2pFA2Address === undefined) {
      if (typeof this.config.finp2pAuthAddress === 'string') {
        let op = await this.deployFinp2pFA2(p.fa2Metadata, this.config.finp2pAuthAddress);
        await this.taquito.waitInclusion(op);
        let addr = contractAddressOfOpHash(op.hash);
        this.config.finp2pFA2Address = addr;
        console.log('FA2', addr);
      }
    }
    if (this.config.finp2pProxyAddress === undefined) {
      let op = await this.deployFinp2pProxy(p.operationTTL);
      await this.taquito.waitInclusion(op);
      let addr = contractAddressOfOpHash(op.hash);
      this.config.finp2pProxyAddress = addr;
      console.log('Proxy', addr);
      accredit = true;
    }
    this.addFinp2pContracts();
    if (accredit && typeof this.config.finp2pProxyAddress === 'string') {
      console.log('Adding Proxy to accredited contracts');
      let op = await this.addAccredited(this.config.finp2pProxyAddress,
        this.proxyAccreditation);
      await this.taquito.waitInclusion(op);
    }
  }

  /**
   * @description Re-export `waitInclusion` for ease of use and check that it
   * is successful. * By default, waits for the number of confirmations in the
   * `config`.
   * @see TaquitoWrapper.waitInclusion for details
  */
  async waitInclusion(op : BatchResult, confirmations = this.config.confirmations) {
    const result = await this.taquito.waitInclusion(op, confirmations);
    const [blockOp,,] = result;
    blockOp.contents.map(o => {
      if (!hasOwnProperty(o, 'metadata')
        || o.metadata === undefined
        || !hasOwnProperty(o.metadata, 'operation_result')
        || o.metadata.operation_result === undefined ) {
        // Not a manager operation, or the metadata is not available in the node (unlikely)
        // Consider operation as successful.
        return;
      }
      if (o.metadata.operation_result.status === 'applied') {
        return;
      }
      throw new Error(
        `Operation is included as ${o.metadata.operation_result.status}, ` +
          `with errors: ${JSON.stringify(o.metadata.operation_result.errors)}`);
    });
    return result;
  }


  async deployFinp2pProxy(
    operation_ttl : OperationTTL,
    admins = this.config.admins,
  ): Promise<OriginationOperation> {
    let initialStorage: InitialProxyStorage = {
      operation_ttl,
      live_operations: new MichelsonMap(),
      finp2p_assets: new MichelsonMap(),
      admins : [...admins], // clone admins because of reordering
      next_token_ids: new MichelsonMap(),
      holds : new MichelsonMap(),
      escrow_totals : new MichelsonMap(),
      external_addresses : new MichelsonMap(),
    };
    this.taquito.debug('Deploying new FinP2P Proxy smart contract');
    return this.taquito.contract.originate({
      code: finp2pProxyCode,
      storage: initialStorage,
    });
  }

  async deployFinp2pAuth(
    admin = this.config.admins[0],
  ): Promise<OriginationOperation> {
    let initialStorage = {
      storage: {
        admin,
        accredited : new MichelsonMap(),
      },
      authorize : authInit[2].args[0], // code
    };
    this.taquito.debug('Deploying new FinP2P Authorization smart contract');
    return this.taquito.contract.originate({
      code: authorizationCode,
      storage: initialStorage,
    });
  }

  async deployFinp2pFA2(
    metadata : Object,
    auth_contract = this.config.finp2pAuthAddress,
  ): Promise<OriginationOperation> {
    if (!metadata.hasOwnProperty('permissions')) {
      (metadata as any).permissions =
        {
          operator: 'owner-or-operator',
          receiver: 'owner-no-hook',
          sender: 'owner-no-hook',
          custom: {
            tag: 'finp2p2_authorization',
            'config-api': auth_contract },
        };
    }
    if (!metadata.hasOwnProperty('interfaces')) {
      (metadata as any).interfaces = [ 'TZIP-012' ];
    }
    if (!metadata.hasOwnProperty('version')) {
      (metadata as any).version = '0.1';
    }
    let michMetadata = new MichelsonMap<string, Bytes>();
    Object.entries(metadata).forEach(
      ([k, v]) => michMetadata.set(k, utf8.encode(toStr(v))),
    );
    let initialStorage = {
      auth_contract,
      paused : false,
      ledger : new MichelsonMap<[Nat, Address], Nat>(),
      operators : new MichelsonMap<[Address, [Address, Nat]], void>(),
      token_metadata : new MichelsonMap<Nat, [Nat, Map<string, Bytes>]>(),
      total_supply : new MichelsonMap<Nat, Nat>(),
      max_token_id : BigInt(0),
      metadata: michMetadata,
      max_hold_id : BigInt(0),
      holds : new MichelsonMap(),
      holds_totals : new MichelsonMap(),
    };
    this.taquito.debug('Deploying new FinP2P FA2 asset smart contract');
    return this.taquito.contract.originate({
      code: fa2Code,
      storage: initialStorage,
    });
  }

  async addToContracts(kt1 : Address | undefined) {
    if (kt1 !== undefined) {
      const [script, entrypoints] = await Promise.all([
        this.taquito.rpc.getNormalizedScript(kt1),
        this.taquito.rpc.getEntrypoints(kt1),
      ]);
      let contract : any = {};
      contract[kt1] = { script, entrypoints };
      this.contracts.addContract(contract);
    }
  }

  addFinp2pContracts() {
    // Don't wait for promises to resolve
    this.addToContracts(this.config.finp2pAuthAddress);
    this.addToContracts(this.config.finp2pFA2Address);
    this.addToContracts(this.config.finp2pProxyAddress);
  }


  getContractAddress(kind : 'Proxy' | 'FA2' | 'Auth',
    addr : Address | undefined,
    kt1? : Address,
  ) : Address {
    if (kt1 !== undefined) {
      return kt1;
    } else if (addr !== undefined) {
      return addr;
    } else {
      throw (new Error(`FinP2P ${kind} contract undefined`));
    }
  }

  getProxyAddress(kt1? : Address) : Address {
    return this.getContractAddress('Proxy', this.config.finp2pProxyAddress, kt1);
  }

  getAuthAddress(kt1? : Address) {
    return this.getContractAddress('Auth', this.config.finp2pAuthAddress, kt1);
  }

  getFA2Address(kt1? : Address) {
    return this.getContractAddress('FA2', this.config.finp2pFA2Address, kt1);
  }

  genNewToken(symbol: string, assetId: string, tokenId?: number): [CreateFA2Token, MichelsonMap<string, Bytes>]{
    const m: Object = { symbol : symbol, name : assetId, decimals : '0' };

    let fa2Token = {
      address : this.getFA2Address(),
      id : (tokenId === undefined) ? undefined : BigInt(tokenId),
    };
    let metadata = new MichelsonMap<string, Uint8Array>();
    Object.entries(m).forEach(
      ([k, v]) => metadata.set(k, utf8.encode(toStr(v))),
    );
    return [fa2Token, metadata];
  }

  // Call the proxy with the given entry-point / parameter, and insert a cleanup
  // operation before if there are expired operations to cleanup
  async cleanupAndCallProxy(
    entrypoint : BatchEntryPoint,
    param : ProxyBatchParam,
    { sender, kt1, cleanup, minCleanup } : CallOptions = this.defaultCallOptions) : Promise<OperationResult> {
    const addr = this.getProxyAddress(kt1);
    const callParam : BatchParam = {
      kind: entrypoint,
      param,
      kt1: addr,
    };
    let batchParams = [callParam];
    if (cleanup) {
      let expiredOps : string[] = [];
      try {
        expiredOps = await this.getOpsToCleanup(addr);
      } catch (e) {
        this.taquito.debug('Cannot retrieve expired ops, no cleanup');
      }
      if (minCleanup === undefined) {
        throw Error('minCleanup undefined');
      }
      if (expiredOps.length >= minCleanup) {
        const cleanupParam : BatchParam = {
          kind: 'cleanup',
          param : expiredOps,
          kt1: addr,
        };
        batchParams = [cleanupParam, callParam];
      }
    }
    const { hash } = await this.batch(batchParams, sender);
    // Last operation is the one we care about
    const index = batchParams.length - 1;
    return { hash, index };
  }

  /**
   * @description Call the entry-point `transfer_tokens` of the FinP2P proxy
   * @param tt: the parameters of the transfer
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async transferTokens(
    tt : TransferTokensParam,
    options? : CallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('transfer_tokens', tt, options);
  }

  /**
   * @description Call the entry-point `create_asset` of the FinP2P proxy
   * @param ca: the parameters of the new asset
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async createAsset(
    ca: CreateAssetParam,
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('create_asset', ca, options);
  }

  /**
   * @description Call the entry-point `issue_tokens` of the FinP2P proxy
   * @param it: the parameters of the issuance
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async issueTokens(
    it: IssueTokensParam,
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('issue_tokens', it, options);
  }

  /**
   * @description Call the entry-point `redeem_tokens` of the FinP2P proxy
   * @param rt: the parameters of the redeem
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async redeemTokens(
    rt: RedeemTokensParam,
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('redeem_tokens', rt, options);
  }

  /**
   * @description Call the entry-point `hold_tokens` of the FinP2P proxy
   * @param ht: the parameters of the hold
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async holdTokens(
    ht: HoldTokensParam,
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('hold_tokens', ht, options);
  }

  /**
   * @description Call the entry-point `release_hold` of the FinP2P proxy
   * @param eh: the parameters of the release
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async releaseHold(
    eh: ReleaseHoldParam,
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('release_hold', eh, options);
  }

  /**
   * @description Call the entry-point `rollback_hold` of the FinP2P proxy
   * @param rh: the parameters of the rollback
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async rollbackHold(
    rh: RollbackHoldParam,
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('rollback_hold', rh, options);
  }

  /**
   * @description Call the entry-point `update_admins` of the FinP2P proxy
   * @param newAdmins: the new set of administrators (addresses)
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async updateAdmins(
    newAdmins: Address[],
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('update_admins', newAdmins, options);
  }

  /**
   * @description Call the entry-point `add_admins` of the FinP2P proxy
   * @param newAdmins: the new administrators to add
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async addAdmins(
    newAdmins: Address[],
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('add_admins', newAdmins, options);
  }

  /**
   * @description Call the entry-point `remove_admins` of the FinP2P proxy
   * @param admins: the administrators to remove
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async removeAdmins(
    newAdmins: Address[],
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('remove_admins', newAdmins, options);
  }

  /**
   * @description Call the entry-point `update_operation_ttl` of the FinP2P proxy
   * @param op_ttl: the new ttl parameters of the contract
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async updateOperationTTL(
    op_ttl: OperationTTL,
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('update_operation_ttl', op_ttl, options);
  }

  /**
   * @description Call the entry-point `update_fa2_token` of the FinP2P proxy
   * @param assetId: the asset id for which to update the FA2 token
   * @param token: the token id and address of the new FA2 contract
   * @param options : options for the call, including contract address and cleanup
   * @returns operation injection result
   */
  async updateFA2Token(
    assetId: AssetId,
    token: FA2Token,
    options : CallOptions = this.defaultCallOptions)
    : Promise<OperationResult> {
    return this.cleanupAndCallProxy('update_fa2_token', [assetId, token], options);
  }

  /**
   * Retrieve the FinP2P proxy contract current storage
   * @param kt1 : optional address of the proxy contract
   * @returns a promise with the current storage
   */
  async getProxyStorage(
    kt1?: Address)
    : Promise<ProxyStorage> {
    let addr = this.getProxyAddress(kt1);
    const contract = await this.taquito.contract.at(addr);
    let storage = await contract.storage() as ProxyStorage;
    storage.operation_ttl.ttl = BigInt(storage.operation_ttl.ttl); // BigNumber
    storage.operation_ttl.allowed_in_the_future =
      BigInt(storage.operation_ttl.allowed_in_the_future); // BigNumber
    return storage;
  }

  /**
   * Retrieve the FinP2P FA2 contract current storage
   * @param kt1 : optional address of the FA2 contract
   * @returns a promise with the current storage
   */
  async getFA2Storage(
    kt1?: Address)
    : Promise<FA2Storage> {
    let addr = this.getFA2Address(kt1);
    const contract = await this.taquito.contract.at(addr);
    let storage = await contract.storage() as FA2Storage;
    return storage;
  }

  /**
   * Retrieve the ledger big map of an FA2 contract
   * @param addr : address of the FA2 contract
   * @returns a promise with the big map abstraction
   */
  async getFA2Ledger(
    addr: Address)
    : Promise<BigMapAbstraction> {
    const contract = await this.taquito.contract.at(addr);
    let storage = await contract.storage() as any;
    return storage.ledger as BigMapAbstraction;
  }


  proxyAccreditation = new Uint8Array([0]);

  ownerAccreditation = new Uint8Array([1]);

  async addAccredited(newAccredited : Address,
    accreditation : Uint8Array,
    kt1?: Address,
    sender = this.default_sender)
    : Promise<OperationResult> {
    let addr = this.getAuthAddress(kt1);
    return this.taquito.send(addr, 'add_accredited',
      Michelson.addAccreditedParam(newAccredited, accreditation),
      sender);
  }

  async getOpsToCleanup(kt1?: Address) : Promise<string[]>{
    let proxyStorage = await this.getProxyStorage(kt1);
    let ttl = Number(proxyStorage.operation_ttl.ttl);
    let liveOpsBigMapId = parseInt(proxyStorage.live_operations.toString());
    let explorer = this.config.explorers?.find(e => {
      return (e.kind === 'TzKT');
    });
    if (!explorer) {
      throw Error('No TzKT explorer set, cannot get live operations for cleanup');
    }
    let nowSecs = Math.floor((new Date()).getTime() / 1000);
    // Only get expired operations
    let maxDate = new Date((nowSecs - ttl) * 1000);
    let keys = await (new HttpBackend()).createRequest<any>(
      {
        url: `${explorer.url}/v1/bigmaps/${liveOpsBigMapId}/keys`,
        method: 'GET',
        query: {
          active : true,
          limit : 200,
          'value.lt' : maxDate.toISOString(),
        },
      },
    );
    return keys.map((k : any) => { return k.key; }) as string[];
  }

  /**
   * @description Call the entry-point `cleanup` of the FinP2P proxy
   * @param kt1 : optional address of the contract
   * @param ophs: the live operations hashes to cleanup. If this argument
   * is not provided, the 200 first live operations are retrieved from a
   * block explorer.
   * @param sender : address of sender/source for this transaction
   * @returns operation injection result
   */
  async cleanup({ kt1, ophs, sender } : { kt1?: Address, ophs? : string[], sender? : Address } = {}) : Promise<OperationResult> {
    let keys = ophs;
    if (keys === undefined) {
      keys = await this.getOpsToCleanup(kt1);
    }
    let addr = this.getProxyAddress(kt1);
    return this.taquito.send(addr, 'cleanup', Michelson.cleanupParam(keys), sender);
  }

  /**
   * @description Top up XTZ accounts
   * @param accounts : list of accounts to top-up
   * @param topUpAmount : top up each account to this amount in XTZ
   * @param sender : address of sender/source for this transaction
   * @returns operation injection result
   */
  async topUpXTZ(accounts : Address[], topUpAmount: number, sender? : Address) : Promise<BatchResult | undefined> {
    const balances = await Promise.all(accounts.map(async account => {
      return {
        account,
        balance : await this.taquito.rpc.getBalance(account),
      };
    }));
    let params : TransferParams[] = [];
    balances.map(({ account, balance }) => {
      let amountMutez = BigInt(topUpAmount) * BigInt(1e6) - BigIntNumber(balance);
      let amountMutezNumber = Number(amountMutez);
      if (BigInt(amountMutezNumber) != amountMutez) {
        throw Error(`Precision loss ${amountMutezNumber} != ${amountMutez}`);
      }
      let amount = amountMutezNumber / 1e6;
      if (amount > 0) {
        params.push({ to : account, amount, source : sender });
      }
    });
    if (params.length == 0) {
      return;
    }
    return this.taquito.multiTransferXTZ(params);
  }

  /**
   * @description Make a batch call to the FinP2P proxy
   * @param p: the list of entry-points and parameters (anm optionally contract
   * addresses) with which to call the contract
   * @returns operation injection result
   */
  async batch(
    p: BatchParam[],
    source? : Address,
  ) : Promise<BatchResult> {
    let finp2p = this;
    if (source === undefined) {
      // Pick next source in the admins list in a round robin manner
      source = this.config.admins[this.counter++ % this.config.admins.length];
    }
    const params = await Promise.all(p.map(async function (bp) {
      switch (bp.kind) {
        case 'transfer_tokens':
          let vTt = <TransferTokensParam>bp.param;
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.transferTokensParam(vTt) },
          };
        case 'issue_tokens':
          let vIt = <IssueTokensParam>bp.param;
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.issueTokensParam(vIt) },
          };
        case 'create_asset':
          let vCa = <CreateAssetParam>bp.param;
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.createAssetParam(vCa) },
          };
        case 'redeem_tokens':
          let vRt = <RedeemTokensParam>bp.param;
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.redeemTokensParam(vRt) },
          };
        case 'hold_tokens':
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.holdTokensParam(<HoldTokensParam>bp.param) },
          };
        case 'release_hold':
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.releaseHoldParam(<ReleaseHoldParam>bp.param) },
          };
        case 'rollback_hold':
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.rollbackHoldParam(<RollbackHoldParam>bp.param) },
          };
        case 'cleanup':
          let vCl = <CleanupParam>bp.param;
          if (vCl === undefined) {
            vCl = await finp2p.getOpsToCleanup();
          }
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.cleanupParam(vCl) },
          };
        case 'update_admins':
          let newAdminsU = <Address[]>bp.param;
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.updateAdminsParam(newAdminsU) },
          };
        case 'add_admins':
          let newAdminsA = <Address[]>bp.param;
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.addAdminsParam(newAdminsA) },
          };
        case 'remove_admins':
          let adminsR = <Address[]>bp.param;
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.removeAdminsParam(adminsR) },
          };
        case 'update_operation_ttl':
          let ttl = <OperationTTL>bp.param;
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.updateOperationTtlParam(ttl) },
          };
        case 'update_fa2_token':
          let fa2 = <[AssetId, FA2Token]>bp.param;
          return {
            source,
            amount : 0,
            to : finp2p.getProxyAddress(bp.kt1),
            parameter : { entrypoint: bp.kind,
              value: Michelson.updateFa2TokenParam(fa2) },
          };
        default:
          throw Error(`batch: switch not exhaustive. Case ${bp.kind} not covered`);
      }
    }));
    return this.taquito.batchTransactions(params);
  }


  private async callProxyView<T>(
    viewMethod : string, // : (_ :[Key, AssetId]) => OnChainView,
    publicKey : Key,
    assetId : AssetId,
    kt1?: Address,
  ) : Promise<T | undefined> {
    let addr = this.getProxyAddress(kt1);
    const contract = await this.taquito.contract.at(addr);
    let pk = publicKey;
    if (publicKey.substring(0, 2) == '0x') {
      pk = encodeKey(publicKey.substring(2));
    }
    try {
      return await contract.contractViews[viewMethod](
        [pk, assetId],
      ).executeView({ viewCaller : addr }) as T | undefined;
    } catch (e : any) {
      const matches = e.message.match(/.*failed with: {\"string\":\"(\w+)\"}/);
      if (matches) {
        throw Error(matches[1]);
      } else { throw e; }
    }
  }

  private async getFinP2PAssetBalance(
    publicKey : Key,
    assetId : AssetId,
    kt1?: Address) : Promise<bigint> {
    let balance =
      await this.callProxyView<BigNumber>(
        'get_asset_balance', publicKey, assetId, kt1);
    return (BigIntNumber(balance || new BigNumber(0)));
  }

  private async getExternalAssetBalance(
    publicKey : Key,
    assetId : AssetId,
    kt1?: Address) : Promise<bigint> {
    let pk = publicKey;
    if (publicKey.substring(0, 2) == '0x') {
      pk = encodeKey(publicKey.substring(2));
    }
    let proxyStorage = await this.getProxyStorage(kt1);
    let fa2TokenP = proxyStorage.finp2p_assets.get<FA2Token>(Michelson.bytesToHex(assetId));
    // TODO: issue with big map retieval below
    let ownerP = proxyStorage.external_addresses.get<Address>(pk);
    let fa2Token = await fa2TokenP;
    if (fa2Token === undefined) {
      throw (new Error('FINP2P_UNKNOWN_ASSET_ID'));
    }
    let ledger = await this.getFA2Ledger(fa2Token.address);
    let owner = await ownerP;
    if (owner === undefined) {
      owner = getPkhfromPk(pk);
    }
    // Retrieve balance for different kinds of assets, see
    // https://gitlab.com/tezos/tzip/-/blob/master/proposals/tzip-12/tzip-12.md#token-balance-updates
    //
    // Multi asset contract
    //   big_map %ledger (pair address nat) nat
    //   where key is the pair [owner's address, token ID] and value is the
    //   amount of tokens owned.
    async function getBalanceMulti() {
      if (fa2Token === undefined) { return (null as never) ; }
      // TODO: does not work. Taquito only supports big map keys string, int or
      // bool
      const balance = await ledger.get<BigNumber>([owner, fa2Token.id]);
      return (BigIntNumber(balance || new BigNumber(0)));
    }
    // Single asset contract
    //   big_map %ledger address nat
    //   where key is the owner's address and value is the amount of tokens
    //   owned.
    async function getBalanceSingle() {
      if (owner === undefined) { return (null as never) ; }
      const balance = await ledger.get<BigNumber>(owner);
      return (BigIntNumber(balance || new BigNumber(0)));
    }
    // NFT asset contract
    //    big_map %ledger nat address
    //    where key is the token ID and value is owner's address.
    async function getBalanceNFT() {
      if (fa2Token === undefined) { return (null as never) ; }
      const nftOwner = await ledger.get<Address>(Number(fa2Token.id)); // BigMapAbstraction only support number
      if (nftOwner === undefined || nftOwner !== owner) {
        return 0n;
      } else {
        return 1n;
      }
    }
    // Try each of them successively
    return getBalanceMulti()
      .catch(getBalanceSingle)
      .catch(getBalanceNFT);
  }

  private async getAssetFA2Balance(
    publicKey : Key,
    assetId : AssetId,
    kt1?: Address) : Promise<bigint> {
    try {
      // External balance should work for all FA2 assets but is slower than
      // retrieving the balance for a FinP2P asset
      return await this.getFinP2PAssetBalance(publicKey, assetId, kt1);
    } catch (e : any) {
      if (e.message == 'NOT_FINP2P_FA2') {
        return await this.getExternalAssetBalance(publicKey, assetId, kt1);
      } else {
        throw e;
      }
    }
  }

  /**
   * @description Retrieve the total amount of tokens of a given asset on hold
   * for an account
   * @param publicKey: the public key of the account for which to lookup the balance
   * (either as a base58-check encoded string, e.g. 'sppk...' or an hexadecimal
   * representation of the key with the curve prefix and starting with `0x`)
   * @param assetId: the finId of the asset (encoded)
   * @returns a bigint representing the balance
   * @throws `Error` if the asset id is not known by the contract or if the
   * FA2 is an external FA2 (this last case needs to be implemented)
   */
  async getAssetHold(
    publicKey : Key,
    assetId : AssetId,
    kt1?: Address) : Promise<bigint> {
    let balance =
      await this.callProxyView<BigNumber>(
        'get_asset_hold', publicKey, assetId, kt1);
    return (BigIntNumber(balance || new BigNumber(0)));
  }



  private async getFinP2PAssetBalanceInfo(
    publicKey : Key,
    assetId : AssetId,
    kt1?: Address) : Promise<BalanceInfo> {
    let info =
      await this.callProxyView<{ balance : BigNumber, on_hold : BigNumber }>(
        'get_asset_balance_info', publicKey, assetId, kt1);
    if (info === undefined) {
      return { balance : 0n, on_hold : 0n };
    } else {
      return {
        balance : BigIntNumber(info.balance),
        on_hold : BigIntNumber(info.on_hold),
      };
    }
  }

  /**
   * @description Retrieve the balance and tokens on hold of account in a given asset
   * @param publicKey: the public key of the account for which to lookup the balance
   * (either as a base58-check encoded string, e.g. 'sppk...' or an hexadecimal
   * representation of the key with the curve prefix and starting with `0x`)
   * @param assetId: the finId of the asset (encoded)
   * @returns a bigint representing the balance
   * @throws `Error` if the asset id is not known by the contract or if the
   * FA2 is an external FA2 (this last case needs to be implemented)
   */
  async getAssetBalanceInfo(
    publicKey : Key,
    assetId : AssetId,
    kt1?: Address,
  ) : Promise<BalanceInfo> {
    try {
      return await this.getFinP2PAssetBalanceInfo(publicKey, assetId, kt1);
    } catch (e : any) {
      if (e.message == 'NOT_FINP2P_FA2') {
        // If this view fails, it is an external asset
        // TODO: getExternalAssetBalance does not work
        // let balanceP = this.getExternalAssetBalance(publicKey, assetId, kt1)
        let balanceP = this.getAssetFA2Balance(publicKey, assetId, kt1);
        let holdP = this.getAssetHold(publicKey, assetId, kt1);
        let balance = await balanceP;
        let hold = await holdP;
        return {
          balance : balance + hold,
          on_hold : hold,
        };
      } else {
        throw e;
      }
    }
  }

  /**
   * @description Retrieve the spendable balance of account in a given asset, i.e.
   * the balance without the tokens on hold
   * @param publicKey: the public key of the account for which to lookup the balance
   * (either as a base58-check encoded string, e.g. 'sppk...' or an hexadecimal
   * representation of the key with the curve prefix and starting with `0x`)
   * @param assetId: the finId of the asset (encoded)
   * @returns a bigint representing the balance
   * @throws `Error` if the asset id is not known by the contract or if the
   * FA2 is an external FA2 (this last case needs to be implemented)
   */
  async getAssetSpendableBalance(
    publicKey : Key,
    assetId : AssetId,
    kt1?: Address,
  ) : Promise<bigint> {
    const info =
      await this.getAssetBalanceInfo(publicKey, assetId, kt1);
    return (info.balance - info.on_hold);
  }

  /**
   * @description Retrieve balance of account in a given asset
   * @param publicKey: the public key of the account for which to lookup the balance
   * (either as a base58-check encoded string, e.g. 'sppk...' or an hexadecimal
   * representation of the key with the curve prefix and starting with `0x`)
   * @param assetId: the finId of the asset (encoded)
   * @returns a bigint representing the balance
   * @throws `Error` if the asset id is not known by the contract or if the
   * FA2 is an external FA2 (this last case needs to be implemented)
   */
  async getAssetBalance(
    publicKey : Key,
    assetId : AssetId,
    kt1?: Address,
  ) : Promise<bigint> {
    const info =
      await this.getAssetBalanceInfo(publicKey, assetId, kt1);
    return info.balance;
  }

  async getTzktInclusionBlock(op : BatchResult,
    explorer : { kind : 'TzKT', url : string }) :
    Promise<string> {
    const ops = await (new HttpBackend()).createRequest<any>(
      {
        url: explorer.url + '/v1/operations/' + op.hash,
        method: 'GET',
      },
    );
    if (ops === undefined || ops.length == 0 || ops[0].block === undefined) {
      throw new Error('Operation is not known by TzKT');
    }
    return ops[0].block;
  }

  async getTzstatsInclusionBlock(op : BatchResult,
    explorer : { kind : 'tzstats', url : string }) :
    Promise<string> {
    const ops = await (new HttpBackend()).createRequest<any>(
      {
        url: explorer.url + '/explorer/op/' + op.hash,
        method: 'GET',
      },
    );
    if (ops === undefined || ops.length == 0 || ops[0].block === undefined) {
      throw new Error('Operation is not known by tzstats');
    }
    return ops[0].block;
  }

  async getExplorerInclusionBlock(op : BatchResult, explorer : Explorer) :
  Promise<string> {
    switch (explorer.kind) {
      case 'TzKT':
        return this.getTzktInclusionBlock(
          op, explorer as { kind : 'TzKT', url : string },
        );
      case 'tzstats':
        return this.getTzstatsInclusionBlock(
          op, explorer as { kind : 'tzstats', url : string },
        );
    }
  }

  private async getExplorersInclusionBlock(op : BatchResult) :
  Promise<BlockResponse> {
    if (this.config.explorers === undefined || this.config.explorers.length == 0) {
      throw Error('Cannot get inclusion block, no explorers configured');
    }
    let blockHash = await PromiseAny(this.config.explorers.map((explorer) => {
      return this.getExplorerInclusionBlock(op, explorer);
    }));
    return this.taquito.rpc.getBlock({ block: blockHash });
  }

  private async getInclusionBlock(op : BatchResult) : Promise<BlockResponse> {
    const promiseLatestBocks =
      this.taquito.isIncludedInLatestBlocks(op)
        .then(res => {
          if (res === undefined) {
            throw Error('Did not find operation with node');
          }
          return res[1];
        });
    const promiseExplorers = this.getExplorersInclusionBlock(op);
    return PromiseAny([promiseLatestBocks, promiseExplorers]);
  }

  /**
   * @description Get a receipt from an operation result (transaction hash and index)
   * and confirm with node. The inclusion block is retrieved with explorers or the
   * node. The receipt is extracted from the node, with confidence.
   * Note that you need a Tezos node in mode **archive** to retrieve old
   * receipts.
   * @param op: the operation result (hash and index)
   * @param throwOnFail: throws an exception if the operation is not included
   * as "applied" (true by default)
   * @param throwOnUnconfirmed: throws an exception if the operation is not
   * does not have enough confirmations w.r.t the `config` (false by default)
   * @returns a receipt
   * @throws `ReceiptError`
   */
  async getReceipt(op : OperationResult,
    { throwOnFail = true,
      throwOnUnconfirmed = false } = {}) :
    Promise<OpReceipt | OpPendingReceipt> {
    const blockPromise = this.getInclusionBlock(op);
    const headPromise = this.taquito.rpc.getBlockHeader({ block: 'head' });
    let block;
    let head;
    try {
      [block, head] = await Promise.all([blockPromise, headPromise]);
    } catch (e) {
      if (throwOnFail) { throw e;}
      let reason;
      if (e instanceof Error) reason = e.message;
      else reason = String(e);
      return {
        kind : 'PendingReceipt',
        reason,
        confirmed: false,
      };
    }
    let confirmations = head.level - block.header.level;
    // check if the inclusion block is reachable back from head
    const blockHashAtInclLevel =
      await this.taquito.rpc.getBlockHash({ block: `${head.hash}~${confirmations}` });
    if (blockHashAtInclLevel != block.hash) {
      const reason = `Operation (in ${block.hash}) is not included in the main chain `;
      if (throwOnFail) { throw new ReceiptError(op, [], reason); }
      return {
        kind : 'PendingReceipt',
        reason,
        confirmed: false,
      };
    }
    const opContent =
      // manager operations in [3]
      block.operations[3].find(blockOp => {
        return (blockOp.hash === op.hash);
      });
    if (opContent === undefined) {
      throw new ReceiptError(op, [], 'Node could not find operation');
    }
    let op0 = opContent.contents[op.index];
    if (op0.kind !== OpKind.TRANSACTION) {
      throw Error('Operation is not a transaction');
    }
    if (!hasOwnProperty(op0, 'metadata')) {
      throw new ReceiptError(op, [], 'Metadata not known for operation');
    }
    if (throwOnFail && op0.metadata.operation_result.status !== 'applied') {
      throw new
      ReceiptError(op, [],
        `Operation is included with status ${op0.metadata.operation_result.status}`);
    }
    const contract = await this.taquito.contract.at(op0.destination);
    // if ( op0 === undefined ) { throw new ReceiptError(op, [],"No operation") }
    if ( op0.parameters === undefined ) { throw new ReceiptError(op, [], 'No parameters in operation'); }
    let schema = new ParameterSchema(contract.entrypoints.entrypoints[op0.parameters.entrypoint]);
    let v = schema.Execute(op0.parameters.value);
    const getPkBytes = (pk : any) => {
      if (pk == undefined) { return undefined; }
      return Buffer.from(b58cdecode(pk, prefix.sppk));
    };
    const entrypoint = op0.parameters.entrypoint;
    let assetId = v.asset_id;
    let amount = v.amount;
    let srcAccount = v.src_account;
    let dstAccount = v.dst_account;
    switch (entrypoint) {
      case 'release_hold':
        dstAccount = v.dst?.finId;
        break;
      case 'hold_tokens':
        assetId = v.shg?.asset_id;
        amount = v.shg?.amount;
        dstAccount = v.shg?.dst_account?.finId;
        srcAccount = v.ahg?.dst_account;
        break;
    }
    if (!assetId) {
      throw new ReceiptError(
        op, [],
        `Cannot extract assetId from operation ${op0.parameters.entrypoint} with ${JSON.stringify(v)}`,
      );
    }
    let receipt : OpReceipt = {
      kind : 'Receipt',
      entrypoint,
      assetId : utf8dec.decode(Buffer.from(assetId, 'hex')),
      amount : (amount == undefined) ? undefined : BigIntNumber(amount),
      srcAccount : getPkBytes(srcAccount),
      dstAccount : getPkBytes(dstAccount),
      status: op0.metadata.operation_result.status,
      block: block.hash,
      level: block.header.level,
      errors: op0.metadata.operation_result.errors,
      confirmations,
      confirmed: (this.config.confirmations === undefined) ||
        (confirmations >= this.config.confirmations),
    };
    if (throwOnFail && receipt.status !== 'applied') {
      throw new ReceiptError(op, [receipt],
        `Operation is included with status ${receipt.status}`);
    }
    if (throwOnUnconfirmed && !receipt.confirmed) {
      throw new ReceiptError(op, [receipt],
        `Operation is not yet confirmed (${receipt.confirmations}/${this.config.confirmations})`);
    }
    return receipt;

  }


}
