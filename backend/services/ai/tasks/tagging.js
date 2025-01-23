/**
 * Handles content tagging tasks
 */
class TaggingTask {
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * Analyze content and suggest relevant tags
   * @param {string} content - The content to analyze
   * @returns {Promise<string[]>}
   */
  async analyze(content) {
    if (!content) {
      throw new Error('Content is required');
    }

    return await this.provider.analyzeTags(content);
  }
}

module.exports = TaggingTask;
