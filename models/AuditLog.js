import { execute } from "../config/db.js";
import oracledb from "oracledb"; // Make sure this import exists

class AuditLog {
  static async create(logData) {
    const { user_id, action, description, ip_address, user_agent } = logData;

    const sql = `
      INSERT INTO audit_logs 
      (log_id, user_id, action, description, ip_address, user_agent, created_at)
      VALUES 
      (audit_log_seq.NEXTVAL, :user_id, :action, :description, :ip_address, :user_agent, SYSDATE)
      RETURNING log_id INTO :id
    `;

    const binds = {
      user_id,
      action,
      description,
      ip_address,
      user_agent,
      id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    };

    const result = await execute(sql, binds);
    return result.outBinds.id[0];
  }

  static async getByUserId(userId) {
    const sql = `
      SELECT log_id, user_id, action, description, ip_address, user_agent, created_at
      FROM audit_logs
      WHERE user_id = :user_id
      ORDER BY created_at DESC
    `;

    const result = await execute(sql, { user_id: userId });
    return result.rows;
  }

  static async getAll() {
    const sql = `
      SELECT al.log_id, al.user_id, u.username, al.action, al.description, 
             al.ip_address, al.user_agent, al.created_at
      FROM audit_logs al
      JOIN users u ON al.user_id = u.user_id
      ORDER BY al.created_at DESC
    `;

    const result = await execute(sql);
    return result.rows;
  }
}

export default AuditLog;
