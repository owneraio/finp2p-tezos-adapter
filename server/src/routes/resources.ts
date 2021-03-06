import * as express from 'express';
import { asyncMiddleware } from '../helpers/middleware';
import { TokenService } from '../services/tokens';

const RESOURCES_BASE_URL = '/api/assets';

export const register = (app: express.Application) => {
  /* Create resource */
  app.post(
    `${RESOURCES_BASE_URL}/create`,
    asyncMiddleware(async (req, res) => {
      await TokenService.GetService().onCreateAsset(req.body);
      return res.send({ isCompleted: true } as Components.Schemas.EmptyOperation);
    }),
  );

};
