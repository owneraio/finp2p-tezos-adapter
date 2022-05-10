import 'mocha'
import { strict as assert } from 'assert';
import { FinP2PTezos, log, get_balance, transfer_tokens, hold_tokens, get_balance_info, get_spendable_balance, rollback_hold, release_hold, get_receipt } from './test_lib'

import { accounts, asset_id1, asset_id4 } from './test_variables';


export function run() {

  describe('Hold / Release / Rollback',  () => {

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
      await get_receipt(op)
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
      await get_receipt(op)
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
      await get_receipt(op)
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
      await get_receipt(op)
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
      await get_receipt(op)
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
      await get_receipt(op);
      let bi2 = await get_balance_info({
        owner : accounts[2].pubKey,
        asset_id : asset_id1 })
      assert.deepEqual(bi2, { balance: 49n, on_hold: 31n })
      let bs0 = await get_spendable_balance({
        owner : accounts[2].pubKey,
        asset_id : asset_id1 })
      assert.equal(bs0, 18n)
    })

    it("Rollback missing hold", async () => {
      await assert.rejects(
        async () => {
          await rollback_hold(
            { hold_id: "HOLD-ID-0000",
              asset_id : asset_id1,
            }
          )
        },
        { message : "FINP2P_UNKNOWN_HOLD_ID"})
    })

    it("Release hold amount too large", async () => {
      await assert.rejects(
        async () => {
          await release_hold(
            { hold_id: "HOLD-ID-0001",
              asset_id : asset_id1,
              amount: 51
            }
          )
        },
        { message : "FA2_INSUFFICIENT_HOLD"})
    })

    it("Release hold mismatch asset", async () => {

      await assert.rejects(
        async () => {
          await release_hold(
            { hold_id: "HOLD-ID-0001",
              asset_id: asset_id4
            }
          )
        },
        { message : "UNEXPECTED_HOLD_ASSET_ID"})
    })

    it("Release hold mismatch source", async () => {
      await assert.rejects(
        async () => {
          await release_hold(
            { hold_id: "HOLD-ID-0001",
              asset_id : asset_id1,
              src: accounts[1].pubKey
            }
          )
        },
        { message : "UNEXPECTED_HOLD_SOURCE"})
    })

    it("Release hold mismatch destination", async () => {
      await assert.rejects(
        async () => {
          await release_hold(
            { hold_id: "HOLD-ID-0001",
              asset_id : asset_id1,
              dst : { kind: 'finId', dst: accounts[0].pubKey },
            }
          )
        },
        { message : "UNEXPECTED_RELEASE_HOLD_DESTINATION"})
    })

    it("Release hold", async () => {
      let bi0 = await get_balance_info({
        owner : accounts[0].pubKey,
        asset_id : asset_id1 })
      assert.deepEqual(bi0, { balance: 51n, on_hold: 51n })
      let b1 = await get_spendable_balance({
        owner : accounts[1].pubKey,
        asset_id : asset_id1 })
      assert.equal(b1, 250n)
      let op = await release_hold({
        hold_id: "HOLD-ID-0001",
        asset_id : asset_id1,
        dst : { kind: 'finId', dst: accounts[1].pubKey },
      })
      log("waiting inclusion")
      await FinP2PTezos.waitInclusion(op)
      await get_receipt(op);
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

}
