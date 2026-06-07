// Lightweight client-side language detector for PETER AI's 5 supported locales.
// Returns one of: "en" | "id" | "zh" | "es" | "ar" | null (insufficient signal).
//
// Strategy:
//   1. Unicode script wins outright (Han → zh, Arabic → ar).
//   2. For Latin-script text we score against tiny stoplists per language.
//   3. Falls back to "en" only if Latin text is long enough and no stronger
//      signal was found — otherwise returns null so we never nag the user
//      about ambiguous fragments.
//
// Designed to be cheap (one regex sweep + one tokenise) and predictable.

const ID_STOPS = new Set([
  "apa", "bagaimana", "kenapa", "mengapa", "kapan", "siapa",
  "jelaskan", "analisis", "bandingkan", "definisikan",
  "yang", "untuk", "dengan", "tidak", "adalah", "dan",
  "saya", "anda", "kita", "mereka", "dalam", "atau",
  "strategis", "peluang", "pasar", "tahun", "ini", "ke",
  "dari", "pada", "akan", "sudah", "belum", "juga",
]);

const ES_STOPS = new Set([
  "que", "qué", "cual", "cuál", "cómo", "como", "por", "para",
  "define", "analiza", "explica", "compara",
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "en", "con", "sin", "es", "son", "está", "están",
  "estrategia", "riesgo", "negocio", "modelo", "diferencia",
  "entre", "sobre", "hoy", "año", "años", "muy", "más",
  "hola", "porque", "porqué", "tácticas", "táctica",
]);

const EN_STOPS = new Set([
  "the", "and", "is", "are", "of", "to", "in", "for", "with",
  "what", "how", "why", "when", "who", "which",
  "explain", "analyze", "define", "compare", "difference",
  "between", "strategy", "risk", "business", "model",
  "give", "tell", "show", "list", "outline",
]);

const HAS_ARABIC = /[\u0600-\u06FF]/;
const HAS_HAN = /[\u4E00-\u9FFF]/;
const HAS_LATIN = /[A-Za-zÀ-ÿ]/;
const SPANISH_HINT_CHARS = /[¿¡ñáéíóúü]/i;

function tokenize(text) {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

function scoreAgainst(tokens, dict) {
  let hits = 0;
  for (const t of tokens) if (dict.has(t)) hits++;
  return hits;
}

export function detectLang(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  // Need at least a short clause before we offer a switch.
  if (trimmed.length < 10) return null;

  // Script-based detection wins (cheapest + most reliable).
  if (HAS_ARABIC.test(trimmed)) return "ar";
  if (HAS_HAN.test(trimmed)) return "zh";

  // From here on, must be Latin-ish to call EN/ID/ES.
  if (!HAS_LATIN.test(trimmed)) return null;

  const tokens = tokenize(trimmed);
  if (tokens.length < 3) return null;

  const idScore = scoreAgainst(tokens, ID_STOPS);
  let esScore = scoreAgainst(tokens, ES_STOPS);
  const enScore = scoreAgainst(tokens, EN_STOPS);

  // Spanish bonus for distinctive punctuation / accents.
  if (SPANISH_HINT_CHARS.test(trimmed)) esScore += 2;

  const scores = [
    ["id", idScore],
    ["es", esScore],
    ["en", enScore],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const [topLang, topScore] = scores[0];
  const [, secondScore] = scores[1];

  // Demand a meaningful lead so noisy short prompts don't trigger.
  if (topScore < 2) return null;
  if (topScore - secondScore < 1) return null;

  return topLang;
}
