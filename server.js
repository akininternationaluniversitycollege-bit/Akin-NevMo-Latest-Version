require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mtnRoutes = require('./routes/mtn');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend if you have one

// Routes
app.use('/api', mtnRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Akin NevMo Backend is running!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Akin NevMo Backend running on http://localhost:${PORT}`);
});
