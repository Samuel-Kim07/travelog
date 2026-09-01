# Travelog 프로젝트 기준선 (2026-09-01)

## 조사 범위와 해석 기준

- 기준 브랜치: `chore/codex-baseline`
- 기준 커밋: `92164be`
- 이 문서는 저장소에 커밋된 정적 파일과 그 안의 참조를 읽어 작성했다.
- Supabase 운영 프로젝트에 접속해 스키마, 정책, 함수 또는 버킷의 실재 여부를 확인하지 않았다. 아래 Supabase 목록에서 "확인"은 **클라이언트 코드가 해당 이름을 참조함을 확인했다**는 뜻이며, 운영 DB에 실제로 존재하거나 현재 호출이 성공한다는 뜻은 아니다.

## 현재 저장소 구조

저장소는 빌드 도구나 패키지 매니저 설정 없이 저장소 루트의 `index.html`을 진입점으로 사용하는 정적 웹 애플리케이션 형태다.

```text
travelog/
├─ index.html                 # 현재 진입 HTML
├─ index_v2.html              # 별도/이전 후보 HTML
├─ index.css                  # 공통 화면 스타일
├─ app.js                     # 앱 상태와 주요 UI 동작
├─ map.js                     # 지도 및 위치 기능
├─ explore.js                 # 탐색 화면
├─ rewards.js                 # 리워드 기능
├─ creator.js                 # 크리에이터/가이드 제작 기능
├─ adventure.js               # 어드벤처 기능
├─ languages.js               # 다국어 처리
├─ supabaseClient.js          # 인증, DB, Storage 연동
├─ mediaStorage.js            # 미디어 저장 처리
├─ deviceStorage.js           # 기기 로컬 저장 처리
├─ memo-*.js / memo-*.css     # 메모 전체화면·편집·보완 기능
├─ guide-delete-feature.*     # 가이드 삭제 기능
├─ panel-toggle.js            # 패널 토글 후보 스크립트
├─ assets/
│  ├─ icons/                  # 기능별 아이콘과 영상 자산
│  └─ images/                 # 브랜드, 프로필, 가이드, 탐색 이미지
├─ *.txt                      # 계획 및 Supabase/자산 사용 안내
└─ serve.py                   # 로컬 정적 서버 보조 스크립트
```

`package.json`, 테스트 설정, 빌드 설정, `.github/workflows`, `CNAME`, `.nojekyll`, `404.html`은 기준 시점의 저장소에서 확인되지 않았다.

## `index.html`에서 로드하는 CSS와 JavaScript

### CSS

로드 순서는 다음과 같다.

1. Font Awesome 6.4.0 CDN
2. Leaflet 1.9.4 CSS CDN
3. `index.css?v=1058`
4. `memo-fullscreen.css`
5. `memo-edit.css`
6. `guide-delete-feature.css?v=1`

### JavaScript

문서 상단에서 Leaflet 1.9.4와 Supabase JavaScript SDK v2를 CDN으로 로드한다. 문서 하단의 로컬 스크립트 로드 순서는 다음과 같다.

1. `supabaseClient.js?v=1019` (`defer`)
2. `map.js?v=1017` (`defer`)
3. `explore.js?v=1004` (`defer`)
4. `rewards.js?v=1005` (`defer`)
5. `mediaStorage.js?v=1003` (`defer`)
6. `deviceStorage.js?v=1007` (`defer`)
7. `creator.js?v=1021` (`defer`)
8. `adventure.js?v=1003` (`defer`)
9. `languages.js?v=1002` (`defer`)
10. `app.js?v=1036` (`defer`)
11. `memo-fullscreen.js`
12. `memo-edit.js?v=2`
13. `memo-extension-fix.js?v=2`
14. `guide-delete-feature.js?v=1`

마지막 네 스크립트에는 `defer`가 없지만 문서 끝에서 순서대로 실행된다. `panel-toggle.js`는 `index.html`에서 로드되지 않는다.

## 확인된 Supabase 테이블, RPC, Storage 버킷

### 코드에서 참조되는 테이블

- `profiles`
- `guides`
- `guide_media`
- `guide_pins`
- `guide_purchases`
- `offline_downloads`
- `friendships`
- `messages`
- `memo_pins`
- `user_access_regions`

### 코드에서 참조되는 RPC

- `extend_memo_pin`
- `prepare_owned_guide_delete_v1`
- `delete_owned_guide_v1`

### 코드에서 이름이 고정된 Storage 버킷

- `guide-public`
- `guide-media`
- `memo-pin-media`

가이드 삭제 로직은 `guide_media.bucket_name` 값도 동적으로 사용하므로, 위 고정 이름 외의 버킷을 참조할 가능성이 있다.

## GitHub Pages 배포 구조

- 원격 저장소는 `https://github.com/Samuel-Kim07/travelog.git`이다.
- 루트에 `index.html`과 상대 경로 자산이 있어 별도 빌드 산출물 없이 저장소 디렉터리를 그대로 정적 호스팅하는 구조다.
- 저장소 안에는 GitHub Actions 배포 워크플로, `CNAME`, Pages 전용 구성 파일 또는 빌드 명령이 없다.
- 따라서 Pages가 특정 브랜치의 루트(`/`)에서 배포되는 것으로 보이지만, 실제 Pages 소스 브랜치와 디렉터리는 GitHub 저장소 설정을 확인해야 확정할 수 있다.
- 기준 시점에 로컬 `main`, `chore/codex-baseline`, `origin/main`, `origin/chore/codex-baseline`은 모두 커밋 `92164be`를 가리킨다. 브랜치가 같아 보여도 `main` 직접 작업 금지 원칙은 유지한다.

## 현재 확인된 위험 요소

- 앱의 핵심 로직이 `app.js`, `creator.js`, `index.css`, `map.js`, `index.html` 같은 큰 단일 파일에 집중되어 있어 작은 변경도 회귀 범위가 넓다.
- 자동화 테스트, 린트, 빌드 검증 설정이 없어 브라우저 수동 회귀 검증 의존도가 높다.
- 외부 CDN(Font Awesome, Leaflet, Supabase SDK)에 런타임 가용성과 버전 전달을 의존한다.
- 일부 로컬 자산에는 쿼리 버전이 있지만 일부에는 없어 GitHub Pages/CDN 캐시가 혼재할 수 있다.
- Supabase 프로젝트 URL과 publishable key가 클라이언트에 포함되어 있다. publishable key는 공개 클라이언트 용도지만, 실제 보안은 RLS, Storage 정책, RPC 권한에 의존하므로 운영 정책 검증이 필수다.
- `memo_pins` 기능은 코드와 안내 문서에서 별도 SQL 적용을 전제로 하지만 해당 SQL 파일이 저장소에 없다.
- 가이드 삭제 기능은 두 RPC와 동적 Storage 삭제에 의존하므로 함수 권한, 소유권 검사, 반환 형식이 코드의 기대와 다르면 데이터 불일치가 생길 수 있다.
- 동일 커밋을 여러 브랜치가 가리키는 현재 상태에서는 실수로 `main`에서 직접 작업하기 쉬우므로 작업 전 브랜치 확인이 필요하다.

## 누락된 SQL과 재현성 문제

- 저장소에는 Supabase 마이그레이션 디렉터리나 스키마 덤프가 없다.
- 코드가 참조하는 테이블, 컬럼, 외래 키, 인덱스, RLS 정책, Storage 정책, RPC 정의를 저장소만으로 재현할 수 없다.
- `map.js`와 `creator.js`는 `MEMO_PIN_SUPABASE_SETUP.sql` 적용을 안내하지만 해당 파일은 존재하지 않는다. `MEMO_PIN_SUPABASE_GUIDE_KO.txt`만 존재한다.
- `prepare_owned_guide_delete_v1`, `delete_owned_guide_v1`, `extend_memo_pin`의 SQL 정의가 없다.
- 운영 DB 구조와 적용 이력을 확인하기 전에는 누락 SQL을 추측해 작성하거나 실행하지 않는다.
- 재현성을 확보하려면 사용자 승인과 운영 구조 확인 후 검증된 스키마/마이그레이션을 별도 작업으로 도입해야 한다.

## 삭제하면 안 되는 미사용·중복 후보 파일

아래 항목은 정적 참조 검색만으로 미사용 또는 중복 가능성이 보이는 후보일 뿐이다. 외부 링크, 수동 운영 절차, 과거 호환성, 동적 경로에서 사용될 수 있으므로 사용자 승인 없이 삭제하거나 이름을 변경하지 않는다.

- `index_v2.html`: 현재 진입점인 `index.html`과 병존하는 별도 HTML 후보다.
- `panel-toggle.js`: `index.html`에서 직접 로드되지 않는 스크립트다.
- `Travelog_001.txt`, `Travelog_plan.txt`: 실행 파일은 아니지만 작업 배경과 계획 기록일 수 있다.
- `SUPABASE_TEST_GUIDE.txt`, `REALTIME_GPS_UPDATE_GUIDE.txt`, `MEMO_PIN_SUPABASE_GUIDE_KO.txt`, `ASSET_FOLDER_GUIDE.txt`: 런타임에서 로드되지 않아도 운영·검증 절차 문서로 보존해야 한다.
- `assets/images/...`와 `assets/icons/ui/...`에는 이름과 용도가 유사한 브랜드, 아바타, 블로그, 탐색, 어드벤처, 비디오 포스터 자산이 병존한다. 파일 내용이 완전히 같다고 확인된 것은 아니며, 화면별 경로 호환을 위해 남겨 둬야 한다.
- `.png`와 `.svg`로 함께 존재하는 브랜드 및 Google 로고 자산은 포맷별 사용처가 다를 수 있으므로 중복으로 단정하지 않는다.

후보 파일을 정리하려면 먼저 전체 HTML/JavaScript/CSS의 정적 참조, 런타임 생성 경로, GitHub Pages의 외부 직접 URL, 운영 문서 사용 여부를 함께 확인하고 사용자 승인을 받아야 한다.
