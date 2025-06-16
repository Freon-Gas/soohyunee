# Korean Sign Language Translator

한국 수어를 3D로 시각화하는 실시간 번역기입니다. 음성 입력을 받아 한국어로 변환한 후, 해당하는 수어 동작을 3D 아바타로 표현합니다.

## 주요 기능

- 🎤 **음성 인식**: Whisper API를 통한 정확한 음성-텍스트 변환
- 🤖 **AI 문법 변환**: Google Gemini API를 활용한 수어 문법 최적화
- 👤 **3D 수어 시각화**: Three.js 기반 실시간 3D 아바타 애니메이션
- 📊 **키포인트 기반**: OpenPose 형식의 JSON 데이터를 활용한 정확한 동작 표현

## 기술 스택

- **Frontend**: React.js, Three.js
- **Backend**: Node.js (Whisper API 연동)
- **3D 렌더링**: Three.js + OpenPose 키포인트
- **AI**: Google Gemini API, OpenAI Whisper

## 설치 및 실행

### 1. 저장소 클론
```bash
git clone [repository-url]
cd sign-language-translator
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.example` 파일을 `.env`로 복사하고 API 키를 설정하세요:

```bash
cp .env.example .env
```

필요한 API 키:
- `REACT_APP_GEMINI_API_KEY`: Google Gemini API 키
- `REACT_APP_OPENAI_API_KEY`: OpenAI API 키 (선택사항)

### 4. 개발 서버 실행
```bash
npm start
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
sign-language-translator/
├── public/
│   └── data/
│       └── signs/          # 수어 동작 키포인트 데이터 (JSON)
├── src/
│   ├── components/         # React 컴포넌트
│   ├── utils/             # 유틸리티 함수
│   └── ...
├── .env.example           # 환경 변수 템플릿
└── generate-word-index.js # 단어 인덱스 생성 스크립트
```

## 사용법

1. 마이크 버튼을 클릭하여 음성 입력 시작
2. 한국어로 말하기
3. AI가 수어 문법에 맞게 문장 변환
4. 3D 아바타가 해당 수어 동작 수행

## 개발자 정보

캡스톤 프로젝트 - 한국 수어 번역 시스템