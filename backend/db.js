
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const isLocalMode = () => ['development', 'test'].includes(process.env.NODE_ENV || 'development');

const getInitialAdminPassword = () => {
  if (process.env.INITIAL_ADMIN_PASSWORD) return process.env.INITIAL_ADMIN_PASSWORD;
  if (isLocalMode()) return 'admin123';
  throw new Error('INITIAL_ADMIN_PASSWORD must be set in production and non-local environments.');
};

const registerModels = (instance) => {
  require('./src/models/User')(instance);
  require('./src/models/Room')(instance);
  require('./src/models/GuestEntry')(instance);
  require('./src/models/Payment')(instance);
  require('./src/models/Feedback')(instance);
  require('./src/models/Notification')(instance);
  require('./src/models/AuditLog')(instance);
  require('./src/models/OtpRecord')(instance);
};

const createSequelizeInstance = () => {
  if (process.env.NODE_ENV === 'test' || process.env.DB_DIALECT === 'sqlite') {
    return new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false
    });
  }

  if (process.env.DB_NAME && process.env.DB_USER) {
    return new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
          ssl: process.env.DB_SSL === 'true' ? {
            require: true,
            rejectUnauthorized: false
          } : false
        }
      }
    );
  }

  if (process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    });
  }

  return new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });
};

let activeSequelize = createSequelizeInstance();
registerModels(activeSequelize);

// Proxy ensuring any module accessing sequelize always interacts with the currently active instance
const sequelize = new Proxy({}, {
  get(target, prop) {
    if (prop === 'then') return undefined;
    const val = activeSequelize[prop];
    if (typeof val === 'function') {
      return val.bind(activeSequelize);
    }
    return val;
  },
  set(target, prop, value) {
    activeSequelize[prop] = value;
    return true;
  }
});

const seedDatabase = async (instance) => {
  // Seed Root Admin if no users exist
  const userCount = await instance.models.User.count();
  if (userCount === 0) {
    const salt = await bcrypt.genSalt(10);
    const initialPassword = getInitialAdminPassword();
    const hashedPassword = await bcrypt.hash(initialPassword, salt);
    await instance.models.User.create({
      name: 'ADM-001',
      email: 'admin@university.edu',
      password: hashedPassword,
      role: 'Admin',
      isVerified: true
    });
    console.log('👤 Root Admin (ADM-001) seeded into identity ledger.');
  }

  // Seed Default Rooms (101 - 106) if empty
  const roomCount = await instance.models.Room.count();
  if (roomCount === 0) {
    const defaultRooms = [
      { roomNumber: '101', name: 'Room 101', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
      { roomNumber: '102', name: 'Room 102', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
      { roomNumber: '103', name: 'Room 103', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
      { roomNumber: '104', name: 'Room 104', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
      { roomNumber: '105', name: 'Room 105', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
      { roomNumber: '106', name: 'Room 106', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true }
    ];
    await instance.models.Room.bulkCreate(defaultRooms);
    console.log('🏨 Default Guest House Rooms (101-106) initialized.');
  }
};

const connectDB = async () => {
  try {
    await activeSequelize.authenticate();
    const dialectName = activeSequelize.getDialect();
    console.log(`✅ Database Connected [Engine: ${dialectName.toUpperCase()}].`);

    await activeSequelize.sync({ alter: dialectName !== 'sqlite', force: false });
    console.log('📦 Database Synchronized.');

    await seedDatabase(activeSequelize);
  } catch (error) {
    console.warn(`⚠️ Primary Database Connection Failed (${error.message}).`);

    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Fatal error: Cannot start in production without live PostgreSQL instance.');
      process.exit(1);
    } else {
      console.log('🔄 Switching to In-Memory SQLite Fallback Node for active session...');
      activeSequelize = new Sequelize({
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false
      });
      registerModels(activeSequelize);
      await activeSequelize.sync({ force: true });
      await seedDatabase(activeSequelize);
      console.log('✅ In-Memory Fallback Node active & synchronized.');
    }
  }
};

module.exports = { sequelize, connectDB };
