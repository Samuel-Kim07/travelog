# 출간 Storage RLS 조사 및 검증 결과 — 2026-10-12

> 후속 변경: 사용자가 운영 조회 결과를 제공한 뒤 출간 순서를 **draft 선행 생성** 방식으로 수정했다. 이 문서는 초기 조사 기록이며, 현재 구현·98개 테스트·SQL 적용 조건은 [후속 보고서](DRAFT_FIRST_PUBLISH_2026-10-12.md)를 따른다. 이 문서의 업로드 선행 방식 및 Storage 정책 추가 제안은 현재 배포 지침으로 사용하지 않는다.

## A. 실패 원인

### 확인된 사실

사용자가 제공한 오류는 대표 이미지의 `guide-public` Storage POST가 HTTP 400 / `new row violates row-level security policy`로 거절된 것이다. DB 출간 RPC 실행보다 앞선 단계다. 이 로그만으로 JWT가 만료됐는지, 어떤 정책이 미적용됐는지까지 확정할 수는 없다.

현재 `supabaseClient.js`의 `makeStoragePath`가 생성하는 경로는 다음과 같다.

```text
guides/{guideId}/uploads/{userId}/{folder}/{contentHashFilename}
```

두 번째 경로 조각은 가이드 ID이고, 네 번째 조각이 사용자 ID다. 요청서 예시의 두 UUID도 현재 코드 기준으로 이 순서다. 실제 실패 요청의 로그인 사용자와 네 번째 UUID가 같았는지는 운영 인증 기록 없이는 확정할 수 없다. 사용자 ID를 두 번째 조각과 비교하도록 변경하면 현재 코드·RPC와 어긋난다.

`tests/fixtures/publish-schema-20260923.json`에 보관된 운영 카탈로그의 `guide_public_author_upload` INSERT 정책은 아래 조건을 요구한다.

```sql
bucket_id = 'guide-public'
and exists (
  select 1 from guides g
  where g.id = travelog_storage_guide_id(objects.name)
    and g.author_id = auth.uid()
)
```

반면 현재 클라이언트는 파일 업로드를 모두 마친 다음 `publish_guide_atomic_v1`에서 처음 가이드 행을 만든다. **이전 INSERT 정책만 남아 있으면 새 가이드 업로드 시 필요한 가이드 행이 아직 없어서 RLS가 거절한다.** 이 의존 관계는 저장된 정책을 사용한 로컬 PostgreSQL 테스트에서 재현됐다.

재현 테스트의 Storage 경로 해석 함수는 두 번째 조각을 가이드 UUID로 읽는 모델이다. 운영 함수 본문은 과거 카탈로그에 없으므로 현재 함수가 같은 방식으로 동작하는지 조회가 필요하다. 가이드 행이 전혀 없을 때 EXISTS가 false가 되는 의존 관계 자체는 확인할 수 있다.

### Git 변경 이력

| 커밋 | 확인한 변경 | 영향 |
|---|---|---|
| `c810ca9` 이전 | 가이드 draft 행 생성 후 Storage SDK 업로드, `upsert: true` | 기존 가이드 작성자 기반 정책의 선행 조건을 충족하는 구조 |
| `c810ca9` (9/23 오전) | 내용 해시 경로, 직접 POST, `x-upsert: false`, 완료 파일 재사용 | 여전히 가이드 행을 먼저 생성 |
| `84a0170` (9/23 오후) | DB 선행 INSERT 제거, `/uploads/{userId}/` 도입, 단일 원자적 RPC 도입 | 새 Storage INSERT/SELECT 정책과 RPC 배포가 함께 필요 |
| `9c81d11` (9/29) | 미디어 파일 읽기 관련 수정 | 위 DB·Storage 순서는 유지 |

`docs/GUIDE_PIN_409_INVESTIGATION.md`에는 9/23 마이그레이션을 운영에 적용하지 않았고 배포 전에 적용해야 한다고 기록돼 있다. 이후 운영 적용 여부를 입증하는 자료는 이번 작업에서 확보하지 못했다. 따라서 **마이그레이션 미적용 또는 현재 정책 불일치가 유력하지만, 현재 운영 원인으로 확정하지 않는다.** Git에는 마지막 정상 출간의 실측 기록이 없어 특정 커밋을 마지막 정상 버전이라고 지정하지 않는다.

### 정책·인증 조사 범위

- 과거 카탈로그: `guide-public` SELECT는 anon/authenticated 읽기 허용. INSERT/UPDATE/DELETE는 기존 가이드 작성자 조건. 추가 DELETE 정책도 있다.
- 현재 코드는 immutable 경로와 `x-upsert: false`를 사용하므로 새 파일 INSERT와 재사용 조회 SELECT가 필요하다. UPDATE 권한 확대로 해결할 문제가 아니다.
- 기존 9/23 마이그레이션은 네 번째 조각과 `auth.uid()`를 비교하는 INSERT/SELECT 정책을 추가한다. UPDATE/DELETE를 새로 허용하지 않는다.
- 정책은 PERMISSIVE이면 OR로 결합되고 RESTRICTIVE 정책은 추가 제한이 된다. 최신 전체 정책 없이는 충돌 유무를 판단할 수 없다.
- 현재 운영 버킷 존재·public 설정·용량 제한, 실제 객체 owner_id, auth.uid(), 익명 여부, JWT 만료·갱신 상태, 최신 helper/RPC/정책은 미확인이다.
- 저장된 정책에는 익명 Auth 사용자만 별도로 거절하는 조건이 없다. 실제 운영의 추가 정책은 별도 확인 대상이다.

공식 근거: [Storage 접근 제어](https://supabase.com/docs/guides/storage/security/access-control), [Storage 소유권](https://supabase.com/docs/guides/storage/security/ownership). public 버킷이라고 쓰기 권한이 자동 허용되지는 않는다. 객체 소유권 필드 자체도 RLS 권한을 대신하지 않는다.

## B. 수정 내역

| 파일 | 변경 |
|---|---|
| `supabaseClient.js` | `verifyPublishSession` 추가. 업로드할 정확한 JWT를 `auth.getUser(token)`로 서버 검증. 세션 사용자·출간 사용자·경로 사용자 불일치 시 중단. RPC 직전 재확인. `uploadBlob` 재시도 래퍼와 `uploadBlobOnce` 분리. 진단 및 한국어 설명 보완 |
| `index.html` | 연결된 Supabase 스크립트 캐시 버전 1030으로 변경 |
| `supabase/diagnostics/inspect_guide_publish.sql` | 버킷 설정, Storage 경로 해석 함수, 원자적 RPC 본문, 대상 가이드 객체 소유권 조회 추가 |
| `tests/publish-harness.cjs` | 서버 인증 검증·지속 장애 모사 지원 |
| `tests/supabase-publish-retry.test.cjs` | 최대 2회 자동 재시도 및 응답 유실 후 자동 복구 기준 반영 |
| `tests/atomic-guide-publish.test.cjs` | PostgreSQL에서 대표 이미지·무이미지·각 미디어·혼합 출간 및 재출간, 진단 SQL 검증 추가 |
| `tests/publish-auth-storage.test.cjs` | 계정 불일치·계정 변경·RLS 무재시도·일시 장애·미디어별 출간 검증 추가 |
| `tests/storage-policy-regression.test.cjs` | 과거 정책과 현재 업로드 순서 불일치 재현, 기존 마이그레이션 적용 효과 및 타인 파일 보호 검증 |
| 이 보고서 | 원인 증거·한계·운영 확인 순서 기록 |

통신 장애·시간 초과·408/429/일부 5xx에만 파일당 최대 2회 재시도한다(최초 요청 포함 3회). 400/401/403, RLS 오류는 반복하지 않는다. 매번 객체 존재·크기를 확인하여 응답이 유실됐어도 중복 파일을 만들지 않는다. 파일을 덮어쓰거나 삭제하지 않는다. DB는 모든 업로드 성공 뒤 기존 단일 RPC로 처리한다. RPC 응답 유실은 기존 수동 재출간 경로로 안전하게 재시도할 수 있다.

검증한 JWT를 Storage Authorization 헤더에 사용한다. SDK의 기존 세션 갱신 설정은 유지한다. 인증 실패 시 다른 계정으로 자동 전환하는 복구를 추가하지 않고 같은 계정의 재로그인을 안내한다. 로그에는 단계·HTTP·오류 코드·요청 종류·버킷·경로·경로 사용자 일치 여부·익명 여부·시도 번호를 남긴다. 토큰과 헤더는 기록하지 않는다.

출간 흐름: 버튼 중복 방지 → 로컬 저장/미디어 검증 → 인증 서버 검증 → 가이드 UUID·기존 작성자 확인 → 대표 이미지 및 미디어 업로드 → 인증 재확인 → 원자적 guide/pin/media 저장 → 성공 응답 → 나의 가이드·홈 반영. 기존 Studio 데이터 초기화 코드는 호출하지 않는다.

**운영 SQL/정책은 실행·변경하지 않았다.** 최신 정책을 확인하지 못했으므로 새 정책을 추측해 작성하거나 기존 정책을 삭제하지 않았다. 검토할 기존 후보는 `supabase/migrations/202609230001_atomic_guide_publish.sql`이다. 정책만 없고 RPC는 이미 설치된 상태라면 전체 파일을 재적용하지 말고 최신 정의와 대조해 누락된 부분만 별도 검토해야 한다.

## C. 테스트 결과

최종 전체 테스트 **84개 통과, 실패 0, skip 0**. JavaScript 구문 검사와 `git diff --check`도 통과했다. 재시도 추가 후 기존 테스트의 요청 횟수 기대값 1건이 처음 실패했으며, 실제 3회 상한을 반영해 수정한 뒤 전체를 재실행했다. Node 모의 테스트와 PGlite PostgreSQL 검증이며 **실제 Supabase HTTP/Storage 통합 테스트가 아니다.**

| 요청 시나리오 | 검증 |
|---|---|
| 대표 이미지 포함 새 출간 | 업로드 모사 + PostgreSQL 원자적 저장 |
| 저장한 가이드 출간 | 실제 Creator 복구 코드 + 출간 어댑터/SQL |
| 출간 후 수정·재출간 | PostgreSQL 행/UUID 유지 및 미디어 재사용 |
| 이미지 없음 | 현 UI 준비 조건에서 대표 이미지는 필수 아님. 로컬 SQL 출간 성공 |
| 사진·음성·영상·혼합 | 각각 업로드 모사 + PostgreSQL 신규/수정 출간 |
| 모바일 Chrome | 실기기 미검증. 회전/lifecycle 모사 테스트만 수행 |
| 네트워크 장애 | 재시도 상한·기존 DB/작업 데이터 보존·파일 재사용 |
| 타인 파일 업로드 | 로컬 경로 사전 차단 및 PostgreSQL RLS 거절. 실제 두 계정 미검증 |
| 목록·상세·타인 공개 | 성공 후 코드 연결 추적만 수행. 운영 화면 미검증 |

SQL 테스트는 과거 카탈로그의 제약조건·RLS와 기존 마이그레이션을 로컬 엔진에 적용한다. Storage HTTP, 브라우저 인증 서비스, 실제 사진/음성/영상 재생은 어댑터이므로 성공으로 확대 해석하지 않는다.

```powershell
$env:TRAVELOG_PGLITE_MODULE = Join-Path $env:TEMP 'travelog-publish-pg-tests/node_modules/@electric-sql/pglite'
node --test tests/*.test.cjs
node --check supabaseClient.js
git diff --check
```

PGlite 0.3.14는 임시 폴더에만 설치했다. 앱 의존성이나 배포 파일에 추가하지 않았다.

## D. 운영에서 필요한 다음 작업

1. 최신 조회 결과 확보: Supabase SQL Editor에서 `supabase/diagnostics/inspect_guide_publish.sql` 내용을 검토한다. 필요하면 상단 `travelog.inspect_guide_id`에 실패한 가이드 ID를 넣는다. 이 스크립트는 `begin read only`와 `rollback`으로 정책·설정·대상 데이터만 조회한다. 사용자 지시상 운영 SQL 실행도 명시 승인 전에는 에이전트가 수행하지 않는다.
2. 조회 결과에서 버킷 설정, `guide_public_author_upload`, `travelog_publish_upload_insert_v1`, `travelog_publish_upload_select_v1`, 다른 restrictive/permissive 정책, helper 함수, `publish_guide_atomic_v1` 존재·본문을 대조한다. 실패한 객체가 없으면 owner_id를 확인할 행도 없으므로 동일 계정의 성공 객체와 비교한다.
3. 실제 세션에서 새 진단 로그의 `pathOwnerMatchesAuth`와 `isAnonymous`, HTTP·오류 코드를 확인한다. 토큰·비밀번호는 공유하지 않는다. SQL Editor의 관리자 세션 `auth.uid()`를 모바일 사용자의 uid로 간주하지 않는다.
4. 필요한 SQL 범위를 확정해 별도로 검토하고 사용자의 명시적 적용 승인을 받는다. 기존 9/23 마이그레이션은 검토 후보이며 최신 운영 구조와 비교 없이 그대로 실행하라고 권하지 않는다. 누락 정책이 확인되면 기존 읽기·구매·코인·프로필 정책을 보존하는 최소 변경으로 준비한다.
5. 가능하면 Supabase 테스트 프로젝트에서 두 계정으로 실제 Storage·DB 통합 출간을 먼저 검증한다. 현재 코드의 Supabase 프로젝트는 하드코딩돼 있으므로 로컬 모의 테스트를 테스트 프로젝트 실험으로 혼동하지 않는다.
6. 운영 정책 확인/승인 적용 후 프런트엔드 변경을 별도 `codex/` 브랜치에서 리뷰·배포한다. 이번 작업은 커밋·푸시·배포하지 않았다. `main`에 직접 커밋/푸시하지 않는다. 실제 호스팅 방식이 확인되지 않아 GitHub Pages 배포 성공을 주장하지 않는다.
7. 모바일 Chrome에서 같은 계정·기존 보존 작업을 열고 한 번 출간한다. 대표 이미지 및 필수 미디어 성공 → RPC 성공 → 같은 guideId의 published 행·핀·미디어 → 나의 가이드 상세/재생 → 다른 계정 공개·접근 권한을 확인한다. 타인 파일 변경/삭제 차단도 테스트 계정에서 확인한다.

## E. 최종 판정

**코드 수정 완료, 운영 환경 검증 필요.**

기록된 정책에서 실패 조건을 재현했고 코드의 인증·재시도·진단을 보완했다. 최신 운영 정책·실제 인증·버킷 상태를 아직 확인하지 못했고 운영 변경이나 실제 출간을 하지 않았으므로 출간 정상화 완료로 판정하지 않는다.
