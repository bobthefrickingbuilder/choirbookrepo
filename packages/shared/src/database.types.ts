export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      absence_reports: {
        Row: {
          arrives_at: string | null
          created_at: string
          event_id: string
          id: string
          kind: Database["public"]["Enums"]["absence_kind"]
          organization_id: string
          person_id: string
          reason: string
          reported_by: string | null
        }
        Insert: {
          arrives_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          kind?: Database["public"]["Enums"]["absence_kind"]
          organization_id: string
          person_id: string
          reason: string
          reported_by?: string | null
        }
        Update: {
          arrives_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["absence_kind"]
          organization_id?: string
          person_id?: string
          reason?: string
          reported_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "absence_reports_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "absence_reports_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "absence_reports_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      account_deletions: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          expires_at: string
          id: string
          requested_at: string
          token_hash: string
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          expires_at: string
          id?: string
          requested_at?: string
          token_hash: string
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          expires_at?: string
          id?: string
          requested_at?: string
          token_hash?: string
          user_id?: string | null
        }
        Relationships: []
      }
      announcement_recipients: {
        Row: {
          acknowledged_at: string | null
          announcement_id: string
          organization_id: string
          person_id: string
          read_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          announcement_id: string
          organization_id: string
          person_id: string
          read_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          announcement_id?: string
          organization_id?: string
          person_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_organization_id_announcement_id_fkey"
            columns: ["organization_id", "announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "announcement_recipients_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "announcement_recipients_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      announcements: {
        Row: {
          ack_due_on: string | null
          audience: Json
          author_id: string | null
          body: string
          created_at: string
          id: string
          notified_at: string | null
          organization_id: string
          pinned: boolean
          publish_at: string | null
          published_at: string | null
          requires_ack: boolean
          title: string
          updated_at: string
        }
        Insert: {
          ack_due_on?: string | null
          audience?: Json
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          notified_at?: string | null
          organization_id: string
          pinned?: boolean
          publish_at?: string | null
          published_at?: string | null
          requires_ack?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          ack_due_on?: string | null
          audience?: Json
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          organization_id?: string
          pinned?: boolean
          publish_at?: string | null
          published_at?: string | null
          requires_ack?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          event_id: string
          marked_at: string
          marked_by: string | null
          note: string | null
          organization_id: string
          person_id: string
          source: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          event_id: string
          marked_at?: string
          marked_by?: string | null
          note?: string | null
          organization_id: string
          person_id: string
          source?: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          event_id?: string
          marked_at?: string
          marked_by?: string | null
          note?: string | null
          organization_id?: string
          person_id?: string
          source?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "attendance_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "attendance_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          changed_columns: string[] | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: number
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          changed_columns?: string[] | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: never
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          changed_columns?: string[] | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: never
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_replies: {
        Row: {
          answer: Database["public"]["Enums"]["availability_answer"]
          comment: string | null
          event_id: string
          organization_id: string
          person_id: string
          updated_at: string
        }
        Insert: {
          answer: Database["public"]["Enums"]["availability_answer"]
          comment?: string | null
          event_id: string
          organization_id: string
          person_id: string
          updated_at?: string
        }
        Update: {
          answer?: Database["public"]["Enums"]["availability_answer"]
          comment?: string | null
          event_id?: string
          organization_id?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_replies_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "availability_replies_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "availability_replies_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      calendar_feeds: {
        Row: {
          created_at: string
          organization_id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_feeds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      care_notes: {
        Row: {
          created_at: string
          created_by: string | null
          detail: string | null
          id: string
          label: string
          organization_id: string
          person_id: string
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          label: string
          organization_id: string
          person_id: string
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          label?: string
          organization_id?: string
          person_id?: string
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_notes_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "care_notes_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      chaperone_checks: {
        Row: {
          check_type: string
          created_at: string
          expires_on: string
          id: string
          organization_id: string
          person_id: string
          verified_by: string | null
          verified_on: string
        }
        Insert: {
          check_type?: string
          created_at?: string
          expires_on: string
          id?: string
          organization_id: string
          person_id: string
          verified_by?: string | null
          verified_on: string
        }
        Update: {
          check_type?: string
          created_at?: string
          expires_on?: string
          id?: string
          organization_id?: string
          person_id?: string
          verified_by?: string | null
          verified_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "chaperone_checks_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "chaperone_checks_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      choristers: {
        Row: {
          created_at: string
          departed_on: string | null
          joined_on: string | null
          organization_id: string
          person_id: string
          school: string | null
          section_id: string | null
          status: Database["public"]["Enums"]["chorister_status"]
          updated_at: string
          voice_part_id: string | null
        }
        Insert: {
          created_at?: string
          departed_on?: string | null
          joined_on?: string | null
          organization_id: string
          person_id: string
          school?: string | null
          section_id?: string | null
          status?: Database["public"]["Enums"]["chorister_status"]
          updated_at?: string
          voice_part_id?: string | null
        }
        Update: {
          created_at?: string
          departed_on?: string | null
          joined_on?: string | null
          organization_id?: string
          person_id?: string
          school?: string | null
          section_id?: string | null
          status?: Database["public"]["Enums"]["chorister_status"]
          updated_at?: string
          voice_part_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choristers_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "choristers_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "choristers_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "choristers_organization_id_voice_part_id_fkey"
            columns: ["organization_id", "voice_part_id"]
            isOneToOne: false
            referencedRelation: "voice_parts"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      consent_wording_versions: {
        Row: {
          body_en: string
          body_fr: string
          created_by: string | null
          effective_at: string
          id: string
          kind: Database["public"]["Enums"]["consent_kind"]
          organization_id: string
          version: number
        }
        Insert: {
          body_en: string
          body_fr: string
          created_by?: string | null
          effective_at?: string
          id?: string
          kind: Database["public"]["Enums"]["consent_kind"]
          organization_id: string
          version: number
        }
        Update: {
          body_en?: string
          body_fr?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["consent_kind"]
          organization_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "consent_wording_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          granted: boolean
          id: string
          ip: unknown
          kind: Database["public"]["Enums"]["consent_kind"]
          method: string
          organization_id: string
          person_id: string
          recorded_at: string
          recorded_by: string | null
          wording_version_id: string
        }
        Insert: {
          granted: boolean
          id?: string
          ip?: unknown
          kind: Database["public"]["Enums"]["consent_kind"]
          method?: string
          organization_id: string
          person_id: string
          recorded_at?: string
          recorded_by?: string | null
          wording_version_id: string
        }
        Update: {
          granted?: boolean
          id?: string
          ip?: unknown
          kind?: Database["public"]["Enums"]["consent_kind"]
          method?: string
          organization_id?: string
          person_id?: string
          recorded_at?: string
          recorded_by?: string | null
          wording_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "consents_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "consents_organization_id_wording_version_id_fkey"
            columns: ["organization_id", "wording_version_id"]
            isOneToOne: false
            referencedRelation: "consent_wording_versions"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["message_category"]
          created_at: string
          first_staff_reply_at: string | null
          id: string
          last_message_at: string
          member_id: string
          organization_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["message_category"]
          created_at?: string
          first_staff_reply_at?: string | null
          id?: string
          last_message_at?: string
          member_id: string
          organization_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["message_category"]
          created_at?: string
          first_staff_reply_at?: string | null
          id?: string
          last_message_at?: string
          member_id?: string
          organization_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_organization_id_assigned_to_fkey"
            columns: ["organization_id", "assigned_to"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "conversations_organization_id_assigned_to_fkey"
            columns: ["organization_id", "assigned_to"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_member_id_fkey"
            columns: ["organization_id", "member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "conversations_organization_id_member_id_fkey"
            columns: ["organization_id", "member_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          hidden: string[]
          organization_id: string
          updated_at: string
          user_id: string
          widgets: string[]
        }
        Insert: {
          hidden?: string[]
          organization_id: string
          updated_at?: string
          user_id: string
          widgets?: string[]
        }
        Update: {
          hidden?: string[]
          organization_id?: string
          updated_at?: string
          user_id?: string
          widgets?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          digest_key: string | null
          id: string
          last_error: string | null
          not_before: string
          organization_id: string | null
          payload: Json
          priority: number
          provider_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string
          template: string
          to_email: string
          to_guardian_id: string | null
          to_person_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          digest_key?: string | null
          id?: string
          last_error?: string | null
          not_before?: string
          organization_id?: string | null
          payload?: Json
          priority?: number
          provider_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
          template: string
          to_email: string
          to_guardian_id?: string | null
          to_person_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          digest_key?: string | null
          id?: string
          last_error?: string | null
          not_before?: string
          organization_id?: string | null
          payload?: Json
          priority?: number
          provider_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
          template?: string
          to_email?: string
          to_guardian_id?: string | null
          to_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_to_guardian_id_fkey"
            columns: ["to_guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_to_person_id_fkey"
            columns: ["to_person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_to_person_id_fkey"
            columns: ["to_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checkin_keys: {
        Row: {
          created_at: string
          event_id: string
          organization_id: string
          secret: string
        }
        Insert: {
          created_at?: string
          event_id: string
          organization_id: string
          secret?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          organization_id?: string
          secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checkin_keys_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      event_series: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          rrule: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          rrule: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          rrule?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_series_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          all_day: boolean
          availability_due_at: string | null
          availability_requested: boolean
          bring: string | null
          call_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          counts_for_attendance: boolean
          created_at: string
          created_by: string | null
          description: string | null
          dress_code: string | null
          ends_at: string | null
          id: string
          location: string | null
          map_url: string | null
          organization_id: string
          running_order: Json
          season_id: string | null
          section_ids: string[]
          series_id: string | null
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          all_day?: boolean
          availability_due_at?: string | null
          availability_requested?: boolean
          bring?: string | null
          call_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          counts_for_attendance?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          dress_code?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          map_url?: string | null
          organization_id: string
          running_order?: Json
          season_id?: string | null
          section_ids?: string[]
          series_id?: string | null
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          all_day?: boolean
          availability_due_at?: string | null
          availability_requested?: boolean
          bring?: string | null
          call_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          counts_for_attendance?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          dress_code?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          map_url?: string | null
          organization_id?: string
          running_order?: Json
          season_id?: string | null
          section_ids?: string[]
          series_id?: string | null
          starts_at?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_season_id_fkey"
            columns: ["organization_id", "season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "events_organization_id_series_id_fkey"
            columns: ["organization_id", "series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      fee_adjustments: {
        Row: {
          amount_cents: number
          assignment_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          kind: Database["public"]["Enums"]["adjustment_kind"]
          organization_id: string
          reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["adjustment_status"]
        }
        Insert: {
          amount_cents: number
          assignment_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["adjustment_kind"]
          organization_id: string
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["adjustment_status"]
        }
        Update: {
          amount_cents?: number
          assignment_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["adjustment_kind"]
          organization_id?: string
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["adjustment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "fee_adjustments_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fee_adjustments_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_balances"
            referencedColumns: ["organization_id", "assignment_id"]
          },
        ]
      }
      fee_assignments: {
        Row: {
          amount_cents: number
          created_at: string
          fee_id: string
          id: string
          organization_id: string
          person_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          fee_id: string
          id?: string
          organization_id: string
          person_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          fee_id?: string
          id?: string
          organization_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_assignments_organization_id_fee_id_fkey"
            columns: ["organization_id", "fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      feedback: {
        Row: {
          app_version: string | null
          body: string
          created_at: string
          id: string
          organization_id: string | null
          page: string | null
          role: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          body: string
          created_at?: string
          id?: string
          organization_id?: string | null
          page?: string | null
          role?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          body?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          page?: string | null
          role?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          allows_instalments: boolean
          amount_cents: number
          created_at: string
          description: string | null
          due_on: string | null
          id: string
          name: string
          organization_id: string
          season_id: string | null
        }
        Insert: {
          allows_instalments?: boolean
          amount_cents: number
          created_at?: string
          description?: string | null
          due_on?: string | null
          id?: string
          name: string
          organization_id: string
          season_id?: string | null
        }
        Update: {
          allows_instalments?: boolean
          amount_cents?: number
          created_at?: string
          description?: string | null
          due_on?: string | null
          id?: string
          name?: string
          organization_id?: string
          season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_organization_id_season_id_fkey"
            columns: ["organization_id", "season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      form_responses: {
        Row: {
          answers: Json
          created_at: string
          form_id: string
          id: string
          organization_id: string
          person_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signed_at: string | null
          signed_ip: unknown
          signed_name: string | null
          status: Database["public"]["Enums"]["response_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          form_id: string
          id?: string
          organization_id: string
          person_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signed_at?: string | null
          signed_ip?: unknown
          signed_name?: string | null
          status?: Database["public"]["Enums"]["response_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          form_id?: string
          id?: string
          organization_id?: string
          person_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signed_at?: string | null
          signed_ip?: unknown
          signed_name?: string | null
          status?: Database["public"]["Enums"]["response_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_organization_id_form_id_fkey"
            columns: ["organization_id", "form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "form_responses_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "form_responses_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          description: string | null
          due_on: string | null
          fields: Json
          guardian_signature_required: boolean
          id: string
          kind: Database["public"]["Enums"]["form_kind"]
          organization_id: string
          requires_signature: boolean
          season_id: string | null
          section_ids: string[]
          status: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_on?: string | null
          fields?: Json
          guardian_signature_required?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["form_kind"]
          organization_id: string
          requires_signature?: boolean
          season_id?: string | null
          section_ids?: string[]
          status?: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_on?: string | null
          fields?: Json
          guardian_signature_required?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["form_kind"]
          organization_id?: string
          requires_signature?: boolean
          season_id?: string | null
          section_ids?: string[]
          status?: Database["public"]["Enums"]["form_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_organization_id_season_id_fkey"
            columns: ["organization_id", "season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      guardian_links: {
        Row: {
          chorister_id: string
          guardian_id: string
          is_emergency_contact: boolean
          is_primary: boolean
          organization_id: string
          receives_copies: boolean
          relationship: string | null
        }
        Insert: {
          chorister_id: string
          guardian_id: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          organization_id: string
          receives_copies?: boolean
          relationship?: string | null
        }
        Update: {
          chorister_id?: string
          guardian_id?: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          organization_id?: string
          receives_copies?: boolean
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_links_organization_id_chorister_id_fkey"
            columns: ["organization_id", "chorister_id"]
            isOneToOne: false
            referencedRelation: "choristers"
            referencedColumns: ["organization_id", "person_id"]
          },
          {
            foreignKeyName: "guardian_links_organization_id_guardian_id_fkey"
            columns: ["organization_id", "guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      guardian_signatures: {
        Row: {
          created_at: string
          expires_at: string
          guardian_id: string
          id: string
          organization_id: string
          response_id: string
          revoked_at: string | null
          sent_at: string | null
          signed_ip: unknown
          signed_name: string | null
          signed_user_agent: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          guardian_id: string
          id?: string
          organization_id: string
          response_id: string
          revoked_at?: string | null
          sent_at?: string | null
          signed_ip?: unknown
          signed_name?: string | null
          signed_user_agent?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          guardian_id?: string
          id?: string
          organization_id?: string
          response_id?: string
          revoked_at?: string | null
          sent_at?: string | null
          signed_ip?: unknown
          signed_name?: string | null
          signed_user_agent?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_signatures_organization_id_guardian_id_fkey"
            columns: ["organization_id", "guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "guardian_signatures_organization_id_response_id_fkey"
            columns: ["organization_id", "response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          lang: Database["public"]["Enums"]["lang"]
          last_name: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          lang?: Database["public"]["Enums"]["lang"]
          last_name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          lang?: Database["public"]["Enums"]["lang"]
          last_name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      instalments: {
        Row: {
          amount_cents: number
          assignment_id: string
          due_on: string
          id: string
          organization_id: string
        }
        Insert: {
          amount_cents: number
          assignment_id: string
          due_on: string
          id?: string
          organization_id: string
        }
        Update: {
          amount_cents?: number
          assignment_id?: string
          due_on?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instalments_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "instalments_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_balances"
            referencedColumns: ["organization_id", "assignment_id"]
          },
        ]
      }
      learning_tracks: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          kind: string
          label: string
          organization_id: string
          piece_id: string
          released_at: string | null
          section_id: string | null
          size_bytes: number | null
          storage_path: string
          voice_part_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          label: string
          organization_id: string
          piece_id: string
          released_at?: string | null
          section_id?: string | null
          size_bytes?: number | null
          storage_path: string
          voice_part_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          label?: string
          organization_id?: string
          piece_id?: string
          released_at?: string | null
          section_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          voice_part_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_tracks_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "learning_tracks_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "learning_tracks_organization_id_voice_part_id_fkey"
            columns: ["organization_id", "voice_part_id"]
            isOneToOne: false
            referencedRelation: "voice_parts"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      member_roles: {
        Row: {
          created_at: string
          organization_id: string
          person_id: string
          role_id: string
          section_id: string | null
        }
        Insert: {
          created_at?: string
          organization_id: string
          person_id: string
          role_id: string
          section_id?: string | null
        }
        Update: {
          created_at?: string
          organization_id?: string
          person_id?: string
          role_id?: string
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "member_roles_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "member_roles_organization_id_role_id_fkey"
            columns: ["organization_id", "role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "member_roles_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      message_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          organization_id: string
          reason: string
          reporter_person_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          organization_id: string
          reason: string
          reporter_person_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          organization_id?: string
          reason?: string
          reporter_person_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_organization_id_message_id_fkey"
            columns: ["organization_id", "message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "message_reports_organization_id_reporter_person_id_fkey"
            columns: ["organization_id", "reporter_person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "message_reports_organization_id_reporter_person_id_fkey"
            columns: ["organization_id", "reporter_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      messages: {
        Row: {
          author_person_id: string | null
          body: string
          conversation_id: string
          created_at: string
          held_for_review: boolean
          hidden_at: string | null
          hidden_by: string | null
          id: string
          organization_id: string
        }
        Insert: {
          author_person_id?: string | null
          body: string
          conversation_id: string
          created_at?: string
          held_for_review?: boolean
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          author_person_id?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          held_for_review?: boolean
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_organization_id_author_person_id_fkey"
            columns: ["organization_id", "author_person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "messages_organization_id_author_person_id_fkey"
            columns: ["organization_id", "author_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "messages_organization_id_conversation_id_fkey"
            columns: ["organization_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      monthly_update_deliveries: {
        Row: {
          content: Json
          opened_at: string | null
          organization_id: string
          person_id: string
          sent_at: string | null
          update_id: string
        }
        Insert: {
          content?: Json
          opened_at?: string | null
          organization_id: string
          person_id: string
          sent_at?: string | null
          update_id: string
        }
        Update: {
          content?: Json
          opened_at?: string | null
          organization_id?: string
          person_id?: string
          sent_at?: string | null
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_update_deliveries_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "monthly_update_deliveries_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "monthly_update_deliveries_organization_id_update_id_fkey"
            columns: ["organization_id", "update_id"]
            isOneToOne: false
            referencedRelation: "monthly_updates"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      monthly_updates: {
        Row: {
          conductor_note: string | null
          created_at: string
          free_text: string | null
          id: string
          month: string
          organization_id: string
          send_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          conductor_note?: string | null
          created_at?: string
          free_text?: string | null
          id?: string
          month: string
          organization_id: string
          send_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          conductor_note?: string | null
          created_at?: string
          free_text?: string | null
          id?: string
          month?: string
          organization_id?: string
          send_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"]
          email_digest: boolean
          in_app: boolean
          push: boolean
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["notification_category"]
          email_digest?: boolean
          in_app?: boolean
          push?: boolean
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["notification_category"]
          email_digest?: boolean
          in_app?: boolean
          push?: boolean
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          id: string
          link: string | null
          organization_id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          link?: string | null
          organization_id: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          link?: string | null
          organization_id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          brand_color: string | null
          created_at: string
          default_lang: Database["public"]["Enums"]["lang"]
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["choir_kind"]
          logo_path: string | null
          name: string
          settings: Json
          short_name: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          default_lang?: Database["public"]["Enums"]["lang"]
          id?: string
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["choir_kind"]
          logo_path?: string | null
          name: string
          settings?: Json
          short_name?: string | null
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          default_lang?: Database["public"]["Enums"]["lang"]
          id?: string
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["choir_kind"]
          logo_path?: string | null
          name?: string
          settings?: Json
          short_name?: string | null
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          assignment_id: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          organization_id: string
          payer_name: string | null
          person_id: string | null
          receipt_number: string | null
          received_at: string | null
          recorded_by: string | null
          refunded_cents: number
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents: number
          assignment_id?: string | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          organization_id: string
          payer_name?: string | null
          person_id?: string | null
          receipt_number?: string | null
          received_at?: string | null
          recorded_by?: string | null
          refunded_cents?: number
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          assignment_id?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          organization_id?: string
          payer_name?: string | null
          person_id?: string | null
          receipt_number?: string | null
          received_at?: string | null
          recorded_by?: string | null
          refunded_cents?: number
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "payments_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_balances"
            referencedColumns: ["organization_id", "assignment_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "payments_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      people: {
        Row: {
          archived_at: string | null
          contact_visibility: Database["public"]["Enums"]["contact_visibility"]
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          lang: Database["public"]["Enums"]["lang"]
          last_name: string
          messaging_suspended_at: string | null
          organization_id: string
          phone: string | null
          photo_path: string | null
          preferred_name: string | null
          pronouns: string | null
          status: Database["public"]["Enums"]["person_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          contact_visibility?: Database["public"]["Enums"]["contact_visibility"]
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          lang?: Database["public"]["Enums"]["lang"]
          last_name: string
          messaging_suspended_at?: string | null
          organization_id: string
          phone?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          pronouns?: string | null
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          contact_visibility?: Database["public"]["Enums"]["contact_visibility"]
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          lang?: Database["public"]["Enums"]["lang"]
          last_name?: string
          messaging_suspended_at?: string | null
          organization_id?: string
          phone?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          pronouns?: string | null
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pieces: {
        Row: {
          arranger: string | null
          composer: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          language: string | null
          notes: string | null
          organization_id: string
          title: string
          updated_at: string
          voicing: string | null
        }
        Insert: {
          arranger?: string | null
          composer?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          language?: string | null
          notes?: string | null
          organization_id: string
          title: string
          updated_at?: string
          voicing?: string | null
        }
        Update: {
          arranger?: string | null
          composer?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          language?: string | null
          notes?: string | null
          organization_id?: string
          title?: string
          updated_at?: string
          voicing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pieces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_assignments: {
        Row: {
          bars: string | null
          created_at: string
          created_by: string | null
          due_on: string | null
          id: string
          instructions: string | null
          organization_id: string
          piece_id: string
          released_at: string | null
          section_ids: string[]
          title: string
        }
        Insert: {
          bars?: string | null
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          id?: string
          instructions?: string | null
          organization_id: string
          piece_id: string
          released_at?: string | null
          section_ids?: string[]
          title: string
        }
        Update: {
          bars?: string | null
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          id?: string
          instructions?: string | null
          organization_id?: string
          piece_id?: string
          released_at?: string | null
          section_ids?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_assignments_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      practice_completions: {
        Row: {
          assignment_id: string
          completed_at: string
          organization_id: string
          person_id: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string
          organization_id: string
          person_id: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string
          organization_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_completions_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "practice_assignments"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "practice_completions_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "practice_completions_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      practice_log: {
        Row: {
          created_at: string
          id: string
          minutes: number
          note: string | null
          organization_id: string
          person_id: string
          piece_id: string | null
          practised_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes: number
          note?: string | null
          organization_id: string
          person_id: string
          piece_id?: string | null
          practised_on?: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes?: number
          note?: string | null
          organization_id?: string
          person_id?: string
          piece_id?: string | null
          practised_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_log_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "practice_log_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "practice_log_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          lang: Database["public"]["Enums"]["lang"]
          last_organization_id: string | null
          theme: Database["public"]["Enums"]["theme_mode"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          lang?: Database["public"]["Enums"]["lang"]
          last_organization_id?: string | null
          theme?: Database["public"]["Enums"]["theme_mode"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          lang?: Database["public"]["Enums"]["lang"]
          last_organization_id?: string | null
          theme?: Database["public"]["Enums"]["theme_mode"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_last_organization_id_fkey"
            columns: ["last_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          area:
            | "dashboard"
            | "roster"
            | "care"
            | "staff_notes"
            | "calendar"
            | "attendance"
            | "music"
            | "announcements"
            | "inbox"
            | "monthly_updates"
            | "forms"
            | "fees"
            | "tickets"
            | "seating"
            | "volunteers"
            | "reports"
            | "users"
            | "settings"
            | "moderation"
            | "audit"
          level: "none" | "view" | "edit"
          organization_id: string
          role_id: string
        }
        Insert: {
          area:
            | "dashboard"
            | "roster"
            | "care"
            | "staff_notes"
            | "calendar"
            | "attendance"
            | "music"
            | "announcements"
            | "inbox"
            | "monthly_updates"
            | "forms"
            | "fees"
            | "tickets"
            | "seating"
            | "volunteers"
            | "reports"
            | "users"
            | "settings"
            | "moderation"
            | "audit"
          level?: "none" | "view" | "edit"
          organization_id: string
          role_id: string
        }
        Update: {
          area?:
            | "dashboard"
            | "roster"
            | "care"
            | "staff_notes"
            | "calendar"
            | "attendance"
            | "music"
            | "announcements"
            | "inbox"
            | "monthly_updates"
            | "forms"
            | "fees"
            | "tickets"
            | "seating"
            | "volunteers"
            | "reports"
            | "users"
            | "settings"
            | "moderation"
            | "audit"
          level?: "none" | "view" | "edit"
          organization_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_organization_id_role_id_fkey"
            columns: ["organization_id", "role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description_en: string | null
          description_fr: string | null
          id: string
          key: string | null
          locked: boolean
          name_en: string
          name_fr: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          id?: string
          key?: string | null
          locked?: boolean
          name_en: string
          name_fr: string
          organization_id: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          id?: string
          key?: string | null
          locked?: boolean
          name_en?: string
          name_fr?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      score_files: {
        Row: {
          created_at: string
          id: string
          label: string
          organization_id: string
          piece_id: string
          released_at: string | null
          section_id: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          organization_id: string
          piece_id: string
          released_at?: string | null
          section_id?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          piece_id?: string
          released_at?: string | null
          section_id?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_files_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "score_files_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          is_current: boolean
          name: string
          organization_id: string
          starts_on: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          is_current?: boolean
          name: string
          organization_id: string
          starts_on: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          is_current?: boolean
          name?: string
          organization_id?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_charts: {
        Row: {
          created_at: string
          event_id: string
          id: string
          layout: Json
          name: string
          organization_id: string
          published_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          layout?: Json
          name?: string
          organization_id: string
          published_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          layout?: Json
          name?: string
          organization_id?: string
          published_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_charts_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      seating_positions: {
        Row: {
          chart_id: string
          organization_id: string
          person_id: string
          row_label: string
          seat: number
        }
        Insert: {
          chart_id: string
          organization_id: string
          person_id: string
          row_label: string
          seat: number
        }
        Update: {
          chart_id?: string
          organization_id?: string
          person_id?: string
          row_label?: string
          seat?: number
        }
        Relationships: [
          {
            foreignKeyName: "seating_positions_organization_id_chart_id_fkey"
            columns: ["organization_id", "chart_id"]
            isOneToOne: false
            referencedRelation: "seating_charts"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "seating_positions_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "seating_positions_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      sections: {
        Row: {
          id: string
          key: string
          name_en: string
          name_fr: string
          organization_id: string
          sort: number
        }
        Insert: {
          id?: string
          key: string
          name_en: string
          name_fr: string
          organization_id: string
          sort?: number
        }
        Update: {
          id?: string
          key?: string
          name_en?: string
          name_fr?: string
          organization_id?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_links: {
        Row: {
          code: string
          created_at: string
          event_id: string
          id: string
          organization_id: string
          person_id: string
        }
        Insert: {
          code: string
          created_at?: string
          event_id: string
          id?: string
          organization_id: string
          person_id: string
        }
        Update: {
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          organization_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_links_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "seller_links_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "seller_links_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      set_list_items: {
        Row: {
          event_id: string
          organization_id: string
          piece_id: string
          position: number
        }
        Insert: {
          event_id: string
          organization_id: string
          piece_id: string
          position: number
        }
        Update: {
          event_id?: string
          organization_id?: string
          piece_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "set_list_items_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "set_list_items_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      staff_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          organization_id: string
          person_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          organization_id: string
          person_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_notes_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "staff_notes_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      terms: {
        Row: {
          absence_limit: number | null
          ends_on: string
          id: string
          name: string
          organization_id: string
          season_id: string
          starts_on: string
        }
        Insert: {
          absence_limit?: number | null
          ends_on: string
          id?: string
          name: string
          organization_id: string
          season_id: string
          starts_on: string
        }
        Update: {
          absence_limit?: number | null
          ends_on?: string
          id?: string
          name?: string
          organization_id?: string
          season_id?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_organization_id_season_id_fkey"
            columns: ["organization_id", "season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      ticket_orders: {
        Row: {
          buyer_email: string
          buyer_name: string
          created_at: string
          event_id: string
          id: string
          organization_id: string
          refunded_cents: number
          seller_link_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          total_cents: number
        }
        Insert: {
          buyer_email: string
          buyer_name: string
          created_at?: string
          event_id: string
          id?: string
          organization_id: string
          refunded_cents?: number
          seller_link_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          total_cents: number
        }
        Update: {
          buyer_email?: string
          buyer_name?: string
          created_at?: string
          event_id?: string
          id?: string
          organization_id?: string
          refunded_cents?: number
          seller_link_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_orders_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "ticket_orders_organization_id_seller_link_id_fkey"
            columns: ["organization_id", "seller_link_id"]
            isOneToOne: false
            referencedRelation: "seller_links"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          capacity: number | null
          created_at: string
          event_id: string
          id: string
          name: string
          organization_id: string
          price_cents: number
          sales_end_at: string | null
          sales_start_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          event_id: string
          id?: string
          name: string
          organization_id: string
          price_cents: number
          sales_end_at?: string | null
          sales_start_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          organization_id?: string
          price_cents?: number
          sales_end_at?: string | null
          sales_start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      tickets: {
        Row: {
          code: string
          created_at: string
          id: string
          is_comp: boolean
          issued_to: string | null
          order_id: string | null
          organization_id: string
          scanned_at: string | null
          scanned_by: string | null
          ticket_type_id: string
          voided_at: string | null
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          is_comp?: boolean
          issued_to?: string | null
          order_id?: string | null
          organization_id: string
          scanned_at?: string | null
          scanned_by?: string | null
          ticket_type_id: string
          voided_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_comp?: boolean
          issued_to?: string | null
          order_id?: string | null
          organization_id?: string
          scanned_at?: string | null
          scanned_by?: string | null
          ticket_type_id?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_organization_id_issued_to_fkey"
            columns: ["organization_id", "issued_to"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "tickets_organization_id_issued_to_fkey"
            columns: ["organization_id", "issued_to"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "tickets_organization_id_order_id_fkey"
            columns: ["organization_id", "order_id"]
            isOneToOne: false
            referencedRelation: "ticket_orders"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "tickets_organization_id_ticket_type_id_fkey"
            columns: ["organization_id", "ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      voice_parts: {
        Row: {
          id: string
          key: string
          name_en: string
          name_fr: string
          organization_id: string
          section_id: string
          sort: number
        }
        Insert: {
          id?: string
          key: string
          name_en: string
          name_fr: string
          organization_id: string
          section_id: string
          sort?: number
        }
        Update: {
          id?: string
          key?: string
          name_en?: string
          name_fr?: string
          organization_id?: string
          section_id?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "voice_parts_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      volunteer_jobs: {
        Row: {
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          organization_id: string
          requires_police_check: boolean
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          organization_id: string
          requires_police_check?: boolean
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          organization_id?: string
          requires_police_check?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_jobs_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "volunteer_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_signups: {
        Row: {
          created_at: string
          hours_logged: number | null
          organization_id: string
          person_id: string
          slot_id: string
        }
        Insert: {
          created_at?: string
          hours_logged?: number | null
          organization_id: string
          person_id: string
          slot_id: string
        }
        Update: {
          created_at?: string
          hours_logged?: number | null
          organization_id?: string
          person_id?: string
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_signups_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "volunteer_signups_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "volunteer_signups_organization_id_slot_id_fkey"
            columns: ["organization_id", "slot_id"]
            isOneToOne: false
            referencedRelation: "volunteer_slots"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      volunteer_slots: {
        Row: {
          ends_at: string
          id: string
          job_id: string
          needed: number
          organization_id: string
          starts_at: string
        }
        Insert: {
          ends_at: string
          id?: string
          job_id: string
          needed?: number
          organization_id: string
          starts_at: string
        }
        Update: {
          ends_at?: string
          id?: string
          job_id?: string
          needed?: number
          organization_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_slots_organization_id_job_id_fkey"
            columns: ["organization_id", "job_id"]
            isOneToOne: false
            referencedRelation: "volunteer_jobs"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
    }
    Views: {
      attendance_facts: {
        Row: {
          cancelled_at: string | null
          counts_for_attendance: boolean | null
          event_id: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          organization_id: string | null
          person_id: string | null
          section_id: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "attendance_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "attendance_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      current_consents: {
        Row: {
          granted: boolean | null
          kind: Database["public"]["Enums"]["consent_kind"] | null
          method: string | null
          organization_id: string | null
          person_id: string | null
          recorded_at: string | null
          wording_version: number | null
          wording_version_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "consents_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "consents_organization_id_wording_version_id_fkey"
            columns: ["organization_id", "wording_version_id"]
            isOneToOne: false
            referencedRelation: "consent_wording_versions"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      fee_balances: {
        Row: {
          adjusted_cents: number | null
          amount_cents: number | null
          assignment_id: string | null
          due_on: string | null
          fee_id: string | null
          name: string | null
          organization_id: string | null
          paid_cents: number | null
          person_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_assignments_organization_id_fee_id_fkey"
            columns: ["organization_id", "fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      member_directory: {
        Row: {
          email: string | null
          first_name: string | null
          id: string | null
          is_staff: boolean | null
          last_name: string | null
          organization_id: string | null
          phone: string | null
          photo_path: string | null
          preferred_name: string | null
          pronouns: string | null
          section_id: string | null
          voice_part_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      account_deletion_state: { Args: { token: string }; Returns: string }
      age_years: { Args: { dob: string }; Returns: number }
      calendar_feed: {
        Args: { feed_token: string }
        Returns: {
          address: string
          all_day: boolean
          choir_name: string
          description: string
          ends_at: string
          id: string
          location: string
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }[]
      }
      cancel_account_deletion: { Args: never; Returns: undefined }
      checkin_code: {
        Args: { event: string }
        Returns: {
          code: string
          seconds_left: number
        }[]
      }
      complete_account_deletion: { Args: { token: string }; Returns: Json }
      contains_profanity: {
        Args: { body: string; org: string }
        Returns: boolean
      }
      demo_accounts: {
        Args: never
        Returns: {
          email: string
          role: string
          user_id: string
        }[]
      }
      demo_guardian_link: { Args: { response: string }; Returns: string }
      email_budget_today: {
        Args: { org: string }
        Returns: {
          queued_for_choir: number
          remaining_today: number
          sent_today: number
        }[]
      }
      email_daily_cap: { Args: never; Returns: number }
      generate_monthly_update: { Args: { target: string }; Returns: number }
      guardian_link_lookup: { Args: { token: string }; Returns: Json }
      guardian_link_sign: {
        Args: {
          ip?: unknown
          signed_name: string
          token: string
          user_agent?: string
        }
        Returns: string
      }
      is_demo_user: { Args: never; Returns: boolean }
      is_minor: { Args: { dob: string }; Returns: boolean }
      link_existing_account: { Args: { person: string }; Returns: boolean }
      log_event: {
        Args: {
          action: string
          details?: Json
          entity: string
          entity_id?: string
          org: string
        }
        Returns: undefined
      }
      music_storage_used: { Args: { org: string }; Returns: number }
      my_ticket_sales: {
        Args: { org: string }
        Returns: {
          code: string
          event_id: string
          orders: number
          tickets: number
        }[]
      }
      nightly_privacy: { Args: never; Returns: Json }
      notify_due_announcements: { Args: never; Returns: number }
      notify_people: {
        Args: {
          body?: string
          body_fr?: string
          category: Database["public"]["Enums"]["notification_category"]
          link?: string
          org: string
          people: string[]
          title: string
          title_fr?: string
        }
        Returns: number
      }
      process_coming_of_age: { Args: never; Returns: number }
      profanity_list_size: {
        Args: never
        Returns: {
          lang: Database["public"]["Enums"]["lang"]
          words: number
        }[]
      }
      publish_announcement: { Args: { ann_id: string }; Returns: number }
      qr_check_in: { Args: { code: string; event: string }; Returns: string }
      rate_limit_hit: {
        Args: { bucket: string; max_hits: number; window_seconds: number }
        Returns: boolean
      }
      rebuild_demo: { Args: { demo_password: string }; Returns: Json }
      request_account_deletion: { Args: never; Returns: string }
      request_guardian_signatures: {
        Args: { response: string }
        Returns: number
      }
      reset_demo: { Args: { demo_password: string }; Returns: Json }
      send_monthly_update: { Args: { target: string }; Returns: number }
      set_messaging_suspended: {
        Args: { person: string; suspended: boolean }
        Returns: undefined
      }
      volunteer_slot_fill: {
        Args: { org: string }
        Returns: {
          slot_id: string
          taken: number
        }[]
      }
    }
    Enums: {
      absence_kind: "absent" | "late"
      adjustment_kind: "waiver" | "financial_aid" | "family_discount" | "other"
      adjustment_status: "requested" | "approved" | "declined"
      attendance_status: "present" | "late" | "absent" | "excused"
      availability_answer: "yes" | "no" | "maybe"
      choir_kind: "youth" | "adult"
      chorister_status: "auditioning" | "active" | "on_leave" | "departed"
      consent_kind:
        | "participation"
        | "code_of_conduct"
        | "photo_video"
        | "medical_info"
      contact_visibility: "private" | "choir"
      conversation_status: "open" | "resolved"
      email_status: "queued" | "sending" | "sent" | "failed" | "suppressed"
      event_type:
        | "rehearsal"
        | "sectional"
        | "concert"
        | "tour"
        | "social"
        | "deadline"
      form_kind:
        | "registration"
        | "permission"
        | "medical"
        | "consent"
        | "agreement"
        | "survey"
        | "other"
      form_status: "draft" | "open" | "closed"
      lang: "en" | "fr"
      message_category: "absence" | "music" | "fees" | "general"
      notification_category:
        | "announcements"
        | "schedule"
        | "music"
        | "messages"
        | "forms"
        | "fees"
        | "tickets"
        | "volunteers"
        | "system"
      order_status:
        | "pending"
        | "paid"
        | "refunded"
        | "partially_refunded"
        | "cancelled"
      payment_method: "card" | "cash" | "cheque" | "etransfer"
      payment_status:
        | "pending"
        | "succeeded"
        | "failed"
        | "refunded"
        | "partially_refunded"
      person_status: "invited" | "active" | "archived"
      response_status: "in_progress" | "submitted" | "changes" | "approved"
      theme_mode: "auto" | "light" | "dark"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      absence_kind: ["absent", "late"],
      adjustment_kind: ["waiver", "financial_aid", "family_discount", "other"],
      adjustment_status: ["requested", "approved", "declined"],
      attendance_status: ["present", "late", "absent", "excused"],
      availability_answer: ["yes", "no", "maybe"],
      choir_kind: ["youth", "adult"],
      chorister_status: ["auditioning", "active", "on_leave", "departed"],
      consent_kind: [
        "participation",
        "code_of_conduct",
        "photo_video",
        "medical_info",
      ],
      contact_visibility: ["private", "choir"],
      conversation_status: ["open", "resolved"],
      email_status: ["queued", "sending", "sent", "failed", "suppressed"],
      event_type: [
        "rehearsal",
        "sectional",
        "concert",
        "tour",
        "social",
        "deadline",
      ],
      form_kind: [
        "registration",
        "permission",
        "medical",
        "consent",
        "agreement",
        "survey",
        "other",
      ],
      form_status: ["draft", "open", "closed"],
      lang: ["en", "fr"],
      message_category: ["absence", "music", "fees", "general"],
      notification_category: [
        "announcements",
        "schedule",
        "music",
        "messages",
        "forms",
        "fees",
        "tickets",
        "volunteers",
        "system",
      ],
      order_status: [
        "pending",
        "paid",
        "refunded",
        "partially_refunded",
        "cancelled",
      ],
      payment_method: ["card", "cash", "cheque", "etransfer"],
      payment_status: [
        "pending",
        "succeeded",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      person_status: ["invited", "active", "archived"],
      response_status: ["in_progress", "submitted", "changes", "approved"],
      theme_mode: ["auto", "light", "dark"],
    },
  },
} as const
