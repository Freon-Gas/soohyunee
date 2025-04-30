const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes - renamed to whisperService to avoid case conflicts
const whisperRoutes = require('./routes/whisperService.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Use routes
app.use('/api', whisperRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
