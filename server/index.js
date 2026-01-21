
import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { sql, sqlConfig, masterConfig, SCHEMA_SCRIPTS, SEED_QUERIES } from './db.js';

const app = express();
//const PORT = process.env.PORT || 3010;
const PORT = process.env.PORT || 8080; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, '../dist'); 

app.use(cors());
app.use(express.json());
app.use(express.static(DIST_DIR));

// Middleware de conexión a BD con Singleton pattern
const dbMiddleware = async (req, res, next) => {
    try {
        if (!sql.globalConnection || !sql.globalConnection.connected) {
            sql.globalConnection = await sql.connect(sqlConfig);
        }
        req.db = sql.globalConnection;
        next();
    } catch (err) {
        res.status(500).send('Database connection error: ' + err.message);
    }
};

app.use(dbMiddleware);

app.post('/api/setup', async (req, res) => {
    const logs = [];
    try {
        const masterPool = new sql.ConnectionPool(masterConfig);
        await masterPool.connect();
        // Nota: En Azure SQL el CREATE DATABASE puede requerir privilegios especiales.
        // Asumimos que Liondb ya existe o el usuario tiene permisos.
        logs.push("Verificando existencia de base de datos Liondb...");
        const dbCheck = await masterPool.request().query("SELECT * FROM sys.databases WHERE name = 'Liondb'");
        if (dbCheck.recordset.length === 0) {
            // Azure SQL (Database-level) suele no permitir CREATE DATABASE desde app.
            // Si falla, es normal en tiers básicos.
            try { await masterPool.request().query("CREATE DATABASE Liondb"); logs.push("DB Liondb creada."); } 
            catch(e) { logs.push("Info: No se pudo crear DB automáticamente (puede que ya exista o permisos insuficientes)."); }
        }
        await masterPool.close();

        const setupPool = new sql.ConnectionPool(sqlConfig);
        await setupPool.connect();
        for (const script of SCHEMA_SCRIPTS) {
            await setupPool.request().query(script);
        }
        for (const query of SEED_QUERIES) {
            await setupPool.request().query(query);
        }
        await setupPool.close();
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, logs, error: err.message });
    }
});

// Auth
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await req.db.request()
        .input('u', sql.NVarChar, username)
        .query('SELECT * FROM Users WHERE Username = @u');
    const user = result.recordset[0];
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.Role !== 'OPERATOR' && user.Password !== password) return res.status(401).json({ success: false, error: 'Invalid password' });
    res.json({ success: true, user: { id: user.Id, username: user.Username, role: user.Role, name: user.Name } });
});

// Operaciones de Trazabilidad
app.get('/api/serials', async (req, res) => {
    const result = await req.db.request().query(`
        SELECT s.*, 
        (SELECT TOP 1 h.Timestamp FROM SerialHistory h WHERE h.SerialNumber = s.SerialNumber ORDER BY h.Timestamp DESC) as LastUpdate
        FROM Serials s
    `);
    // Cargar historial para cada serial
    const serials = result.recordset;
    for (let s of serials) {
        const hist = await req.db.request()
            .input('sn', sql.NVarChar, s.SerialNumber)
            .query('SELECT h.*, o.Name as OperationName, u.Name as OperatorName FROM SerialHistory h JOIN Operations o ON h.OperationId = o.Id JOIN Users u ON h.OperatorId = u.Id WHERE h.SerialNumber = @sn ORDER BY h.Timestamp ASC');
        s.history = hist.recordset;
    }
    res.json(serials.map(s => ({
        serialNumber: s.SerialNumber,
        orderNumber: s.OrderNumber,
        partNumberId: s.PartNumberId,
        currentOperationId: s.CurrentOperationId,
        isComplete: s.IsComplete,
        trayId: s.TrayId,
        history: s.history.map(h => ({
            operationId: h.OperationId,
            operationName: h.OperationName,
            operatorId: h.OperatorId,
            operatorName: h.OperatorName,
            timestamp: h.Timestamp
        }))
    })));
});

app.post('/api/serials/batch-generate', async (req, res) => {
    const { orderNumber, partNumberId, currentOperationId, trayId, operatorId, quantity } = req.body;
    const transaction = new sql.Transaction(req.db);
    try {
        await transaction.begin();
        const generated = [];
        for (let i = 0; i < quantity; i++) {
            const sn = `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await transaction.request()
                .input('sn', sql.NVarChar, sn)
                .input('on', sql.NVarChar, orderNumber)
                .input('pn', sql.NVarChar, partNumberId)
                .input('op', sql.NVarChar, currentOperationId)
                .input('tr', sql.NVarChar, trayId)
                .query('INSERT INTO Serials (SerialNumber, OrderNumber, PartNumberId, CurrentOperationId, TrayId) VALUES (@sn, @on, @pn, @op, @tr)');
            
            await transaction.request()
                .input('sn', sql.NVarChar, sn)
                .input('op', sql.NVarChar, currentOperationId)
                .input('uid', sql.NVarChar, operatorId)
                .query('INSERT INTO SerialHistory (SerialNumber, OperationId, OperatorId) VALUES (@sn, @op, @uid)');
            
            generated.push({ serialNumber: sn });
        }
        await transaction.commit();
        res.json({ success: true, serials: generated });
    } catch (e) {
        await transaction.rollback();
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/serials/batch-update', async (req, res) => {
    const { serials, operationId, operatorId, isComplete } = req.body;
    const transaction = new sql.Transaction(req.db);
    try {
        await transaction.begin();
        for (const sn of serials) {
            await transaction.request()
                .input('sn', sql.NVarChar, sn)
                .input('op', sql.NVarChar, operationId)
                .input('comp', sql.Bit, isComplete ? 1 : 0)
                .query('UPDATE Serials SET CurrentOperationId = @op, IsComplete = @comp WHERE SerialNumber = @sn');
            
            await transaction.request()
                .input('sn', sql.NVarChar, sn)
                .input('op', sql.NVarChar, operationId)
                .input('uid', sql.NVarChar, operatorId)
                .query('INSERT INTO SerialHistory (SerialNumber, OperationId, OperatorId) VALUES (@sn, @op, @uid)');
        }
        await transaction.commit();
        res.json({ success: true });
    } catch (e) {
        await transaction.rollback();
        res.status(500).json({ error: e.message });
    }
});

// Estaciones
app.get('/api/operations', async (req, res) => {
    const result = await req.db.request().query('SELECT o.*, u.Name as ActiveOperatorName FROM Operations o LEFT JOIN Users u ON o.ActiveOperatorId = u.Id');
    res.json(result.recordset.map(op => ({
        id: op.Id, name: op.Name, orderIndex: op.OrderIndex, 
        isInitial: op.IsInitial, isFinal: op.IsFinal, 
        activeOperatorId: op.ActiveOperatorId,
        activeOperatorName: op.ActiveOperatorName
    })));
});

app.post('/api/operations/:id/enter', async (req, res) => {
    const { userId } = req.body;
    await req.db.request()
        .input('op', sql.NVarChar, req.params.id)
        .input('uid', sql.NVarChar, userId)
        .query('UPDATE Operations SET ActiveOperatorId = @uid WHERE Id = @op AND (ActiveOperatorId IS NULL OR ActiveOperatorId = @uid)');
    res.json({ success: true });
});

app.post('/api/operations/:id/exit', async (req, res) => {
    await req.db.request()
        .input('op', sql.NVarChar, req.params.id)
        .query('UPDATE Operations SET ActiveOperatorId = NULL WHERE Id = @op');
    res.json({ success: true });
});

// Rutas
app.get('/api/routes', async (req, res) => {
    const result = await req.db.request().query('SELECT * FROM ProcessRoutes');
    const routes = result.recordset;
    for (let r of routes) {
        const steps = await req.db.request().input('rid', sql.NVarChar, r.Id).query('SELECT * FROM ProcessRouteSteps WHERE ProcessRouteId = @rid ORDER BY StepOrder ASC');
        r.steps = steps.recordset;
    }
    res.json(routes.map(r => ({ id: r.Id, name: r.Name, description: r.Description, steps: r.steps.map(s => ({ id: s.Id, operationId: s.OperationId, stepOrder: s.StepOrder })) })));
});

// Partes
app.get('/api/parts', async (req, res) => {
    const result = await req.db.request().query('SELECT * FROM PartNumbers');
    res.json(result.recordset.map(p => ({ 
        id: p.Id, partNumber: p.PartNumber, revision: p.Revision, description: p.Description, 
        productCode: p.ProductCode, serialMask: p.SerialMask, serialGenType: p.SerialGenType, 
        processRouteId: p.ProcessRouteId, stdQty: p.StdQty || 1 
    })));
});

// Órdenes
app.get('/api/orders', async (req, res) => {
    const result = await req.db.request().query('SELECT * FROM WorkOrders ORDER BY CreatedAt DESC');
    res.json(result.recordset.map(o => ({
        id: o.Id, orderNumber: o.OrderNumber, sapOrderNumber: o.SAPOrderNumber,
        partNumberId: o.PartNumberId, quantity: o.Quantity, status: o.Status,
        createdAt: o.CreatedAt
    })));
});

app.post('/api/orders/generate', async (req, res) => {
    const { sapOrderNumber, productCode, quantity } = req.body;
    // Buscar parte por SKU
    const partRes = await req.db.request().input('sku', sql.NVarChar, productCode).query('SELECT Id FROM PartNumbers WHERE ProductCode = @sku');
    if (partRes.recordset.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    const partId = partRes.recordset[0].Id;
    const orderId = `WO-${Date.now()}`;
    await req.db.request()
        .input('id', sql.NVarChar, orderId)
        .input('on', sql.NVarChar, orderId)
        .input('sap', sql.NVarChar, sapOrderNumber)
        .input('pid', sql.NVarChar, partId)
        .input('qty', sql.Int, quantity)
        .input('st', sql.NVarChar, 'OPEN')
        .query('INSERT INTO WorkOrders (Id, OrderNumber, SAPOrderNumber, PartNumberId, Quantity, Status) VALUES (@id, @on, @sap, @pid, @qty, @st)');
    res.json({ success: true, orderNumber: orderId, orderId });
});

app.listen(PORT, () => { console.log(`MES Backend running on port ${PORT}`); });
