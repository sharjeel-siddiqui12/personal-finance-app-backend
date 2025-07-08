import { execute } from "../config/db.js";
import { AppError } from "../utils/errorHandler.js";
import oracledb from "oracledb"; // Make sure this is imported

class Goal {
  static async create(goalData) {
    const {
      user_id,
      name,
      target_amount,
      current_amount = 0,
      target_date,
    } = goalData;

    try {
      // Insert the goal into the database
      const result = await execute(
        `INSERT INTO GOALS (
          USER_ID, NAME, TARGET_AMOUNT, CURRENT_AMOUNT, 
          START_DATE, TARGET_DATE, IS_COMPLETED
        ) VALUES (
          :user_id, :name, :target_amount, :current_amount,
          SYSDATE, TO_DATE(:target_date, 'YYYY-MM-DD'), 0
        ) RETURNING GOAL_ID INTO :goal_id`,
        {
          user_id,
          name,
          target_amount,
          current_amount,
          target_date,
          goal_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, // Fixed: use oracledb.NUMBER instead of "NUMBER"
        }
      );

      // Get the newly created goal
      const goalId = result.outBinds.goal_id[0];
      return this.findById(goalId);
    } catch (error) {
      console.error("Error creating goal:", error);
      throw new AppError("Failed to create savings goal", 500);
    }
  }

  static async findById(id) {
    try {
      const result = await execute(
        // Changed from connection.execute
        `SELECT 
          GOAL_ID, USER_ID, NAME, TARGET_AMOUNT, CURRENT_AMOUNT, 
          START_DATE, TARGET_DATE, IS_COMPLETED, 
          CREATED_AT, UPDATED_AT
        FROM GOALS
        WHERE GOAL_ID = :id`,
        { id }
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Error finding goal by ID:", error);
      throw new AppError("Failed to retrieve savings goal", 500);
    }
  }

  static async findByUser(userId) {
    try {
      const result = await execute(
        // Changed from connection.execute
        `SELECT 
          GOAL_ID, USER_ID, NAME, TARGET_AMOUNT, CURRENT_AMOUNT, 
          START_DATE, TARGET_DATE, IS_COMPLETED, 
          CREATED_AT, UPDATED_AT,
          ROUND((CURRENT_AMOUNT / TARGET_AMOUNT) * 100) AS PERCENT_COMPLETE
        FROM GOALS
        WHERE USER_ID = :userId
        ORDER BY IS_COMPLETED ASC, TARGET_DATE ASC`,
        { userId }
      );

      return result.rows;
    } catch (error) {
      console.error("Error finding goals by user:", error);
      throw new AppError("Failed to retrieve user savings goals", 500);
    }
  }

  static async update(id, goalData) {
    try {
      // Extract values with defaults to prevent NULL updates
      const { name, target_amount, current_amount, target_date } = goalData;

      // Get the current goal to use existing values if needed
      const currentGoal = await this.findById(id);
      if (!currentGoal) {
        throw new AppError("Goal not found", 404);
      }

      // Check if goal will be completed with this update
      const finalCurrentAmount =
        current_amount !== undefined
          ? current_amount
          : currentGoal.CURRENT_AMOUNT;
      const finalTargetAmount =
        target_amount !== undefined ? target_amount : currentGoal.TARGET_AMOUNT;
      const isCompleted = finalCurrentAmount >= finalTargetAmount ? 1 : 0;

      // Build dynamic SQL that only updates provided fields
      let sql = `UPDATE GOALS SET `;
      const params = { id };
      const updateFields = [];

      if (name !== undefined && name !== null) {
        updateFields.push(`NAME = :name`);
        params.name = name;
      }

      if (target_amount !== undefined && target_amount !== null) {
        updateFields.push(`TARGET_AMOUNT = :target_amount`);
        params.target_amount = target_amount;
      }

      if (current_amount !== undefined && current_amount !== null) {
        updateFields.push(`CURRENT_AMOUNT = :current_amount`);
        params.current_amount = current_amount;
      }

      if (target_date !== undefined && target_date !== null) {
        updateFields.push(`TARGET_DATE = TO_DATE(:target_date, 'YYYY-MM-DD')`);
        params.target_date = target_date;
      }

      // Always update these fields
      updateFields.push(`IS_COMPLETED = :is_completed`);
      updateFields.push(`UPDATED_AT = SYSDATE`);
      params.is_completed = isCompleted;

      // Complete the SQL statement
      sql += updateFields.join(", ");
      sql += ` WHERE GOAL_ID = :id`;

      // Execute the update
      await execute(sql, params);

      return this.findById(id);
    } catch (error) {
      console.error("Error updating goal:", error);
      throw new AppError("Failed to update savings goal", 500);
    }
  }

  static async delete(id) {
    try {
      await execute(
        // Changed from connection.execute
        "DELETE FROM GOALS WHERE GOAL_ID = :id",
        { id }
      );

      return true;
    } catch (error) {
      console.error("Error deleting goal:", error);
      throw new AppError("Failed to delete savings goal", 500);
    }
  }

  static async updateProgress(userId, amount) {
    try {
      // Get user's first incomplete goal
      const result = await execute(
        // Changed from connection.execute
        `SELECT GOAL_ID, TARGET_AMOUNT, CURRENT_AMOUNT
         FROM GOALS
         WHERE USER_ID = :userId
         AND IS_COMPLETED = 0
         ORDER BY TARGET_DATE ASC`,
        { userId }
      );

      if (result.rows.length === 0) {
        return null; // No active goals
      }

      const goal = result.rows[0];

      // Calculate new amount and check if goal will be completed
      const newAmount = Number(goal.CURRENT_AMOUNT) + Number(amount);
      const isCompleted = newAmount >= Number(goal.TARGET_AMOUNT) ? 1 : 0;

      // Update the goal
      await execute(
        // Changed from connection.execute
        `UPDATE GOALS
         SET CURRENT_AMOUNT = :newAmount,
             IS_COMPLETED = :isCompleted,
             UPDATED_AT = SYSDATE
         WHERE GOAL_ID = :goalId`,
        {
          newAmount,
          isCompleted,
          goalId: goal.GOAL_ID,
        }
      );

      return {
        goalId: goal.GOAL_ID,
        isCompleted,
        newAmount,
        targetAmount: goal.TARGET_AMOUNT,
      };
    } catch (error) {
      console.error("Error updating goal progress:", error);
      throw new AppError("Failed to update goal progress", 500);
    }
  }
}

export default Goal;
