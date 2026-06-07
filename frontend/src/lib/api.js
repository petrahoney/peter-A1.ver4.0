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

export const geniusPromptsList = () =>
  api.get("/genius-prompts").then((r) => r.data);

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
