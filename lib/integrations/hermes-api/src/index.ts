// @hermes/api — Express API surface for Hermes runtime harness.
// Exports route factories, SSE handler, and server builder.

export { createApp } from './server.js';
export { hermesSSEHandler, broadcastHermesEvent, getSubscriberCount } from './sse/hermes-sse.js';
export { speciesRouter } from './routes/species.js';
export { petsRouter } from './routes/pets.js';
export type { DbAdapter } from './types.js';
