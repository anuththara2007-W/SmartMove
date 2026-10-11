//Import the oracleDB Node.js driver.
const oracledb = require('oracledb');
//Import envirinmnt varibles form .env file
require('dotenv').config();

const oracleDbConfig = {
    user: process.env.ORACLE_USER || 'system',
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONN_STRING || 'localhost:1521/XE' //default listner port.
};
// Creates a connection pool for the Oracle Database.
async function initializeOracle() {
    try {
        // Creates and configures a pool of reusable database connections.
        await oracledb.createPool({
            // conection pool reduces the overhead of creating a new connection for every database request.
            
            ...oracleDbConfig, // Uses the Oracle database connection settings defined elsewhere.
            poolMin: 2,         // Keeps at least 2 connections in the pool.
            poolMax: 10,        // Allows a maximum of 10 connections in the pool.
            poolIncrement: 1   // Adds 1 connection when more connections are needed.
        });

        // Displays a success message after the pool is created.
        console.log('Successfully connected to Oracle Database!');
    } catch (err) {
        // Handles errors if creating the connection pool fails.
        console.error('Oracle Connection Error:', err.message);
    }
}

// Exports the function and OracleDB library so other files can use them.
module.exports = { initializeOracle, oracledb };