import * as winston from 'winston';

export const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format(function dynamicContent(info){
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
    winston.format.json(),
  ),
  defaultMeta: {  },
  transports: [new winston.transports.Console({})],
  exitOnError: false,
});

