import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import companiesRouter from "./companies.js";
import agentsRouter from "./agents.js";
import goalsRouter from "./goals.js";
import tasksRouter from "./tasks.js";
import heartbeatRouter from "./heartbeat.js";
import swarmsRouter from "./swarms.js";
import governanceRouter from "./governance.js";
import toolsRouter from "./tools.js";
import budgetRouter from "./budget.js";
import tracesRouter from "./traces.js";
import memoryRouter from "./memory.js";
import eventsRouter from "./events.js";
import metricsRouter from "./metrics.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(companiesRouter);
router.use(agentsRouter);
router.use(goalsRouter);
router.use(tasksRouter);
router.use(heartbeatRouter);
router.use(swarmsRouter);
router.use(governanceRouter);
router.use(toolsRouter);
router.use(budgetRouter);
router.use(tracesRouter);
router.use(memoryRouter);
router.use(eventsRouter);
router.use(metricsRouter);

export default router;
