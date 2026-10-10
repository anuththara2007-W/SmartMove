const fs = require('fs');
const oracledb = require('oracledb');
require('dotenv').config();

const oracleDbConfig = {
    user: process.env.ORACLE_USER || 'system',
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONN_STRING || 'localhost:1521/XE'
};

async function runSetup() {
    let connection;
    try {
        connection = await oracledb.getConnection(oracleDbConfig);
        console.log('Connected to Oracle Database.');

        const sqlScript = fs.readFileSync('./oracle_setup.sql', 'utf8');
        const statements = sqlScript.split(';').filter(stmt => stmt.trim() !== '');

        console.log(`Found ${statements.length} statements to execute.`);

        for (const statement of statements) {
            let sql = statement.trim();
            // Basic cleanup to handle SQL Developer specific commands or trailing slashes
            if (sql.startsWith('/')) continue;
            if (sql.endsWith('/')) sql = sql.slice(0, -1).trim();
            
            if (sql.length === 0) continue;

            try {
                await connection.execute(sql);
                console.log('Executed block successfully.');
            } catch (err) {
                // Ignore drop errors if table doesn't exist
                if (!err.message.includes('ORA-00942')) {
                    console.error('Error executing statement:', err.message);
                }
            }
        }
        
        await connection.commit();
        console.log('Database setup completed successfully.');
    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

runSetup();
