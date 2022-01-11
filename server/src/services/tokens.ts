import { InMemorySigner } from '@taquito/signer';
import  * as FINP2PProxy from '@owneraio/tezos-lib/tezos-lib/finp2p_proxy';
import { TextEncoder } from 'util';
import { logger } from '../helpers/logger';
import { accounts, contracts, nodeAddr, explorers } from '../helpers/config';

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

export class TokenService {
  tezosClient: FINP2PProxy.FinP2PTezos;

  private constructor() {
    // Initialize FinP2P library
    let config: FINP2PProxy.Config = {
      url : nodeAddr,
      explorers,
      admins : accounts.map(a => a.pkh),
      finp2pAuthAddress : contracts.finp2pAuthAddress,
      finp2pFA2Address : contracts.finp2pFA2Address,
      finp2pProxyAddress : contracts.finp2pProxyAddress,
      debug: false,
    };
    this.tezosClient = new FINP2PProxy.FinP2PTezos(config);
    accounts.map(a =>
      this.tezosClient.registerSigner(new InMemorySigner(a.sk)),
    );
  }

  public static GetService(): TokenService {
    if (!service){
      service = new TokenService();
    }
    return service;
  }

  public async onCreateAsset(assetId: string) {
    logger.info('creating asset', { assetId });
    // @ts-ignore
    let newTokenParams = this.tezosClient.gen_new_token(assetId, assetId);
    const op = await this.tezosClient.createAsset({
      asset_id: utf8.encode(assetId),
      new_token_info: newTokenParams,
    });
    await this.tezosClient.waitInclusion(op);
  }

  public async issue(request: IssueRequest): Promise<Receipt> {
    const op = await this.tezosClient.issueTokens({
      asset_id: utf8.encode(request.assetId),
      nonce: { nonce: utf8.encode(''), timestamp: new Date() },
      dst_account: '0x01' /* secp256k1 */ + request.recipientPublicKey,
      amount: BigInt(request.quantity),
      shg: new Uint8Array(),
    });
    await this.tezosClient.waitInclusion(op);
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
        .filter((_, index) => {
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
    const op = await this.tezosClient.transferTokens(params);
    await this.tezosClient.waitInclusion(op);
    return {
      transactionId: op.hash,
      assetId: request.assetId,
      sourcePublicKey: request.sourcePublicKey,
      recipientPublicKey: request.recipientPublicKey,
      quantity: request.quantity,
    } as Receipt;
  }

  public async getReceipt(id: string) : Promise<Receipt> {
    const r = await this.tezosClient.getReceipt({ hash : id });
    return {
      transactionId: id,
      assetId: r.assetId,
      sourcePublicKey:
        (r.srcAccount === undefined) ? undefined : r.srcAccount.toString('hex'),
      recipientPublicKey:
        (r.dstAccount === undefined) ? undefined : r.dstAccount.toString('hex'),
      quantity: (r.amount === undefined) ? undefined : r.amount.toString(),
    } as Receipt;
  }

  public async balance(assetId:string, sourcePublicKey:string): Promise<number> {
    logger.debug('balance', { assetId, sourcePublicKey });
    const balance = await this.tezosClient.getAssetBalance(
      '0x01' /* secp256k1 */ + sourcePublicKey,
      utf8.encode(assetId),
    );
    return Number(balance);
  }

  public async redeem(request:RedeemRequest) : Promise<Receipt> {
    //TODO: implement
    logger.debug('redeem', { request });
    return {
    } as Receipt;
  }

}

