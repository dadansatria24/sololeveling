"use client";

import { useState, useEffect } from "react";
import type { SkillNode } from "@/lib/skillTree";

interface NodeEditorProps {
  node: SkillNode | null; // null = adding new node
  defaultTier: number;
  onSave: (data: {
    title: string;
    description: string;
    icon: string;
    xp_reward: number;
    tier: number;
  }) => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}

const EMOJI_OPTIONS = [
  "📖", "📕", "📚", "📝", "✍️", "📰",
  "🎬", "📺", "🎧", "🎵", "🎤", "🎓",
  "💬", "🗣️", "📐", "🧠", "✨", "⚡",
  "🔥", "🎯", "🏆", "💎", "⚔️", "🛡️",
];

export default function NodeEditor({
  node,
  defaultTier,
  onSave,
  onDelete,
  onClose,
}: NodeEditorProps) {
  const [title, setTitle] = useState(node?.title ?? "");
  const [description, setDescription] = useState(node?.description ?? "");
  const [icon, setIcon] = useState(node?.icon ?? "📖");
  const [xpReward, setXpReward] = useState(node?.xp_reward ?? 10);
  const [tier, setTier] = useState(node?.tier ?? defaultTier);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), icon, xp_reward: xpReward, tier });
  };

  const isEditing = node !== null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ background: "rgba(6, 6, 12, 0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 animate-fade-in-up"
        style={{
          background: "linear-gradient(135deg, var(--bg-card), var(--bg-surface))",
          border: "1px solid var(--steel-700)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.6), 0 0 16px var(--energy-glow)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-lg font-bold tracking-wider font-[family-name:var(--font-cinzel)]"
            style={{ color: "var(--gold-300)" }}
          >
            {isEditing ? "Edit Skill" : "Add Skill"}
          </h3>
          <button
            onClick={onClose}
            className="text-xl leading-none transition-colors"
            style={{ color: "var(--steel-500)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--steel-300)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--steel-500)")}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--steel-400)" }}>
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all"
                  style={{
                    background: icon === emoji ? "var(--energy-500)" : "var(--steel-800)",
                    border: icon === emoji ? "2px solid var(--energy-300)" : "1px solid var(--steel-700)",
                    boxShadow: icon === emoji ? "0 0 8px var(--energy-glow)" : "none",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="node-title" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--steel-400)" }}>
              Title
            </label>
            <input
              id="node-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read News Articles"
              className="w-full rounded-xl px-4 py-2.5 text-sm transition-colors outline-none"
              style={{
                background: "var(--steel-900)",
                border: "1px solid var(--steel-700)",
                color: "var(--foreground)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--energy-400)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--steel-700)")}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="node-desc" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--steel-400)" }}>
              Description
            </label>
            <textarea
              id="node-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this skill involve?"
              rows={2}
              className="w-full rounded-xl px-4 py-2.5 text-sm resize-none transition-colors outline-none"
              style={{
                background: "var(--steel-900)",
                border: "1px solid var(--steel-700)",
                color: "var(--foreground)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--energy-400)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--steel-700)")}
            />
          </div>

          {/* XP and Tier row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="node-xp" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--steel-400)" }}>
                XP Reward
              </label>
              <input
                id="node-xp"
                type="number"
                min={1}
                max={999}
                value={xpReward}
                onChange={(e) => setXpReward(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl px-4 py-2.5 text-sm transition-colors outline-none"
                style={{
                  background: "var(--steel-900)",
                  border: "1px solid var(--steel-700)",
                  color: "var(--gold-300)",
                  fontWeight: 700,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--energy-400)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--steel-700)")}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="node-tier" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--steel-400)" }}>
                Tier
              </label>
              <select
                id="node-tier"
                value={tier}
                onChange={(e) => setTier(parseInt(e.target.value))}
                className="w-full rounded-xl px-4 py-2.5 text-sm transition-colors outline-none appearance-none cursor-pointer"
                style={{
                  background: "var(--steel-900)",
                  border: "1px solid var(--steel-700)",
                  color: "var(--foreground)",
                }}
              >
                <option value={1}>1 — Foundation</option>
                <option value={2}>2 — Elementary</option>
                <option value={3}>3 — Pre-Intermediate</option>
                <option value={4}>4 — Intermediate</option>
                <option value={5}>5 — Upper-Intermediate</option>
                <option value={6}>6 — IELTS Prep</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {/* Delete button (only for editing) */}
            <div>
              {isEditing && onDelete && (
                <>
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "var(--blood-400)" }}>Delete?</span>
                      <button
                        type="button"
                        onClick={() => { onDelete(); }}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: "var(--blood-500)", color: "white" }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: "var(--steel-700)", color: "var(--steel-300)" }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--blood-400)", border: "1px solid var(--blood-500)" }}
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                style={{ color: "var(--steel-400)", border: "1px solid var(--steel-700)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-sm font-bold px-5 py-2 rounded-xl transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                  color: "var(--bg-deep)",
                  boxShadow: "0 0 12px var(--gold-glow)",
                }}
              >
                {isEditing ? "Save" : "Add Skill"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
