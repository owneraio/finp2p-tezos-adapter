import * as express from 'express';
import {
  tokenBalanceValidator,
  tokenIssueValidator,
  tokenRedeemValidator,
  tokenTransferValidator,
} from '../validators/tokens';
import { asyncMiddleware } from '../helpers/middleware';


const TOKENS_BASE_URL = '/api/tokens';

export const register = (app: express.Application) => {
  /* Get token balance. */
  app.post(
    `${TOKENS_BASE_URL}/balance`,
    tokenBalanceValidator,
    asyncMiddleware(async (req, res) => {
      const { assetId, sourcePublicKey } = req.body;
      console.log(`balance ${assetId} ${sourcePublicKey}`);
      res.send({ quantity: 0 });
    }),
  );

  /* POST issue a token for a user. */
  app.post(
    `${TOKENS_BASE_URL}/issue`,
    tokenIssueValidator,
    asyncMiddleware(async (req, res) => {
      const {
        assetId, recipientPublicKey, quantity, settlementRef,
      } = req.body;
      console.log(`issue ${assetId} ${recipientPublicKey} ${quantity} ${settlementRef}`);
      res.sendStatus(200);
    }),
  );

  /* POST transfer token. */
  app.post(
    `${TOKENS_BASE_URL}/transfer`,
    tokenTransferValidator,
    asyncMiddleware(async (req, res) => {
      const {
        assetId, nonce, sourcePublicKey, recipientPublicKey, signature, quantity,
      } = req.body;
      console.log(`transfer ${assetId} ${nonce} ${sourcePublicKey} ${recipientPublicKey} ${signature} ${quantity}`);
      res.sendStatus(200);
    }),
  );

  /* POST redeem token. */
  app.post(
    `${TOKENS_BASE_URL}/redeem`,
    tokenRedeemValidator,
    asyncMiddleware(async (req, res) => {
      const {
        nonce, sourcePublicKey, quantity, signature, assetId,
      } = req.body;
      console.log(`redeem ${nonce} ${sourcePublicKey} ${quantity} ${signature} ${assetId}`);
      res.sendStatus(200);
    }),
  );

  app.get(
    `${TOKENS_BASE_URL}/getReceipt/:id`,
    asyncMiddleware(async (req, res) => {
      const { id } = req.params;
      console.log(`getReceipt ${id}`);
      res.sendStatus(200);
    }),
  );
};
