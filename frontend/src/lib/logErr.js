// Small shared helper to keep silent-fail .catch blocks observable in the
// browser console without piling up boilerplate at every call-site.
//
// Usage:
//   import { logErr } from "../lib/logErr";
//   stats().then(setData).catch(logErr("CostView.stats"));
//   try { ... } catch (e) { logErr("ChatView.send")(e); }

export const logErr = (scope) => (err) => {
  // Only emit when there's an actual error payload; prevents noise from
  // intentionally-resolved-with-undefined branches.
  if (err === undefined || err === null) return;
  console.error(`[${scope}]`, err);
};
