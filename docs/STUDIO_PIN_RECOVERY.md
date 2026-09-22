# Studio pin recovery investigation (2026-09-23)

## 1. 원인과 증거의 범위

실제 사고 당시 모바일 로그/DB 이력은 제공되지 않았다. 따라서 그 사고가 회전 직후의 브라우저 재생성인지, 다른 저장 경로인지 확정할 수 없다.

확인된 결함:
- app.js의 TravelogState.customCreatedPins는 시작 시 빈 배열이다. 변경 전에는 작업 중 핀을 저장/복원하는 draft 경로가 없었다. 페이지 재생성 시 아직 가이드로 저장하지 않은 핀은 복원되지 않았다.
- completeStudioGuideEdit, publishPreparedGuideOnline, publishPreparedGuideToDrive가 성공 후 resetCreatorStudioForNewGuide를 호출했다. 이 함수와 map.js의 clearCreatorPins는 실제 핀 배열을 비웠다. 사용자가 삭제를 요청하지 않은 초기화 경로였다.
- openSavedGuideEditor는 같은 가이드를 다시 열어도 배열을 저장 기록으로 교체했고, 미디어 복원 await 이후 편집 대상 변경 여부를 확인하지 않았다.

## 2. 회전이 직접 원인인지

찾은 resize/orientationchange 경로는 뷰포트/지도/메모 입력 위치 조정이다. 사진 저장에서 clearCreatorPins나 resetCreatorStudioForNewGuide로 이어지는 호출은 없다. 직접 삭제 원인으로 확인되지 않았다. 모바일 OS가 페이지를 폐기했다는 가설은 실기기 로그가 필요하다.

## 3. 조사 범위와 삭제 위치

전체 JS/HTML에서 customCreatedPins, pins, guidePins, guide_pins, setPins, clearPins, clearCreatorPins, resetPins, removePin, deletePin, splice, 빈 배열 할당, innerHTML, renderStudio/Creator/Map, lifecycle, reload/location, local/sessionStorage, IndexedDB, Supabase와 사진 callback을 검색했다.

- app.js: TravelogState 시작 상태. lifecycle은 화면 조정/공개 메모 갱신이며 studio 배열 재조회는 없다.
- creator.js: clearPins → 지도 모듈 전체 삭제. 명시적 reset 버튼에 연결된다.
- creator.js: resetCreatorStudioForNewGuide → 핀/미디어 초기화. 자동 저장/출간 호출 세 곳을 제거했다.
- creator.js: openSavedGuideEditor → 저장 기록 hydration. 같은 활성 가이드의 작업 핀을 보존하고, 늦은 미디어 복원 완료에는 generation 검사를 추가했다.
- map.js: clearCreatorPins(변경 전) → customCreatedPins = []. 현재 deleteAllGuidePins로 명확히 구분한다. 호환 alias는 유지한다.
- map.js: removeCreatorPin은 명시적 개별 삭제, renderTour의 layer clear는 시각적 마커 제거다.
- creator.js: 사진 file input change → loadPhotoMemoFile → canvas 편집 → completePhotoMemoRecording → addNewCreatorPin. 변경 전에도 append였고 배열 전체 교체는 없었다.
- index.html/index_v2.html → creator.js/map.js/app.js 및 메모 보조 스크립트. CSS의 모바일/가로 규칙은 레이아웃만 조정하며 변경하지 않았다.

## 4. 변경 파일

creator.js, map.js, index.html, index_v2.html, tests/creator-pin-recovery.test.cjs, docs/STUDIO_PIN_RECOVERY.md.

## 5. 변경 함수

추가: persistWorkingDraft, restoreWorkingDraft, logCreatorLifecycle, bindCreatorLifecycle, clearPinMarkersFromMap, deleteAllGuidePins.
수정: init, markPublishDraftDirty, renderCoordinatesList, buildGuidePublishPackage, openSavedGuideEditor, completePhotoMemoRecording, resetCreatorStudioForNewGuide, completeStudioGuideEdit, publishPreparedGuideOnline, publishPreparedGuideToDrive, clearPins, addNewCreatorPin, updateCreatorPinColor.

## 6. 구현

- 작은 핀/미디어 참조 snapshot을 localStorage의 travelog_creator_working_draft_v1에 동기 저장한다. 사진 원본은 기존 DeviceStorage(OPFS/선택 폴더/IndexedDB)를 이용한다. 새 DB 테이블이나 SQL은 없다.
- 초기 렌더 전에 핀과 guideId를 복원한다. 미디어 복원은 기존 객체에 원본을 보충하며 핀 배열을 다시 대입하지 않는다.
- 변경 시와 lifecycle 전환 시 복구 메타데이터를 저장한다. 전체 페이지 종료 이벤트에만 의존하지 않는다.
- init 중복 호출을 차단한다. 가이드 ID는 작업 중 유지된다. 새 핀에는 UUID를 사용하고 기존 ID는 유지한다.
- 사진 저장은 원본 저장 성공 후에만 새 핀을 추가한다. 실패 시 기존 핀과 편집 모달을 유지한다. 중복 저장과 저장 중 다른 가이드로 전환하는 경우를 방어한다.
- 저장/출간 완료 후 현재 핀을 자동 초기화하지 않는다.
- 지도 크기 변경은 invalidateSize만 요청한다. marker 제거 함수는 데이터 배열을 변경하지 않는다.
- 두 HTML의 JS 버전을 갱신했다. UI/CSS 디자인 변경은 없다.

## 7. Supabase 삭제 여부

이번 조사/검증에서 운영 DB에 쓰기나 삭제를 수행하지 않았다. 개별 studio 사진 저장은 guide_pins DELETE/INSERT를 호출하지 않는다. 기존 최종 출간 함수에는 새 핀/미디어 INSERT 및 미디어 검증 후 이전 guide_pins/guide_media를 DELETE하는 경로가 있다. 이는 개별 사진 저장 경로가 아니며 이번 수정에서 변경하지 않았다. 실제 사고 당시 DB 삭제 여부는 서버 이력 없이 확인할 수 없다.

## 8. 검증

명령: node --test tests/creator-pin-recovery.test.cjs (12/12 통과), node --check creator.js, node --check map.js, git diff --check 통과.

| 시나리오 | 결과/범위 |
| --- | --- |
| A 사진 추가 | 자동 테스트에서 기존 3개 + 1개 유지 |
| B 세로→가로 | lifecycle 이벤트 모사 통과 |
| C 세로→가로→세로 | 이벤트 모사 및 Edge 모바일 크기 변경/사진 선택/캔버스/실제 기기 저장 경로 통과. 지도 연결은 대체 구현 |
| D 카메라 복귀 | visibility/pagehide/pageshow 이벤트 모사 통과. 실제 스마트폰 카메라 미검증 |
| E 저장 실패 | 기기 저장 강제 실패 시 기존 3개 동일. 개별 studio 사진에는 서버 업로드가 없음 |
| F 회전/탭 이동 | 반복 lifecycle 및 모듈 재생성 복원 통과. 실제 탭 클릭 전체 흐름 미검증 |
| G 재시작/저장 가이드 | 로컬 가이드 ID 복원/동일 가이드 재열기 보호 통과. 운영 Supabase SELECT 통합 미검증 |

추가 검증: 빈 hydration 보호, 중복 저장, 저장 중 가이드 전환, marker만 제거, 명시적 삭제 이후 빈 상태 복원, 이름/순서 복원, 동일 timestamp에서 UUID 중복 없음.

임시 Edge 테스트는 실제 페이지 DOM, file input, canvas, DeviceStorage를 사용했다. 390×844 → 844×390 → 390×844 후 저장하고 새로고침하여 핀 4개와 사진 참조 1개가 유지됐다. 페이지 JS 오류 없음. 외부 Leaflet CDN 로드가 실패하여 지도 추가 연결만 테스트용으로 대체했다. 실제 지도 마커/미리보기/출간/음성·영상 녹화의 전체 UI 회귀 통과를 뜻하지 않는다.

## 9. 남은 확인 및 진단 방법

- 실기기 카메라/OS 메모리 회수, 운영 Supabase 복원, 실제 Leaflet 지도/전체 출간 회귀가 남아 있다.
- 복구는 현재 브라우저의 활성 작업용이다. 여러 탭의 동시 편집 충돌 해결/기기 간 동기화는 제공하지 않는다.
- 브라우저 저장소 삭제·용량 초과·원본 파일 접근 권한 상실까지 절대 보존할 수는 없다. 복구 저장 실패와 미디어 누락은 경고한다. 별도 가이드 저장을 병행해야 한다.
- 수정 전 이미 사라졌고 저장 기록이 없는 메모리 핀을 이 변경으로 소급 복원할 수 없다.
- 로그 활성화: 개발자 콘솔에서 localStorage.setItem('travelog_debug_lifecycle', '1') 후 재현. 해제: localStorage.removeItem('travelog_debug_lifecycle').
- [TravelogDebug] 로그에는 guideId, 핀 수/ID, 방향, visibility, 사진 편집 여부, persisted와 performance.timeOrigin이 포함된다. 회전 전후 timeOrigin 변경 및 DOMContentLoaded/load 재발생으로 페이지 재생성 여부를 구분한다. 기본 상태에서는 로그를 남기지 않는다.
