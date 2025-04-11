/**
 * Middleware to validate item type parameter
 * Ensures that type parameter is either 'note' or 'transcript'
 * Checks both URL params and query params for flexibility
 */
const validateItemType = (req, res, next) => {
  // Look for type in either URL params or query params
  const type = req.params.type || req.query.type;
  
  if (!type) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required parameter: type' 
    });
  }
  
  if (type !== 'note' && type !== 'transcript') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid type parameter: must be either "note" or "transcript"' 
    });
  }
  
  next();
};

module.exports = validateItemType;
