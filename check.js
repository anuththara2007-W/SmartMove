const { oracledb, initializeOracle } = require('./config/oracle');

async function checkCols() {
    await initializeOracle();
    let conn;
    try {
        conn = await oracledb.getConnection();
        const result = await conn.execute(`
            SELECT column_name, data_type, nullable
            FROM user_tab_columns
            WHERE table_name = 'PASSENGERS'
        `);
        console.log(result.rows);
    } catch(e) {
        console.error(e);
    } finally {
        if(conn) await conn.close();
        process.exit();
    }
}

checkCols();
