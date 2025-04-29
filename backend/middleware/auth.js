const jwt = require('jsonwebtoken');
const { isDspyServiceRequest } = require('../utils/dspyUtils');

// JWT secret key - in production, use an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET);
};

const authenticateToken = (req, res, next) => {
  // Debug info
  console.log(`[AUTH DEBUG] Path: ${req.path}, Method: ${req.method}, IP: ${req.ip}`);
  console.log(`[AUTH DEBUG] Query params: ${JSON.stringify(req.query)}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[AUTH DEBUG] Body keys: ${Object.keys(req.body).join(', ')}`);
  }
  
  // Check if this is a request from the DSPy service
  const isDspyRequest = isDspyServiceRequest(req);
  console.log(`[AUTH DEBUG] Is DSPy service request: ${isDspyRequest}`);
  
  if (isDspyRequest) {
    console.log('DSPy service request detected - bypassing authentication');
    
    // Set user ID from query param or request body for DSPy requests
    const userId = req.query.userId || (req.body ? req.body.userId : null);
    console.log(`[AUTH DEBUG] Setting user ID to: ${userId}`);
    
    // Create a simulated user object
    req.user = { 
      id: userId,
      username: 'dspy-service', 
      isDspyService: true 
    };
    
    return next();
  }
  
  // For normal web requests, require JWT authentication
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateToken, generateToken };
