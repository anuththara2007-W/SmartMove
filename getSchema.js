require('dotenv').config();
const { initializeOracle, oracledb } = require('./config/oracle');

(async function() {
    try {
        await initializeOracle();
        const conn = await oracledb.getConnection();
        const res = await conn.execute("SELECT column_name FROM user_tab_cols WHERE table_name = 'VEHICLES'");
        console.log(res.rows);
        await conn.close();
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
