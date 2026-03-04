# 웹사이트 스타일 가이드 (CSS Style Guide)

이 문서는 PC와 모바일 환경 모두에서 최적화된 사용자 경험을 제공하기 위한 웹사이트 스타일 가이드입니다. Toss UI의 간결하고 직관적인 디자인 시스템을 기반으로 구성되었습니다.

## 1. 타이포그래피 (Typography)

### 폰트 패밀리 (Font Family)
- **메인 폰트**: Pretendard Variable
- **Fallback**: -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif

### 폰트 사이즈 (Font Size)
모바일 환경에서는 가독성과 정보 밀도를 고려하여 PC보다 작은 폰트 사이즈를 적용합니다.

| 구분 | PC (Desktop) | Mobile | 비고 |
|:---:|:---:|:---:|:---|
| **H1 (Header)** | 32px | 24px | 페이지 메인 타이틀 |
| **H2 (Section)** | 24px | 20px | 섹션 구분 타이틀 |
| **H3 (Card Title)** | 20px | 18px | 카드 및 소제목 |
| **Body (본문)** | 16px | 14px | 본문 기본 텍스트 |
| **Caption (설명)** | 14px | 12px | 부가 설명 및 도움말 |

## 2. 레이아웃 및 그리드 (Layout & Grid)

### 반응형 기준 (Breakpoints)
- **Mobile**: max-width 768px
- **Tablet/PC**: min-width 769px

### 구조 (Structure)
- **Card UI**: 주요 컨텐츠는 카드 형태로 배치하여 정보의 독립성을 강조합니다. (Toss UI 스타일)
- **Shadow**: 부드러운 그림자 효과를 사용하여 깊이감을 줍니다. (`box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08)`)
- **Radius**: 카드 및 버튼의 모서리는 둥글게 처리합니다. (`border-radius: 16px` ~ `24px`)

## 3. 네비게이션 (Navigation)

### PC 환경 (Desktop)
- **위치**: 상단 (Top Navigation Bar)
- **형태**: 로고(좌측), 메뉴(중앙/우측), 유저 프로필(우측)이 배치된 수평형 레이아웃.

### 모바일 환경 (Mobile)
- **위치**: 좌측 (Left Side Menu / Drawer)
- **형태**: 햄버거 메뉴 아이콘 클릭 시 좌측에서 슬라이드되어 나오는 드로어(Drawer) 형태.

## 4. 메인 화면 구성 (Main Screen)

- **카드 레이아웃**: 주요 메뉴 및 컨텐츠 정보를 담은 카드를 그리드 형태로 배치합니다.
- **상세보기 액션**: 각 카드의 하단 또는 클릭 가능한 영역에 '상세보기' 버튼을 배치하여 클릭 시 세부 메뉴 페이지로 이동합니다.
- **인터랙션**: 카드 호버 시 약간의 스케일 업(`transform: scale(1.02)`)과 그림자 강조 효과를 적용해 클릭 가능함을 암시합니다.

## 5. 도움말 및 모달 (Help & Modal)

### 물음표 아이콘 (?)
- **위치**: 주요 메뉴명 옆, 컨텐츠 제목 옆 등 설명이 필요한 곳.
- **스타일**: 회색조의 원형 아이콘 또는 텍스트와 대비되는 서브 컬러 아이콘.
- **동작**: 클릭 시 모달 팝업(Modal Popup) 호출.

### 모달 팝업 (Modal Popup)
- **디자인**: 화면 중앙 정렬, 뒷배경 딤(Dim) 처리/블러 효과 (`backdrop-filter: blur(4px)`).
- **내용**: 해당 메뉴나 기능에 대한 상세 설명을 제공합니다.
- **닫기**: 우측 상단 'X' 버튼 또는 배경 클릭 시 닫힘.

## 6. 디자인 시스템 (Design System)

### 컬러 팔레트 (Color Palette)
*(Toss UI 뉴트럴 컬러 및 심플함 강조)*

- **Brand Color (Primary)**: `#3182F6` (Toss Blue - Reference) *프로젝트 성격에 따라 조정 가능*
- **Background**: `#F2F4F6` (Light Gray - Toss Style)
- **Surface**: `#FFFFFF` (White)
- **Text Primary**: `#191F28` (Black/Dark Gray)
- **Text Secondary**: `#8B95A1` (Gray)
- **Border**: `#E5E8EB` (Light Border)
- **Accent/Error**: `#F04452` (Red)
