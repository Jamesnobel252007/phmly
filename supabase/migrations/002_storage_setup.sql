-- ==============================================================================
-- PHMLY — Storage Buckets and Storage RLS Policies
-- Migration: 002_storage_setup.sql
-- ==============================================================================

-- 1. Create Storage Buckets (if not exist)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('room-media', 'room-media', true),
  ('chat-attachments', 'chat-attachments', true),
  ('buddies-voice', 'buddies-voice', true),
  ('vault-files', 'vault-files', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Storage RLS Policies

-- ------------------------------------------------------------------------------
-- Avatars bucket policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------------------------
-- Room Media bucket policies (path pattern: {room_id}/{filename})
-- ------------------------------------------------------------------------------
CREATE POLICY "Room media viewable by room members"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'room-media' AND
    public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Room members can upload room media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'room-media' AND
    public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

-- ------------------------------------------------------------------------------
-- Chat Attachments bucket policies (path pattern: {room_id}/{filename})
-- ------------------------------------------------------------------------------
CREATE POLICY "Chat attachments viewable by room members"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments' AND
    public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Room members can upload chat attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments' AND
    public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

-- ------------------------------------------------------------------------------
-- Buddies Voice bucket policies (path pattern: {room_id}/{filename})
-- ------------------------------------------------------------------------------
CREATE POLICY "Buddies voice notes viewable by room members"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'buddies-voice' AND
    public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Room members can upload buddies voice notes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'buddies-voice' AND
    public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

-- ------------------------------------------------------------------------------
-- Vault Files bucket policies (path pattern: {room_id}/{filename})
-- ------------------------------------------------------------------------------
CREATE POLICY "Vault files accessible by room members"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vault-files' AND
    public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Room members can upload vault files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vault-files' AND
    public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

