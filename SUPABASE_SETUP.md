# PHMLY — Supabase Backend Setup & Migration Guide

This guide provides step-by-step instructions to configure and run the Supabase backend for the **PHMLY** application.

---

## 1. Environment Configuration

Your `.env.local` file in the project root holds your Supabase connection parameters:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

> **Security Note:**
> Never expose your Supabase `service_role` key or database password in `.env.local` or any frontend client code. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key) are used by the client.

---

## 2. Database Schema & RLS Setup

Two complete SQL migration files are located in the `supabase/migrations/` directory:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_storage_setup.sql`

### How to apply them in your Supabase Dashboard:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. In the left navigation, click on **SQL Editor**.
4. Click **New query**.
5. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` into the editor and click **Run**.
   - This sets up all 10 tables:
     - `profiles`
     - `rooms`
     - `room_members`
     - `messages`
     - `buddies_updates`
     - `buddies_replies`
     - `goals`
     - `vault_files`
     - `media`
     - `reactions`
   - Sets up `is_room_member` and `is_room_owner` security definer helper functions to **prevent RLS recursion loops**.
   - Configures the trigger `on_auth_user_created` to automatically create a profile in `profiles` on sign up.
   - Creates stored procedures `create_room_with_owner` (enforces 5-room creation limit) and `join_room_by_invite_code` (enforces 30-member room limit).
   - Adds tables to the `supabase_realtime` publication for live sync.
6. Click **New query** again.
7. Copy the entire contents of `supabase/migrations/002_storage_setup.sql` into the editor and click **Run**.
   - This provisions all 5 storage buckets:
     - `avatars` (public)
     - `room-media` (public)
     - `chat-attachments` (public)
     - `buddies-voice` (public)
     - `vault-files` (public)
   - Configures secure RLS policies for file uploads, updates, and deletes.

---

## 3. Authentication Configuration

In your Supabase Dashboard:
1. Navigate to **Authentication** > **Providers** > **Email**.
2. Make sure **Enable Email provider** is toggled **ON**.
3. *(Optional for testing)*: Under **Authentication** > **URL Configuration**, you can turn off **Confirm email** if you want new signups to sign in immediately without email confirmation during development.

---

## 4. Realtime Sync Verification

In your Supabase Dashboard:
1. Navigate to **Database** > **Replication**.
2. Verify that the `supabase_realtime` publication has the following tables enabled:
   - `messages`
   - `buddies_updates`
   - `goals`
   - `media`

*(The migration file `001_initial_schema.sql` includes `ALTER PUBLICATION supabase_realtime ADD TABLE ...` statements to configure this automatically).*

---

## 5. Storage Buckets Verification

In your Supabase Dashboard:
1. Navigate to **Storage**.
2. Verify that the 5 buckets are visible:
   - `avatars`
   - `room-media`
   - `chat-attachments`
   - `buddies-voice`
   - `vault-files`

---

## 6. Architecture & Offline-First Resilience

The PHMLY frontend includes a multi-layered fallback strategy:
- **Connected Mode**: When `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured, data is fetched and mutated through the `src/services/` backend layer with real-time updates and cloud storage.
- **Offline / Prototype Mode**: If Supabase is unconfigured or a network timeout occurs, the app seamlessly falls back to `StorageService` (browser localStorage). This ensures the application never crashes, remains responsive, and preserves demo data across reloads.
- **Bi-directional Profile Sync**: Signing into a Supabase account automatically links the user profile, synchronizes local cache, and fetches the user's specific rooms.

---

## 7. Verification & Feature Checklist

| Feature | Description | Status |
|---|---|---|
| **Authentication** | Sign up with email/password, sign in, sign out, profile view with avatar update | Tested & Verified |
| **Room Creation** | 5-room user creation limit enforced on DB (`create_room_with_owner`) & UI | Tested & Verified |
| **Room Joining** | 30-member room limit enforced via invite code (`join_room_by_invite_code`) | Tested & Verified |
| **Conversation Room** | Live chat messages, image attachments, voice note audio pill, emoji reactions | Tested & Verified |
| **Buddies Room** | Daily learning progress, quick prompt chips, replies, voice reflections | Tested & Verified |
| **Goal Tracker Room** | Daily goals checklist, completion toggles, 4 Tamil category rankings & empty state | Tested & Verified |
| **Project Vault Room** | Resource management, filters (document/image/video/link), bulk ZIP download via JSZip | Tested & Verified |
| **Shared Media & Camera** | Photo/video capture, multi-room sharing strip, full-screen media viewer | Tested & Verified |
| **Design Integrity** | Preserved exact typography (Inter/Geist), light/dark theme, logo, and responsive layout | Tested & Verified |

