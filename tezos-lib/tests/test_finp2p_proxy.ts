import 'mocha'
import { strict as assert } from 'assert';
import * as Finp2pProxy from '../finp2p_proxy'
import { FinP2PTezos, Net, log, get_balance, create_asset, get_receipt,
         issue_tokens, mk_issue_tokens, get_balance_big_int, transfer_tokens,
         redeem_tokens, mk_create_asset } from './test_lib'
import { InMemorySigner } from '@taquito/signer';

import { accounts, asset_id1, asset_id2, asset_id3_utf8, asset_id4,
         token_id1 } from './test_variables';

export function run() {

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
      await get_receipt(op)
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
      await Promise.all(ops.map(op => { return get_receipt(op)}))
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
      await get_receipt(op)
    })

    it('Issue 0 of token with 6 decimals', async () => {
      let op = await issue_tokens(
        { asset_id : asset_id4,
          dest : accounts[1],
          amount : 0 })
      log("waiting inclusion")
      await FinP2PTezos.waitInclusion(op)
      await get_receipt(op)
    })

    it('Issue 1.000000 of token with 6 decimals', async () => {
      let op = await issue_tokens(
        { asset_id : asset_id4,
          dest : accounts[1],
          amount : 1000000 })
      log("waiting inclusion")
      await FinP2PTezos.waitInclusion(op)
      await get_receipt(op)
    })

    it('Issue 1000000.000000 of token with 6 decimals', async () => {
      let op = await issue_tokens(
        { asset_id : asset_id4,
          dest : accounts[2],
          amount : 1000000000000 })
      log("waiting inclusion")
      await FinP2PTezos.waitInclusion(op)
      await get_receipt(op)
    })

    it(`Issue ${Number.MAX_SAFE_INTEGER}`, async () => {
      let op = await issue_tokens(
        { asset_id : asset_id4,
          dest : accounts[3],
          amount : Number.MAX_SAFE_INTEGER })
      log("waiting inclusion")
      await FinP2PTezos.waitInclusion(op)
      await get_receipt(op)
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
      await get_receipt(op1)
      await get_receipt(op2)
    })

    it(`Issue ${2n ** 64n - 1n}`, async () => {
      let op = await issue_tokens(
        { asset_id : asset_id4,
          dest : accounts[3],
          amount : 2n ** 64n - 1n })
      log("waiting inclusions")
      await FinP2PTezos.waitInclusion(op)
      await get_receipt(op)
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
      await get_receipt(op)
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
      await get_receipt(op)
    })

    it('Issue 2 tokens of ' + asset_id3_utf8, async () => {
      let op = await issue_tokens(
        { asset_id : asset_id3_utf8,
          dest : accounts[3],
          amount : 2 })
      log("waiting inclusion")
      await FinP2PTezos.waitInclusion(op)
      await get_receipt(op)
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
      await get_receipt(op)
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
}
