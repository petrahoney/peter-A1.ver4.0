import axios from "axios";
import i18n from "../i18n";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND}/api`;

export const api = axios.create({
  baseURL: API,
  timeout: 180000,
});

// Auto-attach the active UI language so backend i18n (agents, tiers, status…)
// returns localised display strings.
api.interceptors.request.use((config) => {
  const lng = (i18n && i18n.language) || "en";
  config.headers = config.headers || {};
  config.headers["Accept-Language"] = lng;
  return config;
});

export const tiers = () => api.get("/tiers").then((r) => r.data);
export const agents = () => api.get("/agents").then((r) => r.data);
export const stats = (workspace_id) => {
  const q = workspace_id ? `?workspace_id=${encodeURIComponent(workspace_id)}` : "";
  return api.get(`/stats${q}`).then((r) => r.data);
};

export const statsSparkline = (workspace_id, days = 7) => {
  const params = new URLSearchParams();
  if (workspace_id) params.set("workspace_id", workspace_id);
  if (days) params.set("days", String(days));
  const qs = params.toString();
  return api.get(`/stats/sparkline${qs ? `?${qs}` : ""}`).then((r) => r.data);
};

export const classify = (query) =>
  api.post("/router/classify", { query }).then((r) => r.data);

export const chat = (message, session_id, force_tier) =>
  api
    .post("/chat", { message, session_id, force_tier })
    .then((r) => r.data);

export const listSessions = (workspace_id) => {
  const q = workspace_id ? `?workspace_id=${encodeURIComponent(workspace_id)}` : "";
  return api.get(`/sessions${q}`).then((r) => r.data);
};

export const getMessages = (session_id) =>
  api.get(`/sessions/${session_id}/messages`).then((r) => r.data);

export const crewBuild = (requirements) =>
  api.post("/crew/build", { requirements }).then((r) => r.data);

export const crewStatus = (run_id) =>
  api.get(`/crew/runs/${run_id}`).then((r) => r.data);

export const crewList = () =>
  api.get("/crew/runs").then((r) => r.data);

export const renameSession = (session_id, title) =>
  api.patch(`/sessions/${session_id}`, { title }).then((r) => r.data);

export const setSessionTier = (session_id, force_tier) =>
  api.patch(`/sessions/${session_id}`, { force_tier: force_tier || "" }).then((r) => r.data);

export const setSessionMemoryEnabled = (session_id, memory_enabled) =>
  api.patch(`/sessions/${session_id}`, { memory_enabled }).then((r) => r.data);

export const setSessionWorkspace = (session_id, workspace_id) =>
  api.patch(`/sessions/${session_id}`, { workspace_id: workspace_id || "" }).then((r) => r.data);

export const setSessionReplyLang = (session_id, reply_lang) =>
  api.patch(`/sessions/${session_id}`, { reply_lang: reply_lang || "" }).then((r) => r.data);

// ─────── Script Studio (P14 / P17 / P18) ───────
export const scriptGenerate = (body) =>
  api.post("/script/generate", body).then((r) => r.data);

export const scriptEvaluate = (body) =>
  api.post("/script/evaluate", body, { timeout: 90000 }).then((r) => r.data);

export const geniusPromptGenerate = (body) =>
  api.post("/genius-prompt/generate", body, { timeout: 95000 }).then((r) => r.data);

/**
 * Job-queue + reconnecting SSE consumer for the genius-prompt loop.
 *
 *   1. POST /api/genius-prompt/jobs  → returns {job_id}
 *   2. GET  /api/genius-prompt/jobs/{id}/events?cursor=N (SSE)
 *      • Streams events from cursor N. Proactively closes with
 *        `event: pause {cursor: K}` after ~50s (before the 60s proxy cap).
 *      • Client reconnects with the new cursor until `event: end` arrives.
 *
 * @param {object} body  request body (same shape as before)
 * @param {function} onEvent  called for every parsed event dict
 * @param {AbortSignal=} signal  optional abort signal
 * @returns {Promise<object|null>} the final.result payload, or null if none
 */
export async function geniusPromptStream(body, onEvent, signal) {
  const lng = (i18n && i18n.language) || "en";
  // Step 1: spawn the background job.
  const jobResp = await fetch(`${API}/genius-prompt/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": lng },
    body: JSON.stringify(body),
    signal,
  });
  if (!jobResp.ok) throw new Error(`job create HTTP ${jobResp.status}`);
  const { job_id } = await jobResp.json();

  let cursor = 0;
  let finalResult = null;
  let serverError = null;

  // Step 2: reconnecting SSE loop.
  for (;;) {
    if (signal?.aborted) break;
    const url = `${API}/genius-prompt/jobs/${job_id}/events?cursor=${cursor}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { "Accept-Language": lng },
      signal,
    });
    if (!resp.ok || !resp.body) {
      throw new Error(`stream HTTP ${resp.status}`);
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buf = "";
    let endReached = false;
    let paused = false;

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        let eventName = null;
        const dataLines = [];
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
        }
        if (!dataLines.length) continue;
        let parsed;
        try {
          parsed = JSON.parse(dataLines.join("\n"));
        } catch {
          continue; // ignore unparseable
        }
        if (eventName === "end") {
          endReached = true;
        } else if (eventName === "pause") {
          paused = true;
          if (typeof parsed.cursor === "number") cursor = parsed.cursor;
        } else {
          // Regular data event — forward + advance cursor.
          onEvent && onEvent(parsed);
          cursor += 1;
          if (parsed.type === "final") finalResult = parsed.result;
          if (parsed.type === "error") serverError = parsed.message || "stream error";
        }
      }
    }

    if (endReached || serverError) break;
    if (!paused) {
      // Unexpected close (proxy cut, network hiccup) — reconnect with same cursor.
      // Brief backoff to avoid hammering the proxy.
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  if (serverError) throw new Error(serverError);
  return finalResult;
}

export const geniusPromptsList = () =>
  api.get("/genius-prompts").then((r) => r.data);

export const geniusPromptDelete = (id) =>
  api.delete(`/genius-prompts/${id}`).then((r) => r.data);

export const scriptsList = () =>
  api.get("/scripts").then((r) => r.data);

export const scriptDetail = (id) =>
  api.get(`/scripts/${id}`).then((r) => r.data);

export const scriptDelete = (id) =>
  api.delete(`/scripts/${id}`).then((r) => r.data);

export const listWorkspaces = () =>
  api.get("/workspaces").then((r) => r.data);

export const createWorkspace = (payload) =>
  api.post("/workspaces", payload).then((r) => r.data);

export const updateWorkspace = (id, payload) =>
  api.patch(`/workspaces/${id}`, payload).then((r) => r.data);

export const deleteWorkspace = (id, purge = false) =>
  api.delete(`/workspaces/${id}?purge=${purge ? "true" : "false"}`).then((r) => r.data);

export const deleteSession = (session_id) =>
  api.delete(`/sessions/${session_id}`).then((r) => r.data);

export { API, BACKEND };
