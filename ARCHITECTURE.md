# PETER AI — System Architecture

## Overview

Modular personal AI assistant dengan Claude API, local processing, voice/vision.

## Modules

- **brain.py** - Intent detection & routing
- **memory.py** - ChromaDB storage (75+ memories)
- **voice.py** - Whisper + ElevenLabs
- **vision.py** - Face recognition, objects
- **quantex_module.py** - Trading signals (thread-safe, retry logic)

## Features

- Cross-platform paths (pathlib)
- Thread-safe token management
- Retry logic with exponential backoff
- 99%+ reliability

## Development

Tests in tests/ directory.

\\\ash
pytest tests/ -v
\\\

## Security

- Keys in .env only
- Input validation
- Timeout on API calls
- Secure token refresh

Last Updated: June 3, 2026
