import 'mocha'
import { strict as assert } from 'assert';
import { contractAddressOfOpHash  } from '../taquito_wrapper';
import { BigNumber } from 'bignumber.js';
import * as Finp2pProxy from '../finp2p_proxy'
import { finp2p_account, FinP2PTezos, Net, log, gen_finp2p_account, get_balance, create_asset, get_receipt, issue_tokens, mk_issue_tokens, get_balance_big_int, transfer_tokens, redeem_tokens, accountPkh, accountSk, hold_tokens, get_balance_info, get_spendable_balance, release_hold, execute_hold, deployTestFA2, mk_create_asset } from './test_lib'
import { InMemorySigner } from '@taquito/signer';
import { MichelsonMap } from '@taquito/michelson-encoder';

const utf8 = new TextEncoder()

var accounts : finp2p_account [] = []

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
  // var asset_id5 = "ORG:102:asset-id4-" + (new Date()).toISOString()
  // var asset_id6 = "ORG:102:asset-id4-" + (new Date()).toISOString()
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
