/**
 * Handles content summarization tasks
 */
class SummarizationTask {
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * Generate a title or summary for the given content
   * @param {string} content - The content to summarize
   * @param {boolean} isChatTitle - Whether this is for a chat title (affects prompt)
   * @returns {Promise<string>}
   */
  async summarize(content, isChatTitle = false) {
    if (!content) {
      throw new Error('Content is required');
    }

    return await this.provider.summarizeContent(content, isChatTitle);
  }
}

module.exports = SummarizationTask;
