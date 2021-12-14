import { validationResult } from 'express-validator';
import {
  NextFunction, Request, RequestHandler, Response,
} from 'express';

export const asyncMiddleware = (fn : RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // logger.error('validation failed', { errors: errors.array() });
    return res.status(422).json({ errors: errors.array() });
  }
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // logger.error('Server error', { err });
    res.status(500).send({ error: err });
  });
};
