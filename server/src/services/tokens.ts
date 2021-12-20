import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import  * as FINP2PProxy from '@owneraio/tezos-lib/tezos-lib/finp2p_proxy';
import { TextEncoder } from 'util';
import crypto from 'crypto';
import { logger } from '../helpers/logger';

let service:TokenService;
let utf8 = new TextEncoder();

export interface IssueRequest {
  assetId: string;
  recipientPublicKey: string;
  quantity: string;
  settlementRef: string;
}

export interface TransferRequest {
  nonce: string;
  assetId: string;
  sourcePublicKey: string;
  recipientPublicKey: string;
  quantity: string;
  signatureTemplate: SignatureTemplate
  settlementRef: string;
}

export interface RedeemRequest {
  nonce: string;
  assetId: string;
  sourcePublicKey: string;
  quantity: string;
  signatureTemplate: SignatureTemplate
}


export interface SignatureTemplate {
  signature: string
}

export interface Receipt {
  transactionId: string;
  assetId: string;
  recipientPublicKey: string;
  sourcePublicKey: string;
  quantity: string;
  settlementRef: string;
  //TODO: add transactionDetails
}

//TODO: move this to configuration
// This is the account that we will use to sign transactions on Tezos Note that
// this account must also be an admin of the `finp2p_proxy` contract
let account = {
  pkh : 'tz1ST4PBJJT1WqwGfAGkcS5w2zyBCmDGdDMz',
  pk : 'edpkuDn6QhAiGahpciQicYAgdjoXZTP1hqLRxs9ZN1bLSexJZ5tJVq',
  sk : 'edskRmhHemySiAV8gmhiV2UExyynQKv6tMAVgxur59J1ZFGr5dbu3SH2XU9s7ZkQE6NYFFjzNPyhuSxfrfgd476wcJo2Z9GsZS',
};

//TODO: what is this?
let shg = crypto.randomBytes(32);

var tokenId =  Math.floor((new Date()).getTime() / 1000);

export class TokenService {
  tezosClient: FINP2PProxy.FinP2PTezos;

  private constructor() {
    let Tezos = new TezosToolkit('https://rpc.hangzhounet.teztnets.xyz');
    // Tell Taquito to use our private key for signing transactions
    Tezos.setSignerProvider(new InMemorySigner(account.sk));
    // Initialize FinP2P library
    let config: FINP2PProxy.config = {
      admin : account.pkh,
      finp2p_auth_address : 'KT1N2ASxaShJETXs5yarM7rozTq4SwWMKTYY',
      finp2p_fa2_address : 'KT19fMJ34XeivLXDfkSm5cSTfuX9TtjPzQEJ',
      finp2p_proxy_address : 'KT1MvSFwHpSguMi8Ra1q8sey7cx2b7EfWSim',
      debug: false,
    };

    this.tezosClient = new FINP2PProxy.FinP2PTezos(Tezos, config);
  }

  public static GetService(): TokenService {
    if (!service){
      service = new TokenService();
    }
    return service;
  }

  public async onCreateAsset(assetId: string) {
    //TODO: temporary solution for "creating" the asset, by issuing with dummy dst address and amount 0. Need to have an API on the contract to do this
    logger.info('creating asset', { assetId });
    // @ts-ignore
    let newTokenParams = this.tezosClient.gen_new_token(assetId, assetId, ++tokenId);
    const op = await this.tezosClient.issue_tokens({
      asset_id: utf8.encode(assetId),
      nonce: { nonce: utf8.encode(''), timestamp: new Date() },
      dst_account: '0x01' /* secp256k1 */ + '0359bb16f5e103deb5c35f08aacfe59e6ad2694ab8623a5f754b778fdb2276d166',
      amount: BigInt(0),
      shg,
      new_token_info: newTokenParams,
    });
    await this.tezosClient.wait_inclusion(op);
  }

  public async issue(request: IssueRequest): Promise<Receipt> {
    const op = await this.tezosClient.issue_tokens({
      asset_id: utf8.encode(request.assetId),
      nonce: { nonce: utf8.encode(''), timestamp: new Date() },
      dst_account: '0x01' /* secp256k1 */ + (request.recipientPublicKey as unknown as Buffer).toString('hex'),
      amount: BigInt(request.quantity),
      shg,
    });
    await this.tezosClient.wait_inclusion(op);
    return {
      transactionId: op.hash,
      assetId: request.assetId,
      recipientPublicKey: request.recipientPublicKey,
      quantity: request.quantity,
    } as Receipt;
  }

  public async transfer(request: TransferRequest): Promise<Receipt> {
    //TODO: add hashGroup
    const op = await this.tezosClient.transfer_tokens({
      asset_id: utf8.encode(request.assetId),
      nonce: { nonce: utf8.encode(request.nonce), timestamp: new Date() },
      src_account: '0x01' /* secp256k1 */ + (request.sourcePublicKey as unknown as Buffer).toString('hex'),
      dst_account: '0x01' /* secp256k1 */ + (request.recipientPublicKey as unknown as Buffer).toString('hex'),
      amount: BigInt(request.quantity),
      shg,
      signature: '0x' + request.signatureTemplate.signature,
    });
    await this.tezosClient.wait_inclusion(op);
    return {
      transactionId: op.hash,
      assetId: request.assetId,
      sourcePublicKey: request.sourcePublicKey,
      recipientPublicKey: request.recipientPublicKey,
      quantity: request.quantity,
    } as Receipt;
  }

  public async getReceipt(id: string) : Promise<Receipt> {
    //TODO: implement
    return {
      transactionId: id,
    } as Receipt;
  }

  public async balance(assetId:string, sourcePublicKey:string): Promise<number> {
    //TODO: implement
    logger.debug("balance", {assetId, sourcePublicKey});
    return 0;
  }

  public async redeem(request:RedeemRequest) : Promise<Receipt> {
    //TODO: implement
    logger.debug("redeem", {request});
    return {
    } as Receipt;
  }

}

