# 운영 RLS 유지 및 draft 선행 출간 — 2026-10-12

> 후속 RPC 보안 검토: [조회 SQL·신규 설치 조건·위험성 보고서](PUBLISH_RPC_SECURITY_REVIEW_2026-10-12.md). 설치 파일은 이제 같은 이름의 기존 루틴이 있으면 중단하는 신규 설치 전용이며, 운영 함수 교체에 사용하지 않는다. 실제 출간 함수 본문은 유지했다.

## 결과

**코드 수정 완료, 실제 Supabase 통합·운영 검증 필요.**

사용자가 확인한 운영 정책(가이드 행 존재 + 작성자 일치)에 맞춰 신규 가이드 DB draft를 Storage 업로드 전에 생성한다. 기존 Storage/RLS 정책을 삭제하거나 완화하지 않는다. 기존 published 가이드 행은 업로드 도중 변경하지 않으며, 최종 단일 트랜잭션 실패 시 종전 가이드·핀·미디어 정보가 유지된다.

이번 작업에서 커밋, 푸시, 배포, 운영 SQL 실행, 운영 파일 업로드는 하지 않았다. 이전 작업의 미커밋 변경도 보존했다.

## 변경된 출간 순서

1. 로컬 핀 ID·순서·미디어 원본을 검사한다. Studio에서 생성·저장한 동일 guideId를 재사용한다.
2. `getSession()`의 JWT를 `getUser(token)`로 검증한다. 인증 사용자와 작성자가 다르거나 기존 가이드 소유자가 다르면 중단한다. 실제 `auth.uid()` 조건은 서버의 INSERT RLS와 최종 RPC가 검사한다.
3. 기존 가이드가 없을 때만 `guides`에 `id`, `author_id`, `title`, `status: draft`를 INSERT한다. UPSERT하지 않으며 기존 가이드를 덮어쓰지 않는다.
4. 서버에서 같은 ID의 가이드 행을 다시 읽어 작성자를 확인한다. INSERT 응답 유실이나 동시 INSERT 충돌이 발생해도 같은 작성자의 행이 확인되면 계속 진행한다. 행이 없거나 다른 작성자이면 업로드하지 않는다.
5. `guides/{guideId}/uploads/{userId}/...`에서 guideId와 사용자 ID를 확인한 뒤 대표 이미지와 미디어를 업로드한다. 기존 공개 소개 미디어는 `guide-public`, 핀 음성·영상·사진은 `guide-media`로 보내는 분류를 유지한다. 내용 해시 경로와 `x-upsert: false`로 이전 출간 파일을 덮어쓰지 않는다.
6. 전송 대상 전체에 대해 Storage 객체 존재와 크기를 다시 조회한다. 하나라도 확인되지 않으면 출간 확정을 호출하지 않는다.
7. 같은 인증 사용자인지 재확인한 뒤 `publish_guide_atomic_v1`으로 핀·미디어·가이드 메타데이터를 한 트랜잭션에서 저장한다. 기존 FK/UNIQUE/CHECK와 서버 객체 존재·작성자 검사를 유지한다. 오류가 발생하면 트랜잭션 전체가 롤백된다.
8. RPC가 같은 guideId·작성자와 `status: published`를 반환해야 출간 완료를 표시한다. 가이드·핀·미디어 저장과 published 전환은 같은 트랜잭션이 커밋되는 순간 함께 공개된다. 성공한 결과만 기존 Studio의 나의 가이드·홈 반영 흐름으로 전달한다.

## 실패·재시도·기존 데이터

- **신규 출간 실패:** draft 한 행과 성공적으로 업로드된 파일은 남긴다. 핀·미디어 DB의 부분 출간 상태는 만들지 않는다. 편집 내용과 같은 guideId로 재시도할 수 있다.
- **기존 published 수정 실패:** 제목·상태·기존 핀·미디어는 최종 RPC 전까지 변경하지 않는다. RPC 내부 오류도 모두 롤백한다. 기존 Storage 객체는 삭제하거나 덮어쓰지 않는다.
- **통신 장애:** 파일당 최대 2회 자동 재시도(최초 요청 포함 3회). 재시도 전에 기존 파일을 조회한다. 권한 오류는 반복하지 않는다. 초안 생성 실패·최종 RPC 실패는 작업을 보존하고 사용자가 재시도할 수 있게 한다.
- **중복 실행:** 기존 UI/클라이언트 실행 잠금을 유지한다. 서로 다른 탭의 draft INSERT 충돌은 ID로 조회해 처리하며, 최종 RPC는 가이드 단위 DB 잠금과 안정적인 행 ID로 중복 행을 방지한다.
- **구매·코인:** 관련 기능·테이블을 변경하지 않는다. 로컬 SQL 테스트에서 구매 기록이 실패·성공한 재출간 후 유지되는 것을 확인했다. 운영 코인 동작의 실측 검증은 하지 않았다.
- 실패한 draft나 고아 파일을 자동 삭제하는 정리 기능은 추가하지 않았다.

## 이번 단계에서 수정·추가한 파일

| 파일 | 변경 |
|---|---|
| `supabaseClient.js` | `executePublishGuidePackage`: 신규 draft 생성·소유권 재조회·객체 확인·최종 상태 검증. `uploadBlobOnce`: 경로 guideId 검증. `describePublishError`: draft 및 RPC 누락 안내 |
| `index.html` | Supabase 스크립트 캐시 버전 1031 |
| `tests/publish-harness.cjs` | DB/Storage 연결 어댑터, draft 실패·응답 유실 모사 |
| `tests/atomic-guide-publish.test.cjs` | draft INSERT/조회와 Storage INSERT도 실제 PostgreSQL RLS로 검사. 기존 Storage 정책만 적용. 타인 조회·구매 기록·트랜잭션 롤백 검증 |
| `tests/draft-first-publish.test.cjs` | draft 생성·실패·재사용·경합·객체 확인·중복 실행·기존 출간본 보존 테스트 |
| `supabase/migrations/202610120001_publish_finalize_rpc_only.sql` | 기존 최종 저장 RPC만 분리한 검토용 SQL. Storage 및 테이블 정책 변경 없음 |
| `docs/STORAGE_RLS_RECOVERY_2026-10-12.md` | 초기 보고서에 후속 구현 안내 |
| 이 문서 | 현재 구현·테스트·적용 조건 |

## 테스트 결과

**전체 98개 통과 / 실패 0 / skip 0.** `node --check supabaseClient.js`와 `git diff --check` 통과.

이번에 PostgreSQL 테스트를 mock draft에서 실제 SQL draft INSERT로 강화하면서, 예전의 “실패 후 가이드 행도 없음” 기대값을 “재사용 가능한 draft만 남음”으로 바꿨다. 같은 가이드의 legacy 파일은 소유자에게 허용되는 기존 동작을 보존하고, 타인 파일 검사는 실제 다른 guideId 경로를 사용한다.

| 요청 항목 | 결과 및 범위 |
|---|---|
| 신규 draft 생성 | PostgreSQL authenticated 역할·기존 guides INSERT RLS·profiles FK 통과 |
| draft 후 대표 이미지 업로드 | 가이드 존재를 요구하는 기존 `guide-public` INSERT 정책 통과 |
| 사진·음성·영상 업로드 | 기존 `guide-media` INSERT 정책 통과 |
| 저장 완료 후 published | 실제 PostgreSQL RPC에서 모든 행 저장·트랜잭션 완료 확인 |
| 타인에게 정상 표시 | 다른 인증 사용자로 draft 조회 불가, 출간 후 무료 가이드·핀·미디어 조회 가능. 실제 화면·재생은 미검증 |
| 기존 출간본 수정 | 수정 실패 시 기존 상태 유지, 성공 시 같은 ID로 반영 |
| 장애 후 재시도 | draft INSERT 응답 유실, 파일 장애, RPC 응답 유실, 재사용 검증 |
| 타인 파일 차단 | 서버 RLS로 다른 작성자의 가이드 업로드 차단. 클라이언트에서 경로 사용자·guideId 불일치 차단 |
| 동일 가이드 중복 출간 | 연속 클릭 차단, draft ID 충돌 처리, SQL 고유 제약·원자적 반복 저장 검증 |

테스트 엔진은 PGlite 0.3.14의 PostgreSQL이다. 카탈로그에 기록된 테이블 제약조건과 RLS를 적용하고 이번에 사용자에게 확인된 선행 가이드 조건을 검증했다. Storage HTTP 전송 및 Auth 서비스는 어댑터이고, Storage 경로 helper 함수는 경로의 두 번째 UUID를 추출하는 모델이다. **실제 Supabase 프로젝트, 실제 모바일 Chrome, 실제 다른 계정의 UI 공개/재생 테스트가 아니다.** 현재 연결된 테스트 프로젝트와 인증 정보가 제공되지 않아 실제 통합 테스트는 수행하지 않았다.

```powershell
$env:TRAVELOG_PGLITE_MODULE = Join-Path $env:TEMP 'travelog-publish-pg-tests/node_modules/@electric-sql/pglite'
node --test tests/*.test.cjs
node --check supabaseClient.js
git diff --check
```

## 추가 SQL 실행 필요 여부

**Storage RLS 변경 SQL은 필요하지 않다.** 이번 순서 변경은 확인된 기존 정책을 충족하도록 한다. 과거 `202609230001_atomic_guide_publish.sql` 전체를 이번 수정의 필수 조치로 실행하지 않는다. 그 파일에는 이번 방식에 필요 없는 Storage 업로드 정책 추가가 포함돼 있다.

최종 저장에는 기존에 코드가 호출하던 `publish_guide_atomic_v1`이 필요하다. 사용자 요약에는 이 함수의 존재·본문이 포함되지 않았으므로 현재 설치 여부는 별도 확인 대상이다.

- 운영에 검토한 정의와 같은 RPC가 이미 있으면 **추가 SQL 실행 불필요**.
- 없으면 **분리한 RPC 전용 SQL을 검토하고 명시적 승인 후 설치해야 함**. 이 파일은 9/23의 함수 본문과 권한 설정을 그대로 분리했으며 정책 생성·삭제·RLS 비활성화 구문이 없음을 테스트했다.
- 같은 이름의 함수가 다르게 설치돼 있으면 최신 본문·제약조건과 비교한 후 적용 범위를 결정한다. 자동 덮어쓰기하지 않는다.
- `guide_media`의 일반 UPDATE RLS를 넓히지 않는다. 최종 RPC는 기존 소유권·행 ID·객체 검사와 고정 search_path, authenticated 전용 실행 권한을 사용한다.

SQL 파일은 로컬 검증 및 검토용으로만 준비했다. 운영에 실행하지 않았다.

## GitHub 배포 및 실제 검증 순서

프런트엔드 코드가 바뀌었으므로 **GitHub의 실제 서비스 배포 경로에 변경을 반영해야 한다.** 사용자 승인 전에는 커밋·푸시·배포하지 않는다.

1. RPC 존재·정의 확인. 필요하면 분리된 SQL을 검토하고 승인 후 적용한다.
2. 가능하면 테스트 프로젝트에서 새 draft 생성 → Storage 업로드 → 최종 published → 다른 계정 조회/재생을 먼저 검증한다. 서버 주소가 운영으로 고정된 현재 프런트엔드를 테스트 프로젝트로 착각해 사용하지 않는다.
3. 승인 후 별도 브랜치/리뷰를 통해 프런트엔드를 배포하고 모바일에서 캐시 버전 1031 로딩을 확인한다. `main` 직접 커밋/푸시는 하지 않는다.
4. 운영 테스트는 별도 승인 후 수행한다. 기존 보존 draft로 재시도하면서 동일 guideId인지, 미디어가 전부 있는지, published 전환이 완료됐는지 확인한다.
5. 다른 계정에서 목록·상세·미디어 표시와 타인 업로드 차단을 확인한 뒤 정상화 완료 여부를 판정한다.
