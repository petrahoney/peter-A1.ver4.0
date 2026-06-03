"""quantex_module.py (IMPROVED v2.1)"""
import os
import httpx
import logging
import threading
import time
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

QUANTEX_URL      = os.getenv("QUANTEX_URL", "https://quantex-backend.onrender.com")
QUANTEX_USERNAME = os.getenv("QUANTEX_USERNAME", "admin")
QUANTEX_PASSWORD = os.getenv("QUANTEX_PASSWORD", "")
USER_NAME        = os.getenv("USER_NAME", "Sir")
API_TIMEOUT      = int(os.getenv("API_TIMEOUT", 30))
API_MAX_RETRIES  = int(os.getenv("API_MAX_RETRIES", 3))
API_RETRY_DELAY  = float(os.getenv("API_RETRY_DELAY", 1.0))

logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
formatter = logging.Formatter('[QUANTEX] %(levelname)s: %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

_token: Optional[str] = None
_token_lock = threading.RLock()

def get_token() -> str:
    global _token
    with _token_lock:
        if not _token:
            _token = _login()
        return _token

def refresh_token() -> str:
    global _token
    with _token_lock:
        logger.info("Refreshing token...")
        _token = _login()
        return _token

def clear_token():
    global _token
    with _token_lock:
        _token = None

def _retry_request(func, max_retries=API_MAX_RETRIES, base_delay=API_RETRY_DELAY, backoff_factor=2.0):
    last_error = None
    delay = base_delay
    for attempt in range(max_retries):
        try:
            return func()
        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError) as e:
            last_error = e
            if attempt < max_retries - 1:
                logger.warning(f"Request failed (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
                delay *= backoff_factor
            continue
    logger.error(f"Request failed after {max_retries} attempts")
    return None

def _login() -> str:
    if not QUANTEX_PASSWORD:
        logger.error("QUANTEX_PASSWORD not set")
        return ""
    
    def make_request():
        return httpx.post(
            f"{QUANTEX_URL}/api/auth/login",
            json={"username": QUANTEX_USERNAME, "password": QUANTEX_PASSWORD},
            timeout=API_TIMEOUT
        )
    
    try:
        res = _retry_request(make_request)
        if not res:
            logger.error("Login failed after retries")
            return ""
        if res.status_code == 200:
            data = res.json()
            token = data.get("access_token") or data.get("token", "")
            if token:
                logger.info("✓ Login successful")
                return token
        logger.error(f"Login failed: HTTP {res.status_code}")
        return ""
    except Exception as e:
        logger.error(f"Login error: {e}")
        return ""

def get_headers() -> Dict[str, str]:
    token = get_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def get_scan_results(market: str = "idx") -> List[Dict[str, Any]]:
    if not get_token():
        logger.warning("No valid token")
        return []
    try:
        def get_watchlist():
            return httpx.get(
                f"{QUANTEX_URL}/api/watchlist/{market}",
                headers=get_headers(),
                timeout=API_TIMEOUT
            )
        res1 = _retry_request(get_watchlist)
        if not res1 or res1.status_code != 200:
            return []
        tickers = res1.json().get("tickers", [])
        if not tickers:
            return []
        logger.info(f"Scanning {len(tickers)} tickers...")
        def run_scan():
            return httpx.post(
                f"{QUANTEX_URL}/api/scan",
                headers=get_headers(),
                json={"tickers": tickers, "isIDX": market == "idx"},
                timeout=60
            )
        res2 = _retry_request(run_scan)
        if not res2 or res2.status_code != 200:
            return []
        results = res2.json().get("results", [])
        logger.info(f"✓ Scan complete: {len(results)} signals")
        return results
    except Exception as e:
        logger.error(f"Scan error: {e}")
        return []

def get_portfolio() -> Dict[str, Any]:
    if not get_token():
        return {}
    try:
        def get_port():
            return httpx.get(
                f"{QUANTEX_URL}/api/portfolio/summary",
                headers=get_headers(),
                timeout=API_TIMEOUT
            )
        res = _retry_request(get_port)
        if not res or res.status_code != 200:
            return {}
        return res.json()
    except Exception as e:
        logger.error(f"Portfolio error: {e}")
        return {}

def analyze_ticker(ticker: str, is_idx: bool = True) -> Dict[str, Any]:
    if not get_token():
        return {}
    ticker = ticker.upper().strip()
    if not ticker or len(ticker) > 5:
        logger.error(f"Invalid ticker: {ticker}")
        return {}
    try:
        def analyze():
            return httpx.post(
                f"{QUANTEX_URL}/api/analyze",
                headers=get_headers(),
                json={"ticker": ticker, "isIDX": is_idx},
                timeout=API_TIMEOUT
            )
        res = _retry_request(analyze)
        if not res or res.status_code != 200:
            return {}
        return res.json()
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return {}

def get_journal_stats(month: str = None) -> Dict[str, Any]:
    if not get_token():
        return {}
    try:
        import datetime
        if not month:
            month = datetime.datetime.now().strftime("%Y-%m")
        def get_journal():
            return httpx.get(
                f"{QUANTEX_URL}/api/journal/stats",
                params={"month": month},
                headers=get_headers(),
                timeout=API_TIMEOUT
            )
        res = _retry_request(get_journal)
        if not res or res.status_code != 200:
            return {}
        return res.json()
    except Exception as e:
        logger.error(f"Journal error: {e}")
        return {}

def run_quantex_menu():
    print("\n" + "="*60)
    print("  QUANTEX EOD — Trading Signal Platform")
    print("="*60)
    print("\n✓ Quantex module loaded")

if __name__ == "__main__":
    print("\nTesting Quantex Module...")
    token = get_token()
    print(f"Token: {token[:20]}..." if token else "❌ Login failed")