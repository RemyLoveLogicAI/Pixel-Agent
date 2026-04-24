import express, { type Express } from "express";
import cors from "cors";
import apiRouter from "./routes/index.js";
import authenticate from "./middlewares/authenticate.js";
import tenantGuard from "./middlewares/tenant-guard.js";
import { notFound, errorHandler } from "./middlewares/error-handler.js";
import { heartbeatScheduler } from "./services/heartbeatScheduler.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', authenticate, tenantGuard, apiRouter);

app.use(notFound);
app.use(errorHandler);

// Start the heartbeat scheduler (can be stopped via API)
heartbeatScheduler.start();

export default app;
