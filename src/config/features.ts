/**
 * Feature Flags 설정
 *
 * MEARROW 앱의 기능 ON/OFF 제어
 * Phase별로 기능을 점진적으로 활성화할 때 사용합니다.
 *
 * @usage
 * ```tsx
 * import { FEATURES } from '@/config/features';
 *
 * if (FEATURES.NEWS_PAGE) {
 *   // 뉴스 페이지 관련 코드
 * }
 * ```
 *
 * @updated 2026-06-10 - Remove legacy hidden page flags
 */

export const FEATURES = {
  /**
   * 명예의 전당 (Hall of Fame)
   * - 경로: /hall-of-fame
   * - 상태: Phase 1에서 활성화
   */
  HALL_OF_FAME_PAGE: true,

  /**
   * 뉴스 페이지 (News)
   * - 경로: /news
   * - 상태: Phase 1에서 활성화
   */
  NEWS_PAGE: true,

  /**
   * 오디션 정보 페이지 (Auditions)
   * - 경로: /auditions
   * - 정적 콘텐츠 + 검색 색인용 상세 페이지
   */
  AUDITIONS_PAGE: true,

  /**
   * 관심 피드 (소속사·아티스트 팔로우)
   * - 경로: /following
   */
  FOLLOWING_PAGE: true,

  /**
   * 프로필/로그인 (Profile/Auth)
   * - 경로: /my, /login
   * - 상태: T1.70에서 활성화 (Google/Kakao OAuth + 이메일 로그인)
   */
  AUTH_SYSTEM: true,

  /**
   * Kakao OAuth 로그인
   * - 카카오 로그인 버튼 표시 여부
   * - 상태: 활성화됨
   */
  KAKAO_LOGIN: true,

  /**
   * T1.75: 산하 레이블 투표 UI (Sub-Label Voting)
   * - HYBE(6개 산하), YG(1개 산하) 투표 시 서브레이블 필터 표시
   * - 투표는 항상 부모 소속사에 귀속, 서브레이블은 UI 필터 역할만
   */
  SUB_LABEL_VOTING: true,

} as const;

/** Feature Flag 타입 */
export type FeatureKey = keyof typeof FEATURES;

/**
 * 특정 기능이 활성화되어 있는지 확인
 * @param feature 기능 키
 * @returns 활성화 여부
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}
