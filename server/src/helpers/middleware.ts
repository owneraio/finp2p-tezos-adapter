import { validationResult } from 'express-validator';
import {
  NextFunction, Request, RequestHandler, Response,
} from 'express';
import { logger } from './logger';

export const asyncMiddleware = (fn : RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('validation failed', { errors: errors.array() });
    return res.status(422).json({ errors: errors.array() });
  }
  try {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error('Server error', { error: err });
      res.status(500).send({ error: err });
    });
  } catch (err) {
    logger.error('Server error', { error: err });
    res.status(500).send({ error: err });
  }
};
