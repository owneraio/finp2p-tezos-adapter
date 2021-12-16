import express from 'express';
import * as routes from './routes';

const app = express();
const port = 3000;

// Configure Express to parse incoming JSON data
app.use(express.json({ limit: '50mb' }));

// Configure routes
routes.register(app);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection', { promise: p, reason });
});
process.on('uncaughtException', (err, origin) => {
  console.error('uncaught exception', { err, origin });
});
