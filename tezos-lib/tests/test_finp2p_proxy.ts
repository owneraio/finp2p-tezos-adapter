import 'mocha'
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
import { encodeOpHash, encodeKey } from '@taquito/utils';
import { InMemorySigner, importKey } from '@taquito/signer'

import * as secp256k1 from 'secp256k1';
import * as crypto from 'crypto';
import { blake2b, createBLAKE2b } from 'hash-wasm';
import { strict as assert } from 'assert';

import * as Finp2pProxy from '../finp2p_proxy'

var debug = false

let utf8 = new TextEncoder()
// utf8.encoding

// This is the account that we will use to sign transactions on Tezos Note that
// this account must also be an admin of the `finp2p_proxy` contract
let account = {
  pkh : "tz1ST4PBJJT1WqwGfAGkcS5w2zyBCmDGdDMz",
  pk : "edpkuDn6QhAiGahpciQicYAgdjoXZTP1hqLRxs9ZN1bLSexJZ5tJVq",
  sk : "edskRmhHemySiAV8gmhiV2UExyynQKv6tMAVgxur59J1ZFGr5dbu3SH2XU9s7ZkQE6NYFFjzNPyhuSxfrfgd476wcJo2Z9GsZS"
}

function log (message?: any, ...optionalParams: any[]) {
  if (debug) { console.log(message, ...optionalParams) }
}


// Initialize Taquito library with node enpoint
// Testnet faucet accounts can be obtained here: https://teztnets.xyz
let Tezos = new TezosToolkit("https://rpc.hangzhounet.teztnets.xyz")

// Tell Taquito to use our private key for signing transactions
Tezos.setSignerProvider(new InMemorySigner(account.sk))

// Initialize FinP2P library
let config: Finp2pProxy.config = {
  admin : account.pkh,
  finp2p_auth_address : 'KT1N2ASxaShJETXs5yarM7rozTq4SwWMKTYY',
  finp2p_fa2_address : 'KT19fMJ34XeivLXDfkSm5cSTfuX9TtjPzQEJ',
  finp2p_proxy_address : 'KT1MvSFwHpSguMi8Ra1q8sey7cx2b7EfWSim',
  debug
}

let FinP2PTezos = new Finp2pProxy.FinP2PTezos(Tezos, config)

// Use same shg for everything
let shg = crypto.randomBytes(32)


async function hashValues (values: any[]) : Promise<Buffer> {
  const h = await createBLAKE2b(256);
  h.init();
  values.forEach((v) => {
    h.update(v);
  })
  return Buffer.from(h.digest('binary'));
}

type finp2p_account = {
  pubKey : Buffer;
  privKey : Buffer;
}

function gen_finp2p_account () : finp2p_account {
  let sk = crypto.randomBytes(32)
  let pk = secp256k1.publicKeyCreate(sk)
  return { pubKey : Buffer.from(pk), privKey : sk }
}

function to_str(x : any) : string {
  if (typeof x === 'string') { return x }
  return JSON.stringify(x)
}

function generateNonce(): Finp2pProxy.finp2p_nonce {
  return {
    nonce : crypto.randomBytes(24) ,
    timestamp : new Date()
  }
}

function nonce_to_bytes(n: Finp2pProxy.finp2p_nonce) : Buffer {
  const buffer = Buffer.alloc(32)
  buffer.fill(n.nonce, 0, 24);
  const t_sec = Math.floor(n.timestamp.getTime() / 1000);
  const t = BigInt(t_sec);
  buffer.writeBigInt64BE(t, 24);
  return buffer;
}

function log_hashgroup (hg : any[]) {
  let to_hex = Finp2pProxy.Michelson.bytes_to_hex
  log("Hash group:")
  hg.forEach((h) => {
    if (h instanceof Buffer) {
      h.toString('hex')
    } else if (h instanceof Uint8Array) {
      log(to_hex(h))
    } else if (typeof h === 'string') {
      log(to_hex(utf8.encode(h)))
    } else {
      log(h)
    }
  })
}

async function mk_issue_tokens(i : {
  dest : finp2p_account;
  asset_id : string,
  amount : number,
  new_token? : {
    token_id : number,
    metadata: any}}) {
  let nonce = generateNonce()
  let nonce_bytes = nonce_to_bytes(nonce)
  let assetGroup = [
    nonce_bytes,
    'issue',
    'finp2p',
    i.asset_id,
    'finId',
    i.dest.pubKey,
    '0x' + i.amount.toString(16)
  ]
  log_hashgroup(assetGroup)
  let assetHashGroup = await hashValues(assetGroup);
  log('AHG:', assetHashGroup.toString('hex'))
  let digest = await hashValues([assetHashGroup, shg])
  log('digest:', digest.toString('hex'))
  let signature = secp256k1.ecdsaSign(digest, i.dest.privKey).signature;
  var new_token_info:
  [Finp2pProxy.fa2_token, MichelsonMap<string, Uint8Array>] | undefined =
    undefined
  if (i.new_token !== undefined) {
    let fa2_token = {
      address : FinP2PTezos.get_fa2_address(),
      id : BigInt(i.new_token.token_id)
    }
    let metadata = new MichelsonMap<string, Uint8Array>()
    Object.entries(i.new_token.metadata).forEach(
      ([k, v]) => metadata.set (k, utf8.encode(to_str(v)))
    )
    new_token_info = [fa2_token, metadata]
  }

  let param: Finp2pProxy.issue_tokens_param = {
    nonce,
    asset_id : utf8.encode(i.asset_id),
    dst_account : '0x01' /* secp256k1 */ + i.dest.pubKey.toString('hex'),
    amount: BigInt(i.amount),
    shg,
    signature: '0x' + (Buffer.from(signature)).toString('hex'),
    new_token_info : new_token_info
  }

  return param
}

async function issue_tokens (i : {
  dest : finp2p_account;
  asset_id : string,
  amount : number,
  new_token? : {
    token_id : number,
    metadata: any}}) {
  let param = await mk_issue_tokens(i)
  log("Issue parameters:", param)
  return await FinP2PTezos.issue_tokens(param)
}

async function mk_transfer_tokens(i : {
  src : finp2p_account;
  dest : Buffer;
  asset_id : string,
  amount : number}) {
  let nonce = generateNonce()
  let nonce_bytes = nonce_to_bytes(nonce)
  let assetGroup = [
    nonce_bytes,
    'transfer',
    'finp2p',
    i.asset_id,
    'finId',
    i.src.pubKey,
    'finId',
    i.dest,
    '0x' + i.amount.toString(16)
  ]
  log_hashgroup(assetGroup)
  let assetHashGroup = await hashValues(assetGroup);
  log('AHG:', assetHashGroup.toString('hex'))
  let digest = await hashValues([assetHashGroup, shg])
  log('digest:', digest.toString('hex'))
  let signature = secp256k1.ecdsaSign(digest, i.src.privKey).signature;

  let param: Finp2pProxy.transfer_tokens_param = {
    nonce,
    asset_id : utf8.encode(i.asset_id),
    src_account : '0x01' /* secp256k1 */ + i.src.pubKey.toString('hex'),
    dst_account : '0x01' /* secp256k1 */ + i.dest.toString('hex'),
    amount: BigInt(i.amount),
    shg,
    signature: '0x' + (Buffer.from(signature)).toString('hex'),
  }

  return param
}

async function transfer_tokens(i : {
  src : finp2p_account;
  dest : Buffer;
  asset_id : string,
  amount : number}) {
  let param = await mk_transfer_tokens(i)
  log("Transfer parameters:", param)
  return await FinP2PTezos.transfer_tokens(param)
}

var accounts : finp2p_account[] = []

describe('FinP2P proxy contract',  () => {

  it('Initialize library',  async () => {

    // Deploy the smart contracts (this is not necessary if the smart contract are
    // already deplopyed on the network we want to use)
    await FinP2PTezos.init({
      operation_ttl : {
        ttl : BigInt(900), // 15 minutes
        allowed_in_the_future : BigInt(120) // 2 minutes
      },
      fa2_metadata : new Map([['symbol', utf8.encode("FP2P")]])
    })

    // This is in case we want to redeploy and change the config
    log('================')
    log(`finp2p_auth_address : '${FinP2PTezos.config.finp2p_auth_address}',`)
    log(`finp2p_fa2_address : '${FinP2PTezos.config.finp2p_fa2_address}',`)
    log(`finp2p_proxy_address : '${FinP2PTezos.config.finp2p_proxy_address}',`)
    log('================')

  })

  it('Generate FinP2P accounts', () => {
    for (let i = 0; i < 10; i++) {
      accounts.push(gen_finp2p_account())
    }
  })

  var asset_id1 = "ORG:102:asset-id1-" + (new Date()).toISOString()
  var asset_id2 = "ORG:102:asset-id2-" + (new Date()).toISOString()
  var asset_id3_utf8 = "ORG:102:asset-طزوس-" + (new Date()).toISOString()

  var token_id1 =  Math.floor((new Date()).getTime() / 1000)

  it('Issue new token ' + asset_id1, async () => {
    let op = await issue_tokens(
      { dest : accounts[0],
        asset_id : asset_id1,
        amount : 150,
        new_token : {
          token_id : token_id1,
          metadata : { symbol : "FP2P1", name : asset_id1, decimals : '0' }
        }})
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Try to issue already issued token', async () => {
    await assert.rejects(
      async () => {
        await issue_tokens(
          { dest : accounts[0],
            asset_id : asset_id1,
            amount : 100,
            new_token : {
              token_id : token_id1,
              metadata : { symbol : "FP2P1", name : asset_id1, decimals : '0' }
            }})
      },
      { message : "FINP2P_ASSET_ALREADY_EXISTS"})
  })

  it('Try to issue with already taken token_id', async () => {
    await assert.rejects(
      async () => {
        await issue_tokens(
          { dest : accounts[0],
            asset_id : asset_id2,
            amount : 1,
            new_token : {
              token_id : token_id1,
              metadata : { symbol : "FP2P2", name : asset_id2, decimals : '0' }
            }})
      },
      { message : "FA2_TOKEN_ALREADY_EXISTS"})
  })

  it('Issue more of same token ', async () => {
    let op = await issue_tokens(
      { dest : accounts[1],
        asset_id : asset_id1,
        amount : 220 })
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Issue new token ' + asset_id2, async () => {
    let op = await issue_tokens(
      { dest : accounts[2],
        asset_id : asset_id2,
        amount : 99999,
        new_token : {
          token_id : token_id1 + 1,
          metadata : { symbol : "FP2P2", name : asset_id2, decimals : '0' }
        }})
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Issue new token with UTF8 asset_id ' + asset_id3_utf8, async () => {
    let op = await issue_tokens(
      { dest : accounts[3],
        asset_id : asset_id3_utf8,
        amount : 2,
        new_token : {
          token_id : token_id1 + 2,
          metadata : { symbol : "FP2P3", name : asset_id3_utf8, decimals : '0' }
        }})
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Transfer 1 token of asset ' + asset_id1, async () => {
    let op = await transfer_tokens(
      { src : accounts[0],
        dest : accounts[3].pubKey,
        asset_id : asset_id1,
        amount : 1})
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Try to transfer more than balance ' + asset_id1, async () => {
    await assert.rejects(
      async () => {
    await transfer_tokens(
      { src : accounts[0],
        dest : accounts[3].pubKey,
        asset_id : asset_id1,
        amount : 99999999999999})
      },
      { message : "FA2_INSUFFICIENT_BALANCE"})
  })

})
