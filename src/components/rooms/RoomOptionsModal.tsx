import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Shield,
  Copy,
  Check,
  Trash2,
  LogOut,
  Key,
  RefreshCw,
  Link as LinkIcon,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Room, User } from '../../types';
import { StorageService } from '../../services/storage';
import { Avatar } from '../common/Avatar';
import { LIMITS, ROOM_TYPE_META } from '../../constants/design';
import {
  deleteRoom as deleteSupabaseRoom,
  leaveRoom as leaveSupabaseRoom,
  rotateRoomInvite,
  getRoomMembers,
} from '../../services/room';
import { isSupabaseConfigured } from '../../lib/supabase';

interface RoomOptionsModalProps {
  room: Room;
  currentUser?: User | null;
  onClose: () => void;
  onRoomUpdated: () => void;
  onLeaveOrDelete?: () => void;
}

export const RoomOptionsModal: React.FC<RoomOptionsModalProps> = ({
  room,
  currentUser,
  onClose,
  onRoomUpdated,
  onLeaveOrDelete,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [liveInviteCode, setLiveInviteCode] = useState(
    room.inviteCode || room.id.slice(0, 8).toUpperCase()
  );
  const [realMembers, setRealMembers] = useState<User[]>([]);

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<'delete' | 'leave' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeUser = currentUser || StorageService.getCurrentUser();
  const isOwner = Boolean(
    activeUser && (room.ownerId === activeUser.id || (room as any).owner_id === activeUser.id)
  );

  useEffect(() => {
    let isMounted = true;
    if (isSupabaseConfigured) {
      getRoomMembers(room.id)
        .then((members) => {
          if (isMounted && members && members.length > 0) {
            setRealMembers(members);
          }
        })
        .catch((err) => console.warn('Failed to load real members:', err));
    }
    return () => {
      isMounted = false;
    };
  }, [room.id]);

  const roomMembers =
    realMembers.length > 0
      ? realMembers
      : (room.memberIds?.map((id) => StorageService.getUserById(id)).filter(Boolean) as User[]) || [];

  // Determine if active user is an invited member (in room, but not owner)
  const isInvitedMember = Boolean(
    activeUser &&
      !isOwner &&
      (room.memberIds?.includes(activeUser.id) || realMembers.some((m) => m.id === activeUser.id))
  );

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText?.(liveInviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRotateInvite = async () => {
    if (!isOwner || isRotating) return;
    setIsRotating(true);
    setInviteError(null);

    try {
      if (isSupabaseConfigured) {
        const res = await rotateRoomInvite(room.id);
        if (res.success && res.inviteCode) {
          setLiveInviteCode(res.inviteCode);
          onRoomUpdated();
        } else {
          setInviteError(res.error || 'Failed to rotate invite code');
        }
      } else {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        setLiveInviteCode(newCode);
        onRoomUpdated();
      }
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to rotate invite code');
    } finally {
      setIsRotating(false);
    }
  };

  // Perform confirmed deletion (Creator only)
  const handleConfirmDelete = async () => {
    if (!isOwner || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      if (isSupabaseConfigured) {
        const res = await deleteSupabaseRoom(room.id);
        if (!res.success) {
          setActionError(res.error || 'Failed to delete room. Please try again.');
          setIsSubmitting(false);
          return;
        }
      } else {
        StorageService.deleteRoom(room.id);
      }

      setConfirmAction(null);
      onClose();
      if (onLeaveOrDelete) {
        onLeaveOrDelete();
      } else {
        onRoomUpdated();
      }
    } catch (err: any) {
      setActionError(err?.message || 'An unexpected error occurred while deleting the room.');
      setIsSubmitting(false);
    }
  };

  // Perform confirmed leave (Invited member only)
  const handleConfirmLeave = async () => {
    if (!isInvitedMember || isSubmitting || !activeUser) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      if (isSupabaseConfigured) {
        const res = await leaveSupabaseRoom(room.id, activeUser.id);
        if (!res.success) {
          setActionError(res.error || 'Failed to leave room. Please try again.');
          setIsSubmitting(false);
          return;
        }
      } else {
        StorageService.leaveRoom(room.id, activeUser.id);
      }

      setConfirmAction(null);
      onClose();
      if (onLeaveOrDelete) {
        onLeaveOrDelete();
      } else {
        onRoomUpdated();
      }
    } catch (err: any) {
      setActionError(err?.message || 'An unexpected error occurred while leaving the room.');
      setIsSubmitting(false);
    }
  };

  const meta = ROOM_TYPE_META[room.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forestBlack/80 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-info-title"
    >
      <div className="bg-phmly-surface border border-phmly-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors my-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-phmly-border bg-phmly-subtle/50 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-goldenRush" />
            <h2 id="room-info-title" className="text-section font-semibold text-phmly-text">
              Room Information
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-phmly-muted hover:text-phmly-text hover:bg-phmly-subtle transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
            aria-label="Close Room Information"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          {/* Section 1: Room Identity Banner (Room name: 20px semibold, description: 14px) */}
          <div className="flex items-start sm:items-center gap-3.5 bg-phmly-subtle/60 p-3.5 rounded-2xl border border-phmly-border">
            <img
              src={room.photo}
              alt={room.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shrink-0 border border-phmly-border shadow-xs"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-page-title text-phmly-text break-words">
                  {room.name}
                </h3>
                <span className="text-caption font-medium text-goldenRush bg-goldenRush/15 border border-goldenRush/30 px-2 py-0.5 rounded-full shrink-0">
                  {meta.title}
                </span>
              </div>
              <p className="text-secondary text-phmly-muted mt-1 leading-relaxed break-words line-clamp-2">
                {room.description || meta.description}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-metadata text-phmly-muted">
                <span>Private Room</span>
                <span>·</span>
                <span>Invite Only</span>
              </div>
            </div>
          </div>

          {/* Section 2: Room Invite Code (Section heading: 16px semibold, code: 14px medium mono) */}
          <div className="bg-phmly-subtle/50 p-4 rounded-2xl border border-phmly-border space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-section font-semibold text-phmly-text flex items-center gap-1.5">
                <Key className="w-4 h-4 text-goldenRush shrink-0" />
                <span>Room Invite Code</span>
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={handleRotateInvite}
                  disabled={isRotating}
                  className="inline-flex items-center gap-1 text-metadata font-medium text-goldenRush hover:underline disabled:opacity-50"
                  title="Generate a new invite code"
                >
                  <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
                  <span>Reset Code</span>
                </button>
              )}
            </div>

            {/* Code container with Copy Button strictly bounded */}
            <div className="flex items-center justify-between gap-2 bg-phmly-surface border border-phmly-border/80 rounded-xl p-2 sm:p-2.5 overflow-hidden">
              <div className="min-w-0 flex-1 pl-1">
                <span className="font-mono font-medium text-secondary text-goldenRush tracking-widest block truncate select-all">
                  {liveInviteCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-secondary font-medium transition-all min-h-[38px] ${
                  copiedCode
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-goldenRush text-forestBlack hover:bg-amberGlow active:scale-95 shadow-xs'
                }`}
                aria-label="Copy invitation code"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-metadata text-phmly-muted leading-relaxed">
              Anyone with this invite code can join this private room.
            </p>
          </div>

          {/* Section 3: Direct Link */}
          <div className="bg-phmly-subtle/40 p-3.5 rounded-2xl border border-phmly-border flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-section font-semibold text-phmly-text flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-goldenRush shrink-0" />
                <span>Direct Room Link</span>
              </p>
              <p className="text-metadata text-phmly-muted truncate mt-0.5">Share link with friends</p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-secondary font-medium transition-all min-h-[38px] ${
                copiedLink
                  ? 'bg-emerald-500 text-white'
                  : 'bg-phmly-surface hover:bg-phmly-subtle text-phmly-text border border-phmly-border'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Section 4: Members List & Capacity */}
          <div className="bg-phmly-subtle/40 p-3.5 rounded-2xl border border-phmly-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-section font-semibold text-phmly-text flex items-center gap-1.5">
                <Users className="w-4 h-4 text-goldenRush shrink-0" />
                <span>Members ({roomMembers.length} of {LIMITS.MAX_ROOM_MEMBERS} max)</span>
              </span>
              <span className="text-metadata text-phmly-muted font-mono">
                {Math.max(0, LIMITS.MAX_ROOM_MEMBERS - roomMembers.length)} spots left
              </span>
            </div>

            {/* Capacity Bar */}
            <div className="w-full h-1.5 bg-phmly-border/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-goldenRush rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (roomMembers.length / LIMITS.MAX_ROOM_MEMBERS) * 100)}%`,
                }}
              />
            </div>

            {/* Member Rows (Member names: 14px medium, roles: 12px) */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1 pt-1">
              {roomMembers.map((member) => {
                const isMemberOwner = member.id === room.ownerId;
                const isCurrent = activeUser?.id === member.id;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-phmly-surface border border-phmly-border/70 text-secondary"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar src={member.avatar} name={member.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-secondary text-phmly-text truncate">{member.name}</p>
                          {isCurrent && (
                            <span className="text-metadata text-phmly-muted font-medium">(You)</span>
                          )}
                        </div>
                        <p className="text-metadata text-phmly-muted truncate">
                          {member.bio || 'Member of PHMLY'}
                        </p>
                      </div>
                    </div>
                    {isMemberOwner && (
                      <span className="flex items-center gap-1 text-metadata text-goldenRush font-medium bg-goldenRush/10 border border-goldenRush/20 px-2 py-0.5 rounded-full shrink-0 ml-2">
                        <Shield className="w-3 h-3" />
                        <span>Owner</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {inviteError && (
            <div className="text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              {inviteError}
            </div>
          )}

          {/* Section 5: Role-Based Room Management Actions */}
          {/* Room Creator -> Delete Room */}
          {isOwner && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setConfirmAction('delete');
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-all min-h-[44px] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Room</span>
              </button>
              <p className="text-[10px] text-phmly-muted text-center mt-1.5">
                Only you as the room creator can delete this space.
              </p>
            </div>
          )}

          {/* Invited Member -> Leave Room */}
          {isInvitedMember && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setConfirmAction('leave');
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold text-amber-500 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 transition-all min-h-[44px] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
              <p className="text-[10px] text-phmly-muted text-center mt-1.5">
                Remove your membership and exit this room.
              </p>
            </div>
          )}

          {/* Non-members see no room-management actions */}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-phmly-border bg-phmly-subtle/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-phmly-surface hover:bg-phmly-subtle text-phmly-text font-semibold text-xs border border-phmly-border transition-colors min-h-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
          >
            Done
          </button>
        </div>

        {/* ====================================================================== */}
        {/* CONFIRMATION DIALOG: DELETE ROOM (Creator Only) */}
        {/* ====================================================================== */}
        {confirmAction === 'delete' && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-forestBlack/90 backdrop-blur-sm p-4 animate-fadeIn"
            role="alertdialog"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
          >
            <div className="bg-phmly-surface border border-rose-500/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 id="delete-dialog-title" className="text-sm font-bold text-phmly-text">
                    Delete Room?
                  </h3>
                  <p className="text-xs text-phmly-muted truncate max-w-[200px]">
                    {room.name}
                  </p>
                </div>
              </div>

              <div
                id="delete-dialog-desc"
                className="text-xs text-phmly-muted space-y-2 bg-phmly-subtle/50 p-3 rounded-xl border border-phmly-border leading-relaxed"
              >
                <p>
                  Are you sure you want to delete <span className="font-semibold text-phmly-text">{room.name}</span>?
                </p>
                <p className="text-rose-400">
                  This action is permanent and cannot be undone. The room and all its messages, media, shared files, daily goals, and member access will be permanently deleted for all members.
                </p>
              </div>

              {actionError && (
                <div className="text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {actionError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSubmitting) {
                      setConfirmAction(null);
                      setActionError(null);
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-phmly-subtle hover:bg-phmly-subtle/80 text-phmly-text font-semibold text-xs border border-phmly-border transition-colors min-h-[44px] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors min-h-[44px] inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Room</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================== */}
        {/* CONFIRMATION DIALOG: LEAVE ROOM (Invited Member Only) */}
        {/* ====================================================================== */}
        {confirmAction === 'leave' && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-forestBlack/90 backdrop-blur-sm p-4 animate-fadeIn"
            role="alertdialog"
            aria-labelledby="leave-dialog-title"
            aria-describedby="leave-dialog-desc"
          >
            <div className="bg-phmly-surface border border-amber-500/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <LogOut className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 id="leave-dialog-title" className="text-sm font-bold text-phmly-text">
                    Leave Room?
                  </h3>
                  <p className="text-xs text-phmly-muted truncate max-w-[200px]">
                    {room.name}
                  </p>
                </div>
              </div>

              <div
                id="leave-dialog-desc"
                className="text-xs text-phmly-muted space-y-2 bg-phmly-subtle/50 p-3 rounded-xl border border-phmly-border leading-relaxed"
              >
                <p>
                  Are you sure you want to leave <span className="font-semibold text-phmly-text">{room.name}</span>?
                </p>
                <p>
                  Leaving removes your membership and access to this room. The room itself, its conversation history, goals, and other members will remain intact.
                </p>
                <p className="text-[11px] text-goldenRush">
                  You will need an invitation code to rejoin in the future.
                </p>
              </div>

              {actionError && (
                <div className="text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {actionError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSubmitting) {
                      setConfirmAction(null);
                      setActionError(null);
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-phmly-subtle hover:bg-phmly-subtle/80 text-phmly-text font-semibold text-xs border border-phmly-border transition-colors min-h-[44px] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLeave}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-forestBlack font-semibold text-xs transition-colors min-h-[44px] inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Leaving...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Leave Room</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
