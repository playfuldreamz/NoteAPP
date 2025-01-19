import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AudioRecorder from '../components/AudioRecorder';
import { enhanceTranscript } from '../services/ai';

jest.mock('../services/ai', () => ({
  enhanceTranscript: jest.fn(),
}));

const mockSetTranscript = jest.fn();
const mockUpdateTranscripts = jest.fn();

const renderComponent = (transcript = '') => {
  return render(
    <AudioRecorder 
      setTranscript={mockSetTranscript}
      updateTranscripts={mockUpdateTranscripts}
      transcript={transcript}
    />
  );
};

describe('AudioRecorder Enhanced Transcription', () => {
  beforeEach(() => {
    (enhanceTranscript as jest.Mock).mockResolvedValue({
      enhanced: 'Enhanced test transcript',
      confidence: 85,
      original: 'Test transcript'
    });
  });

  it('should render enhanced transcript section', () => {
    renderComponent();
    expect(screen.getByText('Enhanced Transcript')).toBeInTheDocument();
  });

  it('should show enhanced transcript after enhancement', async () => {
    renderComponent('Test transcript');
    fireEvent.click(screen.getByText('Enhance'));
    
    await waitFor(() => {
      expect(screen.getByText('Enhanced test transcript')).toBeInTheDocument();
    });
  });

  it('should show confidence threshold settings', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByText('Confidence Threshold:')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('should save enhanced transcript when enabled', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ title: 'Test Title' }),
      })
    ) as jest.Mock;

    renderComponent('Test transcript');
    fireEvent.click(screen.getByText('Enhance'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/transcripts'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'Enhanced test transcript',
          title: 'Test Title'
        })
      })
    );
  });

  it('should save original transcript when enhancement is disabled', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ title: 'Test Title' }),
      })
    ) as jest.Mock;

    renderComponent('Test transcript');
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.click(screen.getByLabelText('Enable AI Enhancement'));
    fireEvent.click(screen.getByText('Save'));
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/transcripts'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'Test transcript',
          title: 'Test Title'
        })
      })
    );
  });

  it('should show error toast when enhancement fails', async () => {
    (enhanceTranscript as jest.Mock).mockRejectedValue(new Error('Enhancement failed'));
    renderComponent('Test transcript');
    fireEvent.click(screen.getByText('Enhance'));
    
    await waitFor(() => {
      expect(screen.getByText('Failed to enhance transcript')).toBeInTheDocument();
    });
  });
});
