import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv'; // ★ [추가] 환경변수 관리
import cors from 'cors';
import mongoose from 'mongoose'; // ★ [추가] MongoDB 라이브러리
import { GoogleGenerativeAI } from '@google/generative-ai'; // ★ [추가] SDK 사용 권장

// 1. 환경 변수 설정 (.env 파일 로드)
dotenv.config();

// __dirname 대체 (ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────
// ★ 2. MongoDB 연결 및 스키마 정의 (새로 추가된 부분)
// ─────────────────────────────────────────────────────────────

// (1) DB 연결
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB 연결 성공!'))
    .catch((err) => console.error('🚨 MongoDB 연결 실패:', err));

// (2) 로그 모델 정의 (저장할 데이터 모양)
const LogSchema = new mongoose.Schema({
    userPrompt: { type: String, required: true },
    aiResponse: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Log = mongoose.model('Log', LogSchema);

// ─────────────────────────────────────────────────────────────
// ★ 3. API 라우트 수정
// ─────────────────────────────────────────────────────────────

// Gemini SDK 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/gemini', async (req, res) => {
    try {
        const { userInput } = req.body;
        console.log('📩 [Server] 요청 받음:', userInput);

        // (1) Gemini에게 요청 (SDK 사용이 fetch보다 간편함)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // 모델명 확인 필요
        
        const result = await model.generateContent(userInput);
        const response = await result.response;
        const text = response.text();

        // (2) JSON 파싱 (AI가 마크다운을 씌워서 줄 경우 제거)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let jsonResponse;
        
        try {
            jsonResponse = JSON.parse(cleanText);
        } catch (e) {
            console.error('JSON 파싱 실패. 원본 텍스트 반환:', cleanText);
            // 파싱 실패 시에도 에러가 나지 않도록 기본 구조 생성
            jsonResponse = { error: "Parsing Failed", rawText: cleanText };
        }

        // ★ (3) MongoDB에 저장 (비동기)
        // 사용자가 보낸 말(userInput)과 AI가 한 말(jsonResponse)을 저장
        const newLog = new Log({
            userPrompt: userInput,
            aiResponse: jsonResponse
        });

        await newLog.save();
        console.log('💾 [DB] 대화 내용 저장 완료');

        // (4) 클라이언트에 응답
        // 클라이언트(AIClient.js)가 기대하는 구조로 데이터 전송
        res.json({ 
            candidates: [
                { content: { parts: [{ text: cleanText }] } }
            ] 
        });

    } catch (error) {
        console.error('🚨 Server Error:', error);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
});

// 루트 경로 핸들링
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
});