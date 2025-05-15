/**
 * Enhanced utilities for applying OpenPose keypoint animations to Three.js skeletons
 * This implementation focuses on direct bone manipulation based on keypoint data
 */
import * as THREE from 'three';
import { OPENPOSE_KEYPOINTS } from './keypointMapper';

/**
 * Load keypoint data from OpenPose format JSON files
 * @param {string} word - Word to load keypoints for (folder name)
 * @returns {Promise<Array>} - Array of processed frames
 */
export async function loadKeypointsForWord(word) {
  if (!word) {
    throw new Error('No word provided');
  }
  
  console.log(`Loading keypoints for word: "${word}"`);
  
  // Try to load the keypoint files
  const frames = [];
  const folderName = word;
  let fileIndex = 0;
  let consecutiveErrors = 0;
  const MAX_ERRORS = 3;
  
  // Define possible filename patterns
  const patterns = [
    (idx) => `NIA_SL_WORD1501_REAL01_F_${String(idx).padStart(12, '0')}_keypoints.json`,
    (idx) => `frame_${idx}.json`,
    (idx) => `${word}_${idx}.json`
  ];
  
  // Keep trying to load frames until too many consecutive errors
  while (consecutiveErrors < MAX_ERRORS && fileIndex < 150) {
    let loaded = false;
    
    // Try each pattern
    for (const patternFn of patterns) {
      const filename = patternFn(fileIndex);
      try {
        const response = await fetch(`/data/signs/${folderName}/${filename}`);
        
        if (response.ok) {
          const data = await response.json();
          const processedFrame = processOpenPoseFrame(data);
          frames.push(processedFrame);
          loaded = true;
          console.log(`Loaded frame ${fileIndex} using pattern: ${filename}`);
          break;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
    
    if (!loaded) {
      consecutiveErrors++;
      console.log(`No frame file found at index ${fileIndex}, error count: ${consecutiveErrors}`);
    } else {
      consecutiveErrors = 0; // Reset on success
    }
    
    fileIndex++;
  }
  
  if (frames.length === 0) {
    throw new Error(`No keypoint files found for sign: ${word}`);
  }
  
  console.log(`Loaded ${frames.length} frames for '${word}'`);
  return frames;
}

/**
 * Process OpenPose format keypoint data into a standardized structure
 * @param {Object} data - OpenPose format data
 * @returns {Object} - Processed keypoint frame
 */
function processOpenPoseFrame(data) {
  // Create a default empty frame
  const defaultFrame = {
    pose: Array(25).fill().map(() => [0, 0, 0]),
    leftHand: Array(21).fill().map(() => [0, 0, 0]),
    rightHand: Array(21).fill().map(() => [0, 0, 0]),
    face: Array(70).fill().map(() => [0, 0, 0])
  };
  
  try {
    if (!data) {
      console.warn('No data provided to processOpenPoseFrame');
      return defaultFrame;
    }
    
    const processed = { ...defaultFrame };
    
    // Handle standard OpenPose format
    if (data.people) {
      let person = data.people;
      
      // Handle both array format and direct object format
      if (Array.isArray(data.people) && data.people.length > 0) {
        person = data.people[0];
      } else if (Array.isArray(data.people) && data.people.length === 0) {
        console.warn('No people detected in OpenPose data');
        return defaultFrame;
      }
      
      // Process keypoints
      if (person.pose_keypoints_2d) {
        processed.pose = extractKeypoints(person.pose_keypoints_2d, true);
      }
      
      if (person.hand_left_keypoints_2d) {
        processed.leftHand = extractKeypoints(person.hand_left_keypoints_2d, true);
      }
      
      if (person.hand_right_keypoints_2d) {
        processed.rightHand = extractKeypoints(person.hand_right_keypoints_2d, true);
      }
      
      if (person.face_keypoints_2d) {
        processed.face = extractKeypoints(person.face_keypoints_2d, true);
      }
      
      // If 3D data is available, use that instead
      if (person.pose_keypoints_3d) {
        processed.pose = extractKeypoints(person.pose_keypoints_3d, false);
      }
      
      if (person.hand_left_keypoints_3d) {
        processed.leftHand = extractKeypoints(person.hand_left_keypoints_3d, false);
      }
      
      if (person.hand_right_keypoints_3d) {
        processed.rightHand = extractKeypoints(person.hand_right_keypoints_3d, false);
      }
      
      if (person.face_keypoints_3d) {
        processed.face = extractKeypoints(person.face_keypoints_3d, false);
      }
    }
    
    return processed;
  } catch (error) {
    console.error('Error in processOpenPoseFrame:', error);
    return defaultFrame;
  }
}

/**
 * Extract points from flat array format used by OpenPose
 * @param {Array} flatArray - Flat array of coordinates
 * @param {boolean} is2D - Whether the data is 2D (if true) or 3D
 * @returns {Array} - Array of 3D points
 */
function extractKeypoints(flatArray, is2D = true) {
  if (!flatArray || !Array.isArray(flatArray)) {
    return [];
  }
  
  const points = [];
  const stride = is2D ? 3 : 4; // x,y,c for 2D or x,y,z,c for 3D
  
  for (let i = 0; i < flatArray.length; i += stride) {
    try {
      if (is2D) {
        // For 2D data, add 0 for z-coordinate
        if (i + 1 < flatArray.length) {
          points.push([
            Number(flatArray[i]) || 0,
            Number(flatArray[i + 1]) || 0,
            0
          ]);
        }
      } else {
        // For 3D data, use the provided z-coordinate
        if (i + 2 < flatArray.length) {
          points.push([
            Number(flatArray[i]) || 0,
            Number(flatArray[i + 1]) || 0,
            Number(flatArray[i + 2]) || 0
          ]);
        }
      }
    } catch (error) {
      points.push([0, 0, 0]);
    }
  }
  
  return points;
}

/**
 * Apply a keypoint frame directly to the model's skeleton
 * This is the main improved function that ensures accurate bone positioning
 * @param {Object} frame - Current keypoint frame
 * @param {THREE.Skeleton} skeleton - Model's skeleton
 * @param {Object} options - Options for animation
 */
export function applyKeypointDirectlyToSkeleton(frame, skeleton, options = {}) {
  if (!frame || !skeleton) return;
  
  const { 
    debug = false,
    scaleFactor = 0.01,
    rotationInfluence = 1.0
  } = options;
  
  // Get all bones in the skeleton for easier reference
  const bones = skeleton.bones;
  
  // Find bones by name pattern
  const findBonesByPattern = (pattern) => {
    return bones.filter(bone => 
      bone.name.toLowerCase().includes(pattern.toLowerCase())
    );
  };
  
  // Get the key bones we need to manipulate
  const rightShoulderBones = findBonesByPattern('rightShoulder');
  const leftShoulderBones = findBonesByPattern('leftShoulder');
  const rightArmBones = findBonesByPattern('rightArm');
  const leftArmBones = findBonesByPattern('leftArm');
  const rightForearmBones = findBonesByPattern('rightForeArm');
  const leftForearmBones = findBonesByPattern('leftForeArm');
  const rightHandBones = findBonesByPattern('rightHand');
  const leftHandBones = findBonesByPattern('leftHand');
  const spineAndNeckBones = [
    ...findBonesByPattern('spine'),
    ...findBonesByPattern('neck')
  ];
  const headBones = findBonesByPattern('head');
  
  // Apply pose keypoints to bones
  if (frame.pose && frame.pose.length >= 25) {
    const OP = OPENPOSE_KEYPOINTS;
    
    // Store the original positions of key keypoints for calculations
    const keypointPositions = {};
    
    // Extract key keypoint positions
    [OP.NOSE, OP.NECK, OP.RIGHT_SHOULDER, OP.RIGHT_ELBOW, OP.RIGHT_WRIST,
     OP.LEFT_SHOULDER, OP.LEFT_ELBOW, OP.LEFT_WRIST, OP.MID_HIP]
    .forEach(idx => {
      if (frame.pose[idx]) {
        keypointPositions[idx] = new THREE.Vector3(
          frame.pose[idx][0] * scaleFactor,
          frame.pose[idx][1] * scaleFactor,
          frame.pose[idx][2] * scaleFactor
        );
      }
    });
    
    // --- Right Arm Chain ---
    
    // Right Shoulder
    if (rightShoulderBones.length > 0 && 
        keypointPositions[OP.NECK] && 
        keypointPositions[OP.RIGHT_SHOULDER]) {
      
      const shoulderBone = rightShoulderBones[0];
      const neckPos = keypointPositions[OP.NECK];
      const shoulderPos = keypointPositions[OP.RIGHT_SHOULDER];
      
      // Calculate direction from neck to shoulder
      const dirVector = new THREE.Vector3().subVectors(shoulderPos, neckPos).normalize();
      
      // Create rotation quaternion
      const targetQuaternion = alignBoneToVector(dirVector, shoulderBone, 'side');
      
      // Apply rotation
      applyRotation(shoulderBone, targetQuaternion, rotationInfluence);
      
      if (debug) {
        console.log('Applied right shoulder rotation', dirVector);
      }
    }
    
    // Right Upper Arm
    if (rightArmBones.length > 0 && 
        keypointPositions[OP.RIGHT_SHOULDER] && 
        keypointPositions[OP.RIGHT_ELBOW]) {
      
      const armBone = rightArmBones[0];
      const shoulderPos = keypointPositions[OP.RIGHT_SHOULDER];
      const elbowPos = keypointPositions[OP.RIGHT_ELBOW];
      
      // Calculate direction from shoulder to elbow
      const dirVector = new THREE.Vector3().subVectors(elbowPos, shoulderPos).normalize();
      
      // Create rotation quaternion
      const targetQuaternion = alignBoneToVector(dirVector, armBone, 'front');
      
      // Apply rotation
      applyRotation(armBone, targetQuaternion, rotationInfluence);
      
      if (debug) {
        console.log('Applied right upper arm rotation', dirVector);
      }
    }
    
    // Right Forearm
    if (rightForearmBones.length > 0 && 
        keypointPositions[OP.RIGHT_ELBOW] && 
        keypointPositions[OP.RIGHT_WRIST]) {
      
      const forearmBone = rightForearmBones[0];
      const elbowPos = keypointPositions[OP.RIGHT_ELBOW];
      const wristPos = keypointPositions[OP.RIGHT_WRIST];
      
      // Calculate direction from elbow to wrist
      const dirVector = new THREE.Vector3().subVectors(wristPos, elbowPos).normalize();
      
      // Create rotation quaternion
      const targetQuaternion = alignBoneToVector(dirVector, forearmBone, 'front');
      
      // Apply rotation
      applyRotation(forearmBone, targetQuaternion, rotationInfluence);
      
      if (debug) {
        console.log('Applied right forearm rotation', dirVector);
      }
    }
    
    // --- Left Arm Chain ---
    
    // Left Shoulder
    if (leftShoulderBones.length > 0 && 
        keypointPositions[OP.NECK] && 
        keypointPositions[OP.LEFT_SHOULDER]) {
      
      const shoulderBone = leftShoulderBones[0];
      const neckPos = keypointPositions[OP.NECK];
      const shoulderPos = keypointPositions[OP.LEFT_SHOULDER];
      
      // Calculate direction from neck to shoulder
      const dirVector = new THREE.Vector3().subVectors(shoulderPos, neckPos).normalize();
      
      // Create rotation quaternion
      const targetQuaternion = alignBoneToVector(dirVector, shoulderBone, 'side');
      
      // Apply rotation
      applyRotation(shoulderBone, targetQuaternion, rotationInfluence);
      
      if (debug) {
        console.log('Applied left shoulder rotation', dirVector);
      }
    }
    
    // Left Upper Arm
    if (leftArmBones.length > 0 && 
        keypointPositions[OP.LEFT_SHOULDER] && 
        keypointPositions[OP.LEFT_ELBOW]) {
      
      const armBone = leftArmBones[0];
      const shoulderPos = keypointPositions[OP.LEFT_SHOULDER];
      const elbowPos = keypointPositions[OP.LEFT_ELBOW];
      
      // Calculate direction from shoulder to elbow
      const dirVector = new THREE.Vector3().subVectors(elbowPos, shoulderPos).normalize();
      
      // Create rotation quaternion
      const targetQuaternion = alignBoneToVector(dirVector, armBone, 'front');
      
      // Apply rotation
      applyRotation(armBone, targetQuaternion, rotationInfluence);
      
      if (debug) {
        console.log('Applied left upper arm rotation', dirVector);
      }
    }
    
    // Left Forearm
    if (leftForearmBones.length > 0 && 
        keypointPositions[OP.LEFT_ELBOW] && 
        keypointPositions[OP.LEFT_WRIST]) {
      
      const forearmBone = leftForearmBones[0];
      const elbowPos = keypointPositions[OP.LEFT_ELBOW];
      const wristPos = keypointPositions[OP.LEFT_WRIST];
      
      // Calculate direction from elbow to wrist
      const dirVector = new THREE.Vector3().subVectors(wristPos, elbowPos).normalize();
      
      // Create rotation quaternion
      const targetQuaternion = alignBoneToVector(dirVector, forearmBone, 'front');
      
      // Apply rotation
      applyRotation(forearmBone, targetQuaternion, rotationInfluence);
      
      if (debug) {
        console.log('Applied left forearm rotation', dirVector);
      }
    }
    
    // --- Spine and Neck ---
    
    if (spineAndNeckBones.length > 0 && 
        keypointPositions[OP.MID_HIP] && 
        keypointPositions[OP.NECK]) {
      
      // Apply to all spine bones for smoother motion
      spineAndNeckBones.forEach((spineBone, index) => {
        const hipPos = keypointPositions[OP.MID_HIP];
        const neckPos = keypointPositions[OP.NECK];
        
        // Calculate direction from hip to neck
        const dirVector = new THREE.Vector3().subVectors(neckPos, hipPos).normalize();
        
        // Create rotation quaternion
        const targetQuaternion = alignBoneToVector(dirVector, spineBone, 'up');
        
        // Reduce influence for spine to prevent over-bending
        const spineInfluence = 0.3 + (index / spineAndNeckBones.length) * 0.3;
        
        // Apply rotation
        applyRotation(spineBone, targetQuaternion, spineInfluence);
      });
    }
    
    // --- Head ---
    
    if (headBones.length > 0 && 
        keypointPositions[OP.NECK] && 
        keypointPositions[OP.NOSE]) {
      
      const headBone = headBones[0];
      const neckPos = keypointPositions[OP.NECK];
      const nosePos = keypointPositions[OP.NOSE];
      
      // Calculate direction from neck to nose
      const dirVector = new THREE.Vector3().subVectors(nosePos, neckPos).normalize();
      
      // Create rotation quaternion
      const targetQuaternion = alignBoneToVector(dirVector, headBone, 'front');
      
      // Apply rotation
      applyRotation(headBone, targetQuaternion, 0.7);
      
      if (debug) {
        console.log('Applied head rotation', dirVector);
      }
    }
  }
  
  // --- Hand Poses ---
  
  // Right Hand fingers
  if (frame.rightHand && frame.rightHand.length >= 21 && rightHandBones.length > 0) {
    applyHandPose(rightHandBones[0], frame.rightHand, 'right', skeleton, debug);
  }
  
  // Left Hand fingers
  if (frame.leftHand && frame.leftHand.length >= 21 && leftHandBones.length > 0) {
    applyHandPose(leftHandBones[0], frame.leftHand, 'left', skeleton, debug);
  }
  
  // Update the skeleton to apply changes
  skeleton.update();
}

/**
 * Apply hand keypoints to fingers
 * @param {THREE.Bone} handBone - The hand bone
 * @param {Array} keypoints - Hand keypoints
 * @param {string} side - 'right' or 'left'
 * @param {THREE.Skeleton} skeleton - The skeleton
 * @param {boolean} debug - Debug flag
 */
function applyHandPose(handBone, keypoints, side, skeleton, debug = false) {
  // Skip if no hand bone or keypoints
  if (!handBone || !keypoints || keypoints.length < 21) return;
  
  // Find all finger bones related to this hand
  const bones = skeleton.bones;
  const fingerBones = bones.filter(bone => 
    bone.name.toLowerCase().includes(side.toLowerCase()) && 
    (bone.name.toLowerCase().includes('finger') || 
     bone.name.toLowerCase().includes('thumb') || 
     bone.name.toLowerCase().includes('index') || 
     bone.name.toLowerCase().includes('middle') || 
     bone.name.toLowerCase().includes('ring') || 
     bone.name.toLowerCase().includes('pinky'))
  );
  
  if (debug) {
    console.log(`Found ${fingerBones.length} finger bones for ${side} hand`);
  }
  
  // OpenPose hand keypoint indices:
  // 0: Wrist
  // 1-4: Thumb (from base to tip)
  // 5-8: Index finger
  // 9-12: Middle finger
  // 13-16: Ring finger
  // 17-20: Pinky finger
  
  fingerBones.forEach(bone => {
    try {
      // Determine which finger this bone belongs to
      let keypointIndices = [];
      
      if (bone.name.toLowerCase().includes('thumb')) {
        keypointIndices = [1, 2, 3, 4];
      } else if (bone.name.toLowerCase().includes('index')) {
        keypointIndices = [5, 6, 7, 8];
      } else if (bone.name.toLowerCase().includes('middle')) {
        keypointIndices = [9, 10, 11, 12];
      } else if (bone.name.toLowerCase().includes('ring')) {
        keypointIndices = [13, 14, 15, 16];
      } else if (bone.name.toLowerCase().includes('pinky') || bone.name.toLowerCase().includes('little')) {
        keypointIndices = [17, 18, 19, 20];
      } else {
        return; // Skip if not a recognized finger bone
      }
      
      // Determine which segment of the finger
      let segmentIndex = 0;
      
      if (bone.name.toLowerCase().includes('meta') || bone.name.toLowerCase().includes('base')) {
        segmentIndex = 0;
      } else if (bone.name.toLowerCase().includes('proximal') || bone.name.toLowerCase().includes('mid')) {
        segmentIndex = 1;
      } else if (bone.name.toLowerCase().includes('distal') || bone.name.toLowerCase().includes('tip')) {
        segmentIndex = 2;
      }
      
      // Only proceed if we have sequential keypoints to define direction
      if (keypointIndices.length > 0 && segmentIndex < keypointIndices.length - 1) {
        const fromIndex = keypointIndices[segmentIndex];
        const toIndex = keypointIndices[segmentIndex + 1];
        
        if (keypoints[fromIndex] && keypoints[toIndex]) {
          // Create vectors from keypoints
          const fromPos = new THREE.Vector3(
            keypoints[fromIndex][0] * 0.01,
            keypoints[fromIndex][1] * 0.01,
            keypoints[fromIndex][2] * 0.01
          );
          
          const toPos = new THREE.Vector3(
            keypoints[toIndex][0] * 0.01,
            keypoints[toIndex][1] * 0.01,
            keypoints[toIndex][2] * 0.01
          );
          
          // Calculate direction
          const dirVector = new THREE.Vector3().subVectors(toPos, fromPos).normalize();
          
          // Skip if direction vector is invalid
          if (dirVector.lengthSq() === 0) return;
          
          // Create rotation quaternion based on direction
          const targetQuaternion = alignBoneToVector(dirVector, bone, 'front');
          
          // Apply rotation with higher influence for fingers
          applyRotation(bone, targetQuaternion, 1.5);
          
          if (debug) {
            console.log(`Applied ${side} finger rotation for ${bone.name}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error applying finger pose for ${bone.name}:`, error);
    }
  });
}

/**
 * Creates a quaternion that aligns a bone to a target direction vector
 * @param {THREE.Vector3} targetVector - Target direction vector
 * @param {THREE.Bone} bone - The bone to align
 * @param {string} alignment - How to align the bone ('front', 'up', or 'side')
 * @returns {THREE.Quaternion} - Rotation quaternion
 */
function alignBoneToVector(targetVector, bone, alignment = 'front') {
  // Skip if target vector is invalid
  if (!targetVector || targetVector.lengthSq() === 0) {
    return new THREE.Quaternion();
  }
  
  // Store the bone's initial rest rotation if not already stored
  if (!bone.userData.initialQuaternion) {
    bone.userData.initialQuaternion = bone.quaternion.clone();
  }
  
  // Determine source vector based on desired alignment
  let sourceVector;
  
  switch (alignment) {
    case 'front':
      sourceVector = new THREE.Vector3(0, 1, 0); // Y-axis for forward
      break;
    case 'up':
      sourceVector = new THREE.Vector3(0, 1, 0); // Y-axis for up
      break;
    case 'side':
      sourceVector = new THREE.Vector3(1, 0, 0); // X-axis for side
      break;
    default:
      sourceVector = new THREE.Vector3(0, 1, 0);
  }
  
  // Create quaternion that rotates from source to target
  const rotationQuaternion = new THREE.Quaternion();
  rotationQuaternion.setFromUnitVectors(sourceVector, targetVector);
  
  return rotationQuaternion;
}

/**
 * Applies a rotation to a bone, respecting its initial pose
 * @param {THREE.Bone} bone - The bone to rotate
 * @param {THREE.Quaternion} targetQuaternion - Target rotation
 * @param {number} influence - How strongly to apply the rotation (0-1)
 */
function applyRotation(bone, targetQuaternion, influence = 1.0) {
  // Skip if no bone or invalid quaternion
  if (!bone || !targetQuaternion) return;
  
  // Store initial quaternion if not already stored
  if (!bone.userData.initialQuaternion) {
    bone.userData.initialQuaternion = bone.quaternion.clone();
  }
  
  // Create interpolated quaternion between identity and target
  const interpolatedQuaternion = new THREE.Quaternion();
  interpolatedQuaternion.slerpQuaternions(
    new THREE.Quaternion(), // Identity quaternion
    targetQuaternion,
    influence
  );
  
  // Apply rotation by combining with initial rotation
  bone.quaternion.copy(bone.userData.initialQuaternion);
  bone.quaternion.premultiply(interpolatedQuaternion);
}

/**
 * Directly applies a keypoint frame animation to a model
 * This is the main entry point for the enhanced animation system
 * @param {Array} frames - Keypoint frames
 * @param {THREE.Skeleton} skeleton - The model's skeleton
 * @param {number} frameIndex - Current frame index
 * @param {Object} options - Animation options
 */
export function applyKeypointFrameToModel(frames, skeleton, frameIndex, options = {}) {
  if (!frames || !frames.length || !skeleton) return;
  
  // Ensure frameIndex is within bounds
  const safeFrameIndex = Math.min(Math.max(0, frameIndex), frames.length - 1);
  const currentFrame = frames[safeFrameIndex];
  
  // Apply directly to skeleton
  applyKeypointDirectlyToSkeleton(currentFrame, skeleton, options);
}