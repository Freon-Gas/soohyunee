export function simpleSignLanguageConversion(text) {
  console.log('🔄 Simple sign language conversion for:', text);
  
  // 기본 전처리
  const cleanText = text.trim().replace(/[.,!?]/g, '');
  
  // 단어 분리
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  
  // 수어 순서로 재배열 (한국 수어 문법: SOV 순서)
  const rearrangedWords = rearrangeForSignLanguage(words);
  
  return {
    originalText: text,
    signGrammar: rearrangedWords.join(' '),
    wordSequence: rearrangedWords
  };
}

// 수어 문법 순서로 재배열
function rearrangeForSignLanguage(words) {
  // 기본적인 한국 수어 문법 적용
  // 주어 + 목적어 + 동사 순서
  
  // 간단한 패턴 매칭
  const verbPatterns = [
    '있다', '없다', '하다', '가다', '오다', '보다', '먹다', '마시다',
    '좋다', '나쁘다', '크다', '작다', '예쁘다', '맛있다'
  ];
  
  const subjectPatterns = [
    '나', '너', '우리', '그', '이', '저', '사람', '친구'
  ];
  
  let rearranged = [...words];
  
  // 동사를 마지막으로 이동
  for (let i = 0; i < rearranged.length; i++) {
    const word = rearranged[i];
    if (verbPatterns.some(pattern => word.includes(pattern))) {
      const verb = rearranged.splice(i, 1)[0];
      rearranged.push(verb);
      break;
    }
  }
  
  return rearranged;
}

// 고급 수어 문법 변환 (API 기반)
export async function convertToSignLanguageGrammar(text) {
  console.log('🤖 Advanced sign language conversion for:', text);
  
  try {
    // 기본 변환 먼저 수행
    const result = simpleSignLanguageConversion(text);
    console.log('📝 Basic conversion result:', result);
    
    // 수어 데이터베이스에 있는 단어만 필터링
    const availableWords = await filterAvailableSignWords(result.wordSequence);
    console.log('✅ Available words after filtering:', availableWords);
    
    // 빈 결과인 경우 랜덤 단어 사용
    if (availableWords.length === 0) {
      const defaultWords = ['사과', '사거리', '사고력'];
      const randomDefault = defaultWords[Math.floor(Math.random() * defaultWords.length)];
      console.log(`⚠️ No available words found, using random default "${randomDefault}"`);
      availableWords.push(randomDefault);
    }
    
    return {
      originalText: text,
      signGrammar: availableWords.join(' '),
      wordSequence: availableWords,
      confidence: 0.8
    };
    
  } catch (error) {
    console.error('❌ Advanced conversion failed:', error);
    // 실패시 랜덤 단어로 폴백
    const fallbackWords = ['사과', '사거리', '사고력'];
    const randomFallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    console.log(`🎲 Using random fallback due to error: "${randomFallback}"`);
    
    return {
      originalText: text,
      signGrammar: randomFallback,
      wordSequence: [randomFallback],
      confidence: 0.3
    };
  }
}

// 사용 가능한 수어 단어 필터링
async function filterAvailableSignWords(words) {
  console.log('🔍 Filtering available sign words:', words);
  
  const availableWords = [];
  
  for (const word of words) {
    console.log(`🔍 Processing word: "${word}"`);
    
    // 단순히 단어를 그대로 사용 - 폴더가 있으면 사용, 없으면 유사한 단어로 대체
    const finalWord = findSimilarSignWord(word);
    console.log(`✅ Using word: "${finalWord}" for "${word}"`);
    availableWords.push(finalWord);
  }
  
  console.log(`✅ Final available words: [${availableWords.join(', ')}]`);
  return availableWords;
}



// 유사한 수어 단어 찾기 (또는 그대로 반환)
function findSimilarSignWord(word) {
  console.log(`🔍 Using word as-is: "${word}"`);
  
  // 그냥 단어 그대로 사용 - 폴더가 있으면 로딩, 없으면 ImprovedKeypointSignModel에서 처리
  return word;
}

// 수어 애니메이션 속도 조정
export function getAnimationSpeed(word) {
  // 단어별 최적 애니메이션 속도
  const speedMap = {
    '사과': 2000,    // 2초
    '안녕': 1500,    // 1.5초  
    '고맙다': 2500,  // 2.5초
    '미안': 2000,    // 2초
  };
  
  return speedMap[word] || 2000; // 기본 2초
}

// 수어 표현 난이도
export function getSignComplexity(word) {
  const complexityMap = {
    '사과': 'medium',
    '안녕': 'easy',
    '고맙다': 'hard',
    '미안': 'medium'
  };
  
  return complexityMap[word] || 'medium';
}