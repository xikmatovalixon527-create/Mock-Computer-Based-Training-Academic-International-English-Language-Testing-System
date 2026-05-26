import sql from './db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export async function findUserByName(fullName: string) {
  const rows = await sql`SELECT * FROM users WHERE full_name = ${fullName} LIMIT 1`;
  return rows[0] || null;
}

export async function createUser(fullName: string, passwordHash: string, role: string, groupName?: string) {
  const rows = await sql`
    INSERT INTO users (full_name, password_hash, role, group_name)
    VALUES (${fullName}, ${passwordHash}, ${role}, ${groupName || null})
    RETURNING id, full_name, role, group_name
  `;
  return rows[0];
}

export async function getAllStudents() {
  return sql`
    SELECT u.id, u.full_name, u.role, u.group_name, u.created_at,
           COUNT(e.id)::int AS essay_count
    FROM users u
    LEFT JOIN essays e ON e.student_id = u.id
    WHERE u.role = 'student'
    GROUP BY u.id, u.group_name
    ORDER BY u.created_at DESC
  `;
}

export async function updateStudent(id: string, fullName: string, groupName: string) {
  if (!isValidUuid(id)) return null;
  const rows = await sql`
    UPDATE users
    SET full_name = ${fullName}, group_name = ${groupName}
    WHERE id = ${id} AND role = 'student'
    RETURNING id, full_name, group_name
  `;
  return rows[0];
}

export async function deleteStudent(id: string) {
  if (!isValidUuid(id)) return;
  await sql`DELETE FROM users WHERE id = ${id} AND role = 'student'`;
}

// ─── Essays ────────────────────────────────────────────────────────────────────

export async function getEssays(studentId?: string) {
  if (studentId) {
    return sql`
      SELECT e.*, u.full_name, u.group_name
      FROM essays e
      JOIN users u ON u.id = e.student_id
      WHERE e.student_id = ${studentId}
      ORDER BY e.created_at DESC
    `;
  }
  return sql`
    SELECT e.*, u.full_name, u.group_name
    FROM essays e
    JOIN users u ON u.id = e.student_id
    ORDER BY e.created_at DESC
  `;
}

export async function getEssayById(id: string) {
  if (!isValidUuid(id)) return null;
  const rows = await sql`
    SELECT e.*, u.full_name
    FROM essays e
    JOIN users u ON u.id = e.student_id
    WHERE e.id = ${id}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function createEssay(data: {
  student_id: string;
  task_type: string;
  topic_text: string;
  content_task1?: string;
  content_task2?: string;
}) {
  const rows = await sql`
    INSERT INTO essays (student_id, task_type, topic_text, content_task1, content_task2, status, submitted_at)
    VALUES (${data.student_id}, ${data.task_type}, ${data.topic_text}, 
            ${data.content_task1 || null}, ${data.content_task2 || null}, 
            'pending', NOW())
    RETURNING *
  `;
  return rows[0];
}

export async function deleteEssay(id: string) {
  if (!isValidUuid(id)) return;
  await sql`DELETE FROM essays WHERE id = ${id}`;
}

// ─── Reviews ───────────────────────────────────────────────────────────────────

export async function getReviewByEssayId(essayId: string) {
  if (!isValidUuid(essayId)) return null;

  const reviews = await sql`
    SELECT * FROM reviews 
    WHERE essay_id = ${essayId} 
    LIMIT 1
  `;
  if (reviews.length === 0) return null;
  const review = reviews[0];

  const comments = await sql`
    SELECT id, review_id, task_number, start_index, end_index, selected_text, comment_text
    FROM comments
    WHERE review_id = ${review.id}
  `;
  
  review.comments = comments || [];
  return review;
}

export async function saveReview(params: {
  essay_id: string;
  teacher_id: string;
  ta_band: number; ta_feedback: string;
  cc_band: number; cc_feedback: string;
  lr_band: number; lr_feedback: string;
  gra_band: number; gra_feedback: string;
  overall_feedback: string;
  overall_band: number;
  comments: unknown[];
}) {
  const rows = await sql`
    SELECT save_review_with_comments(
      ${params.essay_id}::uuid,
      ${params.teacher_id}::uuid,
      ${params.ta_band}, ${params.ta_feedback},
      ${params.cc_band}, ${params.cc_feedback},
      ${params.lr_band}, ${params.lr_feedback},
      ${params.gra_band}, ${params.gra_feedback},
      ${params.overall_feedback}, ${params.overall_band},
      ${JSON.stringify(params.comments)}::jsonb
    ) AS review_id
  `;
  return rows[0];
}

export async function upsertLiveDraft(params: {
  student_id: string;
  task_type: string;
  topic_text: string;
  content_task1: string | null;
  content_task2: string | null;
  active_tab: number;
}) {
  const rows = await sql`
    INSERT INTO live_drafts (
      student_id, task_type, topic_text, content_task1, content_task2, active_tab, last_active, updated_at
    ) VALUES (
      ${params.student_id}::uuid,
      ${params.task_type},
      ${params.topic_text},
      ${params.content_task1},
      ${params.content_task2},
      ${params.active_tab},
      NOW(),
      NOW()
    )
    ON CONFLICT (student_id) DO UPDATE SET
      task_type = EXCLUDED.task_type,
      topic_text = EXCLUDED.topic_text,
      content_task1 = EXCLUDED.content_task1,
      content_task2 = EXCLUDED.content_task2,
      active_tab = EXCLUDED.active_tab,
      last_active = NOW(),
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0];
}

export async function deleteLiveDraft(studentId: string) {
  if (!isValidUuid(studentId)) return;
  await sql`DELETE FROM live_drafts WHERE student_id = ${studentId}::uuid`;
}

export async function getLiveDraftByStudentId(studentId: string) {
  if (!isValidUuid(studentId)) return null;
  const rows = await sql`
    SELECT ld.*, u.full_name, u.group_name
    FROM live_drafts ld
    JOIN users u ON u.id = ld.student_id
    WHERE ld.student_id = ${studentId}::uuid
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function getAllLiveDrafts() {
  return sql`
    SELECT ld.*, u.full_name, u.group_name
    FROM live_drafts ld
    JOIN users u ON u.id = ld.student_id
    ORDER BY ld.updated_at DESC
  `;
}