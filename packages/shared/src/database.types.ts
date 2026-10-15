// Generated from supabase/migrations by supabase/scripts/gen-types.mts. Do not edit by hand.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      absence_reports: {
        Row: {
          id: string
          organization_id: string
          event_id: string
          person_id: string
          kind: Database["public"]["Enums"]["absence_kind"]
          reason: string
          arrives_at: string | null
          reported_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_id: string
          person_id: string
          kind?: Database["public"]["Enums"]["absence_kind"]
          reason: string
          arrives_at?: string | null
          reported_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_id?: string
          person_id?: string
          kind?: Database["public"]["Enums"]["absence_kind"]
          reason?: string
          arrives_at?: string | null
          reported_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_reports_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "absence_reports_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      announcement_recipients: {
        Row: {
          organization_id: string
          announcement_id: string
          person_id: string
          read_at: string | null
          acknowledged_at: string | null
        }
        Insert: {
          organization_id: string
          announcement_id: string
          person_id: string
          read_at?: string | null
          acknowledged_at?: string | null
        }
        Update: {
          organization_id?: string
          announcement_id?: string
          person_id?: string
          read_at?: string | null
          acknowledged_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_organization_id_announcement_id_fkey"
            columns: ["organization_id", "announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "announcement_recipients_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      announcements: {
        Row: {
          id: string
          organization_id: string
          title: string
          body: string
          audience: Json
          pinned: boolean
          requires_ack: boolean
          ack_due_on: string | null
          publish_at: string | null
          published_at: string | null
          author_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          body: string
          audience?: Json
          pinned?: boolean
          requires_ack?: boolean
          ack_due_on?: string | null
          publish_at?: string | null
          published_at?: string | null
          author_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          body?: string
          audience?: Json
          pinned?: boolean
          requires_ack?: boolean
          ack_due_on?: string | null
          publish_at?: string | null
          published_at?: string | null
          author_id?: string | null
          created_at?: string
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
          organization_id: string
          event_id: string
          person_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          note: string | null
          source: string
          marked_by: string | null
          marked_at: string
        }
        Insert: {
          organization_id: string
          event_id: string
          person_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          note?: string | null
          source?: string
          marked_by?: string | null
          marked_at?: string
        }
        Update: {
          organization_id?: string
          event_id?: string
          person_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          note?: string | null
          source?: string
          marked_by?: string | null
          marked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "attendance_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          id: number
          organization_id: string | null
          actor_id: string | null
          action: string
          entity: string
          entity_id: string | null
          changed_columns: string[] | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: number
          organization_id?: string | null
          actor_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          changed_columns?: string[] | null
          details?: Json
          created_at?: string
        }
        Update: {
          id?: number
          organization_id?: string | null
          actor_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          changed_columns?: string[] | null
          details?: Json
          created_at?: string
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
          organization_id: string
          event_id: string
          person_id: string
          answer: Database["public"]["Enums"]["availability_answer"]
          comment: string | null
          updated_at: string
        }
        Insert: {
          organization_id: string
          event_id: string
          person_id: string
          answer: Database["public"]["Enums"]["availability_answer"]
          comment?: string | null
          updated_at?: string
        }
        Update: {
          organization_id?: string
          event_id?: string
          person_id?: string
          answer?: Database["public"]["Enums"]["availability_answer"]
          comment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_replies_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "availability_replies_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      care_notes: {
        Row: {
          id: string
          organization_id: string
          person_id: string
          label: string
          detail: string | null
          severity: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          person_id: string
          label: string
          detail?: string | null
          severity?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          person_id?: string
          label?: string
          detail?: string | null
          severity?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_notes_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      chaperone_checks: {
        Row: {
          id: string
          organization_id: string
          person_id: string
          check_type: string
          verified_on: string
          expires_on: string
          verified_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          person_id: string
          check_type?: string
          verified_on: string
          expires_on: string
          verified_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          person_id?: string
          check_type?: string
          verified_on?: string
          expires_on?: string
          verified_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chaperone_checks_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      choristers: {
        Row: {
          person_id: string
          organization_id: string
          section_id: string | null
          voice_part_id: string | null
          status: Database["public"]["Enums"]["chorister_status"]
          joined_on: string | null
          departed_on: string | null
          school: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          person_id: string
          organization_id: string
          section_id?: string | null
          voice_part_id?: string | null
          status?: Database["public"]["Enums"]["chorister_status"]
          joined_on?: string | null
          departed_on?: string | null
          school?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          person_id?: string
          organization_id?: string
          section_id?: string | null
          voice_part_id?: string | null
          status?: Database["public"]["Enums"]["chorister_status"]
          joined_on?: string | null
          departed_on?: string | null
          school?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "choristers_organization_id_person_id_fkey"
            columns: ["person_id", "organization_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "choristers_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "choristers_organization_id_voice_part_id_fkey"
            columns: ["organization_id", "voice_part_id"]
            isOneToOne: false
            referencedRelation: "voice_parts"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      consent_wording_versions: {
        Row: {
          id: string
          organization_id: string
          kind: Database["public"]["Enums"]["consent_kind"]
          version: number
          body_en: string
          body_fr: string
          effective_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          kind: Database["public"]["Enums"]["consent_kind"]
          version: number
          body_en: string
          body_fr: string
          effective_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          kind?: Database["public"]["Enums"]["consent_kind"]
          version?: number
          body_en?: string
          body_fr?: string
          effective_at?: string
          created_by?: string | null
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
          id: string
          organization_id: string
          person_id: string
          kind: Database["public"]["Enums"]["consent_kind"]
          granted: boolean
          wording_version_id: string
          method: string
          recorded_by: string | null
          recorded_at: string
          ip: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          person_id: string
          kind: Database["public"]["Enums"]["consent_kind"]
          granted: boolean
          wording_version_id: string
          method?: string
          recorded_by?: string | null
          recorded_at?: string
          ip?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          person_id?: string
          kind?: Database["public"]["Enums"]["consent_kind"]
          granted?: boolean
          wording_version_id?: string
          method?: string
          recorded_by?: string | null
          recorded_at?: string
          ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "consents_organization_id_wording_version_id_fkey"
            columns: ["organization_id", "wording_version_id"]
            isOneToOne: false
            referencedRelation: "consent_wording_versions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          organization_id: string
          member_id: string
          subject: string
          category: Database["public"]["Enums"]["message_category"]
          status: Database["public"]["Enums"]["conversation_status"]
          assigned_to: string | null
          first_staff_reply_at: string | null
          last_message_at: string
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          member_id: string
          subject: string
          category?: Database["public"]["Enums"]["message_category"]
          status?: Database["public"]["Enums"]["conversation_status"]
          assigned_to?: string | null
          first_staff_reply_at?: string | null
          last_message_at?: string
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          member_id?: string
          subject?: string
          category?: Database["public"]["Enums"]["message_category"]
          status?: Database["public"]["Enums"]["conversation_status"]
          assigned_to?: string | null
          first_staff_reply_at?: string | null
          last_message_at?: string
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_organization_id_assigned_to_fkey"
            columns: ["organization_id", "assigned_to"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
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
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      email_queue: {
        Row: {
          id: string
          organization_id: string | null
          to_email: string
          to_person_id: string | null
          to_guardian_id: string | null
          template: string
          subject: string
          payload: Json
          digest_key: string | null
          priority: number
          status: Database["public"]["Enums"]["email_status"]
          not_before: string
          attempts: number
          last_error: string | null
          provider_id: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          to_email: string
          to_person_id?: string | null
          to_guardian_id?: string | null
          template: string
          subject: string
          payload?: Json
          digest_key?: string | null
          priority?: number
          status?: Database["public"]["Enums"]["email_status"]
          not_before?: string
          attempts?: number
          last_error?: string | null
          provider_id?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          to_email?: string
          to_person_id?: string | null
          to_guardian_id?: string | null
          template?: string
          subject?: string
          payload?: Json
          digest_key?: string | null
          priority?: number
          status?: Database["public"]["Enums"]["email_status"]
          not_before?: string
          attempts?: number
          last_error?: string | null
          provider_id?: string | null
          sent_at?: string | null
          created_at?: string
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
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      event_series: {
        Row: {
          id: string
          organization_id: string
          rrule: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          rrule: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          rrule?: string
          created_at?: string
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
          id: string
          organization_id: string
          season_id: string | null
          series_id: string | null
          type: Database["public"]["Enums"]["event_type"]
          title: string
          description: string | null
          starts_at: string
          ends_at: string | null
          all_day: boolean
          call_at: string | null
          location: string | null
          address: string | null
          map_url: string | null
          dress_code: string | null
          bring: string | null
          running_order: Json
          section_ids: string[]
          availability_requested: boolean
          availability_due_at: string | null
          counts_for_attendance: boolean
          cancelled_at: string | null
          cancel_reason: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          season_id?: string | null
          series_id?: string | null
          type: Database["public"]["Enums"]["event_type"]
          title: string
          description?: string | null
          starts_at: string
          ends_at?: string | null
          all_day?: boolean
          call_at?: string | null
          location?: string | null
          address?: string | null
          map_url?: string | null
          dress_code?: string | null
          bring?: string | null
          running_order?: Json
          section_ids?: string[]
          availability_requested?: boolean
          availability_due_at?: string | null
          counts_for_attendance?: boolean
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          season_id?: string | null
          series_id?: string | null
          type?: Database["public"]["Enums"]["event_type"]
          title?: string
          description?: string | null
          starts_at?: string
          ends_at?: string | null
          all_day?: boolean
          call_at?: string | null
          location?: string | null
          address?: string | null
          map_url?: string | null
          dress_code?: string | null
          bring?: string | null
          running_order?: Json
          section_ids?: string[]
          availability_requested?: boolean
          availability_due_at?: string | null
          counts_for_attendance?: boolean
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_by?: string | null
          created_at?: string
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
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "events_organization_id_series_id_fkey"
            columns: ["organization_id", "series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      fee_adjustments: {
        Row: {
          id: string
          organization_id: string
          assignment_id: string
          kind: Database["public"]["Enums"]["adjustment_kind"]
          amount_cents: number
          reason: string | null
          status: Database["public"]["Enums"]["adjustment_status"]
          requested_by: string | null
          decided_by: string | null
          decided_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          assignment_id: string
          kind: Database["public"]["Enums"]["adjustment_kind"]
          amount_cents: number
          reason?: string | null
          status?: Database["public"]["Enums"]["adjustment_status"]
          requested_by?: string | null
          decided_by?: string | null
          decided_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          assignment_id?: string
          kind?: Database["public"]["Enums"]["adjustment_kind"]
          amount_cents?: number
          reason?: string | null
          status?: Database["public"]["Enums"]["adjustment_status"]
          requested_by?: string | null
          decided_by?: string | null
          decided_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_adjustments_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      fee_assignments: {
        Row: {
          id: string
          organization_id: string
          fee_id: string
          person_id: string
          amount_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          fee_id: string
          person_id: string
          amount_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          fee_id?: string
          person_id?: string
          amount_cents?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_assignments_organization_id_fee_id_fkey"
            columns: ["organization_id", "fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      feedback: {
        Row: {
          id: string
          organization_id: string | null
          user_id: string | null
          body: string
          page: string | null
          role: string | null
          user_agent: string | null
          app_version: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          body: string
          page?: string | null
          role?: string | null
          user_agent?: string | null
          app_version?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          body?: string
          page?: string | null
          role?: string | null
          user_agent?: string | null
          app_version?: string | null
          status?: string
          created_at?: string
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
          id: string
          organization_id: string
          season_id: string | null
          name: string
          description: string | null
          amount_cents: number
          due_on: string | null
          allows_instalments: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          season_id?: string | null
          name: string
          description?: string | null
          amount_cents: number
          due_on?: string | null
          allows_instalments?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          season_id?: string | null
          name?: string
          description?: string | null
          amount_cents?: number
          due_on?: string | null
          allows_instalments?: boolean
          created_at?: string
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
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      form_responses: {
        Row: {
          id: string
          organization_id: string
          form_id: string
          person_id: string
          answers: Json
          status: Database["public"]["Enums"]["response_status"]
          submitted_at: string | null
          signed_name: string | null
          signed_at: string | null
          signed_ip: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          form_id: string
          person_id: string
          answers?: Json
          status?: Database["public"]["Enums"]["response_status"]
          submitted_at?: string | null
          signed_name?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          form_id?: string
          person_id?: string
          answers?: Json
          status?: Database["public"]["Enums"]["response_status"]
          submitted_at?: string | null
          signed_name?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_organization_id_form_id_fkey"
            columns: ["organization_id", "form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "form_responses_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      forms: {
        Row: {
          id: string
          organization_id: string
          season_id: string | null
          title: string
          kind: Database["public"]["Enums"]["form_kind"]
          description: string | null
          fields: Json
          due_on: string | null
          requires_signature: boolean
          guardian_signature_required: boolean
          section_ids: string[]
          status: Database["public"]["Enums"]["form_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          season_id?: string | null
          title: string
          kind?: Database["public"]["Enums"]["form_kind"]
          description?: string | null
          fields?: Json
          due_on?: string | null
          requires_signature?: boolean
          guardian_signature_required?: boolean
          section_ids?: string[]
          status?: Database["public"]["Enums"]["form_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          season_id?: string | null
          title?: string
          kind?: Database["public"]["Enums"]["form_kind"]
          description?: string | null
          fields?: Json
          due_on?: string | null
          requires_signature?: boolean
          guardian_signature_required?: boolean
          section_ids?: string[]
          status?: Database["public"]["Enums"]["form_status"]
          created_at?: string
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
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      guardian_links: {
        Row: {
          organization_id: string
          guardian_id: string
          chorister_id: string
          relationship: string | null
          is_primary: boolean
          is_emergency_contact: boolean
          receives_copies: boolean
        }
        Insert: {
          organization_id: string
          guardian_id: string
          chorister_id: string
          relationship?: string | null
          is_primary?: boolean
          is_emergency_contact?: boolean
          receives_copies?: boolean
        }
        Update: {
          organization_id?: string
          guardian_id?: string
          chorister_id?: string
          relationship?: string | null
          is_primary?: boolean
          is_emergency_contact?: boolean
          receives_copies?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guardian_links_organization_id_chorister_id_fkey"
            columns: ["organization_id", "chorister_id"]
            isOneToOne: false
            referencedRelation: "choristers"
            referencedColumns: ["person_id", "organization_id"]
          },
          {
            foreignKeyName: "guardian_links_organization_id_guardian_id_fkey"
            columns: ["organization_id", "guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      guardian_signatures: {
        Row: {
          id: string
          organization_id: string
          response_id: string
          guardian_id: string
          token_hash: string
          expires_at: string
          sent_at: string | null
          used_at: string | null
          signed_name: string | null
          signed_ip: string | null
          signed_user_agent: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          response_id: string
          guardian_id: string
          token_hash: string
          expires_at: string
          sent_at?: string | null
          used_at?: string | null
          signed_name?: string | null
          signed_ip?: string | null
          signed_user_agent?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          response_id?: string
          guardian_id?: string
          token_hash?: string
          expires_at?: string
          sent_at?: string | null
          used_at?: string | null
          signed_name?: string | null
          signed_ip?: string | null
          signed_user_agent?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_signatures_organization_id_guardian_id_fkey"
            columns: ["organization_id", "guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guardian_signatures_organization_id_response_id_fkey"
            columns: ["organization_id", "response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      guardians: {
        Row: {
          id: string
          organization_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          lang: Database["public"]["Enums"]["lang"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          lang?: Database["public"]["Enums"]["lang"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          lang?: Database["public"]["Enums"]["lang"]
          created_at?: string
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
          id: string
          organization_id: string
          assignment_id: string
          due_on: string
          amount_cents: number
        }
        Insert: {
          id?: string
          organization_id: string
          assignment_id: string
          due_on: string
          amount_cents: number
        }
        Update: {
          id?: string
          organization_id?: string
          assignment_id?: string
          due_on?: string
          amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "instalments_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      learning_tracks: {
        Row: {
          id: string
          organization_id: string
          piece_id: string
          label: string
          kind: string
          voice_part_id: string | null
          section_id: string | null
          storage_path: string
          size_bytes: number | null
          duration_seconds: number | null
          released_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          piece_id: string
          label: string
          kind?: string
          voice_part_id?: string | null
          section_id?: string | null
          storage_path: string
          size_bytes?: number | null
          duration_seconds?: number | null
          released_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          piece_id?: string
          label?: string
          kind?: string
          voice_part_id?: string | null
          section_id?: string | null
          storage_path?: string
          size_bytes?: number | null
          duration_seconds?: number | null
          released_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_tracks_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "learning_tracks_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "learning_tracks_organization_id_voice_part_id_fkey"
            columns: ["organization_id", "voice_part_id"]
            isOneToOne: false
            referencedRelation: "voice_parts"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      member_roles: {
        Row: {
          organization_id: string
          person_id: string
          role_id: string
          section_id: string | null
          created_at: string
        }
        Insert: {
          organization_id: string
          person_id: string
          role_id: string
          section_id?: string | null
          created_at?: string
        }
        Update: {
          organization_id?: string
          person_id?: string
          role_id?: string
          section_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "member_roles_organization_id_role_id_fkey"
            columns: ["organization_id", "role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "member_roles_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      message_reports: {
        Row: {
          id: string
          organization_id: string
          message_id: string
          reporter_person_id: string
          reason: string
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          message_id: string
          reporter_person_id: string
          reason: string
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          message_id?: string
          reporter_person_id?: string
          reason?: string
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_organization_id_message_id_fkey"
            columns: ["organization_id", "message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "message_reports_organization_id_reporter_person_id_fkey"
            columns: ["organization_id", "reporter_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      messages: {
        Row: {
          id: string
          organization_id: string
          conversation_id: string
          author_person_id: string | null
          body: string
          held_for_review: boolean
          hidden_at: string | null
          hidden_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          conversation_id: string
          author_person_id?: string | null
          body: string
          held_for_review?: boolean
          hidden_at?: string | null
          hidden_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          conversation_id?: string
          author_person_id?: string | null
          body?: string
          held_for_review?: boolean
          hidden_at?: string | null
          hidden_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_organization_id_author_person_id_fkey"
            columns: ["organization_id", "author_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "messages_organization_id_conversation_id_fkey"
            columns: ["organization_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      monthly_update_deliveries: {
        Row: {
          organization_id: string
          update_id: string
          person_id: string
          content: Json
          sent_at: string | null
          opened_at: string | null
        }
        Insert: {
          organization_id: string
          update_id: string
          person_id: string
          content?: Json
          sent_at?: string | null
          opened_at?: string | null
        }
        Update: {
          organization_id?: string
          update_id?: string
          person_id?: string
          content?: Json
          sent_at?: string | null
          opened_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_update_deliveries_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "monthly_update_deliveries_organization_id_update_id_fkey"
            columns: ["organization_id", "update_id"]
            isOneToOne: false
            referencedRelation: "monthly_updates"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      monthly_updates: {
        Row: {
          id: string
          organization_id: string
          month: string
          status: string
          conductor_note: string | null
          free_text: string | null
          send_at: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          month: string
          status?: string
          conductor_note?: string | null
          free_text?: string | null
          send_at?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          month?: string
          status?: string
          conductor_note?: string | null
          free_text?: string | null
          send_at?: string | null
          sent_at?: string | null
          created_at?: string
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
          user_id: string
          category: Database["public"]["Enums"]["notification_category"]
          in_app: boolean
          email_digest: boolean
          push: boolean
        }
        Insert: {
          user_id: string
          category: Database["public"]["Enums"]["notification_category"]
          in_app?: boolean
          email_digest?: boolean
          push?: boolean
        }
        Update: {
          user_id?: string
          category?: Database["public"]["Enums"]["notification_category"]
          in_app?: boolean
          email_digest?: boolean
          push?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          category: Database["public"]["Enums"]["notification_category"]
          title: string
          body: string | null
          link: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          category: Database["public"]["Enums"]["notification_category"]
          title: string
          body?: string | null
          link?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          category?: Database["public"]["Enums"]["notification_category"]
          title?: string
          body?: string | null
          link?: string | null
          read_at?: string | null
          created_at?: string
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
          id: string
          slug: string
          name: string
          short_name: string | null
          kind: Database["public"]["Enums"]["choir_kind"]
          brand_color: string | null
          logo_path: string | null
          timezone: string
          default_lang: Database["public"]["Enums"]["lang"]
          is_demo: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          short_name?: string | null
          kind?: Database["public"]["Enums"]["choir_kind"]
          brand_color?: string | null
          logo_path?: string | null
          timezone?: string
          default_lang?: Database["public"]["Enums"]["lang"]
          is_demo?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          short_name?: string | null
          kind?: Database["public"]["Enums"]["choir_kind"]
          brand_color?: string | null
          logo_path?: string | null
          timezone?: string
          default_lang?: Database["public"]["Enums"]["lang"]
          is_demo?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          organization_id: string
          assignment_id: string | null
          person_id: string | null
          payer_name: string | null
          amount_cents: number
          refunded_cents: number
          method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          receipt_number: string | null
          note: string | null
          received_at: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          assignment_id?: string | null
          person_id?: string | null
          payer_name?: string | null
          amount_cents: number
          refunded_cents?: number
          method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          receipt_number?: string | null
          note?: string | null
          received_at?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          assignment_id?: string | null
          person_id?: string | null
          payer_name?: string | null
          amount_cents?: number
          refunded_cents?: number
          method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          receipt_number?: string | null
          note?: string | null
          received_at?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id", "organization_id"]
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
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      people: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          first_name: string
          last_name: string
          preferred_name: string | null
          email: string | null
          phone: string | null
          date_of_birth: string | null
          pronouns: string | null
          lang: Database["public"]["Enums"]["lang"]
          status: Database["public"]["Enums"]["person_status"]
          contact_visibility: Database["public"]["Enums"]["contact_visibility"]
          photo_path: string | null
          messaging_suspended_at: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          first_name: string
          last_name: string
          preferred_name?: string | null
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          pronouns?: string | null
          lang?: Database["public"]["Enums"]["lang"]
          status?: Database["public"]["Enums"]["person_status"]
          contact_visibility?: Database["public"]["Enums"]["contact_visibility"]
          photo_path?: string | null
          messaging_suspended_at?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          preferred_name?: string | null
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          pronouns?: string | null
          lang?: Database["public"]["Enums"]["lang"]
          status?: Database["public"]["Enums"]["person_status"]
          contact_visibility?: Database["public"]["Enums"]["contact_visibility"]
          photo_path?: string | null
          messaging_suspended_at?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
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
          id: string
          organization_id: string
          title: string
          composer: string | null
          arranger: string | null
          voicing: string | null
          language: string | null
          duration_seconds: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          composer?: string | null
          arranger?: string | null
          voicing?: string | null
          language?: string | null
          duration_seconds?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          composer?: string | null
          arranger?: string | null
          voicing?: string | null
          language?: string | null
          duration_seconds?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
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
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      practice_assignments: {
        Row: {
          id: string
          organization_id: string
          piece_id: string
          title: string
          instructions: string | null
          bars: string | null
          due_on: string | null
          section_ids: string[]
          released_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          piece_id: string
          title: string
          instructions?: string | null
          bars?: string | null
          due_on?: string | null
          section_ids?: string[]
          released_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          piece_id?: string
          title?: string
          instructions?: string | null
          bars?: string | null
          due_on?: string | null
          section_ids?: string[]
          released_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_assignments_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      practice_completions: {
        Row: {
          organization_id: string
          assignment_id: string
          person_id: string
          completed_at: string
        }
        Insert: {
          organization_id: string
          assignment_id: string
          person_id: string
          completed_at?: string
        }
        Update: {
          organization_id?: string
          assignment_id?: string
          person_id?: string
          completed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_completions_organization_id_assignment_id_fkey"
            columns: ["organization_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "practice_assignments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "practice_completions_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      practice_log: {
        Row: {
          id: string
          organization_id: string
          person_id: string
          piece_id: string | null
          practised_on: string
          minutes: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          person_id: string
          piece_id?: string | null
          practised_on?: string
          minutes: number
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          person_id?: string
          piece_id?: string | null
          practised_on?: string
          minutes?: number
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_log_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "practice_log_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          lang: Database["public"]["Enums"]["lang"]
          theme: Database["public"]["Enums"]["theme_mode"]
          last_organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          lang?: Database["public"]["Enums"]["lang"]
          theme?: Database["public"]["Enums"]["theme_mode"]
          last_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          lang?: Database["public"]["Enums"]["lang"]
          theme?: Database["public"]["Enums"]["theme_mode"]
          last_organization_id?: string | null
          created_at?: string
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
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          organization_id: string
          role_id: string
          area: string
          level: string
        }
        Insert: {
          organization_id: string
          role_id: string
          area: string
          level?: string
        }
        Update: {
          organization_id?: string
          role_id?: string
          area?: string
          level?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_organization_id_role_id_fkey"
            columns: ["organization_id", "role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          organization_id: string
          key: string | null
          name_en: string
          name_fr: string
          description_en: string | null
          description_fr: string | null
          locked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          key?: string | null
          name_en: string
          name_fr: string
          description_en?: string | null
          description_fr?: string | null
          locked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          key?: string | null
          name_en?: string
          name_fr?: string
          description_en?: string | null
          description_fr?: string | null
          locked?: boolean
          created_at?: string
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
          id: string
          organization_id: string
          piece_id: string
          label: string
          storage_path: string
          size_bytes: number | null
          section_id: string | null
          released_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          piece_id: string
          label?: string
          storage_path: string
          size_bytes?: number | null
          section_id?: string | null
          released_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          piece_id?: string
          label?: string
          storage_path?: string
          size_bytes?: number | null
          section_id?: string | null
          released_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_files_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "score_files_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      seasons: {
        Row: {
          id: string
          organization_id: string
          name: string
          starts_on: string
          ends_on: string
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          starts_on: string
          ends_on: string
          is_current?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          starts_on?: string
          ends_on?: string
          is_current?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_charts: {
        Row: {
          id: string
          organization_id: string
          event_id: string
          name: string
          layout: Json
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_id: string
          name?: string
          layout?: Json
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_id?: string
          name?: string
          layout?: Json
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_charts_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      seating_positions: {
        Row: {
          organization_id: string
          chart_id: string
          person_id: string
          row_label: string
          seat: number
        }
        Insert: {
          organization_id: string
          chart_id: string
          person_id: string
          row_label: string
          seat: number
        }
        Update: {
          organization_id?: string
          chart_id?: string
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
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "seating_positions_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      sections: {
        Row: {
          id: string
          organization_id: string
          key: string
          name_en: string
          name_fr: string
          sort: number
        }
        Insert: {
          id?: string
          organization_id: string
          key: string
          name_en: string
          name_fr: string
          sort?: number
        }
        Update: {
          id?: string
          organization_id?: string
          key?: string
          name_en?: string
          name_fr?: string
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
          id: string
          organization_id: string
          event_id: string
          person_id: string
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_id: string
          person_id: string
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_id?: string
          person_id?: string
          code?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_links_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "seller_links_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      set_list_items: {
        Row: {
          organization_id: string
          event_id: string
          piece_id: string
          position: number
        }
        Insert: {
          organization_id: string
          event_id: string
          piece_id: string
          position: number
        }
        Update: {
          organization_id?: string
          event_id?: string
          piece_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "set_list_items_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "set_list_items_organization_id_piece_id_fkey"
            columns: ["organization_id", "piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      staff_notes: {
        Row: {
          id: string
          organization_id: string
          person_id: string
          author_id: string | null
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          person_id: string
          author_id?: string | null
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          person_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_notes_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      terms: {
        Row: {
          id: string
          organization_id: string
          season_id: string
          name: string
          starts_on: string
          ends_on: string
          absence_limit: number | null
        }
        Insert: {
          id?: string
          organization_id: string
          season_id: string
          name: string
          starts_on: string
          ends_on: string
          absence_limit?: number | null
        }
        Update: {
          id?: string
          organization_id?: string
          season_id?: string
          name?: string
          starts_on?: string
          ends_on?: string
          absence_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_organization_id_season_id_fkey"
            columns: ["organization_id", "season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      ticket_orders: {
        Row: {
          id: string
          organization_id: string
          event_id: string
          buyer_name: string
          buyer_email: string
          seller_link_id: string | null
          total_cents: number
          refunded_cents: number
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_id: string
          buyer_name: string
          buyer_email: string
          seller_link_id?: string | null
          total_cents: number
          refunded_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_id?: string
          buyer_name?: string
          buyer_email?: string
          seller_link_id?: string | null
          total_cents?: number
          refunded_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_orders_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ticket_orders_organization_id_seller_link_id_fkey"
            columns: ["organization_id", "seller_link_id"]
            isOneToOne: false
            referencedRelation: "seller_links"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          id: string
          organization_id: string
          event_id: string
          name: string
          price_cents: number
          capacity: number | null
          sales_start_at: string | null
          sales_end_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_id: string
          name: string
          price_cents: number
          capacity?: number | null
          sales_start_at?: string | null
          sales_end_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_id?: string
          name?: string
          price_cents?: number
          capacity?: number | null
          sales_start_at?: string | null
          sales_end_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      tickets: {
        Row: {
          id: string
          organization_id: string
          order_id: string | null
          ticket_type_id: string
          issued_to: string | null
          is_comp: boolean
          code: string
          scanned_at: string | null
          scanned_by: string | null
          voided_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          order_id?: string | null
          ticket_type_id: string
          issued_to?: string | null
          is_comp?: boolean
          code?: string
          scanned_at?: string | null
          scanned_by?: string | null
          voided_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          order_id?: string | null
          ticket_type_id?: string
          issued_to?: string | null
          is_comp?: boolean
          code?: string
          scanned_at?: string | null
          scanned_by?: string | null
          voided_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_organization_id_issued_to_fkey"
            columns: ["organization_id", "issued_to"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "tickets_organization_id_order_id_fkey"
            columns: ["organization_id", "order_id"]
            isOneToOne: false
            referencedRelation: "ticket_orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "tickets_organization_id_ticket_type_id_fkey"
            columns: ["organization_id", "ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      voice_parts: {
        Row: {
          id: string
          organization_id: string
          section_id: string
          key: string
          name_en: string
          name_fr: string
          sort: number
        }
        Insert: {
          id?: string
          organization_id: string
          section_id: string
          key: string
          name_en: string
          name_fr: string
          sort?: number
        }
        Update: {
          id?: string
          organization_id?: string
          section_id?: string
          key?: string
          name_en?: string
          name_fr?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "voice_parts_organization_id_section_id_fkey"
            columns: ["organization_id", "section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      volunteer_jobs: {
        Row: {
          id: string
          organization_id: string
          event_id: string | null
          title: string
          description: string | null
          requires_police_check: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_id?: string | null
          title: string
          description?: string | null
          requires_police_check?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_id?: string | null
          title?: string
          description?: string | null
          requires_police_check?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_jobs_organization_id_event_id_fkey"
            columns: ["organization_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
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
          organization_id: string
          slot_id: string
          person_id: string
          created_at: string
          hours_logged: number | null
        }
        Insert: {
          organization_id: string
          slot_id: string
          person_id: string
          created_at?: string
          hours_logged?: number | null
        }
        Update: {
          organization_id?: string
          slot_id?: string
          person_id?: string
          created_at?: string
          hours_logged?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_signups_organization_id_person_id_fkey"
            columns: ["organization_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "volunteer_signups_organization_id_slot_id_fkey"
            columns: ["organization_id", "slot_id"]
            isOneToOne: false
            referencedRelation: "volunteer_slots"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      volunteer_slots: {
        Row: {
          id: string
          organization_id: string
          job_id: string
          starts_at: string
          ends_at: string
          needed: number
        }
        Insert: {
          id?: string
          organization_id: string
          job_id: string
          starts_at: string
          ends_at: string
          needed?: number
        }
        Update: {
          id?: string
          organization_id?: string
          job_id?: string
          starts_at?: string
          ends_at?: string
          needed?: number
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_slots_organization_id_job_id_fkey"
            columns: ["organization_id", "job_id"]
            isOneToOne: false
            referencedRelation: "volunteer_jobs"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
    }
    Views: {
      fee_balances: {
        Row: {
          assignment_id: string | null
          organization_id: string | null
          person_id: string | null
          fee_id: string | null
          name: string | null
          due_on: string | null
          amount_cents: number | null
          paid_cents: number | null
          adjusted_cents: number | null
        }
        Relationships: []
      }
      member_directory: {
        Row: {
          id: string | null
          organization_id: string | null
          first_name: string | null
          last_name: string | null
          preferred_name: string | null
          pronouns: string | null
          section_id: string | null
          voice_part_id: string | null
          is_staff: boolean | null
          email: string | null
          phone: string | null
          photo_path: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      email_budget_today: {
        Args: { org: string }
        Returns: { sent_today: number; remaining_today: number; queued_for_choir: number }[]
      }
      email_daily_cap: {
        Args: never
        Returns: number
      }
      link_existing_account: {
        Args: { person: string }
        Returns: boolean
      }
      log_event: {
        Args: { org: string; action: string; entity: string; entity_id?: string; details?: Json }
        Returns: undefined
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
      consent_kind: "participation" | "code_of_conduct" | "photo_video" | "medical_info"
      contact_visibility: "private" | "choir"
      conversation_status: "open" | "resolved"
      email_status: "queued" | "sending" | "sent" | "failed" | "suppressed"
      event_type: "rehearsal" | "sectional" | "concert" | "tour" | "social" | "deadline"
      form_kind: "registration" | "permission" | "medical" | "consent" | "agreement" | "survey" | "other"
      form_status: "draft" | "open" | "closed"
      lang: "en" | "fr"
      message_category: "absence" | "music" | "fees" | "general"
      notification_category: "announcements" | "schedule" | "music" | "messages" | "forms" | "fees" | "tickets" | "volunteers" | "system"
      order_status: "pending" | "paid" | "refunded" | "partially_refunded" | "cancelled"
      payment_method: "card" | "cash" | "cheque" | "etransfer"
      payment_status: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded"
      person_status: "invited" | "active" | "archived"
      response_status: "in_progress" | "submitted" | "changes" | "approved"
      theme_mode: "auto" | "light" | "dark"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
