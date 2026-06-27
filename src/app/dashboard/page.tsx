"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { xpProgress, RANK_NAMES } from "@/lib/level";
import {
  fetchUserTree,
  completeNode,
  addNode,
  updateNode,
  deleteNode,
  seedTreeIfEmpty,
  type SkillNode,
} from "@/lib/skillTree";
import SkillTree from "@/components/SkillTree";
import RankBadge from "@/components/RankBadge";
import NodeEditor from "@/components/NodeEditor";

interface Profile {
  xp: number;
  level: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Skill tree state
  const [processing, setProcessing] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Node editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<SkillNode | null>(null);
  const [addToTier, setAddToTier] = useState(1);

  // Notifications
  const [xpMessage, setXpMessage] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [newLevelValue, setNewLevelValue] = useState(0);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================
  // Init: Auth → Profile → Skill Tree
  // ============================================

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("xp, level")
          .eq("id", user.id)
          .single();

        if (profileError) {
          setError(`Profile error: ${profileError.message}`);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Seed tree if user has no nodes (for existing users before v2)
        await seedTreeIfEmpty(user.id);

        // Fetch skill tree
        const { nodes: treeNodes, error: treeError } = await fetchUserTree(user.id);

        if (treeError) {
          setError(`Tree error: ${treeError}`);
          setLoading(false);
          return;
        }

        setNodes(treeNodes);
        setLoading(false);
      } catch (e) {
        setError(`Unexpected: ${e instanceof Error ? e.message : String(e)}`);
        setLoading(false);
      }
    };

    init();
  }, [router]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
      if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
    };
  }, []);

  // ============================================
  // Refresh helpers
  // ============================================

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("xp, level")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  }, [userId]);

  const refreshTree = useCallback(async () => {
    if (!userId) return;
    const { nodes: treeNodes } = await fetchUserTree(userId);
    setNodes(treeNodes);
  }, [userId]);

  // ============================================
  // Complete Node (Grind!)
  // ============================================

  const handleComplete = async (node: SkillNode) => {
    if (!userId || processing) return;

    setProcessing(node.id);
    setXpMessage(null);
    setLevelUp(false);

    const result = await completeNode(userId, node.id);

    if (result.error) {
      setXpMessage(result.error);
    } else if (result.data) {
      // Update local node state immediately
      setNodes((prev) =>
        prev.map((n) =>
          n.id === node.id
            ? { ...n, times_completed: result.data!.timesCompleted }
            : n
        )
      );

      setXpMessage(`+${result.data.xpGained} XP`);

      if (result.data.leveledUp) {
        setNewLevelValue(result.data.level);
        setLevelUp(true);
        if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
        levelUpTimer.current = setTimeout(() => setLevelUp(false), 3500);
      }

      await refreshProfile();
    }

    setProcessing(null);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setXpMessage(null), 2500);
  };

  // ============================================
  // Node Editor Handlers
  // ============================================

  const handleEditNode = (node: SkillNode) => {
    setEditingNode(node);
    setAddToTier(node.tier);
    setEditorOpen(true);
  };

  const handleAddToTier = (tier: number) => {
    setEditingNode(null);
    setAddToTier(tier);
    setEditorOpen(true);
  };

  const handleSaveNode = async (data: {
    title: string;
    description: string;
    icon: string;
    xp_reward: number;
    tier: number;
  }) => {
    if (!userId) return;

    if (editingNode) {
      // Update existing
      await updateNode(editingNode.id, data);
    } else {
      // Add new
      const nodesInTier = nodes.filter((n) => n.tier === data.tier);
      await addNode(userId, {
        ...data,
        sort_order: nodesInTier.length + 1,
      });
    }

    await refreshTree();
    setEditorOpen(false);
    setEditingNode(null);
  };

  const handleDeleteNode = async () => {
    if (!editingNode) return;
    await deleteNode(editingNode.id);
    await refreshTree();
    setEditorOpen(false);
    setEditingNode(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vignette">
        <div className="text-center space-y-4">
          <div className="spinner-warrior mx-auto" />
          <p className="text-sm" style={{ color: "var(--steel-500)" }}>Loading skill tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vignette px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-sm" style={{ color: "var(--blood-400)" }}>{error}</p>
          <p className="text-xs" style={{ color: "var(--steel-500)" }}>Run migration_v2.sql in Supabase SQL Editor first.</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const progress = xpProgress(profile.xp);
  const rankName = RANK_NAMES[profile.level] || `Rank ${profile.level}`;
  const totalCompletions = nodes.reduce((sum, n) => sum + n.times_completed, 0);

  return (
    <div className="flex min-h-screen flex-col bg-vignette">
      {/* Level Up Overlay */}
      {levelUp && (
        <div className="level-up-overlay" onClick={() => setLevelUp(false)}>
          <div className="level-up-overlay__ring" />
          <p className="level-up-overlay__text font-[family-name:var(--font-cinzel)]">
            Level Up!
          </p>
          <p className="level-up-overlay__subtitle">
            You reached {RANK_NAMES[newLevelValue] || `Level ${newLevelValue}`}
          </p>
        </div>
      )}

      {/* XP Toast */}
      {xpMessage && !levelUp && (
        <div className="xp-toast">{xpMessage}</div>
      )}

      {/* Node Editor Modal */}
      {editorOpen && (
        <NodeEditor
          node={editingNode}
          defaultTier={addToTier}
          onSave={handleSaveNode}
          onDelete={editingNode ? handleDeleteNode : null}
          onClose={() => {
            setEditorOpen(false);
            setEditingNode(null);
          }}
        />
      )}

      {/* Header / HUD */}
      <header
        className="flex items-center justify-between border-b px-4 sm:px-6 py-3"
        style={{
          borderColor: "var(--steel-800)",
          background: "rgba(6, 6, 12, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <h1
          className="text-lg font-bold tracking-wider font-[family-name:var(--font-cinzel)]"
          style={{ color: "var(--gold-300)" }}
        >
          Solo Leveling
        </h1>

        <div className="flex items-center gap-3">
          {/* Completions HUD */}
          <div className="hud-stat hidden sm:flex">
            <span className="hud-stat__value" style={{ color: "var(--energy-300)" }}>
              {totalCompletions}
            </span>
            <span className="hud-stat__label">Grinds</span>
          </div>

          {/* Rank HUD */}
          <div className="hud-stat">
            <span className="hud-stat__value text-sm" style={{ color: "var(--gold-400)" }}>
              {rankName}
            </span>
            <span className="hud-stat__label">Rank</span>
          </div>

          {/* Edit toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-xs font-semibold px-3 py-2 rounded-lg transition-all"
            style={{
              color: editMode ? "var(--bg-deep)" : "var(--energy-300)",
              background: editMode ? "var(--energy-400)" : "transparent",
              border: `1px solid ${editMode ? "var(--energy-300)" : "var(--steel-700)"}`,
              boxShadow: editMode ? "0 0 8px var(--energy-glow)" : "none",
            }}
          >
            {editMode ? "Done" : "Edit"}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            style={{ color: "var(--steel-500)", border: "1px solid var(--steel-800)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--blood-400)";
              e.currentTarget.style.borderColor = "var(--blood-500)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--steel-500)";
              e.currentTarget.style.borderColor = "var(--steel-800)";
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 sm:py-10 overflow-y-auto">
        {/* Rank Badge */}
        <div className="flex justify-center mb-8">
          <RankBadge level={profile.level} totalXP={profile.xp} progress={progress} />
        </div>

        {/* Edit mode banner */}
        {editMode && (
          <div
            className="max-w-2xl mx-auto mb-6 px-4 py-3 rounded-xl text-center animate-fade-in-up"
            style={{
              border: "1px solid var(--energy-500)",
              background: "rgba(139, 92, 246, 0.08)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--energy-300)" }}>
              ✏️ Edit Mode — Tap a skill to edit, or use &quot;Add Skill&quot; buttons
            </p>
          </div>
        )}

        {/* Skill Tree */}
        <SkillTree
          nodes={nodes}
          processing={processing}
          editMode={editMode}
          onComplete={handleComplete}
          onEdit={handleEditNode}
          onAddToTier={handleAddToTier}
        />

        {/* Footer label */}
        <p
          className="text-center mt-10 text-xs font-semibold tracking-widest uppercase"
          style={{ color: "var(--steel-600)" }}
        >
          English Mastery Path — Comics to IELTS
        </p>
      </main>
    </div>
  );
}
