"use client";

import { type ActivityType } from "@/lib/addXP";
import SkillNode from "./SkillNode";
import RankBadge from "./RankBadge";

interface QuestDef {
  label: string;
  activity: ActivityType;
  xp: number;
  icon: string;
}

interface SkillTreeProps {
  level: number;
  totalXP: number;
  progress: { current: number; needed: number; percent: number };
  quests: QuestDef[];
  completed: Record<ActivityType, boolean>;
  processing: ActivityType | null;
  onComplete: (quest: QuestDef) => void;
}

export default function SkillTree({
  level,
  totalXP,
  progress,
  quests,
  completed,
  processing,
  onComplete,
}: SkillTreeProps) {
  // Layout positions for the skill tree
  // Rank badge at top center, 3 quest nodes in a row below, connected by lines
  const rankCx = 200;
  const rankCy = 80;

  // Node positions (3 nodes spread below the rank badge)
  const nodeY = 260;
  const nodePositions = [
    { cx: 70, cy: nodeY },
    { cx: 200, cy: nodeY },
    { cx: 330, cy: nodeY },
  ];

  // Connection points (from rank badge bottom to each node top)
  const connStartY = rankCy + 60; // bottom of rank badge
  const connEndY = nodeY - 40; // top of node circles

  return (
    <div className="relative w-full max-w-[420px] mx-auto">
      {/* SVG layer for connector lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 400 340"
        preserveAspectRatio="xMidYMid meet"
        style={{ zIndex: 0 }}
      >
        <defs>
          <linearGradient id="line-gradient-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-400)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--gold-600)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="line-gradient-energy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--energy-400)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--energy-600)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {nodePositions.map((pos, i) => {
          const quest = quests[i];
          const isCompleted = quest ? completed[quest.activity] : false;
          const isAvailable = quest && !isCompleted;

          // Curved path from rank badge to node
          const midY = (connStartY + connEndY) / 2;
          const path = `M ${rankCx} ${connStartY} C ${rankCx} ${midY}, ${pos.cx} ${midY}, ${pos.cx} ${connEndY}`;

          return (
            <path
              key={i}
              d={path}
              className={
                isCompleted
                  ? "connector-line--active"
                  : isAvailable
                    ? "connector-line--available"
                    : "connector-line"
              }
            />
          );
        })}
      </svg>

      {/* Content layer */}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* Rank Badge — top center */}
        <div className="flex justify-center pt-2 pb-8">
          <RankBadge level={level} totalXP={totalXP} progress={progress} />
        </div>

        {/* Quest Nodes — row of 3 */}
        <div className="flex justify-between items-start px-2 sm:px-4 pt-8">
          {quests.map((quest) => (
            <SkillNode
              key={quest.activity}
              icon={quest.icon}
              label={quest.label}
              xp={quest.xp}
              state={completed[quest.activity] ? "completed" : "available"}
              loading={processing === quest.activity}
              onClick={() => onComplete(quest)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
