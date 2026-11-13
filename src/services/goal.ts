import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GoalItem, User } from '../types/phmly';
import { GOAL_RANKING_CATEGORIES, EMPTY_GOAL_STATE } from '../constants/design';

export { GOAL_RANKING_CATEGORIES, EMPTY_GOAL_STATE };

/**
 * Fetch goals for a room on a specific date (YYYY-MM-DD).
 */
export async function getRoomGoals(roomId: string, dateStr: string): Promise<GoalItem[]> {
  if (!isSupabaseConfigured || !roomId) return [];

  const { data: rows, error } = await supabase
    .from('goals')
    .select('*')
    .eq('room_id', roomId)
    .eq('goal_date', dateStr)
    .order('created_at', { ascending: true });

  if (error || !rows) {
    console.error('Failed to fetch goals:', error);
    return [];
  }

  return rows.map((g: any) => ({
    id: g.id,
    roomId: g.room_id,
    ownerId: g.user_id,
    text: g.title,
    date: g.goal_date,
    completed: Boolean(g.is_completed),
    completedAt: g.completed_at
      ? new Date(g.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : undefined,
  }));
}

/**
 * Add a daily goal in a goal tracker room.
 */
export async function addGoal(data: {
  roomId: string;
  userId: string;
  text: string;
  dateStr: string;
}): Promise<GoalItem | null> {
  if (!isSupabaseConfigured) return null;

  const { data: row, error } = await supabase
    .from('goals')
    .insert({
      room_id: data.roomId,
      user_id: data.userId,
      title: data.text.trim(),
      goal_date: data.dateStr,
      is_completed: false,
    })
    .select()
    .single();

  if (error || !row) throw error;

  return {
    id: row.id,
    roomId: row.room_id,
    ownerId: row.user_id,
    text: row.title,
    date: row.goal_date,
    completed: false,
  };
}

/**
 * Update personal goal text.
 */
export async function updateGoal(
  goalId: string,
  newTitle: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !goalId) return false;

  const { error } = await supabase
    .from('goals')
    .update({ title: newTitle.trim() })
    .eq('id', goalId);

  return !error;
}

/**
 * Toggle goal completion status.
 */
export async function toggleGoalCompletion(
  goalId: string,
  nextCompletedState?: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured || !goalId) return false;

  let nextCompleted = nextCompletedState;
  if (nextCompleted === undefined) {
    const { data: cur } = await supabase
      .from('goals')
      .select('is_completed')
      .eq('id', goalId)
      .single();
    nextCompleted = !cur?.is_completed;
  }

  const completedAt = nextCompleted ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('goals')
    .update({
      is_completed: nextCompleted,
      completed_at: completedAt,
    })
    .eq('id', goalId);

  return !error;
}

/**
 * Delete a goal.
 */
export async function deleteGoal(goalId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !goalId) return false;
  const { error } = await supabase.from('goals').delete().eq('id', goalId);
  return !error;
}

export interface MemberGoalSummary {
  member: User;
  goals: GoalItem[];
  totalCount: number;
  completedCount: number;
}

export interface GoalRankingResult {
  topMembers: MemberGoalSummary[];
  goodMembers: MemberGoalSummary[];
  zeroMembers: MemberGoalSummary[];
  membersWithNoGoals: MemberGoalSummary[];
  totalCompleted: number;
  totalGoals: number;
  nobodyCompletedAny: boolean;
}

/**
 * Calculate rankings from goals list preserving exact PHMLY labels and tied ranks.
 */
export function calculateGoalRankings(
  members: User[],
  goals: GoalItem[]
): GoalRankingResult {
  const memberSummaries: MemberGoalSummary[] = members.map((member) => {
    const memberGoals = goals.filter((g) => g.ownerId === member.id);
    const completedCount = memberGoals.filter((g) => g.completed).length;
    return {
      member,
      goals: memberGoals,
      totalCount: memberGoals.length,
      completedCount,
    };
  });

  const totalCompleted = goals.filter((g) => g.completed).length;
  const totalGoals = goals.length;
  const nobodyCompletedAny = totalCompleted === 0;

  const membersWithGoals = memberSummaries.filter((m) => m.totalCount > 0);
  const membersWithNoGoals = memberSummaries.filter((m) => m.totalCount === 0);

  const maxCompleted = Math.max(0, ...membersWithGoals.map((m) => m.completedCount));

  // Category 1: "Naantha ipo ooroda top la irukura"
  const topMembers =
    maxCompleted > 0
      ? membersWithGoals.filter((m) => m.completedCount === maxCompleted)
      : [];

  // Category 2: "Vaalthukal vaalthukal"
  const goodMembers =
    maxCompleted > 0
      ? membersWithGoals.filter((m) => m.completedCount > 0 && m.completedCount < maxCompleted)
      : [];

  // Category 3: "Choplangii ta bro"
  const zeroMembers = membersWithGoals.filter((m) => m.completedCount === 0);

  return {
    topMembers,
    goodMembers,
    zeroMembers,
    membersWithNoGoals,
    totalCompleted,
    totalGoals,
    nobodyCompletedAny,
  };
}

/**
 * Realtime subscription to goals table for the room.
 */
export function subscribeToRoomGoals(
  roomId: string,
  onGoalChange: () => void
) {
  if (!isSupabaseConfigured || !roomId) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`goals:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `room_id=eq.${roomId}`,
      },
      () => onGoalChange()
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
