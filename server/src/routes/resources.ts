import * as express from 'express';
import { asyncMiddleware } from '../helpers/middleware';
import {
  resourceCreateValidator,
  resourceUpdateValidator,
} from '../validators/resources';

const RESOURCES_BASE_URL = '/api/resources';

export const register = (app: express.Application) => {
  /* Get resource */
  app.get(
    `${RESOURCES_BASE_URL}/getResourceProfile/:id`,
    asyncMiddleware(async (req, res) => {
      const { id } = req.params;
      console.log(`getResourceProfile ${id}`);
      res.sendStatus(200);
    }),
  );

  /* Create resource */
  app.post(
    `${RESOURCES_BASE_URL}/createProfile`,
    resourceCreateValidator,
    asyncMiddleware(async (req, res) => {
      const {
        resourceID, resourceHash, publicKey, signature,
      } = req.body;
      console.log(`createProfile ${resourceID} ${resourceHash} ${publicKey} ${signature}`);
      return res.sendStatus(200);
    }),
  );

  /* Update resource */
  app.put(
    `${RESOURCES_BASE_URL}/updateResourceProfile`,
    resourceUpdateValidator,
    asyncMiddleware(async (req, res) => {
      const { resourceID, resourceHash } = req.body;
      console.log(`updateResourceProfile ${resourceID} ${resourceHash}`);
      res.sendStatus(200);
    }),
  );
};
