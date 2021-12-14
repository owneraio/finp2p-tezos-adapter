import * as express from 'express';
import * as resources from './resources';
import * as tokens from './tokens';

export const register = (app: express.Application) => {
  // define a route handler for the default home page
  app.get('/', (req, res) => {
    res.send('OK');
  });

  app.get('/healthCheck', (req, res) => {
    res.send('OK');
  });

  resources.register(app);
  tokens.register(app);
};
