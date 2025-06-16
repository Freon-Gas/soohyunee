// Gemini API를 사용한 한국어 -> 수어 문법 변환

// 간단한 fallback 변환 (Gemini API 실패시 사용)
export function simpleSignLanguageConversion(text) {
  console.log('🔄 Simple fallback conversion for:', text);
  
  // 기본 전처리
  let cleanText = text.trim();
  
  // 높임말 제거
  cleanText = cleanText
    .replace(/습니다/g, '다')
    .replace(/세요/g, '다')
    .replace(/어요/g, '다')
    .replace(/아요/g, '다')
    .replace(/에요/g, '다')
    .replace(/예요/g, '다')
    .replace(/ㅂ니다/g, '다')
    .replace(/요$/g, '')
    .replace(/[.,!?]/g, '');
  
  // 조사 제거
  cleanText = cleanText
    .replace(/은\/는/g, '')
    .replace(/이\/가/g, '')
    .replace(/을\/를/g, '')
    .replace(/에서/g, '')
    .replace(/에게/g, '')
    .replace(/한테/g, '')
    .replace(/로/g, '')
    .replace(/으로/g, '')
    .replace(/와/g, '')
    .replace(/과/g, '')
    .replace(/의/g, '')
    .replace(/도/g, '');
  
  // 일반적인 변환
  const conversions = {
    '안녕하세요': '안녕하세요',
    '안녕': '안녕하세요',
    '고맙습니다': '감사',
    '고마워요': '감사', 
    '감사합니다': '감사',
    '죄송합니다': '미안',
    '미안해요': '미안',
    '나는': '나',
    '너는': '너',
    '저는': '나',
    '당신은': '너'
  };
  
  // 변환 적용
  Object.keys(conversions).forEach(key => {
    cleanText = cleanText.replace(new RegExp(key, 'g'), conversions[key]);
  });
  
  // 단어 분리
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  
  console.log('📝 Converted words:', words);
  
  return {
    originalText: text,
    signGrammar: words.join(' '),
    wordSequence: words
  };
}

// 고급 수어 문법 변환 (Gemini API 기반)
export async function convertToSignLanguageGrammar(text) {
  console.log('🤖 Advanced sign language conversion for:', text);
  
  try {
    // Gemini API를 사용한 수어 문법 변환
    const geminiResult = await callGeminiForSignLanguageConversion(text);
    
    if (geminiResult && geminiResult.wordSequence && geminiResult.wordSequence.length > 0) {
      console.log('✅ Gemini API conversion successful:', geminiResult);
      
      return {
        originalText: text,
        signGrammar: geminiResult.signGrammar,
        wordSequence: geminiResult.wordSequence,
        confidence: geminiResult.confidence || 0.9
      };
    } else {
      throw new Error('Gemini API returned invalid result');
    }
    
  } catch (error) {
    console.error('❌ Gemini API conversion failed:', error);
    console.log('🔄 Falling back to simple conversion');
    
    // 실패시 기본 변환 사용
    const result = simpleSignLanguageConversion(text);
    console.log('📝 Fallback conversion result:', result);
    
    return {
      originalText: text,
      signGrammar: result.signGrammar,
      wordSequence: result.wordSequence,
      confidence: 0.6
    };
  }
}

// Gemini API 호출 함수
async function callGeminiForSignLanguageConversion(text) {
  console.log('🌟 Calling Gemini API for sign language conversion:', text);
  
  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!API_KEY) {
    console.error('❌ Gemini API key not found in environment variables');
    throw new Error('Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY in your .env file');
  }
  
  const prompt = `
당신은 한국 수어 전문가입니다. 주어진 한국어 문장을 한국 수어 문법에 맞게 변환해주세요.

한국 수어 문법 규칙:
1. 어순: 주어 + 목적어 + 동사 (SOV)
2. 시제 표현: 시간 부사를 문장 앞에
3. 의문문: 의문사를 문장 끝에
4. 부정문: 부정 표현을 동사 뒤에
5. 높임말 제거: 수어에서는 높임말을 사용하지 않음 (합니다 → 하다)
6. 조사 생략: '은/는', '이/가', '을/를' 등 조사 완전 제거
7. 어미 정리: 동사는 '-다' 형태로 통일
8. 복잡한 어미 단순화: -습니다, -세요, -어요 등을 기본형으로

변환할 문장: "${text}"

반드시 다음 JSON 형식으로만 응답해주세요 (다른 텍스트나 마크다운 없이 순수 JSON만):
{
  "originalText": "${text}",
  "signGrammar": "수어 문법으로 변환된 문장",
  "wordSequence": ["변환된", "단어들", "배열"],
  "confidence": 0.95
}

변환 예시:
입력: "나는 사과를 먹습니다" → 출력: {"originalText": "나는 사과를 먹습니다", "signGrammar": "나 사과 먹다", "wordSequence": ["나", "사과", "먹다"], "confidence": 0.95}
입력: "오늘 학교에 갔어요" → 출력: {"originalText": "오늘 학교에 갔어요", "signGrammar": "오늘 학교 가다", "wordSequence": ["오늘", "학교", "가다"], "confidence": 0.95}
입력: "안녕하세요" → 출력: {"originalText": "안녕하세요", "signGrammar": "안녕하세요", "wordSequence": ["안녕하세요"], "confidence": 0.95}

중요: 마크다운 코드 블록(\`\`\`), 설명, 기타 텍스트 없이 JSON 객체만 응답하세요.`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
          topP: 0.8,
          topK: 10
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('🌟 Gemini API raw response:', data);
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      const responseText = data.candidates[0].content.parts[0].text;
      console.log('📝 Gemini response text:', responseText);
      
      // JSON 파싱 시도
      try {
        // 마크다운 코드 블록 제거 및 JSON 추출
        let jsonText = responseText.trim();
        
        // ```json 또는 ``` 블록 제거
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // 앞뒤 공백 제거
        jsonText = jsonText.trim();
        
        // JSON 객체만 추출 (첫 번째 { 부터 마지막 } 까지)
        const startIndex = jsonText.indexOf('{');
        const endIndex = jsonText.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonText = jsonText.substring(startIndex, endIndex + 1);
        }
        
        console.log('🔄 Cleaned JSON text:', jsonText);
        
        const parsedResult = JSON.parse(jsonText);
        console.log('✅ Parsed Gemini result:', parsedResult);
        
        // 결과 검증
        if (parsedResult.wordSequence && Array.isArray(parsedResult.wordSequence) && parsedResult.wordSequence.length > 0) {
          return parsedResult;
        } else {
          throw new Error('Invalid response format from Gemini - missing or empty wordSequence');
        }
        
      } catch (parseError) {
        console.error('❌ Failed to parse Gemini JSON response:', parseError);
        console.log('📄 Raw response text:', responseText);
        
        // 간단한 파싱 시도 (JSON이 아닌 경우)
        const words = responseText
          .replace(/[{}\\[\\]"]/g, '') // JSON 문자 제거
          .split(/[,\\s]+/) // 쉼표나 공백으로 분리
          .filter(word => word.length > 0 && !word.includes('JSON') && !word.includes('originalText'))
          .slice(0, 10); // 최대 10개 단어만
        
        if (words.length > 0) {
          return {
            originalText: text,
            signGrammar: words.join(' '),
            wordSequence: words,
            confidence: 0.7,
            explanation: 'Parsed from non-JSON response'
          };
        }
        
        throw parseError;
      }
    } else {
      throw new Error('Invalid response structure from Gemini API');
    }
    
  } catch (error) {
    console.error('❌ Gemini API call failed:', error);
    throw error;
  }
}
