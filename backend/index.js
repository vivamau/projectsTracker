require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const { getDb } = require('./config/database');
const { getAuditDb } = require('./config/auditDatabase');
const { runMigrations } = require('./scripts/run_migrations');
const { seedUserRoles } = require('./scripts/seed_userroles');
const { seedUsers } = require('./scripts/seed_users');
const { seedDummyData } = require('./scripts/seed_dummy_data');
const { seedCountries } = require('./scripts/seed_countries');
const createRoutes = require('./routes');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

async function startServer() {
  try {
    console.log('Initializing database...');
    const db = getDb();
    const auditDb = getAuditDb();

    console.log('Running migrations...');
    await runMigrations(db);

    const noData = process.argv.includes('nodata');
    console.log(noData ? 'Seeding minimal data (nodata mode)...' : 'Seeding data...');
    await seedUserRoles(db);
    await seedUsers(db);
    await seedCountries(db);
    if (!noData) {
      await seedDummyData(db);
    }

    app.use('/api', createRoutes(db, auditDb));

    app.get('/world', (req, res) => {
      res.sendFile(path.join(__dirname, 'data', 'world.geojson'));
    });

    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

module.exports = app;

if (require.main === module) {
  startServer();
}

module.exports.startServer = startServer;
