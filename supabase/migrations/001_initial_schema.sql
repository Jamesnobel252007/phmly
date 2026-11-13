-- ==============================================================================
-- PHMLY — Complete Initial Database Schema Migration
-- Migration: 001_initial_schema.sql
-- ==============================================================================

-- Enable pgcrypto for UUID generation & cryptographic invite codes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE (linked to auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ==============================================================================
-- 2. ROOMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL CHECK (room_type IN ('conversation', 'buddies', 'project_vault', 'goal_tracker')),
  room_photo_url TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON public.rooms(invite_code);

-- ==============================================================================
-- 3. ROOM MEMBERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members(room_id);

-- ==============================================================================
-- 4. MESSAGES TABLE (Conversation Room)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
  media_url TEXT,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_voice_note BOOLEAN DEFAULT FALSE,
  voice_duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_room_id_created_at ON public.messages(room_id, created_at ASC);

-- ==============================================================================
-- 5. BUDDIES UPDATES TABLE (Buddies Room)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.buddies_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  voice_url TEXT,
  voice_duration TEXT,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_buddies_updates_room_id ON public.buddies_updates(room_id, created_at DESC);

-- Buddies discussion replies
CREATE TABLE IF NOT EXISTS public.buddies_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES public.buddies_updates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_buddies_replies_update_id ON public.buddies_replies(update_id, created_at ASC);

-- ==============================================================================
-- 6. GOALS TABLE (Goal Tracker Room)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_goals_room_date ON public.goals(room_id, goal_date);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

-- ==============================================================================
-- 7. VAULT FILES TABLE (Project Vault Room)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vault_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'document' CHECK (file_type IN ('document', 'image', 'video', 'link', 'file')),
  file_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_vault_files_room_id ON public.vault_files(room_id, created_at DESC);

-- ==============================================================================
-- 8. MEDIA TABLE (Room Media Strip & Central Camera)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_media_room_id ON public.media(room_id, created_at DESC);

-- ==============================================================================
-- 9. REACTIONS TABLE (Universal emoji reactions for messages and updates)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('message', 'buddies_update')),
  target_id UUID NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, target_type, target_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_reactions_target ON public.reactions(target_type, target_id);

-- ==============================================================================
-- 10. SECURITY DEFINER HELPER FUNCTIONS (Avoid Recursive RLS Loops)
-- ==============================================================================

-- Check if user is a member of the room
CREATE OR REPLACE FUNCTION public.is_room_member(check_room_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = check_room_id AND user_id = check_user_id
  );
$$;

-- Check if user is the room owner
CREATE OR REPLACE FUNCTION public.is_room_owner(check_room_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = check_room_id AND owner_id = check_user_id
  );
$$;

-- ==============================================================================
-- 11. ATOMIC BUSINESS RULE FUNCTIONS (Limits & Membership)
-- ==============================================================================

-- 5-room creation limit & automatic owner membership
CREATE OR REPLACE FUNCTION public.create_room_with_owner(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_room_type TEXT DEFAULT 'conversation',
  p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_created_count INT;
  v_new_room RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Enforce 5-room limit strictly on database level
  SELECT COUNT(*) INTO v_created_count
  FROM public.rooms
  WHERE owner_id = v_user_id;

  IF v_created_count >= 5 THEN
    RAISE EXCEPTION 'Room limit reached. You can create a maximum of 5 rooms.';
  END IF;

  -- Validate room type
  IF p_room_type NOT IN ('conversation', 'buddies', 'project_vault', 'goal_tracker') THEN
    RAISE EXCEPTION 'Invalid room type: %', p_room_type;
  END IF;

  -- Insert room
  INSERT INTO public.rooms (
    name,
    description,
    room_type,
    room_photo_url,
    owner_id
  ) VALUES (
    p_name,
    p_description,
    p_room_type,
    p_photo_url,
    v_user_id
  ) RETURNING * INTO v_new_room;

  -- Insert owner as first member
  INSERT INTO public.room_members (
    room_id,
    user_id
  ) VALUES (
    v_new_room.id,
    v_user_id
  );

  RETURN to_jsonb(v_new_room);
END;
$$;

-- Join room by invite code with 30-member capacity enforcement
CREATE OR REPLACE FUNCTION public.join_room_by_invite_code(
  p_invite_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_room RECORD;
  v_member_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Find room
  SELECT * INTO v_room
  FROM public.rooms
  WHERE invite_code = p_invite_code;

  IF v_room IS NULL THEN
    RAISE EXCEPTION 'Invalid room invitation code.';
  END IF;

  -- Check if already member
  IF EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = v_room.id AND user_id = v_user_id
  ) THEN
    RETURN to_jsonb(v_room); -- already a member
  END IF;

  -- Check 30 member maximum limit
  SELECT COUNT(*) INTO v_member_count
  FROM public.room_members
  WHERE room_id = v_room.id;

  IF v_member_count >= 30 THEN
    RAISE EXCEPTION 'This room has reached the maximum capacity of 30 members.';
  END IF;

  -- Add member
  INSERT INTO public.room_members (
    room_id,
    user_id
  ) VALUES (
    v_room.id,
    v_user_id
  );

  RETURN to_jsonb(v_room);
END;
$$;

-- ==============================================================================
-- 12. AUTOMATIC PROFILE CREATION TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    bio
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    'Member of PHMLY'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;

  RETURN NEW;
END;
$$;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddies_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddies_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Profiles Policies
-- ------------------------------------------------------------------------------
-- Authenticated users can view profiles
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- Rooms Policies
-- ------------------------------------------------------------------------------
-- Members and owners can view room
CREATE POLICY "Rooms viewable by members or owners"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    public.is_room_member(id, auth.uid())
  );

-- Authenticated users can create rooms (also governed by create_room_with_owner function)
CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Only room owners can update rooms
CREATE POLICY "Room owners can update room"
  ON public.rooms FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Only room owners can delete room
CREATE POLICY "Room owners can delete room"
  ON public.rooms FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Room Members Policies
-- ------------------------------------------------------------------------------
-- Members of the room can view its member list
CREATE POLICY "Room members viewable by fellow members or owner"
  ON public.room_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_room_member(room_id, auth.uid()) OR
    public.is_room_owner(room_id, auth.uid())
  );

-- Insert handled via create_room_with_owner or join_room_by_invite_code
CREATE POLICY "Users can join rooms"
  ON public.room_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_room_owner(room_id, auth.uid())
  );

-- Users can leave rooms or room owners can remove members
CREATE POLICY "Members can leave or owners can remove"
  ON public.room_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_room_owner(room_id, auth.uid())
  );

-- ------------------------------------------------------------------------------
-- Messages Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Messages viewable by room members"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Room members can insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    public.is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Senders or owners can delete messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid() OR
    public.is_room_owner(room_id, auth.uid())
  );

-- ------------------------------------------------------------------------------
-- Buddies Updates Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Buddies updates viewable by room members"
  ON public.buddies_updates FOR SELECT
  TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Room members can post buddies updates"
  ON public.buddies_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    public.is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Authors or room owners can delete buddies updates"
  ON public.buddies_updates FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_room_owner(room_id, auth.uid())
  );

-- Buddies replies policies
CREATE POLICY "Buddies replies viewable by room members"
  ON public.buddies_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buddies_updates u
      WHERE u.id = update_id AND public.is_room_member(u.room_id, auth.uid())
    )
  );

CREATE POLICY "Room members can reply to buddies updates"
  ON public.buddies_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.buddies_updates u
      WHERE u.id = update_id AND public.is_room_member(u.room_id, auth.uid())
    )
  );

CREATE POLICY "Authors can delete their buddies replies"
  ON public.buddies_replies FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Goals Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Goals viewable by room members"
  ON public.goals FOR SELECT
  TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Room members can add goals"
  ON public.goals FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    public.is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Users can update only their own goals"
  ON public.goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete only their own goals"
  ON public.goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Vault Files Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Vault files viewable by room members"
  ON public.vault_files FOR SELECT
  TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Room members can upload vault files"
  ON public.vault_files FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    public.is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Uploaders or room owners can delete vault files"
  ON public.vault_files FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    public.is_room_owner(room_id, auth.uid())
  );

-- ------------------------------------------------------------------------------
-- Media Policies (Room Media Strip & Central Camera)
-- ------------------------------------------------------------------------------
CREATE POLICY "Room media viewable by room members"
  ON public.media FOR SELECT
  TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Room members can share media"
  ON public.media FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    public.is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Uploaders or room owners can delete media"
  ON public.media FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    public.is_room_owner(room_id, auth.uid())
  );

-- ------------------------------------------------------------------------------
-- Reactions Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Reactions viewable by authenticated users"
  ON public.reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can post reactions"
  ON public.reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions"
  ON public.reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==============================================================================
-- 14. REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.messages, 
      public.buddies_updates, 
      public.buddies_replies, 
      public.goals, 
      public.vault_files, 
      public.media, 
      public.reactions, 
      public.room_members;
  END IF;
END $$;

