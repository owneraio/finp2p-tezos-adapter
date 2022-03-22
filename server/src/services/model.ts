declare namespace Components {
  namespace Schemas {
    export type Asset = CryptocurrencyAsset | FiatAsset | Finp2pAsset;
    /**
         * Asset receipt details
         */
    export interface AssetReceiptDetails {
      type: string;
    }
    export interface Balance {
      asset: Asset;
      balance: string;
    }
    export interface CryptoWalletAccount {
      type: string;
      /**
             * address of the cryptocurrency wallet
             */
      address: string;
    }
    export interface CryptocurrencyAsset {
      type: string;
      /**
             * unique identifier symbol of the cryptocurrency
             */
      code: string;
    }
    export interface DepositInstruction {
      account: /* describes destination for remote operations operations */ Destination;
      /**
             * description
             */
      description: string;
    }
    export interface DepositOperation {
      /**
             * unique correlation id which identify the operation
             */
      cid: string;
      /**
             * flag indicating if the operation completed, if true then error or response must be present (but not both)
             */
      isCompleted: boolean;
      error?: DepositOperationErrorInformation;
      response?: DepositInstruction;
    }
    export interface DepositOperationErrorInformation {
    }
    /**
         * describes destination for remote operations operations
         */
    export type Destination = /* describes destination for remote operations operations */ EscrowAccount | CryptoWalletAccount | FiatAccount | FinIdAccount;
    export interface EmptyOperation {
      /**
             * unique correlation id which identify the operation
             */
      cid: string;
      /**
             * flag indicating if the operation completed, if true then error or response must be present (but not both)
             */
      isCompleted: boolean;
      error?: EmptyOperationErrorInformation;
    }
    export interface EmptyOperationErrorInformation {
    }
    export interface EscrowAccount {
      type: string;
      /**
             * FinID of the user
             */
      finId: string;
      /**
             * escrow account id
             */
      escrowAccountId: string;
    }
    export interface FiatAccount {
      type: string;
      /**
             * IBAN or other code to represent a fiat account
             */
      code: string;
    }
    export interface FiatAsset {
      type: string;
      /**
             * unique identifier code of the fiat currency - based on ISO-4217
             */
      code: string;
    }
    /**
         * describing a field in the hash group
         */
    export interface Field {
      /**
             * name of field
             */
      name: string;
      /**
             * type of field
             */
      type: 'string' | 'int' | 'bytes';
      /**
             * hex representation of the field value
             */
      value: string;
    }
    export interface FinIdAccount {
      type: string;
      finId: string;
    }
    export interface Finp2pAsset {
      type: string;
      /**
             * unique resource ID of the FinP2P asset
             */
      resourceId: string;
    }
    export interface HashGroup {
      /**
             * hex representation of the hash group hash value
             */
      hash: string;
      /**
             * list of fields by order they appear in the hash group
             */
      fields: /* describing a field in the hash group */ Field[];
    }
    export interface Input {
      /**
             * transaction id of the input token
             */
      transactionId: string;
      /**
             * token input quantity
             */
      quantity: string;
      /**
             * index of the token in the transaction that created it
             */
      index: number; // uint32
    }
    export interface OperationBase {
      /**
             * unique correlation id which identify the operation
             */
      cid: string;
      /**
             * flag indicating if the operation completed, if true then error or response must be present (but not both)
             */
      isCompleted: boolean;
    }
    export interface OperationStatus {
      type: 'receipt' | 'deposit' | 'empty';
      operation: DepositOperation | ReceiptOperation | EmptyOperation;
    }
    export interface Output {
      /**
             * token output quantity
             */
      quantity: string;
      /**
             * toke destination hex representation of a secp256k1 public key 33 bytes compressed
             */
      publicKey: string;
      /**
             * index of the token in the transaction
             */
      index: number; // uint32
    }
    /**
         * Payment receipt details
         */
    export interface PaymentReceiptDetails {
      type: string;
      source?: /* describes destination for remote operations operations */ Destination;
      destination?: /* describes destination for remote operations operations */ Destination;
    }
    export type PayoutAsset = CryptocurrencyAsset | FiatAsset;
    export interface Receipt {
      /**
             * the receipt id
             */
      id: string;
      asset: Asset;
      /**
             * quantity of the assets
             */
      quantity: string;
      /**
             * transaction timestamp
             */
      timestamp: number; // int64
      /**
             * FinId of the source user
             */
      source: string;
      /**
             * FinId of the destination user
             */
      destination: string;
      transactionDetails?: /* Additional input and output details for UTXO supporting DLTs */ TransactionDetails;
      details: /* Receipt details */ ReceiptDetails;
    }
    /**
         * Receipt details
         */
    export type ReceiptDetails = /* Receipt details */ /* Asset receipt details */ AssetReceiptDetails | /* Payment receipt details */ PaymentReceiptDetails;
    export interface ReceiptOperation {
      /**
             * unique correlation id which identify the operation
             */
      cid: string;
      /**
             * flag indicating if the operation completed, if true then error or response must be present (but not both)
             */
      isCompleted: boolean;
      error?: ReceiptOperationErrorInformation;
      response?: Receipt;
    }
    export interface ReceiptOperationErrorInformation {
      code: number; // uint32
      status: string;
    }
    /**
         * represent a signature template information
         */
    export interface Signature {
      /**
             * hex representation of the signature
             */
      signature: string;
      template: /* ordered list of hash groups */ SignatureTemplate;
    }
    /**
         * ordered list of hash groups
         */
    export interface SignatureTemplate {
      hashGroups: HashGroup[];
      /**
             * hex representation of the combined hash groups hash value
             */
      hash: string;
    }
    export interface Source {
      /**
             * FinID, public key of the user
             */
      finId: string;
      /**
             * an optional escrow account id
             */
      escrowAccountId?: string;
    }
    /**
         * Additional input and output details for UTXO supporting DLTs
         */
    export interface TransactionDetails {
      /**
             * Transaction id
             */
      transactionId: string;
      inputs: Input[];
      outputs: Output[];
    }
  }
}
declare namespace Paths { // eslint-disable-line @typescript-eslint/no-unused-vars
  namespace CreateAsset {
    export interface HeaderParameters {
      'Idempotency-Key': Parameters.IdempotencyKey;
    }
    namespace Parameters {
      export type IdempotencyKey = string;
    }
    export interface RequestBody {
      asset: Components.Schemas.Asset;
    }
    namespace Responses {
      export type $200 = Components.Schemas.EmptyOperation;
    }
  }
  namespace DepositInstruction {
    export interface HeaderParameters {
      'Idempotency-Key': Parameters.IdempotencyKey;
    }
    namespace Parameters {
      export type IdempotencyKey = string;
    }
    export interface RequestBody {
      destination: /* describes destination for remote operations operations */ Components.Schemas.Destination;
      owner: Components.Schemas.Source;
      asset: Components.Schemas.Asset;
    }
    namespace Responses {
      export type $200 = Components.Schemas.DepositOperation;
    }
  }
  namespace GetAssetBalance {
    export interface RequestBody {
      owner: Components.Schemas.Source;
      asset: Components.Schemas.Asset;
    }
    namespace Responses {
      export type $200 = Components.Schemas.Balance;
    }
  }
  namespace GetOperation {
    namespace Parameters {
      export type Cid = string;
    }
    export interface PathParameters {
      cid: Parameters.Cid;
    }
    namespace Responses {
      export type $200 = Components.Schemas.OperationStatus;
    }
  }
  namespace GetReceipt {
    namespace Parameters {
      export type TransactionId = string;
    }
    export interface PathParameters {
      transactionId: Parameters.TransactionId;
    }
    namespace Responses {
      export type $200 = Components.Schemas.ReceiptOperation;
    }
  }
  namespace HoldOperation {
    export interface HeaderParameters {
      'Idempotency-Key': Parameters.IdempotencyKey;
    }
    namespace Parameters {
      export type IdempotencyKey = string;
    }
    export interface RequestBody {
      /**
             * nonce
             */
      nonce: string;
      /**
             * escrow operation id
             */
      operationId: string;
      source: Components.Schemas.Source;
      destination?: /* describes destination for remote operations operations */ Components.Schemas.Destination;
      /**
             * quantity
             */
      quantity: string;
      asset: Components.Schemas.Asset;
      /**
             * expiry
             */
      expiry: number; // uint64
      signature: /* represent a signature template information */ Components.Schemas.Signature;
    }
    namespace Responses {
      export type $200 = Components.Schemas.ReceiptOperation;
    }
  }
  namespace IssueAssets {
    export interface HeaderParameters {
      'Idempotency-Key': Parameters.IdempotencyKey;
    }
    namespace Parameters {
      export type IdempotencyKey = string;
    }
    export interface RequestBody {
      /**
             * nonce
             */
      nonce: string;
      destination: Components.Schemas.Source;
      /**
             * quantity
             */
      quantity: string;
      asset: Components.Schemas.Finp2pAsset;
      /**
             * referrence to the corresponding payment operation
             */
      settlementRef: string;
      signature: /* represent a signature template information */ Components.Schemas.Signature;
    }
    namespace Responses {
      export type $200 = Components.Schemas.ReceiptOperation;
    }
  }
  namespace Payout {
    export interface HeaderParameters {
      'Idempotency-Key': Parameters.IdempotencyKey;
    }
    namespace Parameters {
      export type IdempotencyKey = string;
    }
    export interface RequestBody {
      source: Components.Schemas.Source;
      destination: /* describes destination for remote operations operations */ Components.Schemas.Destination;
      /**
             * quantity
             */
      quantity: string;
      asset: Components.Schemas.PayoutAsset;
    }
    namespace Responses {
      export type $200 = Components.Schemas.ReceiptOperation;
    }
  }
  namespace RedeemAssets {
    export interface HeaderParameters {
      'Idempotency-Key': Parameters.IdempotencyKey;
    }
    namespace Parameters {
      export type IdempotencyKey = string;
    }
    export interface RequestBody {
      /**
             * nonce
             */
      nonce: string;
      source: Components.Schemas.Source;
      /**
             * quantity
             */
      quantity: string;
      asset: Components.Schemas.Finp2pAsset;
      /**
             * referrence to the corresponding payment operation
             */
      settlementRef: string;
      signature: /* represent a signature template information */ Components.Schemas.Signature;
    }
    namespace Responses {
      export type $200 = Components.Schemas.ReceiptOperation;
    }
  }
  namespace ReleaseOperation {
    export interface HeaderParameters {
      'Idempotency-Key': Parameters.IdempotencyKey;
    }
    namespace Parameters {
      export type IdempotencyKey = string;
    }
    export interface RequestBody {
      /**
             * escrow operation id
             */
      operationId: string;
      source: Components.Schemas.Source;
      destination: /* describes destination for remote operations operations */ Components.Schemas.Destination;
      /**
             * quantity
             */
      quantity: string;
      asset: Components.Schemas.Asset;
    }
    namespace Responses {
      export type $200 = Components.Schemas.ReceiptOperation;
    }
  }
  namespace RollbackOperation {
    export interface HeaderParameters {
      'Idempotency-Key': Parameters.IdempotencyKey;
    }
    namespace Parameters {
      export type IdempotencyKey = string;
    }
    export interface RequestBody {
      /**
             * escrow operation id
             */
      operationId: string;
      source: Components.Schemas.Source;
      /**
             * quantity
             */
      quantity: string;
      asset: Components.Schemas.Asset;
    }
    namespace Responses {
      export type $200 = Components.Schemas.ReceiptOperation;
    }
  }
  namespace Transfer {
    export interface HeaderParameters {
      'Idempotency-Key': Parameters.IdempotencyKey;
    }
    namespace Parameters {
      export type IdempotencyKey = string;
    }
    export interface RequestBody {
      /**
             * nonce
             */
      nonce: string;
      source: Components.Schemas.Source;
      destination: /* describes destination for remote operations operations */ Components.Schemas.Destination;
      /**
             * quantity
             */
      quantity: string;
      asset: Components.Schemas.Asset;
      /**
             * referrence to the corresponding payment operation
             */
      settlementRef: string;
      signature: /* represent a signature template information */ Components.Schemas.Signature;
    }
    namespace Responses {
      export type $200 = Components.Schemas.ReceiptOperation;
    }
  }
}
