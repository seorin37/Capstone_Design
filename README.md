# 📘 Gen3D 프로젝트 README

AI 기반 자연어 → 3D 장면 생성 프로젝트

---

# 1. 프로젝트 개요

Gen3D는 사용자가 입력한 자연어 문장을  
LLM(Gemini → 추후 GPT 지원 예정)이 해석하여  
**Three.js 기반 3D 장면으로 렌더링하는 AI 기반 시각화 플랫폼입니다.**

### 예시 명령어
- “태양계를 보여줘” → 3D Solar System Scene  
- “달을 지구 뒤에 두고 궤도를 보여줘” → 사용자 정의 Scene  
- “지구 탄생 과정을 보여줘” → 애니메이션 기반 Scene  

---

# 2. 폴더 구조

```text
text3d_project/
│
├── backend/                     # FastAPI 서버
│   ├── main.py                  # 서버 엔트리포인트
│   ├── routers/                 # prompt, scene, object API 라우터
│   ├── ai/                      # LLM(Gemini/GPT) 호출 모듈
│   ├── database/                # Mongo 연결 및 데이터 삽입 스크립트
│   ├── static/                  # OBJ / MTL / Texture 제공 경로
│   └── models/                  # SceneGraph 데이터 모델
│
├── frontend/                    # React + Three.js 기반 클라이언트
│   ├── public/                  # 정적 파일
│   │   ├── scenarios/           # 애니메이션 JS 파일들
│   │   └── static/assets/       # OBJ, MTL, 텍스처 이미지
│   ├── src/
│   │   ├── components/          # UI (ThreeCanvas, ChatPanel 등)
│   │   ├── threeEngine.ts       # Three.js 엔진
│   │   ├── AIClient.js          # 서버와 통신
│   │   └── main.tsx, App.tsx    # React 엔트리
│
├── functional_integration/      # 실험용 테스트 코드
│
├── .gitignore                   # 보안 및 Git 관리 설정
└── README.md                    # 이 문서

---
---

