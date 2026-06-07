import React from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChatCircleDots,
  Graph,
  UsersThree,
  ChartLineUp,
  Sparkle,
  GearSix,
} from "@phosphor-icons/react";

import HomeView from "./views/HomeView";
import ChatView from "./views/ChatView";
import RouterView from "./views/RouterView";
import CrewView from "./views/CrewView";
import CostView from "./views/CostView";
import SettingsView from "./views/SettingsView";

import "./App.css";

const NAV = [
  { to: "/", label: "Command", icon: Sparkle, exact: true, testid: "nav-command" },
  { to: "/chat", label: "Chat", icon: ChatCircleDots, testid: "nav-chat" },
  { to: "/router", label: "Router", icon: Graph, testid: "nav-router" },
  { to: "/crew", label: "Crew Builder", icon: UsersThree, testid: "nav-crew" },
  { to: "/cost", label: "Cost", icon: ChartLineUp, testid: "nav-cost" },
  { to: "/settings", label: "Settings", icon: GearSix, testid: "nav-settings" },
];

function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 glass-strong z-40 flex flex-col"
      data-testid="sidebar"
    >
      <div className="px-7 pt-8 pb-5">
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
        <div className="mt-4 hairline" />
      </div>

      <nav className="flex-1 px-4 mt-2 space-y-1">
        {NAV.map((item) => (
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
            <span className="text-sm tracking-wide">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-7 pb-7">
        <div className="hairline mb-4" />
        <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim">
          v4.0 · The Luxury Strategist
        </div>
        <div className="mt-1 text-xs text-peter-dim/70 font-light">
          Sovereign intelligence platform
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
    <BrowserRouter>
      <Sidebar />
      <PageContainer>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/chat" element={<ChatView />} />
          <Route path="/router" element={<RouterView />} />
          <Route path="/crew" element={<CrewView />} />
          <Route path="/cost" element={<CostView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </PageContainer>
    </BrowserRouter>
  );
}
