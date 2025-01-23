const OpenAI = require('openai');
const AIProvider = require('./base');

class DeepSeekProvider extends AIProvider {
  constructor(apiKey) {
    super(apiKey);
    this.client = null;
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key is required');
    }
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: this.apiKey
    });
  }

  async enhanceTranscription(transcript, language) {
    if (!this.client) {
      throw new Error('DeepSeek client not initialized');
    }

    const systemPrompt = `You are a professional transcription editor. Your task is to enhance the given transcript by:
1. Adding proper punctuation and capitalization
2. Correcting obvious transcription errors while preserving the original meaning
3. Maintaining the original style and tone
Do not add any explanations or additional content.`;

    const completion = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript }
      ],
      temperature: 0.3
    });

    const enhancedText = completion.choices[0].message.content;
    
    // Calculate confidence score based on similarity
    const similarity = this.calculateSimilarity(transcript, enhancedText);
    const confidence = Math.min(100, Math.max(0, Math.round(similarity * 100)));

    return {
      enhanced: enhancedText,
      confidence,
      original: transcript
    };
  }

  async summarizeContent(content) {
    if (!this.client) {
      throw new Error('DeepSeek client not initialized');
    }

    const completion = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: "Generate a concise title for the given content. Return only the title without any additional text or explanations." 
        },
        { role: "user", content }
      ],
      temperature: 0.3
    });

    return completion.choices[0].message.content.trim();
  }

  async analyzeTags(content) {
    if (!this.client) {
      throw new Error('DeepSeek client not initialized');
    }

    const completion = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: "Generate relevant tags for the given content. Return only the tags separated by commas, without any explanations or additional text." 
        },
        { role: "user", content }
      ],
      temperature: 0.3
    });

    const tags = completion.choices[0].message.content
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
    
    return intersection.size / Math.max(originalWords.size, enhancedWords.size);
  }
}

module.exports = DeepSeekProvider;
