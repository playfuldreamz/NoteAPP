class ActionItemsTask {
  constructor(provider) {
    this.provider = provider;
  }

  async extractActionItems(content) {
    const systemPrompt = `
      You are an AI assistant specialized in analyzing text to identify action items, tasks, and todos.
      Your job is to:
      1. Identify explicit and implicit tasks
      2. Suggest reasonable deadlines based on context
      3. Assess priority levels
      4. Provide confidence scores for your extractions
      
      Follow these rules:
      - Look for both explicit markers (TODO, TASK) and implicit tasks (should do, need to)
      - Infer deadlines from context or suggest reasonable ones
      - Assess priority based on urgency words and context
      - Provide confidence scores based on how explicit/clear the task is
      - Include relevant context in metadata
      
      Format your response exactly as follows (keep the JSON structure):
      {
        "actionItems": [
          {
            "content": "the task description",
            "deadline": "YYYY-MM-DD",
            "priority": "high|medium|low",
            "confidence": 0.95,
            "metadata": {
              "contextualClues": ["urgent", "by next week"],
              "originalText": "original text containing the task"
            }
          }
        ]
      }

      Text to analyze:
      ${content}
    `;

    try {
      let response;
      
      if (this.provider.constructor.name === 'GeminiProvider') {
        // Gemini provider
        const model = await this.provider.getModel();
        const result = await model.generateContent(systemPrompt);
        response = result.response.text();
      } else if (this.provider.client?.chat?.completions) {
        // Get the appropriate model based on provider
        let model = "gpt-3.5-turbo";
        if (this.provider.constructor.name === 'DeepSeekProvider') {
          model = "deepseek-chat";
        }

        const completion = await this.provider.client.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: content }
          ],
          temperature: 0.3
        });
        response = completion.choices[0].message.content;
      } else {
        throw new Error('Unsupported AI provider');
      }

      // Try to parse the response as JSON, handle potential string formatting issues
      let parsedResponse;
      try {
        // First, try direct parsing
        parsedResponse = JSON.parse(response);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedResponse = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Failed to parse extracted JSON:', e);
            throw new Error('Invalid response format from AI provider');
          }
        } else {
          console.error('No JSON found in response');
          throw new Error('Invalid response format from AI provider');
        }
      }

      // Validate the response structure
      if (!parsedResponse?.actionItems || !Array.isArray(parsedResponse.actionItems)) {
        throw new Error('Invalid response format from AI provider');
      }

      // Normalize the response
      parsedResponse.actionItems = parsedResponse.actionItems.map(item => ({
        content: item.content || '',
        deadline: item.deadline || null,
        priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
        metadata: {
          contextualClues: Array.isArray(item.metadata?.contextualClues) ? item.metadata.contextualClues : [],
          originalText: item.metadata?.originalText || item.content || ''
        }
      }));

      return parsedResponse;
    } catch (error) {
      console.error('Error in action items extraction:', error);
      throw error;
    }
  }
}

module.exports = ActionItemsTask;
