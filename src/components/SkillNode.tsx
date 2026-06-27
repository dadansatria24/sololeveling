"use client";

import { useRef, useEffect, useState } from "react";

interface SkillNodeProps {
  icon: string;
  label: string;
  xp: number;
  state: "locked" | "available" | "completed";
  loading: boolean;
  onClick: () => void;
}

export default function SkillNode({
  icon,
  label,
  xp,
  state,
  loading,
  onClick,
}: SkillNodeProps) {
  const [activating, setActivating] = useState(false);
  const prevState = useRef(state);

  useEffect(() => {
    if (prevState.current === "available" && state === "completed") {
      setActivating(true);
      const timer = setTimeout(() => setActivating(false), 700);
      return () => clearTimeout(timer);
    }
    prevState.current = state;
  }, [state]);

  const stateClass =
    state === "completed"
      ? "skill-node--completed"
      : state === "available"
        ? "skill-node--available"
        : "skill-node--locked";

  return (
    <button
      className={`skill-node ${stateClass} ${activating ? "skill-node--activating" : ""}`}
      onClick={onClick}
      disabled={state !== "available" || loading}
      aria-label={`${label} — ${state === "completed" ? "Completed" : state === "available" ? `Available, +${xp} XP` : "Locked"}`}
    >
      <div className="skill-node__circle">
        {loading ? (
          <div className="spinner-warrior" style={{ width: 28, height: 28, borderWidth: 2 }} />
        ) : (
          <span className="skill-node__icon">{icon}</span>
        )}
        {state === "completed" && !loading && (
          <span className="skill-node__check">✓</span>
        )}
      </div>
      <span className="skill-node__label">{label}</span>
      <span className="skill-node__xp">
        {state === "completed" ? "DONE" : `+${xp} XP`}
      </span>
    </button>
  );
}
