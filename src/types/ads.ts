/**
 * Google AdSense 광고 슬롯 ID 레지스트리
 *
 * AdSense 콘솔에서 생성한 각 광고 단위의 슬롯 ID를 관리
 * 실제 슬롯 ID는 AdSense 콘솔에서 광고 단위 생성 후 교체 필요
 */
export const AD_SLOTS = {
  /** 홈페이지 하단 (leaderboard) */
  HOME_BOTTOM: '1606492335',
  /** 뉴스 목록 하단 (leaderboard) */
  NEWS_LIST_BOTTOM: '6786666829',
  /** 명예의 전당 하단 (leaderboard) */
  HOF_BOTTOM: '9045998652',
  /** 공지사항 목록 하단 (leaderboard) */
  NOTICE_LIST_BOTTOM: '2847421810',
  /** 공지사항 상세 - 기사 내 (in-article) */
  NOTICE_DETAIL_ARTICLE: '2480590308',
} as const;
