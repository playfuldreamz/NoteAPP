/**
 * Abstract base class for AI providers
 */
class AIProvider {
  constructor(apiKey) {
    if (this.constructor === AIProvider) {
      throw new Error("Abstract class 'AIProvider' cannot be instantiated");
    }
    this.apiKey = apiKey;
  }

  /**
   * Initialize the AI provider with necessary setup
   */
  async initialize() {
    throw new Error("Method 'initialize' must be implemented");
  }

  /**
   * Enhance a transcript with proper punctuation and corrections
   * @param {string} transcript - The raw transcript text
   * @param {string} language - The language code (e.g., 'en-US')
   * @returns {Promise<{enhanced: string, confidence: number, original: string}>}
   */
  async enhanceTranscription(transcript, language) {
    throw new Error("Method 'enhanceTranscription' must be implemented");
  }
  /**
   * Summarize content to generate a title or brief description
   * @param {string} content - The content to summarize
   * @param {boolean} isChatTitle - Whether this is for a chat title (affects prompt)
   * @returns {Promise<string>}
   */
  async summarizeContent(content, isChatTitle = false) {
    throw new Error("Method 'summarizeContent' must be implemented");
  }

  /**
   * Analyze content to suggest relevant tags
   * @param {string} content - The content to analyze
   * @returns {Promise<string[]>}
   */
  async analyzeTags(content) {
    throw new Error("Method 'analyzeTags' must be implemented");
  }
}

module.exports = AIProvider;
