require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { getDb } = require('./config/database');
const { runMigrations } = require('./scripts/run_migrations');
const { seedUserRoles } = require('./scripts/seed_userroles');
const { seedUsers } = require('./scripts/seed_users');
const { seedDummyData } = require('./scripts/seed_dummy_data');
const createRoutes = require('./routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

async function startServer() {
  try {
    console.log('Initializing database...');
    const db = getDb();

    console.log('Running migrations...');
    await runMigrations(db);

    console.log('Seeding data...');
    await seedUserRoles(db);
    await seedUsers(db);
    await seedDummyData(db);

    // Mount API routes
    app.use('/api', createRoutes(db));

    // Health check
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

// Export app for testing, start server when run directly
module.exports = app;

if (require.main === module) {
  startServer();
}

module.exports.startServer = startServer;
