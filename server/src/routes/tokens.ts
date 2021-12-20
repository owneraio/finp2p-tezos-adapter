import * as express from 'express';
import {
  tokenBalanceValidator,
  tokenIssueValidator,
  tokenRedeemValidator,
  tokenTransferValidator,
} from '../validators/tokens';
import { asyncMiddleware } from '../helpers/middleware';
import { TokenService } from '../services/tokens';


const TOKENS_BASE_URL = '/api/tokens';

export const register = (app: express.Application) => {
  /* Get token balance. */
  app.post(
    `${TOKENS_BASE_URL}/balance`,
    tokenBalanceValidator,
    asyncMiddleware(async (req, res) => {
      const { assetId, sourcePublicKey } = req.body;
      const balance = await TokenService.GetService().balance(assetId, sourcePublicKey);
      res.send({ quantity: balance });
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
      const receipt = await TokenService.GetService().issue({ assetId, recipientPublicKey, quantity, settlementRef });
      res.json(receipt);
    }),
  );

  /* POST transfer token. */
  app.post(
    `${TOKENS_BASE_URL}/transfer`,
    tokenTransferValidator,
    asyncMiddleware(async (req, res) => {
      const {
        assetId, nonce, sourcePublicKey, recipientPublicKey, signature, quantity, settlementRef,
      } = req.body;
      const receipt = await TokenService.GetService().transfer({ nonce, assetId, sourcePublicKey, recipientPublicKey, quantity, signatureTemplate : { signature }, settlementRef });
      res.json(receipt);
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
      const receipt = await TokenService.GetService().redeem({ nonce, assetId, sourcePublicKey, quantity, signatureTemplate : { signature } });
      res.json(receipt);
    }),
  );

  app.get(
    `${TOKENS_BASE_URL}/getReceipt/:id`,
    asyncMiddleware(async (req, res) => {
      const { id } = req.params;
      const receipt = await TokenService.GetService().getReceipt(id);
      res.json(receipt);
    }),
  );
};
