# Concurrency Limitations & Future Extensibility

## Current Implementation

The server uses a single shared `AudioToTextRecorder` instance for all WebSocket connections. While the server can accept multiple clients, they all feed audio into this one recorder. As a result:

- Only one active transcription can be processed at a time.
- Simultaneous audio streams lead to mixed buffers and interleaved results.

## Future Improvement Options

1. **Recorder Pooling**  
   Maintain a pool of recorder instances (e.g., one per client or session).  
   • Map each WebSocket connection to its own recorder.  
   • Reclaim idle recorders to manage resources.

2. **Process-Based Workers**  
   Spawn dedicated worker processes (via `multiprocessing` or external services) for each connection.  
   • Provides isolation and fault containment.  
   • Leverages multiple CPU cores for parallel transcription.

3. **Tagged Streams in RealtimeSTT**  
   Extend the RealtimeSTT library to support tagging multiple audio streams within a single instance.  
   • Associate each chunk or callback with a unique client tag.  
   • Routes transcription updates back to the correct WebSocket.

## Additional Notes

- Callbacks in `noteapp_stt_server.py` are defined per connection to close over the client’s WebSocket.  
- Review and clean up recorder instances when clients disconnect to prevent memory leaks.  
- Consider a distributed or queue-based architecture for large-scale concurrency.
