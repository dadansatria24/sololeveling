"use client";

import { useRef, useEffect, useState } from "react";

interface SkillNodeProps {
  icon: string;
  label: string;
  xp: number;
  timesCompleted: number;
  loading: boolean;
  editMode: boolean;
  isUnlocked?: boolean;
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
  isUnlocked = true,
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
  const isLocked = !isUnlocked && !editMode;

  const nodeStateClass = isLocked
    ? "skill-node--locked"
    : `skill-node--available ${hasCompleted ? "skill-node--completed" : ""}`;

  return (
    <button
      className={`skill-node ${nodeStateClass} ${activating ? "skill-node--activating" : ""}`}
      onClick={editMode ? onEdit : onClick}
      disabled={isLocked || (loading && !editMode)}
      aria-label={`${label} — ${timesCompleted}x completed, +${xp} XP ${!isUnlocked ? "(Locked)" : ""}`}
    >
      <div className="skill-node__circle">
        {loading ? (
          <div className="spinner-warrior" style={{ width: 28, height: 28, borderWidth: 2 }} />
        ) : (
          <span className="skill-node__icon">{icon}</span>
        )}

        {/* Lock indicator overlay */}
        {!isUnlocked && (
          <span
            style={{
              position: "absolute",
              top: -4,
              left: -4,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--steel-900)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              border: "1px solid var(--steel-700)",
              boxShadow: "0 0 6px rgba(0,0,0,0.5)",
            }}
          >
            🔒
          </span>
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
