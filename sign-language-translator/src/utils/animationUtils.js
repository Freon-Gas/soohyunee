/**
 * Utility functions for handling animations with OpenPose keypoint files
 */
import * as THREE from 'three';
import { createBoneToKeypointMap, getScaleFactors } from './keypointMapper';

/**
 * Safer interpolation between quaternions as a replacement for slerp
 * Handles cases where Quaternion.slerp static method is not available
 * @param {THREE.Quaternion} from - Starting quaternion
 * @param {THREE.Quaternion} to - Target quaternion
 * @param {number} t - Interpolation factor (0-1)
 * @returns {THREE.Quaternion} - Interpolated quaternion
 */
function safeQuaternionSlerp(from, to, t) {
  try {
    // Try using instance method first (available in most THREE.js versions)
    if (typeof from.slerp === 'function') {
      const result = from.clone();
      result.slerp(to, t);
      return result;
    }
    
    // Manual implementation if slerp is not available
    // This is a simplified implementation that works for most cases
    const result = new THREE.Quaternion();
    
    // Calculate the cosine of the angle between quaternions
    let cosHalfTheta = from.x * to.x + from.y * to.y + from.z * to.z + from.w * to.w;
    
    // Choose the shortest path
    if (cosHalfTheta < 0) {
      cosHalfTheta = -cosHalfTheta;
      to = new THREE.Quaternion(-to.x, -to.y, -to.z, -to.w);
    }
    
    // If quaternions are close, just linear interpolation
    if (cosHalfTheta > 0.95) {
      result.x = from.x + (to.x - from.x) * t;
      result.y = from.y + (to.y - from.y) * t;
      result.z = from.z + (to.z - from.z) * t;
      result.w = from.w + (to.w - from.w) * t;
      result.normalize();
      return result;
    }
    
    // Calculate spherical interpolation
    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
    
    // If theta = 180 degrees, rotation not fully defined
    // Try to avoid numerical problems
    if (Math.abs(sinHalfTheta) < 0.001) {
      result.x = (from.x * 0.5 + to.x * 0.5);
      result.y = (from.y * 0.5 + to.y * 0.5);
      result.z = (from.z * 0.5 + to.z * 0.5);
      result.w = (from.w * 0.5 + to.w * 0.5);
      result.normalize();
      return result;
    }
    
    // Calculate ratios
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
    
    // Linear combination of quaternions
    result.x = (from.x * ratioA + to.x * ratioB);
    result.y = (from.y * ratioA + to.y * ratioB);
    result.z = (from.z * ratioA + to.z * ratioB);
    result.w = (from.w * ratioA + to.w * ratioB);
    
    return result;
    
  } catch (error) {
    console.error('Error in quaternion interpolation:', error);
    // In case of error, return the start quaternion as a last resort
    return from.clone();
  }
}/**
 * Utility functions for handling animations with OpenPose keypoint files
 */
import * as THREE from 'three';
import { createBoneToKeypointMap, getScaleFactors } from './keypointMapper';

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
    const folderName = word;
    
    // Try to load the keypoint files directly
    // The files seem to follow a pattern like NIA_SL_WORD1501_REAL01_F_XXXXXXX_keypoints.json
    const frames = [];
    
    // Define some common patterns to try
    const patterns = [
      // Pattern with sequence numbers - Korean NIA dataset format
      (idx) => `NIA_SL_WORD1501_REAL01_F_${String(idx).padStart(12, '0')}_keypoints.json`,
      // Simplified pattern
      (idx) => `frame_${idx}.json`,
      // Another possible pattern
      (idx) => `${word}_${idx}.json`
    ];
    
    // Safety function to create a valid frame if one isn't available
    const createDefaultFrame = () => {
      return {
        pose: Array(25).fill().map(() => [0, 0, 0]),
        leftHand: Array(21).fill().map(() => [0, 0, 0]),
        rightHand: Array(21).fill().map(() => [0, 0, 0]),
        face: Array(70).fill().map(() => [0, 0, 0])
      };
    };
    
    // Initialize variables for loading frames
const MAX_ERRORS = 3;
let fileIndex = 0;
let consecutiveErrors = 0;
    
// Keep trying to load files with incremental indices until too many errors
    while (consecutiveErrors < MAX_ERRORS && fileIndex < 150) { // Increased limit to 150 frames
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
  try {
    // Create an empty result object with the standard format
    const processed = {
      pose: [],
      leftHand: [],
      rightHand: [],
      face: []
    };
    
    // Check if data exists
    if (!data) {
      console.warn('No data provided to processOpenPoseFrame');
      return createDefaultFrame();
    }
    
    // Check for the OpenPose format standard structure
    if (data.people) {
      // Use the first person if multiple people are detected
      let person = data.people;
      
      // Handle both array format and direct object format
      if (Array.isArray(data.people) && data.people.length > 0) {
        person = data.people[0];
      } else if (Array.isArray(data.people) && data.people.length === 0) {
        console.warn('No people detected in OpenPose data');
        return createDefaultFrame();
      }
      
      try {
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
        
        // If 3D data is available, use that instead (higher priority)
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
      } catch (personError) {
        console.error('Error processing person keypoints:', personError);
        // Continue with potentially partial processing
      }
    }
    // Alternative format sometimes used - direct pose points
    else if (data.pose || data.poses) {
      try {
        let posePoints = data.pose || (Array.isArray(data.poses) && data.poses.length > 0 ? data.poses[0] : null);
        
        if (posePoints) {
          // Check if it's already in the right format or needs processing
          if (Array.isArray(posePoints)) {
            processed.pose = posePoints.map(point => {
              // Make sure each point is a 3D point [x,y,z]
              if (Array.isArray(point) && point.length >= 2) {
                return point.length === 2 ? [...point, 0] : point.slice(0, 3);
              }
              return [0, 0, 0]; // Default for invalid points
            });
          }
        }
        
        // Process hands if available
        if (data.leftHand || data.left_hand) {
          const leftHandPoints = data.leftHand || data.left_hand;
          if (Array.isArray(leftHandPoints)) {
            processed.leftHand = leftHandPoints.map(point => {
              if (Array.isArray(point) && point.length >= 2) {
                return point.length === 2 ? [...point, 0] : point.slice(0, 3);
              }
              return [0, 0, 0];
            });
          }
        }
        
        if (data.rightHand || data.right_hand) {
          const rightHandPoints = data.rightHand || data.right_hand;
          if (Array.isArray(rightHandPoints)) {
            processed.rightHand = rightHandPoints.map(point => {
              if (Array.isArray(point) && point.length >= 2) {
                return point.length === 2 ? [...point, 0] : point.slice(0, 3);
              }
              return [0, 0, 0];
            });
          }
        }
        
        if (data.face) {
          const facePoints = data.face;
          if (Array.isArray(facePoints)) {
            processed.face = facePoints.map(point => {
              if (Array.isArray(point) && point.length >= 2) {
                return point.length === 2 ? [...point, 0] : point.slice(0, 3);
              }
              return [0, 0, 0];
            });
          }
        }
      } catch (poseError) {
        console.error('Error processing alternative pose format:', poseError);
      }
    }
    
    // Ensure we have some minimum data to work with
    // If there are no pose keypoints, create some default ones
    if (!processed.pose || processed.pose.length === 0) {
      processed.pose = Array(25).fill().map(() => [0, 0, 0]);
    }
    
    if (!processed.leftHand || processed.leftHand.length === 0) {
      processed.leftHand = Array(21).fill().map(() => [0, 0, 0]);
    }
    
    if (!processed.rightHand || processed.rightHand.length === 0) {
      processed.rightHand = Array(21).fill().map(() => [0, 0, 0]);
    }
    
    if (!processed.face || processed.face.length === 0) {
      processed.face = Array(70).fill().map(() => [0, 0, 0]);
    }
    
    return processed;
  } catch (error) {
    console.error('Critical error in processOpenPoseFrame:', error);
    return createDefaultFrame();
  }
}

/**
 * Create a default frame with empty keypoints
 * @returns {Object} Default frame
 */
function createDefaultFrame() {
  return {
    pose: Array(25).fill().map(() => [0, 0, 0]),
    leftHand: Array(21).fill().map(() => [0, 0, 0]),
    rightHand: Array(21).fill().map(() => [0, 0, 0]),
    face: Array(70).fill().map(() => [0, 0, 0])
  };
}

/**
 * Extract points from flat array format used by OpenPose
 * @param {Array} flatArray - Flat array of x,y,c values or x,y,z,c values
 * @param {boolean} is2D - Whether this is 2D data (x,y,c) instead of 3D (x,y,z,c)
 * @returns {Array} - Array of point arrays [x,y,z]
 */
function extractKeypoints(flatArray, is2D = true) {
  try {
    if (!flatArray || !Array.isArray(flatArray)) {
      console.warn('Invalid flat array provided to extractKeypoints');
      return [];
    }
    
    const points = [];
    const stride = is2D ? 3 : 4; // 3 values for 2D (x,y,c), 4 for 3D (x,y,z,c)
    
    // Safety check to make sure the array length is a multiple of stride
    if (flatArray.length % stride !== 0) {
      console.warn(`Array length (${flatArray.length}) is not a multiple of ${stride}`);
      // Try to handle it gracefully
    }
    
    for (let i = 0; i < flatArray.length; i += stride) {
      try {
        if (is2D) {
          // For 2D data, add a 0 z-coordinate
          if (i + 1 < flatArray.length) {
            points.push([
              Number(flatArray[i]) || 0,     // x
              Number(flatArray[i + 1]) || 0, // y
              0                              // z (not in 2D data, so set to 0)
            ]);
          }
        } else {
          // For 3D data, use the provided z-coordinate
          if (i + 2 < flatArray.length) {
            points.push([
              Number(flatArray[i]) || 0,     // x
              Number(flatArray[i + 1]) || 0, // y
              Number(flatArray[i + 2]) || 0  // z
            ]);
          }
        }
      } catch (pointError) {
        console.error(`Error extracting point at index ${i}:`, pointError);
        // Add a default point to keep the array structure consistent
        points.push([0, 0, 0]);
      }
    }
    
    return points;
  } catch (error) {
    console.error('Error in extractKeypoints:', error);
    return [];
  }
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
  
  // Set the first frame as the reference frame
  const initialFrame = framesData[0];
  console.log('Setting initial frame as reference:', initialFrame);
  
  // Get bone names for mapping
  const boneNames = skeleton.bones.map(bone => bone.name);
  console.log('Bones in model:', boneNames);
  
  // Create mapping between bones and keypoints
  const boneToKeypointMap = createBoneToKeypointMap(boneNames);
  console.log('Bone to keypoint mapping created:', Object.keys(boneToKeypointMap).length);
  
  // Find the skinned mesh that contains the skeleton
  // This is important for proper track naming
  let skinnedMeshName = 'Armature';  // Default name if we can't find the actual name
  
  // Create animation tracks
  const tracks = [];
  const scaleFactor = getScaleFactors('default');
  
  // Duration and times array for keyframes
  const framesPerSecond = 30;
  const duration = framesData.length / framesPerSecond;
  const times = [];
  
  // Generate evenly spaced keyframe times
  for (let i = 0; i < framesData.length; i++) {
    times.push(i * duration / framesData.length);
  }
  
  // For each bone that has a mapping
  Object.entries(boneToKeypointMap).forEach(([boneName, mappingInfo]) => {
    const bone = skeleton.bones.find(b => b.name === boneName);
    if (!bone) return;
    
    // Find the bone index
    const boneIndex = skeleton.bones.indexOf(bone);
    if (boneIndex === -1) return;
    
    // Store initial quaternion for reference
    const initialQuaternion = bone.quaternion.clone();
    
    // For each bone, create quaternion keyframes
    const quatValues = [];
    
    // Process each frame
    framesData.forEach(frame => {
      // Calculate rotation for this bone at this frame
      const quaternion = calculateBoneRotation(frame, initialFrame, mappingInfo, initialQuaternion, scaleFactor);
      
      // Add quaternion components to values array
      quatValues.push(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );
    });
    
    // Create the quaternion track
    const trackName = `${skinnedMeshName !== '' ? skinnedMeshName + '.' : ''}.bones[${boneIndex}].quaternion`;
    const track = new THREE.QuaternionKeyframeTrack(trackName, times, quatValues);
    tracks.push(track);
  });
  
  if (tracks.length === 0) {
    console.error('No animation tracks created from keypoints');
    return null;
  }
  
  // Create the animation clip
  return new THREE.AnimationClip('keypoint-animation', duration, tracks);
}

/**
 * Calculate rotation for a bone based on keypoint positions
 * @param {Object} frame - Current keypoint frame data
 * @param {Object} initialFrame - Initial keypoint frame for reference
 * @param {Object} mappingInfo - Mapping information for the bone
 * @param {THREE.Quaternion} initialQuaternion - Initial rotation of the bone
 * @param {Object} scaleFactor - Scale factors for calculations
 * @returns {THREE.Quaternion} - Calculated rotation
 */
function calculateBoneRotation(frame, initialFrame, mappingInfo, initialQuaternion, scaleFactor) {
  const { type, from, to, influence = 1.0 } = mappingInfo;
  
  // Get the corresponding keypoint set (pose, leftHand, rightHand, face)
  const currentKeypoints = frame[type];
  const initialKeypoints = initialFrame[type];
  
  // Default rotation (identity quaternion)
  const defaultRotation = new THREE.Quaternion();
  
  // If keypoints are missing, return the default
  if (!currentKeypoints || currentKeypoints.length <= from || 
      !initialKeypoints || initialKeypoints.length <= from) {
    return defaultRotation;
  }
  
  // If both from and to indices are valid, calculate direction vector
  if (to !== null && 
      currentKeypoints.length > to && 
      initialKeypoints.length > to) {
      
    // Get current positions as vectors
    const fromPos = new THREE.Vector3(
      currentKeypoints[from][0],
      currentKeypoints[from][1],
      currentKeypoints[from][2]
    );
    
    const toPos = new THREE.Vector3(
      currentKeypoints[to][0],
      currentKeypoints[to][1],
      currentKeypoints[to][2]
    );
    
    // Get initial positions
    const initialFromPos = new THREE.Vector3(
      initialKeypoints[from][0],
      initialKeypoints[from][1],
      initialKeypoints[from][2]
    );
    
    const initialToPos = new THREE.Vector3(
      initialKeypoints[to][0],
      initialKeypoints[to][1],
      initialKeypoints[to][2]
    );
    
    // Calculate directions
    const initialDirection = new THREE.Vector3().subVectors(initialToPos, initialFromPos).normalize();
    const currentDirection = new THREE.Vector3().subVectors(toPos, fromPos).normalize();
    
    // To avoid NaN issues, check if vectors are valid
    if (initialDirection.lengthSq() === 0 || currentDirection.lengthSq() === 0) {
      return defaultRotation;
    }
    
    // Calculate quaternion that rotates from initial to current direction
    const rotationQuat = new THREE.Quaternion();
    rotationQuat.setFromUnitVectors(initialDirection, currentDirection);
    
    // Apply influence scale to make rotation stronger or weaker
    // Use safe quaternion slerp function to avoid issues with missing static method
    const scaledQuat = safeQuaternionSlerp(
      defaultRotation, 
      rotationQuat, 
      influence * scaleFactor.rotation
    );
    
    // Combine with initial quaternion
    return new THREE.Quaternion().multiplyQuaternions(initialQuaternion, scaledQuat);
  }
  
  // If only single keypoint is available, use simplistic approach
  const currentKeypoint = currentKeypoints[from];
  const initialKeypoint = initialKeypoints[from];
  
  if (currentKeypoint && initialKeypoint) {
    // Calculate position delta from initial position
    const deltaX = (currentKeypoint[0] - initialKeypoint[0]) * scaleFactor.position * influence;
    const deltaY = (currentKeypoint[1] - initialKeypoint[1]) * scaleFactor.position * influence;
    const deltaZ = (currentKeypoint[2] - initialKeypoint[2]) * scaleFactor.position * influence;
    
    // Create euler from the deltas with appropriate scaling
    const euler = new THREE.Euler(deltaY, deltaX, deltaZ);
    
    // Convert to quaternion
    const rotationQuat = new THREE.Quaternion().setFromEuler(euler);
    
    // Combine with initial quaternion
    return new THREE.Quaternion().multiplyQuaternions(initialQuaternion, rotationQuat);
  }
  
  return defaultRotation;
}

/**
 * Apply the keypoint animation directly to a skeleton
 * @param {Array} frames - Processed keypoint frames
 * @param {THREE.Skeleton} skeleton - Skeleton to animate
 * @param {number} frameIndex - Current frame index to apply
 * @param {boolean} debug - Whether to output debugging information
 */
export function applyKeypointAnimationToSkeleton(frames, skeleton, frameIndex, debug = false) {
  try {
    if (!frames || frames.length === 0 || !skeleton || frameIndex >= frames.length) {
      if (debug) console.log('Invalid input to applyKeypointAnimationToSkeleton');
      return;
    }
    
    // Get mapping between bones and keypoints
    const boneNames = skeleton.bones.map(bone => bone.name);
    const boneToKeypointMap = createBoneToKeypointMap(boneNames);
    const scaleFactor = getScaleFactors('default');
    
    // Get the current frame and the initial frame
    const currentFrame = frames[frameIndex];
    const initialFrame = frames[0];
    
    // Log the frames for debugging
    if (frameIndex === 0 || debug) {
      console.log('Current frame keypoints:', frameIndex, JSON.stringify(currentFrame).substring(0, 100) + '...');
      console.log('Bones to animate:', Object.keys(boneToKeypointMap).length);
    }
    
    let successfulMappings = 0;
    let failedMappings = 0;
    
    // Apply rotations to each mapped bone
    Object.entries(boneToKeypointMap).forEach(([boneName, mappingInfo]) => {
      try {
    const bone = skeleton.bones.find(b => b.name === boneName);
    if (!bone) {
      if (debug) console.log(`Bone ${boneName} not found in skeleton`);
      failedMappings++;
      return;
    }
    
    // Store initial quaternion if not already saved
    if (!bone.userData.initialQuaternion) {
      bone.userData.initialQuaternion = bone.quaternion.clone();
    }
    
    // Check if the required keypoint data exists in the frames
    const { type, from, to } = mappingInfo;
    if (!currentFrame[type] || !initialFrame[type] || 
        !currentFrame[type][from] || !initialFrame[type][from]) {
      // If the keypoint data is missing, skip this bone
      if (debug) console.log(`Missing keypoint data for bone ${boneName} (${type}[${from}])`);
      failedMappings++;
      return;
    }
    
    // Calculate rotation
    const quaternion = calculateBoneRotation(
      currentFrame,
      initialFrame,
      mappingInfo,
      bone.userData.initialQuaternion,
      scaleFactor
    );
    
    // Apply rotation
        bone.quaternion.copy(quaternion);
        successfulMappings++;
        } catch (err) {
          console.error(`Error animating bone ${boneName}:`, err);
          failedMappings++;
      }
      });
      
      if (debug && frameIndex % 10 === 0) {
      console.log(`Frame ${frameIndex}: Applied ${successfulMappings} bone rotations, ${failedMappings} failed`);
    }
    
    // Special handling for key bones that might not have direct mappings
    try {
  // Handle arm positions and hand gestures specifically
  const rightHand = skeleton.bones.find(b => b.name.toLowerCase().includes('right') && b.name.toLowerCase().includes('hand'));
  const leftHand = skeleton.bones.find(b => b.name.toLowerCase().includes('left') && b.name.toLowerCase().includes('hand'));
  
  // If we have hand keypoints but no direct mapping from the standard map, apply direct positioning
  if (rightHand && currentFrame.rightHand && currentFrame.rightHand.length > 0) {
    applyHandPose(rightHand, currentFrame.rightHand, initialFrame.rightHand, 'right', skeleton, debug);
  }
  
  if (leftHand && currentFrame.leftHand && currentFrame.leftHand.length > 0) {
    applyHandPose(leftHand, currentFrame.leftHand, initialFrame.leftHand, 'left', skeleton, debug);
  }
    } catch (err) {
      console.error('Error handling special bones:', err);
    }
  
    // Update the skeleton
    try {
      skeleton.update();
    } catch (err) {
      console.error('Error updating skeleton:', err);
    }
  } catch (mainError) {
    console.error('Critical error in applyKeypointAnimationToSkeleton:', mainError);
  }
}

/**
 * Apply hand pose directly based on keypoint positions
 * @param {THREE.Bone} handBone - The hand bone to apply the pose to
 * @param {Array} currentKeypoints - Current frame hand keypoints
 * @param {Array} initialKeypoints - Initial frame hand keypoints
 * @param {string} side - 'left' or 'right'
 * @param {THREE.Skeleton} skeleton - The full skeleton for finding finger bones
 * @param {boolean} debug - Whether to output debugging information
 */
function applyHandPose(handBone, currentKeypoints, initialKeypoints, side, skeleton, debug = false) {
  try {
    // Find all finger bones related to this hand
    const fingerBones = skeleton.bones.filter(bone => 
      bone.name.toLowerCase().includes(side.toLowerCase()) && 
      (bone.name.toLowerCase().includes('finger') || 
       bone.name.toLowerCase().includes('thumb') || 
       bone.name.toLowerCase().includes('index') || 
       bone.name.toLowerCase().includes('middle') || 
       bone.name.toLowerCase().includes('ring') || 
       bone.name.toLowerCase().includes('pinky'))
    );
    
    // If there are no finger bones, there's nothing to do
    if (fingerBones.length === 0) {
      if (debug) console.log(`No finger bones found for ${side} hand`);
      return;
    }
    
    if (debug) console.log(`Applying hand pose to ${fingerBones.length} finger bones for ${side} hand`);
    
    // OpenPose hand keypoint indices:
    // 0: Wrist
    // 1-4: Thumb (from base to tip)
    // 5-8: Index finger
    // 9-12: Middle finger
    // 13-16: Ring finger
    // 17-20: Pinky
    
    // Try to relate each finger bone to corresponding keypoints
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
    }
    
    // Determine which segment of the finger (base, middle, tip)
    let segmentIndex = 0;
    
    if (bone.name.toLowerCase().includes('meta') || bone.name.toLowerCase().includes('base')) {
      segmentIndex = 0;
    } else if (bone.name.toLowerCase().includes('proximal') || bone.name.toLowerCase().includes('mid')) {
      segmentIndex = 1;
    } else if (bone.name.toLowerCase().includes('distal') || bone.name.toLowerCase().includes('tip')) {
      segmentIndex = 2;
    }
    
    // If we identified a finger and segment, animate it
    if (keypointIndices.length > 0) {
      const fromIndex = keypointIndices[segmentIndex];
      const toIndex = keypointIndices[segmentIndex + 1];
      
      // We need both points to create a direction
      if (fromIndex && toIndex && 
          currentKeypoints[fromIndex] && currentKeypoints[toIndex] && 
          initialKeypoints[fromIndex] && initialKeypoints[toIndex]) {
          
        // Create vectors from the keypoints
        const fromCurrent = new THREE.Vector3(
          currentKeypoints[fromIndex][0],
          currentKeypoints[fromIndex][1],
          currentKeypoints[fromIndex][2]
        );
        
        const toCurrent = new THREE.Vector3(
          currentKeypoints[toIndex][0],
          currentKeypoints[toIndex][1],
          currentKeypoints[toIndex][2]
        );
        
        const fromInitial = new THREE.Vector3(
          initialKeypoints[fromIndex][0],
          initialKeypoints[fromIndex][1],
          initialKeypoints[fromIndex][2]
        );
        
        const toInitial = new THREE.Vector3(
          initialKeypoints[toIndex][0],
          initialKeypoints[toIndex][1],
          initialKeypoints[toIndex][2]
        );
        
        // Calculate direction vectors
        const initialDir = new THREE.Vector3().subVectors(toInitial, fromInitial).normalize();
        const currentDir = new THREE.Vector3().subVectors(toCurrent, fromCurrent).normalize();
        
        // Calculate the rotation to align the initial direction with the current direction
        const rotationQuat = new THREE.Quaternion();
        
        // Only set the quaternion if both vectors are valid
        if (initialDir.lengthSq() > 0 && currentDir.lengthSq() > 0) {
          rotationQuat.setFromUnitVectors(initialDir, currentDir);
          
          // Apply rotation to the bone
          if (!bone.userData.initialQuaternion) {
            bone.userData.initialQuaternion = bone.quaternion.clone();
          }
          
          // Combine with original quaternion
          const finalQuat = new THREE.Quaternion().multiplyQuaternions(
            bone.userData.initialQuaternion,
            rotationQuat
          );
          
          bone.quaternion.copy(finalQuat);
          if (debug) console.log(`Applied rotation to finger bone: ${bone.name}`);
        } else if (debug) {
          console.log(`Invalid direction vectors for finger bone: ${bone.name}`);
        }
      } else if (debug) {
        console.log(`Missing keypoints for finger bone: ${bone.name} (${fromIndex}, ${toIndex})`);
      }
    } else if (debug) {
      console.log(`Couldn't determine finger type for bone: ${bone.name}`);
      }
        } catch (fingerError) {
        if (debug) console.error(`Error processing finger bone ${bone.name}:`, fingerError);
      }
    });
  } catch (handError) {
    console.error(`Error in hand pose application for ${side} hand:`, handError);
  }
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