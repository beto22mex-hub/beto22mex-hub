
import sql from 'mssql';

const sqlConfig = {
  user: process.env.DB_USER || 'sqladmin',
  password: process.env.DB_PASSWORD || 'Xime1603@',
  database: 'Liondb',
  server: process.env.DB_SERVER || 'mx31testdbs01.database.windows.net',
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: { 
    encrypt: true, // Obligatorio para Azure SQL
    trustServerCertificate: false, // Recomendado false para servidores con certificados válidos como Azure
    enableArithAbort: true
  }
};

const masterConfig = { ...sqlConfig, database: 'master' };

const SCHEMA_SCRIPTS = [
    `IF OBJECT_ID('dbo.Users', 'U') IS NULL
    CREATE TABLE Users (Id NVARCHAR(50) PRIMARY KEY, Username NVARCHAR(50) NOT NULL UNIQUE, Role NVARCHAR(20) NOT NULL, Name NVARCHAR(100) NOT NULL, Password NVARCHAR(100) NULL);`,
    
    `IF OBJECT_ID('dbo.Operations', 'U') IS NULL
    CREATE TABLE Operations (Id NVARCHAR(50) PRIMARY KEY, Name NVARCHAR(100) NOT NULL, OrderIndex INT NOT NULL, IsInitial BIT DEFAULT 0, IsFinal BIT DEFAULT 0, ActiveOperatorId NVARCHAR(50) NULL);`,

    `IF OBJECT_ID('dbo.ProcessRoutes', 'U') IS NULL
    CREATE TABLE ProcessRoutes (Id NVARCHAR(50) PRIMARY KEY, Name NVARCHAR(100) NOT NULL, Description NVARCHAR(255));`,

    `IF OBJECT_ID('dbo.ProcessRouteSteps', 'U') IS NULL
    CREATE TABLE ProcessRouteSteps (Id NVARCHAR(50) PRIMARY KEY, ProcessRouteId NVARCHAR(50) FOREIGN KEY REFERENCES ProcessRoutes(Id) ON DELETE CASCADE, OperationId NVARCHAR(50) FOREIGN KEY REFERENCES Operations(Id), StepOrder INT NOT NULL);`,

    `IF OBJECT_ID('dbo.PartNumbers', 'U') IS NULL
    CREATE TABLE PartNumbers (Id NVARCHAR(50) PRIMARY KEY, PartNumber NVARCHAR(50) NOT NULL, Revision NVARCHAR(10), Description NVARCHAR(255), ProductCode NVARCHAR(50), SerialMask NVARCHAR(50), SerialGenType NVARCHAR(20) DEFAULT 'PCB_SERIAL', ProcessRouteId NVARCHAR(50) NULL, StdQty INT DEFAULT 1);`,

    `IF OBJECT_ID('dbo.WorkOrders', 'U') IS NULL
    CREATE TABLE WorkOrders (Id NVARCHAR(50) PRIMARY KEY, OrderNumber NVARCHAR(50) NOT NULL UNIQUE, SAPOrderNumber NVARCHAR(50) NULL, PartNumberId NVARCHAR(50) FOREIGN KEY REFERENCES PartNumbers(Id), Quantity INT NOT NULL, Status NVARCHAR(20) CHECK (Status IN ('OPEN', 'CLOSED')), CreatedAt DATETIME DEFAULT GETDATE(), Mask NVARCHAR(50));`,

    `IF OBJECT_ID('dbo.Serials', 'U') IS NULL
    CREATE TABLE Serials (SerialNumber NVARCHAR(50) PRIMARY KEY, OrderNumber NVARCHAR(50) NOT NULL, PartNumberId NVARCHAR(50) FOREIGN KEY REFERENCES PartNumbers(Id), CurrentOperationId NVARCHAR(50) FOREIGN KEY REFERENCES Operations(Id), IsComplete BIT DEFAULT 0, TrayId NVARCHAR(50) NULL);`,

    `IF OBJECT_ID('dbo.SerialHistory', 'U') IS NULL
    CREATE TABLE SerialHistory (Id INT IDENTITY(1,1) PRIMARY KEY, SerialNumber NVARCHAR(50) FOREIGN KEY REFERENCES Serials(SerialNumber) ON DELETE CASCADE, OperationId NVARCHAR(50) FOREIGN KEY REFERENCES Operations(Id), OperatorId NVARCHAR(50) FOREIGN KEY REFERENCES Users(Id), Timestamp DATETIME DEFAULT GETDATE());`,
    
    `IF OBJECT_ID('dbo.LabelConfigs', 'U') IS NULL
    CREATE TABLE LabelConfigs (Id NVARCHAR(50) PRIMARY KEY, Sku NVARCHAR(50), LabelName NVARCHAR(100), FormatPath NVARCHAR(255), PrinterName NVARCHAR(100), DefaultQuantity INT DEFAULT 1, LabelType NVARCHAR(20) DEFAULT 'CARTON1');`,

    `IF OBJECT_ID('dbo.LabelFields', 'U') IS NULL
    CREATE TABLE LabelFields (Id INT IDENTITY(1,1) PRIMARY KEY, LabelConfigId NVARCHAR(50) FOREIGN KEY REFERENCES LabelConfigs(Id) ON DELETE CASCADE, FieldName NVARCHAR(100), DataSource NVARCHAR(50), StaticValue NVARCHAR(255));`
];

const SEED_QUERIES = [
    `IF NOT EXISTS (SELECT * FROM Users) INSERT INTO Users (Id, Username, Role, Name, Password) VALUES ('1', 'admin', 'ADMIN', 'Administrador', 'admin123'), ('2', 'op1', 'OPERATOR', 'Operador 01', NULL);`,
    `IF NOT EXISTS (SELECT * FROM Operations) INSERT INTO Operations (Id, Name, OrderIndex, IsInitial, IsFinal) VALUES ('op_10', 'ESTACION INICIAL', 10, 1, 0), ('op_40', 'EMPAQUE FINAL', 40, 0, 1);`
];

export { sql, sqlConfig, masterConfig, SCHEMA_SCRIPTS, SEED_QUERIES };
