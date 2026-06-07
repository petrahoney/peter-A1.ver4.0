import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND}/api`;

export const api = axios.create({
  baseURL: API,
  timeout: 180000,
});

export const tiers = () => api.get("/tiers").then((r) => r.data);
export const agents = () => api.get("/agents").then((r) => r.data);
export const stats = () => api.get("/stats").then((r) => r.data);

export const classify = (query) =>
  api.post("/router/classify", { query }).then((r) => r.data);

export const chat = (message, session_id, force_tier) =>
  api
    .post("/chat", { message, session_id, force_tier })
    .then((r) => r.data);

export const listSessions = () =>
  api.get("/sessions").then((r) => r.data);

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

export const deleteSession = (session_id) =>
  api.delete(`/sessions/${session_id}`).then((r) => r.data);

export { API, BACKEND };
