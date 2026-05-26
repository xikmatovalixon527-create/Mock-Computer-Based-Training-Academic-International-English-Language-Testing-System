export type Role = 'student' | 'teacher';

export interface User {
  id: string;
  full_name: string;
  role: Role;
}

export interface Essay {
  id: string;
  student_id: string;
  task_type: 'task1' | 'task2' | 'both';
  topic_text: string;
  content_task1: string | null;
  content_task2: string | null;
  status: 'pending' | 'reviewed';
  overall_band: number | null;
  created_at: string;
  submitted_at: string | null;
  full_name?: string; // Student name (joined from users table)
}

export interface Review {
  id: string;
  essay_id: string;
  teacher_id: string;
  ta_band: number;
  ta_feedback: string | null;
  cc_band: number;
  cc_feedback: string | null;
  lr_band: number;
  lr_feedback: string | null;
  gra_band: number;
  gra_feedback: string | null;
  overall_feedback: string | null;
  corrected_text: string | null;
  sample_answer: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  review_id: string;
  task_number: 1 | 2;
  start_index: number;
  end_index: number;
  selected_text: string;
  comment_text: string;
}
