/**
 * Middleware to validate item type parameter
 * Ensures that type parameter is either 'note' or 'transcript'
 */
const validateItemType = (req, res, next) => {
  const { type } = req.query;
  
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
