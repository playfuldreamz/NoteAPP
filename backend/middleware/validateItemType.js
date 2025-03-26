const validateItemType = (req, res, next) => {
  // Safely get itemType from params with fallback
  let itemType = req.params?.itemType || req.params?.type;
  
  // If still undefined, check for type in body as fallback
  if (!itemType && req.body?.type) {
    itemType = req.body.type;
  }

  // If we still don't have a type, return error
  if (!itemType) {
    return res.status(400).json({
      error: 'Item type is required. Must be either "note" or "transcript"'
    });
  }

  // Convert to string if it's a number
  if (typeof itemType === 'number') {
    itemType = itemType.toString();
  }

  // Ensure we have a string type
  if (typeof itemType !== 'string') {
    return res.status(400).json({
      error: 'Invalid item type format. Must be a string'
    });
  }

  // Handle case where type might be prefixed with route path
  if (itemType.includes && itemType.includes('/')) {
    itemType = itemType.split('/').pop();
  }

  // Normalize to lowercase and trim whitespace
  const normalizedType = itemType.toLowerCase().trim();

  // Validate against allowed types
  if (!['note', 'transcript'].includes(normalizedType)) {
    return res.status(400).json({
      error: `Invalid item type: "${itemType}". Must be either "note" or "transcript"`
    });
  }

  // Update params with normalized value
  req.params.itemType = normalizedType;
  req.params.type = normalizedType; // Also set type for compatibility
  next();
};

module.exports = validateItemType;
