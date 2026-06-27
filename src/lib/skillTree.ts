import { supabase } from "@/lib/supabase";
import { calculateLevel } from "@/lib/level";

// ============================================
// Types
// ============================================

export interface SkillNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  tier: number;
  sort_order: number;
  times_completed: number;
  is_public: boolean;
  is_unlocked: boolean;
  copied_from_id: string | null;
  created_at: string;
}

export interface NodeCompletion {
  id: string;
  user_id: string;
  node_id: string;
  xp_earned: number;
  completed_at: string;
}

export interface NewNodeInput {
  title: string;
  description?: string;
  icon?: string;
  xp_reward?: number;
  tier: number;
  sort_order?: number;
  parent_id?: string | null;
  is_unlocked?: boolean;
}

export interface UpdateNodeInput {
  title?: string;
  description?: string;
  icon?: string;
  xp_reward?: number;
  tier?: number;
  sort_order?: number;
  parent_id?: string | null;
  is_unlocked?: boolean;
  is_public?: boolean;
}

// ============================================
// Fetch full user tree
// ============================================

export async function fetchUserTree(userId: string): Promise<{
  nodes: SkillNode[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("skill_nodes")
    .select("*")
    .eq("user_id", userId)
    .order("tier", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return { nodes: [], error: error.message };
  }

  return { nodes: data as SkillNode[], error: null };
}

// ============================================
// Complete a node (grind — no limits!)
// ============================================

export async function completeNode(
  userId: string,
  nodeId: string
): Promise<{
  error: string | null;
  data: {
    xpGained: number;
    totalXP: number;
    level: number;
    leveledUp: boolean;
    timesCompleted: number;
  } | null;
}> {
  // 1. Fetch the node to get XP reward and lock status
  const { data: node, error: nodeError } = await supabase
    .from("skill_nodes")
    .select("xp_reward, times_completed, is_unlocked")
    .eq("id", nodeId)
    .single();

  if (nodeError || !node) {
    return { error: "Node not found", data: null };
  }

  // Guard against locked nodes (for mentor-guided students)
  if (!node.is_unlocked) {
    return { error: "This skill node is currently locked by your mentor", data: null };
  }

  const xpGained = node.xp_reward;
  const newTimesCompleted = node.times_completed + 1;

  // 2. Increment times_completed on the node
  const { error: updateNodeError } = await supabase
    .from("skill_nodes")
    .update({ times_completed: newTimesCompleted })
    .eq("id", nodeId);

  if (updateNodeError) {
    return { error: "Could not update node", data: null };
  }

  // 3. Log the completion
  const { error: logError } = await supabase
    .from("node_completions")
    .insert({
      user_id: userId,
      node_id: nodeId,
      xp_earned: xpGained,
    });

  if (logError) {
    return { error: "Could not log completion", data: null };
  }

  // 4. Update profile XP and level
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("xp, level")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { error: "Could not fetch profile", data: null };
  }

  const newTotalXP = profile.xp + xpGained;
  const newLevel = calculateLevel(newTotalXP);
  const leveledUp = newLevel > profile.level;

  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({ xp: newTotalXP, level: newLevel })
    .eq("id", userId);

  if (updateProfileError) {
    return { error: "Could not update XP", data: null };
  }

  return {
    error: null,
    data: {
      xpGained,
      totalXP: newTotalXP,
      level: newLevel,
      leveledUp,
      timesCompleted: newTimesCompleted,
    },
  };
}

// ============================================
// CRUD — Add / Update / Delete nodes
// ============================================

export async function addNode(
  userId: string,
  input: NewNodeInput
): Promise<{ node: SkillNode | null; error: string | null }> {
  const { data, error } = await supabase
    .from("skill_nodes")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? "",
      icon: input.icon ?? "📖",
      xp_reward: input.xp_reward ?? 10,
      tier: input.tier,
      sort_order: input.sort_order ?? 0,
      parent_id: input.parent_id ?? null,
      is_unlocked: input.is_unlocked ?? true,
    })
    .select()
    .single();

  if (error) {
    return { node: null, error: error.message };
  }

  return { node: data as SkillNode, error: null };
}

export async function updateNode(
  nodeId: string,
  updates: UpdateNodeInput
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("skill_nodes")
    .update(updates)
    .eq("id", nodeId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function deleteNode(
  nodeId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("skill_nodes")
    .delete()
    .eq("id", nodeId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// ============================================
// Share / Unshare tree
// ============================================

export async function shareUserTree(
  userId: string,
  isPublic: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("skill_nodes")
    .update({ is_public: isPublic })
    .eq("user_id", userId);

  return { error: error?.message || null };
}

// ============================================
// Copy public tree ("Buku Salinan")
// ============================================

export async function copyTreeFromUser(
  sourceUserId: string,
  targetUserId: string
): Promise<{ error: string | null }> {
  // 1. Fetch public source tree
  const { data: sourceNodes, error: fetchError } = await supabase
    .from("skill_nodes")
    .select("*")
    .eq("user_id", sourceUserId);

  if (fetchError || !sourceNodes || sourceNodes.length === 0) {
    return { error: fetchError?.message || "Source nodes not found or empty" };
  }

  // Clear existing tree first
  await supabase.from("skill_nodes").delete().eq("user_id", targetUserId);

  const nodeMappings: Record<string, string> = {};

  // 2. Copy nodes with parent_id = null first
  for (const node of sourceNodes) {
    const { data: newNode, error: insertError } = await supabase
      .from("skill_nodes")
      .insert({
        user_id: targetUserId,
        title: node.title,
        description: node.description,
        icon: node.icon,
        xp_reward: node.xp_reward,
        tier: node.tier,
        sort_order: node.sort_order,
        is_public: false, // target copy is private by default
        is_unlocked: true, // auto unlock for the copier
        copied_from_id: node.id,
        parent_id: null,
      })
      .select("id")
      .single();

    if (insertError || !newNode) {
      return { error: insertError?.message || "Failed to copy node" };
    }

    nodeMappings[node.id] = newNode.id;
  }

  // 3. Resolve parent relationships in copy
  for (const node of sourceNodes) {
    if (node.parent_id && nodeMappings[node.parent_id]) {
      const targetNodeId = nodeMappings[node.id];
      const targetParentId = nodeMappings[node.parent_id];

      const { error: updateError } = await supabase
        .from("skill_nodes")
        .update({ parent_id: targetParentId })
        .eq("id", targetNodeId);

      if (updateError) {
        return { error: updateError.message };
      }
    }
  }

  return { error: null };
}

// ============================================
// Seed tree for existing users (manual call)
// ============================================

export async function seedTreeIfEmpty(userId: string): Promise<void> {
  const { nodes } = await fetchUserTree(userId);
  if (nodes.length > 0) return;

  const defaultNodes: Omit<NewNodeInput, "parent_id">[] = [
    // Tier 1
    { title: "Read Comics", description: "Read English comics or manga with English translation", icon: "📖", xp_reward: 10, tier: 1, sort_order: 1 },
    { title: "Watch Cartoons", description: "Watch cartoons or anime with English subtitles", icon: "🎬", xp_reward: 10, tier: 1, sort_order: 2 },
    { title: "Listen to Songs", description: "Listen to English songs and read the lyrics", icon: "🎵", xp_reward: 10, tier: 1, sort_order: 3 },
    { title: "Learn Basic Words", description: "Study and memorize 10 new basic vocabulary words", icon: "📝", xp_reward: 10, tier: 1, sort_order: 4 },
    // Tier 2
    { title: "Read Simple Stories", description: "Read simple English short stories or graded readers", icon: "📕", xp_reward: 15, tier: 2, sort_order: 1 },
    { title: "Watch YouTube", description: "Watch English YouTube videos (vlogs, tutorials)", icon: "📺", xp_reward: 15, tier: 2, sort_order: 2 },
    { title: "Basic Conversation", description: "Practice basic English conversation", icon: "💬", xp_reward: 15, tier: 2, sort_order: 3 },
    { title: "Grammar Basics", description: "Study basic grammar rules", icon: "📐", xp_reward: 15, tier: 2, sort_order: 4 },
    // Tier 3
    { title: "Read Articles", description: "Read short English articles or blog posts", icon: "📰", xp_reward: 20, tier: 3, sort_order: 1 },
    { title: "Simple Podcasts", description: "Listen to beginner-friendly English podcasts", icon: "🎧", xp_reward: 20, tier: 3, sort_order: 2 },
    { title: "Write Paragraphs", description: "Write short paragraphs in English", icon: "✍️", xp_reward: 20, tier: 3, sort_order: 3 },
    { title: "Speak with Partner", description: "Practice speaking English with a partner", icon: "🗣️", xp_reward: 20, tier: 3, sort_order: 4 },
    // Tier 4
    { title: "Read News", description: "Read English news articles (BBC, CNN, etc.)", icon: "📰", xp_reward: 30, tier: 4, sort_order: 1 },
    { title: "Intermediate Podcasts", description: "Listen to intermediate podcasts or TED Talks", icon: "🎧", xp_reward: 30, tier: 4, sort_order: 2 },
    { title: "Write Essays", description: "Write English essays (300+ words)", icon: "📝", xp_reward: 30, tier: 4, sort_order: 3 },
    { title: "Give Presentations", description: "Practice giving presentations in English", icon: "🎤", xp_reward: 30, tier: 4, sort_order: 4 },
    // Tier 5
    { title: "Academic Articles", description: "Read academic or research articles in English", icon: "📚", xp_reward: 40, tier: 5, sort_order: 1 },
    { title: "Listen to Lectures", description: "Watch university lectures in English", icon: "🎓", xp_reward: 40, tier: 5, sort_order: 2 },
    { title: "Academic Writing", description: "Write formal academic essays", icon: "✍️", xp_reward: 40, tier: 5, sort_order: 3 },
    { title: "Debate Practice", description: "Practice debate on complex topics", icon: "🗣️", xp_reward: 40, tier: 5, sort_order: 4 },
    // Tier 6
    { title: "IELTS Reading", description: "Practice IELTS Reading test sections", icon: "📖", xp_reward: 50, tier: 6, sort_order: 1 },
    { title: "IELTS Listening", description: "Practice IELTS Listening test sections", icon: "🎧", xp_reward: 50, tier: 6, sort_order: 2 },
    { title: "IELTS Writing", description: "Practice IELTS Writing Task 1 and Task 2", icon: "✍️", xp_reward: 50, tier: 6, sort_order: 3 },
    { title: "IELTS Speaking", description: "Practice IELTS Speaking mock interviews", icon: "🎤", xp_reward: 50, tier: 6, sort_order: 4 },
  ];

  for (const node of defaultNodes) {
    await addNode(userId, node);
  }
}
