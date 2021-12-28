import {
  TezosToolkit,
  OpKind,
  createTransferOperation,
  TransferParams,
  RPCOperation,
  createRevealOperation
} from "@taquito/taquito"
import { MichelsonV1Expression, RpcClientInterface } from "@taquito/rpc";
import { localForger, LocalForger } from '@taquito/local-forging';
import { encodeOpHash } from '@taquito/utils';

/** Some wrapper functions on top of Taquito to make calls, transfer xtz and reveal public keys.
 * With these functions, we have a better control on the operations hashs being injected.
*/

export interface OperationResult {
  hash: string;
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

  // TODO implement better with monitor blocks
  /**
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
  async wait_inclusion({ hash } : OperationResult, confirmations? : number) {
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
    let estimates = await this.estimate.batch(
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
          let estimate = estimates[i]
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
