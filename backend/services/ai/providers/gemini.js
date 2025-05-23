const { GoogleGenerativeAI } = require('@google/generative-ai');
const AIProvider = require('./base');

class GeminiProvider extends AIProvider {
  constructor(apiKey) {
    super(apiKey);
    this.client = null;
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.client = new GoogleGenerativeAI(this.apiKey);
  }

  async getModel(options = {}) {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    return this.client.getGenerativeModel({
      model: options.model || "gemini-2.0-flash-exp",
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    });
  }

  async enhanceTranscription(transcript, language) {
    const model = await this.getModel();
    
    // First pass: Basic formatting and punctuation
    const formatPrompt = `Add proper punctuation and capitalization to this transcript without adding any explanations, prefixes, suffixes or options:\n${transcript}`;
    const formatResult = await model.generateContent(formatPrompt);
    
    if (formatResult.response.promptFeedback?.blockReason) {
      throw new Error('Formatting blocked by safety filters');
    }
    
    const formattedText = formatResult.response.text();
    
    // Second pass: Context-aware correction
    const correctPrompt = `Correct any transcription errors in this text while preserving meaning, without adding any explanations, prefixes, suffixes or options:\n${formattedText}`;
    const correctResult = await model.generateContent(correctPrompt);
    
    if (correctResult.response.promptFeedback?.blockReason) {
      throw new Error('Correction blocked by safety filters');
    }
    
    const correctedText = correctResult.response.text();
    
    // Calculate confidence score based on similarity
    const similarity = this.calculateSimilarity(transcript, correctedText);
    const confidence = Math.min(100, Math.max(0, Math.round(similarity * 100)));
    
    return {
      enhanced: correctedText,
      confidence,
      original: transcript
    };
  }
  async summarizeContent(content, isChatTitle = false) {
    const model = await this.getModel();
    
    // Use different prompts for chat titles vs regular content summaries
    const prompt = isChatTitle 
      ? `Generate a concise and informative title (maximum 8 words) for this chat message. The title should capture the essence of what the user is asking or discussing. Return ONLY the title without any punctuation, bullet points, quotes, or additional text:\n${content}`
      : `Generate a concise title (maximum 8 words) for this content. Return ONLY the title without any bullet points, options, explanations, or additional formatting:\n${content}`;
    
    const result = await model.generateContent(prompt);
    if (result.response.promptFeedback?.blockReason) {
      throw new Error('Summary generation blocked by safety filters');
    }
    
    return result.response.text().trim();
  }

  async analyzeTags(content) {
    const model = await this.getModel();
    const prompt = `Generate relevant tags for this content. Return only the tags separated by commas, without any explanations:\n${content}`;
    
    const result = await model.generateContent(prompt);
    if (result.response.promptFeedback?.blockReason) {
      throw new Error('Tag analysis blocked by safety filters');
    }
    
    const tags = result.response.text()
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    return tags;
  }

  calculateSimilarity(original, enhanced) {
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const enhancedWords = new Set(enhanced.toLowerCase().split(/\s+/));
    
    const intersection = new Set(
      [...originalWords].filter(word => enhancedWords.has(word))
    );
    
    const union = new Set([...originalWords, ...enhancedWords]);
    
    return intersection.size / union.size;
  }
}

module.exports = GeminiProvider;
