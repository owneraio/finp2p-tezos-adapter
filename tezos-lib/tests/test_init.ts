import 'mocha'
import { FinP2PTezos, Net, log, gen_finp2p_account } from './test_lib'
import { accounts } from './test_variables';

export function run() {

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

}
