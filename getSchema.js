require('dotenv').config();
const { initializeOracle, oracledb } = require('./config/oracle');

(async function() {
    try {
        await initializeOracle();
        const conn = await oracledb.getConnection();
        const res = await conn.execute(`
            SELECT a.column_name, b.search_condition 
            FROM user_cons_columns a 
            JOIN user_constraints b ON a.constraint_name = b.constraint_name 
            WHERE a.table_name = 'VEHICLES' AND b.constraint_type = 'C'
        `);
        console.log(res.rows);
        await conn.close();
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
