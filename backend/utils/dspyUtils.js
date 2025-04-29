/**
 * Utility functions for DSPy service integration
 */

/**
 * Validates if a request is coming from the local DSPy service
 * This is a simplified development approach - in production, use proper API keys
 * 
 * @param {Object} req - Express request object
 * @returns {Boolean} True if the request appears to be from the DSPy service
 */
const isDspyServiceRequest = (req) => {
  // In production, you would use a more secure authentication mechanism
  // This is a simplified approach for local development
  
  // Check if request is from localhost
  const isLocalRequest = 
    req.ip === '::1' || 
    req.ip === '127.0.0.1' ||
    req.ip.includes('::ffff:127.0.0.1') ||
    req.ip.includes('::ffff:172.'); // For Docker container requests
  
  // Check if userId is provided in query or body
  const hasUserIdInQuery = req.query && req.query.userId;
  const hasUserIdInBody = req.body && req.body.userId;
  const hasUserId = hasUserIdInQuery || hasUserIdInBody;
  
  // Detailed debugging
  console.log(`[DSPY AUTH] Request details:`);
  console.log(`[DSPY AUTH] Path: ${req.path}, Method: ${req.method}`);
  console.log(`[DSPY AUTH] IP address: ${req.ip}`);
  console.log(`[DSPY AUTH] isLocalRequest: ${isLocalRequest}`);
  console.log(`[DSPY AUTH] hasUserIdInQuery: ${hasUserIdInQuery}, value: ${req.query?.userId}`);
  console.log(`[DSPY AUTH] hasUserIdInBody: ${hasUserIdInBody}, value: ${req.body?.userId}`);
  console.log(`[DSPY AUTH] Overall result: ${isLocalRequest && hasUserId}`);
  
  if (req.headers['user-agent']) {
    console.log(`[DSPY AUTH] User-Agent: ${req.headers['user-agent'].substring(0, 50)}...`);
  }
  
  return isLocalRequest && hasUserId;
};

module.exports = {
  isDspyServiceRequest
};
