# **레스토지니 다중 POS 매핑 화면 기획서 (UI/UX Spec)**

## **1\. 화면 구조 개요 (SPA 기반 React 컴포넌트)**

단일 페이지 애플리케이션(SPA) 내에서 3단계 Step으로 진행되는 Wizard 형태의 인터페이스.

## **2\. 화면 단위 상세 기획**

### **\[Step 1\] POS 커넥터 설정 화면 (Connector Setup)**

* **UI 컴포넌트:**  
  * POS Vendor SelectBox: 연동할 POS 브랜드를 선택 (토스포스, 페이히어, 스마트로, 오케이포스, KICC).  
  * Dynamic Auth Form: 선택된 Vendor에 따라 렌더링 변경.  
    * *페이히어:* API Key 입력 필드.  
    * *OKPOS:* ASP 로그인 ID, 가맹점 코드, 비밀번호 입력 필드.  
  * Connection Test Button: "연결 테스트" 버튼.  
* **인터랙션/로직:**  
  * 버튼 클릭 시 백엔드 상태 체크 API 호출 \-\> HTTP 200 검증 후 우측 하단 토스트 알림(성공/실패) 표출. 성공 시 Step 2로 자동 전환.

### **\[Step 2\] 동적 스키마 디스커버리 및 매핑 화면 (Schema Discovery Board)**

이 시스템의 핵심 화면으로, 와이어프레임 베스트 프랙티스(Keep It Simple)를 준수하여 인지 부하 최소화.

* **UI 컴포넌트:** DataMappingTable (데이터 그리드 컴포넌트)  
  * **Header:** POS 원천 데이터 경로 | 실제 데이터 샘플 (미리보기) | 레스토지니 표준 항목 (타겟)  
  * **Rows (MappingRow):** 백엔드에서 평탄화(Flattened)되어 내려온 원천 컬럼 배열 수만큼 동적 렌더링.  
    * *Column 1:* 원천 경로 텍스트 (예: payment.card.amount). Hover 시 PreviewTooltip 팝업 (원본 JSON 트리 구조 시각화).  
    * *Column 2:* 샘플 데이터 텍스트 캐러셀 (예: \[5000, 4500, 12000\]). 숫자형/문자형 등 데이터 타입 충돌 시 경고 아이콘(⚠️) 표출 ("강제 캐스팅 됨" 툴팁).  
    * *Column 3:* 타겟 컬럼 SelectBox. ARTS ODM 기반 표준 스키마 11종 리스트 표출.  
* **인터랙션/로직:**  
  * 화면 렌더링 시 문자열 유사도 분석을 통해 최적의 타겟 컬럼이 자동 선택(Auto-mapping)되어 있음 (사용자 수정 가능).  
  * 옵션 변경 시 React의 상태 객체(전체 매핑 딕셔너리) 실시간 갱신.

### **\[Step 3\] 파이프라인 스케줄링 및 저장 화면**

* **UI 컴포넌트:**  
  * Sync Frequency SelectBox: 동기화 주기 선택 (1시간, 6시간, 12시간, 24시간).  
  * Historical Sync DatePicker: 과거 데이터 연동 시작일 설정 (최근 7일, 30일 등).  
  * Save & Activate Button: "매핑 저장 및 스케줄 등록" (Primary Button).  
* **인터랙션/로직:**  
  * 버튼 클릭 시 매핑 상태 객체와 스케줄링 데이터를 JSON 페이로드로 직렬화하여 백엔드(POST /api/v1/mappings/activate)로 전송. 완료 시 대시보드 홈으로 이동.