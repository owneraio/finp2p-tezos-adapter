import 'mocha'
import { strict as assert } from 'assert';
import { FinP2PTezos, Net, log, accountPkh, accountSk } from './test_lib'
import { InMemorySigner } from '@taquito/signer';

import { accounts, token_id1 } from './test_variables';

export function run() {

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
}
