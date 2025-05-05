const express = require('express');
const router = express.Router();
const AIProviderFactory = require('../../services/ai/factory');
const AIConfigManager = require('../../services/ai/config');
const TranscriptionTask = require('../../services/ai/tasks/transcription');
const SummarizationTask = require('../../services/ai/tasks/summarization');
const TaggingTask = require('../../services/ai/tasks/tagging');

// Transcription enhancement endpoint
router.post('/enhance-transcription', async (req, res) => {
  const { transcript, language = 'en-US' } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  try {
    const config = await AIConfigManager.getUserConfig(req.user.id);
    const provider = await AIProviderFactory.createProvider(config.provider, config);
    const transcriptionTask = new TranscriptionTask(provider);
    
    const result = await transcriptionTask.enhance(transcript, language);
    res.json(result);
  } catch (error) {
    console.error('Transcription enhancement error:', error);
    
    // Check for API key related errors
    if (error.message?.includes('API Key not found') || 
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('Invalid API key') ||
        error.status === 401 || 
        error.status === 403) {
      return res.status(401).json({ 
        error: 'Invalid or expired API key. Please check your AI provider settings.',
        code: 'INVALID_API_KEY'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to enhance transcription',
      enhanced: transcript,
      confidence: 0,
      original: transcript
    });
  }
});

// Generate title for content
router.post('/summarize', async (req, res) => {
  const { content, isChatTitle } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const config = await AIConfigManager.getUserConfig(req.user.id);
    const provider = await AIProviderFactory.createProvider(config.provider, config);
    const summarizationTask = new SummarizationTask(provider);
    
    // Pass the isChatTitle flag to customize the prompt if it's a chat title
    const title = await summarizationTask.summarize(content, isChatTitle === true);
    res.json({ title });
  } catch (error) {
    console.error('Content summarization error:', error);
    
    // Check for API key related errors
    if (error.message?.includes('API Key not found') || 
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('Invalid API key') ||
        error.status === 401 || 
        error.status === 403) {
      return res.status(401).json({ 
        error: 'Invalid or expired API key. Please check your AI provider settings.',
        code: 'INVALID_API_KEY'
      });
    }
      res.status(500).json({ 
      error: 'Failed to generate title',
      title: content.length > 60 ? content.substring(0, 57) + '...' : content
    });
  }
});

// Analyze content for tags
router.post('/tags/analyze', async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const config = await AIConfigManager.getUserConfig(req.user.id);
    const provider = await AIProviderFactory.createProvider(config.provider, config);
    const taggingTask = new TaggingTask(provider);
    
    const tags = await taggingTask.analyze(content);
    res.json({ tags });
  } catch (error) {
    console.error('Tag analysis error:', error);
    
    // Check for API key related errors
    if (error.message?.includes('API Key not found') || 
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('Invalid API key') ||
        error.status === 401 || 
        error.status === 403) {
      return res.status(401).json({ 
        error: 'Invalid or expired API key. Please check your AI provider settings.',
        code: 'INVALID_API_KEY'
      });
    }
    
    res.status(500).json({ error: 'Failed to analyze tags' });
  }
});

module.exports = router;