import { MichelsonMap,  OriginationOperation } from "@taquito/taquito"
import { InMemorySigner } from '@taquito/signer'
import { getPkhfromPk, b58cencode, b58cdecode, encodeKey, prefix } from '@taquito/utils';

import * as secp256k1 from 'secp256k1';
import * as crypto from 'crypto';
import { createBLAKE2b } from 'hash-wasm';
import * as Ed25519 from '@stablelib/ed25519'
import * as child_process from "child_process";
import { promisify } from "util";
const exec = promisify(child_process.exec);

import * as Finp2pProxy from '../finp2p_proxy'
import { OperationResult  } from '../taquito_wrapper';

import * as testFa2Code from '../../dist/michelson/for_tests/test_fa2.json';

import * as testnetConfig from '../../configs/testnet-config.json';

const utf8 = new TextEncoder()

let debug = false
switch (process.env.DEBUG) {
  case 'true':
    debug = true
    break
  default:
}

export function gen_tz_account() {
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

module Testnet {

  export const config =
    testnetConfig as
      Finp2pProxy.Config &
      {account : {pk : string; pkh : string; sk : string}}

  // This is the account that we will use to sign transactions on Tezos Note that
  // this account must also be an admin of the `finp2p_proxy` contract
  // Testnet faucet accounts can be obtained here: https://teztnets.xyz
  export const account = config.account

  export const other_account = {
    pkh : "tz1Uxpw1ojH9r2k48vfNiB7CTrPbniJgmeGG",
    pk : "edpkuwHfFne6tDwVzu4R68zms2peRCTCeqXVWQBKnH9QVgpfAfCKq7",
    sk : "edsk3FDTtBzp7M5ktcjdSy8tPezGDfjwGxQXuSyGhLaHGQ5uStTcq3"
  }

  export const accounts = [account].concat(extra_accounts)

  export async function start_network() { }
  export async function stop_network() { }

  export var block_time = 30

  config.admins = accounts.map(a => a.pkh)
  config.debug = debug
  config.explorers.map ((e : any) => e.kind = (e.kind as 'TzKT' | 'tzstats'));

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

  export const accounts = [account].concat(extra_accounts)

  let flextesa_image = 'oxheadalpha/flextesa:latest'
  let flexteas_script : string
  switch (process.env.FINP2P_SANDBOX_NETWORK) {
    case 'ithaca':
    case 'ithacabox':
      flexteas_script = 'ithacabox'
      break
    case 'jakarta':
    case 'jakartabox':
      flexteas_script = 'jakartabox'
      break
    case 'alpha':
    case 'alphabox':
      flexteas_script = 'alphabox'
      break
    case undefined:
      flexteas_script = 'ithacabox';
      break
    default:
      flexteas_script = process.env.FINP2P_SANDBOX_NETWORK
  }

  export var block_time = 1

  const port = parseInt(process.env.PORT) || 20000;

  var container_name = `finp2p-sandbox-${port}`

  async function rec_wait_for_level(level : number, timeout_stamp : Date) {
    if (new Date() > timeout_stamp) { throw Error(`Timeout waiting for level ${level} in flextesa`)}
    try
    { const { stdout } =
      await exec(`docker exec ${container_name} tezos-client rpc get /chains/main/blocks/head/header | jq .level`)
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
      [`docker run --rm --name ${container_name}`,
       `--detach -p ${port}:20000`,
       `-e block_time=${block_time}`,
       flextesa_image,
       script, 'start'
      ].join(' ')
    )
    await wait_for_level(2) // level 0 = genesis, level 1 = activation block
    console.log('\nStarted')
  }

  export async function stop_network (container = container_name) {
    console.log('Stopping sandbox')
    await exec (`docker stop ${container}`)
  }

  export const config: Finp2pProxy.Config = {
    url : `http://localhost:${port}`,
    explorers : [],
    admins : accounts.map(a => a.pkh),
    debug
  }

  export const poll : number | undefined = 500 // ms

}

export var Net : typeof Flextesa

switch (process.env.FINP2P_TEST_NETWORK) {
  case 'testnet':
    Net = Testnet
    break
  default:
    Net = Flextesa
}

export const FinP2PTezos = new Finp2pProxy.FinP2PTezos(Net.config)

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


export function log (message?: any, ...optionalParams: any[]) {
  if (Net.config.debug) { console.log(message, ...optionalParams) }
}

// Only get receipts if network has explorers associated
export function get_receipt (op : OperationResult) : Promise<any>{
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

export type finp2p_account = {
  pubKey : Buffer;
  privKey : Buffer;
}

export function gen_finp2p_account () : finp2p_account {
  let sk = crypto.randomBytes(32)
  let pk = secp256k1.publicKeyCreate(sk)
  return { pubKey : Buffer.from(pk), privKey : sk }
}

export function to_str(x : any) : string {
  if (typeof x === 'string') { return x }
  return JSON.stringify(x)
}

export function pubkey_to_tezos_secp256k1(pubKey : Buffer) : string {
  return ('0x01' /* secp256k1 */ + pubKey.toString('hex'))
}

export function pkh_to_bytes(pkh : string) : Uint8Array {
  const b = b58cdecode(pkh, prefix.tz1);
  switch (pkh.slice(0,3)) {
    case 'tz1': return new Uint8Array([...[0], ...b]);
    case 'tz2': return new Uint8Array([...[1], ...b]);
    case 'tz3': return new Uint8Array([...[2], ...b]);
    default: throw undefined;
  }
}

export function generateNonce(): Finp2pProxy.Finp2pNonce {
  return {
    nonce : crypto.randomBytes(24) ,
    timestamp : new Date()
  }
}

export function dateToSec(d : Date) : number {
  return Math.floor(d.getTime() / 1000);
}

export function nonce_to_bytes(n: Finp2pProxy.Finp2pNonce) : Buffer {
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

export async function mk_issue_tokens(i : {
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

export async function issue_tokens (i : {
  dest : finp2p_account;
  asset_id : string,
  amount : number | bigint,
  options? : Finp2pProxy.CallOptions,
}) {
  let param = await mk_issue_tokens(i)
  log("Issue parameters:", param)
  return await FinP2PTezos.issueTokens(param, i.options)
}

export function mk_create_asset (i : {
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

export async function create_asset (i : {
  asset_id : string,
  metadata: any,
  token_id? : number,
  options? : Finp2pProxy.CallOptions,
}) {
  let param = mk_create_asset(i)
  log("Create parameters:", param)
  return await FinP2PTezos.createAsset(param, i.options)
}

export async function mk_transfer_tokens(i : {
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

export async function transfer_tokens(i : {
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

export async function mk_redeem_tokens(i : {
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

export async function redeem_tokens(i : {
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

export async function mk_hold_tokens(i : {
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

export async function hold_tokens(i : {
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

export async function mk_execute_hold(i : {
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

export async function execute_hold(i : {
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

export async function mk_release_hold(i : {
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

export async function release_hold(i : {
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

export async function get_balance_big_int(i : {
  owner : Buffer,
  asset_id : string}) {
  return await FinP2PTezos.getAssetBalance(
    pubkey_to_tezos_secp256k1(i.owner),
    utf8.encode(i.asset_id)
  )
}

export async function get_balance(i : {
  owner : Buffer,
  asset_id : string}) {
  let balance = await get_balance_big_int(i)
  return Number(balance)
}

export async function get_spendable_balance(i : {
  owner : Buffer,
  asset_id : string}) {
  return await FinP2PTezos.getAssetSpendableBalance(
    pubkey_to_tezos_secp256k1(i.owner),
    utf8.encode(i.asset_id)
  )
}

export async function get_balance_info(i : {
  owner : Buffer,
  asset_id : string}) {
  return await FinP2PTezos.getAssetBalanceInfo(
    pubkey_to_tezos_secp256k1(i.owner),
    utf8.encode(i.asset_id)
  )
}

export function accountPkh(account : finp2p_account) {
  return getPkhfromPk(encodeKey('01' + account.pubKey.toString('hex')))
}

export function accountSk(account : finp2p_account) {
  return b58cencode(account.privKey.toString('hex'), prefix.spsk)
}

// Deploy a test FA2 contract
export async function deployTestFA2(
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
