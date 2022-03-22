import { InMemorySigner } from '@taquito/signer';
import  * as FINP2PProxy from '@owneraio/tezos-lib/tezos-lib/finp2p_proxy';
import { TextEncoder } from 'util';
import { logger } from '../helpers/logger';
import { accounts, contracts, nodeAddr, explorers } from '../helpers/config';

let service:TokenService;
let utf8 = new TextEncoder();

function pubkeyToTezosSecp256k1(pubKey : string) : string {
  return ('0x01' /* secp256k1 */ + pubKey);
}

function getFieldFromSignature(template: Components.Schemas.SignatureTemplate, hgIndex: number, name: string) : Components.Schemas.Field {
  if (template.hashGroups[hgIndex] == null || template.hashGroups[hgIndex].fields == null) {
    throw Error(`hashGroups ${hgIndex} not found in signature template`);
  }
  let f = template.hashGroups[hgIndex].fields?.find(element => element.name == name);
  if (f == undefined) {
    throw Error(`field ${name} not found in signature template`);
  }
  return f;
}

function getEscrowAsset(asset: Components.Schemas.Asset) : string {
  let assetId: string;
  if (asset.type == 'cryptocurrency') {
    if ('code' in asset) {
      assetId = asset.code;
    } else {
      throw new Error('invalid asset type');
    }
  } else if (asset.type == 'fiat'){
    if ('code' in asset) {
      assetId = asset.code;
    } else {
      throw new Error('invalid asset type');
    }
  } else if (asset.type == 'finp2p'){
    if ('resourceId' in asset) {
      assetId = asset.resourceId;
    } else {
      throw new Error('invalid asset type');
    }
  } else {
    throw Error('asset type not supported');
  }
  return assetId;
}

function getEscrowDestination(destination: Components.Schemas.Destination | undefined) : FINP2PProxy.HoldDst | undefined{
  let dstAccount : FINP2PProxy.HoldDst  | undefined;
  if (destination){
    if ( destination.type == 'escrow' ){
      if ('finId' in destination) {
        dstAccount = { kind: 'Other', dst: utf8.encode(destination.finId) } as FINP2PProxy.OtherHoldDst;
      } else {
        throw new Error('invalid destination type');
      }
    } else if ( destination.type == 'cryptoWallet' ){
      if ('address' in destination) {
        dstAccount = { kind: 'Tezos', pkh: destination.address } as FINP2PProxy.TezosHoldDst;
      } else {
        throw new Error('invalid destination type');
      }
    } else if ( destination.type == 'finId' ){
      if ('finId' in destination) {
        dstAccount = { kind: 'FinId', key: pubkeyToTezosSecp256k1(destination.finId) } as FINP2PProxy.FinIdHoldDst;
      } else {
        throw new Error('invalid destination type');
      }
    } else {
      throw new Error('unsupported destination');
    }
  }
  return dstAccount;
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
      debug: true,
    };
    logger.debug('starting client', { config });
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

  public async onCreateAsset(request: Paths.CreateAsset.RequestBody) {
    logger.info('creating asset', { request });
    if (request.asset.type != 'finp2p'){
      throw new Error('unsupported asset type');
    }
    if ('resourceId' in request.asset) {
      let newTokenParams = this.tezosClient.genNewToken(request.asset.resourceId, request.asset.resourceId);
      const op = await this.tezosClient.createAsset({
        asset_id: utf8.encode(request.asset.resourceId),
        new_token_info: newTokenParams,
      });
      await this.tezosClient.waitInclusion(op);
    } else {
      throw new Error('invalid asset type');
    }
  }

  public async issue(request: Paths.IssueAssets.RequestBody): Promise<Paths.IssueAssets.Responses.$200> {
    if (request.asset.type != 'finp2p'){
      throw new Error('unsupported asset type');
    }
    const finp2pAsset = request.asset as Components.Schemas.Finp2pAsset;
    const op = await this.tezosClient.issueTokens({
      asset_id: utf8.encode(finp2pAsset.resourceId),
      nonce: { nonce: utf8.encode(''), timestamp: new Date() },
      dst_account: '0x01' /* secp256k1 */ + request.destination.finId,
      amount: BigInt(request.quantity),
      shg: new Uint8Array(),
    } as FINP2PProxy.IssueTokensParam);
    await this.tezosClient.waitInclusion(op);
    return {
      isCompleted: true,
      response: {
        id: op.hash,
        asset: request.asset,
        destination: request.destination.finId,
        quantity: request.quantity,
      } as Components.Schemas.Receipt,
    } as Components.Schemas.ReceiptOperation;
  }

  public async transfer(request: Paths.Transfer.RequestBody): Promise<Paths.Transfer.Responses.$200> {
    let shg = new Uint8Array();
    if (request.signature?.template?.hashGroups) {
      const hashGroups = request.signature.template.hashGroups
        .filter((_, index) => {
          return index != 0;
        })
        .map((hg) => {
          return hg.hash;
        });
      //Currently the tezos contracts supports directly the settlement condition hash group so assuming just one hashGroup exists
      if ( hashGroups.length > 0){
        shg = Buffer.from(hashGroups[0] as string, 'hex');
      }
    }
    if (request.asset.type != 'finp2p'){
      throw new Error('unsupported asset type');
    }
    const finp2pAsset = request.asset as Components.Schemas.Finp2pAsset;
    //TODO: missing finp2p account type
    let destination;
    if (request.destination.type == 'finId'){
      if ('finId' in request.destination) {
        destination = request.destination.finId;
      } else {
        throw new Error('invalid destination type');
      }
    } else if (request.destination.type == 'cryptoWallet') {
      if ('address' in request.destination) {
        destination = request.destination.address;
      } else {
        throw new Error('invalid destination type');
      }
    } else {
      throw new Error('unsupported destination type');
    }

    const nonceBytes = Buffer.from(request.nonce, 'hex');
    const noncePre = nonceBytes.slice(0, 24);

    let params : FINP2PProxy.TransferTokensParam = {
      asset_id: utf8.encode(finp2pAsset.resourceId),
      nonce: { nonce: noncePre, timestamp: new Date(Number(nonceBytes.readBigInt64BE(24)) * 1000 ) },
      src_account: pubkeyToTezosSecp256k1(request.source.finId),
      dst_account: pubkeyToTezosSecp256k1(destination),
      amount: BigInt(request.quantity),
      shg: shg,
      signature: '0x' + request.signature.signature,
    };
    const op = await this.tezosClient.transferTokens(params);
    await this.tezosClient.waitInclusion(op);
    //TODO: what if destination is not finId?
    return {
      isCompleted: true,
      response: {
        id: op.hash,
        asset: request.asset,
        source: request.source.finId,
        destination: destination,
        quantity: request.quantity,
      } as Components.Schemas.Receipt,
    } as Components.Schemas.ReceiptOperation;
  }

  public async getReceipt(id: Paths.GetReceipt.Parameters.TransactionId) : Promise<Paths.GetReceipt.Responses.$200> {
    const r = await this.tezosClient.getReceipt({ hash : id });
    //TODO: what if destination is not finId?
    return {
      isCompleted: true,
      response: {
        id: id,
        asset: { type: 'finp2p', resourceId: r.assetId } as Components.Schemas.Asset,
        source:
            (r.srcAccount === undefined) ? undefined : r.srcAccount.toString('hex'),
        destination:
            (r.dstAccount === undefined) ? undefined : r.dstAccount.toString('hex'),
        quantity: (r.amount === undefined) ? undefined : r.amount.toString(),
      } as Components.Schemas.Receipt,
    } as Components.Schemas.ReceiptOperation;
  }

  public async balance(request: Paths.GetAssetBalance.RequestBody): Promise<Paths.GetAssetBalance.Responses.$200> {
    logger.debug('balance', { request });
    if (request.asset.type != 'finp2p'){
      throw new Error('unsupported asset type');
    }
    const finp2pAsset = request.asset as Components.Schemas.Finp2pAsset;
    const balance = await this.tezosClient.getAssetBalance(
      pubkeyToTezosSecp256k1(request.owner.finId),
      utf8.encode(finp2pAsset.resourceId),
    );
    logger.debug('balance', { balance });
    return { asset: request.asset, balance: balance.toString() } as Components.Schemas.Balance ;
  }

  public async redeem(request: Paths.RedeemAssets.RequestBody) : Promise<Paths.RedeemAssets.Responses.$200> {
    //TODO: implement
    logger.debug('redeem', { request });
    return {
    } as Paths.RedeemAssets.Responses.$200;
  }

  public async hold(request: Paths.HoldOperation.RequestBody) : Promise<Paths.HoldOperation.Responses.$200> {
    logger.debug('hold', { request });

    let assetId = getEscrowAsset(request.asset);

    let dstAccount = getEscrowDestination(request.destination);

    let ahgSourceField = getFieldFromSignature(request.signature.template, 0, 'srcAccount');
    let ahgDestinationField = getFieldFromSignature(request.signature.template, 0, 'dstAccount');
    let ahgAssetIdField = getFieldFromSignature(request.signature.template, 0, 'assetId');
    let ahgAmountField = getFieldFromSignature(request.signature.template, 0, 'amount');

    const nonceBytes = Buffer.from(request.nonce, 'hex');
    const noncePre = nonceBytes.slice(0, 24);

    let ahg : FINP2PProxy.HoldAHG = {
      nonce: { nonce: noncePre, timestamp: new Date(Number(nonceBytes.readBigInt64BE(24)) * 1000 ) },
      asset_id: utf8.encode(ahgAssetIdField.value),
      src_account : pubkeyToTezosSecp256k1(ahgSourceField.value),
      dst_account : pubkeyToTezosSecp256k1(ahgDestinationField.value),
      amount : utf8.encode(ahgAmountField.value),
    };

    let shg : FINP2PProxy.HoldSHG = {
      asset_type: request.asset.type,
      asset_id: utf8.encode(assetId),
      src_account_type : utf8.encode('finId'),
      src_account : utf8.encode(request.source.finId),
      dst_account_type : request.destination?.type,
      dst_account : dstAccount,
      amount: BigInt(request.quantity),
      expiration : BigInt(request.expiry),
    };

    let params: FINP2PProxy.HoldTokensParam = {
      hold_id : utf8.encode(request.operationId),
      ahg,
      shg,
      signature: '0x' + request.signature.signature,
    };

    const op = await this.tezosClient.holdTokens(params);
    await this.tezosClient.waitInclusion(op);
    return {
      isCompleted: true,
      response: {
        id: op.hash,
        asset: request.asset,
        source: request.source.finId,
        quantity: request.quantity,
      } as Components.Schemas.Receipt,
    } as Components.Schemas.ReceiptOperation;
  }

  public async release(request: Paths.ReleaseOperation.RequestBody) : Promise<Paths.ReleaseOperation.Responses.$200> {
    logger.debug('release', { request });
    let assetId = getEscrowAsset(request.asset);
    let dstAccount = getEscrowDestination(request.destination);

    let params: FINP2PProxy.ExecuteHoldParam = {
      hold_id : utf8.encode(request.operationId),
      asset_id : utf8.encode(assetId),
      amount : BigInt(request.quantity),
      src_account : pubkeyToTezosSecp256k1(request.source.finId),
      dst: dstAccount,
    };

    const op = await this.tezosClient.executeHold(params);
    await this.tezosClient.waitInclusion(op);
    //TODO: what if destination is not finId?
    return {
      isCompleted: true,
      response: {
        id: op.hash,
        asset: request.asset,
        source: request.source.finId,
        destination: 'finId' in request.destination ? request.destination?.finId : undefined,
        quantity: request.quantity,
      } as Components.Schemas.Receipt,
    } as Components.Schemas.ReceiptOperation;
  }

  public async rollback(request: Paths.RollbackOperation.RequestBody) : Promise<Paths.RollbackOperation.Responses.$200> {
    logger.debug('rollback', { request });
    let assetId = getEscrowAsset(request.asset);

    let params: FINP2PProxy.ReleaseHoldParam = {
      hold_id : utf8.encode(request.operationId),
      asset_id : utf8.encode(assetId),
      amount : BigInt(request.quantity),
      src_account : pubkeyToTezosSecp256k1(request.source.finId),
    };
    const op = await this.tezosClient.releaseHold(params);
    await this.tezosClient.waitInclusion(op);
    return {
      isCompleted: true,
      response: {
        id: op.hash,
        asset: request.asset,
        source: request.source.finId,
        destination: request.source.finId,
        quantity: request.quantity,
      } as Components.Schemas.Receipt,
    } as Components.Schemas.ReceiptOperation;
  }

}

