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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      application_shortlists: {
        Row: {
          application_id: string
          created_at: string
          id: string
          job_id: string
          note: string | null
          rank: number | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          job_id: string
          note?: string | null
          rank?: number | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          job_id?: string
          note?: string | null
          rank?: number | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_shortlists_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_shortlists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          business_notes: string | null
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          business_notes?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          business_notes?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          company_size: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          founded_year: number | null
          logo_url: string | null
          nipt: string | null
          sector: string | null
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          company_size?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          founded_year?: number | null
          logo_url?: string | null
          nipt?: string | null
          sector?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          company_size?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          founded_year?: number | null
          logo_url?: string | null
          nipt?: string | null
          sector?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          business_id: string
          certificate_number: string
          contract_id: string
          created_at: string
          description: string | null
          feedback_id: string | null
          final_grade: number | null
          hours_completed: number | null
          id: string
          issued_at: string
          issued_by: string
          revoked_at: string | null
          revoked_reason: string | null
          skills: string[] | null
          student_id: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          certificate_number: string
          contract_id: string
          created_at?: string
          description?: string | null
          feedback_id?: string | null
          final_grade?: number | null
          hours_completed?: number | null
          id?: string
          issued_at?: string
          issued_by: string
          revoked_at?: string | null
          revoked_reason?: string | null
          skills?: string[] | null
          student_id: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          certificate_number?: string
          contract_id?: string
          created_at?: string
          description?: string | null
          feedback_id?: string | null
          final_grade?: number | null
          hours_completed?: number | null
          id?: string
          issued_at?: string
          issued_by?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          skills?: string[] | null
          student_id?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "practice_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          added_by: string
          class_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          added_by: string
          class_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          added_by?: string
          class_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          professional_program: string | null
          school_name: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          professional_program?: string | null
          school_name?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          professional_program?: string | null
          school_name?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_events: {
        Row: {
          action: string
          actor_id: string
          contract_id: string
          created_at: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          contract_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          application_id: string | null
          business_id: string
          business_signature_image: string | null
          business_signature_ip: string | null
          business_signature_name: string | null
          business_signed_at: string | null
          compensation: number | null
          compensation_currency: string | null
          content: string
          created_at: string
          documents_ready: boolean
          end_date: string | null
          hours_per_week: number | null
          id: string
          job_id: string | null
          location: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          student_id: string
          student_signature_image: string | null
          student_signature_ip: string | null
          student_signature_name: string | null
          student_signed_at: string | null
          teacher_id: string | null
          title: string
          updated_at: string
          winner_confirmed_at: string | null
        }
        Insert: {
          application_id?: string | null
          business_id: string
          business_signature_image?: string | null
          business_signature_ip?: string | null
          business_signature_name?: string | null
          business_signed_at?: string | null
          compensation?: number | null
          compensation_currency?: string | null
          content: string
          created_at?: string
          documents_ready?: boolean
          end_date?: string | null
          hours_per_week?: number | null
          id?: string
          job_id?: string | null
          location?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          student_id: string
          student_signature_image?: string | null
          student_signature_ip?: string | null
          student_signature_name?: string | null
          student_signed_at?: string | null
          teacher_id?: string | null
          title: string
          updated_at?: string
          winner_confirmed_at?: string | null
        }
        Update: {
          application_id?: string | null
          business_id?: string
          business_signature_image?: string | null
          business_signature_ip?: string | null
          business_signature_name?: string | null
          business_signed_at?: string | null
          compensation?: number | null
          compensation_currency?: string | null
          content?: string
          created_at?: string
          documents_ready?: boolean
          end_date?: string | null
          hours_per_week?: number | null
          id?: string
          job_id?: string | null
          location?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          student_id?: string
          student_signature_image?: string | null
          student_signature_ip?: string | null
          student_signature_name?: string | null
          student_signed_at?: string | null
          teacher_id?: string | null
          title?: string
          updated_at?: string
          winner_confirmed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          contract_id: string | null
          created_at: string
          id: string
          job_id: string | null
          last_message_at: string
          participant_a: string
          participant_b: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          last_message_at?: string
          participant_a: string
          participant_b: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          last_message_at?: string
          participant_a?: string
          participant_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          next_action_at: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["crm_lead_status"]
          updated_at: string
          value: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          next_action_at?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          next_action_at?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          created_at: string
          done: boolean
          due_at: string | null
          id: string
          lead_id: string
          title: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_at?: string | null
          id?: string
          lead_id: string
          title: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_at?: string | null
          id?: string
          lead_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          benefits: string | null
          business_id: string
          category: string | null
          city: string | null
          created_at: string
          deadline: string | null
          description: string
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          positions: number
          requirements: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          skills: string[] | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          views_count: number
          work_mode: Database["public"]["Enums"]["work_mode"]
        }
        Insert: {
          benefits?: string | null
          business_id: string
          category?: string | null
          city?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          positions?: number
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          views_count?: number
          work_mode?: Database["public"]["Enums"]["work_mode"]
        }
        Update: {
          benefits?: string | null
          business_id?: string
          category?: string | null
          city?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          positions?: number
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          views_count?: number
          work_mode?: Database["public"]["Enums"]["work_mode"]
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_evaluations: {
        Row: {
          attendance_percent: number | null
          comment: string | null
          contract_id: string | null
          created_at: string
          id: string
          improvements: string | null
          period_end: string | null
          period_start: string | null
          score: number | null
          strengths: string | null
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          attendance_percent?: number | null
          comment?: string | null
          contract_id?: string | null
          created_at?: string
          id?: string
          improvements?: string | null
          period_end?: string | null
          period_start?: string | null
          score?: number | null
          strengths?: string | null
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          attendance_percent?: number | null
          comment?: string | null
          contract_id?: string | null
          created_at?: string
          id?: string
          improvements?: string | null
          period_end?: string | null
          period_start?: string | null
          score?: number | null
          strengths?: string | null
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_evaluations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_feedback: {
        Row: {
          answers: Json
          business_id: string
          comment: string | null
          contract_id: string
          created_at: string
          id: string
          passed: boolean
          score: number
          student_id: string
          submitted_at: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          business_id: string
          comment?: string | null
          contract_id: string
          created_at?: string
          id?: string
          passed?: boolean
          score?: number
          student_id: string
          submitted_at?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          business_id?: string
          comment?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          passed?: boolean
          score?: number
          student_id?: string
          submitted_at?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_feedback_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          contract_id: string
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          contract_id: string
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          available_from: string | null
          bio: string | null
          city: string | null
          created_at: string
          cv_url: string | null
          date_of_birth: string | null
          education: string | null
          experience: string | null
          languages: string[] | null
          linkedin_url: string | null
          looking_for: string | null
          portfolio_url: string | null
          professional_program: string | null
          school_name: string | null
          skills: string[] | null
          study_year: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_from?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          cv_url?: string | null
          date_of_birth?: string | null
          education?: string | null
          experience?: string | null
          languages?: string[] | null
          linkedin_url?: string | null
          looking_for?: string | null
          portfolio_url?: string | null
          professional_program?: string | null
          school_name?: string | null
          skills?: string[] | null
          study_year?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_from?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          cv_url?: string | null
          date_of_birth?: string | null
          education?: string | null
          experience?: string | null
          languages?: string[] | null
          linkedin_url?: string | null
          looking_for?: string | null
          portfolio_url?: string | null
          professional_program?: string | null
          school_name?: string | null
          skills?: string[] | null
          study_year?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          bio: string | null
          created_at: string
          professional_programs: string[] | null
          school_name: string | null
          subject: string | null
          updated_at: string
          user_id: string
          work_phone: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          professional_programs?: string[] | null
          school_name?: string | null
          subject?: string | null
          updated_at?: string
          user_id: string
          work_phone?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          professional_programs?: string[] | null
          school_name?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string
          work_phone?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          business_verified: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          organization: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      admin_platform_stats: {
        Args: never
        Returns: {
          published_jobs: number
          total_applications: number
          total_businesses: number
          total_certificates: number
          total_contracts: number
          total_jobs: number
          total_students: number
          total_teachers: number
          total_users: number
          unverified_businesses: number
        }[]
      }
      admin_set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      find_student_by_email: {
        Args: { _email: string }
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      generate_certificate_number: { Args: never; Returns: string }
      get_or_create_conversation: {
        Args: { _contract_id?: string; _job_id?: string; _other_user: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_certificate: {
        Args: { _number: string }
        Returns: {
          certificate_number: string
          company_name: string
          description: string
          final_grade: number
          hours_completed: number
          issued_at: string
          revoked_at: string
          revoked_reason: string
          skills: string[]
          student_name: string
          teacher_name: string
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "teacher" | "student" | "business"
      application_status:
        | "pending"
        | "reviewing"
        | "accepted"
        | "rejected"
        | "withdrawn"
      contract_status:
        | "draft"
        | "sent"
        | "signed_student"
        | "signed_business"
        | "active"
        | "completed"
        | "cancelled"
      crm_lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "won"
        | "lost"
      job_status: "draft" | "published" | "closed"
      job_type: "internship" | "full_time" | "part_time" | "apprenticeship"
      work_mode: "onsite" | "remote" | "hybrid"
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
      app_role: ["super_admin", "teacher", "student", "business"],
      application_status: [
        "pending",
        "reviewing",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      contract_status: [
        "draft",
        "sent",
        "signed_student",
        "signed_business",
        "active",
        "completed",
        "cancelled",
      ],
      crm_lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "won",
        "lost",
      ],
      job_status: ["draft", "published", "closed"],
      job_type: ["internship", "full_time", "part_time", "apprenticeship"],
      work_mode: ["onsite", "remote", "hybrid"],
    },
  },
} as const
