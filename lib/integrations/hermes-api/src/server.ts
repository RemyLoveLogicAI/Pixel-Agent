import express, { type Express } from 'express';
import cors from 'cors';
import { speciesRouter } from './routes/species.js';
import { petsRouter } from './routes/pets.js';
import { hermesSSEHandler } from './sse/hermes-sse.js';
import type { DbAdapter } from './types.js';

export function createApp(db: DbAdapter): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // SSE endpoint: GET /companies/:companyId/hermes/events
  app.get('/companies/:companyId/hermes/events', hermesSSEHandler);

  // REST routes — inject db adapter into route factories
  app.use('/companies/:companyId/hermes/species', speciesRouter(db));
  app.use('/companies/:companyId/hermes/pets', petsRouter(db));

  return app;
}

export { hermesSSEHandler } from './sse/hermes-sse.js';
export { broadcastHermesEvent, getSubscriberCount } from './sse/hermes-sse.js';
export { speciesRouter } from './routes/species.js';
export { petsRouter } from './routes/pets.js';
