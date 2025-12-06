export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string | null;
          avatar_url: string | null;
          credits: number;
          subscription_tier: "free" | "pro" | "enterprise";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username?: string | null;
          avatar_url?: string | null;
          credits?: number;
          subscription_tier?: "free" | "pro" | "enterprise";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string | null;
          avatar_url?: string | null;
          credits?: number;
          subscription_tier?: "free" | "pro" | "enterprise";
          created_at?: string;
          updated_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          script: string | null;
          style: "cartoon" | "anime" | "realistic" | "comic";
          status: "draft" | "generating" | "ready" | "rendering" | "completed" | "failed";
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          script?: string | null;
          style?: "cartoon" | "anime" | "realistic" | "comic";
          status?: "draft" | "generating" | "ready" | "rendering" | "completed" | "failed";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          script?: string | null;
          style?: "cartoon" | "anime" | "realistic" | "comic";
          status?: "draft" | "generating" | "ready" | "rendering" | "completed" | "failed";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      characters: {
        Row: {
          id: string;
          story_id: string;
          name: string;
          description: string | null;
          appearance: string | null;
          personality: string | null;
          image_url: string | null;
          sprite_sheet_url: string | null;
          voice_settings: Json;
          animation_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          name: string;
          description?: string | null;
          appearance?: string | null;
          personality?: string | null;
          image_url?: string | null;
          sprite_sheet_url?: string | null;
          voice_settings?: Json;
          animation_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          name?: string;
          description?: string | null;
          appearance?: string | null;
          personality?: string | null;
          image_url?: string | null;
          sprite_sheet_url?: string | null;
          voice_settings?: Json;
          animation_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      scenes: {
        Row: {
          id: string;
          story_id: string;
          scene_number: number;
          title: string | null;
          script_text: string;
          background_url: string | null;
          background_description: string | null;
          duration: number;
          camera_settings: Json;
          transition_type: "fade" | "slide" | "zoom" | "none";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          scene_number: number;
          title?: string | null;
          script_text: string;
          background_url?: string | null;
          background_description?: string | null;
          duration?: number;
          camera_settings?: Json;
          transition_type?: "fade" | "slide" | "zoom" | "none";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          scene_number?: number;
          title?: string | null;
          script_text?: string;
          background_url?: string | null;
          background_description?: string | null;
          duration?: number;
          camera_settings?: Json;
          transition_type?: "fade" | "slide" | "zoom" | "none";
          created_at?: string;
          updated_at?: string;
        };
      };
      scene_characters: {
        Row: {
          id: string;
          scene_id: string;
          character_id: string;
          position: Json;
          scale: number;
          z_index: number;
          animation_sequence: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          scene_id: string;
          character_id: string;
          position?: Json;
          scale?: number;
          z_index?: number;
          animation_sequence?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          scene_id?: string;
          character_id?: string;
          position?: Json;
          scale?: number;
          z_index?: number;
          animation_sequence?: Json;
          created_at?: string;
        };
      };
      audio_tracks: {
        Row: {
          id: string;
          scene_id: string;
          character_id: string | null;
          type: "narration" | "dialogue" | "music" | "sfx";
          audio_url: string;
          transcript: string | null;
          start_time: number;
          duration: number;
          phoneme_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          scene_id: string;
          character_id?: string | null;
          type: "narration" | "dialogue" | "music" | "sfx";
          audio_url: string;
          transcript?: string | null;
          start_time?: number;
          duration: number;
          phoneme_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          scene_id?: string;
          character_id?: string | null;
          type?: "narration" | "dialogue" | "music" | "sfx";
          audio_url?: string;
          transcript?: string | null;
          start_time?: number;
          duration?: number;
          phoneme_data?: Json;
          created_at?: string;
        };
      };
      video_exports: {
        Row: {
          id: string;
          story_id: string;
          user_id: string;
          video_url: string | null;
          thumbnail_url: string | null;
          status: "queued" | "processing" | "completed" | "failed";
          progress: number;
          error_message: string | null;
          resolution: "480p" | "720p" | "1080p";
          duration: number | null;
          file_size: number | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          story_id: string;
          user_id: string;
          video_url?: string | null;
          thumbnail_url?: string | null;
          status?: "queued" | "processing" | "completed" | "failed";
          progress?: number;
          error_message?: string | null;
          resolution?: "480p" | "720p" | "1080p";
          duration?: number | null;
          file_size?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          story_id?: string;
          user_id?: string;
          video_url?: string | null;
          thumbnail_url?: string | null;
          status?: "queued" | "processing" | "completed" | "failed";
          progress?: number;
          error_message?: string | null;
          resolution?: "480p" | "720p" | "1080p";
          duration?: number | null;
          file_size?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      templates: {
        Row: {
          id: string;
          type: "character" | "scene" | "story";
          name: string;
          description: string | null;
          thumbnail_url: string | null;
          data: Json;
          is_public: boolean;
          user_id: string | null;
          usage_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: "character" | "scene" | "story";
          name: string;
          description?: string | null;
          thumbnail_url?: string | null;
          data: Json;
          is_public?: boolean;
          user_id?: string | null;
          usage_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: "character" | "scene" | "story";
          name?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          data?: Json;
          is_public?: boolean;
          user_id?: string | null;
          usage_count?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
