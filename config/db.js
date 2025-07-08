import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

// Set oracledb configuration
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false;

// Database connection configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

// Get a connection from the pool
const getConnection = async () => {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Error getting database connection:', error);
    throw error;
  }
};

// Initialize the connection pool
const initialize = async () => {
  try {
    await oracledb.createPool({
      ...dbConfig,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });
    console.log('Oracle DB connection pool initialized successfully');
  } catch (error) {
    console.error('Error initializing database pool:', error);
    throw error;
  }
};

// Close all connections in the pool
const closePool = async () => {
  try {
    await oracledb.getPool().close(10);
    console.log('Oracle DB connection pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
    throw error;
  }
};

// Execute a query
const execute = async (sql, binds = [], options = { autoCommit: true }) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(sql, binds, options);
    return result;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
};

// Execute a PL/SQL stored procedure
const executeProcedure = async (procedureName, binds = [], options = {}) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `BEGIN ${procedureName}; END;`,
      binds,
      { ...options, autoCommit: true }
    );
    return result;
  } catch (error) {
    console.error(`Error executing procedure ${procedureName}:`, error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
};

export { initialize, closePool, execute, executeProcedure, getConnection };