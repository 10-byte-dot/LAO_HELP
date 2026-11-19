# 버전 히스토리

## 현재 버전: V1.14 (2026-02-03)

---

### V1.14 (2026-02-03)
- JSON 저장 시 들여쓰기 포맷 적용 (JSON.stringify(data, null, 2)), 번역·수정 시 가독성 향상

### V1.13 (2026-02-03)
- 검색: 바텀탭 제목도 검색 대상에 포함 (미들탭 제목 또는 하위 바텀탭 제목 일치 시 해당 미들탭 표시)
- 검색 시 미들탭(부모)이 펼쳐진 상태로 표시 (검색어가 있을 때 바텀탭이 있는 미들탭 자동 펼침)

### V1.12 (2026-02-03)
- 바텀탭: 미들탭 하위 탭(아코디언 UI), 바텀탭 관리 모달, 4부 본문 ID 규칙(최상단-중단-바텀-본문), 본문 관리 필터·연결 본문 추가/수정/삭제 지원
- 본문 연필 아이콘(이미지/제목/설명 수정) 버튼이 바텀탭 선택 시에도 작동하도록 수정 (getCurrentBodyId/getCurrentMidTabId에서 .mid-subitem.active 지원)
- 페이지네이션(이전/다음 페이지)을 본문 바로 밑에 붙이도록 변경 (margin-top: auto·translateY 제거, 본문 흐름에 따라 배치)
- 본문이 길어질 때 본문 영역에 스크롤 생기도록 수정 (.body-inner flex-shrink: 0, .help-root·help-main 그리드 minmax(0,1fr), .body-content flex: 1 1 0·overflow)

### V1.11 (2026-02-02)
- localStorage(임시 저장) 제거: 데이터는 편집 시 DOM(#help-data)에만 반영
- 뷰어/편집기 모두 HTML 내장(embed) 데이터만 사용, getDraftFullData 제거
- ZIP 공유 시 다운로드한 index.html·Help_Editor.HTML로 교체하면 동일 화면 표시

### V1.10 (2026-02-02)
- index.html·Help_Editor.HTML 저장을 다운로드 방식으로 변경 (편집 데이터 포함 파일 다운로드)
- index.html 다운로드 / Help_Editor.HTML 다운로드 버튼 분리
- 다운로드한 파일을 프로젝트 폴더에 덮어쓰면 공유 시 동일한 상태로 표시

### V1.09 (2026-02-02)
- 본문 이미지 로드 경로: assets/help/images/{최상단탭ID}/ (뷰어 getBodyImagePath 적용)
- 본문 수정에서 이미지 경로 규칙 적용 (getBodyImageBasePath, placeholder·찾아보기·저장·슬라이드쇼 빠른 수정)
- 이미지 추가 시 assets/help/images/{topTabId}/ 표시 (필터·편집 중 본문 ID fallback)

### V1.08 (2026-02-02)
- 본문 이미지 크로스페이드 후 깜빡임 제거 (nextEl.src 비우지 않고 opacity만 0 유지)
- 본문 이미지 업로드를 이전 방식으로 복원 (폴더 선택/상대 경로 우회 제거, 파일명만 사용)
- 파일 선택 대화상자에서 취소 시 슬라이드쇼 재개 (window focus 감지 + 2초 fallback)

### V1.07 (2026-02-02)
- 같은 중단 탭 본문 판별 시 prefix 대신 parseBodyId로 topTabId·midOrder 비교 (defense-1 vs defense-10 구분)
- getBodiesInSameMidTab / getBodiesInMidTab 정확한 midOrder 매칭으로 본문 1개인데 2페이지로 보이던 현상 수정
- 페이지네이션: 본문 전환 시 항상 현재 본문 기준으로 DOM 갱신

### V1.06 (2026-02-02)
- 본문 설명 수정 시 [키워드] 강조 유지 및 수정 아이콘 정상 동작 (bodyDescription DOM 유지 방식)
- 본문 설명/제목 강조 스타일에 볼드(bold) 적용
- reloadFromEmbed 시 미들탭 선택 유지 (applyDataAndRender에서 savedMidId/savedBodyId 사용)
- 제목/설명 편집 중 다른 미들탭 이동 시: 편집 중인 본문에만 저장, 화면은 현재 선택된 본문으로 갱신
- 편집 중인 본문 ID 고정(editingDescriptionBodyId)으로 잘못된 본문에 저장되는 문제 수정
- 최상단 탭 순서 중복 방지 검증 추가 (order 값 기반, 저장 시 겹치면 알림)

### V1.05 (2026-02-02)
- 중단 탭 순서 변경 시 중단 탭 ID 자동 갱신 기능 추가
- 중단 탭 순서 변경 시 소속 본문 ID 자동 갱신 기능 추가
- 중단 탭 순서 중복 방지 검증 강화 (order 값 기반 검증)

### V1.04 (2026-02-02)
- 슬라이드쇼 이미지 로드 실패 시 Error.png 표시 기능 추가
- 이미지 경로 공백 처리 개선 (trim() 추가)
- 이미지 로드 실패 시 무한 루프 방지 로직 개선 (에러 카운터 추가)
- 예제 데이터의 placeholder.png를 No_Images.png로 변경
- ESC 키로 모든 모달 창 닫기 기능 추가

### V1.03 (2026-02-02)
- 도움말 및 편집기 스킨 변경 (라이트 테마, 오렌지 강조 색상)
- 이미지 경로 해결 로직 개선 (Windows 경로 지원, 백슬래시 처리)
- 탭 아이콘만 .svg로 변환, 본문 이미지는 .png 유지
- placeholder 대신 No_Images.png 사용으로 통일
- 본문 설명 키워드 강조 기능 추가 ([키워드] 형식)
- 슬라이드쇼 이미지 로드 실패 시 Error.png 표시, 무한 루프 방지 로직 개선

### V1.02 (2026-02-02)
- 이미지 편집 버튼 클릭 시 현재 이미지 즉시 수정 기능 추가
- 파일 선택 중 슬라이드쇼 일시정지 기능 추가
- 제목 편집 버튼 추가 및 즉시 편집 기능
- 본문(설명 텍스트) 편집 버튼 추가 및 즉시 편집 기능

### V1.01 (2026-02-02)
- 이미지 경로 해석 로직 개선 (file:// 프로토콜 지원)
- 언어 삭제 후 JSON 불러오기 문제 수정
- 파일 입력 리셋 기능 추가

### V1.0 (2026-02-02)
- 도움말 편집기 초기 릴리스
- 본문 이미지 경로 자동 설정 기능 추가
- 언어 관리 기능 추가
- JSON 파일 불러오기 기능 추가
- 버전 히스토리 기능 추가
