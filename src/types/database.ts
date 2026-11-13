export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RoomType = 'conversation' | 'buddies' | 'project_vault' | 'goal_tracker';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';
export type VaultFileType = 'document' | 'image' | 'video' | 'link' | 'file';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          room_type: RoomType;
          room_photo_url: string | null;
          owner_id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          room_type: RoomType;
          room_photo_url?: string | null;
          owner_id: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          room_type?: RoomType;
          room_photo_url?: string | null;
          owner_id?: string;
          invite_code?: string;
          created_at?: string;
        };
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          message_type: MessageType;
          media_url: string | null;
          reply_to_id: string | null;
          is_voice_note: boolean | null;
          voice_duration: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id: string;
          content: string;
          message_type?: MessageType;
          media_url?: string | null;
          reply_to_id?: string | null;
          is_voice_note?: boolean | null;
          voice_duration?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: MessageType;
          media_url?: string | null;
          reply_to_id?: string | null;
          is_voice_note?: boolean | null;
          voice_duration?: string | null;
          created_at?: string;
        };
      };
      buddies_updates: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          content: string;
          voice_url: string | null;
          voice_duration: string | null;
          media_url: string | null;
          media_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          content: string;
          voice_url?: string | null;
          voice_duration?: string | null;
          media_url?: string | null;
          media_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          content?: string;
          voice_url?: string | null;
          voice_duration?: string | null;
          media_url?: string | null;
          media_type?: string | null;
          created_at?: string;
        };
      };
      buddies_replies: {
        Row: {
          id: string;
          update_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          update_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          update_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          title: string;
          description: string | null;
          goal_date: string;
          is_completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          goal_date?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          goal_date?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      vault_files: {
        Row: {
          id: string;
          room_id: string;
          uploaded_by: string;
          file_name: string;
          file_url: string;
          file_type: VaultFileType;
          file_size: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          uploaded_by: string;
          file_name: string;
          file_url: string;
          file_type?: VaultFileType;
          file_size?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          uploaded_by?: string;
          file_name?: string;
          file_url?: string;
          file_type?: VaultFileType;
          file_size?: string | null;
          created_at?: string;
        };
      };
      media: {
        Row: {
          id: string;
          room_id: string;
          uploaded_by: string;
          media_url: string;
          media_type: 'image' | 'video';
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          uploaded_by: string;
          media_url: string;
          media_type?: 'image' | 'video';
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          uploaded_by?: string;
          media_url?: string;
          media_type?: 'image' | 'video';
          caption?: string | null;
          created_at?: string;
        };
      };
      reactions: {
        Row: {
          id: string;
          user_id: string;
          target_type: 'message' | 'buddies_update';
          target_id: string;
          reaction: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_type: 'message' | 'buddies_update';
          target_id: string;
          reaction: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          target_type?: 'message' | 'buddies_update';
          target_id?: string;
          reaction?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      create_room: {
        Args: {
          p_name: string;
          p_room_type: string;
          p_description: string | null;
          p_room_photo_url: string | null;
        };
        Returns: any;
      };
      join_room_by_invite: {
        Args: {
          p_invite_code: string;
        };
        Returns: any;
      };
      rotate_room_invite: {
        Args: {
          p_room_id: string;
        };
        Returns: any;
      };
      create_room_with_owner: {
        Args: {
          p_name: string;
          p_description: string | null;
          p_room_type: string;
          p_photo_url: string | null;
        };
        Returns: {
          id: string;
          name: string;
          description: string | null;
          room_type: string;
          room_photo_url: string | null;
          owner_id: string;
          invite_code: string;
          created_at: string;
        };
      };
      join_room_by_invite_code: {
        Args: {
          p_invite_code: string;
        };
        Returns: {
          room_id: string;
          room_name: string;
          room_type: string;
        };
      };
    };
  };
}

