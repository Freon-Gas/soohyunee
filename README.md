![header](https://capsule-render.vercel.app/api?type=waving&color=ff8f00&height=300&section=header&text=soohyunee&fontSize=60&fontColor=000000&animation=fadeIn&fontAlignY=38&desc=&descAlignY=55&descAlign=70)

## :busts_in_silhouette: Members

| 권수현 | 이나경 | 이정현 |
|---|---|---|


## :round_pushpin: **Introduction**
응용정보캡스톤디자인 수업을 위한 프로젝트입니다.



## :key: **Key Features**
### 🎭 3D 수어 시각화
- **OpenPose 키포인트 기반** 실시간 3D 수어 애니메이션
- **Three.js**를 활용한 고품질 3D 렌더링
- 포즈, 손동작, 얼굴 표정을 포함한 **전신 수어 표현**
- 마우스를 통한 **360도 시점 조작** 및 줌 기능
- **메쉬 렌더링**을 통한 사실적인 인체 표현

### 🎤 실시간 음성 인식
- **Web Speech API**를 활용한 실시간 한국어 음성 인식
- 음성 입력과 텍스트 입력 **동시 지원**
- 실시간 중간 결과 표시 및 피드백
- 자동 음성 인식 타임아웃 (15초)

### 🔄 지능형 수어 문법 변환
- 한국어 문장을 **수어 문법에 맞게 자동 변환**
- **2,853개** 한국 수어 단어 데이터베이스 지원
- 자연어 처리를 통한 **의미 보존** 번역
- 수어 특성을 고려한 **어순 재배열**

### 💬 대화 기록 관리
- 번역 기록 **자동 저장** (localStorage)
- 과거 대화 **재생 및 검색** 기능
- 대화별 **날짜 구분** 및 관리
- **삭제 및 편집** 기능

### 🎮 애니메이션 제어
- **재생/일시정지** 제어
- **프레임별 이동** 슬라이더
- **속도 조절** (2-30 FPS)
- **메쉬 표시/숨김** 토글

### 📱 반응형 UI
- **모바일, 태블릿, 데스크톱** 완벽 지원
- **Glass Morphism** 디자인 적용
- 직관적이고 **접근성 높은** 사용자 인터페이스
- **다크 테마** 기반 시각적 편안함

## 🚀 빠른 시작

### 필수 요구사항
- **Node.js** 16.0.0 이상
- **npm** 7.0.0 이상
- **Chrome 브라우저** (음성 인식 최적화)
- **HTTPS 환경** (음성 인식 필수)

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-username/sign-language-translator.git
cd sign-language-translator

# 의존성 설치
npm install

# 개발 서버 시작
npm start
```

애플리케이션이 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

### 프로덕션 빌드

```bash
# 프로덕션 빌드 생성
npm run build

# 정적 파일 서빙
npm run serve
```

### 기타 스크립트

```bash
# 코드 검사
npm run lint

# 코드 자동 수정
npm run lint:fix

# 코드 포맷팅
npm run format

# 테스트 실행
npm test

# 테스트 커버리지
npm run test:coverage
```

## 🎯 사용 방법

### 1. 텍스트 입력
- 하단 플로팅 입력창에 번역할 한국어 텍스트 입력
- **Enter** 키 또는 **전송 버튼** 클릭으로 번역 시작
- 실시간으로 수어 문법 변환 및 3D 애니메이션 표시

### 2. 음성 입력
- **마이크 버튼** 클릭하여 음성 인식 시작
- 명확하게 **한국어로 발음**
- 중간 결과를 실시간으로 확인 가능
- 음성 인식 완료 시 자동으로 번역 시작

### 3. 3D 애니메이션 조작
- **마우스 드래그**: 시점 회전
- **마우스 휠**: 줌 인/아웃
- **애니메이션 컨트롤 패널**:
  - 재생/일시정지/리셋 버튼
  - 프레임 슬라이더로 특정 구간 이동
  - 속도 조절 (2-30 FPS)
  - 메쉬 표시/숨김 토글

### 4. 대화 기록
- 좌측 **사이드바 토글**로 대화 기록 확인
- 과거 번역 기록 **클릭하여 재생**
- **삭제 버튼**으로 불필요한 기록 제거

## 🏗️ 프로젝트 구조

```
sign-language-translator/
├── public/                    # 정적 파일
│   ├── data/                  # 수어 데이터
│   │   └── word-patterns.json # 단어별 키포인트 패턴 정보
│   ├── index.html             # HTML 템플릿
│   └── manifest.json          # PWA 매니페스트
├── src/                       # 소스 코드
│   ├── components/            # React 컴포넌트
│   │   ├── ImprovedKeypointSignModel.js  # 3D 수어 시각화
│   │   ├── ConversationHistory.js        # 대화 기록
│   │   └── ...
│   ├── utils/                 # 유틸리티 함수
│   │   ├── speechRecognition.js          # 음성 인식
│   │   ├── signLanguageGrammar.js        # 수어 문법 변환
│   │   ├── indexBasedAnimationUtils.js   # 애니메이션 로더
│   │   └── ...
│   ├── App.js                 # 메인 애플리케이션
│   ├── App.css                # 메인 스타일시트
│   ├── index.js               # 애플리케이션 진입점
│   └── index.css              # 전역 스타일
├── package.json               # 프로젝트 설정
└── README.md                  # 프로젝트 문서
```

## 🔧 기술 스택

### Frontend Core
- **React** 18.2.0 - UI 라이브러리
- **Three.js** 0.152.2 - 3D 그래픽스 엔진
- **Web Speech API** - 음성 인식
- **CSS3** - 모던 스타일링 (Glass Morphism)

### 3D Visualization
- **OpenPose** - 키포인트 데이터 형식
- **WebGL** - 하드웨어 가속 3D 렌더링
- **Three.js Mesh** - 사실적인 인체 표현

### Data & Storage
- **JSON** - 키포인트 데이터 저장
- **Local Storage** - 대화 기록 저장
- **Axios** 1.9.0 - HTTP 클라이언트

### Development Tools
- **Create React App** 5.0.1 - 프로젝트 설정
- **ESLint** - 코드 품질 관리
- **Prettier** - 코드 포맷팅
- **Jest** - 테스트 프레임워크

### Backend Support
- **Express.js** 5.1.0 - 개발 서버
- **Multer** 1.4.5 - 파일 업로드 처리
- **Form-data** 4.0.2 - 멀티파트 데이터 처리


## 🤝 기여하기

프로젝트 개선에 기여하고 싶으시다면:

### 1. Fork 및 브랜치 생성
```bash
git fork https://github.com/your-username/sign-language-translator.git
git checkout -b feature/새로운기능
```

### 2. 변경사항 커밋
```bash
git commit -m "feat: 새로운 기능 추가"
```

### 3. Pull Request 생성
- 명확한 제목과 설명 작성
- 변경사항에 대한 스크린샷 첨부
- 테스트 결과 포함

## 📄 라이센스

이 프로젝트는 **MIT 라이센스** 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
