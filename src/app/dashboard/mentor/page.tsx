"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { fetchUserTree, addNode, updateNode, deleteNode, type SkillNode } from "@/lib/skillTree";
import SkillTree from "@/components/SkillTree";
import NodeEditor from "@/components/NodeEditor";

interface Student {
  id: string;
  display_name: string;
  xp: number;
  level: number;
}

export default function MentorDashboard() {
  const router = useRouter();
  const [mentorName, setMentorName] = useState("Void General");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentNodes, setStudentNodes] = useState<SkillNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<SkillNode | null>(null);
  const [addToTier, setAddToTier] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Check if current user is indeed a mentor
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "mentor") {
        router.replace("/dashboard");
        return;
      }

      if (profile.display_name) {
        setMentorName(profile.display_name);
      }

      await loadStudents();
      setLoading(false);
    };

    init();
  }, [router]);

  const loadStudents = async () => {
    // Fetch all students who opted for "Guided by Mentor"
    const { data, error: stError } = await supabase
      .from("profiles")
      .select("id, display_name, xp, level")
      .eq("is_guided", true)
      .eq("role", "user");

    if (stError) {
      setError(stError.message);
      return;
    }

    setStudents(data || []);
  };

  const loadStudentTree = async (studentId: string) => {
    const { nodes: treeNodes } = await fetchUserTree(studentId);
    setStudentNodes(treeNodes);
  };

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    await loadStudentTree(student.id);
  };

  // Node editing
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
    is_unlocked?: boolean;
  }) => {
    if (!selectedStudent) return;
    setSaving(true);

    if (editingNode) {
      // Update node (mentor can change unlocked status too)
      await updateNode(editingNode.id, {
        ...data,
      });
    } else {
      // Add new node (starts as locked by default for guided student)
      const nodesInTier = studentNodes.filter((n) => n.tier === data.tier);
      await addNode(selectedStudent.id, {
        ...data,
        is_unlocked: data.is_unlocked ?? false, // default to locked when created by mentor
        sort_order: nodesInTier.length + 1,
      });
    }

    await loadStudentTree(selectedStudent.id);
    setEditorOpen(false);
    setEditingNode(null);
    setSaving(false);
  };

  const handleDeleteNode = async () => {
    if (!editingNode || !selectedStudent) return;
    await deleteNode(editingNode.id);
    await loadStudentTree(selectedStudent.id);
    setEditorOpen(false);
    setEditingNode(null);
  };

  const handleToggleLock = async (node: SkillNode) => {
    if (!selectedStudent) return;
    const newLockState = !node.is_unlocked;

    // Toggle unlock status directly
    await updateNode(node.id, { is_unlocked: newLockState });

    // Instantly update tree state
    setStudentNodes((prev) =>
      prev.map((n) => (n.id === node.id ? { ...n, is_unlocked: newLockState } : n))
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vignette">
        <div className="spinner-warrior" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-vignette">
      {/* Mentor Node Editor */}
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
          // We will update NodeEditor to accept extra mentor controls
          isMentor={true}
        />
      )}

      {/* Header */}
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
        <div className="flex items-center gap-3">
          <Image
            src="/image/mentor.png"
            alt="Mentor Avatar"
            width={36}
            height={36}
            className="rounded-full border object-cover h-9 w-9"
            style={{ borderColor: "var(--gold-500)" }}
          />
          <div>
            <h1
              className="text-sm font-bold tracking-wider font-[family-name:var(--font-cinzel)]"
              style={{ color: "var(--gold-300)" }}
            >
              Mentor Dashboard
            </h1>
            <p className="text-[10px]" style={{ color: "var(--steel-500)" }}>
              General: {mentorName}
            </p>
          </div>
        </div>

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
      </header>

      {/* Workspace */}
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left: Students List */}
        <section
          className="w-full md:w-64 border-r p-4 space-y-4 shrink-0"
          style={{ borderColor: "var(--steel-800)", background: "rgba(12, 12, 24, 0.3)" }}
        >
          <h2
            className="text-xs font-bold uppercase tracking-wider font-[family-name:var(--font-cinzel)]"
            style={{ color: "var(--steel-400)" }}
          >
            Guided Students
          </h2>

          {students.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--steel-600)" }}>
              No students under your guidance yet.
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => {
                const isActive = selectedStudent?.id === student.id;
                return (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-left border transition-all"
                    style={{
                      background: isActive ? "rgba(245, 183, 49, 0.08)" : "var(--bg-card)",
                      borderColor: isActive ? "var(--gold-400)" : "var(--steel-800)",
                    }}
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{student.display_name}</p>
                      <p className="text-[10px]" style={{ color: "var(--steel-500)" }}>
                        Level {student.level} &middot; {student.xp} XP
                      </p>
                    </div>
                    {isActive && <span style={{ color: "var(--gold-300)" }}>▶</span>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Selected Student Skill Tree */}
        <section className="flex-1 p-6 overflow-y-auto">
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Student overview banner */}
              <div
                className="flex items-center justify-between rounded-2xl p-5 border"
                style={{
                  background: "linear-gradient(135deg, rgba(245, 183, 49, 0.04), rgba(6, 6, 12, 0.8))",
                  borderColor: "var(--gold-700)",
                }}
              >
                <div>
                  <h2
                    className="text-lg font-bold font-[family-name:var(--font-cinzel)]"
                    style={{ color: "var(--gold-300)" }}
                  >
                    {selectedStudent.display_name}&apos;s Path
                  </h2>
                  <p className="text-xs" style={{ color: "var(--steel-500)" }}>
                    Unlock skill tree nodes to let the student progress. Newly added skills default to locked.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider block" style={{ color: "var(--steel-500)" }}>
                    Student Level
                  </span>
                  <span className="text-2xl font-bold font-[family-name:var(--font-cinzel)]" style={{ color: "var(--gold-400)" }}>
                    {selectedStudent.level}
                  </span>
                </div>
              </div>

              {/* Lock/Unlock quick toggle info */}
              <p className="text-xs text-center" style={{ color: "var(--energy-300)" }}>
                💡 TIP: Click on any node circle to quick toggle its Lock/Unlock status. Long-press/Edit node to change title/XP details.
              </p>

              {/* Student Skill Tree view */}
              <div className="border border-zinc-900 rounded-2xl p-4 bg-zinc-950/30">
                <SkillTree
                  nodes={studentNodes}
                  processing={null}
                  editMode={true} // Mentor has full editing rights
                  onComplete={handleToggleLock} // Mentor clicks node to toggle lock/unlock
                  onEdit={handleEditNode}
                  onAddToTier={handleAddToTier}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-4xl mb-3">🐲</p>
              <p className="text-sm font-semibold" style={{ color: "var(--steel-400)" }}>
                Select a student from the sidebar
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--steel-600)" }}>
                You will be able to construct their path and unlock achievements.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
