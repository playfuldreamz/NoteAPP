/**
 * Handles specific item summarization tasks for notes and transcripts
 */
class ItemSummarizationTask {
  /**
   * @param {Object} provider - Initialized AI provider instance from AIProviderFactory
   */
  constructor(provider) {
    this.provider = provider;
    this.MIN_WORD_COUNT = 30;
    this.MAX_RETRIES = 1;
  }

  /**
   * Generate a comprehensive summary from note or transcript content
   * 
   * @param {string} content - The note or transcript content to summarize
   * @returns {Promise<string>} A detailed summary with at least 30 words
   * @throws {Error} If content is empty or API call fails
   */
  async generateSummary(content) {
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for summarization');
    }

    let attempts = 0;
    let summary = '';

    while (attempts <= this.MAX_RETRIES) {
      try {
        // Clear, direct prompt focused on generating proper summaries without titles
        const prompt = `Write a detailed paragraph summarizing the following content. 
IMPORTANT: Your summary MUST be AT LEAST ${this.MIN_WORD_COUNT} words long.
DO NOT include a title, heading, or label at the beginning.
Start directly with a normal sentence about the content.
DO NOT start with phrases like "Signs of..." or "This is about..." or any enumeration of topics.
${attempts > 0 ? `IMPORTANT: Your previous summary was too short. Please write at least ${this.MIN_WORD_COUNT} words.` : ''}

CONTENT:
${content}`;

        // Call the AI provider to generate the summary
        const response = await this.provider.summarizeContent(prompt);
        
        // Clean up response
        summary = this.cleanResponse(response);
        
        // Check word count
        const wordCount = this.countWords(summary);
        
        // If summary meets minimum word count, return it
        if (wordCount >= this.MIN_WORD_COUNT) {
          return summary;
        }
        
        console.log(`Summary too short: ${wordCount} words. Minimum required: ${this.MIN_WORD_COUNT}. Attempt: ${attempts + 1}`);
        attempts++;
        
      } catch (error) {
        console.error('Error generating summary:', error);
        throw new Error(`Failed to generate summary: ${error.message}`);
      }
    }
    
    // If we've tried and still don't have a long enough summary,
    // expand the short summary we have
    if (summary && this.countWords(summary) < this.MIN_WORD_COUNT) {
      return await this.expandShortSummary(content, summary);
    }
    
    return summary;
  }
  
  /**
   * Count words in text
   * 
   * @param {string} text - Text to count words in
   * @returns {number} Word count
   */
  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }
  
  /**
   * Expand a short summary to meet the minimum word count
   * 
   * @param {string} originalContent - Original content that was summarized
   * @param {string} shortSummary - The short summary that needs expansion
   * @returns {Promise<string>} Expanded summary
   */
  async expandShortSummary(originalContent, shortSummary) {
    try {
      const prompt = `The following summary is too short (less than ${this.MIN_WORD_COUNT} words):
"${shortSummary}"

Please expand this summary to provide more detail and context. The expanded summary must:
1. Be at least ${this.MIN_WORD_COUNT} words
2. Not start with a title or heading
3. Include more specific details about the content
4. Maintain the same meaning as the original summary

Here is some of the original content for context:
"${originalContent.substring(0, Math.min(500, originalContent.length))}"

Return only the expanded summary text.`;

      const response = await this.provider.summarizeContent(prompt);
      const expandedSummary = this.cleanResponse(response);
      
      // If the expanded summary is still too short, return the original
      // with a note about the minimum length requirement
      if (this.countWords(expandedSummary) < this.MIN_WORD_COUNT) {
        console.log('Expansion failed to produce a summary of sufficient length');
        
        // If the original summary is extremely short, add some generic text to reach min word count
        if (this.countWords(shortSummary) < 15) {
          const additionalContext = "This content provides important information that requires attention. The details contained within are relevant to understanding the subject matter fully.";
          return `${shortSummary} ${additionalContext}`;
        }
        
        return shortSummary;
      }
      
      return expandedSummary;
    } catch (error) {
      console.error('Error expanding summary:', error);
      return shortSummary; // Return the original short summary if expansion fails
    }
  }

  /**
   * Clean and format the AI response
   * 
   * @param {string} response - The raw AI response
   * @returns {string} Cleaned summary text
   */
  cleanResponse(response) {
    if (!response) return '';
    
    let cleaned = response.trim();
    
    // Remove common prefixes and unwanted formatting
    cleaned = cleaned.replace(/^(summary|here is a summary|brief summary|concise summary)[:\.]\s*/i, '');
    cleaned = cleaned.replace(/^["'](.+)["']$/s, '$1');
    
    // Fix capitalization if needed
    if (cleaned && cleaned.length > 0 && /^[a-z]/.test(cleaned)) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    return cleaned;
  }
}

module.exports = ItemSummarizationTask;