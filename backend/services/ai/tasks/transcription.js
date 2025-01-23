/**
 * Handles transcription enhancement tasks
 */
class TranscriptionTask {
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * Enhance a transcript with proper punctuation and corrections
   * @param {string} transcript - The raw transcript text
   * @param {string} language - The language code (e.g., 'en-US')
   * @returns {Promise<{enhanced: string, confidence: number, original: string}>}
   */
  async enhance(transcript, language) {
    if (!transcript) {
      throw new Error('Transcript is required');
    }

    return await this.provider.enhanceTranscription(transcript, language);
  }
}

module.exports = TranscriptionTask;
