/**
 * MEARROW 오디션 조회수 Supabase API 레이어.
 * 목록에는 현재 누적 조회수를 표시하고, 상세 페이지 진입 시에만 1회 증가시킨다.
 */

import { createClient } from '@/lib/supabase/client';

/** 특정 오디션의 현재 조회수. 저장된 값이 없거나 연결할 수 없으면 0을 반환한다. */
export async function getAuditionViewCount(slug: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('audition_views')
    .select('view_count')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data || typeof data.view_count !== 'number') {
    return 0;
  }

  return data.view_count;
}

/**
 * 상세 페이지 진입 조회수를 원자적으로 증가시킨다.
 * RPC 또는 데이터가 아직 적용되지 않은 환경에서는 0을 반환해 정적 콘텐츠를 계속 표시한다.
 */
export async function incrementAuditionView(slug: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('increment_audition_view', { p_slug: slug });

  return error || typeof data !== 'number' ? 0 : data;
}
