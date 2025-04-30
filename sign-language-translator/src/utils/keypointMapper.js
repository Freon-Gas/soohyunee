/**
 * Utility functions to map keypoints data to 3D model bones
 */
import * as THREE from 'three';

// Define the mapping between keypoint indices and bone names
// This needs to be customized based on your model's bone structure
// and the OpenPose keypoint format
const KEYPOINT_TO_BONE_MAP = {
  // Pose keypoints (based on OpenPose format)
  0: 'Head', // Nose
  1: 'Neck', 
  2: 'RightShoulder',
  3: 'RightArm',
  4: 'RightForeArm',
  5: 'LeftShoulder',
  6: 'LeftArm',
  7: 'LeftForeArm',
  8: 'RightHip',
  9: 'RightUpperLeg',
  10: 'RightLowerLeg',
  11: 'LeftHip', 
  12: 'LeftUpperLeg',
  13: 'LeftLowerLeg',
  14: 'RightEye',
  15: 'LeftEye',
  16: 'RightEar',
  17: 'LeftEar',

  // Hand keypoints - these will depend on the actual format
  // Right hand fingers
  'rightHand_0': 'RightHand', // Wrist
  'rightHand_1': 'RightHandThumb1',
  'rightHand_2': 'RightHandThumb2',
  'rightHand_3': 'RightHandThumb3',
  'rightHand_4': 'RightHandIndex1',
  'rightHand_5': 'RightHandIndex2',
  'rightHand_6': 'RightHandIndex3',
  // Add mappings for other fingers...

  // Left hand fingers
  'leftHand_0': 'LeftHand', // Wrist
  'leftHand_1': 'LeftHandThumb1',
  'leftHand_2': 'LeftHandThumb2',
  'leftHand_3': 'LeftHandThumb3',
  'leftHand_4': 'LeftHandIndex1',
  'leftHand_5': 'LeftHandIndex2',
  'leftHand_6': 'LeftHandIndex3',
  // Add mappings for other fingers...
};

// Alternative bone names (lowercase, with underscores, etc.)
const ALTERNATIVE_BONE_NAMES = {
  'Head': ['head', 'Head_Joint', 'head_joint', 'Neck1'],
  'Neck': ['neck', 'Neck_Joint', 'neck_joint', 'Neck0'],
  'RightShoulder': ['rightShoulder', 'Right_Shoulder', 'right_shoulder', 'RShoulderJoint'],
  'RightArm': ['rightArm', 'Right_Arm', 'right_arm', 'RArm'],
  'RightForeArm': ['rightForeArm', 'Right_ForeArm', 'right_forearm', 'RForearm'],
  'RightHand': ['rightHand', 'Right_Hand', 'right_hand', 'RHand'],
  'LeftShoulder': ['leftShoulder', 'Left_Shoulder', 'left_shoulder', 'LShoulderJoint'],
  'LeftArm': ['leftArm', 'Left_Arm', 'left_arm', 'LArm'],
  'LeftForeArm': ['leftForeArm', 'Left_ForeArm', 'left_forearm', 'LForearm'],
  'LeftHand': ['leftHand', 'Left_Hand', 'left_hand', 'LHand'],
};

/**
 * Find a bone by trying various naming conventions
 * @param {Object} skeleton - THREE.js skeleton
 * @param {String} boneName - Primary bone name to look for
 * @returns {Object|null} - The bone if found, or null
 */
function findBoneByVariantNames(skeleton, boneName) {
  // Try the exact name first
  let bone = skeleton.getBoneByName(boneName);
  if (bone) return bone;
  
  // Try alternative names
  const alternatives = ALTERNATIVE_BONE_NAMES[boneName] || [];
  for (const altName of alternatives) {
    bone = skeleton.getBoneByName(altName);
    if (bone) return bone;
  }
  
  return null;
}

/**
 * Maps keypoint data to bone rotations
 * @param {Array} keypointFrames - Array of keypoint frames
 * @param {Object} skeleton - THREE.js skeleton from the model
 * @returns {Object} - Animation data for Three.js
 */
export function mapKeypointsToSkeleton(keypointFrames, skeleton) {
  console.log('Mapping keypoints to skeleton:', { frames: keypointFrames.length });
  
  if (!keypointFrames || keypointFrames.length === 0) {
    console.warn('No keypoint frames provided');
    return null;
  }

  // Analyze the skeleton to understand its structure
  console.log('Analyzing skeleton structure...');
  const bonesByName = new Map();
  
  skeleton.bones.forEach(bone => {
    bonesByName.set(bone.name, bone);
  });

  console.log('Skeleton bones:', Array.from(bonesByName.keys()).join(', '));

  // Create a single frame of keyframes for the animation
  // For each keypoint, we'll calculate the appropriate bone rotation
  const keyframeData = {
    duration: 2, // 2 seconds animation duration
    tracks: []
  };

  // Process the first frame of keypoints (for simplicity)
  // In a real implementation, you'd process multiple frames for a complete animation
  const frame = keypointFrames[0];
  
  // Process body keypoints
  if (frame.pose && frame.pose.length > 0) {
    processBodyKeypoints(frame.pose, skeleton, bonesByName, keyframeData);
  }
  
  // Process hand keypoints
  if (frame.leftHand && frame.leftHand.length > 0) {
    processHandKeypoints(frame.leftHand, skeleton, bonesByName, keyframeData, 'left');
  }
  
  if (frame.rightHand && frame.rightHand.length > 0) {
    processHandKeypoints(frame.rightHand, skeleton, bonesByName, keyframeData, 'right');
  }
  
  console.log(`Created ${keyframeData.tracks.length} animation tracks`);
  
  // If no tracks were created, create a simple test animation
  if (keyframeData.tracks.length === 0) {
    console.log('No keypoint tracks created, generating test animation');
    createTestAnimation(skeleton, keyframeData);
  }
  
  return keyframeData;
}

/**
 * Process body keypoints to create animation tracks
 */
function processBodyKeypoints(poseKeypoints, skeleton, bonesByName, keyframeData) {
  // For each relevant keypoint, calculate bone rotations
  // This is a simplified approach - full implementation would use proper IK techniques
  
  // Find connections between keypoints that correspond to bones
  const connections = [
    // Torso
    { start: 1, end: 0, boneName: 'Neck' }, // Neck to Nose
    { start: 1, end: 2, boneName: 'RightShoulder' }, // Neck to Right Shoulder
    { start: 1, end: 5, boneName: 'LeftShoulder' }, // Neck to Left Shoulder
    
    // Right Arm
    { start: 2, end: 3, boneName: 'RightArm' }, // Right Shoulder to Right Elbow
    { start: 3, end: 4, boneName: 'RightForeArm' }, // Right Elbow to Right Wrist
    
    // Left Arm
    { start: 5, end: 6, boneName: 'LeftArm' }, // Left Shoulder to Left Elbow
    { start: 6, end: 7, boneName: 'LeftForeArm' } // Left Elbow to Left Wrist
  ];
  
  connections.forEach(conn => {
    if (poseKeypoints[conn.start] && poseKeypoints[conn.end]) {
      // Try to find the bone with various naming conventions
      const bone = findBoneByVariantNames(skeleton, conn.boneName);
      
      if (!bone) {
        console.warn(`Bone not found: ${conn.boneName} (also tried variants)`);
        return;
      }
      
      const startPoint = new THREE.Vector3(
        poseKeypoints[conn.start][0],
        poseKeypoints[conn.start][1],
        poseKeypoints[conn.start][2]
      );
      
      const endPoint = new THREE.Vector3(
        poseKeypoints[conn.end][0],
        poseKeypoints[conn.end][1],
        poseKeypoints[conn.end][2]
      );
      
      // Calculate direction vector between points
      const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
      
      // Create a quaternion that rotates from the bone's natural direction to the keypoint direction
      // This is a simplified approach - may need adjustments based on model orientation
      const boneIndex = skeleton.bones.indexOf(bone);
      
      if (boneIndex !== -1) {
        // Create from/to vectors for rotation
        // The "from" vector depends on the default bone orientation in your model
        // You may need to adjust these based on your model's rest pose
        let fromVector = new THREE.Vector3(1, 0, 0); // Default forward direction
        
        // Adjust based on bone type
        if (conn.boneName.includes('Arm')) {
          fromVector.set(1, 0, 0);
        } else if (conn.boneName.includes('Leg')) {
          fromVector.set(0, -1, 0);
        } else if (conn.boneName.includes('Spine') || conn.boneName.includes('Neck')) {
          fromVector.set(0, 1, 0);
        }
        
        // Create quaternion for rotation
        const quaternion = new THREE.Quaternion().setFromUnitVectors(fromVector, direction);
        
        // Add a track for this bone
        const times = [0, keyframeData.duration]; // Start and end times
        const values = [
          quaternion.x, quaternion.y, quaternion.z, quaternion.w,
          quaternion.x, quaternion.y, quaternion.z, quaternion.w  // Same value at end time
        ];
        
        const trackName = `.bones[${boneIndex}].quaternion`;
        const track = {
          name: trackName,
          times: times,
          values: values,
          type: 'quaternion'
        };
        
        keyframeData.tracks.push(track);
      }
    }
  });
}

/**
 * Process hand keypoints to create animation tracks
 */
function processHandKeypoints(handKeypoints, skeleton, bonesByName, keyframeData, side) {
  // This is a simplified implementation
  // A full implementation would map each finger joint correctly
  
  // Find the wrist and create hand rotations
  const prefix = side === 'left' ? 'Left' : 'Right';
  const wristBoneName = `${prefix}Hand`;
  
  // Try to find the bone with various naming conventions
  const wristBone = findBoneByVariantNames(skeleton, wristBoneName);
  
  if (!wristBone) {
    console.warn(`Wrist bone not found: ${wristBoneName} (also tried variants)`);
    return;
  }
  
  // Calculate a general hand rotation based on finger positions
  // This is very simplified - proper hand animation would require detailed finger mapping
  if (handKeypoints.length >= 5) { // Need at least a few keypoints
    // Get thumb and index finger positions for a basic hand orientation
    const wristPos = new THREE.Vector3(handKeypoints[0][0], handKeypoints[0][1], handKeypoints[0][2]);
    const thumbPos = handKeypoints.length > 1 ? 
      new THREE.Vector3(handKeypoints[1][0], handKeypoints[1][1], handKeypoints[1][2]) : 
      wristPos.clone().add(new THREE.Vector3(0, 0.1, 0));
    
    const indexPos = handKeypoints.length > 5 ? 
      new THREE.Vector3(handKeypoints[5][0], handKeypoints[5][1], handKeypoints[5][2]) : 
      wristPos.clone().add(new THREE.Vector3(0.1, 0, 0));
    
    // Calculate palm direction and orientation
    const palmDirection = new THREE.Vector3().subVectors(
      new THREE.Vector3().addVectors(thumbPos, indexPos).multiplyScalar(0.5),
      wristPos
    ).normalize();
    
    const thumbDirection = new THREE.Vector3().subVectors(thumbPos, wristPos).normalize();
    
    // Create a coordinate system for the hand
    const xAxis = palmDirection;
    const zAxis = new THREE.Vector3().crossVectors(thumbDirection, palmDirection).normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
    
    // Create rotation matrix from these axes
    const rotationMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
    
    // Add a track for the wrist bone
    const boneIndex = skeleton.bones.indexOf(wristBone);
    if (boneIndex !== -1) {
      const times = [0, keyframeData.duration]; // Start and end times
      const values = [
        quaternion.x, quaternion.y, quaternion.z, quaternion.w,
        quaternion.x, quaternion.y, quaternion.z, quaternion.w  // Same value at end time
      ];
      
      const trackName = `.bones[${boneIndex}].quaternion`;
      const track = {
        name: trackName,
        times: times,
        values: values,
        type: 'quaternion'
      };
      
      keyframeData.tracks.push(track);
    }
  }
}

/**
 * Create a test animation in case keypoint mapping fails
 * @param {Object} skeleton - THREE.js skeleton
 * @param {Object} keyframeData - Animation data to populate
 */
function createTestAnimation(skeleton, keyframeData) {
  console.log('Creating test animation for example word');
  
  // Find key bones for a simple waving animation
  const boneNamesToAnimate = [
    'RightShoulder', 'RightArm', 'RightForeArm',
    'LeftShoulder', 'LeftArm', 'LeftForeArm'
  ];
  
  const bonesToAnimate = [];
  
  // Find bones by name including variants
  boneNamesToAnimate.forEach(boneName => {
    const bone = findBoneByVariantNames(skeleton, boneName);
    if (bone) {
      bonesToAnimate.push({
        name: boneName,
        bone: bone,
        index: skeleton.bones.indexOf(bone)
      });
    }
  });
  
  if (bonesToAnimate.length === 0) {
    console.warn('Could not find any suitable bones for test animation');
    return;
  }
  
  // Create a simple waving animation
  bonesToAnimate.forEach(boneInfo => {
    if (boneInfo.name.includes('RightShoulder')) {
      // Shoulder movement
      const times = [0, 0.5, 1, 1.5, keyframeData.duration];
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.2));
      
      const values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
      
      keyframeData.tracks.push({
        name: `.bones[${boneInfo.index}].quaternion`,
        times: times,
        values: values,
        type: 'quaternion'
      });
    } else if (boneInfo.name.includes('RightArm')) {
      // Arm movement
      const times = [0, 0.5, 1, 1.5, keyframeData.duration];
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.7, 0, 0));
      
      const values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
      
      keyframeData.tracks.push({
        name: `.bones[${boneInfo.index}].quaternion`,
        times: times,
        values: values,
        type: 'quaternion'
      });
    } else if (boneInfo.name.includes('RightForeArm')) {
      // Forearm movement
      const times = [0, 0.5, 1, 1.5, keyframeData.duration];
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0));
      
      const values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];
      
      keyframeData.tracks.push({
        name: `.bones[${boneInfo.index}].quaternion`,
        times: times,
        values: values,
        type: 'quaternion'
      });
    }
  });
  
  console.log(`Created ${keyframeData.tracks.length} test animation tracks`);
}

/**
 * Create a THREE.js Animation Clip from processed keyframe data
 * @param {Object} keyframeData - Processed keyframe data
 * @returns {THREE.AnimationClip} - Animation clip ready to play
 */
export function createAnimationClip(keyframeData) {
  if (!keyframeData || !keyframeData.tracks || keyframeData.tracks.length === 0) {
    console.warn('No valid keyframe data provided');
    return null;
  }
  
  const tracks = keyframeData.tracks.map(track => {
    switch (track.type) {
      case 'quaternion':
        return new THREE.QuaternionKeyframeTrack(
          track.name,
          track.times,
          track.values
        );
      // Add cases for other track types if needed
      default:
        return null;
    }
  }).filter(track => track !== null);
  
  if (tracks.length === 0) {
    console.warn('No valid tracks created');
    return null;
  }
  
  return new THREE.AnimationClip(
    'KeypointAnimation',
    keyframeData.duration,
    tracks
  );
}
