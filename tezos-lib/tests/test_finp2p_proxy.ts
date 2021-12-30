import 'mocha'
import { MichelsonMap } from "@taquito/taquito"
import { InMemorySigner } from '@taquito/signer'

import * as secp256k1 from 'secp256k1';
import * as crypto from 'crypto';
import { createBLAKE2b } from 'hash-wasm';
import { strict as assert } from 'assert';

import '../taquito_wrapper'
import * as Finp2pProxy from '../finp2p_proxy'

let utf8 = new TextEncoder()
// utf8.encoding

// This is the account that we will use to sign transactions on Tezos Note that
// this account must also be an admin of the `finp2p_proxy` contract
// Testnet faucet accounts can be obtained here: https://teztnets.xyz
let account = {
  pkh : "tz1ST4PBJJT1WqwGfAGkcS5w2zyBCmDGdDMz",
  pk : "edpkuDn6QhAiGahpciQicYAgdjoXZTP1hqLRxs9ZN1bLSexJZ5tJVq",
  sk : "edskRmhHemySiAV8gmhiV2UExyynQKv6tMAVgxur59J1ZFGr5dbu3SH2XU9s7ZkQE6NYFFjzNPyhuSxfrfgd476wcJo2Z9GsZS"
}

// Initialize FinP2P library
let config: Finp2pProxy.config = {
  url : "https://rpc.hangzhounet.teztnets.xyz",
  admin : account.pkh,
  finp2p_auth_address : 'KT1QjrVNZrZEGrNfMUNrcQktbDUQnQqSa6xC',
  finp2p_fa2_address : 'KT1EHgvTiafJWkdQXeTENJqFbCUx4EBy8mtk',
  finp2p_proxy_address : 'KT1BN9jjeog53f3QL9w6MvqSTmuYnJDrG5JD',
  // debug : true
}

let FinP2PTezos = new Finp2pProxy.FinP2PTezos(config)

// Tell Taquito to use our private key for signing transactions
FinP2PTezos.taquito.setSignerProvider(new InMemorySigner(account.sk))


function log (message?: any, ...optionalParams: any[]) {
  if (config.debug) { console.log(message, ...optionalParams) }
}


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
  amount : number}) {
  let nonce = generateNonce()
  let nonce_bytes = nonce_to_bytes(nonce)
  let assetGroup = [
    nonce_bytes,
    'issue',
    'finp2p',
    i.asset_id,
    'finId',
    i.dest.pubKey.toString('hex'),
    '0x' + i.amount.toString(16)
  ]
  log_hashgroup(assetGroup)
  let assetHashGroup = await hashValues(assetGroup);
  log('AHG:', assetHashGroup.toString('hex'))
  let digest = await hashValues([assetHashGroup, shg])
  log('digest:', digest.toString('hex'))
  let signature = secp256k1.ecdsaSign(digest, i.dest.privKey).signature;
  let param: Finp2pProxy.issue_tokens_param = {
    nonce,
    asset_id : utf8.encode(i.asset_id),
    dst_account : '0x01' /* secp256k1 */ + i.dest.pubKey.toString('hex'),
    amount: BigInt(i.amount),
    shg,
    signature: '0x' + (Buffer.from(signature)).toString('hex'),
  }

  return param
}

async function issue_tokens (i : {
  dest : finp2p_account;
  asset_id : string,
  amount : number}) {
  let param = await mk_issue_tokens(i)
  log("Issue parameters:", param)
  return await FinP2PTezos.issue_tokens(param)
}

function mk_create_asset (i : {
  asset_id : string,
  metadata: any,
  token_id?: number,
}): Finp2pProxy.create_asset_param {
  let fa2_token  = {
    address : FinP2PTezos.get_fa2_address(),
    id : (i.token_id === undefined) ? undefined : BigInt(i.token_id)
  }
  let metadata = new MichelsonMap<string, Uint8Array>()
  Object.entries(i.metadata).forEach(
    ([k, v]) => metadata.set (k, utf8.encode(to_str(v)))
  )
  let new_token_info : [Finp2pProxy.create_fa2_token, MichelsonMap<string, Uint8Array>] =
    [fa2_token, metadata]
  return {
    asset_id : utf8.encode(i.asset_id),
    new_token_info
  }
}

async function create_asset (i : {
  asset_id : string,
  metadata: any,
  token_id? : number,
}) {
  let param = mk_create_asset(i)
  log("Create parameters:", param)
  return await FinP2PTezos.create_asset(param)
}

async function mk_transfer_tokens(i : {
  src : finp2p_account,
  dest : Buffer,
  asset_id : string,
  amount : number,
  signer? : finp2p_account
}) {
  let nonce = generateNonce()
  let nonce_bytes = nonce_to_bytes(nonce)
  let assetGroup = [
    nonce_bytes,
    'transfer',
    'finp2p',
    i.asset_id,
    'finId',
    i.src.pubKey.toString('hex'),
    'finId',
    i.dest.toString('hex'),
    '0x' + i.amount.toString(16)
  ]
  log_hashgroup(assetGroup)
  let assetHashGroup = await hashValues(assetGroup);
  log('AHG:', assetHashGroup.toString('hex'))
  let digest = await hashValues([assetHashGroup, shg])
  log('digest:', digest.toString('hex'))
  let privKey = (i.signer === undefined) ? i.src.privKey : i.signer.privKey
  let signature = secp256k1.ecdsaSign(digest, privKey).signature;

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
  src : finp2p_account,
  dest : Buffer,
  asset_id : string,
  amount : number,
  signer? : finp2p_account
}) {
  let param = await mk_transfer_tokens(i)
  log("Transfer parameters:", param)
  return await FinP2PTezos.transfer_tokens(param)
}

async function mk_redeem_tokens(i : {
  src : finp2p_account,
  asset_id : string,
  amount : number,
  signer? : finp2p_account}) {
  let nonce = generateNonce()
  let nonce_bytes = nonce_to_bytes(nonce)
  let assetGroup = [
    nonce_bytes,
    'redeem',
    i.asset_id,
    '0x' + i.amount.toString(16)
  ]
  log_hashgroup(assetGroup)
  let assetHashGroup = await hashValues(assetGroup);
  log('AHG:', assetHashGroup.toString('hex'))
  let privKey = (i.signer === undefined) ? i.src.privKey : i.signer.privKey
  let signature = secp256k1.ecdsaSign(assetHashGroup, privKey).signature;

  let param: Finp2pProxy.redeem_tokens_param = {
    nonce,
    asset_id : utf8.encode(i.asset_id),
    src_account : '0x01' /* secp256k1 */ + i.src.pubKey.toString('hex'),
    amount: BigInt(i.amount),
    signature: '0x' + (Buffer.from(signature)).toString('hex'),
  }

  return param
}

async function redeem_tokens(i : {
  src : finp2p_account,
  asset_id : string,
  amount : number,
  signer? : finp2p_account}) {
  let param = await mk_redeem_tokens(i)
  log("Redeem parameters:", param)
  return await FinP2PTezos.redeem_tokens(param)
}

async function get_balance(i : {
  owner : Buffer,
  asset_id : string}) {
  let balance = await FinP2PTezos.get_asset_balance(
    '0x01' /* secp256k1 */ + i.owner.toString('hex'),
    utf8.encode(i.asset_id)
  )
  return Number(balance)
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

  it('Retrieve balance of non-existing asset ' + asset_id1, async () => {
    await assert.rejects(
      async () => {
        await get_balance({ owner : accounts[0].pubKey, asset_id : asset_id1 })
      },
      { message : "FINP2P_UNKNOWN_ASSET_ID"})
  })

  it('Create new asset ' + asset_id1, async () => {
    let op = await create_asset(
      { asset_id : asset_id1,
        metadata : { symbol : "FP2P1", name : asset_id1, decimals : '0' }
        })
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Balance of account[0] should be 0 in ' + asset_id1, async () => {
    let b = await get_balance({ owner : accounts[0].pubKey,
                                    asset_id : asset_id1 })
    assert.equal(b, 0)
  })

  it('Issue 150 tokens of asset ' + asset_id1, async () => {
    let op = await issue_tokens(
      { dest : accounts[0],
        asset_id : asset_id1,
        amount : 150})
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Balance of account[0] should be 150 in ' + asset_id1, async () => {
    let b = await get_balance({ owner : accounts[0].pubKey,
                                    asset_id : asset_id1 })
    assert.equal(b, 150)
  })

  it('Try to create already existing asset', async () => {
    await assert.rejects(
      async () => {
        await create_asset(
          { asset_id : asset_id1,
            metadata : { symbol : "FP2P1", name : asset_id1, decimals : '0' }
          })
      },
      { message : "FINP2P_ASSET_ALREADY_EXISTS"})
  })

  it('Issue 220 more of same token ', async () => {
    let op = await issue_tokens(
      { dest : accounts[1],
        asset_id : asset_id1,
        amount : 220 })
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Balance of account[1] should be 220 in ' + asset_id1, async () => {
    let b = await get_balance({ owner : accounts[1].pubKey,
                                    asset_id : asset_id1 })
    assert.equal(b, 220)
  })

  it('Batch create asset and issue tokens of ' + asset_id2, async () => {
    let op1 =  mk_create_asset ({
      asset_id : asset_id2,
      token_id : token_id1,
      metadata : { symbol : "FP2P2", name : asset_id2, decimals : '0' }
      })
    let op2 = await mk_issue_tokens(
      { dest : accounts[2],
        asset_id : asset_id2,
        amount : 99999
      })
    let ops : Finp2pProxy.BatchParam[] = [
      { kind : 'create_asset',
        param : op1 },
      { kind : 'issue_tokens',
        param : op2 }
    ]
    let op = await FinP2PTezos.batch(ops)
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Balance of account[2] should be 99999 in ' + asset_id2, async () => {
    let b = await get_balance({ owner : accounts[2].pubKey,
                                    asset_id : asset_id2 })
    assert.equal(b, 99999)
  })

  it('Try to create asset with already taken token_id', async () => {
    await assert.rejects(
      async () => {
        await create_asset(
          { asset_id : asset_id3_utf8,
            token_id : token_id1,
            metadata : { symbol : "FP2P3", name : asset_id3_utf8, decimals : '0' }
          })
      },
      { message : "FA2_TOKEN_ALREADY_EXISTS"})
  })

  it('Create new asset with UTF8 asset_id ' + asset_id3_utf8, async () => {
    try {
    let op = await create_asset(
      { asset_id : asset_id3_utf8,
        metadata : { symbol : "FP2P3", name : asset_id3_utf8, decimals : '0' }
        })
    log("waiting inclusion")
      await FinP2PTezos.wait_inclusion(op)
    } catch (e) {
      console.error(e)
    }
  })

  it('Issue 2 tokens of ' + asset_id3_utf8, async () => {
    let op = await issue_tokens(
      { asset_id : asset_id3_utf8,
        dest : accounts[3],
        amount : 2 })
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Balance of account[3] should be 2 in ' + asset_id3_utf8, async () => {
    let b = await get_balance({ owner : accounts[3].pubKey,
                                asset_id : asset_id3_utf8 })
    assert.equal(b, 2)
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

  it('Balance of account[3] should be 1 in ' + asset_id1, async () => {
    let b = await get_balance({ owner : accounts[3].pubKey,
                                asset_id : asset_id1 })
    assert.equal(b, 1)
  })

  it('Balance of account[0] should be 149 in ' + asset_id1, async () => {
    let b = await get_balance({ owner : accounts[0].pubKey,
                                asset_id : asset_id1 })
    assert.equal(b, 149)
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

  it('Balance of account[0] should be 149 in ' + asset_id1, async () => {
    let b = await get_balance({ owner : accounts[0].pubKey,
                                asset_id : asset_id1 })
    assert.equal(b, 149)
  })

  it('Redeem 49 tokens for account[0] in ' + asset_id1, async () => {
    let op = await redeem_tokens(
      { src : accounts[0],
        asset_id : asset_id1,
        amount : 49})
    log("waiting inclusion")
    await FinP2PTezos.wait_inclusion(op)
  })

  it('Balance of account[0] should be 100 in ' + asset_id1, async () => {
    let b = await get_balance({ owner : accounts[0].pubKey,
                                asset_id : asset_id1 })
    assert.equal(b, 100)
  })

  it('Try to redeem more than balance ' + asset_id1, async () => {
    await assert.rejects(
      async () => {
    await redeem_tokens(
      { src : accounts[0],
        asset_id : asset_id1,
        amount : 101})
      },
      { message : "FA2_INSUFFICIENT_BALANCE"})
  })

  it('Try to transfer with wrong signature', async () => {
    await assert.rejects(
      async () => {
    await transfer_tokens(
      { src : accounts[0],
        dest : accounts[3].pubKey,
        asset_id : asset_id1,
        amount : 1,
        signer : accounts[3] // should have been accounts[0]
      })
      },
      { message : "FINP2P_INVALID_SIGNATURE"})
  })

  it('Try to redeem with wrong signature', async () => {
    await assert.rejects(
      async () => {
    await redeem_tokens(
      { src : accounts[0],
        asset_id : asset_id1,
        amount : 1,
        signer : accounts[1] // should have been accounts[0]
      })
      },
      { message : "FINP2P_INVALID_SIGNATURE"})
  })

})
