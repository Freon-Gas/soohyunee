// 전체 단어 시퀀스를 미리 로딩하는 유틸리티

let wordPatternsCache = null;

/**
 * 전체 단어 시퀀스를 미리 로딩
 * @param {Array<string>} wordSequence - 로딩할 단어들의 배열
 * @param {Function} onProgress - 진행상황 콜백 (optional)
 * @returns {Promise<Object>} - 단어별 애니메이션 데이터가 담긴 객체
 */
export const preloadWordSequence = async (wordSequence, onProgress) => {
  console.log('🚀 Starting preload for word sequence:', wordSequence);
  
  const preloadedData = {};
  const totalWords = wordSequence.length;
  let loadedWords = 0;
  
  // 진행상황 콜백 함수
  const updateProgress = (word, isSuccess) => {
    loadedWords++;
    const progress = Math.round((loadedWords / totalWords) * 100);
    console.log(`📊 Preload progress: ${progress}% (${loadedWords}/${totalWords}) - ${word}: ${isSuccess ? '✅' : '❌'}`);
    
    // 외부 콜백이 있으면 호출
    if (onProgress) {
      onProgress({
        loaded: loadedWords,
        total: totalWords,
        current: word,
        success: isSuccess,
        progress: progress
      });
    }
  };

  // 모든 단어에 대해 병렬 로딩
  const loadPromises = wordSequence.map(async (word) => {
    try {
      const frames = await loadKeypointsForWord(word);
      preloadedData[word] = frames;
      updateProgress(word, true);
      return { word, success: true, frames: frames.length };
    } catch (error) {
      console.error(`❌ Failed to preload "${word}":`, error);
      preloadedData[word] = null; // 실패한 경우 null로 표시
      updateProgress(word, false);
      return { word, success: false, error: error.message };
    }
  });

  // 모든 로딩 완료 대기
  const results = await Promise.all(loadPromises);
  
  // 결과 요약
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`🎯 Preload completed: ${successCount} success, ${failureCount} failures`);
  
  if (successCount > 0) {
    const totalFrames = Object.values(preloadedData)
      .filter(frames => frames !== null)
      .reduce((sum, frames) => sum + frames.length, 0);
    console.log(`📊 Total frames loaded: ${totalFrames}`);
  }

  return {
    data: preloadedData,
    summary: {
      total: totalWords,
      success: successCount,
      failure: failureCount,
      results: results
    }
  };
};

/**
 * 단일 단어의 키포인트 데이터 로딩 (기존 함수와 동일)
 */
export const loadKeypointsForWord = async (word) => {
  try {
    // Load the index file (once)
    if (!wordPatternsCache) {
      const response = await fetch('/data/word-patterns.json');
      if (!response.ok) {
        throw new Error('Word patterns index not found. Run: node generate-word-index.js');
      }
      const indexData = await response.json();
      wordPatternsCache = indexData.patterns || indexData;
    }
    
    // Look up the pattern for this word
    const wordInfo = wordPatternsCache[word];
    if (!wordInfo) {
      throw new Error(`Word "${word}" not found in patterns index`);
    }
    
    const pattern = wordInfo.pattern;
    
    // Load all files with this pattern
    const frames = await loadAllFilesWithPattern(word, pattern);
    
    if (frames.length === 0) {
      throw new Error(`No valid frames loaded for "${word}"`);
    }
    
    return frames;

  } catch (error) {
    console.error(`❌ Error loading keypoints for "${word}":`, error);
    throw error;
  }
};

/**
 * 패턴에 맞는 모든 파일 로딩
 */
const loadAllFilesWithPattern = async (word, pattern) => {
  const frames = [];
  let fileIndex = 1;
  let consecutiveErrors = 0;
  const maxErrors = 15;
  const maxFiles = 1000;
  
  const dataFolder = pattern === 'frame_' ? 'sentences' : 'signs';
  
  while (consecutiveErrors < maxErrors && fileIndex < maxFiles) {
    let filename;
    
    if (pattern === 'frame_') {
      const frameNumber = String(fileIndex).padStart(3, '0');
      filename = `frame_${frameNumber}.json`;
    } else {
      const frameNumber = String(fileIndex - 1).padStart(12, '0');
      filename = `${pattern}${frameNumber}_keypoints.json`;
    }
    
    try {
      const response = await fetch(`/data/${dataFolder}/${word}/${filename}`);
      
      if (response.ok) {
        const data = await response.json();
        const processedFrame = processOpenPoseFrame(data);
        
        if (hasValidKeypoints(processedFrame)) {
          frames.push(processedFrame);
        }
        
        consecutiveErrors = 0;
      } else {
        consecutiveErrors++;
      }
    } catch (error) {
      consecutiveErrors++;
    }
    
    fileIndex++;
  }
  
  return frames;
};

/**
 * 유효한 키포인트 확인
 */
const hasValidKeypoints = (frame) => {
  const hasValidPoints = (points) => {
    return points && points.some(point => point.confidence > 0.2);
  };
  
  return hasValidPoints(frame.pose) || 
         hasValidPoints(frame.leftHand) || 
         hasValidPoints(frame.rightHand) || 
         hasValidPoints(frame.face);
};

/**
 * OpenPose 프레임 데이터 처리
 */
const processOpenPoseFrame = (data) => {
  const processed = {
    pose: [],
    leftHand: [],
    rightHand: [],
    face: []
  };

  try {
    let person = null;

    if (data.people) {
      person = Array.isArray(data.people) ? data.people[0] : data.people;
    } else {
      person = data;
    }

    if (!person) return processed;

    // Extract keypoints
    if (person.pose_keypoints_3d) {
      processed.pose = extractKeypoints(person.pose_keypoints_3d, 4, true);
    } else if (person.pose_keypoints_2d) {
      processed.pose = extractKeypoints(person.pose_keypoints_2d, 3, false);
    }

    if (person.hand_left_keypoints_3d) {
      processed.leftHand = extractKeypoints(person.hand_left_keypoints_3d, 4, true);
    } else if (person.hand_left_keypoints_2d) {
      processed.leftHand = extractKeypoints(person.hand_left_keypoints_2d, 3, false);
    }

    if (person.hand_right_keypoints_3d) {
      processed.rightHand = extractKeypoints(person.hand_right_keypoints_3d, 4, true);
    } else if (person.hand_right_keypoints_2d) {
      processed.rightHand = extractKeypoints(person.hand_right_keypoints_2d, 3, false);
    }

    if (person.face_keypoints_3d) {
      processed.face = extractKeypoints(person.face_keypoints_3d, 4, true);
    } else if (person.face_keypoints_2d) {
      processed.face = extractKeypoints(person.face_keypoints_2d, 3, false);
    }

  } catch (error) {
    console.error('Error processing frame:', error);
  }

  return processed;
};

/**
 * 플랫 배열에서 키포인트 추출
 */
const extractKeypoints = (flatArray, stride, is3D) => {
  if (!flatArray || !Array.isArray(flatArray)) return [];

  const points = [];
  const confidenceThreshold = 0.2;

  for (let i = 0; i < flatArray.length; i += stride) {
    if (i + (stride - 1) >= flatArray.length) break;

    const confidence = flatArray[i + (stride - 1)];

    if (confidence > confidenceThreshold) {
      if (is3D) {
        points.push({
          x: flatArray[i] * 1.0,
          y: -flatArray[i + 1] * 1.0,
          z: -flatArray[i + 2] * 1.0,
          confidence: confidence
        });
      } else {
        const x = ((flatArray[i] - 960) / 960);
        const y = -(((flatArray[i + 1] - 540) / 540));
        points.push({
          x: x,
          y: y,
          z: 0,
          confidence: confidence
        });
      }
    } else {
      points.push({ x: 0, y: 0, z: 0, confidence: 0 });
    }
  }

  return points;
};

export default { preloadWordSequence, loadKeypointsForWord };
