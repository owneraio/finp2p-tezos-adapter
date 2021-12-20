import express from 'express';
import * as routes from './routes';
import { logger as expressLogger } from 'express-winston';
import { format, transports } from 'winston';
import { logger } from './helpers/logger';

const app = express();
const port = 3000;

// Configure Express to parse incoming JSON data
app.use(express.json({ limit: '50mb' }));

app.use(
  expressLogger({
    transports: [new transports.Console({ level: process.env.LOG_LEVEL || 'info' })],
    format: format.combine(
      format.timestamp(),
      format(function dynamicContent(info) {
        if (info.timestamp) {
          info.time = info.timestamp;
          delete info.timestamp;
        }
        if (info.message) {
          info.msg = info.message;
          // @ts-ignore
          delete info.message;
        }
        return info;
      })(),
      format.json(),
    ),
    meta: true,
    expressFormat: true,
    statusLevels: true,
    ignoreRoute: (req) => req.url.toLowerCase() === '/healthcheck',
  }),
);

// Configure routes
routes.register(app);

app.listen(port, () => {
  logger.info(`listening at http://localhost:${port}`);
});

process.on('unhandledRejection', (reason, p) => {
  logger.error('Unhandled Rejection', { promise: p, reason });
});
process.on('uncaughtException', (err, origin) => {
  logger.error('uncaught exception', { err, origin });
});
