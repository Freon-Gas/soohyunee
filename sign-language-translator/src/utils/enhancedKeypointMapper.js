/**
 * Enhanced keypointMapper for better 3D model animation with OpenPose data
 * This provides mapping between OpenPose keypoints and 3D model bones
 */

// OpenPose keypoint indices for body pose (BODY_25 format)
export const OPENPOSE_KEYPOINTS = {
  NOSE: 0,
  NECK: 1,
  RIGHT_SHOULDER: 2,
  RIGHT_ELBOW: 3,
  RIGHT_WRIST: 4,
  LEFT_SHOULDER: 5,
  LEFT_ELBOW: 6,
  LEFT_WRIST: 7,
  MID_HIP: 8,
  RIGHT_HIP: 9,
  RIGHT_KNEE: 10,
  RIGHT_ANKLE: 11,
  LEFT_HIP: 12,
  LEFT_KNEE: 13,
  LEFT_ANKLE: 14,
  RIGHT_EYE: 15,
  LEFT_EYE: 16,
  RIGHT_EAR: 17,
  LEFT_EAR: 18,
  LEFT_BIG_TOE: 19, 
  LEFT_SMALL_TOE: 20,
  LEFT_HEEL: 21,
  RIGHT_BIG_TOE: 22,
  RIGHT_SMALL_TOE: 23,
  RIGHT_HEEL: 24
};

// Hand keypoint structure (21 keypoints per hand)
// 0: Wrist
// 1-4: Thumb (base to tip)
// 5-8: Index finger (base to tip)
// 9-12: Middle finger (base to tip)
// 13-16: Ring finger (base to tip)
// 17-20: Pinky finger (base to tip)

/**
 * Helper to get a bone by name or close match
 * @param {Array} bones - Array of bones from THREE.Skeleton
 * @param {string} namePattern - Name pattern to search for
 * @returns {Object|null} - The found bone or null
 */
export function findBoneByName(bones, namePattern) {
  if (!bones || !namePattern) return null;
  
  // Convert pattern to lowercase for case insensitive search
  const pattern = namePattern.toLowerCase();
  
  // Try exact match first
  let bone = bones.find(b => b.name.toLowerCase() === pattern);
  
  // If not found, try partial match
  if (!bone) {
    bone = bones.find(b => b.name.toLowerCase().includes(pattern));
  }
  
  return bone || null;
}

/**
 * Create a comprehensive mapping between model bones and OpenPose keypoints
 * This is crucial for accurate animation
 * @param {Array} bones - The bones from the model's skeleton
 * @returns {Object} - The mapping with information about each bone
 */
export function createEnhancedBoneMapping(bones) {
  const mapping = {};
  const OP = OPENPOSE_KEYPOINTS;
  
  // Helper to map specific bone names to keypoint connections
  function mapBone(bone, keypoints, direction, influence = 1.0) {
    if (bone) {
      mapping[bone.name] = {
        from: keypoints[0],
        to: keypoints[1],
        direction: direction,
        influence: influence
      };
    }
  }
  
  // Main body bones
  const neck = findBoneByName(bones, 'neck');
  const head = findBoneByName(bones, 'head');
  const spine = findBoneByName(bones, 'spine');
  const spine1 = findBoneByName(bones, 'spine1');
  const spine2 = findBoneByName(bones, 'spine2');
  
  // Right arm chain
  const rightShoulder = findBoneByName(bones, 'rightshoulder');
  const rightArm = findBoneByName(bones, 'rightarm');
  const rightForeArm = findBoneByName(bones, 'rightforearm');
  const rightHand = findBoneByName(bones, 'righthand');
  
  // Left arm chain
  const leftShoulder = findBoneByName(bones, 'leftshoulder');
  const leftArm = findBoneByName(bones, 'leftarm');
  const leftForeArm = findBoneByName(bones, 'leftforearm');
  const leftHand = findBoneByName(bones, 'lefthand');
  
  // Map right arm bones
  mapBone(rightShoulder, [OP.NECK, OP.RIGHT_SHOULDER], 'horizontal');
  mapBone(rightArm, [OP.RIGHT_SHOULDER, OP.RIGHT_ELBOW], 'vertical');
  mapBone(rightForeArm, [OP.RIGHT_ELBOW, OP.RIGHT_WRIST], 'vertical');
  
  // Map left arm bones
  mapBone(leftShoulder, [OP.NECK, OP.LEFT_SHOULDER], 'horizontal');
  mapBone(leftArm, [OP.LEFT_SHOULDER, OP.LEFT_ELBOW], 'vertical');
  mapBone(leftForeArm, [OP.LEFT_ELBOW, OP.LEFT_WRIST], 'vertical');
  
  // Map head and spine
  mapBone(neck, [OP.NECK, OP.NOSE], 'vertical', 0.7);
  mapBone(head, [OP.NOSE, OP.LEFT_EYE], 'forward', 0.5);
  
  // Map spine with lower influence to prevent over-animation
  if (spine) mapBone(spine, [OP.MID_HIP, OP.NECK], 'vertical', 0.3);
  if (spine1) mapBone(spine1, [OP.MID_HIP, OP.NECK], 'vertical', 0.4);
  if (spine2) mapBone(spine2, [OP.MID_HIP, OP.NECK], 'vertical', 0.5);
  
  // Map hands for finger control
  if (rightHand) {
    mapping[rightHand.name] = {
      hand: 'right',
      keypoint: OP.RIGHT_WRIST,
      influence: 1.2
    };
  }
  
  if (leftHand) {
    mapping[leftHand.name] = {
      hand: 'left',
      keypoint: OP.LEFT_WRIST,
      influence: 1.2
    };
  }
  
  // Map finger bones if they exist
  const fingerTypes = ['thumb', 'index', 'middle', 'ring', 'pinky'];
  
  // Map all finger bones with their respective keypoint indices
  bones.forEach(bone => {
    const name = bone.name.toLowerCase();
    let handType = null;
    let fingerType = null;
    let segment = null;
    
    // Determine hand (left or right)
    if (name.includes('right')) {
      handType = 'right';
    } else if (name.includes('left')) {
      handType = 'left';
    } else {
      return; // Skip if not a hand bone
    }
    
    // Determine finger type
    for (const type of fingerTypes) {
      if (name.includes(type)) {
        fingerType = type;
        break;
      }
    }
    
    // Skip if not a finger bone
    if (!fingerType) return;
    
    // Determine segment (proximal, middle, distal)
    if (name.includes('proximal') || name.includes('base')) {
      segment = 'proximal';
    } else if (name.includes('middle') || name.includes('mid')) {
      segment = 'middle';
    } else if (name.includes('distal') || name.includes('tip')) {
      segment = 'distal';
    }
    
    // Skip if segment not determined
    if (!segment) return;
    
    // Calculate keypoint indices based on finger type and segment
    let keypointIndices;
    
    switch (fingerType) {
      case 'thumb':
        keypointIndices = [1, 2, 3, 4];
        break;
      case 'index':
        keypointIndices = [5, 6, 7, 8];
        break;
      case 'middle':
        keypointIndices = [9, 10, 11, 12];
        break;
      case 'ring':
        keypointIndices = [13, 14, 15, 16];
        break;
      case 'pinky':
        keypointIndices = [17, 18, 19, 20];
        break;
      default:
        return; // Skip if unknown finger type
    }
    
    // Map segment to keypoint indices
    let fromIndex, toIndex;
    
    switch (segment) {
      case 'proximal':
        fromIndex = keypointIndices[0];
        toIndex = keypointIndices[1];
        break;
      case 'middle':
        fromIndex = keypointIndices[1];
        toIndex = keypointIndices[2];
        break;
      case 'distal':
        fromIndex = keypointIndices[2];
        toIndex = keypointIndices[3];
        break;
      default:
        return; // Skip if unknown segment
    }
    
    // Add to mapping
    mapping[bone.name] = {
      hand: handType,
      from: fromIndex,
      to: toIndex,
      influence: 1.5 // Higher influence for fingers
    };
  });
  
  return mapping;
}

/**
 * Get scale factors for different model types
 * @param {string} modelType - Type of model (default, child, etc.)
 * @returns {Object} - Scaling factors
 */
export function getScaleFactors(modelType = 'default') {
  const factors = {
    default: {
      position: 0.01,   // General position scaling
      rotation: 1.0,    // Rotation influence
      finger: 0.005,    // Finger-specific scaling
      hand: 0.008       // Hand-specific scaling
    },
    child: {
      position: 0.008,
      rotation: 0.8,
      finger: 0.004,
      hand: 0.006
    }
  };
  
  return factors[modelType] || factors.default;
}