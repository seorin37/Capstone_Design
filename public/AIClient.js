/**
 * public/js/AIClient.js
 */

// 1. 설정
const VALID_SCENARIOS = ["collision", "orbit", "solar_eclipse", "lunar_eclipse", "planet_birth", "sequence", "unknown"];
const VALID_TEXTURES = ["Sun", "Mercury", "Venus", "Earth", "Moon", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];

// 2. JSON 추출 (군더더기 제거)
function extractJsonBlock(text) {
  if (!text) return "";
  // ```json 같은 마크다운 제거
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  // { ... } 구간만 추출
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    return clean.substring(start, end + 1);
  }
  return clean.trim();
}

// 3. 검증기 (보정 없이 엄격하게 검사 -> 틀리면 에러 리턴)
function validateSimulationData(data) {
  // 시나리오 타입 확인
  if (!data.scenarioType) return "scenarioType 키가 누락되었습니다.";
  if (!VALID_SCENARIOS.includes(data.scenarioType)) return `알 수 없는 scenarioType: ${data.scenarioType}`;
  
  // 시퀀스 모드 검사
  if (data.scenarioType === 'sequence') {
    if (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
      return "sequence 타입은 steps 배열이 필요합니다.";
    }
    // steps 내부 재귀 검사
    for (let i = 0; i < data.steps.length; i++) {
      const stepError = validateSimulationData(data.steps[i]);
      if (stepError) return `steps[${i}]번 항목 오류: ${stepError}`;
    }
    return null; // 통과
  }

  // 단일 모드 검사
  if (!data.objects || !Array.isArray(data.objects)) return "objects 배열이 누락되었습니다.";
  
  // 텍스처 검사 (없는 건 삭제 처리)
  data.objects = data.objects.filter(obj => VALID_TEXTURES.includes(obj.textureKey));
  
  if (data.objects.length === 0 && data.scenarioType !== 'unknown') {
    return "유효한 textureKey를 가진 객체가 없습니다.";
  }

  return null; // 통과
}

// 4. 메인 함수
export async function getJsonFromAI(userInput) {
  const MAX_RETRIES = 3;
  let attempt = 0;

  // 프롬프트: 복잡한 예시 다 빼고 "스키마"만 명확히 전달
  const basePrompt = `
  사용자 요청("${userInput}")을 분석하여 3D 시뮬레이션 JSON을 반환하세요.
  
  [규칙]
  1. 마크다운 없이 순수 JSON만 반환.
  2. scenarioType 필수: "collision", "orbit", "solar_eclipse", "lunar_eclipse", "planet_birth", "sequence", "unknown"
  3. textureKey 목록: ${JSON.stringify(VALID_TEXTURES)} (이 외 절대 금지)
  
  [출력 형식 1: 단일 장면]
  { "scenarioType": "orbit", "objects": [{ "name": "Earth", "textureKey": "Earth", ... }] }

  [출력 형식 2: 연속 장면(sequence)]
  {
    "scenarioType": "sequence",
    "steps": [
      { "scenarioType": "solar_eclipse", "duration": 5000, "objects": [...] },
      { "scenarioType": "lunar_eclipse", "duration": 5000, "objects": [...] }
    ]
  }
  `;

  let currentPrompt = basePrompt;

  console.log(`[AIClient] 요청: "${userInput}"`);

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: currentPrompt })
      });

      const resData = await res.json();
      const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // JSON 파싱
      const jsonStr = extractJsonBlock(rawText);
      console.log(`[AIClient] 응답(raw):`, jsonStr.substring(0, 100) + "...");
      
      let data;
      try {
        data = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error("JSON 파싱 실패");
      }

      // 검증
      const error = validateSimulationData(data);
      if (!error) {
        console.log("[AIClient] 성공!");
        return data;
      }

      // 실패 -> 피드백 루프
      console.warn(`[AIClient] 검증 실패(${attempt}): ${error}`);
      currentPrompt = `이전 응답에 오류가 있습니다: "${error}". \n올바른 JSON 포맷으로 수정해서 다시 주세요. \n잘못된 응답: ${jsonStr}`;

    } catch (err) {
      console.error(`[AIClient] 에러(${attempt}):`, err.message);
      if (attempt === MAX_RETRIES) throw err;
    }
  }
}