import asyncio
import websockets
import json
import os
import logging
import signal
import threading
from dotenv import load_dotenv
import numpy as np
from scipy.signal import resample
from RealtimeSTT import AudioToTextRecorder
import inspect

# (Keep existing logging setup and global variables)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
config = {}
recorder_instance = None

# (Keep load_config and initialize_recorder functions as they are)
# --- Configuration Loading ---
def load_config():
    """Loads configuration from .env file and environment variables."""
    logger.info("Loading configuration...")
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)
        logger.info(f"Loaded configuration from {dotenv_path}")
    else:
        logger.warning(f".env file not found at {dotenv_path}, using defaults and environment variables.")

    global config
    config = {
        # Server settings
        'host': os.environ.get('STT_HOST', 'localhost'),
        'port': int(os.environ.get('STT_PORT', 8012)),

        # Core Recorder settings
        'model': os.environ.get('MODEL_SIZE', 'tiny.en'),
        'realtime_model_type': os.environ.get('REALTIME_MODEL_SIZE', 'tiny.en'),
        'language': os.environ.get('LANGUAGE', 'en') or None,
        'device': os.environ.get('DEVICE_TYPE', 'cpu'),
        'compute_type': os.environ.get('COMPUTE_TYPE', 'int8'),
        'gpu_device_index': os.environ.get('GPU_DEVICE_INDEX', 0),

        # VAD settings
        'silero_sensitivity': float(os.environ.get('SILERO_SENSITIVITY', 0.4)),
        'webrtc_sensitivity': int(os.environ.get('WEBRTC_SENSITIVITY', 3)),
        'post_speech_silence_duration': float(os.environ.get('POST_SPEECH_SILENCE_DURATION', 0.7)),

        # Optional Advanced settings
        'beam_size': int(os.environ.get('BEAM_SIZE', 5)),
        'realtime_beam_size': int(os.environ.get('REALTIME_BEAM_SIZE', 3)),
        'initial_prompt': os.environ.get('INITIAL_PROMPT') or None,
        'realtime_initial_prompt': os.environ.get('REALTIME_INITIAL_PROMPT') or None,
        'min_length_of_recording': float(os.environ.get('MIN_LENGTH_OF_RECORDING', 0.5)),
        'min_gap_between_recordings': float(os.environ.get('MIN_GAP_BETWEEN_RECORDINGS', 0.1)),
        'wake_words': os.environ.get('WAKE_WORDS', ''),
        'wake_words_sensitivity': float(os.environ.get('WAKEWORD_SENSITIVITY', 0.5)),
    }

    # Configure logging level
    log_level_str = os.environ.get('LOG_LEVEL', 'INFO').upper()
    log_level = getattr(logging, log_level_str, logging.INFO)
    logging.getLogger().setLevel(log_level) # Set root logger level
    logger.setLevel(log_level)
    for handler in logging.getLogger().handlers:
         handler.setLevel(log_level)

    logger.info(f"Configuration loaded: Host={config['host']}, Port={config['port']}, Model={config['model']}, Device={config['device']}")
    # Use json.dumps for cleaner debug output of the potentially complex config dict
    logger.debug(f"Full configuration: {json.dumps(config, indent=2)}")


# --- Recorder Initialization ---
def initialize_recorder():
    """Initializes the RealtimeSTT recorder instance using loaded configuration."""
    global recorder_instance, config
    logger.info("Initializing RealtimeSTT recorder...")

    if not config:
        logger.error("Configuration not loaded. Cannot initialize recorder.")
        return False

    try:
        recorder_config_dict = {
            'model': config['model'],
            'language': config['language'],
            'compute_type': config['compute_type'],
            'device': config['device'],
            'gpu_device_index': config['gpu_device_index'],
            'realtime_model_type': config['realtime_model_type'],
            'silero_sensitivity': config['silero_sensitivity'],
            'webrtc_sensitivity': config['webrtc_sensitivity'],
            'post_speech_silence_duration': config['post_speech_silence_duration'],
            'enable_realtime_transcription': True,
            'realtime_processing_pause': 0.05,
            'use_microphone': False, # CRITICAL
            'spinner': False,
            'level': logger.level,
            'beam_size': config['beam_size'],
            'beam_size_realtime': config['realtime_beam_size'],
            'initial_prompt': config['initial_prompt'],
            'initial_prompt_realtime': config['realtime_initial_prompt'],
            'min_length_of_recording': config['min_length_of_recording'],
            'min_gap_between_recordings': config['min_gap_between_recordings'],
            'wake_words': config['wake_words'],
            'wake_words_sensitivity': config['wake_words_sensitivity'],
            'no_log_file': True,
        }

        logger.debug(f"Initializing recorder with config: {recorder_config_dict}")
        recorder_instance = AudioToTextRecorder(**recorder_config_dict)
        logger.info("RealtimeSTT recorder initialized successfully.")
        logger.info(f"--> Using transcription model: {recorder_config_dict['model']}")
        logger.info(f"--> Using realtime model: {recorder_config_dict['realtime_model_type']}")
        logger.info(f"--> Running on device: {recorder_config_dict['device']} ({recorder_config_dict['compute_type']})")
        return True

    except Exception as e:
        logger.error(f"Failed to initialize RealtimeSTT recorder: {e}", exc_info=True)
        recorder_instance = None
        return False

# --- WebSocket Handler ---
async def websocket_handler(websocket, path=None):
    """Handles incoming WebSocket connections, processes audio data, and sends transcription results."""
    client_addr = websocket.remote_address
    path_info = path if path else "default"
    logger.info(f"Client connected: {client_addr} on path {path_info}")
    
    if recorder_instance is None:
        logger.error("Recorder not initialized. Closing connection.")
        await websocket.close(code=1011, reason="Server recorder not ready")
        return

    is_client_recording_active = False # Flag to track if we called start() for this client

    # --- Define Callbacks within handler scope ---
    async def send_result(result_type: str, text: str):
        """Helper to format and send results to this specific client."""
        try:
            message = json.dumps({"type": result_type, "text": text})
            # **** Log the message being sent ****
            logger.info(f"Sending {result_type} to {client_addr}: {text[:80]}...")
            await websocket.send(message)
            logger.debug(f"Sent {result_type} to {client_addr}: {text[:80]}...")
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"Attempted to send to closed connection {client_addr}")
        except Exception as e:
            logger.error(f"Error sending {result_type} to {client_addr}: {e}")

    # Store the main event loop outside the callback to avoid "no current event loop" errors
    main_loop = asyncio.get_event_loop()
    
    def on_realtime_update_callback(text: str):
        """Callback for real-time transcription updates."""
        logger.info(f"TRANSCRIPTION: {text}")
        
        # Skip sending empty transcriptions
        if not text or text.strip() == "":
            return
            
        try:
            # Directly use the stored main_loop instead of trying to get a new one
            future = asyncio.run_coroutine_threadsafe(
                send_result("realtime", text),
                main_loop
            )
            
            # Wait for the result to ensure delivery
            future.result(timeout=2.0)
            logger.debug(f"Successfully sent transcription to client")
        except Exception as e:
            logger.error(f"Failed to send transcription: {e}")

    # --- Assign Callbacks ---
    # WARNING: Assigning to global instance per connection - see CONCURRENCY_NOTES.md
    # This assignment should ideally happen once or be managed per client if concurrency is added.
    # For now, we assign it here, accepting the single-user limitation.
    recorder_instance.on_realtime_transcription_update = on_realtime_update_callback
    logger.debug(f"Assigned realtime callback for {client_addr}")

    # --- Main Message Loop ---
    try:
        async for message in websocket:
            if isinstance(message, bytes):
                # **** START RECORDER ON FIRST AUDIO CHUNK ****
                if not is_client_recording_active:
                    try:
                        logger.info(f"First audio chunk received from {client_addr}. Starting recorder...")
                        recorder_instance.start() # Tell the recorder to start processing its buffer
                        is_client_recording_active = True
                        logger.info(f"Recorder started for {client_addr}.")
                    except Exception as start_err:
                        logger.error(f"Error starting recorder for {client_addr}: {start_err}", exc_info=True)
                        await websocket.close(code=1011, reason="Server recorder start error")
                        return # Stop handling this connection

                # Process the audio chunk
                try:
                    if len(message) < 4:
                        logger.warning(f"Received short binary message from {client_addr}, skipping.")
                        continue
                    metadata_length = int.from_bytes(message[:4], byteorder='little')
                    if len(message) < 4 + metadata_length:
                        logger.warning(f"Received incomplete message from {client_addr}, skipping.")
                        continue

                    metadata_json = message[4:4+metadata_length].decode('utf-8')
                    metadata = json.loads(metadata_json)
                    sample_rate = metadata.get('sampleRate', 16000)
                    audio_chunk_bytes = message[4+metadata_length:]

                    logger.debug(f"Received audio chunk from {client_addr}: {len(audio_chunk_bytes)} bytes, Sample Rate: {sample_rate}")

                    if not audio_chunk_bytes:
                        logger.debug(f"Received empty audio chunk from {client_addr}, skipping feed.")
                        continue

                    audio_np = np.frombuffer(audio_chunk_bytes, dtype=np.int16)

                    if sample_rate != 16000:
                        # (Resampling logic - keep as is)
                        logger.debug(f"Resampling audio from {sample_rate} Hz to 16000 Hz")
                        num_original_samples = len(audio_np)
                        if num_original_samples == 0: continue
                        num_target_samples = int(num_original_samples * 16000 / sample_rate)
                        if num_target_samples == 0: continue
                        resampled_audio_np = resample(audio_np, num_target_samples)
                        audio_to_feed = resampled_audio_np.astype(np.int16).tobytes()
                    else:
                        audio_to_feed = audio_chunk_bytes

                    if audio_to_feed:
                        # **** Log before feeding ****
                        logger.debug(f"Feeding {len(audio_to_feed)} bytes to recorder for {client_addr}")
                        recorder_instance.feed_audio(audio_to_feed)
                    else:
                        logger.debug("Audio chunk became empty after processing/resampling, not feeding.")

                # (Keep existing error handling for audio processing)
                except json.JSONDecodeError: logger.error(f"Failed to decode metadata JSON from {client_addr}")
                except ValueError as ve: logger.error(f"Value error processing audio chunk from {client_addr}: {ve}")
                except Exception as e: logger.error(f"Error processing audio chunk from {client_addr}: {e}", exc_info=True)

            # (Keep handling for non-binary messages)
            elif isinstance(message, str): logger.warning(f"Received text message from {client_addr}: {message}")
            else: logger.warning(f"Received unexpected message type from {client_addr}: {type(message)}")

    # --- Connection Closed Handling ---
    except websockets.exceptions.ConnectionClosedOK: logger.info(f"Client {client_addr} disconnected normally.")
    except websockets.exceptions.ConnectionClosedError as e: logger.warning(f"Client {client_addr} disconnected with error: {e}")
    except Exception as e: logger.error(f"Unexpected error in WebSocket handler for {client_addr}: {e}", exc_info=True)
    finally:
        logger.info(f"Cleaning up connection for {client_addr}")
        # **** STOP RECORDER WHEN CLIENT DISCONNECTS ****
        if is_client_recording_active:
            try:
                logger.info(f"Client {client_addr} disconnected. Stopping recorder...")
                recorder_instance.stop()
                logger.info(f"Recorder stopped for {client_addr}.")
            except Exception as stop_err:
                logger.error(f"Error stopping recorder for {client_addr}: {stop_err}", exc_info=True)

        # Reset callbacks (imperfect with shared instance, but good practice)
        if recorder_instance and recorder_instance.on_realtime_transcription_update == on_realtime_update_callback:
            recorder_instance.on_realtime_transcription_update = None
            logger.debug(f"Reset recorder callbacks for connection {client_addr}")


# --- Main Application Logic ---
async def main():
    """Loads config, initializes recorder, and starts the WebSocket server."""
    load_config()
    if not initialize_recorder():
        logger.error("Exiting due to recorder initialization failure.")
        return

    host = config.get('host', 'localhost')
    port = config.get('port', 8012)

    logger.info(f"Attempting to start WebSocket server on ws://{host}:{port}")

    try:
        handler_signature = inspect.signature(websocket_handler)
        logger.info(f"DEBUG: Signature of websocket_handler being passed: {handler_signature}")
        print(f"DEBUG: Handler Signature: {handler_signature}") # Also print directly
    except Exception as e:
        logger.error(f"DEBUG: Could not inspect websocket_handler signature: {e}")

    stop_signal = asyncio.Future()
    loop = asyncio.get_running_loop()
    try:
        loop.add_signal_handler(signal.SIGINT, lambda: stop_signal.set_result(None))
        loop.add_signal_handler(signal.SIGTERM, lambda: stop_signal.set_result(None))
    except NotImplementedError:
        logger.warning("Signal handlers not available on this platform.")

    server_instance = None # Keep track of the server instance
    try:
        handler_func = websocket_handler # Assign to a variable first
        logger.info(f"DEBUG: Passing handler type: {type(handler_func)}") # Add another check
        server_instance = await websockets.serve(handler_func, host, port)

        logger.info("WebSocket server started successfully.")
        await stop_signal
    except OSError as e:
         logger.error(f"Failed to start WebSocket server on {host}:{port}. Error: {e}")
    except Exception as e:
         logger.error(f"An unexpected error occurred during server execution: {e}", exc_info=True)
    finally:
        logger.info("Initiating server shutdown sequence...")
        if server_instance:
            server_instance.close()
            await server_instance.wait_closed()
            logger.info("WebSocket server stopped.")

        if recorder_instance:
            logger.info("Shutting down RealtimeSTT recorder...")
            try:
                recorder_instance.shutdown()
                logger.info("RealtimeSTT recorder shut down successfully.")
            except Exception as e:
                logger.error(f"Error during recorder shutdown: {e}", exc_info=True)
        else:
            logger.info("Recorder was not initialized, skipping shutdown.")


# --- Main Execution Block ---
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user (KeyboardInterrupt).")
    finally:
        logger.info("Server shutdown process complete.")