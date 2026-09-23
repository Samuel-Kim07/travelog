# Supabase 출간 실패 및 재시도 조사 (2026-09-23)

## 결론과 확인 범위

Google Drive 출간 fallback과 관련 안내·Apps Script 전송 코드를 제거했다. 온라인 출간은 Supabase만 사용한다.

실제 스마트폰의 `Failed to fetch`를 네트워크 단절, CORS, 인증 또는 특정 파일 손실 중 하나로 확정할 근거는 아직 없다. 사용자는 Wi-Fi 사용을 확인했다. 기종/브라우저, 파일 용량, 실패한 Network 요청, 당시 서버 로그는 제공되지 않았다. 아래는 소스에서 확인한 결함과 재현 테스트 결과이며 실기기 근본 원인 확정이 아니다.

## 실제 호출 및 진행률

기존 호출:
`handleFinalPublishClick → publishPreparedGuideOnline → TravelogSupabase.publishGuidePackage → uploadMediaFile → uploadBlob → supabase.storage.from('guide-media').upload(path, blob)`.

영상은 `guides/<guideId>/video/pin_video_<순서>_<timestamp>.mp4` 형식으로 전송됐다. 업로드 후 `guide_media INSERT`가 별도 HTTP 요청으로 실행됐다. 대표 이미지/소개 미디어는 `guide-public`, 핀 음성/영상/사진은 `guide-media`를 사용한다.

중요: 기존 `reportMediaUploaded(fileName)`은 Storage 업로드와 guide_media INSERT가 **모두 완료된 뒤** 호출됐다. `60% = 30 + (3/5 × 50)`이므로 화면의 `video_memo_*.mp4 · 3/5`는 마지막으로 성공한 파일을 가리킬 수 있다. 다음 파일 업로드/DB 요청이 실패해도 이 문구가 그대로 남았다. 화면만으로 해당 영상의 upload가 실패했다고 단정할 수 없다.

## 발견한 결함

- SDK가 없으면 `publishPreparedGuideToDrive()`를 호출하는 fallback이 실제로 있었다.
- Supabase 실패 안내에 Google Drive를 실행하지 않았다는 불필요한 문구가 있었다.
- 모든 핀/미디어를 재INSERT하고 timestamp로 Storage 경로를 생성하므로 재시도 시 중복 전송/행 생성이 가능했다.
- 대표 이미지와 소개 미디어는 고정 경로에 `upsert:true`로 덮어써, 나중 파일이 실패해도 기존 출간 파일 내용이 먼저 바뀔 수 있었다.
- `guides` 최초 SELECT 오류를 무시해 연결 실패를 신규 가이드로 오인할 수 있었다.
- HTTP 응답 상태, 파일명, 저장 경로, SDK 감싼 원인 오류를 충분히 기록하지 않았다. 앱 차원의 업로드 timeout도 없었다.
- 기존 코드가 최종 guides UPDATE 전에 이전 guide_media/guide_pins를 삭제하므로 UPDATE 실패 시 기존 행이 먼저 사라질 수 있었다.

## Google Drive 검색/조치

프로젝트 전체에서 Google Drive, GoogleDrive, drive, Apps Script, 관련 상수/함수/버튼 ID/메타데이터 사용처를 검색했다.

제거한 출간 전용 항목:
- DRIVE_PARENT_FOLDER_*, APPS_SCRIPT_* 상수 및 키 입력/저장 함수
- convertFileEntryToMemo, buildAppsScriptPayload, postPayloadToAppsScript, uploadPackageToGoogleDrive, publishPreparedGuideToDrive
- 출간 package와 JSON의 driveFolderId
- Supabase 미준비 상태의 Drive fallback 및 실패 안내 문구
- 출간 버튼 ID를 publish-online-upload-btn으로 변경하고 동일한 이벤트에 연결

blobToDataUrl은 음성/영상/사진의 다른 실제 기능에서도 사용하므로 보존했다.

별도 보고 후 보존한 항목: index_v2.html의 Google Drive 폴더 열기 링크, app.js/languages.js의 gdrive 번역 항목. 이는 별도 외부 링크/번역이며 출간 fallback의 의존성은 아니다. 실제 서비스에서 필요한지 근거가 없어 임의 삭제하지 않았다. GitHub mediaStorage 모듈도 이번 출간 경로와 무관하여 변경하지 않았다.

## 수정 내용/함수

- creator.js: handleFinalPublishClick의 중복 실행 방지, publishPreparedGuideOnline의 Supabase 전용 처리, completeStudioGuideEdit의 연결 모듈 누락 시 중단, Drive 출간 코드 제거.
- supabaseClient.js: fingerprintBlob/digestText/makeStoragePath로 내용 기반 경로 생성. 6MiB 단위로 읽어 해시하므로 해시 계산에 영상 전체의 추가 ArrayBuffer를 만들지 않는다.
- uploadBlob: Storage info로 같은 경로·크기의 완료 파일을 재사용. 새 파일은 현재 세션을 확인하고 REST POST로 전송하며 upsert=false 사용. HTTP 상태와 브라우저 fetch 예외를 구분하고 180초 후 AbortController로 실제 요청을 중단한다.
- stablePublishRowId/insertPublishRowOnce/createGuideMediaRow: 내용으로 안정적인 UUID를 생성하여 동일 핀/미디어 행을 재사용한다. 이미 존재하는 행을 재INSERT하지 않고, 경쟁 중 duplicate key 발생 시 기존 행을 재조회한다. 새 UPDATE 정책이나 SQL을 추가하지 않았다.
- publishGuidePackage/executePublishGuidePackage: 중복 출간 차단, 최초 SELECT 오류 확인, 현재 처리 중인 파일을 요청 전에 표시, 이번 출간에서 재사용한 행을 포함해 미디어 검증.
- 실패 시 rollback DELETE나 Storage remove를 실행하지 않는다. 오래된 메타데이터 행 정리는 업로드/검증 및 최종 guides UPDATE 성공 확인 뒤로 이동했다. 정리 실패는 cleanupPending으로 따로 알리고 저장된 파일은 지우지 않는다.
- describePublishError: 단계, 파일/경로/버킷, byte 크기, MIME, HTTP 상태, 오류 유형, online/visibility, 세션 만료시각, 경과 시간을 기록한다. 토큰/인증 헤더/미디어 내용을 기록하지 않는다.
- index.html/index_v2.html: 스크립트 캐시 버전 갱신. CSS/배치/색상 등 디자인 변경 없음.

## URL·키·버킷·CORS 읽기 전용 확인

설정된 프로젝트 URL을 사용했으며 키/URL 설정을 변경하지 않았다. 사용자 세션 없이 공개 키만 사용한 요청이다. 실제 사용자가 접속한 origin은 제공되지 않아 저장소 remote를 바탕으로 GitHub Pages 형식인 `https://samuel-kim07.github.io`를 Origin 헤더에 사용했다.

- GET /auth/v1/settings: HTTP 200. 현재 환경에서 프로젝트 도메인/공개 키로 Auth 응답을 받을 수 있었다.
- OPTIONS /storage/v1/object/guide-media/guides/diagnostic-preflight.mp4: HTTP 200. 허용 origin `*`, POST 및 authorization/apikey/content-type/x-upsert 헤더 허용.
- GET /storage/v1/bucket/guide-media 및 guide-public: 실제 HTTP 400, JSON statusCode 404 / NoSuchBucket. 인증 세션 없는 응답으로 실제 버킷 부재인지 접근 제한에 의한 비노출인지 구분할 수 없다. 실사용자의 세션/버킷 정책 확인이 남아 있다.

서버에 가이드/파일을 생성·수정·삭제하지 않았다. OPTIONS는 업로드가 아니다. 이 결과는 사고 당시 스마트폰 연결과 CORS가 정상이라는 증거가 아니다.

## 재현 테스트

`node --test tests/*.test.cjs`: 30개 통과(이번 출간 테스트 18개 + 기존 핀 복구 테스트 12개).
`node --check creator.js`, `node --check supabaseClient.js`, `git diff --check`: 통과.

이번 테스트는 실제 connector 함수를 실행하며 Storage/DB/네트워크를 메모리 기반 대체 구현으로 연결했다. 운영 서버 업로드나 스마트폰 재현을 주장하지 않는다.

검증한 조건:
- 5개 영상 중 3개 성공 후 네 번째 fetch가 TypeError를 throw: 세 파일 및 기존 가이드/핀 유지, DELETE 없음, 실패 파일명이 네 번째 파일로 표시됨.
- 재시도 시 완료 파일은 POST하지 않고 실패/미시도 파일만 업로드. 핀·미디어 행 개수 중복 없음.
- 서버 저장 성공 후 응답 유실: 재시도에서 객체 조회로 확인하고 POST 생략.
- Storage 성공 후 guide_media 쓰기 실패: 이미 저장한 파일을 재전송하지 않음.
- HTTP 401/403/413/500, AbortError timeout, 세션 없음, 비어 있는 Blob, 읽기 불가능한 Blob을 구분.
- 최종 guides UPDATE 실패 시 이전 행 삭제 없음. 이후 재시도는 이미 업로드된 전체 파일 재사용.
- 정리 실패는 별도 표시하고 Storage 파일을 유지.
- 다른 Blob 객체/새 모듈에서도 같은 내용은 같은 경로. 같은 파일명이라도 바이트가 바뀌면 새 경로.
- 같은 파일을 두 메모에 사용하면 바이트는 한 번만 전송하되 두 메모 연결은 유지.
- 중복 출간 호출 및 진단 로그의 인증정보 노출 방지.

## 남은 제한/실기기 확인

- 정확한 사고 원인은 기존 메시지 하나만으로 확정할 수 없다. 수정 버전에서 재시도하면 `[Travelog Publish]` 로그와 오류 창에 HTTP 여부/단계/파일명이 표시된다. Wi-Fi라는 사실만으로 원인을 단정하지 않는다.
- 화면 회전/visibility 이벤트에서 File을 지우거나 출간 fetch를 취소하는 경로는 발견하지 못했다. Blob type/size 검사와 실제 읽기 검사 실패는 fetch 오류와 별도로 기록한다.
- 완료 파일 단위 재사용이며, 중간까지 전송된 실패 파일을 바이트 단위로 이어 보내는 TUS는 이번에 추가하지 않았다. 큰 파일의 표준 업로드는 계속 연결 품질/크기 제한 영향을 받는다. Supabase는 6MB 초과에 resumable upload를 권장한다: https://supabase.com/docs/guides/storage/uploads/standard-uploads
- 이번 변경 전에 timestamp 경로로 올라간 부분 파일은 내용 해시가 없으므로 자동 재사용을 보장하지 않는다. 삭제하지 않는다.
- 정리는 서버 트랜잭션이 아니다. 정리 실패 시 예전 메타데이터가 남아 중복 표시될 가능성이 있어 cleanupPending으로 알리고 다음 출간에서 다시 정리한다. 공개 독자에게 전환 중간 상태까지 완전히 숨기는 원자적 출간은 실제 운영 스키마 확인 후 서버 트랜잭션이 필요하다. 임의 SQL/RPC는 작성하지 않았다.
- 버킷 최대 크기/허용 MIME/RLS 정책과 실사용자 인증 세션은 운영 권한이 없어 확인하지 못했다. 이를 확인하지 않고 설정 변경이나 DB 변경을 하지 않았다.
- commit/push/deploy는 하지 않았다.
