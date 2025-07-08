import { execute, getConnection } from "../config/db.js";
import oracledb from "oracledb";

class Budget {
  static async getAll(userId) {
    const sql = `
      SELECT b.budget_id, b.user_id, b.category_id, b.amount,
             TO_CHAR(b.start_date, 'YYYY-MM-DD') as start_date,
             TO_CHAR(b.end_date, 'YYYY-MM-DD') as end_date,
             c.name as category_name, c.type as category_type,
             COALESCE((
               SELECT SUM(t.amount)
               FROM Transactions t
               WHERE t.user_id = b.user_id
                 AND t.category_id = b.category_id
                 AND t.transaction_date BETWEEN b.start_date AND b.end_date
                 AND t.type = 'EXPENSE'
             ), 0) as actual
      FROM Budgets b
      JOIN Categories c ON b.category_id = c.category_id
      WHERE b.user_id = :user_id
      ORDER BY b.end_date DESC
    `;

    const result = await execute(sql, [userId]);
    return result.rows;
  }

  // Add this method to the Budget class
  static async checkBudgetLimit(userId, categoryId, amount, transactionType) {
    try {
      // Only check budget limits for expense transactions
      if (transactionType.toUpperCase() !== "EXPENSE") {
        return { withinLimit: true };
      }

      console.log(
        `Checking budget limit for user ${userId}, category ${categoryId}, amount ${amount}`
      );

      const sql = `
      SELECT 
        b.budget_id, 
        b.amount as budget_limit,
        c.name as category_name,
        COALESCE((
          SELECT SUM(t.amount)
          FROM Transactions t
          WHERE t.user_id = b.user_id
            AND t.category_id = b.category_id
            AND t.transaction_date BETWEEN b.start_date AND b.end_date
            AND t.type = 'EXPENSE'
        ), 0) as current_usage
      FROM Budgets b
      JOIN Categories c ON b.category_id = c.category_id
      WHERE b.user_id = :user_id
        AND b.category_id = :category_id
        AND SYSDATE BETWEEN b.start_date AND b.end_date
    `;

      const result = await execute(sql, {
        user_id: Number(userId),
        category_id: Number(categoryId),
      });

      if (!result.rows || result.rows.length === 0) {
        // No active budget for this category
        return { withinLimit: true };
      }

      const budget = result.rows[0];
      const budgetLimit = Number(budget.BUDGET_LIMIT);
      const currentUsage = Number(budget.CURRENT_USAGE);
      const newUsage = currentUsage + Number(amount);

      console.log(
        `Budget check results: limit=${budgetLimit}, current=${currentUsage}, new=${newUsage}`
      );

      return {
        withinLimit: newUsage <= budgetLimit,
        budget: budgetLimit,
        currentUsage,
        newUsage,
        remaining: budgetLimit - currentUsage,
        categoryName: budget.CATEGORY_NAME,
      };
    } catch (error) {
      console.error("Error checking budget limit:", error);
      // Return true to avoid blocking the transaction due to a budget check error
      return { withinLimit: true, error: error.message };
    }
  }

  // Add this method to the Budget class
  static async validateBudgetAmount(
    userId,
    categoryId,
    amount,
    startDate,
    endDate
  ) {
    const sql = `
    SELECT 
      COALESCE(SUM(t.amount), 0) as total_spent
    FROM Transactions t
    WHERE t.user_id = :user_id
      AND t.category_id = :category_id
      AND t.transaction_date BETWEEN TO_DATE(:start_date, 'YYYY-MM-DD') AND TO_DATE(:end_date, 'YYYY-MM-DD')
      AND t.type = 'EXPENSE'
  `;

    const result = await execute(sql, {
      user_id: userId,
      category_id: categoryId,
      start_date: startDate,
      end_date: endDate,
    });

    const totalSpent = Number(result.rows[0].TOTAL_SPENT);

    return {
      isValid: totalSpent <= amount,
      totalSpent: totalSpent,
      deficit: totalSpent - amount,
    };
  }

  static async getById(id, userId) {
    const sql = `
      SELECT b.budget_id, b.user_id, b.category_id, b.amount,
             TO_CHAR(b.start_date, 'YYYY-MM-DD') as start_date,
             TO_CHAR(b.end_date, 'YYYY-MM-DD') as end_date,
             c.name as category_name, c.type as category_type,
             COALESCE((
               SELECT SUM(t.amount)
               FROM Transactions t
               WHERE t.user_id = b.user_id
                 AND t.category_id = b.category_id
                 AND t.transaction_date BETWEEN b.start_date AND b.end_date
                 AND t.type = 'EXPENSE'
             ), 0) as actual
      FROM Budgets b
      JOIN Categories c ON b.category_id = c.category_id
      WHERE b.budget_id = :id AND b.user_id = :user_id
    `;

    const result = await execute(sql, [id, userId]);
    return result.rows[0];
  }

  static async create(budgetData) {
    const { user_id, category_id, amount, start_date, end_date } = budgetData;

    let connection;
    try {
      connection = await getConnection();

      const result = await connection.execute(
        `BEGIN 
           BudgetManagement.CreateBudget(
             :p_user_id, :p_category_id, :p_amount, 
             TO_DATE(:p_start_date, 'YYYY-MM-DD'), TO_DATE(:p_end_date, 'YYYY-MM-DD'),
             :p_budget_id
           );
         END;`,
        {
          p_user_id: user_id,
          p_category_id: category_id,
          p_amount: amount,
          p_start_date: start_date,
          p_end_date: end_date,
          p_budget_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );

      const budget_id = result.outBinds.p_budget_id;

      return this.getById(budget_id, user_id);
    } catch (error) {
      console.error("Error creating budget:", error);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error("Error closing connection:", error);
        }
      }
    }
  }

  static async update(id, budgetData) {
    const { amount, start_date, end_date } = budgetData;

    let connection;
    try {
      connection = await getConnection();

      await connection.execute(
        `BEGIN 
           BudgetManagement.UpdateBudget(
             :p_budget_id, :p_amount, 
             TO_DATE(:p_start_date, 'YYYY-MM-DD'), TO_DATE(:p_end_date, 'YYYY-MM-DD')
           );
         END;`,
        {
          p_budget_id: id,
          p_amount: amount,
          p_start_date: start_date,
          p_end_date: end_date,
        },
        { autoCommit: true }
      );

      return this.getById(id, budgetData.user_id);
    } catch (error) {
      console.error("Error updating budget:", error);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error("Error closing connection:", error);
        }
      }
    }
  }

  static async delete(id, userId) {
    const sql = `
      DELETE FROM Budgets
      WHERE budget_id = :id AND user_id = :user_id
    `;

    const result = await execute(sql, [id, userId]);

    return result.rowsAffected > 0;
  }

  static async getBudgetPerformance(userId) {
    let connection;
    try {
      connection = await getConnection();

      const result = await connection.execute(
        `DECLARE
           v_cursor SYS_REFCURSOR;
         BEGIN 
           v_cursor := BudgetManagement.GetBudgetPerformance(:p_user_id);
           DBMS_SQL.RETURN_RESULT(v_cursor);
         END;`,
        { p_user_id: userId },
        { autoCommit: true }
      );

      // Need to extract results from the returned cursor
      // For simplicity, we'll call our getAll method instead
      return this.getAll(userId);
    } catch (error) {
      console.error("Error getting budget performance:", error);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error("Error closing connection:", error);
        }
      }
    }
  }

  static async getBudgetVsActual(userId) {
    const sql = `
      SELECT 
        c.name as category,
        b.amount as budget,
        COALESCE((
          SELECT SUM(t.amount)
          FROM Transactions t
          WHERE t.user_id = b.user_id
            AND t.category_id = b.category_id
            AND t.transaction_date BETWEEN b.start_date AND b.end_date
            AND t.type = 'EXPENSE'
        ), 0) as actual
      FROM Budgets b
      JOIN Categories c ON b.category_id = c.category_id
      WHERE b.user_id = :user_id
        AND SYSDATE BETWEEN b.start_date AND b.end_date
      ORDER BY b.amount DESC
    `;

    const result = await execute(sql, [userId]);
    return result.rows;
  }
}

export default Budget;
