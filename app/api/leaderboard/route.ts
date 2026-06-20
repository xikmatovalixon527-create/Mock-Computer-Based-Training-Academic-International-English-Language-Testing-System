import { requireAuth, successResponse, handleApiError } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    // Fetch all checked essays that have a valid score
    const { data: essays, error: dbError } = await supabaseAdmin
      .from('essays')
      .select('student_id, overall_band, users!inner(full_name, group_name)')
      .eq('status', 'reviewed')
      .gt('overall_band', 0);

    if (dbError) throw dbError;

    // Group and calculate average and counts
    const studentGrades: Record<string, { full_name: string; group_name: string; total_score: number; count: number }> = {};

    essays?.forEach((essay: any) => {
      const studentId = essay.student_id;
      const score = Number(essay.overall_band);
      const fullName = essay.users?.full_name || 'Anonymous Student';
      const groupName = essay.users?.group_name || 'No Group';

      // Skip feedback only mode where score might be null or default 0
      if (!score || isNaN(score)) return;

      if (!studentGrades[studentId]) {
        studentGrades[studentId] = {
          full_name: fullName,
          group_name: groupName,
          total_score: 0,
          count: 0
        };
      }

      studentGrades[studentId].total_score += score;
      studentGrades[studentId].count += 1;
    });

    const leaderboard = Object.entries(studentGrades)
      .map(([student_id, stats]) => ({
        student_id,
        full_name: stats.full_name,
        group_name: stats.group_name,
        average_band: Number((stats.total_score / stats.count).toFixed(2)),
        essay_count: stats.count
      }))
      .filter(item => item.essay_count > 0);

    // Sort descending by average_band, then by essay_count descending
    leaderboard.sort((a, b) => {
      if (b.average_band !== a.average_band) {
        return b.average_band - a.average_band;
      }
      return b.essay_count - a.essay_count;
    });

    return successResponse({ leaderboard });
  } catch (err) {
    return handleApiError(err);
  }
}
