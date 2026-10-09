# Plostack Design Kit 작업 규칙

## 역할

이 저장소는 애플리케이션 구현 저장소가 아니라 디자인 산출물 키트다. 디자인 원본 규칙, raw 화면 아트보드, 디자인 시스템 시각화, 포트폴리오 합성물, 캡처 증거를 목적별로 분리해 관리한다.

## 지칭 규칙

- `Plostack Design Kit`, `플로스텍 디자인 킷`, `플디킷`은 모두 이 저장소와 디자인 키트 체계를 가리킨다.
- 내부 대화에서는 `플디킷`을 줄임말로 사용할 수 있다.

## 디자인 원본

- `DESIGN.md`는 프로젝트 디자인 규칙의 최상위 원본이다.
- 프로젝트의 디자인 규칙이 바뀌면 먼저 `DESIGN.md`를 수정한다.
- surface별 `pub/*/styleguide/`는 `DESIGN.md`의 토큰, 컴포넌트, 패턴, 상태를 시각화해야 한다.
- `pub/`는 raw 화면 publishing/artboard 산출물만 담는다.
- `deliverables/portfolio/`는 외부 제출, 판매 플랫폼, 포트폴리오용 합성 산출물만 담는다.
- `screenshots/`는 검증 증거와 최종 export 결과물을 목적별로 분리해 담는다.

## 디렉토리 규칙

- `pub/`: raw 화면 페이지. 디바이스 목업 합성, 썸네일, 플랫폼별 판매 이미지를 넣지 않는다.
- `sitemap.html`: route/sitemap 검수 페이지.
- `pub/*/styleguide/`: surface별 token, component, pattern, state gallery 페이지.
- `deliverables/portfolio/`: 포트폴리오 패키지 페이지와 export 원본.
- `screenshots/origin/`: 원본 앱/웹 구현 화면 캡처.
- `screenshots/pub/`: raw artboard 캡처.
- `screenshots/styleguide/`: legacy styleguide 검수 캡처.
- `screenshots/deliverables/portfolio/`: 최종 포트폴리오 export PNG.
- `assets/`: 재사용 이미지, 생성 이미지, 브랜드 파일, 목업 리소스.

## 모듈 이식 계약

- 제품 repo에 플디킷을 심을 때 기본 위치는 `design-kit/`이다.
- 별도 모듈 계약 파일을 만들지 않는다. 제품 repo 이식 기준과 에이전트 작업 프롬프트는 이 `AGENTS.md`를 source of truth로 둔다.
- 설치 모드는 `empty-raw`, `sample-scaffold`, `copy-existing` 중 하나로 판단한다.
- `empty-raw`: raw source와 sample screenshot/export만 비우고, `pub/` hub와 portfolio wrapper 구조는 유지한다.
- `sample-scaffold`: 플디킷 자체 검증과 데모용이다. 제품 납품물에 샘플 문구, 샘플 이미지, 샘플 데이터를 그대로 쓰지 않는다.
- `copy-existing`: 승인된 raw source를 `pub/admin/`, `pub/app/`, 필요 시 `pub/land/`에 넣고 screenshot/export를 다시 생성한다.
- 제품 운영 코드 경계는 기본적으로 닫혀 있다. `src/`, `app/`, `public/`, API, DB, auth, middleware는 사용자가 제품 연동을 명시한 별도 작업이 아니면 수정하지 않는다.
- `deliverables/portfolio/*`는 제출/export wrapper다. raw source를 복제하지 않고 `pub/*`를 iframe으로 참조한다.
- `deliverables/portfolio/web/` 폴더명은 export package 이름으로 유지한다. 관리자 raw source의 정식 경로는 `pub/admin/`이며 `pub/web/`은 legacy compatibility shim으로만 둔다.
- 제품 repo 설치 후에는 `/design-kit/`, `/design-kit/pub/`, `/design-kit/sitemap.html`을 기본 검증한다.
- 웹/관리자 target은 `/design-kit/pub/admin/`과 `/design-kit/deliverables/portfolio/web/`를 추가 검증한다.
- 앱 target은 `/design-kit/pub/app/`을 추가 검증한다. MEARROW 앱 콘셉트는 raw 화면으로 보존하고 포트폴리오 export는 만들지 않는다.
- 랜딩 target은 `/design-kit/pub/land/`와 `/design-kit/pub/land/styleguide/`를 추가 검증한다.

## 앱/웹/태블릿 기준

- 앱, 웹, 관리자, 랜딩은 `surface`가 다를 뿐 같은 디자인 키트 흐름을 따른다.
- `pub/app/`, `pub/admin/`, `pub/land/`처럼 surface별 하위 구조를 둔다.
- 모바일 앱 화면과 모바일 웹 화면을 같은 의미로 섞지 않는다.
- 태블릿은 기본적으로 별도 surface가 아니라 `viewport tier`다.
- 태블릿에서 navigation, density, master-detail, split view가 달라지면 `app-tablet` 또는 `web-tablet` 변형으로 명시한다.
- 웹 관리자 화면은 sidebar, topbar, table, filter, form, modal, side sheet, pagination 같은 웹 전용 컴포넌트를 `pub/admin/styleguide/`에 반영한다.
- 랜딩페이지 화면은 1440px desktop web 기준을 기본으로 하고, tablet/mobile은 같은 raw page의 viewport tier로 검수한다.
- 앱 화면은 bottom tab, task/detail flow, sticky action, safe area 같은 앱 전용 패턴을 `pub/app/styleguide/`에 반영한다.
- 태블릿 검수 캡처는 `screenshots/pub/app/`, `screenshots/pub/admin/` 아래에서 `tablet`이 드러나는 파일명으로 남긴다.

## 변경 규칙

- 이 repo에는 root-level `design-lab/` 래퍼를 다시 만들지 않는다. 제품 repo에서는 `design-lab/`를 쓸 수 있지만, 이 repo 자체가 디자인 키트다.
- secret은 로컬에만 둔다. `pub/kakao-config.local.js`는 커밋하지 않는다.
- 사용자가 명시적으로 재생성/교체를 요청하지 않은 기존 포트폴리오 snapshot은 보존한다.
- 산출물 페이지나 screenshot 경로를 이동하면 관련 링크를 함께 수정한다.
- 완료 전 root index, `pub/`, `sitemap.html`, `pub/*/styleguide/`, `deliverables/portfolio/` 주요 route가 정상 응답하는지 확인한다.

## 내보내기 규칙

- 최종 export canvas는 고정 크기를 가져야 한다.
- 다운로드 버튼과 작업용 UI는 최종 PNG 캡처 안에 들어가면 안 된다.
- text overflow, 시각적 overlap, clipped content는 최종 포트폴리오 산출물의 blocker다.
- export 파일명과 크기는 해당 portfolio README 또는 `screenshots/README.md`에 기록한다.
