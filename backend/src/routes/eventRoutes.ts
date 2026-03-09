import express from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getEventRegistrations,
} from "../controllers/eventController";

const router = express.Router();

router.get("/", authenticateToken, getEvents);
router.post("/", authenticateToken, createEvent);
router.put("/:id", authenticateToken, updateEvent);
router.delete("/:id", authenticateToken, deleteEvent);
router.post("/:id/register", authenticateToken, registerForEvent);
router.delete("/:id/register", authenticateToken, unregisterFromEvent);
router.get("/:id/registrations", authenticateToken, getEventRegistrations);

export default router;
