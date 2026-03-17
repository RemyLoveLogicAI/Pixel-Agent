import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/error-handler.js";
import { heartbeatScheduler } from "./services/heartbeatScheduler.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(notFound);
app.use(errorHandler);

// Start the heartbeat scheduler (can be stopped via API)
heartbeatScheduler.start();

export default app;
