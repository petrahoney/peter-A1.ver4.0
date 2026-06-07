import { useCallback, useRef, useState } from "react";
import { streamChat } from "../lib/stream";

/**
 * useStreamingChat — manages a single in-flight SSE chat stream.
 *
 * Returns `{ streaming, start, stop }`. `start` accepts callbacks for
 * lifecycle events: onUserMessage, onAssistantStart, onDelta, onDone, onError.
 */
export default function useStreamingChat() {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const start = useCallback(async (body, handlers) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming(true);
    const startedAt = performance.now();

    let firstTokenAt = null;
    await streamChat(
      body,
      {
        onRoute: (meta) => handlers.onRoute?.(meta),
        onDelta: (chunk) => {
          if (firstTokenAt === null) firstTokenAt = performance.now();
          handlers.onDelta?.(chunk);
        },
        onDone: (stats) =>
          handlers.onDone?.({
            ...stats,
            elapsed_ms: Math.round(performance.now() - startedAt),
            ttft_ms: firstTokenAt
              ? Math.round(firstTokenAt - startedAt)
              : null,
          }),
        onError: (e) => handlers.onError?.(e),
      },
      ctrl.signal,
    );

    setStreaming(false);
    abortRef.current = null;
  }, []);

  return { streaming, start, stop };
}
