/**
 * Utility for mapping OpenPose keypoints to Three.js skeleton
 * This helps create a standardized way to map between the formats
 */

// OpenPose keypoint indices for body pose
// Reference: https://github.com/CMU-Perceptual-Computing-Lab/openpose/blob/master/doc/output.md
export const OPENPOSE_KEYPOINTS = {
  // Body pose keypoints (BODY_25 format)
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
  RIGHT_HEEL: 24,
  
  // Hand keypoints indices remain the same across all 21 keypoints per hand
  // See: https://github.com/CMU-Perceptual-Computing-Lab/openpose/blob/master/doc/output.md#hand-output-format
  
  // Face keypoints use indices 0-69 for detailed face points
  // See: https://github.com/CMU-Perceptual-Computing-Lab/openpose/blob/master/doc/output.md#face-output-format
};

/**
 * Get scaling factors depending on the model type
 * @param {string} modelType - Type of model
 * @returns {Object} - Scaling factors
 */
export function getScaleFactors(modelType = 'default') {
  const scales = {
    default: {
      position: 0.01,  // Scale factor for position data
      rotation: 1.0,   // Scale factor for rotation calculations
      hand: 0.005,     // Hand-specific scale factor
      face: 0.005      // Face-specific scale factor
    },
    // Add more model types if needed
    child: {
      position: 0.008,
      rotation: 0.8,
      hand: 0.004,
      face: 0.004
    }
  };
  
  return scales[modelType] || scales.default;
}

/**
 * Map bone names to their corresponding OpenPose keypoint indices
 * @param {Array} boneNames - Array of bone names from the skeleton
 * @returns {Object} - Mapping of bone names to keypoint info
 */
export function createBoneToKeypointMap(boneNames) {
  const mapping = {};
  
  // Helper function to find bone names matching patterns
  const matchBoneName = (name, patterns) => {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    return patterns.some(pattern => lowerName.includes(pattern.toLowerCase()));
  };
  
  boneNames.forEach(boneName => {
    const OP = OPENPOSE_KEYPOINTS;
    
    // ===== RIGHT ARM CHAIN =====
    if (matchBoneName(boneName, ['RightShoulder', 'Right_Shoulder', 'R_Shoulder', 'shoulderR', 'right.shoulder'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.NECK, 
        to: OP.RIGHT_SHOULDER,
        influence: 1.0
      };
    }
    else if (matchBoneName(boneName, ['RightArm', 'Right_Arm', 'R_Arm', 'armR', 'right.arm', 'rightUpArm', 'rightupperarm']) && 
             !matchBoneName(boneName, ['ForeArm', 'Fore'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.RIGHT_SHOULDER, 
        to: OP.RIGHT_ELBOW,
        influence: 1.0
      };
    }
    else if (matchBoneName(boneName, ['RightForeArm', 'Right_ForeArm', 'R_ForeArm', 'foreArmR', 'RightElbow', 'right.forearm', 'rightLowArm', 'rightlowerarm'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.RIGHT_ELBOW, 
        to: OP.RIGHT_WRIST,
        influence: 1.0
      };
    }
    else if (matchBoneName(boneName, ['RightHand', 'Right_Hand', 'R_Hand', 'handR', 'right.hand', 'rightHand']) && 
             !matchBoneName(boneName, ['finger', 'thumb', 'index', 'middle', 'ring', 'pinky'])) {
      mapping[boneName] = { 
        type: 'rightHand', 
        from: 0, // Wrist in hand keypoints 
        to: 9,   // Middle finger base
        influence: 1.2  // Increased influence for hands
      };
    }
    
    // ===== LEFT ARM CHAIN =====
    else if (matchBoneName(boneName, ['LeftShoulder', 'Left_Shoulder', 'L_Shoulder', 'shoulderL', 'left.shoulder'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.NECK, 
        to: OP.LEFT_SHOULDER,
        influence: 1.0
      };
    }
    else if (matchBoneName(boneName, ['LeftArm', 'Left_Arm', 'L_Arm', 'armL', 'left.arm', 'leftUpArm', 'leftupperarm']) && 
             !matchBoneName(boneName, ['ForeArm', 'Fore'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.LEFT_SHOULDER, 
        to: OP.LEFT_ELBOW,
        influence: 1.0
      };
    }
    else if (matchBoneName(boneName, ['LeftForeArm', 'Left_ForeArm', 'L_ForeArm', 'foreArmL', 'LeftElbow', 'left.forearm', 'leftLowArm', 'leftlowerarm'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.LEFT_ELBOW, 
        to: OP.LEFT_WRIST,
        influence: 1.0
      };
    }
    else if (matchBoneName(boneName, ['LeftHand', 'Left_Hand', 'L_Hand', 'handL', 'left.hand', 'leftHand']) && 
             !matchBoneName(boneName, ['finger', 'thumb', 'index', 'middle', 'ring', 'pinky'])) {
      mapping[boneName] = { 
        type: 'leftHand', 
        from: 0, // Wrist 
        to: 9,   // Middle finger base
        influence: 1.2  // Increased influence for hands
      };
    }
    
    // ===== FINGER BONES =====
    else if (matchBoneName(boneName, ['finger', 'thumb', 'index', 'middle', 'ring', 'pinky'])) {
      // Determine if it's left or right hand
      let handType = 'leftHand';
      let startIndex = 0; // Wrist as default
      
      if (matchBoneName(boneName, ['Right', 'R_', 'right', '_R'])) {
        handType = 'rightHand';
      }
      
      // Different finger indices based on OpenPose hand keypoint format
      if (matchBoneName(boneName, ['thumb'])) startIndex = 1;
      else if (matchBoneName(boneName, ['index'])) startIndex = 5;
      else if (matchBoneName(boneName, ['middle'])) startIndex = 9;
      else if (matchBoneName(boneName, ['ring'])) startIndex = 13;
      else if (matchBoneName(boneName, ['pinky', 'little'])) startIndex = 17;
      
      // Determine if it's the base, middle, or tip segment
      let childIndex = startIndex + 1;
      if (matchBoneName(boneName, ['mid', 'middle']) && !matchBoneName(boneName, ['finger'])) {
        startIndex += 1;
        childIndex = startIndex + 1;
      } else if (matchBoneName(boneName, ['tip', 'end', 'distal'])) {
        startIndex += 2;
        childIndex = startIndex + 1;
      }
      
      // Only add mapping if childIndex is valid (within hand keypoint range)
      if (childIndex < 21) {
        mapping[boneName] = {
          type: handType,
          from: startIndex,
          to: childIndex,
          influence: 1.5  // Higher influence for fingers
        };
      }
    }
    
    // ===== SPINE AND HEAD =====
    else if (matchBoneName(boneName, ['Spine', 'spine']) && !matchBoneName(boneName, ['Spine1', 'Spine2'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.MID_HIP, 
        to: OP.NECK,
        influence: 0.5  // Reduced influence for spine
      };
    }
    else if (matchBoneName(boneName, ['Spine1', 'spine1', 'SpineMiddle'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.MID_HIP, 
        to: OP.NECK,
        influence: 0.3
      };
    }
    else if (matchBoneName(boneName, ['Neck', 'neck'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.NECK, 
        to: OP.NOSE,
        influence: 0.8
      };
    }
    else if (matchBoneName(boneName, ['Head', 'head'])) {
      mapping[boneName] = { 
        type: 'pose', 
        from: OP.NOSE, 
        to: OP.LEFT_EYE,  // Using left eye as reference
        influence: 0.7
      };
    }
  });
  
  return mapping;
}