import 'mocha'
import { MichelsonMap,  OriginationOperation } from "@taquito/taquito"
import { InMemorySigner } from '@taquito/signer'
import { getPkhfromPk, b58cencode, b58cdecode, encodeKey, prefix } from '@taquito/utils';

import * as secp256k1 from 'secp256k1';
import * as crypto from 'crypto';
import { createBLAKE2b } from 'hash-wasm';
import * as Ed25519 from '@stablelib/ed25519'
import { strict as assert } from 'assert';
import * as child_process from "child_process";
import { promisify } from "util";
const exec = promisify(child_process.exec);

import * as Finp2pProxy from '../finp2p_proxy'
import { OperationResult, contractAddressOfOpHash  } from '../taquito_wrapper';

import * as testFa2Code from '../../dist/michelson/for_tests/test_fa2.json';
import { BigNumber } from 'bignumber.js';

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
    finp2pAuthAddress : 'KT19FphHNf55Y5LkEQwXtBw9w2zJsiHNduj2',
    finp2pFA2Address : 'KT1L2TH91yZ5hGquq28vud2N1eipQKRwiUqA',
    finp2pProxyAddress : 'KT1Sc3yNWiUS9Arik5GaNM4GUyDFDop6FnCQ',
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
  let flexteas_script : string
  switch (process.env.FINP2P_SANDBOX_NETWORK) {
    case 'hangzhou':
    case 'hangzbox':
      flexteas_script = 'hangzbox'
      break
    case 'ithaca':
    case 'ithacabox':
      flexteas_script = 'ithacabox'
      break
    case 'alpha':
    case 'alphabox':
      flexteas_script = 'alphabox'
      break
    case undefined:
      flexteas_script = 'hangzbox';
      break
    default:
      flexteas_script = process.env.FINP2P_SANDBOX_NETWORK
  }

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

function pubkey_to_tezos_secp256k1(pubKey : Buffer) : string {
  return ('0x01' /* secp256k1 */ + pubKey.toString('hex'))
}

function pkh_to_bytes(pkh : string) : Uint8Array {
  const b = b58cdecode(pkh, prefix.tz1);
  switch (pkh.slice(0,3)) {
    case 'tz1': return new Uint8Array([...[0], ...b]);
    case 'tz2': return new Uint8Array([...[1], ...b]);
    case 'tz3': return new Uint8Array([...[2], ...b]);
    default: throw undefined;
  }
}

function generateNonce(): Finp2pProxy.Finp2pNonce {
  return {
    nonce : crypto.randomBytes(24) ,
    timestamp : new Date()
  }
}

function dateToSec(d : Date) : number {
  return Math.floor(d.getTime() / 1000);
}

function nonce_to_bytes(n: Finp2pProxy.Finp2pNonce) : Buffer {
  const buffer = Buffer.alloc(32)
  buffer.fill(n.nonce, 0, 24);
  const t_sec = dateToSec(n.timestamp);
  const t = BigInt(t_sec);
  buffer.writeBigInt64BE(t, 24);
  return buffer;
}

function log_hashgroup (hg : any[]) {
  let to_hex = Finp2pProxy.Michelson.bytesToHex
  log("Hash group:")
  hg.forEach((h) => {
    if (h instanceof Buffer) {
      log(h.toString('hex'))
    } else if (h instanceof Uint8Array) {
      log(to_hex(h))
    } else if (typeof h === 'string') {
      log(to_hex(utf8.encode(h)) + " = " + h)
    } else {
      log(h)
    }
  })
}

async function mk_issue_tokens(i : {
  dest : finp2p_account;
  asset_id : string,
  amount : number | bigint}) {
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
    dst_account : pubkey_to_tezos_secp256k1(i.dest.pubKey),
    amount: BigInt(i.amount),
    shg,
    signature: '0x' + (Buffer.from(signature)).toString('hex'),
  }

  return param
}

async function issue_tokens (i : {
  dest : finp2p_account;
  asset_id : string,
  amount : number | bigint,
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
  amount : number | bigint,
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
    src_account : pubkey_to_tezos_secp256k1(i.src.pubKey),
    dst_account : pubkey_to_tezos_secp256k1(i.dest),
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
  amount : number | bigint,
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
  amount : number | bigint,
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
    src_account : pubkey_to_tezos_secp256k1(i.src.pubKey),
    amount: BigInt(i.amount),
    signature: '0x' + (Buffer.from(signature)).toString('hex'),
  }

  return param
}

async function redeem_tokens(i : {
  src : finp2p_account,
  asset_id : string,
  amount : number | bigint,
  signer? : finp2p_account,
  options? : Finp2pProxy.CallOptions,
}) {
  let param = await mk_redeem_tokens(i)
  log("Redeem parameters:", param)
  return await FinP2PTezos.redeemTokens(param, i.options)
}

function rand(n : number) : number {
  return Math.floor(Math.random() * n)
}

function pick_rand<T>(a : T[]) : T {
  return a[rand(a.length)];
}

type hold_dst =
  { kind: 'finId', dst: Buffer } |
  { kind: 'cryptoWallet', dst: string } |
  { kind: 'escrow', dst: Buffer }

async function mk_hold_tokens(i : {
  hold_id : string,
  asset_id : string,
  amount : number | bigint,
  src : finp2p_account,
  dst? : hold_dst,
  expiration : number | bigint ,
  signer? : finp2p_account}) {
  let nonce = generateNonce()
  let nonce_bytes = nonce_to_bytes(nonce)
  let ahg_asset_id = crypto.randomBytes(25)
  let ahg_src_account : Buffer =
    (i.dst === undefined || i.dst.kind == 'finId' || i.dst.kind == 'cryptoWallet') ?
    gen_finp2p_account().pubKey : // dummy value
    i.dst.dst
  let ahg_dst_account = i.src.pubKey
  let ahg_amount = '0x' + rand(9999999999).toString(16)
  let assetGroup = [
    nonce_bytes,
    'transfer',
    'finp2p',
    ahg_asset_id,
    'finId',
    ahg_src_account.toString('hex'),
    'finId',
    ahg_dst_account.toString('hex'),
    ahg_amount,
  ]
  log_hashgroup(assetGroup)
  let assetHashGroup = await hashValues(assetGroup);
  log('AHG:', assetHashGroup.toString('hex'))
  let asset_type = pick_rand(["finp2p", "fiat", "cryptocurrency"])
  let shg_src_account_type = pick_rand(["finId", "cryptoWallet", "escrow"])
  let shg_src_account = crypto.randomBytes(30)
  let shg_dst_account_type = (i.dst === undefined) ? undefined : i.dst.kind
  let shg_dst_account : string | Buffer | undefined = undefined
  if (i.dst !== undefined) {
    switch (i.dst.kind) {
      case 'finId':
      case 'escrow':
        shg_dst_account = i.dst.dst.toString('hex');
        break;
      case 'cryptoWallet':
        shg_dst_account = Buffer.from(pkh_to_bytes(i.dst.dst));
        break;
    }
  }
  let settlementGroup = [
    asset_type,
    i.asset_id,
    shg_src_account_type,
    shg_src_account
  ]

  if (shg_dst_account_type !== undefined) { settlementGroup.push(shg_dst_account_type) }
  if (shg_dst_account !== undefined) { settlementGroup.push(shg_dst_account) }
  settlementGroup.push(
    '0x' + i.amount.toString(16),
    '0x' + i.expiration.toString(16),
  )
  let settlementHashGroup = await hashValues(settlementGroup);
  log('SHG:', settlementHashGroup.toString('hex'))
  let digest = await hashValues([assetHashGroup, settlementHashGroup])
  log('digest:', digest.toString('hex'))
  let privKey = (i.signer === undefined) ? i.src.privKey : i.signer.privKey
  let signature = secp256k1.ecdsaSign(digest, privKey).signature;

  let ahg : Finp2pProxy.HoldAHG = {
    nonce,
    asset_id : new Uint8Array(ahg_asset_id),
    src_account : pubkey_to_tezos_secp256k1(ahg_src_account),
    dst_account : pubkey_to_tezos_secp256k1(ahg_dst_account),
    amount : utf8.encode(ahg_amount)
  }

  let dst_account : (Finp2pProxy.HoldDst | undefined) = undefined
  if (i.dst !== undefined) {
    switch (i.dst.kind) {
      case 'finId':
        dst_account = {
          kind: 'FinId',
          key: pubkey_to_tezos_secp256k1(i.dst.dst),
        }
        break;
      case 'escrow':
        dst_account = {
          kind: 'Other',
          dst: new Uint8Array(i.dst.dst),
        }
        break;
      case 'cryptoWallet':
        dst_account = {
          kind: 'Tezos',
          pkh: i.dst.dst,
        }
        break;
    }
  }

  let shg : Finp2pProxy.HoldSHG = {
    asset_type,
    asset_id : utf8.encode(i.asset_id),
    src_account_type : utf8.encode(shg_src_account_type),
    src_account : new Uint8Array(shg_src_account),
    dst_account_type : shg_dst_account_type,
    dst_account,
    amount: BigInt(i.amount),
    expiration : BigInt(i.expiration),
  }

  let param: Finp2pProxy.HoldTokensParam = {
    hold_id : utf8.encode(i.hold_id),
    ahg,
    shg,
    signature: '0x' + (Buffer.from(signature)).toString('hex'),
  }

  return param
}

async function hold_tokens(i : {
  hold_id : string,
  asset_id : string,
  amount : number | bigint,
  src : finp2p_account,
  dst? : hold_dst,
  expiration : number | bigint ,
  signer? : finp2p_account,
  options? : Finp2pProxy.CallOptions,
}) {
  let param = await mk_hold_tokens(i)
  log("Hold parameters:", param)
  return await FinP2PTezos.holdTokens(param, i.options)
}

async function mk_execute_hold(i : {
  hold_id : string,
  asset_id? : string,
  amount? : number | bigint,
  src? : Buffer,
  dst? : hold_dst,
}) {
  let dst : (Finp2pProxy.SupportedHoldDst | undefined) = undefined
  if (i.dst !== undefined) {
    switch (i.dst.kind) {
      case 'finId':
        dst = {
          kind: 'FinId',
          key: pubkey_to_tezos_secp256k1(i.dst.dst),
        }
        break;
      case 'cryptoWallet':
        dst = {
          kind: 'Tezos',
          pkh: i.dst.dst,
        }
        break;
      default: throw Error("unsuppored execute hold destination")
    }
  }
  let param: Finp2pProxy.ExecuteHoldParam = {
    hold_id : utf8.encode(i.hold_id),
    asset_id : (i.asset_id === undefined)? undefined : utf8.encode(i.asset_id),
    amount : (i.amount === undefined)? undefined : BigInt(i.amount),
    src_account : (i.src === undefined)? undefined : pubkey_to_tezos_secp256k1(i.src),
    dst,
  }

  return param
}

async function execute_hold(i : {
  hold_id : string,
  asset_id? : string,
  amount? : number | bigint,
  src? : Buffer,
  dst? : hold_dst,
  options? : Finp2pProxy.CallOptions,
}) {
  let param = await mk_execute_hold(i)
  log("Execute hold parameters:", param)
  return await FinP2PTezos.executeHold(param, i.options)
}

async function mk_release_hold(i : {
  hold_id : string,
  asset_id? : string,
  amount? : number | bigint,
  src? : Buffer,
}) {
  let param: Finp2pProxy.ReleaseHoldParam = {
    hold_id : utf8.encode(i.hold_id),
    asset_id : (i.asset_id === undefined)? undefined : utf8.encode(i.asset_id),
    amount : (i.amount === undefined)? undefined : BigInt(i.amount),
    src_account : (i.src === undefined)? undefined : pubkey_to_tezos_secp256k1(i.src),
  }

  return param
}

async function release_hold(i : {
  hold_id : string,
  asset_id? : string,
  amount? : number | bigint,
  src? : Buffer,
  options? : Finp2pProxy.CallOptions,
}) {
  let param = await mk_release_hold(i)
  log("Release hold parameters:", param)
  return await FinP2PTezos.releaseHold(param, i.options)
}

async function get_balance_big_int(i : {
  owner : Buffer,
  asset_id : string}) {
  return await FinP2PTezos.getAssetBalance(
    pubkey_to_tezos_secp256k1(i.owner),
    utf8.encode(i.asset_id)
  )
}

async function get_balance(i : {
  owner : Buffer,
  asset_id : string}) {
  let balance = await get_balance_big_int(i)
  return Number(balance)
}

async function get_spendable_balance(i : {
  owner : Buffer,
  asset_id : string}) {
  return await FinP2PTezos.getAssetSpendableBalance(
    pubkey_to_tezos_secp256k1(i.owner),
    utf8.encode(i.asset_id)
  )
}

async function get_balance_info(i : {
  owner : Buffer,
  asset_id : string}) {
  return await FinP2PTezos.getAssetBalanceInfo(
    pubkey_to_tezos_secp256k1(i.owner),
    utf8.encode(i.asset_id)
  )
}

function accountPkh(account : finp2p_account) {
  return getPkhfromPk(encodeKey('01' + account.pubKey.toString('hex')))
}

function accountSk(account : finp2p_account) {
  return b58cencode(account.privKey.toString('hex'), prefix.spsk)
}

// Deploy a test FA2 contract
async function deployTestFA2(
  manager : string,
): Promise<OriginationOperation> {
  let michMetadata = new MichelsonMap < string, Finp2pProxy.Bytes>();
  let initialStorage = {
    auth_contract : manager,
    paused : false,
    ledger : new MichelsonMap<[Finp2pProxy.Nat, Finp2pProxy.Address], Finp2pProxy.Nat>(),
    operators : new MichelsonMap<[Finp2pProxy.Address, [Finp2pProxy.Address, Finp2pProxy.Nat]], void>(),
    token_metadata : new MichelsonMap<Finp2pProxy.Nat, [Finp2pProxy.Nat, Map<string, Finp2pProxy.Bytes>]>(),
    total_supply : new MichelsonMap<Finp2pProxy.Nat, Finp2pProxy.Nat>(),
    max_token_id : BigInt(0),
    metadata: michMetadata,
  };
  FinP2PTezos.taquito.debug('Deploying new Test FA2 asset smart contract');
  return FinP2PTezos.taquito.contract.originate({
    code: testFa2Code,
    storage: initialStorage,
  });
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
      fa2Metadata : { name : "FinP2P FA2 assets",
                      description : "FinP2P assets for ORG" }
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
  var asset_id4 = "ORG:102:asset-id4-" + (new Date()).toISOString()
  var asset_id5 = "ORG:102:asset-id4-" + (new Date()).toISOString()
  var asset_id6 = "ORG:102:asset-id4-" + (new Date()).toISOString()
  var ext_asset_id = "ORG:102:external-asset-id-" + (new Date()).toISOString()

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

  it('Create asset with 6 decimals', async () => {
    let op = await create_asset(
      { asset_id : asset_id4,
        metadata : { symbol : "0", name : "", decimals : '6' }
        })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
  })

  it('Issue 0 of token with 6 decimals', async () => {
    let op = await issue_tokens(
      { asset_id : asset_id4,
        dest : accounts[1],
        amount : 0 })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
  })

  it('Issue 1.000000 of token with 6 decimals', async () => {
    let op = await issue_tokens(
      { asset_id : asset_id4,
        dest : accounts[1],
        amount : 1000000 })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
  })

  it('Issue 1000000.000000 of token with 6 decimals', async () => {
    let op = await issue_tokens(
      { asset_id : asset_id4,
        dest : accounts[2],
        amount : 1000000000000 })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
  })

  it(`Issue ${Number.MAX_SAFE_INTEGER}`, async () => {
    let op = await issue_tokens(
      { asset_id : asset_id4,
        dest : accounts[3],
        amount : Number.MAX_SAFE_INTEGER })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
  })

  it('Check big balance of account[3]', async () => {
    let b = await get_balance({
      owner : accounts[3].pubKey,
      asset_id : asset_id4 })
    assert.equal(b, Number.MAX_SAFE_INTEGER)
  })

  it(`Issue (twice) max signed int64 ${2n ** 63n - 1n}`, async () => {
    let op1 = await issue_tokens(
      { asset_id : asset_id4,
        dest : accounts[3],
        amount : 2n ** 63n - 1n })
    let op2 = await issue_tokens(
      { asset_id : asset_id4,
        dest : accounts[4],
        amount : 2n ** 63n - 1n })
    log("waiting inclusions")
    await FinP2PTezos.waitInclusion(op1)
    await FinP2PTezos.waitInclusion(op2)
  })

  it(`Issue ${2n ** 64n - 1n}`, async () => {
    let op = await issue_tokens(
      { asset_id : asset_id4,
        dest : accounts[3],
        amount : 2n ** 64n - 1n })
    log("waiting inclusions")
    await FinP2PTezos.waitInclusion(op)
  })

  it('Check very big balance of account[3]', async () => {
    let b = await get_balance_big_int({
      owner : accounts[3].pubKey,
      asset_id : asset_id4 })
    assert.equal(b, BigInt(Number.MAX_SAFE_INTEGER) + 2n ** 63n - 1n + 2n ** 64n - 1n)
  })

  it(`Issue 999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999n`, async () => {
    let op = await issue_tokens(
      { asset_id : asset_id4,
        dest : accounts[4],
        amount : 999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999n })
    log("waiting inclusions")
    await FinP2PTezos.waitInclusion(op)
  })

  it(`Issue -1 tokens`, async () => {
    await assert.rejects(
      async () => {
        await issue_tokens(
          { asset_id : asset_id4,
            dest : accounts[3],
            amount : -1 })
      },
      (err : any) => {
        assert.match(err.message, /invalid_syntactic_constant/)
        return true
      }
    )
  })

  it('Create new asset with UTF8 asset_id ' + asset_id3_utf8, async () => {
    let op = await create_asset(
      { asset_id : asset_id3_utf8,
        metadata : { symbol : "FP2P3", name : asset_id3_utf8, decimals : '0' }
        })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
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

  it(`Transfer -1 tokens`, async () => {
    await assert.rejects(
      async () => {
        await transfer_tokens(
          { src : accounts[0],
            dest : accounts[3].pubKey,
            asset_id : asset_id1,
            amount : -1})
      },
      (err : any) => {
        assert.match(err.message, /invalid_syntactic_constant/)
        return true
      }
    )
  })

  it('Transfer whole very large balance of ' + asset_id4, async () => {
    let b : bigint = await get_balance_big_int({
      owner : accounts[3].pubKey,
      asset_id : asset_id4 })
    let op = await transfer_tokens(
      { src : accounts[3],
        dest : accounts[0].pubKey,
        asset_id : asset_id4,
        amount : b})
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    await get_receipt(op)
  })

  it('Balance of account[3] should be 0 in ' + asset_id4, async () => {
    let b = await get_balance({ owner : accounts[3].pubKey,
                                asset_id : asset_id4 })
    assert.equal(b, 0)
  })

  it('Transfer 0 to self', async () => {
    let b0 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    let op = await transfer_tokens(
      { src : accounts[0],
        dest : accounts[0].pubKey,
        asset_id : asset_id1,
        amount : 0})
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let b1 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.equal(b0, b1)
    await get_receipt(op)
  })

  it('Transfer 1 to self', async () => {
    let b0 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    let op = await transfer_tokens(
      { src : accounts[0],
        dest : accounts[0].pubKey,
        asset_id : asset_id1,
        amount : 1})
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let b1 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.equal(b0, b1)
    assert.equal(b0, b1)
    await get_receipt(op)
  })

  it('Transfer whole to self', async () => {
    let b0 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    let op = await transfer_tokens(
      { src : accounts[0],
        dest : accounts[0].pubKey,
        asset_id : asset_id1,
        amount : b0})
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let b1 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.equal(b0, b1)
    await get_receipt(op)
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

  it('Try to transfer more than balance to self', async () => {
    await assert.rejects(
      async () => {
    let b : bigint = await get_balance_big_int({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    await transfer_tokens(
      { src : accounts[0],
        dest : accounts[0].pubKey,
        asset_id : asset_id1,
        amount : b + 1n})
      },
      { message : "FA2_INSUFFICIENT_BALANCE"})
  })

  it('Try to transfer non existing tokens to self', async () => {
    await assert.rejects(
      async () => {
    await transfer_tokens(
      { src : accounts[5],
        dest : accounts[5].pubKey,
        asset_id : asset_id1,
        amount : 1})
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
          {to_ : accountPkh(accounts[1]), token_id: token_id1, amount: 50},
        ],
      }]).send()
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
  })

})
  .afterAll(() =>
  FinP2PTezos.taquito
    .setSignerProvider(new InMemorySigner(Net.account.sk)))


describe('Hold / Execute / Release',  () => {

  it("Hold more than balance", async () => {
    let b0 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.equal(b0, 100)
    const expiration = 3600n;
    await assert.rejects(
      async () => {
        await hold_tokens(
          { hold_id: "HOLD-ID-0001",
            asset_id : asset_id1,
            src : accounts[0],
            dst : { kind: 'finId', dst: accounts[0].pubKey } ,
            amount : b0 + 1,
            expiration,
          })
      },
      { message : "FA2_INSUFFICIENT_BALANCE"})
  })

  it("Hold half balance", async () => {
    let b0 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.equal(b0, 100)
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "HOLD-ID-0001",
        asset_id : asset_id1,
        src : accounts[0],
        dst : { kind: 'finId', dst: accounts[1].pubKey },
        amount : 50,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.deepEqual(bi0, { balance: 100n, on_hold: 50n })
    let bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.equal(bs0, 50n)
  })

  it("Hold wrong signature", async () => {
    const expiration = 3600n;
    await assert.rejects(
      async () => {
        await hold_tokens(
          { hold_id: "HOLD-ID-0001",
            asset_id : asset_id1,
            src : accounts[0],
            dst : { kind: 'finId', dst: accounts[1].pubKey },
            amount : 1,
            expiration,
            signer : accounts[1]
          })
      },
      { message : "FINP2P_INVALID_SIGNATURE"})
  })

  it("Hold duplicate id", async () => {
    const expiration = 3600n;
    await assert.rejects(
      async () => {
        await hold_tokens(
          { hold_id: "HOLD-ID-0001",
            asset_id : asset_id1,
            src : accounts[0],
            dst : { kind: 'finId', dst: accounts[1].pubKey },
            amount : 1,
            expiration,
          })
      },
      { message : "FINP2P_HOLD_ALREADY_EXISTS"})
  })

  it("Hold on same token", async () => {
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "HOLD-ID-0002",
        asset_id : asset_id1,
        src : accounts[0],
        dst : { kind: 'finId', dst: accounts[2].pubKey },
        amount : 1,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.deepEqual(bi0, { balance: 100n, on_hold: 51n })
    let bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.equal(bs0, 49n)
  })

  it('Transfer more than spendable', async () => {
    let bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    await assert.rejects(
      async () => {
    await transfer_tokens(
      { src : accounts[0],
        dest : accounts[3].pubKey,
        asset_id : asset_id1,
        amount : bs0 + 1n,
      })
      },
      { message : "FA2_INSUFFICIENT_SPENDABLE_BALANCE"})
  })

  it('Transfer less than spendable', async () => {
    let bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    let b2 = await get_balance({
      owner : accounts[2].pubKey,
      asset_id : asset_id1 })
    assert.equal(bs0, 49n)
    assert.equal(b2, 0)
    let op = await transfer_tokens(
      { src : accounts[0],
        dest : accounts[2].pubKey,
        asset_id : asset_id1,
        amount : bs0,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let b0 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    b2 = await get_balance({
      owner : accounts[2].pubKey,
      asset_id : asset_id1 })
    assert.equal(b0, 51)
    assert.equal(b2, 49)
    let bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.deepEqual(bi0, { balance: 51n, on_hold: 51n })
    bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.equal(bs0, 0n)
  })

  it("Hold without destination", async () => {
    let b2 = await get_balance({
      owner : accounts[2].pubKey,
      asset_id : asset_id1 })
    assert.equal(b2, 49)
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "HOLD-ID-0003",
        asset_id : asset_id1,
        src : accounts[2],
        amount : 1,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi2 = await get_balance_info({
      owner : accounts[2].pubKey,
      asset_id : asset_id1 })
    assert.deepEqual(bi2, { balance: 49n, on_hold: 1n })
    let bs0 = await get_spendable_balance({
      owner : accounts[2].pubKey,
      asset_id : asset_id1 })
    assert.equal(bs0, 48n)
  })

  it("Hold with date in the past", async () => {
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "HOLD-ID-0004",
        asset_id : asset_id1,
        src : accounts[2],
        dst : { kind: 'finId', dst: accounts[1].pubKey },
        amount : 20,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi2 = await get_balance_info({
      owner : accounts[2].pubKey,
      asset_id : asset_id1 })
    assert.deepEqual(bi2, { balance: 49n, on_hold: 21n })
    let bs0 = await get_spendable_balance({
      owner : accounts[2].pubKey,
      asset_id : asset_id1 })
    assert.equal(bs0, 28n)
  })

  it("Hold for self", async () => {
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "HOLD-ID-0005",
        asset_id : asset_id1,
        src : accounts[2],
        dst : { kind: 'finId', dst: accounts[2].pubKey },
        amount : 10,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi2 = await get_balance_info({
      owner : accounts[2].pubKey,
      asset_id : asset_id1 })
    assert.deepEqual(bi2, { balance: 49n, on_hold: 31n })
    let bs0 = await get_spendable_balance({
      owner : accounts[2].pubKey,
      asset_id : asset_id1 })
    assert.equal(bs0, 18n)
  })

  it("Release missing hold", async () => {
    await assert.rejects(
      async () => {
        await release_hold(
          { hold_id: "HOLD-ID-0000" }
        )
      },
      { message : "FINP2P_UNKNOWN_HOLD_ID"})
  })

  it("Execute hold amount too large", async () => {
    await assert.rejects(
      async () => {
        await execute_hold(
          { hold_id: "HOLD-ID-0001",
            amount: 51
          }
        )
      },
      { message : "FA2_INSUFFICIENT_HOLD"})
  })

  it("Execute hold mismatch asset", async () => {

    await assert.rejects(
      async () => {
        await execute_hold(
          { hold_id: "HOLD-ID-0001",
            asset_id: asset_id4
          }
        )
      },
      { message : "UNEXPECTED_HOLD_ASSET_ID"})
  })

  it("Execute hold mismatch source", async () => {
    await assert.rejects(
      async () => {
        await execute_hold(
          { hold_id: "HOLD-ID-0001",
            src: accounts[1].pubKey
          }
        )
      },
      { message : "UNEXPECTED_HOLD_SOURCE"})
  })

  it("Execute hold mismatch destination", async () => {
    await assert.rejects(
      async () => {
        await execute_hold(
          { hold_id: "HOLD-ID-0001",
            dst : { kind: 'finId', dst: accounts[0].pubKey },
          }
        )
      },
      { message : "UNEXPECTED_EXECUTE_HOLD_DESTINATION"})
  })

  it("Execute hold", async () => {
    let bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.deepEqual(bi0, { balance: 51n, on_hold: 51n })
    let b1 = await get_spendable_balance({
      owner : accounts[1].pubKey,
      asset_id : asset_id1 })
    assert.equal(b1, 250n)
    let op = await execute_hold({ hold_id: "HOLD-ID-0001"})
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : asset_id1 })
    assert.deepEqual(bi0, { balance: 1n, on_hold: 1n })
    let bi1 = await get_balance_info({
      owner : accounts[1].pubKey,
      asset_id : asset_id1 })
    assert.deepEqual(bi1, { balance: 300n, on_hold: 0n })
  })



})


describe('External FA2 Escrow',  () => {

  let test_fa2 : string

  it("Deploy test FA2 contract", async () => {
    let op = await deployTestFA2(Net.account.pkh)
    await FinP2PTezos.waitInclusion(op)
    let addr = contractAddressOfOpHash(op.hash);
    FinP2PTezos.taquito.debug("Deployed at ${addr}")
    test_fa2 = addr
  })

  async function get_test_fa2_balance(pkh : string, token_id = 0n) {
    let contract = await FinP2PTezos.taquito.contract.at(test_fa2)
    const balance =
      await contract.contractViews.get_balance(
        [pkh, token_id]
      ).executeView({viewCaller : test_fa2})
    return (BigInt((balance || new BigNumber(0)).toString()));
  }

  it("Mint some FA2 tokens", async () => {
    let contract = await FinP2PTezos.taquito.contract.at(test_fa2)
    let op = await contract.methodsObject.mint({
      token_id : 0n,
      token_info : new MichelsonMap(),
      owners : [ [accountPkh(accounts[0]), 100n],
                 [accountPkh(accounts[1]), 100n],
                 // [accountPkh(accounts[2]), 100n],
                 // [accountPkh(accounts[3]), 100n],
                 // [accountPkh(accounts[4]), 100n],
                 // [accountPkh(accounts[5]), 100n],
               ]}).send()
    await FinP2PTezos.waitInclusion(op)
    const b0 = await get_test_fa2_balance(accountPkh(accounts[0]))
    const b1 = await get_test_fa2_balance(accountPkh(accounts[1]))
    assert.equal(b0, 100n)
    assert.equal(b1, 100n)
  })


  it("Register external FA2 token to proxy", async () => {
    let contract =
      await FinP2PTezos.taquito.contract.at(FinP2PTezos.config.finp2pProxyAddress)
    let op = await contract.methods.update_fa2_token(
      Finp2pProxy.Michelson.bytesToHex(utf8.encode(ext_asset_id)),
      test_fa2,
      0n
    ).send()
    await FinP2PTezos.waitInclusion(op)
    let b = await get_balance({ owner : accounts[0].pubKey,
                                asset_id : ext_asset_id })
    assert.equal(b, 100)
  })

  it("Send 10tz to account 0 and 2 (if needed)", async () => {
    let op = await FinP2PTezos.topUpXTZ([accountPkh(accounts[0]), accountPkh(accounts[2])], 10, Net.account.pkh)
    if (op !== undefined) {
      await FinP2PTezos.waitInclusion(op)
    }
  })

  it("Set proxy as operator of 0", async () => {
    FinP2PTezos.taquito.setSignerProvider(new InMemorySigner(
      accountSk(accounts[0])
    ));
    //---------
    let contract = await FinP2PTezos.taquito.contract.at(test_fa2)
    let op = await contract.methodsObject.update_operators([
      { add_operator:
        { owner : accountPkh(accounts[0]),
          operator : FinP2PTezos.config.finp2pProxyAddress,
          token_id : 0n }
      }
    ]).send()
    await FinP2PTezos.waitInclusion(op)
    //---------
    FinP2PTezos.taquito.setSignerProvider(new InMemorySigner(Net.account.sk));
  })

  it("Set proxy as operator of 2", async () => {
    FinP2PTezos.taquito.setSignerProvider(new InMemorySigner(
      accountSk(accounts[2])
    ));
    //---------
    let contract = await FinP2PTezos.taquito.contract.at(test_fa2)
    let op = await contract.methodsObject.update_operators([
      { add_operator:
        { owner : accountPkh(accounts[2]),
          operator : FinP2PTezos.config.finp2pProxyAddress,
          token_id : 0n }
      }
    ]).send()
    await FinP2PTezos.waitInclusion(op)
    //---------
    FinP2PTezos.taquito.setSignerProvider(new InMemorySigner(Net.account.sk));
  })


  it("Hold more than balance", async () => {
    let b0 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.equal(b0, 100)
    const expiration = 3600n;
    await assert.rejects(
      async () => {
        await hold_tokens(
          { hold_id: "EXT-HOLD-ID-0001",
            asset_id : ext_asset_id,
            src : accounts[0],
            dst : { kind: 'finId', dst: accounts[0].pubKey } ,
            amount : b0 + 1,
            expiration,
          })
      },
      { message : "FA2_INSUFFICIENT_BALANCE"})
  })

  it("Hold half balance", async () => {
    let b0 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.equal(b0, 100)
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "EXT-HOLD-ID-0001",
        asset_id : ext_asset_id,
        src : accounts[0],
        dst : { kind: 'finId', dst: accounts[1].pubKey },
        amount : 50,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.deepEqual(bi0, { balance: 100n, on_hold: 50n })
    let bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.equal(bs0, 50n)
  })

  it("Hold wrong signature", async () => {
    const expiration = 3600n;
    await assert.rejects(
      async () => {
        await hold_tokens(
          { hold_id: "EXT-HOLD-ID-0001",
            asset_id : ext_asset_id,
            src : accounts[0],
            dst : { kind: 'finId', dst: accounts[1].pubKey },
            amount : 1,
            expiration,
            signer : accounts[1]
          })
      },
      { message : "FINP2P_INVALID_SIGNATURE"})
  })

  it("Hold duplicate id", async () => {
    const expiration = 3600n;
    await assert.rejects(
      async () => {
        await hold_tokens(
          { hold_id: "EXT-HOLD-ID-0001",
            asset_id : ext_asset_id,
            src : accounts[0],
            dst : { kind: 'finId', dst: accounts[1].pubKey },
            amount : 1,
            expiration,
          })
      },
      { message : "FINP2P_HOLD_ALREADY_EXISTS"})
  })

  it("Hold on same token", async () => {
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "EXT-HOLD-ID-0002",
        asset_id : ext_asset_id,
        src : accounts[0],
        dst : { kind: 'finId', dst: accounts[2].pubKey },
        amount : 1,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.deepEqual(bi0, { balance: 100n, on_hold: 51n })
    let bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.equal(bs0, 49n)
  })

  it('Transfer more than spendable', async () => {
    let bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    await assert.rejects(
      async () => {
    await transfer_tokens(
      { src : accounts[0],
        dest : accounts[3].pubKey,
        asset_id : ext_asset_id,
        amount : bs0 + 1n,
      })
      },
      { message : "FA2_INSUFFICIENT_BALANCE"})
  })

  it('Transfer less than spendable', async () => {
    let bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    let b2 = await get_balance({
      owner : accounts[2].pubKey,
      asset_id : ext_asset_id })
    assert.equal(bs0, 49n)
    assert.equal(b2, 0)
    let op = await transfer_tokens(
      { src : accounts[0],
        dest : accounts[2].pubKey,
        asset_id : ext_asset_id,
        amount : bs0,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let b0 = await get_balance({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    b2 = await get_balance({
      owner : accounts[2].pubKey,
      asset_id : ext_asset_id })
    assert.equal(b0, 51)
    assert.equal(b2, 49)
    let bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.deepEqual(bi0, { balance: 51n, on_hold: 51n })
    bs0 = await get_spendable_balance({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.equal(bs0, 0n)
  })

  it("Hold without destination", async () => {
    let b2 = await get_balance({
      owner : accounts[2].pubKey,
      asset_id : ext_asset_id })
    assert.equal(b2, 49)
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "EXT-HOLD-ID-0003",
        asset_id : ext_asset_id,
        src : accounts[2],
        amount : 1,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi2 = await get_balance_info({
      owner : accounts[2].pubKey,
      asset_id : ext_asset_id })
    assert.deepEqual(bi2, { balance: 49n, on_hold: 1n })
    let bs0 = await get_spendable_balance({
      owner : accounts[2].pubKey,
      asset_id : ext_asset_id })
    assert.equal(bs0, 48n)
  })

  it("Hold with date in the past", async () => {
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "EXT-HOLD-ID-0004",
        asset_id : ext_asset_id,
        src : accounts[2],
        dst : { kind: 'finId', dst: accounts[1].pubKey },
        amount : 20,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi2 = await get_balance_info({
      owner : accounts[2].pubKey,
      asset_id : ext_asset_id })
    assert.deepEqual(bi2, { balance: 49n, on_hold: 21n })
    let bs0 = await get_spendable_balance({
      owner : accounts[2].pubKey,
      asset_id : ext_asset_id })
    assert.equal(bs0, 28n)
  })

  it("Hold for self", async () => {
    const expiration = 3600n;
    let op = await hold_tokens(
      { hold_id: "EXT-HOLD-ID-0005",
        asset_id : ext_asset_id,
        src : accounts[2],
        dst : { kind: 'finId', dst: accounts[2].pubKey },
        amount : 10,
        expiration,
      })
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    let bi2 = await get_balance_info({
      owner : accounts[2].pubKey,
      asset_id : ext_asset_id })
    assert.deepEqual(bi2, { balance: 49n, on_hold: 31n })
    let bs0 = await get_spendable_balance({
      owner : accounts[2].pubKey,
      asset_id : ext_asset_id })
    assert.equal(bs0, 18n)
  })

  it("Release missing hold", async () => {
    await assert.rejects(
      async () => {
        await release_hold(
          { hold_id: "EXT-HOLD-ID-0000" }
        )
      },
      { message : "FINP2P_UNKNOWN_HOLD_ID"})
  })

  it("Execute hold amount too large", async () => {
    await assert.rejects(
      async () => {
        await execute_hold(
          { hold_id: "EXT-HOLD-ID-0001",
            amount: 51
          }
        )
      },
      { message : "FA2_INSUFFICIENT_HOLD"})
  })

  it("Execute hold mismatch asset", async () => {
    await assert.rejects(
      async () => {
        await execute_hold(
          { hold_id: "EXT-HOLD-ID-0001",
            asset_id: asset_id1
          }
        )
      },
      { message : "UNEXPECTED_HOLD_ASSET_ID"})
  })

  it("Execute hold mismatch source", async () => {
    await assert.rejects(
      async () => {
        await execute_hold(
          { hold_id: "EXT-HOLD-ID-0001",
            src: accounts[1].pubKey
          }
        )
      },
      { message : "UNEXPECTED_HOLD_SOURCE"})
  })

  it("Execute hold mismatch destination", async () => {
    await assert.rejects(
      async () => {
        await execute_hold(
          { hold_id: "EXT-HOLD-ID-0001",
            dst : { kind: 'finId', dst: accounts[0].pubKey },
          }
        )
      },
      { message : "UNEXPECTED_EXECUTE_HOLD_DESTINATION"})
  })

  it("Execute hold", async () => {
    let bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.deepEqual(bi0, { balance: 51n, on_hold: 51n })
    let b1 = await get_spendable_balance({
      owner : accounts[1].pubKey,
      asset_id : ext_asset_id })
    assert.equal(b1, 100n)
    let op = await execute_hold({ hold_id: "EXT-HOLD-ID-0001"})
    log("waiting inclusion")
    await FinP2PTezos.waitInclusion(op)
    bi0 = await get_balance_info({
      owner : accounts[0].pubKey,
      asset_id : ext_asset_id })
    assert.deepEqual(bi0, { balance: 1n, on_hold: 1n })
    let bi1 = await get_balance_info({
      owner : accounts[1].pubKey,
      asset_id : ext_asset_id })
    assert.deepEqual(bi1, { balance: 150n, on_hold: 0n })
  })


})



})
  .beforeAll(Net.start_network)
  .afterAll(Net.stop_network)
