import { InMemorySigner } from '@taquito/signer'
import * as Finp2pProxy from '../finp2p_proxy'
import { promisify } from "util";

import * as fs from 'fs'
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

async function main (file : string) {

  var fileContents = await readFile(file, 'utf8')
  var testnetConfig = JSON.parse(fileContents)

  const config =
    testnetConfig as Finp2pProxy.Config & {
      account : {pk : string; pkh : string; sk : string}
      blockTime : number }

  // Remove smart contracts from config to force redeployment
  config.finp2pAuthAddress = undefined
  config.finp2pFA2Address = undefined
  config.finp2pProxyAddress = undefined

  const FinP2PTezos = new Finp2pProxy.FinP2PTezos(config)
  const signer = new InMemorySigner(config.account.sk)
  FinP2PTezos.registerSigner(signer)
  FinP2PTezos.taquito.setSignerProvider(signer)

  console.log('Redeploying contracts')
  await FinP2PTezos.init({
    operationTTL : {
      ttl : BigInt(15 * config.blockTime), // 15 blocks
      allowed_in_the_future : BigInt(2 * config.blockTime) // 2 block
    },
    fa2Metadata : { name : "FinP2P FA2 assets",
                    description : "FinP2P assets for ORG" }
  })

  // This is in case we want to redeploy and change the config
  console.log('\nContracts redeployed')
  console.log(`Auth  : ${FinP2PTezos.config.finp2pAuthAddress}`)
  console.log(`FA2   : ${FinP2PTezos.config.finp2pFA2Address}`)
  console.log(`Proxy : ${FinP2PTezos.config.finp2pProxyAddress}`)

  console.log('\nWriting configuration file');
  testnetConfig.finp2pAuthAddress = FinP2PTezos.config.finp2pAuthAddress;
  testnetConfig.finp2pFA2Address = FinP2PTezos.config.finp2pFA2Address;
  testnetConfig.finp2pProxyAddress = FinP2PTezos.config.finp2pProxyAddress;

  await writeFile(file, JSON.stringify(testnetConfig, null, 2))
  console.log(`File ${file} written`);
}

(async () => { (main (process.argv[2])).catch(console.error) })()
