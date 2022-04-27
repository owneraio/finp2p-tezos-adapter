import * as express from 'express';
import { asyncMiddleware } from '../helpers/middleware';
import { TokenService } from '../services/tokens';


const TOKENS_BASE_URL = '/api/assets';

export const register = (app: express.Application) => {
  /* Get token balance. */
  app.post(
    `${TOKENS_BASE_URL}/getBalance`,
    asyncMiddleware(async (req, res) => {
      const balance = await TokenService.GetService().balance(req.body);
      res.send(balance);
    }),
  );

  /* POST issue a token for a user. */
  app.post(
    `${TOKENS_BASE_URL}/issue`,
    asyncMiddleware(async (req, res) => {
      const receipt = await TokenService.GetService().issue(req.body);
      res.json(receipt);
    }),
  );

  /* POST transfer token. */
  app.post(
    `${TOKENS_BASE_URL}/transfer`,
    asyncMiddleware(async (req, res) => {
      const receipt = await TokenService.GetService().transfer(req.body);
      res.json(receipt);
    }),
  );

  /* POST redeem token. */
  app.post(
    `${TOKENS_BASE_URL}/redeem`,
    asyncMiddleware(async (req, res) => {
      const receipt = await TokenService.GetService().redeem(req.body);
      res.json(receipt);
    }),
  );

  app.get(
    `${TOKENS_BASE_URL}/receipts/:id`,
    asyncMiddleware(async (req, res) => {
      const { id } = req.params;
      const receipt = await TokenService.GetService().getReceipt(id);
      res.json(receipt);
    }),
  );

  /* POST hold token. */
  app.post(
    `${TOKENS_BASE_URL}/hold`,
    asyncMiddleware(async (req, res) => {
      const receipt = await TokenService.GetService().hold(req.body);
      res.json(receipt);
    }),
  );

  /* POST release token. */
  app.post(
    `${TOKENS_BASE_URL}/release`,
    asyncMiddleware(async (req, res) => {
      const receipt = await TokenService.GetService().release(req.body);
      res.json(receipt);
    }),
  );

  /* POST rollback token. */
  app.post(
    `${TOKENS_BASE_URL}/rollback`,
    asyncMiddleware(async (req, res) => {
      const receipt = await TokenService.GetService().rollback(req.body);
      res.json(receipt);
    }),
  );

  /* POST operation status. */
  app.get(
    '/api/operations/status/:cid',
    asyncMiddleware(async (req, res) => {
      const status = await TokenService.GetService().operationStatus({ cid: req.params.cid });
      res.json(status);
    }),
  );
};
