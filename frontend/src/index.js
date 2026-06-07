import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./i18n";
import App from "./App";

// Swallow the benign Chrome "ResizeObserver loop completed with undelivered
// notifications" warning that React Flow + Recharts trigger together. It does
// not affect runtime behaviour but the CRA dev error overlay treats it as fatal.
// See: https://github.com/WICG/resize-observer/issues/38
const _RESIZE_OBS_MSG = "ResizeObserver loop";
window.addEventListener("error", (e) => {
  if (e?.message && e.message.indexOf(_RESIZE_OBS_MSG) !== -1) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
