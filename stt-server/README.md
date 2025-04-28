# RealtimeSTT Server

This is the local Speech-to-Text server component of NoteApp that provides real-time transcription without requiring external API keys.

## Features

- Real-time speech-to-text transcription
- WebSocket-based streaming interface
- No API keys required
- Local processing for privacy
- Supports multiple audio formats
- Low latency response times
- Advanced audio processing with AudioWorklet API
- High-quality audio resampling with linear interpolation
- Off-main-thread audio processing for better performance

## Prerequisites

- Python 3.9 or higher
- Virtual environment tool (venv)
- FFmpeg installed on your system
- 4GB+ RAM recommended

## Installation

1. **Create and activate a virtual environment:**

   ```powershell
   # Navigate to stt-server directory
   cd stt-server

   # Create virtual environment
   python -m venv venv

   # Activate virtual environment (Windows PowerShell)
   .\venv\Scripts\Activate.ps1

   # Activate virtual environment (Linux/macOS)
   # source venv/bin/activate
   ```

2. **Install required packages:**

   ```powershell
   pip install -r requirements.txt
   ```

3. **Environment Configuration:**

   Create a `.env` file in the stt-server directory with these settings:
   ```env
   STT_HOST=localhost
   STT_PORT=8012
   STT_MODEL=base  # or tiny/small/medium/large based on your hardware
   STT_LANGUAGE=en
   STT_COMPUTE_TYPE=int8  # or float16/float32 based on hardware capability
   ```

## Starting the Server

1. **Start the STT server:**

   ```powershell
   python noteapp_stt_server.py
   ```

   The server will:
   - Load the specified model on first run
   - Start WebSocket server on configured port
   - Show initialization progress and status

2. **Verify server is running:**
   - Server should show "WebSocket server started on ws://localhost:8012"
   - Check logs for any initialization errors

## Testing the Server

You can use the included test client to verify the server is working:

```powershell
# In a new terminal (with venv activated)
python test_stt_client.py
```

The test client will:
- Connect to the WebSocket server
- Record audio from your microphone
- Stream it to the server
- Print transcription results in real-time

## Configuration Options

### Model Options
- `tiny`: Fastest, lowest accuracy
- `base`: Good balance of speed/accuracy (recommended)
- `small`: Better accuracy, more RAM usage
- `medium`: High accuracy, higher resource usage
- `large`: Best accuracy, requires 8GB+ RAM

### Compute Types
- `int8`: Fastest, lowest quality
- `float16`: Good balance
- `float32`: Best quality, slowest

## Limitations

Current implementation has some limitations:
- One active transcription at a time
- Shared recorder instance for all connections
- See CONCURRENCY_NOTES.md for details and future improvements

## Troubleshooting

1. **Model Download Issues:**
   - Check internet connection
   - Verify disk space
   - Models are cached in `~/.cache/torch/hub/`

2. **Audio Issues:**
   - Verify microphone permissions
   - Check audio input levels
   - Ensure FFmpeg is installed and in PATH

3. **Performance Issues:**
   - Try a smaller model size
   - Use int8 compute type
   - Close other resource-intensive applications

## Integration with NoteApp

1. Start the STT server
2. In NoteApp, go to Settings → Transcription
3. Select "RealtimeSTT" as your provider
4. Start recording to use local transcription

## License

This server component uses the same license as the main NoteApp project.
