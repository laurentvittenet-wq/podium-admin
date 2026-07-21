export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      contests: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string | null;
          finished: boolean;
          id: string;
          name: string;
          scoring_rule_id: string | null;
          sport: Database['public']['Enums']['sport_type'] | null;
          starts_at: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          finished?: boolean;
          id?: string;
          name: string;
          scoring_rule_id?: string | null;
          sport?: Database['public']['Enums']['sport_type'] | null;
          starts_at?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          finished?: boolean;
          id?: string;
          name?: string;
          scoring_rule_id?: string | null;
          sport?: Database['public']['Enums']['sport_type'] | null;
          starts_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contests_scoring_rule_id_fkey';
            columns: ['scoring_rule_id'];
            isOneToOne: false;
            referencedRelation: 'scoring_rules';
            referencedColumns: ['id'];
          },
        ];
      };
      league_members: {
        Row: { joined_at: string; league_id: string; user_id: string };
        Insert: { joined_at?: string; league_id: string; user_id: string };
        Update: { joined_at?: string; league_id?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'league_members_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
        ];
      };
      leagues: {
        Row: { created_at: string; id: string; invite_code: string; name: string; owner_id: string | null };
        Insert: { created_at?: string; id?: string; invite_code?: string; name: string; owner_id?: string | null };
        Update: { created_at?: string; id?: string; invite_code?: string; name?: string; owner_id?: string | null };
        Relationships: [];
      };
      matches: {
        Row: {
          allows_draw: boolean;
          away_team: Json;
          competition: string;
          contest_id: string | null;
          created_at: string;
          created_by: string | null;
          home_team: Json;
          id: string;
          kickoff_at: string;
          odds: Json | null;
          requires_score: boolean;
          result: Database['public']['Enums']['pick_type'] | null;
          score: Json | null;
          settled_at: string | null;
          sport: Database['public']['Enums']['sport_type'];
          status: Database['public']['Enums']['match_status'];
        };
        Insert: {
          allows_draw?: boolean;
          away_team: Json;
          competition: string;
          contest_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          home_team: Json;
          id?: string;
          kickoff_at: string;
          odds?: Json | null;
          requires_score?: boolean;
          result?: Database['public']['Enums']['pick_type'] | null;
          score?: Json | null;
          settled_at?: string | null;
          sport: Database['public']['Enums']['sport_type'];
          status?: Database['public']['Enums']['match_status'];
        };
        Update: {
          allows_draw?: boolean;
          away_team?: Json;
          competition?: string;
          contest_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          home_team?: Json;
          id?: string;
          kickoff_at?: string;
          odds?: Json | null;
          requires_score?: boolean;
          result?: Database['public']['Enums']['pick_type'] | null;
          score?: Json | null;
          settled_at?: string | null;
          sport?: Database['public']['Enums']['sport_type'];
          status?: Database['public']['Enums']['match_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'matches_contest_id_fkey';
            columns: ['contest_id'];
            isOneToOne: false;
            referencedRelation: 'contests';
            referencedColumns: ['id'];
          },
        ];
      };
      predictions: {
        Row: {
          confidence: number;
          created_at: string;
          id: string;
          match_id: string;
          odds_snapshot: number | null;
          pick: Database['public']['Enums']['pick_type'];
          points_awarded: number | null;
          predicted_score: Json | null;
          settled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          confidence?: number;
          created_at?: string;
          id?: string;
          match_id: string;
          odds_snapshot?: number | null;
          pick: Database['public']['Enums']['pick_type'];
          points_awarded?: number | null;
          predicted_score?: Json | null;
          settled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          confidence?: number;
          created_at?: string;
          id?: string;
          match_id?: string;
          odds_snapshot?: number | null;
          pick?: Database['public']['Enums']['pick_type'];
          points_awarded?: number | null;
          predicted_score?: Json | null;
          settled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'predictions_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_color: string;
          avatar_text_color: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          level: number;
          pseudo: string;
          role: Database['public']['Enums']['user_role'];
          streak: number;
          xp: number;
        };
        Insert: {
          avatar_color?: string;
          avatar_text_color?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          level?: number;
          pseudo: string;
          role?: Database['public']['Enums']['user_role'];
          streak?: number;
          xp?: number;
        };
        Update: {
          avatar_color?: string;
          avatar_text_color?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          level?: number;
          pseudo?: string;
          role?: Database['public']['Enums']['user_role'];
          streak?: number;
          xp?: number;
        };
        Relationships: [];
      };
      scoring_rules: {
        Row: {
          base_points: number;
          confidence_levels: Json;
          created_at: string;
          created_by: string | null;
          exact_score_bonus: number;
          id: string;
          name: string;
          odds_weighted: boolean;
        };
        Insert: {
          base_points?: number;
          confidence_levels?: Json;
          created_at?: string;
          created_by?: string | null;
          exact_score_bonus?: number;
          id?: string;
          name: string;
          odds_weighted?: boolean;
        };
        Update: {
          base_points?: number;
          confidence_levels?: Json;
          created_at?: string;
          created_by?: string | null;
          exact_score_bonus?: number;
          id?: string;
          name?: string;
          odds_weighted?: boolean;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          created_at: string;
          created_by: string | null;
          external_id: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          source: string;
          sport: Database['public']['Enums']['sport_type'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          external_id?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          source?: string;
          sport: Database['public']['Enums']['sport_type'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          external_id?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          source?: string;
          sport?: Database['public']['Enums']['sport_type'];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard: {
        Row: {
          avatar_color: string | null;
          avatar_text_color: string | null;
          display_name: string | null;
          points: number | null;
          pseudo: string | null;
          rank: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      match_participation: {
        Row: {
          match_id: string | null;
          players: number | null;
        };
        Relationships: [];
      };
      stats_averages: {
        Row: {
          avg_accuracy_pct: number | null;
          avg_predictions_per_player: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      join_league: {
        Args: { p_invite_code: string };
        Returns: Database['public']['Tables']['leagues']['Row'];
      };
      settle_match: {
        Args: {
          p_away_score?: number;
          p_home_score?: number;
          p_match_id: string;
          p_result?: Database['public']['Enums']['pick_type'];
        };
        Returns: undefined;
      };
      get_players_admin: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          email: string | null;
          pseudo: string;
          display_name: string | null;
          role: Database['public']['Enums']['user_role'];
          created_at: string;
        }[];
      };
      delete_player_admin: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      promote_player_admin: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      delete_contest_admin: {
        Args: { p_contest_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      match_status: 'open' | 'locked' | 'live' | 'settled';
      pick_type: 'home' | 'draw' | 'away';
      sport_type: 'football' | 'rugby' | 'tennis' | 'olympics';
      user_role: 'player' | 'animateur' | 'admin';
    };
  };
};
