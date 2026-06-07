import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Stack,
  Plus,
  PencilSimple,
  Trash,
  Check,
  X,
  Sparkle,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  listWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "../lib/api";
import { useWorkspace } from "../context/WorkspaceContext";

const PALETTE = ["#C9A84C", "#E8D5A3", "#8B6914", "#C0C0C0", "#F5F5F0"];

function WorkspaceCard({ w, active, onEdit, onDelete, onActivate }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className={[
        "relative p-6 rounded-lg cursor-pointer transition-all overflow-hidden",
        active
          ? "bg-peter-navy2 border-2 border-peter-gold shadow-goldStrong"
          : "bg-peter-navy/40 border border-peter-gold/15 hover:border-peter-gold/40",
      ].join(" ")}
      onClick={onActivate}
      data-testid={`workspace-card-${w.id}`}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: w.color }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: w.color }}
          />
          {active ? (
            <span className="text-[9px] tracking-[0.3em] uppercase text-peter-gold inline-flex items-center gap-1">
              <Sparkle size={9} weight="fill" /> Active
            </span>
          ) : (
            <span className="text-[9px] tracking-[0.3em] uppercase text-peter-dim">
              Inactive
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(w);
            }}
            className="text-peter-dim hover:text-peter-gold p-1"
            data-testid={`workspace-edit-${w.id}`}
          >
            <PencilSimple size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(w);
            }}
            className="text-peter-dim hover:text-red-400 p-1"
            data-testid={`workspace-delete-${w.id}`}
          >
            <Trash size={14} />
          </button>
        </div>
      </div>
      <h3 className="h-display text-2xl text-peter-ivory mt-3">{w.name}</h3>
      {w.description ? (
        <p
          className="mt-2 text-[13px] font-light leading-relaxed"
          style={{ color: "#E5E5E5" }}
        >
          {w.description}
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-peter-dim italic">No description</p>
      )}
      <div className="hairline my-4" />
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="h-display text-2xl text-peter-gold tnum">
            {w.counts.memories}
          </div>
          <div className="text-[9px] tracking-[0.3em] uppercase text-peter-dim mt-1">
            memories
          </div>
        </div>
        <div>
          <div className="h-display text-2xl text-peter-ivory tnum">
            {w.counts.sessions}
          </div>
          <div className="text-[9px] tracking-[0.3em] uppercase text-peter-dim mt-1">
            sessions
          </div>
        </div>
        <div>
          <div className="h-display text-2xl text-peter-ivory tnum">
            {w.counts.crew_runs}
          </div>
          <div className="text-[9px] tracking-[0.3em] uppercase text-peter-dim mt-1">
            crew runs
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function WorkspaceForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [color, setColor] = useState(initial?.color || PALETTE[0]);

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), color });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-6 bg-peter-navy2/50 border border-peter-gold/30 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim">
            {initial ? "Edit workspace" : "Forge a new workspace"}
          </div>
          <button
            onClick={onCancel}
            className="text-peter-dim hover:text-peter-ivory"
          >
            <X size={14} />
          </button>
        </div>
        <input
          autoFocus
          placeholder="Workspace name — e.g. Acme M&A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="workspace-form-name"
          className="w-full bg-peter-black/60 border border-peter-gold/30 focus:border-peter-gold/60 outline-none px-4 py-3 rounded-md font-light"
          style={{ color: "#E5E5E5" }}
        />
        <textarea
          placeholder="A short brief — what is this council for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          data-testid="workspace-form-description"
          className="mt-3 w-full bg-peter-black/60 border border-peter-gold/30 focus:border-peter-gold/60 outline-none px-4 py-3 rounded-md font-light resize-none"
          style={{ color: "#E5E5E5" }}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  color === c
                    ? "ring-2 ring-offset-2 ring-offset-peter-black ring-peter-ivory scale-110"
                    : "hover:scale-110"
                }`}
                style={{ background: c }}
                data-testid={`workspace-color-${c.slice(1)}`}
              />
            ))}
          </div>
          <button
            onClick={submit}
            disabled={!name.trim()}
            data-testid="workspace-form-save"
            className="bg-peter-gold disabled:opacity-40 text-peter-black hover:bg-peter-goldLight transition-colors px-5 py-2 rounded-md font-medium inline-flex items-center gap-2 text-sm"
          >
            <Check size={14} weight="bold" /> {initial ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function WorkspacesView() {
  const { t } = useTranslation();
  const { activeId, setActive, refresh: refreshCtx } = useWorkspace();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const refresh = async () => {
    const d = await listWorkspaces();
    setList(d.workspaces);
    setLoading(false);
    refreshCtx();
  };

  useEffect(() => {
    let cancelled = false;
    listWorkspaces()
      .then((d) => {
        if (!cancelled) {
          setList(d.workspaces);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (data) => {
    const w = await createWorkspace(data);
    setShowForm(false);
    setEditing(null);
    setActive(w.id);
    refresh();
  };

  const handleUpdate = async (data) => {
    await updateWorkspace(editing.id, data);
    setEditing(null);
    refresh();
  };

  const handleDelete = async (w) => {
    const purge = window.confirm(
      `Delete workspace "${w.name}"?\n\nOK = also delete its ${w.counts.memories} memories, ${w.counts.sessions} sessions and ${w.counts.crew_runs} crew runs (PURGE).\nCancel = keep the contents but remove the container.`,
    );
    // confirm returns true for OK. Use a second confirm to give an escape.
    const really = window.confirm(
      purge
        ? `Confirm PURGE: this will permanently delete all contents of "${w.name}".`
        : `Confirm: remove the workspace "${w.name}" but keep its memories/sessions/crew runs untagged.`,
    );
    if (!really) return;
    await deleteWorkspace(w.id, purge);
    if (activeId === w.id) setActive("");
    refresh();
  };

  return (
    <div className="p-12 min-h-screen">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-[11px] tracking-[0.32em] uppercase text-peter-dim flex items-center gap-2">
            <Stack size={14} weight="light" />
            {t("workspaces.label")}
          </div>
          <h1 className="h-display text-4xl text-peter-ivory mt-1">
            {t("workspaces.title")} <em className="text-peter-gold not-italic">{t("workspaces.titleAccent")}</em>
          </h1>
          <p className="text-peter-ivory/70 mt-3 max-w-3xl text-sm font-light leading-relaxed">
            {t("workspaces.subtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          data-testid="workspace-new-btn"
          className="bg-peter-gold text-peter-black hover:bg-peter-goldLight transition-colors px-5 py-3 rounded-md font-medium inline-flex items-center gap-2"
        >
          <Plus size={16} weight="bold" /> {t("workspaces.newWorkspace")}
        </button>
      </div>

      <AnimatePresence>
        {showForm || editing ? (
          <div className="mt-6">
            <WorkspaceForm
              initial={editing}
              onSave={editing ? handleUpdate : handleCreate}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </div>
        ) : null}
      </AnimatePresence>

      <div className="mt-8">
        {loading ? (
          <div className="text-peter-dim text-sm">Loading workspaces…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-peter-dim">
            <Stack size={36} weight="light" className="mx-auto mb-3 opacity-40" />
            <div className="text-sm">
              No workspaces yet. Create one to scope memories and sessions by venture or theme.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {list.map((w) => (
                <WorkspaceCard
                  key={w.id}
                  w={w}
                  active={activeId === w.id}
                  onActivate={() => setActive(activeId === w.id ? "" : w.id)}
                  onEdit={(ws) => {
                    setEditing(ws);
                    setShowForm(false);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
