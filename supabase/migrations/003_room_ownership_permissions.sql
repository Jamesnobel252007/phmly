-- ==============================================================================
-- PHMLY — Migration 003: Room Ownership Permissions & Membership Protection
-- File: supabase/migrations/003_room_ownership_permissions.sql
-- ==============================================================================

-- 1. Ensure Room Deletion is Strictly Limited to the Authenticated Room Creator
DROP POLICY IF EXISTS "Room owners can delete room" ON public.rooms;
CREATE POLICY "Room owners can delete room"
  ON public.rooms FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- 2. Refine Room Membership Deletion Policy:
-- - Invited members can ONLY remove their own membership row (user_id = auth.uid()).
-- - Room creators CANNOT be removed from room_members (they must delete the room instead).
-- - Invited members CANNOT remove the creator or any other member.
-- - Room creators can remove invited members, but cannot remove themselves.
DROP POLICY IF EXISTS "Members can leave or owners can remove" ON public.room_members;
CREATE POLICY "Members can leave or owners can remove"
  ON public.room_members FOR DELETE
  TO authenticated
  USING (
    -- Case A: Invited member leaving their own membership (cannot be the room owner)
    (
      user_id = auth.uid() AND
      NOT public.is_room_owner(room_id, user_id)
    )
    OR
    -- Case B: Room owner removing an invited member (cannot remove themselves)
    (
      public.is_room_owner(room_id, auth.uid()) AND
      user_id != auth.uid()
    )
  );

-- ==============================================================================
-- End of Migration 003
-- ==============================================================================
