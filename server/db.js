
import sql from 'mssql';

// Configuración para Azure SQL Database
const sqlConfig = {
  user: 'sqladmin',
  password: 'Xime1603',
  database: 'liondb',
  server: 'mx31dbs04.database.windows.net',
  port: 1433,
  pool: { 
    max: 10, 
    min: 0, 
    idleTimeoutMillis: 30000 
  },
  options: { 
    encrypt: true, 
    trustServerCertificate: true, 
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

const SCHEMA_SCRIPTS = [
    `IF OBJECT_ID('dbo.Users', 'U') IS NULL
    CREATE TABLE Users (Id NVARCHAR(50) PRIMARY KEY, Username NVARCHAR(50) NOT NULL UNIQUE, Role NVARCHAR(20) NOT NULL, Name NVARCHAR(100) NOT NULL, Password NVARCHAR(100) NULL);`,
    
    `IF OBJECT_ID('dbo.Operations', 'U') IS NULL
    CREATE TABLE Operations (Id NVARCHAR(50) PRIMARY KEY, Name NVARCHAR(100) NOT NULL, OrderIndex INT NOT NULL, IsInitial BIT DEFAULT 0, IsFinal BIT DEFAULT 0, ActiveOperatorId NVARCHAR(50) NULL);`,

    `IF OBJECT_ID('dbo.ProcessRoutes', 'U') IS NULL
    CREATE TABLE ProcessRoutes (Id NVARCHAR(50) PRIMARY KEY, Name NVARCHAR(100) NOT NULL, Description NVARCHAR(255));`,

    `IF OBJECT_ID('dbo.ProcessRouteSteps', 'U') IS NULL
    CREATE TABLE ProcessRouteSteps (Id NVARCHAR(50) PRIMARY KEY, ProcessRouteId NVARCHAR(50) NOT NULL, OperationId NVARCHAR(50) NOT NULL, StepOrder INT NOT NULL);`,

    `IF OBJECT_ID('dbo.PartNumbers', 'U') IS NULL
    CREATE TABLE PartNumbers (Id NVARCHAR(50) PRIMARY KEY, PartNumber NVARCHAR(50) NOT NULL, Revision NVARCHAR(10), Description NVARCHAR(255), ProductCode NVARCHAR(50), SerialMask NVARCHAR(50), SerialGenType NVARCHAR(20) DEFAULT 'PCB_SERIAL', ProcessRouteId NVARCHAR(50) NULL, StdQty INT DEFAULT 1);`,

    `IF OBJECT_ID('dbo.WorkOrders', 'U') IS NULL
    CREATE TABLE WorkOrders (Id NVARCHAR(50) PRIMARY KEY, OrderNumber NVARCHAR(50) NOT NULL UNIQUE, SAPOrderNumber NVARCHAR(50) NULL, PartNumberId NVARCHAR(50) NULL, Quantity INT NOT NULL, Status NVARCHAR(20) DEFAULT 'OPEN', CreatedAt DATETIME DEFAULT GETDATE(), Mask NVARCHAR(50));`,

    `IF OBJECT_ID('dbo.Serials', 'U') IS NULL
    CREATE TABLE Serials (SerialNumber NVARCHAR(50) PRIMARY KEY, OrderNumber NVARCHAR(50) NULL, PartNumberId NVARCHAR(50) NULL, CurrentOperationId NVARCHAR(50) NULL, IsComplete BIT DEFAULT 0, TrayId NVARCHAR(50) NULL);`,

    `IF OBJECT_ID('dbo.SerialHistory', 'U') IS NULL
    CREATE TABLE SerialHistory (Id INT IDENTITY(1,1) PRIMARY KEY, SerialNumber NVARCHAR(50) NOT NULL, OperationId NVARCHAR(50) NULL, OperatorId NVARCHAR(50) NULL, Timestamp DATETIME DEFAULT GETDATE());`,
    
    `IF OBJECT_ID('dbo.LabelConfigs', 'U') IS NULL
    CREATE TABLE LabelConfigs (Id NVARCHAR(50) PRIMARY KEY, Sku NVARCHAR(50), LabelName NVARCHAR(100), FormatPath NVARCHAR(255), PrinterName NVARCHAR(100), DefaultQuantity INT DEFAULT 1, LabelType NVARCHAR(20) DEFAULT 'CARTON1');`,

    `IF OBJECT_ID('dbo.LabelFields', 'U') IS NULL
    CREATE TABLE LabelFields (Id INT IDENTITY(1,1) PRIMARY KEY, LabelConfigId NVARCHAR(50) NOT NULL, FieldName NVARCHAR(100), DataSource NVARCHAR(50), StaticValue NVARCHAR(255));`,

    `IF OBJECT_ID('dbo.PrintLogs', 'U') IS NULL
    CREATE TABLE PrintLogs (Id INT IDENTITY(1,1) PRIMARY KEY, SerialNumber NVARCHAR(50), Status NVARCHAR(20), Message NVARCHAR(MAX), Timestamp DATETIME DEFAULT GETDATE(), LabelType NVARCHAR(50) NULL, OperatorId NVARCHAR(50) NULL);`
];

const SEED_QUERIES = [
    `IF NOT EXISTS (SELECT * FROM Users WHERE Username = 'admin') 
     INSERT INTO Users (Id, Username, Role, Name, Password) VALUES ('1', 'admin', 'ADMIN', 'Administrador', 'admin123');`,
    
    `IF NOT EXISTS (SELECT * FROM Operations WHERE Id = 'op_10') 
     INSERT INTO Operations (Id, Name, OrderIndex, IsInitial, IsFinal) VALUES ('op_10', 'ESTACION INICIAL', 10, 1, 0);`,
     
    `IF NOT EXISTS (SELECT * FROM Operations WHERE Id = 'op_40') 
     INSERT INTO Operations (Id, Name, OrderIndex, IsInitial, IsFinal) VALUES ('op_40', 'EMPAQUE FINAL', 40, 0, 1);`
];

export { sql, sqlConfig, SCHEMA_SCRIPTS, SEED_QUERIES };
