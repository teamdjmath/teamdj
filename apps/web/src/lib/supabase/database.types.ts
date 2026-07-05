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
      assignment_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      assignment_progress: {
        Row: {
          assignment_id: string
          completion_pct: number | null
          id: string
          is_overdue: boolean
          student_id: string
          submit_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignment_id: string
          completion_pct?: number | null
          id?: string
          is_overdue?: boolean
          student_id: string
          submit_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignment_id?: string
          completion_pct?: number | null
          id?: string
          is_overdue?: boolean
          student_id?: string
          submit_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_progress_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          category: string | null
          class_id: string
          created_at: string
          due_date: string | null
          id: string
          issue_date: string | null
          title: string
          week_num: number | null
        }
        Insert: {
          category?: string | null
          class_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          issue_date?: string | null
          title: string
          week_num?: number | null
        }
        Update: {
          category?: string | null
          class_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          issue_date?: string | null
          title?: string
          week_num?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          absence_reason: string | null
          class_id: string
          id: string
          session_date: string
          status: string
          student_id: string
        }
        Insert: {
          absence_reason?: string | null
          class_id: string
          id?: string
          session_date: string
          status: string
          student_id: string
        }
        Update: {
          absence_reason?: string | null
          class_id?: string
          id?: string
          session_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      class_groups: {
        Row: {
          created_at: string
          day_of_week: number[] | null
          end_time: string | null
          grade: string
          id: string
          is_active: boolean
          name: string
          schedule: string | null
          start_time: string | null
          subject: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number[] | null
          end_time?: string | null
          grade: string
          id?: string
          is_active?: boolean
          name: string
          schedule?: string | null
          start_time?: string | null
          subject: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number[] | null
          end_time?: string | null
          grade?: string
          id?: string
          is_active?: boolean
          name?: string
          schedule?: string | null
          start_time?: string | null
          subject?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_id: string
          enrolled_at: string
          id: string
          is_active: boolean
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          id?: string
          is_active?: boolean
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          id?: string
          is_active?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          name: string
          phone: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          name: string
          phone: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          name?: string
          phone?: string
        }
        Relationships: []
      }
      course_materials: {
        Row: {
          course_name: string
          created_at: string
          id: string
          title: string
          url: string
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          title: string
          url: string
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      exam_results: {
        Row: {
          auto_rank: boolean | null
          class_id: string | null
          created_at: string
          created_by: string | null
          exam_date: string
          exam_name: string
          exam_type: string
          grade_cuts: Json | null
          id: string
          max_score: number
          rank_in_exam: number | null
          score: number | null
          student_id: string
          study_suggestion: string | null
          total_in_exam: number | null
        }
        Insert: {
          auto_rank?: boolean | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_date: string
          exam_name: string
          exam_type?: string
          grade_cuts?: Json | null
          id?: string
          max_score?: number
          rank_in_exam?: number | null
          score?: number | null
          student_id: string
          study_suggestion?: string | null
          total_in_exam?: number | null
        }
        Update: {
          auto_rank?: boolean | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_date?: string
          exam_name?: string
          exam_type?: string
          grade_cuts?: Json | null
          id?: string
          max_score?: number
          rank_in_exam?: number | null
          score?: number | null
          student_id?: string
          study_suggestion?: string | null
          total_in_exam?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_schedules: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          note: string | null
          scheduled_date: string
          start_time: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          note?: string | null
          scheduled_date: string
          start_time: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          note?: string | null
          scheduled_date?: string
          start_time?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_class_access: {
        Row: {
          class_id: string | null
          course_name: string
          id: string
        }
        Insert: {
          class_id?: string | null
          course_name: string
          id?: string
        }
        Update: {
          class_id?: string | null
          course_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_class_access_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          class_id: string | null
          course_name: string | null
          id: string
          material_url: string | null
          order_num: number
          synced_at: string | null
          title: string
          youtube_playlist_id: string | null
          youtube_video_id: string | null
        }
        Insert: {
          class_id?: string | null
          course_name?: string | null
          id?: string
          material_url?: string | null
          order_num?: number
          synced_at?: string | null
          title: string
          youtube_playlist_id?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          class_id?: string | null
          course_name?: string | null
          id?: string
          material_url?: string | null
          order_num?: number
          synced_at?: string | null
          title?: string
          youtube_playlist_id?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lectures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author_id: string
          class_id: string | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          title: string
        }
        Insert: {
          author_id: string
          class_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title: string
        }
        Update: {
          author_id?: string
          class_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_links: {
        Row: {
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_messages: {
        Row: {
          class_id: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          student_id: string | null
        }
        Insert: {
          class_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          student_id?: string | null
        }
        Update: {
          class_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_messages_target_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_messages_target_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      qna_answers: {
        Row: {
          answered_at: string
          content: string
          difficulty: number | null
          id: string
          is_ai_draft: boolean
          media_urls: string[]
          question_id: string
          rated_at: string | null
          student_rating: number | null
          ta_id: string
        }
        Insert: {
          answered_at?: string
          content: string
          difficulty?: number | null
          id?: string
          is_ai_draft?: boolean
          media_urls?: string[]
          question_id: string
          rated_at?: string | null
          student_rating?: number | null
          ta_id: string
        }
        Update: {
          answered_at?: string
          content?: string
          difficulty?: number | null
          id?: string
          is_ai_draft?: boolean
          media_urls?: string[]
          question_id?: string
          rated_at?: string | null
          student_rating?: number | null
          ta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qna_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "qna_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qna_answers_ta_id_fkey"
            columns: ["ta_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      qna_questions: {
        Row: {
          assigned_ta_id: string | null
          class_id: string | null
          content: string
          created_at: string
          id: string
          image_urls: string[]
          problem_number: string | null
          status: string
          student_id: string
          textbook_id: string | null
          title: string
        }
        Insert: {
          assigned_ta_id?: string | null
          class_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_urls?: string[]
          problem_number?: string | null
          status?: string
          student_id: string
          textbook_id?: string | null
          title?: string
        }
        Update: {
          assigned_ta_id?: string | null
          class_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          problem_number?: string | null
          status?: string
          student_id?: string
          textbook_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "qna_questions_assigned_ta_id_fkey"
            columns: ["assigned_ta_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qna_questions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qna_questions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qna_questions_textbook_id_fkey"
            columns: ["textbook_id"]
            isOneToOne: false
            referencedRelation: "textbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          class_id: string
          class_session_date: string | null
          content_json: Json
          created_at: string
          id: string
          image_url: string | null
          kakao_sent_at: string | null
          report_date: string
          student_id: string | null
        }
        Insert: {
          class_id: string
          class_session_date?: string | null
          content_json?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          kakao_sent_at?: string | null
          report_date: string
          student_id?: string | null
        }
        Update: {
          class_id?: string
          class_session_date?: string | null
          content_json?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          kakao_sent_at?: string | null
          report_date?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          target_date: string
          title: string
          type: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          target_date: string
          title: string
          type: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          target_date?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_status: {
        Row: {
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_inquiries: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          student_name: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          student_name: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          student_name?: string
          user_id?: string
        }
        Relationships: []
      }
      student_todos: {
        Row: {
          content: string
          created_at: string
          id: string
          is_completed: boolean
          student_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_completed?: boolean
          student_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_todos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ta_class_access: {
        Row: {
          class_id: string | null
          id: string
          is_all_classes: boolean
          ta_id: string
        }
        Insert: {
          class_id?: string | null
          id?: string
          is_all_classes?: boolean
          ta_id: string
        }
        Update: {
          class_id?: string | null
          id?: string
          is_all_classes?: boolean
          ta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ta_class_access_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ta_class_access_ta_id_fkey"
            columns: ["ta_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      test_scores: {
        Row: {
          class_id: string
          created_at: string
          difficulty: string | null
          id: string
          input_method: string
          obj_q: number | null
          score: number
          student_id: string
          subj_q: number | null
          test_date: string
          test_id: string | null
          total_q: number | null
        }
        Insert: {
          class_id: string
          created_at?: string
          difficulty?: string | null
          id?: string
          input_method?: string
          obj_q?: number | null
          score: number
          student_id: string
          subj_q?: number | null
          test_date: string
          test_id?: string | null
          total_q?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string
          difficulty?: string | null
          id?: string
          input_method?: string
          obj_q?: number | null
          score?: number
          student_id?: string
          subj_q?: number | null
          test_date?: string
          test_id?: string | null
          total_q?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_scores_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_scores_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          difficulty: string | null
          exam_type: string
          grade_cuts: Json | null
          id: string
          max_score: number
          obj_q: number | null
          subj_q: number | null
          test_date: string
          title: string
          total_q: number | null
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          exam_type?: string
          grade_cuts?: Json | null
          id?: string
          max_score?: number
          obj_q?: number | null
          subj_q?: number | null
          test_date: string
          title: string
          total_q?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          exam_type?: string
          grade_cuts?: Json | null
          id?: string
          max_score?: number
          obj_q?: number | null
          subj_q?: number | null
          test_date?: string
          title?: string
          total_q?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      textbooks: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          agreed_terms_at: string | null
          created_at: string
          grade: string | null
          id: string
          is_active: boolean
          must_change_password: boolean | null
          name: string
          password_hash: string | null
          phone: string | null
          role: string
          school: string | null
          suspended_from: string | null
          suspended_until: string | null
        }
        Insert: {
          agreed_terms_at?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean | null
          name: string
          password_hash?: string | null
          phone?: string | null
          role: string
          school?: string | null
          suspended_from?: string | null
          suspended_until?: string | null
        }
        Update: {
          agreed_terms_at?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean | null
          name?: string
          password_hash?: string | null
          phone?: string | null
          role?: string
          school?: string | null
          suspended_from?: string | null
          suspended_until?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: { Args: never; Returns: string }
      i_am_in_class: { Args: { p_class_id: string }; Returns: boolean }
      is_my_child: { Args: { p_student_id: string }; Returns: boolean }
      monitoring_connection_count: { Args: never; Returns: Json }
      monitoring_ping: { Args: never; Returns: undefined }
      monitoring_slow_queries: {
        Args: never
        Returns: {
          calls: number
          mean_ms: number
          query: string
          rows_per_call: number
          total_ms: number
        }[]
      }
      my_child_is_in_class: { Args: { p_class_id: string }; Returns: boolean }
      ta_has_class_access: { Args: { p_class_id: string }; Returns: boolean }
      ta_has_student_access: {
        Args: { p_student_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
