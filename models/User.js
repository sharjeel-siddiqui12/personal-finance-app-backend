import bcrypt from "bcrypt";
import { execute } from "../config/db.js";
import oracledb from "oracledb"; // Add this import

class User {
  static async findById(id) {
    const sql = `
    SELECT user_id, username, email, role, created_at, updated_at, last_login
    FROM Users
    WHERE user_id = :id
  `;

    try {
      // Use named binding
      const result = await execute(sql, { id: id });

      // If no user found, return null
      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      // Transform Oracle's uppercase keys to lowercase for consistency
      const user = result.rows[0];
      return {
        user_id: user.USER_ID,
        username: user.USERNAME,
        email: user.EMAIL,
        role: user.ROLE,
        created_at: user.CREATED_AT,
        updated_at: user.UPDATED_AT,
        last_login: user.LAST_LOGIN,
      };
    } catch (error) {
      console.error("Error in findById:", error);
      throw error;
    }
  }

  // ...existing code...
  static async updatePassword(id, newPassword) {
    console.log(
      `[User.model.updatePassword] Method called for user ID: ${id}.`
    );
    if (
      !newPassword ||
      typeof newPassword !== "string" ||
      newPassword.trim() === ""
    ) {
      console.error(
        `[User.model.updatePassword] Invalid newPassword provided for user ID: ${id}. Password was: '${newPassword}'`
      );
      throw new Error("New password cannot be empty."); // This should be caught by asyncHandler
    }

    try {
      console.log(
        `[User.model.updatePassword] Attempting to hash new password for user ID: ${id}.`
      );
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      console.log(
        `[User.model.updatePassword] Salt generated for user ID: ${id}.`
      );
      const hashedPasswordForUpdate = await bcrypt.hash(newPassword, salt);
      console.log(
        `[User.model.updatePassword] Password hashed for user ID: ${id}.`
      );
      // Avoid logging the full hash for security, but confirm it's generated:
      console.log(
        `[User.model.updatePassword] Hashed password length: ${
          hashedPasswordForUpdate ? hashedPasswordForUpdate.length : "undefined"
        }`
      );

      const sql = `
      UPDATE Users
      SET password_hash = :new_password_hash 
      WHERE user_id = :user_id_to_update
    `;

      const binds = {
        new_password_hash: hashedPasswordForUpdate,
        user_id_to_update: id,
      };

      console.log(`[User.model.updatePassword] SQL for user ID ${id}: ${sql}`);
      console.log(
        `[User.model.updatePassword] Binds for user ID ${id}: ${JSON.stringify(
          binds
        )}`
      );

      console.log(
        `[User.model.updatePassword] Calling execute for user ID: ${id}.`
      );
      await execute(sql, binds); // Using named parameters, consistent with other working User model methods

      console.log(
        `[User.model.updatePassword] DB update presumed successful for user ID: ${id}.`
      );
      return true;
    } catch (error) {
      // This is the most important log if the execute call fails
      console.error(
        `[User.model.updatePassword] ERROR during password update for user ID ${id}.`
      );
      console.error(
        `[User.model.updatePassword] Error Type: ${error.constructor.name}`
      );
      console.error(`[User.model.updatePassword] Error Name: ${error.name}`);
      console.error(
        `[User.model.updatePassword] Error Message: ${error.message}`
      );
      if (error.errorNum) {
        // Oracle specific error number
        console.error(
          `[User.model.updatePassword] Oracle Error Code (errorNum): ${error.errorNum}`
        );
      }
      if (error.offset) {
        // Oracle error offset
        console.error(
          `[User.model.updatePassword] Oracle Error Offset: ${error.offset}`
        );
      }
      // Log the full error object for more details if needed, and its stack
      // console.error(`[User.model.updatePassword] Full Error Object:`, error);
      console.error(`[User.model.updatePassword] Error Stack: ${error.stack}`);
      throw error; // Re-throw for the controller's asyncHandler to handle and send 500
    }
  }
  // ...existing code...

  static async findByEmail(email) {
    const sql = `
    SELECT user_id, username, email, password_hash, role, created_at, updated_at
    FROM Users
    WHERE email = :email
  `;
    // Use named binding instead of positional binding
    const result = await execute(sql, { email: email });
    return result.rows[0];
  }

  static async create(userData) {
    const { username, email, password, role = "USER" } = userData;

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const sql = `
        INSERT INTO USERS (user_id, username, email, password_hash, role)
        VALUES (user_seq.NEXTVAL, :username, :email, :password_hash, :role)
        RETURNING user_id, username, email, role INTO :id, :out_username, :out_email, :out_role
        `;

    const binds = {
      username,
      email,
      password_hash,
      role,
      id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      out_username: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
      out_email: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
      out_role: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
    };

    const result = await execute(sql, binds);

    return {
      user_id: result.outBinds.id[0],
      username: result.outBinds.out_username[0],
      email: result.outBinds.out_email[0],
      role: result.outBinds.out_role[0],
    };
  }

  static async update(id, userData) {
    const { username, email } = userData;

    const sql = `
      UPDATE Users
      SET username = :username, email = :email
      WHERE user_id = :id
    `;

    await execute(sql, [username, email, id]);

    return this.findById(id);
  }

  static async update(id, userData) {
    const { username, email } = userData;

    const sql = `
    UPDATE Users
    SET username = :username, email = :email
    WHERE user_id = :id
  `;

    // Use named parameters instead of positional
    await execute(sql, {
      username: username,
      email: email,
      id: id,
    });

    return this.findById(id);
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  static async getAllUsers() {
    const sql = `
    SELECT user_id, username, email, role, created_at, updated_at, last_login
    FROM Users
    ORDER BY username
  `;
    const result = await execute(sql);
    return result.rows;
  }

  static async deleteUser(id) {
    await execute(`DELETE FROM Transactions WHERE user_id = :id`, { id });
    await execute(`DELETE FROM Budgets WHERE user_id = :id`, { id });
    await execute(`DELETE FROM Categories WHERE user_id = :id`, { id });
    try {
      const sql = `DELETE FROM Users WHERE user_id = :id`;
      const result = await execute(sql, { id });

      console.log(`User deletion DB result:`, result);

      if (!result || result.rowsAffected === 0) {
        throw new Error("User deletion failed - no rows affected");
      }

      return true;
    } catch (error) {
      console.error(`Error in User.deleteUser: ${error.message}`);
      throw error;
    }
  }
  static async updateRole(id, role) {
    const sql = `
    UPDATE Users
    SET role = :role
    WHERE user_id = :id
  `;

    // Fix: Use named parameters object instead of array
    await execute(sql, {
      role: role,
      id: id,
    });

    return this.findById(id);
  }

  // The problem is in this method
  static async updateLastLogin(userId) {
    try {
      const sql = `
      UPDATE Users
      SET last_login = CURRENT_TIMESTAMP
      WHERE user_id = :id
    `;

      console.log(`Attempting to update last_login for user ${userId}`);
      const result = await execute(sql, { id: userId });
      console.log(`Update successful, rows affected: ${result.rowsAffected}`);
      return true;
    } catch (error) {
      console.error(`Error updating last_login for user ${userId}:`, error);
      throw error;
    }
  }
}

export default User;
