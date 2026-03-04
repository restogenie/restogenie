# **레스토지니 다중 POS 동적 데이터 파이프라인 PRD**

## **1\. 목적 (Purpose)**

레스토지니 가입 매장의 이기종 POS 데이터 연동 시 발생하는 하드코딩 개발 리소스 낭비를 제거하고, 사용자가 직접 UI에서 데이터를 매핑하는 '설정 기반(Configuration-driven)' ETL 아키텍처 구축.

## **2\. 타겟 데이터 모델 (Target Data Schema \- ARTS ODM 기반)**

사용자가 매핑 대상으로 선택할 레스토지니의 통합 표준 스키마 명세.

* transaction\_id (String, Y): 영수증 고유 식별자 (txId, order\_id 등 매핑)  
* transaction\_timestamp (Timestamp, Y): 결제 일시 (RFC 3339\)  
* location\_code (String, Y): 매장 고유 코드  
* gross\_sales\_amount (Decimal, Y): 총 매출 금액  
* net\_sales\_amount (Decimal, Y): 실제 결제 금액 (실매출)  
* discount\_amount (Decimal, N): 총 할인 금액  
* tax\_amount (Decimal, N): 부가세  
* tender\_type (String, Y): 결제 수단 (현금, 카드 등)  
* transaction\_status (String, Y): 결제 상태 (승인, 취소 등)  
* delivery\_fee\_amount (Decimal, N): 배달 팁/수수료  
* sales\_channel (String, N): 주문 채널 (현장, 배민, 요기요 등)

## **3\. 기능 요구사항 (Functional Requirements \- FR)**

* **FR-1. 동적 인증 폼:** POS 벤더 선택 시 해당 API가 요구하는 인증 방식(OAuth, API Key, ID/PW)에 맞게 프론트엔드 입력 폼이 동적 렌더링 되어야 함.  
* **FR-2. 스키마 디스커버리:** 연결 성공 시 백엔드는 대상 API의 트랜잭션 10\~50건을 호출하고, JSON 트리를 평탄화(Path Flattening)하여 고유 경로 목록과 샘플 데이터를 추출해야 함.  
* **FR-3. 자동 매핑 (Auto-mapping):** 백엔드는 동의어 사전(Synonym Dictionary)을 기반으로 원천 경로와 타겟 스키마 간의 일치도를 계산, UI 초기 렌더링 시 최적의 타겟을 Pre-select 해야 함.  
* **FR-4. Widest Type Casting 경고:** 원천 샘플에서 동일 경로에 다중 자료형(예: Number, String 혼재) 발견 시, String으로 관대하게 추론하되 UI에 타입 강제 변환 경고를 표시해야 함.  
* **FR-5. JOLT Spec 컴파일:** 사용자가 매핑을 저장하면, 백엔드는 UI의 State Object를 JOLT Spec 오퍼레이션(shift, default, remove) JSON으로 변환하여 DB 메타데이터 제어 테이블에 기록해야 함.

## **4\. 비기능 요구사항 (Non-Functional Requirements)**

* **NFR-1. 서드파티 Rate Limit 대응:** 데이터를 당겨오는 Worker(Lambda)는 API 속도 제한(HTTP 429 등) 대비 tenacity 라이브러리 등을 활용해 'Jitter가 포함된 지수 백오프(Exponential Backoff)' 재시도 로직(최대 3\~5회)을 반드시 적용해야 함.  
* **NFR-2. 행 단위 오류 처리 (Per-row Error Handling):** JOLT 변환 중 특정 Row의 데이터 타입 불일치 등 형식 오류 발생 시 파이프라인을 중단(Fail)하지 말고, 해당 컬럼을 Null 또는 원시 문자열로 캐스팅하여 적재함. 동시에 \_restogenie\_meta JSONB 필드에 오류 사유를 로깅해야 함.  
* **NFR-3. 아키텍처 복원력:** 모든 원시 페이로드(Raw Payload)는 반드시 S3 Bronze Layer에 보존하여, JOLT 매핑 룰 변경 또는 장애 발생 시 대상 POS API 재호출 없이 S3 데이터만으로 재처리(Reprocessing)가 가능해야 함.