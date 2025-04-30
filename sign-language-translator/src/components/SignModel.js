import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  loadKeypointsForWord, 
  createAnimationFromKeypoints,
  generateFallbackAnimation 
} from '../utils/animationUtils';
import './SignModel.css';

const SignModel = ({ word }) => {
  const mountRef = useRef(null);
  const [status, setStatus] = useState({
    loading: true,
    message: 'Loading 3D model...',
    error: null
  });
  const [debugMode, setDebugMode] = useState(false);

  // Three.js objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const mixerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const gridHelperRef = useRef(null);

  // References for keypoint visualization
  const keypointMarkersRef = useRef([]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Cleanup any existing setup to prevent duplicates
    if (rendererRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
      mountRef.current.removeChild(rendererRef.current.domElement);
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (sceneRef.current) {
      // Dispose of objects in the existing scene
      disposeScene(sceneRef.current);
    }

    // Create new scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50, 
      mountRef.current.clientWidth / mountRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 1.5, 3);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-1, 2, 2);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add a grid for reference
    const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Load 3D model
    loadModel();

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Update animation mixer
      if (mixerRef.current) {
        const delta = clockRef.current.getDelta();
        mixerRef.current.update(delta);
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Add debug method to window
    window.debug_3d_model = () => {
      setDebugMode(!debugMode);
      if (modelRef.current) {
        analyzeModel(modelRef.current);
      }
    };

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (rendererRef.current && mountRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }

      if (sceneRef.current) {
        disposeScene(sceneRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Helper function to dispose scene objects
  const disposeScene = (scene) => {
    scene.traverse(object => {
      if (object.isMesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  };

  // Load the 3D model
  const loadModel = () => {
    setStatus({
      loading: true,
      message: 'Loading 3D model...',
      error: null
    });

    const loader = new GLTFLoader();
    
    loader.load(
      '/models/sign_language.glb',
      (gltf) => {
        // Successfully loaded the model
        const model = gltf.scene;
        
        // Remove existing model if present
        if (modelRef.current && sceneRef.current) {
          sceneRef.current.remove(modelRef.current);
        }
        
        // Scale and position as needed
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, 0);
        
        // Enable shadows
        model.traverse(node => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        // Add to scene
        sceneRef.current.add(model);
        modelRef.current = model;
        
        // Setup animation mixer
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;
        
        setStatus({
          loading: false,
          message: 'Model loaded',
          error: null
        });
        
        if (debugMode) {
          analyzeModel(model);
        }
        
        // Play default animation if the model has animations
        if (gltf.animations && gltf.animations.length > 0) {
          console.log(`Model has ${gltf.animations.length} built-in animations`);
          playAnimation(gltf.animations);
        } else {
          // Create a default idle animation
          createAndPlayIdleAnimation();
        }
        
        // If a word is already set, try to animate it
        if (word) {
          animateWord(word);
        }
      },
      // Progress callback
      (xhr) => {
        const progress = Math.floor((xhr.loaded / xhr.total) * 100);
        setStatus({
          loading: true,
          message: `Loading 3D model: ${progress}%`,
          error: null
        });
      },
      // Error callback
      (error) => {
        console.error('Error loading model:', error);
        setStatus({
          loading: false,
          message: 'Failed to load model',
          error: error.message
        });
      }
    );
  };

  // Create a simple idle animation
  const createAndPlayIdleAnimation = () => {
    if (!modelRef.current || !mixerRef.current) return;
    
    // Find a skinned mesh with skeleton
    let skinnedMesh = null;
    modelRef.current.traverse(node => {
      if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
        skinnedMesh = node;
      }
    });
    
    if (!skinnedMesh || !skinnedMesh.skeleton) {
      console.warn('No suitable skeleton found for animation');
      return;
    }
    
    // Create a simple idle animation
    const bones = skinnedMesh.skeleton.bones;
    const tracks = [];
    const duration = 3; // 3 seconds
    
    // Find arm bones for animation
    const armBones = bones.filter(bone => 
      bone.name.includes('Arm') || 
      bone.name.includes('Hand') || 
      bone.name.includes('Shoulder')
    );
    
    if (armBones.length > 0) {
      // Create subtle breathing and arm movement
      armBones.forEach((bone) => {
        const boneIndex = bones.indexOf(bone);
        if (boneIndex === -1) return;
        
        // Different animation for each arm
        const isRight = bone.name.includes('Right');
        
        // Create subtle animation
        const times = [0, duration / 2, duration];
        let values;
        
        if (bone.name.includes('Shoulder')) {
          // Slight shoulder movement
          const q1 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, 0, 0)
          );
          const q2 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, 0, isRight ? -0.05 : 0.05)
          );
          
          values = [
            q1.x, q1.y, q1.z, q1.w,
            q2.x, q2.y, q2.z, q2.w,
            q1.x, q1.y, q1.z, q1.w
          ];
        } else if (bone.name.includes('Arm') && !bone.name.includes('Fore')) {
          // Upper arm slight movement
          const q1 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, 0, 0)
          );
          const q2 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(isRight ? 0.1 : -0.1, 0, 0)
          );
          
          values = [
            q1.x, q1.y, q1.z, q1.w,
            q2.x, q2.y, q2.z, q2.w,
            q1.x, q1.y, q1.z, q1.w
          ];
        } else if (bone.name.includes('Hand') || bone.name.includes('Wrist')) {
          // Subtle hand movement
          const q1 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, 0, 0)
          );
          const q2 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, 0, isRight ? 0.1 : -0.1)
          );
          
          values = [
            q1.x, q1.y, q1.z, q1.w,
            q2.x, q2.y, q2.z, q2.w,
            q1.x, q1.y, q1.z, q1.w
          ];
        } else {
          return; // Skip other bones
        }
        
        const trackName = `.bones[${boneIndex}].quaternion`;
        const track = new THREE.QuaternionKeyframeTrack(trackName, times, values);
        tracks.push(track);
      });
    }

    // Add subtle body movement
    const spineBones = bones.filter(bone => 
      bone.name.includes('Spine') || bone.name.includes('Hips')
    );
    
    if (spineBones.length > 0) {
      spineBones.forEach(bone => {
        const boneIndex = bones.indexOf(bone);
        if (boneIndex === -1) return;
        
        const times = [0, duration / 2, duration];
        const q1 = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, 0)
        );
        const q2 = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0.03, 0, 0)
        );
        
        const values = [
          q1.x, q1.y, q1.z, q1.w,
          q2.x, q2.y, q2.z, q2.w,
          q1.x, q1.y, q1.z, q1.w
        ];
        
        const trackName = `.bones[${boneIndex}].quaternion`;
        const track = new THREE.QuaternionKeyframeTrack(trackName, times, values);
        tracks.push(track);
      });
    }
    
    if (tracks.length === 0) {
      console.warn('Could not create default animation - no suitable bones found');
      return;
    }
    
    const clip = new THREE.AnimationClip('idle', duration, tracks);
    const action = mixerRef.current.clipAction(clip);
    action.setLoop(THREE.LoopRepeat);
    action.clampWhenFinished = false;
    action.play();
  };
  
  // Helper to analyze model structure for debugging
  const analyzeModel = (model) => {
    console.group('Model Analysis');
    
    // Find all meshes and bones
    const meshes = [];
    const bones = [];
    const skinnedMeshes = [];
    
    model.traverse(node => {
      if (node.isMesh) {
        meshes.push(node);
        if (node.isSkinnedMesh) {
          skinnedMeshes.push(node);
        }
      }
      if (node.isBone) {
        bones.push(node);
      }
    });
    
    console.log('Total meshes:', meshes.length);
    console.log('Skinned meshes:', skinnedMeshes.length);
    console.log('Bones:', bones.length);
    
    // Check if skinned meshes have skeletons
    if (skinnedMeshes.length > 0) {
      console.log('Skinned Mesh Details:');
      skinnedMeshes.forEach((mesh, i) => {
        console.log(`Mesh ${i+1}: ${mesh.name}`);
        console.log(`  Has skeleton: ${mesh.skeleton ? 'Yes' : 'No'}`);
        if (mesh.skeleton) {
          console.log(`  Bones in skeleton: ${mesh.skeleton.bones.length}`);
          console.log('  First 10 bone names:');
          mesh.skeleton.bones.slice(0, 10).forEach(bone => {
            console.log(`    - ${bone.name}`);
          });
        }
      });
    }
    
    console.groupEnd();
  };

  // Visualize keypoints for debugging
  const visualizeKeypoints = (keypointData) => {
    if (!sceneRef.current) return;
    
    // Remove any existing keypoint visualization
    removeKeypointVisualization();
    
    // Create materials for different keypoint types
    const materials = {
      pose: new THREE.MeshBasicMaterial({ color: 0xff0000 }), // Red
      leftHand: new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // Green
      rightHand: new THREE.MeshBasicMaterial({ color: 0x0000ff }), // Blue
      face: new THREE.MeshBasicMaterial({ color: 0xffff00 }) // Yellow
    };
    
    // Create a small sphere geometry for the points
    const geometry = new THREE.SphereGeometry(0.01, 8, 8);
    
    // Add points for each keypoint type
    Object.entries(keypointData).forEach(([type, points]) => {
      const material = materials[type] || materials.pose;
      
      if (!Array.isArray(points)) return;
      
      points.forEach((point, index) => {
        if (!Array.isArray(point) || point.length < 3) return;
        
        const [x, y, z] = point;
        const sphere = new THREE.Mesh(geometry, material);
        
        // Scale and position the point
        sphere.position.set(x * 0.01, y * 0.01, z * 0.01); // Scale factor may need adjustment
        
        // Add to scene
        sceneRef.current.add(sphere);
        keypointMarkersRef.current.push(sphere);
      });
    });
  };

  // Remove keypoint visualization
  const removeKeypointVisualization = () => {
    if (!sceneRef.current) return;
    
    keypointMarkersRef.current.forEach(marker => {
      sceneRef.current.remove(marker);
      if (marker.geometry) marker.geometry.dispose();
      if (marker.material) marker.material.dispose();
    });
    
    keypointMarkersRef.current = [];
  };

  // Play animation from loaded animations
  const playAnimation = (animations) => {
    if (!mixerRef.current || !animations || animations.length === 0) return;
    
    // Stop any current animations
    mixerRef.current.stopAllAction();
    
    // For now, just play the first animation
    const action = mixerRef.current.clipAction(animations[0]);
    action.reset().play();
  };

  // Main function to animate a word using OpenPose keypoint files
  const animateWord = async (word) => {
    if (!word || !mixerRef.current || !modelRef.current) return;
    
    console.log(`Animating word: "${word}"`);
    
    setStatus({
      loading: true,
      message: `Loading animation for "${word}"...`,
      error: null
    });
    
    try {
      // Find a skinned mesh with skeleton
      let skinnedMesh = null;
      modelRef.current.traverse(node => {
        if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
          skinnedMesh = node;
        }
      });
      
      if (!skinnedMesh) {
        throw new Error('No skeleton found in model');
      }

      // Load keypoint data 
      const keypointData = await loadKeypointsForWord(word);
      
      if (keypointData && keypointData.length > 0) {
        console.log(`Loaded ${keypointData.length} keypoint frames for "${word}"`);
        
        // For debugging - visualize the first frame
        if (debugMode && keypointData.length > 0) {
          visualizeKeypoints(keypointData[0]);
        }
        
        // Create animation clip from keypoints
        const animation = createAnimationFromKeypoints(keypointData, skinnedMesh.skeleton);
        
        if (animation) {
          // Stop any current animations
          mixerRef.current.stopAllAction();
          
          // Play the animation
          const action = mixerRef.current.clipAction(animation);
          action.setLoop(THREE.LoopRepeat, 2); // Play it twice
          action.clampWhenFinished = true;
          action.play();
          
          setStatus({
            loading: false,
            message: `Playing "${word}" animation from keypoints`,
            error: null
          });
          return;
        }
        
        throw new Error('Failed to create animation from keypoints');
      }
      
      throw new Error('No keypoint data loaded');
      
    } catch (error) {
      console.error(`Error animating "${word}":`, error);
      
      // Try to use a fallback animation
      try {
        let skinnedMesh = null;
        modelRef.current.traverse(node => {
          if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
            skinnedMesh = node;
          }
        });
        
        if (!skinnedMesh) {
          throw new Error('No skeleton found for fallback animation');
        }
        
        console.log(`Trying fallback animation for "${word}"`);
        const fallbackAnimation = generateFallbackAnimation(word, skinnedMesh.skeleton);
        
        if (fallbackAnimation) {
          // Stop any current animations
          mixerRef.current.stopAllAction();
          
          // Play the fallback animation
          const action = mixerRef.current.clipAction(fallbackAnimation);
          action.setLoop(THREE.LoopRepeat, 2); // Play it twice
          action.clampWhenFinished = true;
          action.play();
          
          setStatus({
            loading: false,
            message: `Playing fallback animation for "${word}"`,
            error: null
          });
          return;
        }
      } catch (fallbackError) {
        console.error('Fallback animation failed:', fallbackError);
      }
      
      // If all else fails, use the idle animation
      setStatus({
        loading: false,
        message: 'Using idle animation',
        error: `Could not animate "${word}": ${error.message}`
      });
      
      // Create and play idle animation
      createAndPlayIdleAnimation();
    }
  };

  // Effect to handle word changes
  useEffect(() => {
    if (word) {
      animateWord(word);
    }
  }, [word]);

  // Render the component
  return (
    <div className="sign-model" ref={mountRef}>
      {status.loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-message">{status.message}</div>
        </div>
      )}
      
      {status.error && (
        <div className="error-overlay">
          <div className="error-message">{status.message}: {status.error}</div>
        </div>
      )}
    </div>
  );
};

export default SignModel;