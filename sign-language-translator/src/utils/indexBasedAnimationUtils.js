let wordPatternsCache = null;

export const loadKeypointsForWord = async (word) => {
  
  try {
    // Load the index file (once)
    if (!wordPatternsCache) {
      const response = await fetch('/data/word-patterns.json');
      if (!response.ok) {
        throw new Error('Word patterns index not found. Run: node generate-word-index.js');
      }
      const indexData = await response.json();
      wordPatternsCache = indexData.patterns || indexData; // 패턴이 바로 루트에 있을 수도 있음
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
 * Load all files with the known pattern
 */
const loadAllFilesWithPattern = async (word, pattern) => {
  const frames = [];
  let fileIndex = 1; // frame_ 패턴은 1부터 시작
  let consecutiveErrors = 0;
  const maxErrors = 15;
  const maxFiles = 1000;
  
  // 데이터 폴더 경로 결정 (frame_ 패턴이면 sentences, 아니면 signs)
  const dataFolder = pattern === 'frame_' ? 'sentences' : 'signs';
  
  while (consecutiveErrors < maxErrors && fileIndex < maxFiles) {
    let filename;
    
    if (pattern === 'frame_') {
      // frame_ 패턴: frame_001.json, frame_002.json, ...
      const frameNumber = String(fileIndex).padStart(3, '0');
      filename = `frame_${frameNumber}.json`;
    } else {
      // 기존 패턴: NIA_SL_WORD1222_REAL09_F_000000000000_keypoints.json
      const frameNumber = String(fileIndex - 1).padStart(12, '0'); // 기존은 0부터 시작
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
        
        // Progress logging
        if ((frames.length) % 50 === 0 && frames.length > 0) {
          console.log(`📈 Loaded ${frames.length} frames for "${word}"`);
        }
      } else {
        consecutiveErrors++;
      }
    } catch (error) {
      consecutiveErrors++;
    }
    
    fileIndex++;
  }
  
  console.log(`✅ Total frames loaded for "${word}": ${frames.length}`);
  return frames;
};

/**
 * Check if frame has valid keypoints
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
 * Process OpenPose frame data
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
 * Extract keypoints from flat array
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

export default { loadKeypointsForWord };