import React, { useState, useEffect, useCallback } from 'react';
import { Target, Trophy, Flame, Plus, CheckCircle2, Circle, Clock, Sparkles, Smile, Trash2 } from 'lucide-react';
import { Room, GoalItem, User } from '../../types';
import { StorageService, getTodayDateString } from '../../services/storage';
import { Avatar } from '../common/Avatar';
import { GOAL_RANKING_CATEGORIES, EMPTY_GOAL_STATE } from '../../constants/design';
import {
  getRoomGoals,
  addGoal,
  toggleGoalCompletion,
  deleteGoal,
  subscribeToRoomGoals,
} from '../../services/goal';
import { getRoomMembers } from '../../services/room';
import { isSupabaseConfigured } from '../../lib/supabase';

interface GoalTrackerRoomProps {
  room: Room;
  currentUser: User;
}

export const GoalTrackerRoom: React.FC<GoalTrackerRoomProps> = ({
  room,
  currentUser,
}) => {
  const todayStr = getTodayDateString();
  const [goals, setGoals] = useState<GoalItem[]>(() =>
    StorageService.getGoals(room.id, todayStr)
  );
  const [newGoalText, setNewGoalText] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [currentTab, setCurrentTab] = useState<'grind' | 'ranking'>('grind');
  const [members, setMembers] = useState<User[]>(() => {
    return room.memberIds.map((id) => StorageService.getUserById(id)).filter(Boolean) as User[];
  });

  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const loadGoals = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const sbGoals = await getRoomGoals(room.id, todayStr);
        setGoals(sbGoals);
        return;
      } catch (err) {
        console.warn('Failed to load Supabase goals, falling back:', err);
      }
    }
    const list = StorageService.getGoals(room.id, todayStr);
    setGoals(list);
  }, [room.id, todayStr]);

  useEffect(() => {
    loadGoals();

    if (isSupabaseConfigured) {
      getRoomMembers(room.id)
        .then((res) => {
          if (res && res.length > 0) setMembers(res);
        })
        .catch(console.warn);

      const sub = subscribeToRoomGoals(room.id, () => {
        loadGoals();
      });
      return () => {
        sub.unsubscribe();
      };
    }
  }, [room.id, loadGoals]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;

    const text = newGoalText.trim();
    try {
      if (isSupabaseConfigured) {
        await addGoal({
          roomId: room.id,
          userId: currentUser.id,
          text,
          dateStr: todayStr,
        });
      }
    } catch (err) {
      console.warn('Supabase addGoal failed:', err);
    }

    StorageService.addGoal({
      roomId: room.id,
      ownerId: currentUser.id,
      text,
      date: todayStr,
      completed: false,
    });

    setNewGoalText('');
    setShowAddInput(false);
    await loadGoals();
  };

  const handleToggleGoal = async (goalId: string, currentCompleted?: boolean) => {
    const target = goals.find((g) => g.id === goalId);
    const completed = currentCompleted !== undefined ? !currentCompleted : !(target?.completed ?? false);
    try {
      if (isSupabaseConfigured) {
        await toggleGoalCompletion(goalId, completed);
      }
    } catch (err) {
      console.warn('Supabase toggleGoalCompletion failed:', err);
    }
    StorageService.toggleGoal(goalId);
    await loadGoals();
  };

  const handleDeleteGoal = async (e: React.MouseEvent, goalId: string) => {
    e.stopPropagation();
    try {
      if (isSupabaseConfigured) {
        await deleteGoal(goalId);
      }
    } catch (err) {
      console.warn('Supabase deleteGoal failed:', err);
    }
    StorageService.deleteGoal(goalId);
    await loadGoals();
  };

  const roomMembers = members.length > 0
    ? members
    : (room.memberIds.map((id) => StorageService.getUserById(id)).filter(Boolean) as User[]);

  const goalsByMember = roomMembers.map((member) => {
    const memberGoals = goals.filter((g) => g.ownerId === member.id);
    const completedCount = memberGoals.filter((g) => g.completed).length;
    return {
      member,
      goals: memberGoals,
      totalCount: memberGoals.length,
      completedCount,
    };
  });

  const totalCompletedGoals = goals.filter((g) => g.completed).length;
  const totalGoals = goals.length;

  const membersWithGoals = goalsByMember.filter((m) => m.totalCount > 0);
  const membersWithNoGoals = goalsByMember.filter((m) => m.totalCount === 0);

  const maxCompleted = Math.max(0, ...membersWithGoals.map((m) => m.completedCount));

  const topMembers = maxCompleted > 0
    ? membersWithGoals.filter((m) => m.completedCount === maxCompleted)
    : [];

  const goodMembers = maxCompleted > 0
    ? membersWithGoals.filter((m) => m.completedCount > 0 && m.completedCount < maxCompleted)
    : [];

  const zeroMembers = membersWithGoals.filter((m) => m.completedCount === 0);

  const nobodyCompletedAny = totalCompletedGoals === 0;

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar bg-phmly-bg transition-colors">
      {/* Top Banner: Date, Grind Heading & Summary */}
      <div className="bg-phmly-surface border border-phmly-border rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-goldenRush text-metadata font-medium tracking-wide">
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
            <h2 className="text-page-title font-semibold text-phmly-text mt-0.5">
              Today's Grind 🔥
            </h2>
          </div>

          {/* Quick tab switcher: Daily Grind vs Ranking */}
          <div className="flex items-center gap-1.5 bg-phmly-subtle p-1 rounded-xl border border-phmly-border self-start sm:self-auto">
            <button
              onClick={() => setCurrentTab('grind')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'grind'
                  ? 'bg-phmly-surface text-phmly-text shadow-xs'
                  : 'text-phmly-muted hover:text-phmly-text'
              }`}
            >
              Checklist
            </button>
            <button
              onClick={() => setCurrentTab('ranking')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'ranking'
                  ? 'bg-goldenRush text-forestBlack shadow-xs font-bold'
                  : 'text-phmly-muted hover:text-phmly-text'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Daily Ranking</span>
            </button>
          </div>
        </div>

        {/* Progress Summary Pill */}
        <div className="mt-3.5 pt-3 border-t border-phmly-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-phmly-muted">
            <CheckCircle2 className="w-4 h-4 text-goldenRush" />
            <span>
              <strong className="text-phmly-text font-semibold">{totalCompletedGoals}</strong> of{' '}
              <strong className="text-phmly-text font-semibold">{totalGoals}</strong> group goals finished today
            </span>
          </div>

          <button
            onClick={() => setShowAddInput(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-goldenRush text-forestBlack font-semibold hover:bg-amberGlow transition-transform active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add My Goal</span>
          </button>
        </div>
      </div>

      {/* Add Goal Drawer */}
      {showAddInput && (
        <div className="bg-phmly-surface border border-goldenRush/40 rounded-2xl p-3.5 shadow-md animate-fadeIn">
          <h3 className="text-xs font-bold text-goldenRush uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Set a Goal for Today
          </h3>
          <form onSubmit={handleAddGoal} className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              placeholder="e.g. Finish 2 problem sets, read chapter..."
              className="flex-1 bg-phmly-subtle text-phmly-text text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-goldenRush text-forestBlack font-semibold text-xs hover:bg-amberGlow shrink-0"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddInput(false);
                setNewGoalText('');
              }}
              className="px-2.5 py-2 rounded-xl text-xs text-phmly-muted hover:text-phmly-text"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* TAB 1: DAILY GRIND (List by Member) */}
      {currentTab === 'grind' && (
        <div className="space-y-3">
          {goalsByMember.map(({ member, goals: mGoals, completedCount, totalCount }) => {
            const isMe = member.id === currentUser.id;

            return (
              <div
                key={member.id}
                className={`bg-phmly-surface border rounded-2xl p-4 shadow-xs transition-all ${
                  isMe ? 'border-goldenRush/50 ring-1 ring-goldenRush/20' : 'border-phmly-border'
                }`}
              >
                {/* Member Header (Member name: 14px medium, completion: 12px) */}
                <div className="flex items-center justify-between pb-2.5 border-b border-phmly-border/70">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={member.avatar} name={member.name} size="sm" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-phmly-text text-secondary">
                          {member.name}
                        </span>
                        {isMe && (
                          <span className="text-caption font-medium text-goldenRush bg-goldenRush/10 px-1.5 py-0.2 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-metadata text-phmly-muted font-normal">
                        {completedCount} of {totalCount} completed
                      </p>
                    </div>
                  </div>

                  {totalCount > 0 && (
                    <span
                      className={`text-caption font-mono font-medium px-2 py-0.5 rounded-lg ${
                        completedCount === totalCount
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : completedCount > 0
                          ? 'bg-amberGlow/15 text-amberGlow'
                          : 'bg-phmly-subtle text-phmly-muted'
                      }`}
                    >
                      {Math.round((completedCount / totalCount) * 100)}%
                    </span>
                  )}
                </div>

                {/* Goals List (Goal title: 15px medium) */}
                <div className="mt-2.5 space-y-1.5">
                  {mGoals.length === 0 ? (
                    <div className="py-2 text-secondary text-phmly-muted italic flex items-center justify-between">
                      <span>No goals added yet today.</span>
                      {isMe && (
                        <button
                          onClick={() => setShowAddInput(true)}
                          className="text-goldenRush font-medium hover:underline text-secondary"
                        >
                          + Add a goal
                        </button>
                      )}
                    </div>
                  ) : (
                    mGoals.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => isMe && handleToggleGoal(g.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-body transition-all ${
                          isMe ? 'cursor-pointer hover:border-goldenRush/40' : 'cursor-default'
                        } ${
                          g.completed
                            ? 'bg-phmly-subtle/40 border-phmly-border/60 text-phmly-muted'
                            : 'bg-phmly-subtle/80 border-phmly-border text-phmly-text'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isMe ? (
                            <button
                              type="button"
                              className="text-goldenRush focus:outline-none shrink-0"
                            >
                              {g.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-goldenRush fill-goldenRush/20" />
                              ) : (
                                <Circle className="w-4 h-4 text-phmly-muted" />
                              )}
                            </button>
                          ) : (
                            <span className="text-phmly-muted shrink-0">
                              {g.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-phmly-muted/40" />
                              )}
                            </span>
                          )}

                          <span className={`truncate text-body ${g.completed ? 'line-through text-phmly-muted font-normal' : 'font-medium'}`}>
                            {g.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          {g.completed ? (
                            <span className="text-caption text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              Done {g.completedAt || ''}
                            </span>
                          ) : (
                            <span className="text-caption text-phmly-muted font-normal">Pending</span>
                          )}

                          {isMe && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteGoal(e, g.id)}
                              title="Delete goal"
                              className="p-1 rounded text-phmly-muted hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: DAILY RANKING (Exact 3 categories & empty-achievement state) */}
      {currentTab === 'ranking' && (
        <div className="space-y-4 animate-fadeIn">
          {nobodyCompletedAny ? (
            <div className="bg-phmly-surface border border-goldenRush/30 rounded-2xl p-6 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-goldenRush/10 border border-goldenRush/30 flex items-center justify-center mx-auto text-2xl">
                😭
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-goldenRush tracking-tight">
                  {EMPTY_GOAL_STATE.headline}
                </h3>
                <p className="text-xs sm:text-sm text-phmly-text font-semibold mt-1.5">
                  {EMPTY_GOAL_STATE.motivational}
                </p>
                <p className="text-xs text-phmly-muted mt-1">
                  Nobody in the room has checked off any goals yet today.
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => {
                    setCurrentTab('grind');
                    setShowAddInput(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-goldenRush text-forestBlack font-semibold text-xs hover:bg-amberGlow transition-transform active:scale-95 shadow-xs"
                >
                  {EMPTY_GOAL_STATE.actionButton}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Category 1: Naantha ipo ooroda top la irukura */}
              <div className="bg-phmly-surface border-2 border-goldenRush rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2.5 border-b border-goldenRush/20">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-goldenRush" />
                    <h3 className="text-section font-semibold text-goldenRush tracking-tight">
                      {GOAL_RANKING_CATEGORIES.TOP}
                    </h3>
                  </div>
                  <span className="text-caption font-medium bg-goldenRush text-forestBlack px-2 py-0.5 rounded-full">
                    Crown Tier
                  </span>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  {topMembers.map((m) => (
                    <div
                      key={m.member.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-phmly-subtle/80 border border-goldenRush/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar src={m.member.avatar} name={m.member.name} size="sm" />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-phmly-text text-secondary">
                              {m.member.name}
                            </span>
                            {m.member.id === currentUser.id && (
                              <span className="text-caption text-goldenRush font-medium bg-goldenRush/10 px-1 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-secondary text-goldenRush font-medium">
                            🏆 Leading with {m.completedCount} completed goal{m.completedCount > 1 ? 's' : ''}!
                          </p>
                        </div>
                      </div>
                      <span className="text-secondary font-mono font-medium text-goldenRush bg-goldenRush/15 px-2.5 py-1 rounded-lg border border-goldenRush/30">
                        {m.completedCount} / {m.totalCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category 2: Vaalthukal vaalthukal */}
              {goodMembers.length > 0 && (
                <div className="bg-phmly-surface border border-amberGlow/50 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-phmly-border">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amberGlow" />
                      <h3 className="text-secondary font-semibold text-amberGlow">
                        {GOAL_RANKING_CATEGORIES.GOOD}
                      </h3>
                    </div>
                    <span className="text-caption font-medium text-amberGlow bg-amberGlow/10 px-2 py-0.5 rounded-full">
                      Solid Work
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    {goodMembers.map((m) => (
                      <div
                        key={m.member.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-phmly-subtle/50 border border-phmly-border text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar src={m.member.avatar} name={m.member.name} size="xs" />
                          <span className="font-medium text-phmly-text">{m.member.name}</span>
                        </div>
                        <span className="text-xs font-mono text-amberGlow font-semibold">
                          {m.completedCount} done
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: Choplangii ta bro */}
              {zeroMembers.length > 0 && (
                <div className="bg-phmly-surface border border-phmly-border rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-phmly-border">
                    <div className="flex items-center gap-1.5">
                      <Smile className="w-4 h-4 text-phmly-muted" />
                      <h3 className="text-xs sm:text-sm font-bold text-phmly-muted">
                        {GOAL_RANKING_CATEGORIES.ZERO}
                      </h3>
                    </div>
                    <span className="text-[10px] text-phmly-muted bg-phmly-subtle px-2 py-0.5 rounded-full">
                      Zero done yet
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    {zeroMembers.map((m) => (
                      <div
                        key={m.member.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-phmly-subtle/40 border border-phmly-border/60 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar src={m.member.avatar} name={m.member.name} size="xs" />
                          <span className="font-normal text-phmly-text">{m.member.name}</span>
                        </div>
                        <span className="text-[11px] text-phmly-muted font-mono">
                          0 / {m.totalCount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {membersWithNoGoals.length > 0 && (
            <div className="bg-phmly-subtle/50 border border-phmly-border rounded-xl p-2.5 text-xs text-phmly-muted">
              <span className="font-semibold text-phmly-text">No goals added yet: </span>
              {membersWithNoGoals.map((m) => m.member.name).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
