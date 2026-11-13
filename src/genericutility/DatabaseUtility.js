
const mysql = require('mysql2/promise');

/** JDBC URL -> MySQL connection properties */
function parseJdbcUrl(dbUrl) {
  const u = new URL(dbUrl.replace(/^jdbc:/, ''));

  return {
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 3306,
    database: decodeURIComponent(u.pathname.replace(/^\//, ''))
  };
}

class DatabaseUtility {

  async connectDB(dbUrl, dbUsername, dbPassword) {
    try {
      const { host, port, database } = parseJdbcUrl(dbUrl);

      const connection = await mysql.createConnection({
        host,
        port,
        database,
        user: dbUsername,
        password: dbPassword,
        connectTimeout: 15000
      });

      // Verify actual connection details
      const [details] = await connection.query(`
        SELECT
          DATABASE() AS databaseName,
          @@hostname AS hostName,
          @@port AS port
      `);

      console.log('[DB] Connected successfully');
      console.log('[DB] Actual connection:', details[0]);

      return connection;

    } catch (e) {
      console.error('[DB] Connection failed:', e.message);
      throw e;
    }
  }

  async closeDB(connection) {
    try {
      if (connection) await connection.end();
    } catch (e) {
      console.error('[DB] Close failed:', e.message);
    }
  }

  async executeQuery(query, connection) {
    const [rows] = await connection.query(query);
    return rows;
  }

  async executeUpdate(query, connection) {
    const [result] = await connection.query(query);
    return result.affectedRows;
  }

  async verifyColumnContainsData(
    connection,
    tableName,
    columnName,
    expectedData
  ) {
    try {
      if (!connection) {
        throw new Error('Database connection is null');
      }

      console.log(`[DB] Verifying transaction: ${expectedData}`);

      const query =
        `SELECT \`${columnName}\` FROM \`${tableName}\``;

      const [rows] = await connection.query(query);

      console.log(`[DB] Total rows retrieved: ${rows.length}`);

      const isVerified = rows.some(
        row => String(row[columnName]) === String(expectedData)
      );

      console.log(
        `[DB] Transaction ${expectedData}: ${isVerified ? 'FOUND' : 'NOT FOUND'}`
      );

      return isVerified;

    } catch (e) {
      console.error('[DB] Verification query failed:', e.message);
      throw e;
    }
  }
}

module.exports = { DatabaseUtility, parseJdbcUrl };
