import {
  TezosToolkit,
  OpKind,
  createTransferOperation,
  TransferParams,
  RPCOperation,
  createRevealOperation,
  Signer,
} from '@taquito/taquito';
import { BlockResponse, MichelsonV1Expression, OperationEntry, RpcClientInterface } from '@taquito/rpc';
import { localForger, LocalForger } from '@taquito/local-forging';
import { encodeOpHash, b58cdecode, b58cencode, prefix, getPkhfromPk } from '@taquito/utils';
import { XMLHttpRequest } from 'xhr2-cookies';
import * as Blake2b from '@stablelib/blake2b';

/** Some wrapper functions on top of Taquito to make calls, transfer xtz and reveal public keys.
 * With these functions, we have a better control on the operations hashs being injected.
*/

export interface BatchResult {
  hash: string;
}
export interface OperationResult extends BatchResult {
  index: number;
}

/** @description Returns the contract address of an origination from the
 * operation hash.
 * @param hash the hash of the operation in base58
 * @param index the origination index in the hash (by default 0) in case
 * the operation originatres multiple contracts.
*/
export function contractAddressOfOpHash(hash : string, index = 0) : string {
  const hashBytes = Buffer.from(b58cdecode(hash, prefix.o));
  const indexBytes = Buffer.alloc(4, 0);
  indexBytes.writeInt32BE(index);
  const originationNonce = Buffer.concat([hashBytes, indexBytes]);
  const addrBytes = Blake2b.hash(new Uint8Array(originationNonce), 20);
  const addr : string = b58cencode(addrBytes, prefix.KT1);
  return addr;
}

export class InjectionError extends Error {

  op : BatchResult;

  error : any;

  constructor(op : BatchResult, error : any, ...params: any[]) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InjectionError);
    }

    this.name = 'InjectionError';
    // Failed operation
    this.op = op;
    this.error = error;
    if (error.message !== undefined) {
      this.message = `${this.message}: ${error.message}`;
    }
  }

}

function toStrRec(input : any) {
  Object.keys(input).forEach(k => {
    let elt = input[k];
    if (elt === undefined || elt === null) {
      input[k] = undefined;
    } else if (typeof elt === 'object') {
      input[k] = toStrRec(elt);
    } else {
      input[k] = elt.toString();
    }
  });
  return input;
}

export class TaquitoWrapper extends TezosToolkit {

  forger : LocalForger;

  activatedDebug : boolean;

  signers : Record<string, Signer>;

  constructor(rpc : string | RpcClientInterface, debug = false) {
    super(rpc);
    // Forge operations locally (instead of using RPCs to the node)
    this.setForgerProvider(localForger);
    this.forger = new LocalForger();
    this.setProvider({ config : { streamerPollingIntervalMilliseconds : 3000 } });
    this.activatedDebug = debug;
    this.signers = {};
  }

  public debug(message?: any, ...optionalParams: any[]) {
    if (this.activatedDebug) { console.log(message, ...optionalParams); }
  }

  public registerSigner(signer : Signer, source? : string) {
    if (source !== undefined) {
      this.signers[source] = signer;
    } else {
      // register asynchronously
      signer.publicKeyHash().then(s => {
        this.signers[s] = signer;
      });
    }
  }

  protected getSigner(source : string) : Signer{
    let signer = this.signers[source];
    if (signer === undefined) {
      throw Error(`Unregistered signer for ${source}`);
    }
    return signer;
  }

  protected async signAndInject(
    kind : 'transaction' | 'origination' | 'revelation',
    contents: Array<RPCOperation>) {
    let branch = await this.rpc.getBlockHash({ block: 'head~2' });
    let strop = toStrRec({ branch, contents });
    let forgedOp = await this.forger.forge(strop);
    let signer : Signer;
    if ( contents[0].kind === OpKind.ORIGINATION
      || contents[0].kind === OpKind.TRANSACTION
      || contents[0].kind === OpKind.REVEAL
      || contents[0].kind === OpKind.DELEGATION
      || contents[0].kind === OpKind.REGISTER_GLOBAL_CONSTANT ) {
      // All manager operations in a batch must have the same source
      let source = contents[0].source;
      // Use the signer for the specified source
      signer = (source === undefined) ? this.signer : this.getSigner(source);
    } else {
      // Use default signer for non manager operations
      signer = this.signer;
    }
    let signOp = await signer.sign(forgedOp, new Uint8Array([3]));
    let hash = encodeOpHash(signOp.sbytes);
    try {
      let injectedOpHash = await this.rpc.injectOperation(signOp.sbytes);
      return { hash : injectedOpHash };
    } catch (error) {
      throw new InjectionError({ hash }, error, `Error while injecting ${kind}`);
    }
  }


  streamHeadHashes<T>(callback : ((_ : string, xhr : XMLHttpRequest) => T)) : Promise<void>{
    const path = `${this.rpc.getRpcUrl()}/monitor/heads/main`;
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onprogress = () => {
        // XXX: Cannot use responseText, because it's always empty for
        // some reason
        let parts : Buffer[] = (xhr as any)._responseParts;
        let lastPart = parts[parts.length - 1];
        let hash = lastPart.slice(9, 60).toString();
        callback(hash, xhr);
      };
      xhr.onload = () => { reject(new Error('Stream terminated ' + path)); };
      xhr.onabort = () => { resolve(); };
      xhr.onerror = () => { reject(new Error('Unreachable stream ' + path)); };
      xhr.open('GET', path);
      xhr.send();
    });
  }

  private findInBlock(block : BlockResponse, op : BatchResult) : OperationEntry | undefined {
    const r = block.operations.find((l) => {
      return l.find((blockOp) => {
        return (blockOp.hash === op.hash);
      });
    });
    if (r === undefined) { return; }
    return r[0];
  }

  private async checkInMainChain(
    blockHash : string,
    headHash : string,
    confirmations : number) : Promise<void>{
    const blockHashAtInclLevel =
      await this.rpc.getBlockHash({ block: `${headHash}~${confirmations}` });
    if (blockHashAtInclLevel != blockHash) {
      throw new Error('Operation is not included in the main chain');
    }
  }

  private async inPrevBlocks(
    op : BatchResult,
    nb = 5,
    blockHash? : string,
    head? : BlockResponse,
  ) : Promise<[OperationEntry, BlockResponse, number] | undefined> {
    if (nb == 0) { return undefined; }
    const block = await this.rpc.getBlock({ block: (blockHash || 'head') });
    if (head === undefined) { head = block; }
    const blockOp = this.findInBlock(block, op);
    if (blockOp !== undefined) {
      const confirmations = head.header.level - block.header.level;
      await this.checkInMainChain(block.hash, head.hash, confirmations);
      return ([blockOp, block, confirmations]);
    }
    return this.inPrevBlocks(
      op, nb - 1, block.header.predecessor, head,
    );
  }

  /**
   * @description Wait for an operation to be included with the specified
   * number of confirmations, i.e. included in a block with `confirmations`
   * block on top.
   * @param hash : the hash op the operation to wait for
   * @param confirmations : the number of confirmations to wait for before
   * returning (by default 0, i.e. returns as soon as the operation is
   * included in a block)
   * @param max : the maximum number of blocks to wait before bailing (default 10)
   * @returns information about inclusion: the operation, the inclusion block, the
   * number of confirmations, etc.
   */
  waitInclusion(op : BatchResult, confirmations? : number, max = 10) :
  Promise<[OperationEntry, BlockResponse, number]> {
    var foundRes : [OperationEntry, BlockResponse];
    const taquito = this;
    var count = 0;
    return new Promise(function (resolve, reject) {
      // start looking in the previous blocks
      taquito.inPrevBlocks(op).then(blockAndConf => {
        if (blockAndConf !== undefined) {
          const [blockOp, block, blockConfirmations] = blockAndConf;
          foundRes = [blockOp, block];
          if (confirmations === undefined
            || confirmations <= blockConfirmations) {
            return resolve([blockOp, block, blockConfirmations]);
          }
        }
      });
      // in parallel, wait for new heads
      taquito.streamHeadHashes(
        async (hash, xhr) => {
          count++;
          // console.log(hash, count, foundLevel)
          if (count > max) {
            xhr.abort();
            return reject(new Error(`Did not see operation for ${max} blocks`));
          }
          const block = await taquito.rpc.getBlock({ block: hash });
          if (foundRes === undefined) {
            const blockOp = taquito.findInBlock(block, op);
            if (blockOp !== undefined) {
              foundRes = [blockOp, block];
              if (confirmations === undefined || confirmations === 0) {
                xhr.abort();
                return resolve([blockOp, block, 0]);
              }
            }
          } else {
            // already found
            const [foundOp, foundBlock] = foundRes;
            let obtainedConfirmations = block.header.level - foundBlock.header.level;
            if (confirmations === undefined
              || confirmations <= obtainedConfirmations) {
              xhr.abort();
              await taquito.checkInMainChain(
                foundBlock.hash, block.hash, obtainedConfirmations);
              return resolve([foundOp, foundBlock, obtainedConfirmations]);
            }
          }
        });
    });
  }

  /**
   * @description Returns if an operation is included in the latest `max`
   * number of blocks.
   * @param op :  the operation (hash) to look for
   * @param max : the number of blocks in which to look for (default 10)
   * @returns information about inclusion: the operation, the inclusion block, the
   * number of confirmations, etc.
   */
  isIncludedInLatestBlocks(op : BatchResult, max = 10) :
  Promise<[OperationEntry, BlockResponse, number] | undefined> {
    return this.inPrevBlocks(op, max);
  }

  /**
   * @deprecated
   * @description Wait for an operation to be included with the specified
   * number of confirmations, i.e. included in a block with `confirmations`
   * block on top.
   * @param hash : the hash op the operation to wait for
   * @param confirmations : the number of confirmations to wait for before
   * returning (by default 0, i.e. returns as soon as the operation is
   * included in a block)
   * @returns information about inclusion, such as the inclusion block, the
   * number of confirmations, etc.
   */
  async taquitoWaitInclusion({ hash } : OperationResult, confirmations? : number) {
    let op = await this.operation.createOperation(hash);
    if (confirmations === 0) { confirmations = undefined; }
    return op.confirmation(confirmations);
  }

  /**
   * @description This function allows to reveal an address's public key on the blockchain.
   * The address is supposed to have some XTZ on it for the revelation to work.
   * The functions throws "WalletAlreadyRevealed" if the public key is already
   * revealed.
   * @returns injection result
   */
  async revealWallet(publicKey? : string): Promise<OperationResult> {
    let source : string;
    if (publicKey === undefined) {
      publicKey = await this.signer.publicKey();
      source = await this.signer.publicKeyHash();
    } else {
      source = getPkhfromPk(publicKey);
    }
    let revealParams = {
      fee: 1000,
      gasLimit: 1000,
      storageLimit: 0,
    };
    try {
      let rpcRevealOperation = await createRevealOperation(revealParams, source, publicKey);
      let contract = await this.rpc.getContract(source);
      let counter = parseInt(contract.counter || '0', 10);
      let contents = [{
        ...rpcRevealOperation,
        source,
        counter: counter + 1,
      }];
      const { hash } = await this.signAndInject('revelation', contents);
      return { hash, index: 0 };
    } catch (e : any) {
      if (e.message.match(/Previously revealed/)) {
        throw Error('WalletAlreadyRevealed');
      } else { throw e; }
    }
  }


  /**
   * @description Generic auxiliary function for batched (and non batched)
   * transfers and contracts calls
   * @param transfersParams : the transactions parameters
   * @returns injection result
   */
  async batchTransactions(transfersParams: Array<TransferParams>): Promise<BatchResult> {
    transfersParams.map(t =>
      this.debug('Calling', t.parameter?.entrypoint, 'with', t.parameter?.value));
    let estimates = this.estimate.batch(
      transfersParams.map((transferParams) => {
        return { ...transferParams,
          kind : OpKind.TRANSACTION,
        };
      }));
    let source : string;
    if (transfersParams[0].source === undefined) {
      source = await this.signer.publicKeyHash();
    } else {
      source = transfersParams[0].source;
    }
    let contract = await this.rpc.getContract(source);
    let counter = parseInt(contract.counter || '0', 10);
    let contents =
      await Promise.all(
        transfersParams.map(async (transferParams, i) => {
          let estimate = (await estimates)[i];
          let rpcTransferOperation = await createTransferOperation({
            ...transferParams,
            fee: estimate.suggestedFeeMutez,
            gasLimit: estimate.gasLimit,
            storageLimit: estimate.storageLimit,
          });
          return {
            ...rpcTransferOperation,
            source,
            counter: counter + 1 + i,
          };
        }),
      );
    return this.signAndInject('transaction', contents);
  }

  /**
   * @description Transfer the given amount of xtz from an account to an other.
   * @param destination : the transfer's destination
   * @param amount: the amount to transfer in Tez (will be converted internally
   * to muTez)
   * @returns operation injection result
   */
  async transferXTZ(destination: string, amount: number, source? : string): Promise<OperationResult> {
    this.debug(`Transfering ${amount} tz to ${destination}`);
    const { hash } =
      await this.batchTransactions([{ to : destination, amount, source }]);
    return { hash, index: 0 };
  }

  /**
   * @description Batch mutliple xtz transfers from a source to mutliple destinations.
   * @param transfers : the list of transfers to emit
   * @returns operation injection result
   */
  async multiTransferXTZ(
    transfers : { to: string, amount: number, source? : string }[],
  ): Promise<BatchResult> {
    return this.batchTransactions(transfers);
  }

  /**
   * @description Instantiation of function `batchTransactions` to call an
   * entrypoint of a smart contract.
   * @param destinations : the transfers' destinations
   * @param amount: the amount to transfer in Tez (will be converted internally to muTez)
   * @param source: address of sender of the transaction
   * @returns operation injection result
   */
  async send(
    kt1: string,
    entrypoint: string,
    value: MichelsonV1Expression,
    source? : string,
    amount = 0): Promise<OperationResult> {
    this.debug('Calling', entrypoint, 'with', value);
    const { hash } = await this.batchTransactions([{
      amount,
      source,
      to: kt1,
      parameter: { entrypoint, value },
    }]);
    return { hash, index: 0 };
  }


}
