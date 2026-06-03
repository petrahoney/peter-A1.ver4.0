"""
config.py (IMPROVED v2.1)
PETER AI Configuration — Cross-platform, Robust, DRY

Key improvements:
- Removed hardcoded Windows paths (use pathlib)
- Single source of truth for all settings
- Better validation with detailed error messages
- Environment variable overrides supported
"""

from dotenv import load_dotenv
from pathlib import Path
import os
import sys

load_dotenv()

# ==================== IDENTITAS ====================
AI_NAME   = os.getenv("AI_NAME", "PETER")
USER_NAME = os.getenv("USER_NAME", "Sir")
WAKE_WORD = os.getenv("WAKE_WORD", "peter")

# ==================== MODE ====================
LOCAL_MODE = os.getenv("LOCAL_MODE", "false").lower() == "true"

# ==================== API KEYS ====================
ANTHROPIC_KEY    = os.getenv("ANTHROPIC_API_KEY", "")
ELEVENLABS_KEY   = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")

# ==================== PLATFORM API KEYS ====================
YOUTUBE_CLIENT_ID     = os.getenv("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET", "")
INSTAGRAM_TOKEN       = os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
INSTAGRAM_USER_ID     = os.getenv("INSTAGRAM_USER_ID", "")
TIKTOK_TOKEN          = os.getenv("TIKTOK_ACCESS_TOKEN", "")

# ==================== LOCAL SETTINGS ====================
OLLAMA_URL        = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL      = os.getenv("OLLAMA_MODEL", "llama3.3")
OLLAMA_FAST_MODEL = os.getenv("OLLAMA_FAST_MODEL", "llama3.2:3b")
WHISPER_MODEL     = os.getenv("WHISPER_MODEL", "large-v3")

# ==================== LLM MODEL ====================
if LOCAL_MODE:
    LLM_MODEL      = f"ollama/{OLLAMA_MODEL}"
    LLM_FAST_MODEL = f"ollama/{OLLAMA_FAST_MODEL}"
    LLM_BASE_URL   = OLLAMA_URL
else:
    LLM_MODEL      = "anthropic/claude-sonnet-4-6"
    LLM_FAST_MODEL = "anthropic/claude-haiku-4-5-20251001"
    LLM_BASE_URL   = None

# ==================== CROSS-PLATFORM PATHS ====================
# Use pathlib for cross-platform compatibility
# Default to current script directory if PETER_BASE_DIR not set

try:
    # Try to use environment variable first
    base_dir_env = os.getenv("PETER_BASE_DIR", "")
    if base_dir_env:
        BASE_DIR = Path(base_dir_env).absolute()
    else:
        # Default: use current working directory or script directory
        BASE_DIR = Path(__file__).parent.absolute()
    
    # Ensure path exists
    if not BASE_DIR.exists():
        BASE_DIR.mkdir(parents=True, exist_ok=True)
    
except Exception as e:
    print(f"[CONFIG] Error setting BASE_DIR: {e}")
    BASE_DIR = Path.cwd()

# Create standard directories (cross-platform)
DATA_DIR   = BASE_DIR / "data"
OUTPUT_DIR = DATA_DIR / "outputs"
MEMORY_DIR = DATA_DIR / "memory"
FACES_DIR  = DATA_DIR / "faces"
LOGS_DIR   = DATA_DIR / "logs"

# Create all directories if they don't exist
for directory in [DATA_DIR, OUTPUT_DIR, MEMORY_DIR, FACES_DIR, LOGS_DIR]:
    try:
        directory.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        print(f"[CONFIG] Warning: Could not create {directory}: {e}")

# ==================== DASHBOARD ====================
DASHBOARD_PORT = int(os.getenv("DASHBOARD_PORT", 8080))
ENABLE_VISION  = os.getenv("ENABLE_VISION", "true").lower() == "true"
CAMERA_INDEX   = int(os.getenv("CAMERA_INDEX", 0))

# ==================== LOGGING ====================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FILE = LOGS_DIR / "peter_ai.log"

# ==================== QUANTEX SETTINGS ====================
QUANTEX_URL      = os.getenv("QUANTEX_URL", "https://quantex-backend.onrender.com")
QUANTEX_USERNAME = os.getenv("QUANTEX_USERNAME", "admin")
QUANTEX_PASSWORD = os.getenv("QUANTEX_PASSWORD", "")

# ==================== PERFORMANCE ====================
API_TIMEOUT = int(os.getenv("API_TIMEOUT", 30))  # seconds
API_MAX_RETRIES = int(os.getenv("API_MAX_RETRIES", 3))
API_RETRY_DELAY = float(os.getenv("API_RETRY_DELAY", 1.0))  # seconds


# ==================== VALIDATION ====================
def validate():
    """Validate configuration and fail fast if critical settings missing"""
    errors = []
    warnings = []
    
    # Critical checks
    if not LOCAL_MODE and not ANTHROPIC_KEY:
        errors.append("ANTHROPIC_API_KEY missing (required for cloud mode)")
    
    if not ELEVENLABS_KEY:
        warnings.append("ELEVENLABS_API_KEY missing (voice output disabled)")
    
    # Path checks
    try:
        if not BASE_DIR.exists():
            errors.append(f"BASE_DIR does not exist: {BASE_DIR}")
        if not DATA_DIR.exists():
            errors.append(f"DATA_DIR does not exist: {DATA_DIR}")
    except Exception as e:
        errors.append(f"Path error: {e}")
    
    # Platform-specific warnings
    if sys.platform == "win32" and str(BASE_DIR).startswith("C:\\Users"):
        warnings.append("Running from user directory (consider C:\\peter-ai or similar)")
    
    # Print results
    print("\n" + "="*60)
    print("  PETER AI — Configuration Validation")
    print("="*60)
    
    if errors:
        print("\n❌ CRITICAL ERRORS:")
        for error in errors:
            print(f"  • {error}")
    
    if warnings:
        print("\n⚠️  WARNINGS:")
        for warning in warnings:
            print(f"  • {warning}")
    
    if not errors and not warnings:
        print("\n✅ Configuration OK!")
        print_summary()
    
    print("="*60 + "\n")
    
    return len(errors) == 0


def print_summary():
    """Print configuration summary"""
    print(f"\n  Mode       : {'LOCAL (Ollama)' if LOCAL_MODE else 'CLOUD (Claude API)'}")
    print(f"  User       : {USER_NAME}")
    print(f"  LLM Model  : {LLM_MODEL}")
    print(f"  Whisper    : {WHISPER_MODEL}")
    print(f"  Vision     : {'Enabled' if ENABLE_VISION else 'Disabled'}")
    print(f"  Base Dir   : {BASE_DIR}")
    print(f"  Dashboard  : http://localhost:{DASHBOARD_PORT}")
    print(f"  Log Level  : {LOG_LEVEL}")


def get_all_settings() -> dict:
    """Return all settings as dictionary (useful for logging/debugging)"""
    return {
        # Identity
        "ai_name": AI_NAME,
        "user_name": USER_NAME,
        "wake_word": WAKE_WORD,
        
        # Mode
        "local_mode": LOCAL_MODE,
        
        # Keys (DO NOT LOG ACTUAL VALUES - show as [SET] or [MISSING])
        "anthropic_key": "[SET]" if ANTHROPIC_KEY else "[MISSING]",
        "elevenlabs_key": "[SET]" if ELEVENLABS_KEY else "[MISSING]",
        "elevenlabs_voice": ELEVENLABS_VOICE,
        
        # Models
        "llm_model": LLM_MODEL,
        "llm_fast_model": LLM_FAST_MODEL,
        "whisper_model": WHISPER_MODEL,
        "ollama_model": OLLAMA_MODEL,
        
        # Paths (use strings for JSON serialization)
        "base_dir": str(BASE_DIR),
        "data_dir": str(DATA_DIR),
        "log_file": str(LOG_FILE),
        
        # Performance
        "api_timeout": API_TIMEOUT,
        "api_max_retries": API_MAX_RETRIES,
        "api_retry_delay": API_RETRY_DELAY,
        
        # Vision
        "vision_enabled": ENABLE_VISION,
        "camera_index": CAMERA_INDEX,
    }


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  PETER AI v2.1 — Configuration Test")
    print("="*60)
    
    # Test validation
    config_ok = validate()
    
    # Print full settings
    print("\n📋 Full Settings:")
    for key, value in get_all_settings().items():
        print(f"  {key:.<40} {value}")
    
    # Final status
    sys.exit(0 if config_ok else 1)
