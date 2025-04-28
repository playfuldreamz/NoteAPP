import asyncio
import websockets
import pyaudio
import threading
import json
import time
import logging
import struct

# --- Configuration ---
SERVER_URI = "ws://localhost:8012"  # Ensure this matches your server's host/port
CHUNK = 1024
FORMAT = pyaudio.paInt16  # 16-bit PCM
CHANNELS = 1
RATE = 16000  # Sample rate expected by RealtimeSTT VAD and models
INPUT_DEVICE_INDEX = None  # None for default microphone

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Shared State ---
audio_queue = asyncio.Queue()
stop_audio_thread = threading.Event()

# --- Audio Input Thread ---
def audio_input_thread(main_loop):
    """Reads audio from microphone and puts chunks into the asyncio queue."""
    p = pyaudio.PyAudio()
    stream = None
    try:
        stream = p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK,
            input_device_index=INPUT_DEVICE_INDEX
        )
        logger.info("Microphone stream opened. Recording...")

        while not stop_audio_thread.is_set():
            try:
                data = stream.read(CHUNK, exception_on_overflow=False)
                # Put data into the asyncio queue from the thread
                asyncio.run_coroutine_threadsafe(audio_queue.put(data), main_loop)
            except IOError as e:
                if e.errno == pyaudio.paInputOverflowed:
                    logger.warning("Input overflowed. Frame dropped.")
                else:
                    logger.error(f"PyAudio IOError: {e}")
                    break
            except Exception as e:
                logger.error(f"Error reading audio stream: {e}")
                break

    except Exception as e:
        logger.error(f"Error opening microphone stream: {e}")
    finally:
        if stream:
            stream.stop_stream()
            stream.close()
            logger.info("Microphone stream closed.")
        p.terminate()
        logger.info("PyAudio terminated.")
        # Signal end of audio by putting None in the queue
        asyncio.run_coroutine_threadsafe(audio_queue.put(None), main_loop)

# --- WebSocket Client Logic ---
async def run_client():
    """Connects to the server, sends audio, and receives transcriptions."""
    logger.info(f"Attempting to connect to WebSocket server at {SERVER_URI}...")
    # --- GET MAIN LOOP ---
    loop = asyncio.get_running_loop() # Get the loop here
    # ---------------------
    try:
        async with websockets.connect(SERVER_URI) as websocket:
            logger.info("WebSocket connection established.")

            # Start the audio input thread
            audio_thread = threading.Thread(target=audio_input_thread, args=(loop,), daemon=True)
            audio_thread.start()

            # --- Concurrent Tasks: Sending Audio and Receiving Results ---
            sender_task = asyncio.create_task(send_audio(websocket))
            receiver_task = asyncio.create_task(receive_results(websocket))

            # Wait for either task to complete (or be cancelled)
            done, pending = await asyncio.wait(
                [sender_task, receiver_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            # Cancel pending tasks if one finishes/errors
            for task in pending:
                task.cancel()

    except websockets.exceptions.ConnectionClosedOK:
        logger.info("Server closed the connection normally.")
    except websockets.exceptions.ConnectionClosedError as e:
        logger.error(f"Server connection closed with error: {e}")
    except ConnectionRefusedError:
        logger.error(f"Connection refused. Is the server running at {SERVER_URI}?")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}", exc_info=True)
    finally:
        logger.info("Stopping audio thread...")
        stop_audio_thread.set()
        if 'audio_thread' in locals() and audio_thread.is_alive():
            audio_thread.join(timeout=2)
        logger.info("Client shutdown complete.")

async def send_audio(websocket):
    """Gets audio chunks from the queue and sends them to the server."""
    logger.info("Audio sender task started.")
    try:
        while True:
            chunk = await audio_queue.get()
            if chunk is None:  # End signal
                logger.info("End signal received, stopping audio sender.")
                break

            try:
                metadata = {"sampleRate": RATE}
                metadata_json = json.dumps(metadata)
                metadata_bytes = metadata_json.encode('utf-8')
                metadata_length_bytes = struct.pack('<I', len(metadata_bytes))

                message = metadata_length_bytes + metadata_bytes + chunk
                # Remove noisy logging
                # print(f"[CLIENT] Sending audio chunk: {len(chunk)} bytes")
                logger.debug(f"Sending audio chunk: {len(chunk)} bytes")
                await websocket.send(message)
                logger.debug(f"Sent audio chunk: {len(chunk)} bytes")
            except websockets.exceptions.ConnectionClosed:
                logger.warning("Cannot send audio, connection closed.")
                break
            except Exception as e:
                logger.error(f"Error sending audio: {e}")
                break
            await asyncio.sleep(0.01)
    except asyncio.CancelledError:
        logger.info("Audio sender task cancelled.")
    finally:
        logger.info("Audio sender task finished.")

async def receive_results(websocket):
    """Receives and prints transcription results from the server."""
    logger.info("Result receiver task started.")
    print("=== TRANSCRIPTION WILL APPEAR BELOW ===", flush=True)
    try:
        async for message in websocket:
            # Log the raw message to help debug
            logger.debug(f"Raw message received: {message[:100]}")
            print(f"Message received from server", flush=True)
            try:
                data = json.loads(message)
                if data.get("type") == "realtime":
                    # Display transcription prominently with clear formatting
                    transcription_text = data.get('text', '')
                    print(f"\n>>>>> TRANSCRIPTION: {transcription_text}", flush=True)
                    logger.info(f"Received transcription: {transcription_text}")
                else:
                    logger.warning(f"Received unknown message type: {data.get('type')}")
            except json.JSONDecodeError:
                logger.error(f"Received non-JSON message: {message}")
            except Exception as e:
                logger.error(f"Error processing received message: {e}")
    except websockets.exceptions.ConnectionClosedOK:
        logger.info("Receiver task: Connection closed normally.")
    except websockets.exceptions.ConnectionClosedError as e:
        logger.error(f"Receiver task: Connection closed with error: {e}")
    except asyncio.CancelledError:
        logger.info("Result receiver task cancelled.")
    finally:
        print()
        logger.info("Result receiver task finished.")

# --- Main Execution ---
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(run_client())
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received, shutting down client.")
        stop_audio_thread.set()
        loop.run_until_complete(asyncio.sleep(0.1))
    finally:
        if loop.is_running():
            loop.stop()
        tasks = asyncio.all_tasks(loop=loop)
        for task in tasks:
            task.cancel()
        loop.run_until_complete(asyncio.gather(*tasks, return_exceptions=True))
        loop.close()
        logger.info("Asyncio loop closed.")
