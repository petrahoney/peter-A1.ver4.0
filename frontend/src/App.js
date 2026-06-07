import React, { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ChatCircleDots,
  Graph,
  UsersThree,
  ChartLineUp,
  Sparkle,
  GearSix,
  Brain,
  Stack,
  CaretDown,
  Plus,
  FilmStrip,
} from "@phosphor-icons/react";

import HomeView from "./views/HomeView";
import ChatView from "./views/ChatView";
import RouterView from "./views/RouterView";
import CrewView from "./views/CrewView";
import CostView from "./views/CostView";
import MemoryView from "./views/MemoryView";
import SettingsView from "./views/SettingsView";
import WorkspacesView from "./views/WorkspacesView";
import StudioView from "./views/StudioView";
import LanguageSwitcher from "./components/LanguageSwitcher";

import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import { Link as RLink } from "react-router-dom";

import "./App.css";

const NAV_ITEMS = [
  { to: "/", key: "command", icon: Sparkle, exact: true, testid: "nav-command" },
  { to: "/chat", key: "chat", icon: ChatCircleDots, testid: "nav-chat" },
  { to: "/router", key: "router", icon: Graph, testid: "nav-router" },
  { to: "/crew", key: "crew", icon: UsersThree, testid: "nav-crew" },
  { to: "/studio", key: "studio", icon: FilmStrip, testid: "nav-studio" },
  { to: "/memory", key: "memory", icon: Brain, testid: "nav-memory" },
  { to: "/workspaces", key: "workspaces", icon: Stack, testid: "nav-workspaces" },
  { to: "/cost", key: "cost", icon: ChartLineUp, testid: "nav-cost" },
  { to: "/settings", key: "settings", icon: GearSix, testid: "nav-settings" },
];

function WorkspaceSelector() {
  const { workspaces, active, setActive } = useWorkspace();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" data-testid="workspace-selector">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-peter-navy2/60 border border-peter-gold/20 hover:border-peter-gold/50 transition-colors"
        data-testid="workspace-selector-toggle"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: active ? active.color : "rgba(201,168,76,0.25)" }}
          />
          <span className="text-[12px] text-peter-ivory truncate font-light">
            {active ? active.name : t("sidebar.allWorkspaces")}
          </span>
        </div>
        <CaretDown size={12} weight="bold" className="text-peter-dim" />
      </button>
      {open ? (
        <div
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md glass-strong shadow-goldStrong"
          onMouseLeave={() => setOpen(false)}
          data-testid="workspace-selector-menu"
        >
          <button
            onClick={() => {
              setActive("");
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-2 text-[12px] hover:bg-peter-gold/10 transition-colors ${
              !active ? "text-peter-gold" : "text-peter-ivory"
            }`}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "rgba(201,168,76,0.25)" }} />
            {t("sidebar.allWorkspaces")}
          </button>
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setActive(w.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-[12px] hover:bg-peter-gold/10 transition-colors flex items-center gap-2 ${
                active && active.id === w.id ? "text-peter-gold" : "text-peter-ivory"
              }`}
              data-testid={`workspace-option-${w.id}`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: w.color }} />
              <span className="truncate flex-1">{w.name}</span>
              <span className="text-[10px] text-peter-dim font-mono">
                {w.counts.memories}m · {w.counts.sessions}s
              </span>
            </button>
          ))}
          <RLink
            to="/workspaces"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-[11px] text-peter-gold border-t border-peter-gold/15 hover:bg-peter-gold/10 transition-colors"
          >
            <Plus size={11} weight="bold" className="inline-block mr-1" />
            {t("sidebar.manageWorkspaces")}
          </RLink>
        </div>
      ) : null}
    </div>
  );
}

function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 glass-strong z-40 flex flex-col"
      data-testid="sidebar"
    >
      <div className="px-7 pt-8 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="h-display text-3xl text-peter-ivory leading-none">
            PETER
          </span>
          <span className="h-display text-3xl text-peter-gold leading-none">
            AI
          </span>
        </div>
        <div className="mt-1 text-[10px] tracking-[0.32em] uppercase text-peter-dim font-medium">
          Intelligence, Elevated.
        </div>
      </div>

      <div className="px-4 pb-2">
        <WorkspaceSelector />
      </div>
      <div className="px-7"><div className="hairline" /></div>

      <nav className="flex-1 px-4 mt-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            data-testid={item.testid}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-300",
                isActive
                  ? "bg-peter-gold/10 text-peter-ivory border border-peter-gold/30 shadow-gold"
                  : "text-peter-dim hover:text-peter-ivory hover:bg-peter-navy2/60 border border-transparent",
              ].join(" ")
            }
          >
            <item.icon size={18} weight="light" />
            <span className="text-sm tracking-wide">{t(`nav.${item.key}`)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-3">
        <LanguageSwitcher variant="sidebar" />
      </div>

      <div className="px-7 pb-7">
        <div className="hairline mb-4" />
        <div
          data-testid="sidebar-footer-brand"
          className="text-[10px] tracking-[0.22em] text-peter-dim/80 font-light leading-snug"
          dir="ltr"
        >
          PETER AI v4.0 — <span className="text-peter-gold">Intelligence, Elevated.</span> Built in Indonesia.
        </div>
      </div>
    </aside>
  );
}

function PageContainer({ children }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="ml-64 min-h-screen bg-peter-black relative"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <BrowserRouter>
        <Sidebar />
        <PageContainer>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/chat" element={<ChatView />} />
            <Route path="/router" element={<RouterView />} />
            <Route path="/crew" element={<CrewView />} />
            <Route path="/studio" element={<StudioView />} />
            <Route path="/memory" element={<MemoryView />} />
            <Route path="/workspaces" element={<WorkspacesView />} />
            <Route path="/cost" element={<CostView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </PageContainer>
      </BrowserRouter>
    </WorkspaceProvider>
  );
}
