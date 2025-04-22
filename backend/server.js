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
const aiConfigRoutes = require('./routes/ai/config');
const aiTasksRoutes = require('./routes/ai/tasks');
const aiTagsRoutes = require('./routes/ai/tags');
const aiSummaryRoutes = require('./routes/ai/summary');
const aiEmbeddingConfigRoutes = require('./routes/ai/embedding-config');
const actionItemsRoutes = require('./routes/actionItems');
const transcriptsRoutes = require('./routes/transcripts');
const notesRoutes = require('./routes/notes');
const voiceInsightsRoutes = require('./routes/voiceInsights');
const noteInsightsRoutes = require('./routes/noteInsights');
const linksRoutes = require('./routes/links');
const searchRoutes = require('./routes/search');
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  next();
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/ai/config', authenticateToken, aiConfigRoutes);
app.use('/api/ai/tasks', authenticateToken, aiTasksRoutes);
app.use('/api/ai/tags', authenticateToken, aiTagsRoutes);
app.use('/api/ai/summary', authenticateToken, aiSummaryRoutes);
app.use('/api/ai/embedding-config', authenticateToken, aiEmbeddingConfigRoutes);
app.use('/api/action-items', authenticateToken, actionItemsRoutes);
app.use('/api/transcripts', transcriptsRoutes);  // No auth required for token validation
app.use('/api/notes', authenticateToken, notesRoutes);
app.use('/api/voice-insights', authenticateToken, voiceInsightsRoutes);
app.use('/api/note-insights', authenticateToken, noteInsightsRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/search', searchRoutes);

// Initialize database
createTables();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
