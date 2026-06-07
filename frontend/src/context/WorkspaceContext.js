import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listWorkspaces } from "../lib/api";

const WS_KEY = "peter_ai.active_workspace";
const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeId, setActiveId] = useState(() => {
    try {
      return localStorage.getItem(WS_KEY) || "";
    } catch {
      // localStorage may be blocked (privacy mode / SSR) — fall back to empty.
      return "";
    }
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const d = await listWorkspaces();
      setWorkspaces(d.workspaces);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    listWorkspaces()
      .then((d) => {
        if (cancelled) return;
        timer = setTimeout(() => {
          setWorkspaces(d.workspaces);
          setLoading(false);
        }, 0);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[WorkspaceProvider] initial load failed", e);
        timer = setTimeout(() => setLoading(false), 0);
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const setActive = useCallback((id) => {
    setActiveId(id || "");
    try {
      if (id) localStorage.setItem(WS_KEY, id);
      else localStorage.removeItem(WS_KEY);
    } catch {
      // localStorage unavailable — workspace preference will not persist.
    }
  }, []);

  const active = useMemo(
    () => workspaces.find((w) => w.id === activeId) || null,
    [workspaces, activeId],
  );

  const value = useMemo(
    () => ({
      workspaces,
      active,
      activeId: active ? activeId : "", // sync if active was deleted
      loading,
      setActive,
      refresh,
    }),
    [workspaces, active, activeId, loading, setActive, refresh],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
