import { BACKEND } from "./api";

/**
 * Stream a chat response from POST /api/chat/stream.
 * Parses SSE events: `route` (initial metadata), `delta` (token), `done` (final stats).
 *
 * @param {object} body  - { message, session_id, force_tier }
 * @param {object} cbs   - { onRoute(meta), onDelta(text), onDone(stats), onError(err) }
 * @param {AbortSignal} signal
 */
export async function streamChat(body, cbs, signal) {
  let res;
  try {
    res = await fetch(`${BACKEND}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    cbs.onError?.(e);
    return;
  }
  if (!res.ok || !res.body) {
    cbs.onError?.(new Error(`HTTP ${res.status}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = null;

  const handleEvent = (event, data) => {
    let payload;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }
    if (event === "route") cbs.onRoute?.(payload);
    else if (event === "delta") cbs.onDelta?.(payload.content || "");
    else if (event === "done") cbs.onDone?.(payload);
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE messages are separated by blank lines
      let idx;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const lines = raw.split("\n");
        let event = "message";
        const dataLines = [];
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length) {
          currentEvent = event;
          handleEvent(currentEvent, dataLines.join("\n"));
        }
      }
    }
  } catch (e) {
    if (e.name !== "AbortError") cbs.onError?.(e);
  }
}
