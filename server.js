const express = require('express');
const oracledb = require('oracledb');
const mongoose = require('mongoose'); // Added Mongoose
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/apiRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve the vanilla frontend

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api', apiRoutes);
console.log('Routes mounted on /api:');
apiRoutes.stack.forEach(r => {
    if (r.route) {
        console.log(`[API] ${r.route.path} ${Object.keys(r.route.methods)}`);
    }
});
// --- Oracle Configuration ---
const oracleDbConfig = {
    user: process.env.ORACLE_USER || 'system',
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONN_STRING || 'localhost:1521/XE'
};

async function initializeDatabases() {
    try {
        // 1. Connect to Oracle
        await oracledb.createPool({
            ...oracleDbConfig,
            poolMin: 2,
            poolMax: 10,
            poolIncrement: 1
        });
        console.log('Successfully connected to Oracle Database (xe)!');

        // Ensure Routes table has IsPopular column
        try {
            const conn = await oracledb.getConnection();
            const colCheck = await conn.execute(
                `SELECT column_name FROM user_tab_columns WHERE table_name = 'ROUTES' AND column_name = 'ISPOPULAR'`
            );
            if (!colCheck.rows || colCheck.rows.length === 0) {
                await conn.execute(`ALTER TABLE Routes ADD (IsPopular VARCHAR2(1) DEFAULT 'Y')`);
                await conn.execute(`UPDATE Routes SET IsPopular = 'Y' WHERE IsPopular IS NULL`);
                await conn.commit();
                console.log('Ensured IsPopular column exists in Routes table.');
            }
            await conn.close();
        } catch (colErr) {
            console.warn('Warning checking Routes columns:', colErr.message);
        }

        // 2. Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smartmove');
        console.log('Successfully connected to MongoDB!');
        
    } catch (err) {
        console.error('Database Connection Error:', err.message);
    }
}


app.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    await initializeDatabases();
});