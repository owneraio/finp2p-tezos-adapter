import {
  TezosToolkit,
  OpKind,
  createTransferOperation,
  TransferParams,
  RPCOperation,
  createRevealOperation
} from "@taquito/taquito"
import { BlockResponse, MichelsonV1Expression, RpcClientInterface } from "@taquito/rpc";
import { localForger, LocalForger } from '@taquito/local-forging';
import { encodeOpHash, b58cdecode, b58cencode, prefix } from '@taquito/utils';
import { XMLHttpRequest } from 'xhr2-cookies'
import * as Blake2b from '@stablelib/blake2b'

/** Some wrapper functions on top of Taquito to make calls, transfer xtz and reveal public keys.
 * With these functions, we have a better control on the operations hashs being injected.
*/

export interface OperationResult {
  hash: string;
}

/** @description Returns the contract address of an origination from the
 * operation hash.
 * @param hash the hash of the operation in base58
 * @param index the origination index in the hash (by default 0) in case
 * the operation originatres multiple contracts.
*/
export function contractAddressOfOpHash(hash : string, index = 0) : string {
  const hashBytes = Buffer.from(b58cdecode(hash, prefix['o']))
  const indexBytes = Buffer.alloc(4, 0)
  indexBytes.writeInt32BE(index)
  const originationNonce = Buffer.concat([hashBytes, indexBytes])
  const addrBytes = Blake2b.hash(new Uint8Array(originationNonce), 20)
  const addr : string = b58cencode(addrBytes, prefix['KT1'])
  return addr
}

export class InjectionError extends Error {

  op : OperationResult
  error : any

  constructor(op : OperationResult, error : any, ...params: any[]) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InjectionError)
    }

    this.name = 'InjectionError'
    // Failed operation
    this.op = op
    this.error = error
  }

}

function toStrRec(input : any) {
  Object.keys(input).forEach(k => {
    let elt = input[k]
    if (elt === undefined || elt === null) {
      input[k] = undefined
    } else if (typeof elt === 'object') {
      input[k] = toStrRec(elt);
    } else {
      input[k] = elt.toString();
    }
  });
  return input;
}

export class TaquitoWrapper extends TezosToolkit {

  forger : LocalForger
  activated_debug : boolean

  constructor(rpc : string | RpcClientInterface, debug = false) {
    super(rpc);
    // Forge operations locally (instead of using RPCs to the node)
    this.setForgerProvider(localForger)
    this.forger = new LocalForger()
    this.setProvider({config : {streamerPollingIntervalMilliseconds : 3000}})
    this.activated_debug = debug
  }

  public debug (message?: any, ...optionalParams: any[]) {
    if (this.activated_debug) { console.log(message, ...optionalParams) }
  }

  protected async sign_and_inject (
    kind : 'transaction' | 'origination' | 'revelation',
    contents: Array<RPCOperation>) {
    let branch = await this.rpc.getBlockHash({ block: 'head~2' });
    let strop = toStrRec({ branch, contents })
    let forgedOp = await this.forger.forge(strop)
    let signOp = await this.signer.sign(forgedOp, new Uint8Array([3]));
    let hash = encodeOpHash(signOp.sbytes);
    try {
      let injectedOpHash = await this.rpc.injectOperation(signOp.sbytes)
      return { hash : injectedOpHash }
    } catch (error) {
      throw new InjectionError({ hash }, error, `Error while injecting ${kind}`)
    }
  }


  stream_head_hashes<T>(callback : ((_ : string, xhr : XMLHttpRequest) => T)) : Promise<void>{
    const path = `${this.rpc.getRpcUrl()}/monitor/heads/main`
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onprogress = () => {
        // XXX: Cannot use responseText, because it's always empty for
        // some reason
        let parts : Buffer[]= (xhr as any)._responseParts
        let last_part = parts[parts.length - 1]
        let hash = last_part.slice(9,60).toString()
        callback(hash, xhr);
      };
      xhr.onload = () => { reject(new Error("Stream terminated " + path)) };
      xhr.onabort = () => { resolve() };
      xhr.onerror = () => { reject(new Error("Unreachable stream " + path)) };
      xhr.open("GET", path);
      xhr.send();
    })
  }

  private in_block(block : BlockResponse, op : OperationResult) : boolean {
    const r = block.operations.find((l) => {
      return l.find((block_op) => {
        return (block_op.hash === op.hash)
      })
    })
    return (r !== undefined)
  }

  private async check_in_main_chain (
    block_hash : string,
    head_hash : string,
    confirmations : number) : Promise<void>{
    const block_hash_at_incl_level =
      await this.rpc.getBlockHash({ block: `${head_hash}~${confirmations}`})
    if (block_hash_at_incl_level != block_hash) {
      throw new Error('Operation is not included in the main chain')
    }
  }

  private async in_prev_blocks(
    op : OperationResult,
    nb = 5,
    block_hash? : string,
    head? : BlockResponse
  ) : Promise<[BlockResponse, number] | undefined> {
    if (nb == 0) { return undefined }
    const block = await this.rpc.getBlock({ block: (block_hash || 'head')})
    if (head === undefined) { head = block }
    if (this.in_block(block, op)) {
      const confirmations = block.header.level - head.header.level
      await this.check_in_main_chain(block.hash, head.hash, confirmations)
      return([block, confirmations])
    }
    return await this.in_prev_blocks(
      op, nb - 1, block.header.predecessor, head
    )
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
   * @returns information about inclusion, such as the inclusion block, the
   * number of confirmations, etc.
   */
  wait_inclusion(op : OperationResult, confirmations? : number, max = 10) : Promise<[BlockResponse, number]> {
    var found_block : BlockResponse
    const _this = this
    var count = 0
    return new Promise(function(resolve, reject) {
      // start looking in the previous blocks
      _this.in_prev_blocks(op).then(block_and_conf => {
        if (block_and_conf !== undefined) {
          const [block, block_confirmations] = block_and_conf
          found_block = block
          if (confirmations === undefined
            || confirmations <= block_confirmations) {
            return resolve([found_block, block_confirmations])
          }
        }
      })
      // in parallel, wait for new heads
      _this.stream_head_hashes(
        async (hash, xhr) => {
          count++
          // console.log(hash, count, found_level)
          if (count > max) {
            xhr.abort();
            return reject(new Error(`Did not see operation for ${max} blocks`))
          }
          const block = await _this.rpc.getBlock({ block: hash })
          if (found_block === undefined) {
            if (_this.in_block(block, op)) {
              found_block = block
              if (confirmations === undefined || confirmations === 0) {
                xhr.abort()
                return resolve([found_block, 0])
              }
            }
          } else {
            // already found
            let obtained_confirmations = block.header.level - found_block.header.level
            if (confirmations === undefined
              || confirmations <= obtained_confirmations) {
              xhr.abort()
              await _this.check_in_main_chain(
                found_block.hash, block.hash, obtained_confirmations)
              return resolve([found_block, obtained_confirmations])
            }
          }
        })
    })
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
  async taquito_wait_inclusion({ hash } : OperationResult, confirmations? : number) {
    let op = await this.operation.createOperation(hash);
    if (confirmations === 0) { confirmations = undefined }
    return await op.confirmation(confirmations)
  }

  /**
   * @description This function allows to reveal an address's public key on the blockchain.
   * The address is supposed to have some XTZ on it for the revelation to work.
   * The functions throws "WalletAlreadyRevealed" if the public key is already
   * revealed.
   * @returns injection result
   */
  async revealWallet(): Promise<OperationResult> {
    let estimate = await this.estimate.reveal();
    if (estimate == undefined) {
      throw "WalletAlreadyRevealed";
    }
    let publicKey = await this.signer.publicKey();
    let source = await this.signer.publicKeyHash();
    let revealParams = {
      fee: estimate.suggestedFeeMutez,
      gasLimit: estimate.gasLimit,
      storageLimit: estimate.storageLimit
    };
    let rpcRevealOperation = await createRevealOperation(revealParams, source, publicKey);
    let contract = await this.rpc.getContract(source);
    let counter = parseInt(contract.counter || '0', 10)
    let contents = [{
      ...rpcRevealOperation,
      source,
      counter: counter + 1
    }]
    return this.sign_and_inject('revelation', contents)
  }


  /**
   * @description Generic auxiliary function for batched (and non batched)
   * transfers and contracts calls
   * @param transferParams : the transactions parameters
   * @returns injection result
   */
  async batch_transactions(transfersParams: Array<TransferParams>): Promise<OperationResult> {
    let estimates = this.estimate.batch(
      transfersParams.map((transferParams) => {
        return { ...transferParams,
                 kind : OpKind.TRANSACTION
               }
      }))
    let source = await this.signer.publicKeyHash();
    let contract = await this.rpc.getContract(source);
    let counter = parseInt(contract.counter || '0', 10)
    let contents =
      await Promise.all(
        transfersParams.map(async (transferParams, i) => {
          let estimate = (await estimates)[i]
          let rpcTransferOperation = await createTransferOperation({
            ...transferParams,
            fee: estimate.suggestedFeeMutez,
            gasLimit: estimate.gasLimit,
            storageLimit: estimate.storageLimit
          });
          return {
            ...rpcTransferOperation,
            source,
            counter: counter + 1 + i,
          };
        })
      )
    return this.sign_and_inject('transaction', contents)
  }

  /**
   * @description Transfer the given amount of xtz from an account to an other.
   * @param destination : the transfer's destination
   * @param amount: the amount to transfer in Tez (will be converted internally
   * to muTez)
   * @returns operation injection result
   */
  async transfer_xtz(destination: string, amount: number): Promise<OperationResult> {
    this.debug(`Transfering ${amount} tz to ${destination}`)
    return await this.batch_transactions([{ to : destination, amount }]);
  }

  /**
   * @description Instantiation of function `make_transactions` to call an
   * entrypoint of a smart contract.
   * @param destinations : the transfers' destinations
   * @param amount: the amount to transfer in Tez (will be converted internally to muTez)
   * @returns operation injection result
   */
  async send(
    kt1: string,
    entrypoint: string,
    value: MichelsonV1Expression,
    amount = 0): Promise<OperationResult> {
    this.debug("Calling", entrypoint, "with", value)
    return await this.batch_transactions([{
      amount,
      to: kt1,
      parameter: { entrypoint, value }
    }]);
  }


}
