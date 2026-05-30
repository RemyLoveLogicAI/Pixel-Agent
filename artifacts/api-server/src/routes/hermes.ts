import { Router } from 'express';
import { speciesRouter } from '@hermes/api';
import { petsRouter } from '@hermes/api';
import { hermesSSEHandler } from '@hermes/api';
import { createDrizzleAdapter } from '../services/hermesDbAdapter.js';

const router = Router();
const db = createDrizzleAdapter();

// SSE endpoint
router.get('/companies/:companyId/hermes/events', hermesSSEHandler);

// REST routes
router.use('/companies/:companyId/hermes/species', speciesRouter(db));
router.use('/companies/:companyId/hermes/pets', petsRouter(db));

export default router;
