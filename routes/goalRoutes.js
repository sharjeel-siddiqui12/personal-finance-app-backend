import express from "express";
import {
  getUserGoals,
  createGoal,
  getGoal,
  updateGoal,
  deleteGoal,
  allocateToGoal,
} from "../controllers/goalController.js";
import { protect } from "../middleware/authMiddleware.js"; // Fix: Use "protect" instead of "authenticateJWT"

const router = express.Router();

// All routes require authentication
router.use(protect); // Fix: Use "protect" instead of "authenticateJWT"

router.route("/").get(getUserGoals).post(createGoal);
router.route("/:id").get(getGoal).put(updateGoal).delete(deleteGoal);
router.route("/allocate").post(allocateToGoal);

export default router;
