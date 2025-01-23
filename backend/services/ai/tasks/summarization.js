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
   * @returns {Promise<string>}
   */
  async summarize(content) {
    if (!content) {
      throw new Error('Content is required');
    }

    return await this.provider.summarizeContent(content);
  }
}

module.exports = SummarizationTask;
