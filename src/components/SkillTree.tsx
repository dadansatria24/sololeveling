"use client";

import type { SkillNode as SkillNodeType } from "@/lib/skillTree";
import SkillNode from "./SkillNode";
import TierHeader from "./TierHeader";

interface SkillTreeProps {
  nodes: SkillNodeType[];
  processing: string | null;
  editMode: boolean;
  onComplete: (node: SkillNodeType) => void;
  onEdit: (node: SkillNodeType) => void;
  onAddToTier: (tier: number) => void;
}

export default function SkillTree({
  nodes,
  processing,
  editMode,
  onComplete,
  onEdit,
  onAddToTier,
}: SkillTreeProps) {
  // Group nodes by tier
  const tiers = new Map<number, SkillNodeType[]>();
  for (const node of nodes) {
    const existing = tiers.get(node.tier) || [];
    existing.push(node);
    tiers.set(node.tier, existing);
  }

  // Sort tiers by number, and nodes within each tier by sort_order
  const sortedTierKeys = [...tiers.keys()].sort((a, b) => a - b);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {sortedTierKeys.map((tierNum, tierIndex) => {
        const tierNodes = tiers.get(tierNum)!;
        tierNodes.sort((a, b) => a.sort_order - b.sort_order);

        return (
          <div key={tierNum} className="animate-fade-in-up" style={{ animationDelay: `${tierIndex * 0.1}s`, animationFillMode: "backwards" }}>
            {/* Tier connector line from previous tier */}
            {tierIndex > 0 && (
              <div className="flex justify-center py-2">
                <div
                  style={{
                    width: 2,
                    height: 32,
                    background: "linear-gradient(180deg, var(--gold-700), var(--steel-800))",
                    borderRadius: 1,
                  }}
                />
              </div>
            )}

            {/* Tier Header */}
            <TierHeader tier={tierNum} />

            {/* Nodes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 px-2 py-3">
              {tierNodes.map((node) => (
                <SkillNode
                  key={node.id}
                  icon={node.icon}
                  label={node.title}
                  xp={node.xp_reward}
                  timesCompleted={node.times_completed}
                  loading={processing === node.id}
                  editMode={editMode}
                  isUnlocked={node.is_unlocked}
                  onClick={() => onComplete(node)}
                  onEdit={() => onEdit(node)}
                />
              ))}

              {/* Add Node button (edit mode only) */}
              {editMode && (
                <button
                  onClick={() => onAddToTier(tierNum)}
                  className="skill-node"
                  style={{ opacity: 0.6 }}
                >
                  <div
                    className="skill-node__circle"
                    style={{
                      borderStyle: "dashed",
                      borderColor: "var(--energy-400)",
                      background: "transparent",
                    }}
                  >
                    <span style={{ fontSize: 28, color: "var(--energy-400)" }}>+</span>
                  </div>
                  <span className="skill-node__label" style={{ color: "var(--energy-400)" }}>
                    Add Skill
                  </span>
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add new tier button in edit mode */}
      {editMode && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => {
              const maxTier = sortedTierKeys.length > 0 ? sortedTierKeys[sortedTierKeys.length - 1] : 0;
              onAddToTier(maxTier + 1);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              color: "var(--energy-300)",
              border: "1px dashed var(--energy-500)",
              background: "rgba(139, 92, 246, 0.05)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
              e.currentTarget.style.borderColor = "var(--energy-300)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(139, 92, 246, 0.05)";
              e.currentTarget.style.borderColor = "var(--energy-500)";
            }}
          >
            + Add New Tier
          </button>
        </div>
      )}
    </div>
  );
}
