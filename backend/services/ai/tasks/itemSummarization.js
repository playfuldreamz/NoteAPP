/**
 * Handles specific item summarization tasks for notes and transcripts
 */
class ItemSummarizationTask {
  /**
   * @param {Object} provider - Initialized AI provider instance from AIProviderFactory
   */
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * Generate a concise summary from note or transcript content
   * 
   * @param {string} content - The note or transcript content to summarize
   * @returns {Promise<string>} A 2-3 sentence summary of the key points
   * @throws {Error} If content is empty or API call fails
   */
  async generateSummary(content) {
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for summarization');
    }

    try {
      // Create a specific prompt for generating a concise summary
      const prompt = `Generate a concise summary (2-3 sentences) of the following content. 
Focus on the key points and main ideas only. 
Return only the summary text without any additional formatting, introductions, or explanations.

CONTENT TO SUMMARIZE:
${content}`;

      // Call the AI provider to generate the summary using the correct method
      // We'll pass the full prompt as content to the summarizeContent method
      const response = await this.provider.summarizeContent(prompt);
      
      // Clean up response (remove any unnecessary formatting, quotes, etc.)
      const cleanedSummary = this.cleanResponse(response);
      
      return cleanedSummary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

  /**
   * Clean and format the AI response to ensure it contains only the summary text
   * 
   * @param {string} response - The raw AI response
   * @returns {string} Cleaned summary text
   */
  cleanResponse(response) {
    if (!response) return '';
    
    // Remove common AI response prefixes/patterns
    let cleaned = response.trim();
    
    // Remove "Summary:" or similar prefixes if present
    cleaned = cleaned.replace(/^(summary|here is a summary|brief summary|concise summary):?\s*/i, '');
    
    // Remove quotes if the entire response is wrapped in them
    cleaned = cleaned.replace(/^["'](.+)["']$/s, '$1');
    
    return cleaned;
  }
}

module.exports = ItemSummarizationTask;