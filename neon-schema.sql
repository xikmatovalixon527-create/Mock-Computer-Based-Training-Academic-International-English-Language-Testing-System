-- Neon PostgreSQL Schema for IELTS CBT Platform
-- Apply this in your Neon SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE essays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('task1', 'task2', 'both')),
  topic_text TEXT NOT NULL,
  content_task1 TEXT,
  content_task2 TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  overall_band NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE UNIQUE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ta_band NUMERIC(3,1) NOT NULL,
  ta_feedback TEXT,
  cc_band NUMERIC(3,1) NOT NULL,
  cc_feedback TEXT,
  lr_band NUMERIC(3,1) NOT NULL,
  lr_feedback TEXT,
  gra_band NUMERIC(3,1) NOT NULL,
  gra_feedback TEXT,
  overall_feedback TEXT,
  overall_band NUMERIC(3,1),
  corrected_text TEXT,
  sample_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  task_number INTEGER CHECK (task_number IN (1, 2)),
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  comment_text TEXT NOT NULL
);

-- Performance indexes
CREATE INDEX idx_essays_student ON essays(student_id);
CREATE INDEX idx_essays_status ON essays(status);
CREATE INDEX idx_reviews_essay ON reviews(essay_id);
CREATE INDEX idx_reviews_teacher ON reviews(teacher_id);
CREATE INDEX idx_comments_review ON comments(review_id);

-- Transactional function: save review + comments atomically
CREATE OR REPLACE FUNCTION save_review_with_comments(
  p_essay_id UUID,
  p_teacher_id UUID,
  p_ta_band NUMERIC, p_ta_feedback TEXT,
  p_cc_band NUMERIC, p_cc_feedback TEXT,
  p_lr_band NUMERIC, p_lr_feedback TEXT,
  p_gra_band NUMERIC, p_gra_feedback TEXT,
  p_overall_feedback TEXT, p_overall_band NUMERIC,
  p_comments JSONB
) RETURNS UUID AS $$
DECLARE
  v_review_id UUID;
  v_comment JSONB;
BEGIN
  INSERT INTO reviews (
    essay_id, teacher_id, ta_band, ta_feedback, cc_band, cc_feedback,
    lr_band, lr_feedback, gra_band, gra_feedback, overall_feedback, overall_band
  ) VALUES (
    p_essay_id, p_teacher_id, p_ta_band, p_ta_feedback, p_cc_band, p_cc_feedback,
    p_lr_band, p_lr_feedback, p_gra_band, p_gra_feedback, p_overall_feedback, p_overall_band
  )
  ON CONFLICT (essay_id) DO UPDATE SET
    teacher_id = EXCLUDED.teacher_id,
    ta_band = EXCLUDED.ta_band, ta_feedback = EXCLUDED.ta_feedback,
    cc_band = EXCLUDED.cc_band, cc_feedback = EXCLUDED.cc_feedback,
    lr_band = EXCLUDED.lr_band, lr_feedback = EXCLUDED.lr_feedback,
    gra_band = EXCLUDED.gra_band, gra_feedback = EXCLUDED.gra_feedback,
    overall_feedback = EXCLUDED.overall_feedback, overall_band = EXCLUDED.overall_band
  RETURNING id INTO v_review_id;

  DELETE FROM comments WHERE review_id = v_review_id;

  IF p_comments IS NOT NULL AND jsonb_array_length(p_comments) > 0 THEN
    FOR v_comment IN SELECT * FROM jsonb_array_elements(p_comments) LOOP
      INSERT INTO comments (review_id, task_number, start_index, end_index, selected_text, comment_text)
      VALUES (
        v_review_id,
        COALESCE((v_comment->>'task_number')::INTEGER, 1),
        (v_comment->>'start_index')::INTEGER,
        (v_comment->>'end_index')::INTEGER,
        v_comment->>'selected_text',
        v_comment->>'comment_text'
      );
    END LOOP;
  END IF;

  UPDATE essays SET status = 'reviewed', overall_band = p_overall_band WHERE id = p_essay_id;
  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql;