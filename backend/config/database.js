const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vehicle_service_booking',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL connection error:', error.message);
    return false;
  }
}

// Initialize database and tables
async function initializeDatabase() {
  try {
    // Create database if it doesn't exist
    const tempPool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    await tempPool.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await tempPool.end();
    console.log(`Database ${dbConfig.database} ready`);

    // Create tables
    await createTables();
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function createTables() {
  const connection = await pool.getConnection();
  
  try {
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        userId VARCHAR(20) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role ENUM('customer', 'garage', 'admin') NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        contact VARCHAR(20) NOT NULL,
        location VARCHAR(255) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Vehicles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS vehicles (
        vehicleId VARCHAR(20) PRIMARY KEY,
        userId VARCHAR(20) NOT NULL,
        registrationNumber VARCHAR(50) NOT NULL,
        model VARCHAR(255) NOT NULL,
        type ENUM('car', 'bike') NOT NULL,
        lastServiceDate DATE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);

    // Service Centers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS serviceCenters (
        centerId VARCHAR(20) PRIMARY KEY,
        ownerId VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        contact VARCHAR(20) NOT NULL,
        serviceTypes JSON,
        priceList JSON,
        availableSlots JSON,
        approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (ownerId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);
    
    // Add approvalStatus column if it doesn't exist (for existing databases)
    try {
      await connection.execute(`
        ALTER TABLE serviceCenters 
        ADD COLUMN approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
      `);
    } catch (error) {
      // Column already exists, ignore error
      if (!error.message.includes('Duplicate column name')) {
        console.log('Note: approvalStatus column may already exist');
      }
    }

    // Bookings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        bookingId VARCHAR(20) PRIMARY KEY,
        userId VARCHAR(20) NOT NULL,
        vehicleId VARCHAR(20) NOT NULL,
        centerId VARCHAR(20) NOT NULL,
        serviceType VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        timeSlot VARCHAR(10) NOT NULL,
        status ENUM('Pending', 'Confirmed', 'Completed', 'Rejected') DEFAULT 'Pending',
        remarks TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
        FOREIGN KEY (vehicleId) REFERENCES vehicles(vehicleId) ON DELETE CASCADE,
        FOREIGN KEY (centerId) REFERENCES serviceCenters(centerId) ON DELETE CASCADE
      )
    `);

    // Feedback table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        feedbackId VARCHAR(20) PRIMARY KEY,
        bookingId VARCHAR(20) NOT NULL,
        userId VARCHAR(20) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (bookingId) REFERENCES bookings(bookingId) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};

