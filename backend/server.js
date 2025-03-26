// Load environment variables
require('dotenv').config();

const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { authenticateToken, generateToken } = require('./middleware/auth');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database/connection');
const createTables = require('./database/schema');
const authRoutes = require('./routes/auth');

// Initialize AI clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const app = express();

// Import routes
const aiRoutes = require('./routes/ai');
const actionItemsRoutes = require('./routes/actionItems');
const transcriptsRoutes = require('./routes/transcripts');
const notesRoutes = require('./routes/notes');
const PORT = process.env.PORT || 5000;

// JWT secret key - in production, use an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  next();
});


// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/action-items', authenticateToken, actionItemsRoutes);
app.use('/api/transcripts', transcriptsRoutes);  // No auth required for token validation
app.use('/api/notes', authenticateToken, notesRoutes);

// Initialize database
createTables();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
