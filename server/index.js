
import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql, sqlConfig, SCHEMA_SCRIPTS, SEED_QUERIES } from './db.js';

const app = express();
const PORT = process.env.PORT || 8080; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(process.cwd());
const distPath = path.join(projectRoot, 'dist');

app.use(cors());
app.use(express.json());

// --- DB POOL ---
let poolPromise = null;
const getPool = async () => {
  if (poolPromise) return poolPromise;
  poolPromise = sql.connect(sqlConfig).then(pool => {
      console.log("[DB] Conexión establecida con Azure SQL.");
      return pool;
  }).catch(err => {
      poolPromise = null;
      console.error("[DB ERROR]", err.message);
      throw err;
  });
  return poolPromise;
};

const dbMiddleware = async (req, res, next) => {
    try { req.db = await getPool(); next(); } 
    catch (err) { res.status(503).json({ error: 'DB_ERROR', details: err.message }); }
};

// --- API ROUTES ---
const apiRouter = express.Router();

// Health Check
apiRouter.get('/health', (req, res) => {
    res.json({ success: true, status: 'online', db: 'Azure SQL' });
});

// Setup Database
apiRouter.post('/setup', dbMiddleware, async (req, res) => {
    try {
        const transaction = new sql.Transaction(req.db);
        await transaction.begin();
        const request = new sql.Request(transaction);
        for (const script of SCHEMA_SCRIPTS) await request.query(script);
        for (const seed of SEED_QUERIES) await request.query(seed);
        await transaction.commit();
        res.json({ success: true, message: "Esquema Azure SQL inicializado correctamente." });
    } catch (e) {
        console.error("[SETUP ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Auth
apiRouter.post('/auth/login', dbMiddleware, async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await req.db.request()
            .input('u', sql.NVarChar, username)
            .query('SELECT * FROM Users WHERE Username = @u');
        const user = result.recordset[0];
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (user.Role !== 'OPERATOR' && user.Password !== password) return res.status(401).json({ error: 'Password incorrecto' });
        res.json({ success: true, user: { id: user.Id, username: user.Username, role: user.Role, name: user.Name } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Users
apiRouter.get('/users', dbMiddleware, async (req, res) => {
    try {
        const r = await req.db.request().query('SELECT Id, Username, Role, Name FROM Users');
        res.json(r.recordset);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Operations
apiRouter.get('/operations', dbMiddleware, async (req, res) => {
    try {
        const r = await req.db.request().query('SELECT * FROM Operations ORDER BY OrderIndex');
        res.json(r.recordset);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Part Numbers
apiRouter.get('/parts', dbMiddleware, async (req, res) => {
    try {
        const r = await req.db.request().query('SELECT * FROM PartNumbers');
        res.json(r.recordset);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Work Orders
apiRouter.get('/orders', dbMiddleware, async (req, res) => {
    try {
        const r = await req.db.request().query('SELECT * FROM WorkOrders ORDER BY CreatedAt DESC');
        res.json(r.recordset);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Routes
apiRouter.get('/routes', dbMiddleware, async (req, res) => {
    try {
        const r = await req.db.request().query('SELECT * FROM ProcessRoutes');
        // Aquí se debería hacer un JOIN con los pasos, pero por simplicidad devolvemos las rutas
        // En un sistema real se harían queries más complejas.
        res.json(r.recordset.map(route => ({ ...route, steps: [] })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serials
apiRouter.get('/serials', dbMiddleware, async (req, res) => {
    try {
        const r = await req.db.request().query('SELECT * FROM Serials');
        res.json(r.recordset.map(s => ({ ...s, history: [], printHistory: [] })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Montar el Router de API
app.use('/api', apiRouter);

// --- STATIC FILES & SPA ---
app.use(express.static(distPath));

// Catch-all para SPA
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Endpoint de API no encontrado' });
    
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        const devIndex = path.join(projectRoot, 'index.html');
        if (fs.existsSync(devIndex)) {
            res.sendFile(devIndex);
        } else {
            res.status(404).send('Error: El frontend no ha sido compilado ni se encuentra index.html.');
        }
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`LION MES SERVER RUNNING ON PORT ${PORT}`);
    console.log(`DATABASE: Azure SQL (mx31dbs04)`);
});
