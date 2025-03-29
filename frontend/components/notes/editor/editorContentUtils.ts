// Utility functions for handling content in the editor

/**
 * Process HTML node to extract clean text content
 * This matches the behavior of NoteSaver component
 */
export const processNodeToText = (node: Node): string => {
  let result = '';
  
  if (node.nodeType === Node.TEXT_NODE) {
    result += node.textContent;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Handle different element types
    if (node.nodeName === 'BR') {
      result += '\n';
    } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
      // For block elements, add a single newline if needed
      if (node.previousSibling && 
          !(node.previousSibling.nodeType === Node.ELEMENT_NODE && 
            (node.previousSibling.nodeName === 'DIV' || node.previousSibling.nodeName === 'P'))) {
        result += '\n';
      }
      
      // Process all child nodes
      for (let i = 0; i < node.childNodes.length; i++) {
        result += processNodeToText(node.childNodes[i]);
      }
      
      // Only add a newline after if it doesn't already end with one
      // and if it has content
      if (result && !result.endsWith('\n') && node.nextSibling) {
        result += '\n';
      }
    } else {
      // For other elements, just process their children
      for (let i = 0; i < node.childNodes.length; i++) {
        result += processNodeToText(node.childNodes[i]);
      }
    }
  }
  
  return result;
};

/**
 * Convert HTML content to clean text
 */
export const htmlToText = (htmlContent: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  let cleanedContent = processNodeToText(tempDiv);
  
  // Normalize newlines - this is critical to match NoteSaver behavior
  // Replace multiple consecutive newlines with a maximum of two
  cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n');
  
  // Trim leading/trailing whitespace
  return cleanedContent.trim();
};

/**
 * Convert plain text to HTML for the editor
 */
export const textToHtml = (text: string): string => {
  return text
    .split('\n')
    .map(line => line.trim() ? `<div>${line}</div>` : '<div><br></div>')
    .join('');
};

// Maximum content size to try if we get a payload too large error
export const MAX_FALLBACK_CONTENT_SIZE = 100 * 1024; // 100KB limit for fallback
