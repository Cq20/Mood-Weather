import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import weatherRouter from "./weather";
import moodEventsRouter from "./mood-events";
import meRouter from "./me";
import journalRouter from "./journal";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/weather", weatherRouter);
router.use("/mood-events", moodEventsRouter);
router.use("/me", meRouter);
router.use("/journal-entries", journalRouter);

export default router;
