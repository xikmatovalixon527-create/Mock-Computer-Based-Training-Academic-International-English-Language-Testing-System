import { supabaseAdmin } from './supabase';

export async function findUserByName(fullName: string) {
  const { data } = await supabaseAdmin.from('users').select('*').eq('full_name', fullName).maybeSingle();
  return data;
}

export async function createUser(fullName: string, passwordHash: string, role: string, groupName?: string) {
  const { data, error } = await supabaseAdmin.from('users').insert([{ full_name: fullName, password_hash: passwordHash, role, group_name: groupName }]).select().single();
  if (error) throw error;
  return data;
}

export async function getAllStudents() {
  const { data } = await supabaseAdmin.from('users').select('id, full_name, role, group_name, created_at, essays(id)').eq('role', 'student').order('created_at', { ascending: false });
  return data?.map(u => ({
    ...u,
    essay_count: u.essays ? (u.essays as any[]).length : 0
  })) || [];
}

export async function updateStudent(id: string, fullName: string, groupName: string) {
  const { data } = await supabaseAdmin.from('users').update({ full_name: fullName, group_name: groupName }).eq('id', id).eq('role', 'student').select().single();
  return data;
}

export async function deleteStudent(id: string) {
  await supabaseAdmin.from('users').delete().eq('id', id).eq('role', 'student');
}

export async function getEssays(studentId?: string) {
  let query = supabaseAdmin.from('essays').select('*, users!inner(full_name, group_name)').order('created_at', { ascending: false });
  if (studentId) query = query.eq('student_id', studentId);
  const { data } = await query;
  return data?.map(e => ({ ...e, full_name: (e.users as any).full_name, group_name: (e.users as any).group_name })) || [];
}

export async function getEssayById(id: string) {
  const { data } = await supabaseAdmin.from('essays').select('*, users!inner(full_name)').eq('id', id).maybeSingle();
  if (data) data.full_name = (data.users as any).full_name;
  return data;
}

export async function createEssay(data: { student_id: string; task_type: string; topic_text: string; content_task1?: string; content_task2?: string; }) {
  const { data: result } = await supabaseAdmin.from('essays').insert([{
    student_id: data.student_id, task_type: data.task_type, topic_text: data.topic_text,
    content_task1: data.content_task1, content_task2: data.content_task2, status: 'pending', submitted_at: new Date().toISOString()
  }]).select().single();
  return result;
}

export async function deleteEssay(id: string) {
  await supabaseAdmin.from('essays').delete().eq('id', id);
}

export async function getReviewByEssayId(essayId: string) {
  const { data: review } = await supabaseAdmin.from('reviews').select('*').eq('essay_id', essayId).maybeSingle();
  if (!review) return null;
  const { data: comments } = await supabaseAdmin.from('comments').select('*').eq('review_id', review.id);
  review.comments = comments || [];
  return review;
}

export async function saveReview(params: any) {
  const { data, error } = await supabaseAdmin.rpc('save_review_with_comments', {
    p_essay_id: params.essay_id, p_teacher_id: params.teacher_id,
    p_ta_band: params.ta_band, p_ta_feedback: params.ta_feedback,
    p_cc_band: params.cc_band, p_cc_feedback: params.cc_feedback,
    p_lr_band: params.lr_band, p_lr_feedback: params.lr_feedback,
    p_gra_band: params.gra_band, p_gra_feedback: params.gra_feedback,
    p_overall_feedback: params.overall_feedback, p_overall_band: params.overall_band,
    p_comments: params.comments
  });
  if (error) throw error;
  return data;
}