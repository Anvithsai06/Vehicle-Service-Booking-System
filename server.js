const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, testConnection } = require('./backend/config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Initialize MySQL database
(async () => {
  await initializeDatabase();
  await testConnection();
})();

// Routes
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/vehicles', require('./backend/routes/vehicles'));
app.use('/api/centers', require('./backend/routes/serviceCenters'));
app.use('/api/bookings', require('./backend/routes/bookings'));
app.use('/api/feedback', require('./backend/routes/feedback'));
app.use('/api/admin', require('./backend/routes/admin'));

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

