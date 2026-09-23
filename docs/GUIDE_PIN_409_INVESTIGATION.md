# guide_pins 409 수정 보고 (2026-09-23)

## 적용 상태

로컬 코드 수정 및 자동 테스트 51개 통과. commit/push/배포/운영 DB 변경은 하지 않았다.
**프런트엔드 배포 전에 `supabase/migrations/202609230001_atomic_guide_publish.sql` 전체를 Supabase SQL Editor에서 postgres로 실행해야 한다.** 이 세션에는 운영 SQL 실행 연결이 없어 마이그레이션은 파일로 준비했다. 미적용 시 새 클라이언트의 RPC가 실패하며 기존 비원자적 INSERT 경로로 fallback하지 않는다. 작업 데이터는 보존된다.

## 1. 409 원인

기존 `stablePublishRowId(['pin', guideId, String(pin.id), pinData])`에는 순서/이름/내용/좌표 등 변경되는 값이 포함됐다. 같은 로컬 핀을 수정하면 DB UUID가 바뀌었고 `insertPublishRowOnce`는 id만 조회한 뒤 새 INSERT를 시도했다. 다른 id의 기존 행이 동일한 `(guide_id, pin_order)`를 차지하면 HTTP 409가 발생한다. 로컬 순서가 모두 유일해도 재현된다.

제공된 실제 운영 카탈로그에서 `guide_pins_guide_id_pin_order_key = UNIQUE (guide_id, pin_order)`, NOT DEFERRABLE을 확인했다. 이 제약조건은 삭제/완화/비활성화하지 않았다. 예전 테스트는 복합 UNIQUE를 모델링하지 못했다. 이번 검증은 실제 PostgreSQL 엔진에서 운영 카탈로그의 컬럼·CHECK·FK·UNIQUE·테이블 RLS를 재구성해 실행했다.

## 2. 충돌 경로

`handleFinalPublishClick → publishPreparedGuideOnline` 또는 `completeStudioGuideEdit → publishGuidePackage → executePublishGuidePackage → stablePublishRowId(pinData 포함) → insertPublishRowOnce('guide_pins') → INSERT`.

재현 조건: 기존 guide_id를 유지하고 같은 순서의 핀 내용을 변경하거나, 실패 시도/이전 버전이 만든 다른 UUID의 핀이 해당 순서에 남아 있는 경우. 실제 사용자 충돌 guide_id/순서 값은 오류 상세와 해당 행이 제공되지 않아 특정하지 않았다.

## 3. 이전 Failed to fetch와 partial write

이전 코드는 guides와 guide_pins를 미디어 완료 전에 썼다. 네트워크 실패 후 부분 행이 남는 경로를 재현했다. 따라서 가능한 원인이지만, 제공 CSV의 guide/pins/media가 모두 null이므로 실제 사용자 행이 그 시도에서 생성됐다는 결론은 낼 수 없다. 정상 출간한 기존 핀도 같은 코드 결함에 의해 충돌한다.

새 코드는 업로드 중 DB 행을 쓰지 않는다. HTTP 응답 오류와 브라우저 TypeError/네트워크 오류, AbortError timeout, 원본 File 읽기 오류는 분리해 기록한다. Wi-Fi 사용만으로 과거 Failed to fetch의 CORS/네트워크/기기 원인을 특정할 수 없다. 예전 60%·3/5 표시는 마지막 완료 파일이므로 그 화면만으로 실패 요청을 특정할 수 없다. 현재 로그는 단계·파일명·경로·크기·HTTP 상태·원인 종류를 기록하며 인증 토큰은 기록하지 않는다.

## 4. 로컬 pin_order

`buildGuidePublishPackage`는 UI 정렬 순서에 index+1을 부여한다. 실패 당시 로컬 배열은 확인되지 않았고, 로컬 중복 없이도 충돌하는 경로를 확인했다.

`normalizePublishPins`는 원본 ID·순서·type, guideId·개수·중복 순서를 로그/console.table로 남기고 안정 정렬 후 1..N으로 정규화한다. 서버의 기존 핀은 별도 테이블로 출력한다. 원본 UI 객체는 변경하지 않는다. 중복/빈 ID 및 정규 UUID로 매핑한 뒤의 중복도 거절한다.

## 5. 변경 파일

- `supabaseClient.js`: 개별 출간 쓰기 제거, 안정 ID와 원자적 RPC, 로컬/서버 진단, 사용자별 업로드 경로, 이전 content-addressed 파일 재사용.
- `map.js`: 새 핀 생성 시 raw UUID를 한 번 생성. draft 복구에서는 ID를 재생성하지 않음.
- `index.html`: 위 두 JS의 캐시 버전만 갱신. 디자인 변경 없음.
- `supabase/migrations/202609230001_atomic_guide_publish.sql`: 원자적 RPC와 선행 업로드용 INSERT/SELECT 정책.
- `supabase/diagnostics/inspect_guide_publish.sql`: 스키마 및 선택 가이드 상태를 조회하는 읽기 전용 진단 SQL.
- `tests/atomic-guide-publish.test.cjs`: 실제 PostgreSQL A~H 및 롤백·권한·재시도 검증.
- `tests/supabase-publish-retry.test.cjs`, `tests/creator-pin-recovery.test.cjs`: Storage/오류/로컬 데이터 보존 회귀 테스트.
- `tests/publish-harness.cjs`, `tests/creator-recovery-harness.cjs`: 공유 테스트 어댑터.
- `tests/fixtures/publish-schema-20260923.json`: 사용자 제공 카탈로그의 스키마/정책만 보존. 개인 가이드 행/키/토큰 없음.
- 이 보고서 및 이전 출간 보고서의 후속 수정 안내.

## 6. 수정 함수

`normalizePublishPins`, `stablePinRowId`, `executePublishGuidePackage`, `makeStoragePath`, `buildGuideMediaRow`, `describePublishError`, `addNewCreatorPin`. 비원자적 `insertPublishRowOnce`는 제거했다. SQL 함수 `publish_guide_atomic_v1`을 추가했다.

새 UUID는 그대로 guide_pins.id로 사용한다. legacy custom-pin-UUID는 UUID 부분으로 매핑하고, 그 외 legacy id는 guideId+localId만으로 결정적 UUID를 계산한다. 이름/내용/순서/재출간 시각은 UUID 계산에 포함하지 않는다. 기존 비안정 해시 행은 성공한 동기화 때 새 안정 ID 집합으로 원자적으로 교체된다.

## 7. INSERT/UPDATE/UPSERT

클라이언트: 검증 → 인증/기존 데이터 읽기 → 모든 Storage 업로드 → 단일 RPC. guide/pin/media 개별 INSERT/UPDATE/DELETE 없음.

서버: 호출자/가이드 소유권, UUID와 연속 순서, 좌표/미디어 역할/파일 참조를 검사한다. guides는 id 기준 UPSERT, guide_pins/guide_media는 안정 id 기준 UPSERT. 삭제된 핀/미디어 행은 같은 트랜잭션 마지막에만 제거한다. Storage 객체는 삭제하지 않는다. 업로드는 내용 해시 경로와 크기 확인으로 재사용하며 응답 유실 후 재시도도 동일 경로를 사용한다. 이전 content-addressed 경로의 성공 파일도 재사용한다. 그보다 오래된 timestamp 방식 파일은 내용 해시 대응 정보가 없으므로 자동 재사용을 보장하지 않는다.

## 8. 트랜잭션/정책

한 RPC 호출이 하나의 PostgreSQL 트랜잭션이다. 오류를 삼키지 않아 전체 롤백된다. guideId 기반 advisory transaction lock으로 같은 가이드 출간을 직렬화한다. 기존 가이드 행도 잠근다.

즉시 UNIQUE를 유지하면서 순서를 교환하기 위해 기존 순서를 현재 최대값/요청 최대값보다 큰 서로 다른 임시 값으로 옮긴 뒤 목표 순서로 UPSERT한다. 이 중간 상태는 외부에 커밋되지 않으며 실패 시 원래 순서로 롤백된다. 정수 범위 초과도 쓰기 전체가 롤백되는 명시적 오류로 처리한다.

운영 Storage INSERT 정책은 기존 guides 행을 요구했다. DB 선행 쓰기를 없애기 위해 `guides/<guideId>/uploads/<auth.uid()>/...`에 한정한 업로드/재시도 조회 정책을 추가했다. 기존 정책과 UNIQUE/FK/CHECK는 그대로 둔다.

운영 guide_media에는 UPDATE 정책이 없으므로 RPC는 SECURITY DEFINER, 고정 search_path, 명시적 auth.uid()/소유권/다른 가이드 행 ID 검사, authenticated 전용 EXECUTE 권한을 사용한다. 일반 테이블 UPDATE 정책은 확장하지 않았다.

## 9. 테스트 결과

51개 통과, 실패/skip/TODO 0. JavaScript 구문 검사와 git diff --check 통과.

| 항목 | 결과 |
|---|---|
| A 새 가이드 4핀 | 성공, DB 4행 |
| B 같은 가이드 2회 재출간 | 409 없이 4행 및 UUID 유지 |
| C 1핀 추가 | DB 5행 |
| D 역순/이름 수정 | ID 유지, 순서 1..5, 중복 없음 |
| E 1핀 삭제 | 해당 행만 제거, 나머지 created_at 유지 |
| F 삭제 이후 강제 예외 | guide/pin/media 전체 rollback, 재시도 성공 |
| G Creator draft 저장/페이지 재구성 | UUID 유지 후 원자적 재출간 성공 |
| H orientationchange/resize/pagehide/pageshow | UUID 유지 후 재출간 성공 |

추가: 새 가이드 INSERT 후 오류도 전체 롤백, 업로드 실패 시 DB 부분 쓰기 없음, COMMIT 응답 유실 후 재시도 중복 없음, 기존 부분 행 자동 동기화, 이전 파일 재사용, 다른 사용자/가이드/Storage 참조 거절, 순서 중복 거절, UNIQUE가 NOT DEFERRABLE인 상태 유지.

**검증 한계:** PGlite 0.3.14의 PostgreSQL 엔진에서 SQL을 실제 실행했다. Supabase HTTP/Storage 서비스는 어댑터이며 신규 Storage 정책을 별도로 검증했다. 운영 Storage 헬퍼 함수 본문은 CSV에 없어 기존 헬퍼의 새 경로 파싱은 운영 적용 후 확인 대상이다. G/H는 실제 Creator 코드를 이용한 lifecycle 모사이며 스마트폰 브라우저 실측은 아니다. 운영 마이그레이션과 실기기 A~H는 아직 실행하지 않았다.

재실행 예(PGlite는 앱 배포 의존성이 아닌 임시 테스트 도구):

```powershell
$testRuntime = Join-Path $env:TEMP 'travelog-publish-pg-tests'
pnpm --dir $testRuntime add @electric-sql/pglite@0.3.14 --ignore-scripts
$env:TRAVELOG_PGLITE_MODULE = Join-Path $testRuntime 'node_modules/@electric-sql/pglite'
node --test tests/*.test.cjs
node --check supabaseClient.js
node --check map.js
git diff --check
```

## 10. 수동 정리

가이드/핀을 먼저 수동 삭제할 필요는 없다. 현재 draft가 완전하다면 성공한 RPC가 같은 guideId의 목표 핀/미디어 집합으로 동기화한다. 실패하면 기존 행이 유지된다. 기존 Storage 파일은 자동 삭제하지 않으며 사용하지 않는 객체가 남을 수 있다. 운영 행별 내용이 제공되지 않아 고아 객체 유무/수동 정리 필요성을 확정할 수 없다. 불완전한 로컬 draft를 출간하면 그 draft가 목표 핀 집합이 되므로 먼저 스튜디오 내용이 온전한지 확인해야 한다.

Google Drive 출간 fallback은 이미 제거됐으며 회귀 검증했다. 별도 index_v2.html의 폴더 링크와 app.js/languages.js의 번역 항목은 출간 경로 밖이므로 임의 삭제하지 않았다.
