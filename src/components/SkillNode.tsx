"use client";

import { useRef, useEffect, useState } from "react";

interface SkillNodeProps {
  icon: string;
  label: string;
  xp: number;
  timesCompleted: number;
  loading: boolean;
  editMode: boolean;
  onClick: () => void;
  onEdit: () => void;
}

export default function SkillNode({
  icon,
  label,
  xp,
  timesCompleted,
  loading,
  editMode,
  onClick,
  onEdit,
}: SkillNodeProps) {
  const [activating, setActivating] = useState(false);
  const prevCompleted = useRef(timesCompleted);

  useEffect(() => {
    if (timesCompleted > prevCompleted.current) {
      setActivating(true);
      const timer = setTimeout(() => setActivating(false), 700);
      prevCompleted.current = timesCompleted;
      return () => clearTimeout(timer);
    }
    prevCompleted.current = timesCompleted;
  }, [timesCompleted]);

  const hasCompleted = timesCompleted > 0;

  return (
    <button
      className={`skill-node skill-node--available ${hasCompleted ? "skill-node--completed" : ""} ${activating ? "skill-node--activating" : ""}`}
      onClick={editMode ? onEdit : onClick}
      disabled={loading && !editMode}
      aria-label={`${label} — ${timesCompleted}x completed, +${xp} XP`}
    >
      <div className="skill-node__circle">
        {loading ? (
          <div className="spinner-warrior" style={{ width: 28, height: 28, borderWidth: 2 }} />
        ) : (
          <span className="skill-node__icon">{icon}</span>
        )}

        {/* Times completed badge */}
        {timesCompleted > 0 && !loading && (
          <span className="skill-node__check">{timesCompleted}</span>
        )}

        {/* Edit indicator */}
        {editMode && (
          <span
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "var(--energy-400)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "white",
              boxShadow: "0 0 6px var(--energy-glow)",
            }}
          >
            ✏️
          </span>
        )}
      </div>
      <span className="skill-node__label">{label}</span>
      <span className="skill-node__xp">+{xp} XP</span>
    </button>
  );
}
