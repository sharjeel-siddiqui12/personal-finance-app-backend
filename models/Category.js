import { execute } from "../config/db.js";
import oracledb from "oracledb"; // Add this import

class Category {
  static async getAll(userId) {
    const sql = `
      SELECT category_id, name, type, user_id, created_at
      FROM Categories
      WHERE user_id = :user_id OR user_id IS NULL
      ORDER BY type, name
    `;

    const result = await execute(sql, [userId]);
    return result.rows;
  }

  static async getById(id, userId) {
    const sql = `
    SELECT category_id, name, type, user_id, created_at
    FROM Categories
    WHERE category_id = :id AND (user_id = :user_id OR user_id IS NULL)
  `;

    const result = await execute(sql, [id, userId]);
    return result.rows[0];
  }

  static async create(categoryData) {
    const { name, type, user_id } = categoryData;

    const sql = `
      INSERT INTO Categories (category_id, name, type, user_id)
      VALUES (category_seq.NEXTVAL, :name, :type, :user_id)
      RETURNING category_id INTO :id
    `;

    const binds = {
      name,
      type: type.toUpperCase(),
      user_id,
      id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, // CORRECTED format
    };

    const result = await execute(sql, binds);

    return this.getById(result.outBinds.id[0], user_id);
  }

  static async update(id, categoryData, userId) {
    const { name, type } = categoryData;

    const sql = `
      UPDATE Categories
      SET name = :name, type = :type
      WHERE category_id = :id AND user_id = :user_id
    `;

    await execute(sql, [name, type.toUpperCase(), id, userId]);

    return this.getById(id, userId);
  }

  static async checkDependencies(id) {
    // Check for related transactions
    const transactionSql = `
      SELECT COUNT(*) as count FROM Transactions 
      WHERE category_id = :id
    `;

    const transactionResult = await execute(transactionSql, [id]);
    const transactionCount = transactionResult.rows[0].COUNT;

    // Check for related budgets
    const budgetSql = `
      SELECT COUNT(*) as count FROM Budgets 
      WHERE category_id = :id
    `;

    const budgetResult = await execute(budgetSql, [id]);
    const budgetCount = budgetResult.rows[0].COUNT;

    return {
      hasTransactions: transactionCount > 0,
      transactionCount: transactionCount,
      hasBudgets: budgetCount > 0,
      budgetCount: budgetCount,
      hasDependencies: transactionCount > 0 || budgetCount > 0,
    };
  }

  static async delete(id, userId, force = false) {
    if (force) {
      // Using the existing execute function that already manages connections
      try {
        console.log(`Starting forced deletion of category ${id}`);

        // Delete related transactions first
        const deleteTransactionsSql = `
          DELETE FROM Transactions
          WHERE category_id = :id
        `;
        await execute(deleteTransactionsSql, [id]);
        console.log("Transactions deleted successfully");

        // Delete related budgets
        const deleteBudgetsSql = `
          DELETE FROM Budgets
          WHERE category_id = :id
        `;
        await execute(deleteBudgetsSql, [id]);
        console.log("Budgets deleted successfully");

        // Check if there are any other potential tables with foreign keys
        // Since we don't have direct transaction support with the execute function
        // We'll handle each table separately

        // Try to delete from Goals table if it exists
        try {
          const deleteGoalsSql = `
            DELETE FROM Goals
            WHERE category_id = :id
          `;
          await execute(deleteGoalsSql, [id]);
          console.log("Goals deleted successfully");
        } catch (goalErr) {
          // Ignore errors if table doesn't exist
          console.log("No Goals table or no records to delete");
        }

        // Finally delete the category
        const deleteCategorySql = `
          DELETE FROM Categories
          WHERE category_id = :id AND user_id = :user_id
        `;
        const result = await execute(deleteCategorySql, [id, userId]);

        if (result.rowsAffected === 0) {
          throw new Error(
            "Category not found or you don't have permission to delete it"
          );
        }

        console.log(
          `Successfully deleted category ${id} with all dependencies`
        );
        return true;
      } catch (error) {
        console.error("Error during forced category deletion:", error);
        throw error;
      }
    } else {
      // Standard delete without handling dependencies
      const sql = `
        DELETE FROM Categories
        WHERE category_id = :id AND user_id = :user_id
      `;

      const result = await execute(sql, [id, userId]);
      return result.rowsAffected > 0;
    }
  }
}

export default Category;
