import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import  * as FINP2PProxy from '@owneraio/tezos-lib/tezos-lib/finp2p_proxy';
import { TextEncoder } from 'util';
import { logger } from '../helpers/logger';
import { account, contracts, nodeAddr } from '../helpers/config';

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
  template: Template
}

export interface Template {
  hashGroups: Array<HashGroup>
  hash: string
}

export interface HashGroup {
  hash: string
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

let tokenId =  Math.floor((new Date()).getTime() / 1000);

export class TokenService {
  tezosClient: FINP2PProxy.FinP2PTezos;

  private constructor() {
    let Tezos = new TezosToolkit(nodeAddr);
    // Tell Taquito to use our private key for signing transactions
    Tezos.setSignerProvider(new InMemorySigner(account.sk));
    // Initialize FinP2P library
    let config: FINP2PProxy.config = {
      admin : account.pkh,
      finp2p_auth_address : contracts.finp2p_auth_address,
      finp2p_fa2_address : contracts.finp2p_fa2_address,
      finp2p_proxy_address : contracts.finp2p_proxy_address,
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
      shg: new Uint8Array(),
      new_token_info: newTokenParams,
    });
    await this.tezosClient.wait_inclusion(op);
  }

  public async issue(request: IssueRequest): Promise<Receipt> {
    const op = await this.tezosClient.issue_tokens({
      asset_id: utf8.encode(request.assetId),
      nonce: { nonce: utf8.encode(''), timestamp: new Date() },
      dst_account: '0x01' /* secp256k1 */ + request.recipientPublicKey,
      amount: BigInt(request.quantity),
      shg: new Uint8Array(),
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
    let shg = new Uint8Array();
    if (request.signatureTemplate.template.hashGroups) {
      const hashGroups = request.signatureTemplate.template.hashGroups
        .filter((hg, index) => {
          return index != 0;
        })
        .map((hg) => {
          return hg.hash;
        });
      //Currently the tezos contracts supports directly the settlement condition hash group so assuming just one hashGroup exists
      if ( hashGroups.length > 0){
        shg = Buffer.from(hashGroups[0], 'hex');
      }
    }

    const nonceBytes = Buffer.from(request.nonce, 'hex');
    const noncePre = nonceBytes.slice(0, 24);

    let params = {
      asset_id: utf8.encode(request.assetId),
      nonce: { nonce: noncePre, timestamp: new Date(Number(nonceBytes.readBigInt64BE(24)) * 1000 ) },
      src_account: '0x01' /* secp256k1 */ + request.sourcePublicKey,
      dst_account: '0x01' /* secp256k1 */ + request.recipientPublicKey,
      amount: BigInt(request.quantity),
      shg: shg,
      signature: '0x' + request.signatureTemplate.signature,
    };
    const op = await this.tezosClient.transfer_tokens(params);
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
    logger.debug('balance', { assetId, sourcePublicKey });
    return 0;
  }

  public async redeem(request:RedeemRequest) : Promise<Receipt> {
    //TODO: implement
    logger.debug('redeem', { request });
    return {
    } as Receipt;
  }

}

