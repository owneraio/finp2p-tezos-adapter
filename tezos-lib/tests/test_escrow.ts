import 'mocha'
import { strict as assert } from 'assert';
import { contractAddressOfOpHash  } from '../taquito_wrapper';
import { BigNumber } from 'bignumber.js';
import * as Finp2pProxy from '../finp2p_proxy'
import { FinP2PTezos, Net, log, get_balance, transfer_tokens, accountPkh, accountSk, hold_tokens, get_balance_info, get_spendable_balance, rollback_hold, release_hold, deployTestFA2 } from './test_lib'
import { InMemorySigner } from '@taquito/signer';
import { MichelsonMap } from '@taquito/michelson-encoder';

import { accounts, asset_id1, ext_asset_id, utf8 } from './test_variables';

export function run() {

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

    it("Rollback missing hold", async () => {
      await assert.rejects(
        async () => {
          await rollback_hold(
            { hold_id: "EXT-HOLD-ID-0000" }
          )
        },
        { message : "FINP2P_UNKNOWN_HOLD_ID"})
    })

    it("Release hold amount too large", async () => {
      await assert.rejects(
        async () => {
          await release_hold(
            { hold_id: "EXT-HOLD-ID-0001",
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
            { hold_id: "EXT-HOLD-ID-0001",
              asset_id: asset_id1
            }
          )
        },
        { message : "UNEXPECTED_HOLD_ASSET_ID"})
    })

    it("Release hold mismatch source", async () => {
      await assert.rejects(
        async () => {
          await release_hold(
            { hold_id: "EXT-HOLD-ID-0001",
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
            { hold_id: "EXT-HOLD-ID-0001",
              dst : { kind: 'finId', dst: accounts[0].pubKey },
            }
          )
        },
        { message : "UNEXPECTED_RELEASE_HOLD_DESTINATION"})
    })

    it("Release hold", async () => {
      let bi0 = await get_balance_info({
        owner : accounts[0].pubKey,
        asset_id : ext_asset_id })
      assert.deepEqual(bi0, { balance: 51n, on_hold: 51n })
      let b1 = await get_spendable_balance({
        owner : accounts[1].pubKey,
        asset_id : ext_asset_id })
      assert.equal(b1, 100n)
      let op = await release_hold({ hold_id: "EXT-HOLD-ID-0001"})
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

}
