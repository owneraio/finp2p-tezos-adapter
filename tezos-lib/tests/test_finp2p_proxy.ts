import 'mocha'
import { MichelsonMap } from "@taquito/taquito"
import { InMemorySigner } from '@taquito/signer'
import { getPkhfromPk, b58cencode, encodeKey, prefix } from '@taquito/utils';

import * as secp256k1 from 'secp256k1';
import * as crypto from 'crypto';
import { createBLAKE2b } from 'hash-wasm';
import * as Ed25519 from '@stablelib/ed25519'
import { strict as assert } from 'assert';
import * as child_process from "child_process";
import { promisify } from "util";
const exec = promisify(child_process.exec);

import * as Finp2pProxy from '../finp2p_proxy'
import { OperationResult } from '../taquito_wrapper';

let utf8 = new TextEncoder()
// utf8.encoding

let debug = false
switch (process.env.DEBUG) {
  case 'true':
    debug = true
    break
  default:
}

function gen_tz_account() {
  const keys = Ed25519.generateKeyPair()
  const pk : string = encodeKey('00' + Buffer.from(keys.publicKey).toString('hex'))
  const pkh : string = getPkhfromPk(pk)
  const sk : string = b58cencode(Buffer.from(keys.secretKey).toString('hex'), prefix.edsk)
  return { pkh, pk, sk }
}

function gen_tz_accounts(n : number) {
  let accounts = []
  for (let i = 0; i < n; i++) {
    accounts.push(gen_tz_account())
  }
  return accounts
}

// generated with gen_tz_accounts(30)
const extra_accounts = [
  {
    pkh: 'tz1aABc8BL4EoFPKb9JqCQicP5He8NRMex73',
    pk: 'edpku9b4PwaVMNFciuwcgcUHPVBH9eJvfBuc4kPJKkVyHBMcRvHVSF',
    sk: 'edskS4xXGNV15B2RGmtYNsiKyaumQFpzwhjMcU1XEHGv4ShufriYzLyWBNT8KrptpbPUc6mH37NGpRMTvSY5cB6MDCzUpdewzF'
  },
  {
    pkh: 'tz1g3TUddkW4GRBSJZpCLAPdYZEpNZBtLigg',
    pk: 'edpkvLPbg9NtxYWUfTrin2v1A6Z9ojpDR9TmBCkbBv78wjNCzc1Xhz',
    sk: 'edskRqq1AxQobYsn1SReNdeNKciNCP8WBnk2Bnh7iCyfZ8LTDMdYJ8A12iA2B987vYAAE4c3zyJPyQENvRCmx22JxLKwAnapmt'
  },
  {
    pkh: 'tz1NFdirwUMhz7Y2gShTb4eiBRPXnVaTzo4Y',
    pk: 'edpkuNMo1SXKEJS3dbSHp2qBfGCZCj1x7fTuLviYTftc1hYsCE9QZc',
    sk: 'edskS2ed1K6RqbVo5ncYTQnYLy8e7nKdDa7TYsRqe47a4Y2iuV1haT9kBv85wEKbrTCeDJALvrgVu6stoYtqUBUKc2pHt3xDn3'
  },
  {
    pkh: 'tz1Vxhe7gQZzHpc99BHnnN3j3xWTsbBffBcB',
    pk: 'edpkvNmY6S22xjcj3VsZELuvDZzQA2zuG1mEw6eBAStqNqBPuw3kjD',
    sk: 'edskS743SdYeCtwPFCxmKaCBr6TiTyHeoJwMpxMyX3s5RNjMwCC86SHT4HZoLibFmNM7gMXZLYXehcLAqhHPuk6yY3EzYx7eob'
  },
  {
    pkh: 'tz1bjg513GEJbSaJcxyuZFKVQnvUJ7mgSUE4',
    pk: 'edpku8zUv1L27Qg2iiiSj6zA4wiN4b7BeEbM61KJRq1s2xRMSG8Qiz',
    sk: 'edskRh7p7y4MVZYnvhm35Df2SFXKBQSKb3293sAZhzsUHUTQupqCNmcPLoCRuMNgC7YWDWexqpXZrFqxQju9rYbCFapaD5ZJzW'
  },
  {
    pkh: 'tz1eLnaPe4mVrz1QCekxeSiqfvKyG79TjnyY',
    pk: 'edpkuKV43hEeZu26e4NA8zTe9E89zgNbwHPcMXj34CjHrAgjEVWrzv',
    sk: 'edskS1zSUb6APGVpNC6QqUN1JF81SpKNHTiu7am3RezrHdLfnmjXTLSMw4QQtpsjhR3tpz1nota3VA9F4Bqpk5LJY9vpuuVzKE'
  },
  {
    pkh: 'tz1L9rSkbdceaRTpTbeKfMVjWpqZpZdgzJod',
    pk: 'edpkuDrvNCkGK5N3Cu48wAe5eFjPxxZRRmMTQs3xKMkwHtZK2SvciP',
    sk: 'edskRnQ7phCpg2kxRLGQoNBbFs6odBsF6se6ARg7d56q1B8ELV1AHN1eFeRA1JXQgT8Bh2sTrPApMbFwyRcY5jUzkJgPvZTH7C'
  },
  {
    pkh: 'tz1U5TpkugACh4bWoRZi4qn8JfPmKcaM18vw',
    pk: 'edpkvHjoNstUHjAcjAqd3fuamDrFWdBFnMWGttc69r1TED5oMdHsv2',
    sk: 'edskRhiBGV7qo3dRLYxXj5cFz6dxswrfBzaoR83uwxwEdEn84EfzjWPLVT5fSfBu5tPEPJtNSv3TAf9kSha8F1nCJhjcpo1HHw'
  },
  {
    pkh: 'tz1YnrQkv27JafhczciqEbTxvrnPqnqysg8h',
    pk: 'edpkufFGXUEMZ66TvZg9nYJD36vXphH2fDM5XZ3L8q7zurCjA7thf7',
    sk: 'edskRjN4k2UgBuXWvKANiazRyRh7NzZooN3JzWh7h58bhm9XGnSWVuWDLrG2wJqbmyJrZBpnvmAVptMhczp7CZYBS1FzB72ktf'
  },
  {
    pkh: 'tz1bNSBmXHPWX6ubq4rYtBdS8hWK5QqvfWw3',
    pk: 'edpktwyyzWDFojUzWnAw9hDwrp8N6xx2gpxtrnZ1EMLPae5ZuZtmPT',
    sk: 'edskS1cVYgmnsbHkFYbFSCKRkEPwDp9beqC3BjU3Fd9fwrhg314osrzGZ1DUhy7gbjztnr2fnDXuv9yMffr9X5w376AnRm8i1K'
  },
  {
    pkh: 'tz1W7JDPDtMw9zAMXvYyY9vkCeAq7jL5bCjN',
    pk: 'edpkupR6hXsEKNsdkq4KpUyYxKX2jv93c6NkZpKJtAajv1FsxYgYzE',
    sk: 'edskRkcAK59o3Z9PTj5zuVnKqzD23ZiCQ3y6s67TECeyG41AL56bB5hqUkZ74NjpQUXFhZcCizmjxtZeHmRt2xpyiCmjP7FQvv'
  },
  {
    pkh: 'tz1SwLUpJFe8uT2zkp7sostPR32TNYUcMbNQ',
    pk: 'edpkuMniMhouJVGDEiybLrnEE8X3rHHuR4nuh2uS2xfcofkjbzf32u',
    sk: 'edskS9fHRtckVJWgZjghp9CG3YymPzpoVW6W3PbYE5FR1mboD1CcqPLVAqjjpS7Ja7EbUamLTJ4yVNPcYp7HRfwHvqeG1PJMCu'
  },
  {
    pkh: 'tz1U9rT4zwiwtjsDXkVJAgprWQVavj6KGxAg',
    pk: 'edpkvZTUQrpREegSXi4uXLFYT2WeKbD3VnuMSHVfztfRaWAo79tsG7',
    sk: 'edskS6N1vZWigfL6UtuxZ3gVppph6qeKY2PRRA4TYAkUYgJfSaBshW67YzEo6WW51f8Hq4BxCjStEdrTxS26GGWj1cy8KTG9jZ'
  },
  {
    pkh: 'tz1Pc93aiuQnHP27aZwaeqjJWW36jDtgcSb6',
    pk: 'edpkuXSNeUobfb3yfkFxP4hKa1am6h7Em8XJkGjvSKAUP8Mk7MkVDP',
    sk: 'edskRfxQX3zv8rkD64YmpSG4h2voDFKnAwdkQKYYfNivdp7hXmzsGQKsFLwA4LiNpL7Q7ehDVRi17HBfq7qWr1dwMPfT2aRoSC'
  },
  {
    pkh: 'tz1SzUSs5tnmxJzdNmK6entzuuZkwRZi8A9w',
    pk: 'edpkuAgaPmKgrUjaUEhMuHNcBxg5kbyziu3mYxy3yxGRFLP4SRWrUb',
    sk: 'edskRooftAZPJyWGjCGncQovGfEB5YD15BN9qpuy5QrWiiZbNxAwXQcKUe82fXbyyX5WUwtPoXkQNVtj9zoCQJcQur7jgZXgSZ'
  },
  {
    pkh: 'tz1LN8mjjJ3unFfcTvoa7vt2dcUJMcngU243',
    pk: 'edpktgm2z9E1AkGQ3ZD55YDjGD1mgYa6uas7patD1giN9pFzbizziE',
    sk: 'edskRxjv78L7PedwKCbHqrzGfNSNNg5R3WN37W4UoTsgzKexG4thUaP9cfJ9yAvvY6h9Jhqc9hoTfYxzvcSpyy4M7qFyV5j4U2'
  },
  {
    pkh: 'tz1UC6KJ1rjtD9Nz6F33kMTc7L4SHD6mjqNF',
    pk: 'edpkvVYb77nGC9QMKEz715B33XrXCmXiPnX1Foud2BENew6tXgVZHZ',
    sk: 'edskRiQyMWogbg66bkG3bwo9ipWkaCHCzUKPTqRvim7yfRxK7NKYbgcUZwAaq8aehiZKBMmR39j5w5UmEgeRigkvSM2EuTAPzk'
  },
  {
    pkh: 'tz1iDUV5tLeueK74HW8BRe3ZSbVQuVPibB22',
    pk: 'edpkv5n2XJF281TvEpvrym63HvYyA8CZpJZyWfijetLxqCFDxyiVu8',
    sk: 'edskRyhFB2Vj6jrxm8ymRkpXRpXWdEpB3tUxnk6QgLVwS7MeLTKAg3bh5hzMLb8RWsHo7c9M47Kbw5CgivyW3fdYmgZRqDWrnj'
  },
  {
    pkh: 'tz1QkvDcfTi8zjeMey8ZFtRSyt5khCVy6bX8',
    pk: 'edpkuSAREWH35tw4WQpbufekjpUrqwcR6X64FvuW2N7B3nmtoYAYT9',
    sk: 'edskRfMs57egdna6pQzF1MmQvQhHt46wU2LwyKtTpEamG2pwLZJeVbouLJBdHEStqdxMzqQrDQD3xJYjq2djtENX6NhEPn93gJ'
  },
  {
    pkh: 'tz1aynQ26Mh7VP2HqzPAGhRueBcEdMXUHGs8',
    pk: 'edpkvR2jc6UW4auM1Eg4Mv7oq9dUAF64zerXownDUHVLT1CSsbb2B9',
    sk: 'edskSB5TvV3h9iBiCnLExJ94RGJKswcGNcotPRuqaPpLKuWwftbpFNGkSyM5skHY1HuLVczjU5AuWWHmm7jvC6o48ayZVYUrwM'
  },
  {
    pkh: 'tz1TuhzLJnKVhtxZiYDRCktpqDYkmoqX7RUn',
    pk: 'edpkuvDfC2dA6uBTd21hK7X85LoAqpWtRuEtfQoMQhWTqVVqaMuR2f',
    sk: 'edskS5ZhmAWy1dN8vtEFw6bY53683WL4qbcuzwEsatwKQhFTGMu13jQkjMrjCcxexZxMQ58LFv3UCirxnvE6qrkL4trS8cuS33'
  },
  {
    pkh: 'tz1hTD2xg1bg77vmSib6hhdvpYHEic33cfWz',
    pk: 'edpkti72zYiJKTQ1WRiueWBDb21pQ766wdxtqPiNNnnw3oEYCFV7WW',
    sk: 'edskRyfzwoPp6NJf3WZjRgAK9XvHPWxKCUNWodttXNG4EXamNjYEqcqqVbcMaLH7g6ff4T7RGQD99JQHAiEHkmCYkVv7LkRRcj'
  },
  {
    pkh: 'tz1f4uMgBo5wPuu2Kb3dDUw5hEsgXPk6jxs8',
    pk: 'edpkuxAZeyrBqFnQJKFJPQc9ohVgwMXSTzv7XQgQ5Cd7Tt8MBFicns',
    sk: 'edskRomQB6pdXfJM8NiGBFdafgMWNEnm69FeTgc3iCgzkRD4izPaySQUJcuaS2KXkEhS58oppt6qvPxDzJGb213syEjguYcucP'
  },
  {
    pkh: 'tz1iFixRj7j2CM8HzShSxYzPHk2but47Tvv4',
    pk: 'edpkvTFHTCg43epRVpgMoxb1mk2N6oEDv8mQvuTmpzQWbgJjyaRXZf',
    sk: 'edskReHh457DtYJsKDdRdnxfsf5duH2HMvyLcyPrNWoDrN9J89xT2Es15RJCLgQnvNi6XjK9e2wgP7Aow7tUekNBkvhj6C5q83'
  },
  {
    pkh: 'tz1LcaDrxYuxoM99AALn3GgYBmBuK6keoySn',
    pk: 'edpkvaKf3tR2Hbn2WZkxWcW7EysuVQqvQ1YoKQXfDF9EHjdLpk5baT',
    sk: 'edskRhMSscBZffHJssRZCr6HLfoSdfr3DUzQfjSVqgQizjFLKEFJogRLDxoZ5CAD2YkCEtt2rm6DDnDybRMwKTYiFgyYdAeQ2W'
  },
  {
    pkh: 'tz1VCYH6WHcFb5yrJQeAnVPNAphNYKwAUANK',
    pk: 'edpkux45xtdCAvwBAnWjMqUtSjXGuxs5DmhRcxeMcaRaNeaigPGZ1n',
    sk: 'edskS4nL46VGrPT7LNjv348G5TL3pRum5PAAb8daUHtLXHVjjCacnRKyyT2pKR8T4VUeQ8Zi9ef8rXjgUqhfTya9MD2FztY1xo'
  },
  {
    pkh: 'tz1ieUu4NjHMVpkU3AipBpuaKmBp3aYweKmm',
    pk: 'edpktpE4R5SRXqcHjWs71armKzZ5CSPZjhQxJcbs2gDMVc4Efm7YLh',
    sk: 'edskRvYenyYzvENriNxffLMairJW3aSRoVjWWv3NhoHpcR6V8EnqSDs8cUvfkRcmeYcgEj36SkYXM4NJTs33dxJpK7gDWKfad5'
  },
  {
    pkh: 'tz1a3YpTNMXWyMCCNLUGXyM7mQ37Dt7J7iyV',
    pk: 'edpkvLgirnc4x8Jh4eKTSdayLDAF7J9jJJv5UYz611Z4u7BDJomwwu',
    sk: 'edskRqqCtMmZr5kbVudDGmxXih2c4TJX5taoXjVYpzhRxFi5fXqL7wKLjAVEkCiccCRFZXNKvKp5PsPuFe8ufF5NZjcB86kQoX'
  },
  {
    pkh: 'tz1QfPhpcYbVzZLm62N7xVGWJx57rUycVSuK',
    pk: 'edpkvZphFnqeCfochZmjLVVJ9hzcKMdKYBTsi4tGKetRG2eKQKx8fo',
    sk: 'edskS7UpVh4udsCXtGQMSmMEgPiYNhxvtjdq4ub7dtpBiWxEHG5UMpiae6AEcCVLW4QgrZWE6imjPph9ZCUece5KaUVhT92o9H'
  },
  {
    pkh: 'tz1Z32njBp834T7TR6NbdeycKCTouBcfkQ5d',
    pk: 'edpkuf8RfqTVFUhD6soY5xxqyNdiXAtR9VZrcG3ia3Zk6jxApmAMmc',
    sk: 'edskRw5oDHLU1gmsrvGucURceBwKPFXVzfF43F6817d2XqAb4gP8naoeG22yHZ7fxR1BRSmTh95NijLzyzBWkmgseyQE3SXc8E'
  }
]

module Hangzhounet {

  // This is the account that we will use to sign transactions on Tezos Note that
  // this account must also be an admin of the `finp2p_proxy` contract
  // Testnet faucet accounts can be obtained here: https://teztnets.xyz
  export const account = {
    pkh : "tz1ST4PBJJT1WqwGfAGkcS5w2zyBCmDGdDMz",
    pk : "edpkuDn6QhAiGahpciQicYAgdjoXZTP1hqLRxs9ZN1bLSexJZ5tJVq",
    sk : "edskRmhHemySiAV8gmhiV2UExyynQKv6tMAVgxur59J1ZFGr5dbu3SH2XU9s7ZkQE6NYFFjzNPyhuSxfrfgd476wcJo2Z9GsZS"
  }

  export const other_account = {
    pkh : "tz1Uxpw1ojH9r2k48vfNiB7CTrPbniJgmeGG",
    pk : "edpkuwHfFne6tDwVzu4R68zms2peRCTCeqXVWQBKnH9QVgpfAfCKq7",
    sk : "edsk3FDTtBzp7M5ktcjdSy8tPezGDfjwGxQXuSyGhLaHGQ5uStTcq3"
  }

  export const accounts = [account].concat(extra_accounts)

  export async function start_network() { }
  export async function stop_network() { }

  export var block_time = 30

  export const config: Finp2pProxy.Config = {
    url : "https://rpc.hangzhounet.teztnets.xyz",
    explorers : [
      { kind : 'TzKT', url : 'https://api.hangzhou2net.tzkt.io' },
      { kind : 'tzstats', url : 'https://api.hangzhou.tzstats.com' },
    ],
    admins : accounts.map(a => a.pkh),
    finp2pAuthAddress : 'KT1QjrVNZrZEGrNfMUNrcQktbDUQnQqSa6xC',
    finp2pFA2Address : 'KT1WbSTtsza3Sb1yaBA651XBA8LRMRFQQaHL',
    finp2pProxyAddress : 'KT1Q5d32TjMPpfvoKXPKuQ7Dr1f96XUzA6sR',
    debug
  }

  export const poll = undefined

}

module Flextesa {

  // default accounts in the flextesa sandbox
  let flex_accounts = {
    'alice' : {
      pk : 'edpkvGfYw3LyB1UcCahKQk4rF2tvbMUk8GFiTuMjL75uGXrpvKXhjn',
      pkh : 'tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb',
      sk : 'edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq'
    },
    'bob': {
      pk : 'edpkurPsQ8eUApnLUJ9ZPDvu98E8VNj4KtJa1aZr16Cr5ow5VHKnz4',
      pkh : 'tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6',
      sk : 'edsk3RFfvaFaxbHx8BMtEW1rKQcPtDML3LXjNqMNLCzC3wLC1bWbAt'
    }
  }

  export const account = flex_accounts.alice
  export const other_account = flex_accounts.bob

  export const accounts = [account].concat(gen_tz_accounts(30))

  let flextesa_image = 'oxheadalpha/flextesa:20211221'
  let flexteas_script = 'hangzbox'

  export var block_time = 1

  async function rec_wait_for_level(level : number, timeout_stamp : Date) {
    if (new Date() > timeout_stamp) { throw Error(`Timeout waiting for level ${level} in flextesa`)}
    try
    { const { stdout } =
      await exec('docker exec finp2p-sandbox tezos-client rpc get /chains/main/blocks/head/header | jq .level')
      const cur_level = parseInt(stdout)
      if (cur_level >= level) { return }
    } catch (_) { /* ignore errors */ }
    process.stdout.write('.')
    return await rec_wait_for_level(level, timeout_stamp)
  }
  async function wait_for_level(level : number, timeout = 30 /* seconds */) {
    const timeout_stamp = new Date()
    timeout_stamp.setSeconds(timeout_stamp.getSeconds() + timeout);
    return await rec_wait_for_level(level, timeout_stamp)
  }

  export async function start_network (script = flexteas_script) {
    process.stdout.write('Starting sandbox ')
    await exec (
      ['docker run --rm --name finp2p-sandbox',
       '--detach -p 20000:20000',
       `-e block_time=${block_time}`,
       flextesa_image,
       script, 'start'
      ].join(' ')
    )
    await wait_for_level(2) // level 0 = genesis, level 1 = activation block
    console.log('\nStarted')
  }

  export async function stop_network () {
    console.log('Stopping sandbox')
    await exec ('docker stop finp2p-sandbox')
  }

  export const config: Finp2pProxy.Config = {
    url : "http://localhost:20000",
    explorers : [],
    admins : accounts.map(a => a.pkh),
    debug
  }

  export const poll : number | undefined = 500 // ms

}

var Net : typeof Flextesa

switch (process.env.FINP2P_TEST_NETWORK) {
  case 'hangzhounet':
    Net = Hangzhounet
    break
  default:
    Net = Flextesa
}

let FinP2PTezos = new Finp2pProxy.FinP2PTezos(Net.config)

// Register admin signers
Net.accounts.map(account =>
  FinP2PTezos.registerSigner(new InMemorySigner(account.sk))
)
FinP2PTezos.registerSigner(new InMemorySigner(Net.other_account.sk))


if (Net.poll !== undefined) {
  FinP2PTezos.taquito.setProvider(
    {config :
     {streamerPollingIntervalMilliseconds : Net.poll}})
}


function log (message?: any, ...optionalParams: any[]) {
  if (Net.config.debug) { console.log(message, ...optionalParams) }
}

// Only get receipts if network has explorers associated
function get_receipt (op : OperationResult) : Promise<any>{
  if (Net.config.explorers.length > 0) {
    return FinP2PTezos.getReceipt(op)
  }
  else {
    return new Promise(resolve => {resolve({})})
  }
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

function generateNonce(): Finp2pProxy.Finp2pNonce {
  return {
    nonce : crypto.randomBytes(24) ,
    timestamp : new Date()
  }
}

function nonce_to_bytes(n: Finp2pProxy.Finp2pNonce) : Buffer {
  const buffer = Buffer.alloc(32)
  buffer.fill(n.nonce, 0, 24);
  const t_sec = Math.floor(n.timestamp.getTime() / 1000);
  const t = BigInt(t_sec);
  buffer.writeBigInt64BE(t, 24);
  return buffer;
}

function log_hashgroup (hg : any[]) {
  let to_hex = Finp2pProxy.Michelson.bytesToHex
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
  let param: Finp2pProxy.IssueTokensParam = {
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
  amount : number,
  options? : Finp2pProxy.CallOptions,
}) {
  let param = await mk_issue_tokens(i)
  log("Issue parameters:", param)
  return await FinP2PTezos.issueTokens(param, i.options)
}

function mk_create_asset (i : {
  asset_id : string,
  metadata: any,
  token_id?: number,
}): Finp2pProxy.CreateAssetParam {
  let fa2_token  = {
    address : FinP2PTezos.getFA2Address(),
    id : (i.token_id === undefined) ? undefined : BigInt(i.token_id)
  }
  let metadata = new MichelsonMap<string, Uint8Array>()
  Object.entries(i.metadata).forEach(
    ([k, v]) => metadata.set (k, utf8.encode(to_str(v)))
  )
  let new_token_info : [Finp2pProxy.CreateFA2Token, MichelsonMap<string, Uint8Array>] =
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
  options? : Finp2pProxy.CallOptions,
}) {
  let param = mk_create_asset(i)
  log("Create parameters:", param)
  return await FinP2PTezos.createAsset(param, i.options)
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

  let param: Finp2pProxy.TransferTokensParam = {
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
  signer? : finp2p_account,
  options? : Finp2pProxy.CallOptions,
}) {
  let param = await mk_transfer_tokens(i)
  log("Transfer parameters:", param)
  return await FinP2PTezos.transferTokens(param, i.options)
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

  let param: Finp2pProxy.RedeemTokensParam = {
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
  signer? : finp2p_account,
  options? : Finp2pProxy.CallOptions,
}) {
  let param = await mk_redeem_tokens(i)
  log("Redeem parameters:", param)
  return await FinP2PTezos.redeemTokens(param, i.options)
}

async function get_balance(i : {
  owner : Buffer,
  asset_id : string}) {
  let balance = await FinP2PTezos.getAssetBalance(
    '0x01' /* secp256k1 */ + i.owner.toString('hex'),
    utf8.encode(i.asset_id)
  )
  return Number(balance)
}

function accountPkh(account : finp2p_account) {
  return getPkhfromPk(encodeKey('01' + account.pubKey.toString('hex')))
}

function accountSk(account : finp2p_account) {
  return b58cencode(account.privKey.toString('hex'), prefix.spsk)
}


var accounts : finp2p_account[] = []

describe('FinP2P Contracts',  () => {

  it('Initialize library',  async () => {
    // Deploy the smart contracts (this is not necessary if the smart contract are
    // already deplopyed on the network we want to use)
    await FinP2PTezos.init({
      operationTTL : {
        ttl : BigInt(15 * Net.block_time), // 15 blocks
        allowed_in_the_future : BigInt(2 * Net.block_time) // 2 block
      },
      fa2Metadata : new Map([['symbol', utf8.encode("FP2P")]])
    })

    // This is in case we want to redeploy and change the config
    log('================')
    log(`finp2pAuthAddress : '${FinP2PTezos.config.finp2pAuthAddress}',`)
    log(`finp2pFa2Address : '${FinP2PTezos.config.finp2pFA2Address}',`)
    log(`finp2pProxyAddress : '${FinP2PTezos.config.finp2pProxyAddress}',`)
    log('================')

  })

  it('Generate FinP2P accounts', () => {
    for (let i = 0; i < 10; i++) {
      accounts.push(gen_finp2p_account())
    }
  })

  it('Top up admin accounts to 10tz', async () => {
    let op = await FinP2PTezos.topUpXTZ(FinP2PTezos.config.admins, 10, Net.account.pkh)
    if (op !== undefined) {
      log("waiting inclusion")
      await FinP2PTezos.waitInclusion(op)
    }
    })

  it('Reveal accounts', async () => {
    let ops = await Promise.all(Net.accounts.concat([Net.other_account]).map(async a => {
      try {
        return await FinP2PTezos.taquito.revealWallet(a.pk)
      } catch (e) {
        // console.error(e)
        if (e.message == 'WalletAlreadyRevealed') {
          return undefined
        }
        throw e
      }
    }))
    ops = ops.filter(op => op !== undefined)
    log(`waiting on ${ops.length} inclusions`)
    await Promise.all(ops.map(op => { return FinP2PTezos.waitInclusion(op)}))
  })

  var asset_id1 = "ORG:102:asset-id1-" + (new Date()).toISOString()
  var asset_id2 = "ORG:102:asset-id2-" + (new Date()).toISOString()
  var asset_id3_utf8 = "ORG:102:asset-طزوس-" + (new Date()).toISOString()

  var token_id1 =  Math.floor((new Date()).getTime() / 1000)


describe('FinP2P proxy contract',  () => {

  // it('Cleanup the expired operations', async () => {
  //   let op = await FinP2PTezos.cleanup()
  //   log("waiting inclusion")
  //   await FinP2PTezos.wait_inclusion(op)
  // })

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
    await FinP2PTezos.waitInclusion(op)
    await get_receipt(op)
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
    await FinP2PTezos.waitInclusion(op)
    await get_receipt(op)
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
    await FinP2PTezos.waitInclusion(op)
  })

  it('Concurent transactions: issue more tokens (10 + 10 + 10)', async () => {
    let ops = await Promise.all([
      issue_tokens(
      { dest : accounts[1],
        asset_id : asset_id1,
        amount : 10 }),
      issue_tokens(
      { dest : accounts[1],
        asset_id : asset_id1,
        amount : 10 }),
      issue_tokens(
      { dest : accounts[1],
        asset_id : asset_id1,
        amount : 10 })
    ])
    log("waiting inclusions")
    await Promise.all(ops.map(op => { return FinP2PTezos.waitInclusion(op)}))
  })

  it('Balance of account[1] should be 250 in ' + asset_id1, async () => {
    let b = await get_balance({ owner : accounts[1].pubKey,
                                    asset_id : asset_id1 })
    assert.equal(b, 250)
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
    if (Net.config.explorers.length > 0) {
      // cleanup needs at least one configured explorer
      ops = [{ kind : 'cleanup',
               param : undefined } as Finp2pProxy.BatchParam].concat(ops)
    }
    let op = await FinP2PTezos.batch(ops)
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
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
      await FinP2PTezos.waitInclusion(op)
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
    await FinP2PTezos.waitInclusion(op)
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
    await FinP2PTezos.waitInclusion(op)
    await get_receipt(op)
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
    await FinP2PTezos.waitInclusion(op)
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

  it('Add admin', async () => {
    let op = await FinP2PTezos.addAdmins([Net.other_account.pkh])
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    FinP2PTezos.registerSigner(new InMemorySigner(Net.other_account.sk))
  })

  it('Update operation_ttl with new admin', async () => {
    let ttl = {
      ttl : BigInt(10 * Net.block_time), // 10 blocks
      allowed_in_the_future : BigInt(2 * Net.block_time + 1)
    }
    let op = await FinP2PTezos.updateOperationTTL(ttl, { sender : Net.other_account.pkh })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let storage = await FinP2PTezos.getProxyStorage()
    assert.deepEqual(storage.operation_ttl, ttl)
  })

  it('Try to remove all admins', async () => {
    await assert.rejects(
      async () => {
        await FinP2PTezos.removeAdmins([Net.other_account.pkh].concat(Net.config.admins))
      },
      { message : "EMPTY_ADMIN_SET"})
  })

  it('Remove admin', async () => {
    let op = await FinP2PTezos.removeAdmins([Net.other_account.pkh])
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
  })

  describe("Injections with non admin", () => {

    let options = {
      sender : Net.other_account.pkh
    }

    it('Inject redeem with non admin', async () => {
      await assert.rejects(
        async () => {
          await redeem_tokens(
            { src : accounts[0],
              asset_id : asset_id1,
              amount : 1,
              options
            })
        },
        { message : "FINP2P_UNAUTHORIZED_ACTION"})
    })

    it('Inject create asset with non admin', async () => {
      await assert.rejects(
        async () => {
          await create_asset(
            { asset_id : "New id",
              metadata : { symbol : "NID", name : "New id", decimals : '0' },
              options
            })
        },
        { message : "FINP2P_UNAUTHORIZED_ACTION"})
    })

    it('Inject issue asset with non admin', async () => {
      await assert.rejects(
        async () => {
          await issue_tokens(
            { asset_id : asset_id3_utf8,
              dest : accounts[3],
              amount : 1,
              options })
        },
        { message : "FINP2P_UNAUTHORIZED_ACTION"})
    })

    it('Inject transfer asset with non admin', async () => {
      await assert.rejects(
        async () => {
          await transfer_tokens(
            { src : accounts[0],
              dest : accounts[3].pubKey,
              asset_id : asset_id1,
              amount : 1,
              options})
        },
        { message : "FINP2P_UNAUTHORIZED_ACTION"})
    })

    it('Inject update operation_ttl with wrong admin', async () => {
      await assert.rejects(
        async () => {
          let ttl = {
            ttl : BigInt(1000),
            allowed_in_the_future : BigInt(2000)
          }
          await FinP2PTezos.updateOperationTTL(ttl, options)
        },
        { message : "FINP2P_UNAUTHORIZED_ACTION"})
    })

    it('Inject add admin with wrong admin', async () => {
      await assert.rejects(
        async () => {
          await FinP2PTezos.addAdmins([Net.other_account.pkh], options)
        },
        { message : "FINP2P_UNAUTHORIZED_ACTION"})
    })

  })
    .beforeAll(() =>
      FinP2PTezos.taquito
        .setSignerProvider(new InMemorySigner(Net.other_account.sk)))
    .afterAll(() =>
      FinP2PTezos.taquito
        .setSignerProvider(new InMemorySigner(Net.account.sk)))

})

describe('FA2 contract',  () => {

  it("Send 10tz to account[2] (if needed)", async () => {
    let op = await FinP2PTezos.topUpXTZ([accountPkh(accounts[2])], 10, Net.account.pkh)
    if (op !== undefined) {
      log("waiting inclusion")
      await FinP2PTezos.waitInclusion(op)
    }
  })

  it("Set signer to account[2]", async () => {
    FinP2PTezos.taquito
      .setSignerProvider(new InMemorySigner(accountSk(accounts[2])))
  })

  it("Transfer tokens we don't have", async () => {
    await assert.rejects(
      async () => {
        const fa2 = await FinP2PTezos.taquito.contract.at(FinP2PTezos.getFA2Address())
        await fa2.methods.transfer([
            {
              from_: Net.account.pkh,
              txs: [
                {to_: Net.other_account.pkh, token_id: token_id1, amount: 1},
              ],
            }]
        ).send()
      },
      { message : "FA2_INSUFFICIENT_BALANCE"})
  })


  it("Unauthorized direct transfer", async () => {
    await assert.rejects(
      async () => {
        const fa2 = await FinP2PTezos.taquito.contract.at(FinP2PTezos.getFA2Address())
        await fa2.methods.transfer([
            {
              from_ : accountPkh(accounts[2]),
              txs: [
                {to_ : accountPkh(accounts[1]), token_id: token_id1, amount: 100},
              ],
            }]
        ).send()
      },
      { message : "FINP2P_UNAUTHORIZED_ACTION"})
  })

  it("Authorize direct transfer for account[2]", async () => {
    FinP2PTezos.taquito .setSignerProvider(new InMemorySigner(Net.account.sk))
    let op = await FinP2PTezos.addAccredited(accountPkh(accounts[2]),
                                       FinP2PTezos.ownerAccreditation)
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    FinP2PTezos.taquito
      .setSignerProvider(new InMemorySigner(accountSk(accounts[2])))
  })

  it("Authorized direct transfer", async () => {
    const fa2 = await FinP2PTezos.taquito.contract.at(FinP2PTezos.getFA2Address())
    let op = await fa2.methods.transfer([
      {
        from_ : accountPkh(accounts[2]),
        txs: [
          {to_ : accountPkh(accounts[1]), token_id: token_id1, amount: 100},
        ],
      }]).send()
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
  })

})

})
  .beforeAll(Net.start_network)
  .afterAll(Net.stop_network)
