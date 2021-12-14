import { body } from 'express-validator';
import { messages, isStrPositiveInt } from './utils';

export const tokenBalanceValidator = [
  body('assetId')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('sourcePublicKey')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
];

export const tokenIssueValidator = [
  body('assetId')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('nonce')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('recipientPublicKey')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('settlementRef')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('quantity')
    .exists()
    .isString()
    .custom((value) => (value))
    .withMessage(messages.shouldBeStrNum),
];

export const tokenTransferValidator = [
  body('assetId')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('nonce')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('sourcePublicKey')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('recipientPublicKey')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('signature.signature')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('signature.template.hashGroups')
    .optional({ nullable: true })
    .isArray(),
  body('signature.template.hashGroups.*.hash')
    .optional({ nullable: true })
    .isString(),
  body('settlementRef')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('quantity')
    .exists()
    .isString()
    .custom((value) => isStrPositiveInt(value))
    .withMessage(messages.shouldBeStrNum),
];

export const tokenRedeemValidator = [
  body('assetId')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('nonce')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('sourcePublicKey')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('signature')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('quantity')
    .exists()
    .isString()
    .custom((value) => isStrPositiveInt(value))
    .withMessage(messages.shouldBeStrNum),
];
