# 출간 RPC 설치·호환성·보안 검토

## 결론

로컬 코드와 설치 후보의 정확한 계약을 확인했고, 운영 조회 전용 SQL을 준비했다. **운영 함수의 실제 존재·본문·소유자·권한은 아직 결과를 받지 못했으므로 일치 여부를 확정하지 않는다.** 운영 SQL 실행, 커밋, 푸시, 배포는 하지 않았다.

기존 정책을 유지하면서 현재 UPSERT 구현으로 재출간하려면 SECURITY DEFINER가 필요하다. 보관된 운영 카탈로그에는 `guide_media` UPDATE RLS 정책이 없으며, 로컬 PostgreSQL에서 INVOKER로 바꾼 재출간이 실제로 42501 RLS 오류로 실패하는 것을 확인했다. 최신 운영에 UPDATE 정책이 추가됐는지는 제공하는 조회 결과로 다시 확인해야 한다.

기존 설치 파일의 무조건적인 `CREATE OR REPLACE`를 제거했다. 이제 **신규 설치 전용**이며 public 스키마에 같은 이름의 함수·프로시저가 하나라도 있으면 중단한다. 실제 출간 함수 본문과 기존 실행 권한 설정은 변경하지 않았다. 운영 기존 함수 교체 SQL은 현재 정의를 받기 전에는 확정하지 않는다.

## A. 운영 조회 전용 SQL

파일: `supabase/diagnostics/inspect_publish_rpc.sql`

Supabase SQL Editor에서 파일 전체를 복사해 실행하면 `travelog_rpc_review`라는 JSON 결과 하나가 나온다. `BEGIN READ ONLY`와 `ROLLBACK`으로 감싸며, 함수 호출·DML·DDL·권한 변경을 수행하지 않는다. 사용자 가이드 내용·토큰·비밀번호를 읽지 않고 시스템 카탈로그의 정의와 권한만 조회한다.

| 항목 | 읽는 방법 |
|---|---|
| `exact_signature_exists` | `public.publish_guide_atomic_v1(jsonb,jsonb,jsonb)`가 실제 함수로 존재하는지 |
| `public_same_name_count` | public에 같은 이름의 다른 인수 버전이 있는지. 0이면 신규 설치 후보, 1보다 크면 API 오버로드 검토 필요 |
| `routines[].identity_arguments` / `argument_names` | 인수 타입뿐 아니라 클라이언트 JSON 키와 인수 이름도 일치하는지 |
| `client_signature_matches` | 정확한 스키마·이름·타입·인수 이름·기본값 없음·단일 jsonb 반환이 맞는지 |
| `reviewed_body_matches` | 로컬 검토본과 함수 본문 문자열이 같은지. CR 문자를 정규화한 MD5 비교이며 보안 인증용 해시는 아님 |
| `reviewed_settings_match` | DEFINER / plpgsql / 고정 search_path / VOLATILE / 비STRICT 설정 일치 여부 |
| `definition` | 현재 설치된 함수 전체 CREATE 문. 실제 동작 차이는 이 본문을 비교해야 함 |
| `owner`, `owner_superuser`, `owner_bypassrls` | 어떤 권한으로 DEFINER가 실행되는지 |
| `direct_acl`, `effective_execute` | 직접 GRANT와 상속·PUBLIC을 포함한 실효 호출 권한. anon은 false, authenticated는 true가 기대값 |
| `table_security` | 관련 테이블 RLS/FORCE RLS, 정책, 권한, 사용자 트리거, 외부 FK |
| `ddl_event_triggers` | 설치 DDL에 추가 동작을 실행할 수 있는 이벤트 트리거 목록 |

`reviewed_body_matches = false`만으로 비호환 또는 위험하다고 단정하지 않는다. 공백·주석만 달라도 false가 될 수 있다. 반대로 true여도 소유자·권한·테이블 정책·트리거까지 같다는 뜻은 아니다. 조회 SQL은 모든 스키마의 동명 루틴을 표시하므로 public 항목을 먼저 확인한다.

함수 본문 비교 기준 MD5: `eace5d084c83f632831f4a8cfc9fe445`.

SQL Editor 관리자의 `auth.uid()`는 모바일 사용자 인증 검증 결과가 아니다. 이 조회는 실제 사용자의 JWT를 요구하거나 출력하지 않는다. 조회 권한이 부족하면 관리자 SQL Editor 권한으로 실행하되 service_role 키를 브라우저 코드에 추가하지 않는다.

## 정확한 RPC 계약

```sql
public.publish_guide_atomic_v1(
  p_guide jsonb,
  p_pins  jsonb,
  p_media jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
```

기본값·OUT 인수·가변 인수 없음. SETOF가 아닌 단일 jsonb이며 `VOLATILE`, 비STRICT다.

클라이언트 `supabaseClient.js`의 `executePublishGuidePackage`는 다음과 같이 호출한다.

```javascript
supabase.rpc('publish_guide_atomic_v1', {
  p_guide: { ...guidePayload, cover_path, total_bytes, status: 'published' },
  p_pins: [...preparedPinsByLocalId.values()],
  p_media: desiredMediaRows
})
```

반환 구조:

```json
{
  "guide": { "id": "...", "author_id": "...", "status": "published" },
  "pins": [{ "id": "...", "guide_id": "...", "pin_order": 1 }],
  "media": [{ "id": "...", "guide_id": "...", "storage_path": "..." }]
}
```

예시는 일부 열만 표시했다. 실제로는 각 DB 행의 나머지 열도 포함되며 빈 pins/media 결과는 `[]`다. 클라이언트는 반환 guide의 ID·작성자·published 상태를 검사하고 성공한 경우에만 목록 반영을 진행한다.

## B. 설치 후보와 기존 함수 처리

파일: `supabase/migrations/202610120001_publish_finalize_rpc_only.sql`

### 함수가 없을 때

조회 결과 public 동명 루틴이 0개이고 현재 테이블 구조가 검토본과 일치하면 신규 설치 후보로 사용할 수 있다. **사용자 명시 승인 후에만 운영 실행한다.** 파일 전체는 하나의 트랜잭션이다.

1. 같은 이름의 기존 루틴이 있으면 `RPC_ALREADY_EXISTS_REVIEW_REQUIRED`로 중단.
2. `CREATE FUNCTION`으로 새 함수 생성. `OR REPLACE`와 DROP FUNCTION은 없음.
3. PUBLIC·anon의 EXECUTE 회수, authenticated EXECUTE 부여.
4. PostgREST 스키마 캐시 갱신 알림.
5. 커밋.

설치 후 조회 SQL을 다시 실행해 정의·소유자·실효 권한을 확인해야 한다. 실행 계정이 함수 소유자가 된다. 환경별 기본 권한에 추가 역할이 있을 수 있으므로 PUBLIC·anon 회수만으로 모든 다른 역할까지 배제됐다고 단정하지 않는다. service_role·소유자 등 관리 역할은 일반 브라우저 역할과 구별해 검토한다. 이번 파일은 새로운 로그인·키·역할을 만들지 않는다.

### 함수가 이미 있을 때

- 서명·본문·보안 설정·권한·관련 정책이 호환되면 재설치 불필요.
- 인수 이름이 다르면 타입이 같아도 JSON 인수 기반 RPC 호출이 실패할 수 있다.
- 타입·반환형·인수 수·기본값·오버로드가 다르면 별도 호환성 검토가 필요하다.
- INVOKER이면 현재 정책에서 미디어 UPSERT가 가능한지 확인한다. 이름만 같다고 정상 출간을 보장하지 않는다.
- 본문이나 ACL이 다르면 기존 정의·권한을 보관하고 차이를 검토한 후 별도 교체안을 만든다. 이번 신규 설치 파일로 교체하지 않는다.
- 같은 서명이라도 다른 반환형·인수 이름 등은 CREATE OR REPLACE로 바로 바꿀 수 없는 경우가 있다. 의존성·호출자 조사 없이 DROP/재생성하지 않는다.

현재 운영 본문이 없어 실제 차이점 목록은 아직 작성할 수 없다. `routines[].definition`, ACL 및 설정 결과가 다음 비교의 입력이다.

## 위험성 검토

| 영역 | 확인 결과와 남은 조건 |
|---|---|
| 설치 시 데이터 변경 | 함수 생성·권한·캐시 알림만 수행한다. 가이드·구매·코인·프로필·Storage 행을 INSERT/UPDATE/DELETE하는 실행문은 함수 밖에 없다. 함수 정의를 저장해도 본문이 호출되지는 않는다. 운영 DDL 이벤트 트리거의 부수효과는 조회 후 확인 필요 |
| 호출 시 변경 범위 | 본인 guides 행 UPSERT, 해당 가이드 pins/media UPSERT 및 요청에서 빠진 pins/media 행 삭제. guides 행 자체나 Storage 객체는 삭제하지 않음 |
| 완전 스냅샷 주의 | p_pins/p_media는 추가분이 아니라 해당 가이드의 전체 목표 상태다. 빈 배열도 허용하므로 잘못된 빈 입력은 본인의 기존 핀/미디어 메타데이터를 지울 수 있음. Storage 파일은 남지만 잘못된 요청이 성공하면 메타데이터 삭제는 커밋됨 |
| 구매·코인·프로필 | 직접 쓰는 SQL 없음. guides ID·작성자 유지, guides DELETE 없음으로 관련 FK의 삭제 cascade를 유발하지 않음. 다만 최신 운영 트리거/FK가 추가됐는지는 조회 필요. 새 가이드 작성자는 profiles FK를 만족해야 함 |
| 소유권 | auth.uid() null 거절. 가이드 행 잠금 후 타인 작성자 거절. author_id는 입력 JSON을 신뢰하지 않고 caller로 저장. 타 가이드 pin/media ID 재사용도 사전·사후 검사 |
| Storage 참조 | 허용 버킷·미디어 역할·자기 경로·기존 소유 가이드 legacy 경로·기존 연결 경로 및 객체 존재를 확인. storage.objects에 쓰거나 객체를 삭제하지 않음 |
| 객체 검증 한계 | 서버는 객체 존재와 입력 MIME/크기 조건을 검사하지만 실제 객체 메타데이터 크기/MIME와의 일치나 파일 바이트를 검증하지 않음. 클라이언트는 객체 크기를 다시 조회함. 악의적인 직접 RPC 호출까지 클라이언트 검사로 막았다고 주장할 수 없음 |
| RLS | draft INSERT와 Storage HTTP 요청에는 로그인 사용자의 RLS가 적용됨. DEFINER RPC 내부는 함수 소유자 권한으로 실행되므로 소유자가 슈퍼유저/BYPASSRLS/테이블 소유자인 경우 호출자 RLS가 우회될 수 있음. 함수의 명시적 소유권 검사에 의존하며 ‘내부에도 항상 사용자 RLS가 적용된다’고 해석하면 안 됨 |
| SECURITY 설정 | 고정 search_path=pg_catalog. 앱 테이블은 public.*, 객체는 storage.objects, 인증 함수는 auth.uid()로 한정. 함수 소유자는 신뢰할 수 있는 관리 역할이어야 함 |
| 실행 권한 | 같은 설치 트랜잭션 안에서 PUBLIC·anon 회수, authenticated 허용. 익명 Auth 세션도 authenticated 역할일 수 있으므로 일반 미로그인 anon과 구분. auth.uid() 검사 유지 |
| 트랜잭션 | 함수 호출 하나가 원자적 DB 트랜잭션. 예외를 삼키는 EXCEPTION 핸들러 없음. 가이드 단위 advisory lock 및 행 잠금, 즉시 UNIQUE를 유지한 순서 재배치. 오류 시 전체 DB 변경 롤백. HTTP 업로드와 선행 draft는 별도 요청이므로 롤백 대상 아님 |
| 동시성 | 반복 출간이 중복 행을 만들지 않도록 직렬화하지만 서로 다른 편집본의 ‘나중 요청이 앞 요청을 덮음’까지 막는 버전 충돌 검사는 없음 |
| SQL injection | 동적 EXECUTE/문자열 SQL 생성 없음. JSON 값은 정적 SQL의 데이터로 사용. SQL처럼 생긴 제목도 문자열로 저장됨을 테스트함. auth 함수·DB 객체 정의 자체가 신뢰된다는 전제는 필요 |

### INVOKER 우선 검토 결과

보관된 운영 카탈로그에서 authenticated에 테이블 UPDATE 권한(GRANT)은 있으나 `guide_media` UPDATE **RLS 정책**은 없다. 두 권한은 별개다. 같은 본문을 INVOKER로 바꿔 기존 미디어를 포함한 재출간을 실행했을 때 `42501: row-level security` 오류가 발생했고 전체 변경이 롤백됐다.

따라서 현재 본문·정책 유지 조건에서는 DEFINER를 유지한다. INVOKER가 원리상 불가능하다는 뜻은 아니다. 최신 운영에 적절한 UPDATE 정책이 존재한다면 재검토할 수 있고, 구현이나 정책을 바꾸는 대안도 있지만 이번 검증에서 승인 없이 적용하지 않았다.

참고: [PostgreSQL CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html), [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## 로컬 검증 및 적용 판정

PGlite PostgreSQL에서 조회 SQL의 함수 미설치·설치·다른 인수 오버로드, 본문 해시·보안 설정·ACL 출력, 재설치 차단·기존 정의/권한 보존, INVOKER 실패·롤백, SQL 형태 입력의 데이터 처리, anon 실행 거절과 auth.uid() 누락 거절을 검증했다. 기존 출간·구매 기록·타인 데이터 보호 회귀 테스트도 함께 실행한다.

전체 로컬 테스트 **103개 통과, 실패 0, skip 0**, `git diff --check` 통과. 검증은 로컬 PostgreSQL 및 HTTP/Auth 어댑터 기준이며 운영 Supabase 결과가 아니다. **운영 조회 결과 확인 → 차이 분석 → 필요한 변경 SQL 별도 검토·승인 → 테스트/운영 적용** 순서를 유지한다.
