import { body } from 'express-validator';

const messages = {
  shouldBeString: 'Should be a string.',
};

// Defines resource types that need to get publicKey and signature
const signerType = [100];

const getResourceType = (id: String) => {
  const parts = id.split(':', 2);
  return Number(parts[1]);
};

export const resourceCreateValidator = [
  body('resourceID')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('resourceHash')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('publicKey').custom((_, { req }) => {
    const type = req.body.resourceID ? getResourceType(req.body.resourceID) : -1;
    if (signerType.includes(type) && (!req.body.publicKey || typeof req.body.publicKey !== 'string')) {
      return Promise.reject(messages.shouldBeString);
    }
    return Promise.resolve();
  }),
  body('signature').custom((_, { req }) => {
    const type = req.body.resourceID ? getResourceType(req.body.resourceID) : -1;
    if (signerType.includes(type) && (!req.body.signature || typeof req.body.signature !== 'string')) {
      return Promise.reject(messages.shouldBeString);
    }
    return Promise.resolve();
  }),
];

export const resourceUpdateValidator = [
  body('resourceID')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
  body('resourceHash')
    .exists()
    .isString()
    .withMessage(messages.shouldBeString),
];
