/**
 * Utility functions for handling animations with OpenPose keypoint files
 */
import * as THREE from 'three';

/**
 * Load keypoint data from the OpenPose format JSON files
 * @param {string} word - The word to load keypoints for (folder name)
 * @returns {Promise<Array>} - Array of processed frames
 */
export async function loadKeypointsForWord(word) {
  try {
    if (!word) {
      throw new Error('No word provided');
    }
    
    console.log(`Loading keypoints for word: "${word}"`);
    
    // Convert word to lowercase for consistent folder naming
    const folderName = word.toLowerCase();
    
    // Try to load the keypoint files directly
    // The files seem to follow a pattern like NIA_SL_WORD1501_REAL01_F_XXXXXXX_keypoints.json
    const frames = [];
    
    // Define some common patterns to try
    const patterns = [
      // Pattern with sequence numbers
      (idx) => `NIA_SL_WORD1501_REAL01_F_${String(idx).padStart(12, '0')}_keypoints.json`,
      // Simplified pattern
      (idx) => `frame_${idx}.json`,
      // Another possible pattern
      (idx) => `${word}_${idx}.json`
    ];
    
    let fileIndex = 0;
    let consecutiveErrors = 0;
    const MAX_ERRORS = 5; // Stop after 5 consecutive errors
    
    // Keep trying to load files with incremental indices until too many errors
    while (consecutiveErrors < MAX_ERRORS && fileIndex < 100) { // Limit to 100 frames for safety
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
            break; // Break out of pattern loop if successful
          }
        } catch (e) {
          // Continue to the next pattern
        }
      }
      
      // If none of the patterns worked, increment error counter
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
  } catch (error) {
    console.error('Error loading keypoints:', error);
    throw error;
  }
}

/**
 * Process OpenPose format keypoint data into a standardized format
 * @param {Object} data - OpenPose format data
 * @returns {Object} - Processed keypoint frame with normalized structure
 */
function processOpenPoseFrame(data) {
  // Create an empty result object with the standard format
  const processed = {
    pose: [],
    leftHand: [],
    rightHand: [],
    face: []
  };
  
  // Process OpenPose format
  if (data.people && data.people.length > 0) {
    const person = data.people;
    
    // Process 2D keypoints (we'll convert to 3D format if available)
    // Note: OpenPose uses a flat array format [x1,y1,c1,x2,y2,c2,...]
    
    // For 2D pose keypoints
    if (person.pose_keypoints_2d) {
      processed.pose = extractKeypoints(person.pose_keypoints_2d, true);
    }
    
    // For 2D left hand keypoints
    if (person.hand_left_keypoints_2d) {
      processed.leftHand = extractKeypoints(person.hand_left_keypoints_2d, true);
    }
    
    // For 2D right hand keypoints
    if (person.hand_right_keypoints_2d) {
      processed.rightHand = extractKeypoints(person.hand_right_keypoints_2d, true);
    }
    
    // For 2D face keypoints
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
}

/**
 * Extract points from flat array format used by OpenPose
 * @param {Array} flatArray - Flat array of x,y,c values or x,y,z,c values
 * @param {boolean} is2D - Whether this is 2D data (x,y,c) instead of 3D (x,y,z,c)
 * @returns {Array} - Array of point arrays [x,y,z]
 */
function extractKeypoints(flatArray, is2D = true) {
  const points = [];
  const stride = is2D ? 3 : 4; // 3 values for 2D (x,y,c), 4 for 3D (x,y,z,c)
  
  for (let i = 0; i < flatArray.length; i += stride) {
    if (is2D) {
      // For 2D data, add a 0 z-coordinate
      points.push([
        flatArray[i],     // x
        flatArray[i + 1], // y
        0                 // z (not in 2D data, so set to 0)
      ]);
    } else {
      // For 3D data, use the provided z-coordinate
      points.push([
        flatArray[i],     // x
        flatArray[i + 1], // y
        flatArray[i + 2]  // z
      ]);
    }
  }
  
  return points;
}

/**
 * Maps keypoints to the skeleton's bone structure
 * This creates an animation that can be applied to the 3D model
 * @param {Array} framesData - Array of processed keypoint frames
 * @param {THREE.Skeleton} skeleton - The skeleton to map to
 * @returns {THREE.AnimationClip} - The animation clip
 */
export function createAnimationFromKeypoints(framesData, skeleton) {
  if (!framesData || framesData.length === 0 || !skeleton) {
    console.error('Invalid input for animation creation');
    return null;
  }
  
  // Get bone names for mapping
  const boneNames = skeleton.bones.map(bone => bone.name);
  
  // Create animation tracks
  const tracks = [];
  const times = [];
  
  // Generate evenly spaced keyframe times
  const duration = framesData.length / 30; // Assuming 30 FPS
  for (let i = 0; i < framesData.length; i++) {
    times.push(i * duration / framesData.length);
  }
  
  // Map bones to keypoints
  const boneToKeypointMap = createBoneToKeypointMap(boneNames);
  
  // Create a track for each mapped bone
  Object.entries(boneToKeypointMap).forEach(([boneName, mappingInfo]) => {
    const boneIndex = findBoneIndex(skeleton, boneName);
    if (boneIndex === -1) return; // Skip bones not in the skeleton
    
    const rotationValues = [];
    
    for (let frameIdx = 0; frameIdx < framesData.length; frameIdx++) {
      const frame = framesData[frameIdx];
      const rotation = calculateBoneRotation(frame, mappingInfo);
      
      // Add quaternion components to values array
      rotationValues.push(
        rotation.x, rotation.y, rotation.z, rotation.w
      );
    }
    
    if (rotationValues.length > 0) {
      const trackName = `.bones[${boneIndex}].quaternion`;
      const track = new THREE.QuaternionKeyframeTrack(trackName, times, rotationValues);
      tracks.push(track);
    }
  });
  
  if (tracks.length === 0) {
    console.error('No animation tracks created from keypoints');
    return null;
  }
  
  // Create the animation clip
  return new THREE.AnimationClip('keypoint-animation', duration, tracks);
}

/**
 * Create a mapping between bone names and keypoint indices
 * @param {Array} boneNames - Array of bone names from the skeleton
 * @returns {Object} - Mapping of bone names to keypoint information
 */
function createBoneToKeypointMap(boneNames) {
  const mapping = {};
  
  // Map specific bones to keypoint indices
  // This mapping depends on both your 3D model's skeleton
  // and the OpenPose keypoint format
  
  boneNames.forEach(boneName => {
    // Right Arm Chain
    if (boneName.includes('RightShoulder') || boneName.includes('Right_Shoulder')) {
      mapping[boneName] = { 
        type: 'pose', 
        index: 2, // Right shoulder in OpenPose
        childIndex: 3, // Right elbow
        axis: new THREE.Vector3(1, 0, 0)
      };
    }
    else if (boneName.includes('RightArm') || boneName.includes('Right_Arm')) {
      mapping[boneName] = { 
        type: 'pose', 
        index: 3, // Right elbow
        childIndex: 4, // Right wrist
        axis: new THREE.Vector3(1, 0, 0)
      };
    }
    else if (boneName.includes('RightForeArm') || boneName.includes('Right_ForeArm')) {
      mapping[boneName] = { 
        type: 'pose', 
        index: 4, // Right wrist
        childIndex: null,
        axis: new THREE.Vector3(1, 0, 0)
      };
    }
    // Right Hand
    else if (boneName.includes('RightHand') || boneName.includes('Right_Hand')) {
      mapping[boneName] = { 
        type: 'rightHand', 
        index: 0, // Wrist
        childIndex: 9, // Middle finger base
        axis: new THREE.Vector3(0, 1, 0)
      };
    }
    
    // Left Arm Chain
    else if (boneName.includes('LeftShoulder') || boneName.includes('Left_Shoulder')) {
      mapping[boneName] = { 
        type: 'pose', 
        index: 5, // Left shoulder in OpenPose
        childIndex: 6, // Left elbow
        axis: new THREE.Vector3(-1, 0, 0)
      };
    }
    else if (boneName.includes('LeftArm') || boneName.includes('Left_Arm')) {
      mapping[boneName] = { 
        type: 'pose', 
        index: 6, // Left elbow
        childIndex: 7, // Left wrist
        axis: new THREE.Vector3(-1, 0, 0)
      };
    }
    else if (boneName.includes('LeftForeArm') || boneName.includes('Left_ForeArm')) {
      mapping[boneName] = { 
        type: 'pose', 
        index: 7, // Left wrist
        childIndex: null,
        axis: new THREE.Vector3(-1, 0, 0)
      };
    }
    // Left Hand
    else if (boneName.includes('LeftHand') || boneName.includes('Left_Hand')) {
      mapping[boneName] = { 
        type: 'leftHand', 
        index: 0, // Wrist
        childIndex: 9, // Middle finger base
        axis: new THREE.Vector3(0, 1, 0)
      };
    }
    
    // Spine and Head
    else if (boneName.includes('Spine') || boneName.includes('spine')) {
      mapping[boneName] = { 
        type: 'pose', 
        index: 1, // Spine in OpenPose
        childIndex: 8, // Mid-spine
        axis: new THREE.Vector3(0, 1, 0)
      };
    }
    else if (boneName.includes('Neck') || boneName.includes('neck')) {
      mapping[boneName] = { 
        type: 'pose', 
        index: 1, // Spine
        childIndex: 0, // Neck
        axis: new THREE.Vector3(0, 1, 0)
      };
    }
    else if (boneName.includes('Head') || boneName.includes('head')) {
      mapping[boneName] = { 
        type: 'pose', 
        index: 0, // Neck
        childIndex: 15, // Nose or head point
        axis: new THREE.Vector3(0, 1, 0)
      };
    }
  });
  
  return mapping;
}

/**
 * Calculate rotation for a bone based on keypoint positions
 * @param {Object} frame - The keypoint frame data
 * @param {Object} mappingInfo - Mapping information for the bone
 * @returns {THREE.Quaternion} - Calculated rotation
 */
function calculateBoneRotation(frame, mappingInfo) {
  const { type, index, childIndex, axis } = mappingInfo;
  const keypointSet = frame[type];
  
  // Default rotation (identity quaternion)
  const defaultRotation = new THREE.Quaternion();
  
  if (!keypointSet || keypointSet.length <= index) {
    return defaultRotation;
  }
  
  // If we have both the joint and its child, we can calculate a direction vector
  if (childIndex !== null && keypointSet.length > childIndex) {
    const jointPos = new THREE.Vector3(
      keypointSet[index][0],
      keypointSet[index][1],
      keypointSet[index][2]
    );
    
    const childPos = new THREE.Vector3(
      keypointSet[childIndex][0],
      keypointSet[childIndex][1],
      keypointSet[childIndex][2]
    );
    
    // Calculate direction vector
    const direction = new THREE.Vector3().subVectors(childPos, jointPos).normalize();
    
    // Create quaternion from direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(axis, direction);
    
    return quaternion;
  }
  
  // If we only have the joint position, we can make a simpler approximation
  // based on its position relative to rest pose
  const keypoint = keypointSet[index];
  if (keypoint) {
    // Create a simple rotation based on the keypoint position
    // This is a simplified approach - real implementation would be more sophisticated
    const euler = new THREE.Euler(
      keypoint[1] * 0.01, // x rotation based on y value
      keypoint[0] * 0.01, // y rotation based on x value
      keypoint[2] * 0.01  // z rotation based on z value
    );
    
    return new THREE.Quaternion().setFromEuler(euler);
  }
  
  return defaultRotation;
}

/**
 * Helper to find the index of a bone in a skeleton
 * @param {THREE.Skeleton} skeleton - The skeleton to search
 * @param {string} boneName - Name of the bone to find
 * @returns {number} - Index of the bone or -1 if not found
 */
function findBoneIndex(skeleton, boneName) {
  return skeleton.bones.findIndex(bone => bone.name === boneName);
}

/**
 * Generate a fallback animation when keypoint data can't be loaded
 * @param {string} word - The word to create fallback animation for
 * @param {THREE.Skeleton} skeleton - The skeleton to animate
 * @returns {THREE.AnimationClip} - A fallback animation
 */
export function generateFallbackAnimation(word, skeleton) {
  if (!skeleton) return null;
  
  // Map of word-specific fallback animations
  const specificAnimations = {
    '사과': createAppleFallbackAnimation,
    '안녕': createGreetingFallbackAnimation,
    '감사합니다': createThankYouFallbackAnimation
  };
  
  // Check if we have a specific animation for this word
  if (specificAnimations[word]) {
    return specificAnimations[word](skeleton);
  }
  
  // Otherwise use a generic animation
  return createGenericFallbackAnimation(skeleton);
}

// Fallback animation for "사과" (apple)
function createAppleFallbackAnimation(skeleton) {
  const tracks = [];
  const duration = 3; // 3 seconds
  
  // Find right arm and hand bones
  const rightArmBones = skeleton.bones.filter(bone => 
    bone.name.includes('Right') && (bone.name.includes('Arm') || bone.name.includes('Hand'))
  );
  
  rightArmBones.forEach(bone => {
    const boneIndex = skeleton.bones.indexOf(bone);
    if (boneIndex === -1) return;
    
    const times = [0, 1, 2, 3];
    let values;
    
    // Create animation for eating an apple
    if (bone.name.includes('Shoulder')) {
      // Raise shoulder slightly
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.1));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else if (bone.name.includes('Arm') && !bone.name.includes('Fore')) {
      // Raise arm toward face
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.2, 0, 0));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else if (bone.name.includes('ForeArm')) {
      // Bend forearm toward face
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.7, 0, 0));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else if (bone.name.includes('Hand')) {
      // Hand motion for holding and biting apple
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0, 0));
      const q3 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q3.x, q3.y, q3.z, q3.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else {
      return;
    }
    
    const trackName = `.bones[${boneIndex}].quaternion`;
    const track = new THREE.QuaternionKeyframeTrack(trackName, times, values);
    tracks.push(track);
  });
  
  if (tracks.length === 0) return null;
  
  return new THREE.AnimationClip('apple-fallback', duration, tracks);
}

// Fallback animation for "안녕" (hello/greeting)
function createGreetingFallbackAnimation(skeleton) {
  const tracks = [];
  const duration = 2; // 2 seconds
  
  // Find right arm bones for a waving motion
  const rightArmBones = skeleton.bones.filter(bone => 
    bone.name.includes('Right') && (bone.name.includes('Arm') || bone.name.includes('Hand'))
  );
  
  rightArmBones.forEach(bone => {
    const boneIndex = skeleton.bones.indexOf(bone);
    if (boneIndex === -1) return;
    
    const times = [0, 0.5, 1, 1.5, 2];
    let values;
    
    if (bone.name.includes('Shoulder')) {
      // Raise shoulder for wave
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.3));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else if (bone.name.includes('Arm') && !bone.name.includes('Fore')) {
      // Raise upper arm
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.8, 0, 0));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else if (bone.name.includes('ForeArm')) {
      // Bend elbow for wave
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else if (bone.name.includes('Hand')) {
      // Wave hand side to side
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.5));
      const q3 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.5));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q3.x, q3.y, q3.z, q3.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else {
      return;
    }
    
    const trackName = `.bones[${boneIndex}].quaternion`;
    const track = new THREE.QuaternionKeyframeTrack(trackName, times, values);
    tracks.push(track);
  });
  
  if (tracks.length === 0) return null;
  
  return new THREE.AnimationClip('greeting-fallback', duration, tracks);
}

// Fallback animation for "감사합니다" (thank you)
function createThankYouFallbackAnimation(skeleton) {
  const tracks = [];
  const duration = 3; // 3 seconds
  
  // For thank you, typically uses both hands
  const armBones = skeleton.bones.filter(bone => 
    (bone.name.includes('Arm') || bone.name.includes('Hand') || bone.name.includes('Shoulder'))
  );
  
  armBones.forEach(bone => {
    const boneIndex = skeleton.bones.indexOf(bone);
    if (boneIndex === -1) return;
    
    const times = [0, 1, 2, 3];
    let values;
    
    const isRight = bone.name.includes('Right');
    
    if (bone.name.includes('Shoulder')) {
      // Slight shoulder rotation
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, isRight ? -0.1 : 0.1)
      );
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else if (bone.name.includes('Arm') && !bone.name.includes('Fore')) {
      // Upper arm movement
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-0.5, 0, isRight ? -0.3 : 0.3)
      );
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else if (bone.name.includes('ForeArm')) {
      // Forearm bend
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.7, 0, 0));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else if (bone.name.includes('Hand')) {
      // Hand gesture
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0));
      
      values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
    }
    else {
      return;
    }
    
    const trackName = `.bones[${boneIndex}].quaternion`;
    const track = new THREE.QuaternionKeyframeTrack(trackName, times, values);
    tracks.push(track);
  });
  
  if (tracks.length === 0) return null;
  
  return new THREE.AnimationClip('thank-you-fallback', duration, tracks);
}

// Generic fallback animation for any word
function createGenericFallbackAnimation(skeleton) {
  const tracks = [];
  const duration = 2; // 2 seconds
  
  // Find all arm/hand bones
  const armBones = skeleton.bones.filter(bone => 
    (bone.name.includes('Arm') || bone.name.includes('Hand') || bone.name.includes('Shoulder'))
  );
  
  armBones.forEach(bone => {
    const boneIndex = skeleton.bones.indexOf(bone);
    if (boneIndex === -1) return;
    
    const times = [0, 1, 2];
    let values;
    
    const isRight = bone.name.includes('Right');
    
    // Simple animation for all bones
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    const q2 = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(isRight ? -0.3 : -0.2, 0, isRight ? -0.1 : 0.1)
    );
    
    values = [
      q1.x, q1.y, q1.z, q1.w,
      q2.x, q2.y, q2.z, q2.w,
      q1.x, q1.y, q1.z, q1.w
    ];
    
    const trackName = `.bones[${boneIndex}].quaternion`;
    const track = new THREE.QuaternionKeyframeTrack(trackName, times, values);
    tracks.push(track);
  });
  
  if (tracks.length === 0) return null;
  
  return new THREE.AnimationClip('generic-fallback', duration, tracks);
}