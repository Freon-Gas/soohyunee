  const animateWord = async (word) => {
    if (!word || !modelRef.current) return;
    
    console.log(`Animating word: "${word}"`);
    
    setStatus({
      loading: true,
      message: `Loading animation for "${word}"...`,
      error: null
    });
    
    // Stop any running animations
    stopAnimation();
    
    try {
      // Import the sign language mapper utilities
      const { hasKeypointData, getFallbackAnimation } = await import('../utils/signLanguageMapper');
      
      // Check if we have a fallback animation for this word
      const fallbackAnimation = getFallbackAnimation(word);
      
      // For known words, directly apply the corresponding pose if not using keypoints
      if (!debugMode && fallbackAnimation) {
        directlyRotateBones(fallbackAnimation);
        setStatus({
          loading: false,
          message: `Showing pose for "${word}"`,
          error: null
        });
        return;
      }
      
      // Try to load and animate using OpenPose keypoints
      const frames = await loadKeypointsForWord(word);
      
      if (frames && frames.length > 0) {
        console.log(`Successfully loaded ${frames.length} keypoint frames for "${word}"`);
        
        // Store the frames for animation
        animationFramesRef.current = frames;
        currentFrameRef.current = 0;
        
        // Find a skinned mesh for animation
        let skinnedMesh = null;
        modelRef.current.traverse(node => {
          if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
            skinnedMesh = node;
          }
        });
        
        if (skinnedMesh) {
          // Set up animation mixer if not already created
          if (!mixerRef.current) {
            mixerRef.current = new THREE.AnimationMixer(skinnedMesh);
          }
          
          // Stop any current animations
          mixerRef.current.stopAllAction();
          
          // Show keypoints for first frame if debug mode is enabled
          if (debugMode && showKeypointsMode) {
            visualizeKeypoints(frames[0]);
          }
          
          // Start animation using the improved system
          startAnimation(frames);
          
          setStatus({
            loading: false,
            message: `Animating "${word}" using keypoints`,
            error: null
          });
          return;
        }
      }
      
      // If keypoints couldn't be loaded, use fallback animations
      console.log(`Using fallback animation for "${word}"`);
      
      // Try to directly manipulate bones based on known sign patterns or fallback to natural
      if (fallbackAnimation) {
        directlyRotateBones(fallbackAnimation);
      } else {
        directlyRotateBones('natural');
      }
      
      setStatus({
        loading: false,
        message: `Showing pose for "${word}"`,
        error: null
      });
      
    } catch (error) {
      console.error(`Error animating "${word}":`, error);
      
      // If all else fails, reset to default pose
      setStatus({
        loading: false,
        message: 'Showing default pose',
        error: `Could not animate "${word}": ${error.message}`
      });
      
      // Reset to default pose
      directlyRotateBones('natural');
    }
  };
    if (!word || !modelRef.current) return;
    
    console.log(`Animating word: "${word}"`);
    
    setStatus({
      loading: true,
      message: `Loading animation for "${word}"...`,
      error: null
    });
    
    // Stop any running animations
    stopAnimation();
    
    try {
      // For known words, directly apply the corresponding pose if not using keypoints
      if (!debugMode && word === '사과') {
        directlyRotateBones('apple');
        setStatus({
          loading: false,
          message: `Showing pose for "${word}"`,
          error: null
        });
        return;
      } else if (!debugMode && word === '안녕') {
        directlyRotateBones('greeting');
        setStatus({
          loading: false,
          message: `Showing pose for "${word}"`,
          error: null
        });
        return;
      }
      
      // Try to load and animate using OpenPose keypoints
      const frames = await loadKeypointsForWord(word);
      
      if (frames && frames.length > 0) {
        console.log(`Successfully loaded ${frames.length} keypoint frames for "${word}"`);
        
        // Store the frames for animation
        animationFramesRef.current = frames;
        currentFrameRef.current = 0;
        
        // Find a skinned mesh for animation
        let skinnedMesh = null;
        modelRef.current.traverse(node => {
          if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
            skinnedMesh = node;
          }
        });
        
        if (skinnedMesh) {
          // Set up animation mixer if not already created
          if (!mixerRef.current) {
            mixerRef.current = new THREE.AnimationMixer(skinnedMesh);
          }
          
          // Stop any current animations
          mixerRef.current.stopAllAction();
          
          // Show keypoints for first frame if debug mode is enabled
          if (debugMode && showKeypointsMode) {
          visualizeKeypoints(frames[0]);
          }
          
          // Start animation using the improved system
          startAnimation(frames);
          
          setStatus({
            loading: false,
            message: `Animating "${word}" using keypoints`,
            error: null
          });
          return;
        }
      }
      
      // If keypoints couldn't be loaded, use fallback animations
      console.log(`Using fallback animation for "${word}"`);
      
      // Try to directly manipulate bones based on known sign patterns
      if (word === '사과') {
        directlyRotateBones('apple');
      } else if (word === '안녕') {
        directlyRotateBones('greeting');
      } else {
        directlyRotateBones('natural');
      }
      
      setStatus({
        loading: false,
        message: `Showing pose for "${word}"`,
        error: null
      });
      
    } catch (error) {
      console.error(`Error animating "${word}":`, error);
      
      // If all else fails, reset to default pose
      setStatus({
        loading: false,
        message: 'Showing default pose',
        error: `Could not animate "${word}": ${error.message}`
      });
      
      // Reset to default pose
      directlyRotateBones('natural');
    }
  };

  // Start animation for a sequence of frames
  const startAnimation = (frames) => {
    if (!frames || frames.length === 0 || !modelRef.current) return;
    
    console.log(`Starting animation with ${frames.length} frames`);
    
    // Reset current frame counter
    currentFrameRef.current = 0;
    
    // Store frames for animation
    animationFramesRef.current = frames;
    
    // Initialize lastUpdateTime
    animationFramesRef.current.lastUpdateTime = performance.now();
    
    // Set animation state to running
    isAnimatingRef.current = true;
  };
  
  // Stop the animation
  const stopAnimation = () => {
    isAnimatingRef.current = false;
    
    // Remove keypoint visualization
    if (showKeypointsMode) {
      removeKeypointVisualization();
    }
  };

  // Effect to handle word changes
  useEffect(() => {
    if (word) {
      // Stop any running animation before starting a new one
      stopAnimation();
      animateWord(word);
    }
    
    // Cleanup function to stop animation when component unmounts or word changes
    return () => {
      stopAnimation();
    };
  }, [word]);
  const startAnimation = (frames) => {
    if (!frames || frames.length === 0 || !modelRef.current) return;
    
    console.log(`Starting animation with ${frames.length} frames`);
    
    // Reset current frame counter
    currentFrameRef.current = 0;
    
    // Store frames for animation
    animationFramesRef.current = frames;
    
    // Initialize lastUpdateTime
    animationFramesRef.current.lastUpdateTime = performance.now();
    
    // Set animation state to running
    isAnimatingRef.current = true;
  };
  
  // Stop the animation
  const stopAnimation = () => {
    isAnimatingRef.current = false;
    
    // Remove keypoint visualization
    if (showKeypointsMode) {
      removeKeypointVisualization();
    }
  };

  // Effect to handle word changes
  useEffect(() => {
    if (word) {
      // Stop any running animation before starting a new one
      stopAnimation();
      animateWord(word);
    }
    
    // Cleanup function to stop animation when component unmounts or word changes
    return () => {
      stopAnimation();
    };
  }, [word]);

  // Process the next frame in the animation
  const animateNextFrame = () => {
    if (!isAnimatingRef.current || !animationFramesRef.current || !modelRef.current) return;
    
    // Get the current time
    const currentTime = performance.now();
    
    // Calculate elapsed time since last frame update
    const elapsed = currentTime - (animationFramesRef.current.lastUpdateTime || 0);
    
    // Calculate desired frame duration (in milliseconds)
    const frameDuration = (1000 / 30) / animationSpeedRef.current;
    
    // Only update frame if enough time has passed
    if (elapsed >= frameDuration) {
      // Get current frame index
      const frameIndex = currentFrameRef.current;
      
      // Find skinned mesh with skeleton
      let skinnedMesh = null;
      modelRef.current.traverse(node => {
        if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
          skinnedMesh = node;
        }
      });
      
      if (skinnedMesh && skinnedMesh.skeleton) {
        // Apply current frame's keypoints to skeleton using improved animation system
        applyKeypointFrameToModel(
          animationFramesRef.current,
          skinnedMesh.skeleton,
          frameIndex,
          {
            debug: debugMode,
            scaleFactor: 0.01,
            rotationInfluence: 1.0
          }
        );
        
        // Show keypoints visualization if enabled
        if (showKeypointsMode) {
          visualizeKeypoints(animationFramesRef.current[frameIndex]);
        }
        
        // Store last update time
        animationFramesRef.current.lastUpdateTime = currentTime;
        
        // Advance to next frame (with looping)
        currentFrameRef.current = (frameIndex + 1) % animationFramesRef.current.length;
      }
    }
  };import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  loadKeypointsForWord, 
  applyKeypointFrameToModel
} from '../utils/improvedAnimationUtils';
import './SignModel.css';

const SignModel = ({ word, debug = false, showKeypoints = false }) => {
  const mountRef = useRef(null);
  const [status, setStatus] = useState({
    loading: true,
    message: 'Loading 3D model...',
    error: null
  });
  const [debugMode, setDebugMode] = useState(debug);
  const [showKeypointsMode, setShowKeypointsMode] = useState(showKeypoints);

  // Update debug mode when props change
  useEffect(() => {
    setDebugMode(debug);
  }, [debug]);
  
  // Update showKeypoints mode when props change
  useEffect(() => {
    setShowKeypointsMode(showKeypoints);
  }, [showKeypoints]);

  // Three.js objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const mixerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const idleAnimationRef = useRef(null); // For idle animation
  const clockRef = useRef(new THREE.Clock());
  const gridHelperRef = useRef(null);

  // Animation state
  const animationFramesRef = useRef(null);
  const currentFrameRef = useRef(0);
  const animationSpeedRef = useRef(1.0);
  const keypointMarkersRef = useRef([]);
  const isAnimatingRef = useRef(false);

  // Debug controls
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
    if (modelRef.current) {
      analyzeModel(modelRef.current);
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    console.log('Initializing 3D scene...');
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
    
    console.log('Setting up 3D scene...');
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
      
      // For custom frame-by-frame animation
      if (isAnimatingRef.current && animationFramesRef.current) {
        animateNextFrame();
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

    // Add debug methods to window
    window.debug_3d_model = () => {
      setDebugMode(!debugMode);
      if (modelRef.current) {
        analyzeModel(modelRef.current);
      }
    };
    
    // Add pose test functions to window
    window.test_3d_pose = (poseType) => {
      directlyRotateBones(poseType);
    };
    
    // For backward compatibility
    window.test_3d_tpose = () => {
      directlyRotateBones('reset');
    };

    // Cleanup
    return () => {
      console.log('Cleaning up 3D model and scene...');
      window.removeEventListener('resize', handleResize);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Stop idle animation
      if (idleAnimationRef.current) {
        cancelAnimationFrame(idleAnimationRef.current);
      }

      // Clear any ongoing animations
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
      
      // Remove keypoint visualization
      removeKeypointVisualization();

      if (rendererRef.current && mountRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }

      if (sceneRef.current) {
        disposeScene(sceneRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      // Clear debug window methods
      window.debug_3d_model = undefined;
      window.test_3d_pose = undefined;
      window.test_3d_tpose = undefined;
      
      // Clear stored references
      modelRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      mixerRef.current = null;
      sceneRef.current = null;
      
      console.log('Cleanup complete');
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
  // Create and play a simple idle animation
  const createAndPlayIdleAnimation = () => {
    if (!modelRef.current) return;
    
    // Find a skinned mesh with skeleton
    let skinnedMesh = null;
    modelRef.current.traverse(node => {
      if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
        skinnedMesh = node;
      }
    });
    
    if (!skinnedMesh || !skinnedMesh.skeleton) {
      console.warn('No suitable skeleton found for idle animation');
      return;
    }
    
    // Create a simple idle animation for the shoulders, arms, and head
    const bones = skinnedMesh.skeleton.bones;
    
    // Find key bones for the idle animation
    const rightShoulderBone = bones.find(bone => bone.name.toLowerCase().includes('right') && bone.name.toLowerCase().includes('shoulder'));
    const leftShoulderBone = bones.find(bone => bone.name.toLowerCase().includes('left') && bone.name.toLowerCase().includes('shoulder'));
    const headBone = bones.find(bone => bone.name.toLowerCase().includes('head'));
    
    // Simple animation that loops
    const idleAnimate = () => {
      // Cancel any existing animation
      if (idleAnimationRef.current) {
        cancelAnimationFrame(idleAnimationRef.current);
      }
      
      // Only animate if we're not currently playing a sign animation
      if (!isAnimatingRef.current && rightShoulderBone && leftShoulderBone) {
        const time = performance.now() / 1000;
        
        // Subtle shoulder movement for breathing
        if (rightShoulderBone) {
          rightShoulderBone.rotation.z = Math.sin(time * 0.5) * 0.02 - 0.05;
          rightShoulderBone.rotation.y = Math.sin(time * 0.3) * 0.01;
        }
        
        if (leftShoulderBone) {
          leftShoulderBone.rotation.z = Math.sin(time * 0.5) * 0.02 + 0.05;
          leftShoulderBone.rotation.y = Math.sin(time * 0.3) * 0.01;
        }
        
        // Subtle head movement
        if (headBone) {
          headBone.rotation.y = Math.sin(time * 0.2) * 0.05;
          headBone.rotation.z = Math.sin(time * 0.3) * 0.02;
        }
        
        // Update the skeleton
        skinnedMesh.skeleton.update();
      }
      
      // Continue the animation loop
      idleAnimationRef.current = requestAnimationFrame(idleAnimate);
    };
    
    // Start the idle animation
    idleAnimate();
  };

  const loadModel = () => {
    console.log('Loading 3D model...');
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
        console.log('Model loaded successfully!');
        
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
        
        // Find a skinned mesh for animation
        let skinnedMesh = null;
        model.traverse(node => {
          if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
            skinnedMesh = node;
            console.log('Found skinned mesh for animation:', node.name);
          }
        });
        
        // Setup animation mixer with the appropriate target
        const mixer = skinnedMesh ? new THREE.AnimationMixer(skinnedMesh) : new THREE.AnimationMixer(model);
        mixerRef.current = mixer;
        
        setStatus({
          loading: false,
          message: 'Model loaded',
          error: null
        });
        
        // Always analyze the model to help with debugging
        analyzeModel(model);
        
        // Apply a natural default pose instead of T-pose
        directlyRotateBones('natural');
        
        // Play default animation if the model has animations
        if (gltf.animations && gltf.animations.length > 0) {
          console.log(`Model has ${gltf.animations.length} built-in animations`);
          playAnimation(gltf.animations);
        } else {
          console.log('Model has no built-in animations, creating idle animation');
          // Create a default idle animation
          createAndPlayIdleAnimation();
        }
        
        // If a word is already set, try to animate it
        if (word) {
          console.log(`Animating initial word: "${word}"`);
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
          
          // Print ALL bone names for comprehensive debugging
          console.log('  All bone names:');
          const allBoneNames = mesh.skeleton.bones.map(bone => bone.name);
          console.log(allBoneNames);
          
          // Group bones by category for easier analysis
          const armBones = mesh.skeleton.bones.filter(bone => 
            bone.name.toLowerCase().includes('arm') || 
            bone.name.toLowerCase().includes('hand') || 
            bone.name.toLowerCase().includes('shoulder')
          ).map(bone => bone.name);
          
          const spineBones = mesh.skeleton.bones.filter(bone => 
            bone.name.toLowerCase().includes('spine') || 
            bone.name.toLowerCase().includes('neck') || 
            bone.name.toLowerCase().includes('head')
          ).map(bone => bone.name);
          
          // Print hierarchy for better understanding
          console.log('Bone Hierarchy:');
          const rootBones = mesh.skeleton.bones.filter(bone => !bone.parent || !bone.parent.isBone);
          rootBones.forEach(bone => {
            printBoneHierarchy(bone, 0);
          });
          
          console.log('  Arm/hand bones:', armBones);
          console.log('  Spine/neck/head bones:', spineBones);
        }
      });
    }
    
    console.groupEnd();
  };
  
  // Helper function to print bone hierarchy
  const printBoneHierarchy = (bone, level) => {
    const indent = '  '.repeat(level);
    console.log(`${indent}${bone.name}`);
    bone.children.forEach(child => {
      if (child.isBone) {
        printBoneHierarchy(child, level + 1);
      }
    });
  };

  // Process the next frame in the animation
  const animateNextFrame = () => {
    if (!isAnimatingRef.current || !animationFramesRef.current || !modelRef.current) return;
    
    // Get the current time
    const currentTime = performance.now();
    
    // Calculate elapsed time since last frame update
    const elapsed = currentTime - (animationFramesRef.current.lastUpdateTime || 0);
    
    // Calculate desired frame duration (in milliseconds)
    const frameDuration = (1000 / 30) / animationSpeedRef.current;
    
    // Only update frame if enough time has passed
    if (elapsed >= frameDuration) {
      // Get current frame index
      const frameIndex = currentFrameRef.current;
      
      // Find skinned mesh with skeleton
      let skinnedMesh = null;
      modelRef.current.traverse(node => {
        if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
          skinnedMesh = node;
        }
      });
      
      if (skinnedMesh && skinnedMesh.skeleton) {
        // Apply current frame's keypoints to skeleton using improved animation system
        applyKeypointFrameToModel(
          animationFramesRef.current,
          skinnedMesh.skeleton,
          frameIndex,
          {
            debug: debugMode,
            scaleFactor: 0.01,
            rotationInfluence: 1.0
          }
        );
        
        // Show keypoints visualization if enabled
        if (showKeypointsMode) {
          visualizeKeypoints(animationFramesRef.current[frameIndex]);
        }
        
        // Store last update time
        animationFramesRef.current.lastUpdateTime = currentTime;
        
        // Advance to next frame (with looping)
        currentFrameRef.current = (frameIndex + 1) % animationFramesRef.current.length;
      }
    }
  }; = mesh.skeleton.bones.filter(bone => 
            bone.name.toLowerCase().includes('spine') || 
            bone.name.toLowerCase().includes('neck') || 
            bone.name.toLowerCase().includes('head')
          ).map(bone => bone.name);
          
          // Print hierarchy for better understanding
          console.log('Bone Hierarchy:');
          const rootBones = mesh.skeleton.bones.filter(bone => !bone.parent || !bone.parent.isBone);
          rootBones.forEach(bone => {
            printBoneHierarchy(bone, 0);
          });
          
          console.log('  Arm/hand bones:', armBones);
          console.log('  Spine/neck/head bones:', spineBones);
        }
      });
    }
    
    console.groupEnd();
  };
  
  // Helper function to print bone hierarchy
  const printBoneHierarchy = (bone, level) => {
    const indent = '  '.repeat(level);
    console.log(`${indent}${bone.name}`);
    bone.children.forEach(child => {
      if (child.isBone) {
        printBoneHierarchy(child, level + 1);
      }
    });
  };

  // Process the next frame in the animation
  const animateNextFrame = () => {
    if (!isAnimatingRef.current || !animationFramesRef.current || !modelRef.current) return;
    
    // Get the current time
    const currentTime = performance.now();
    
    // Calculate elapsed time since last frame update
    const elapsed = currentTime - (animationFramesRef.current.lastUpdateTime || 0);
    
    // Calculate desired frame duration (in milliseconds)
    const frameDuration = (1000 / 30) / animationSpeedRef.current;
    
    // Only update frame if enough time has passed
    if (elapsed >= frameDuration) {
      // Get current frame index
      const frameIndex = currentFrameRef.current;
      
      // Find skinned mesh with skeleton
      let skinnedMesh = null;
      modelRef.current.traverse(node => {
        if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
          skinnedMesh = node;
        }
      });
      
      if (skinnedMesh && skinnedMesh.skeleton) {
        // Apply current frame's keypoints to skeleton using improved animation system
        applyKeypointFrameToModel(
          animationFramesRef.current,
          skinnedMesh.skeleton,
          frameIndex,
          {
            debug: debugMode,
            scaleFactor: 0.01,
            rotationInfluence: 1.0
          }
        );
        
        // Show keypoints visualization if enabled
        if (showKeypointsMode) {
          visualizeKeypoints(animationFramesRef.current[frameIndex]);
        }
        
        // Store last update time
        animationFramesRef.current.lastUpdateTime = currentTime;
        
        // Advance to next frame (with looping)
        currentFrameRef.current = (frameIndex + 1) % animationFramesRef.current.length;
      }
    }
  };

  // Visualize keypoints for debugging
  const visualizeKeypoints = (keypointData) => {
    if (!sceneRef.current) return;
    
    console.log('Visualizing keypoints...');
    
    // Remove any existing keypoint visualization
    removeKeypointVisualization();
    
    if (!keypointData) {
      console.warn('No keypoint data provided for visualization');
      return;
    }
    
    // Create materials for different keypoint types
    const materials = {
      pose: new THREE.MeshBasicMaterial({ color: 0xff0000 }), // Red
      leftHand: new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // Green
      rightHand: new THREE.MeshBasicMaterial({ color: 0x0000ff }), // Blue
      face: new THREE.MeshBasicMaterial({ color: 0xffff00 }) // Yellow
    };
    
    // Create a small sphere geometry for the points
    const geometry = new THREE.SphereGeometry(0.05, 8, 8); // Larger spheres (0.05 instead of 0.01)
    
    // Add points for each keypoint type
    Object.entries(keypointData).forEach(([type, points]) => {
      const material = materials[type] || materials.pose;
      
      if (!Array.isArray(points)) {
        console.warn(`Invalid keypoint format for type ${type}:`, points);
        return;
      }
      
      console.log(`Adding ${points.length} keypoints for type: ${type}`);
      
      points.forEach((point, index) => {
        if (!Array.isArray(point) || point.length < 3) {
          console.warn(`Invalid keypoint at index ${index} for type ${type}:`, point);
          return;
        }
        
        const [x, y, z] = point;
        const sphere = new THREE.Mesh(geometry, material);
        
        // Scale and position the point - adjust scaling factor as needed for your model
        const scaleFactor = 0.01; // Scaling factor for visualizing keypoints
        sphere.position.set(x * scaleFactor, y * scaleFactor, z * scaleFactor);
        
        // Add to scene
        sceneRef.current.add(sphere);
        keypointMarkersRef.current.push(sphere);
      });
    });
    
    // Draw lines between connected keypoints for body pose
    if (keypointData.pose && keypointData.pose.length >= 25) {
      const connections = [
        // Torso
        [1, 8], // Neck to MidHip
        [1, 2], // Neck to RShoulder
        [1, 5], // Neck to LShoulder
        [2, 3], // RShoulder to RElbow
        [3, 4], // RElbow to RWrist
        [5, 6], // LShoulder to LElbow
        [6, 7], // LElbow to LWrist
        [0, 1], // Nose to Neck
        [0, 15], // Nose to REye
        [0, 16], // Nose to LEye
        [15, 17], // REye to REar
        [16, 18]  // LEye to LEar
      ];
      
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      
      connections.forEach(([fromIdx, toIdx]) => {
        if (!keypointData.pose[fromIdx] || !keypointData.pose[toIdx]) {
          console.warn(`Connection points ${fromIdx}-${toIdx} not available`);
          return;
        }
        
        const from = keypointData.pose[fromIdx];
        const to = keypointData.pose[toIdx];
        
        if (!Array.isArray(from) || !Array.isArray(to) || from.length < 3 || to.length < 3) {
          console.warn(`Invalid connection points ${fromIdx}-${toIdx}:`, from, to);
          return;
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(from[0] * 0.01, from[1] * 0.01, from[2] * 0.01),
          new THREE.Vector3(to[0] * 0.01, to[1] * 0.01, to[2] * 0.01)
        ]);
        
        const line = new THREE.Line(geometry, lineMaterial);
        sceneRef.current.add(line);
        keypointMarkersRef.current.push(line);
      });
    } else {
      console.warn('Not enough pose keypoints for connections:', 
                 keypointData.pose ? keypointData.pose.length : 0);
    }
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
  };    console.log('Visualizing keypoints...');
    
    // Remove any existing keypoint visualization
    removeKeypointVisualization();
    
    if (!keypointData) {
      console.warn('No keypoint data provided for visualization');
      return;
    }
    
    // Create materials for different keypoint types
    const materials = {
      pose: new THREE.MeshBasicMaterial({ color: 0xff0000 }), // Red
      leftHand: new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // Green
      rightHand: new THREE.MeshBasicMaterial({ color: 0x0000ff }), // Blue
      face: new THREE.MeshBasicMaterial({ color: 0xffff00 }) // Yellow
    };
    
    // Create a small sphere geometry for the points
    const geometry = new THREE.SphereGeometry(0.05, 8, 8); // Larger spheres (0.05 instead of 0.01)
    
    // Add points for each keypoint type
    Object.entries(keypointData).forEach(([type, points]) => {
      const material = materials[type] || materials.pose;
      
      if (!Array.isArray(points)) {
        console.warn(`Invalid keypoint format for type ${type}:`, points);
        return;
      }
      
      console.log(`Adding ${points.length} keypoints for type: ${type}`);
      
      points.forEach((point, index) => {
        if (!Array.isArray(point) || point.length < 3) {
          console.warn(`Invalid keypoint at index ${index} for type ${type}:`, point);
          return;
        }
        
        const [x, y, z] = point;
        const sphere = new THREE.Mesh(geometry, material);
        
        // Scale and position the point - adjust scaling factor as needed for your model
        const scaleFactor = 0.01; // Scaling factor for visualizing keypoints
        sphere.position.set(x * scaleFactor, y * scaleFactor, z * scaleFactor);
        
        // Add to scene
        sceneRef.current.add(sphere);
        keypointMarkersRef.current.push(sphere);
      });
    });
    
    // Draw lines between connected keypoints for body pose
    if (keypointData.pose && keypointData.pose.length >= 25) {
      const connections = [
        // Torso
        [1, 8], // Neck to MidHip
        [1, 2], // Neck to RShoulder
        [1, 5], // Neck to LShoulder
        [2, 3], // RShoulder to RElbow
        [3, 4], // RElbow to RWrist
        [5, 6], // LShoulder to LElbow
        [6, 7], // LElbow to LWrist
        [0, 1], // Nose to Neck
        [0, 15], // Nose to REye
        [0, 16], // Nose to LEye
        [15, 17], // REye to REar
        [16, 18]  // LEye to LEar
      ];
      
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      
      connections.forEach(([fromIdx, toIdx]) => {
        if (!keypointData.pose[fromIdx] || !keypointData.pose[toIdx]) {
          console.warn(`Connection points ${fromIdx}-${toIdx} not available`);
          return;
        }
        
        const from = keypointData.pose[fromIdx];
        const to = keypointData.pose[toIdx];
        
        if (!Array.isArray(from) || !Array.isArray(to) || from.length < 3 || to.length < 3) {
          console.warn(`Invalid connection points ${fromIdx}-${toIdx}:`, from, to);
          return;
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(from[0] * 0.01, from[1] * 0.01, from[2] * 0.01),
          new THREE.Vector3(to[0] * 0.01, to[1] * 0.01, to[2] * 0.01)
        ]);
        
        const line = new THREE.Line(geometry, lineMaterial);
        sceneRef.current.add(line);
        keypointMarkersRef.current.push(line);
      });
    } else {
      console.warn('Not enough pose keypoints for connections:', 
                 keypointData.pose ? keypointData.pose.length : 0);
    }
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

  // Test poses for the model
  const directlyRotateBones = (poseType = 'natural') => {
    if (!modelRef.current) return;
    
    // Find a skinned mesh with skeleton
    let skinnedMesh = null;
    modelRef.current.traverse(node => {
      if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
        skinnedMesh = node;
      }
    });
    
    if (!skinnedMesh || !skinnedMesh.skeleton) {
      console.warn('No suitable skeleton found for direct manipulation');
      return;
    }
    
    // Get the bones
    const bones = skinnedMesh.skeleton.bones;
    
    // Log all bone names for reference
    console.log('All bones:', bones.map(b => b.name));
    
    // First reset all bones to ensure a clean state
    bones.forEach(bone => {
      bone.rotation.set(0, 0, 0);
    });
    
    // Find arm bones
    const rightArmBones = bones.filter(bone => 
      bone.name.toLowerCase().includes('right') && 
      (bone.name.toLowerCase().includes('arm') || 
       bone.name.toLowerCase().includes('hand') ||
       bone.name.toLowerCase().includes('shoulder'))
    );
    
    const leftArmBones = bones.filter(bone => 
      bone.name.toLowerCase().includes('left') && 
      (bone.name.toLowerCase().includes('arm') || 
       bone.name.toLowerCase().includes('hand') ||
       bone.name.toLowerCase().includes('shoulder'))
    );
    
    console.log('Right arm bones:', rightArmBones.map(b => b.name));
    console.log('Left arm bones:', leftArmBones.map(b => b.name));
    
    // Now apply the pose (unless it's reset)
    if (poseType === 'reset') {
      // Already reset above, nothing more to do
      return;
    }
    
    if (poseType === 'natural') {
      // Create a natural pose with arms at the sides
      rightArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          // Slightly rotate outward
          bone.rotation.set(0, 0, -0.1);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          // Upper arm slightly bent forward
          bone.rotation.set(0.1, 0, 0);
  return (
    <div className="sign-model-container">
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
      
      {/* Debug controls */}
      {debugMode && (
        <div className="debug-controls">
          <h3>Debug Controls</h3>
          <button 
            onClick={toggleDebugMode} 
            className={`debug-button ${debugMode ? 'active' : ''}`}
          >
            {debugMode ? 'Disable Debug' : 'Enable Debug'}
          </button>
          
          <label>
            <input 
              type="checkbox" 
              checked={showKeypointsMode}
              onChange={() => setShowKeypointsMode(!showKeypointsMode)}
            />
            Show Keypoints
          </label>
          
          <div className="pose-buttons">
            <button 
              onClick={() => directlyRotateBones('apple')} 
              className="debug-button test-pose-button"
            >
              Test 사과 Pose
            </button>
            
            <button 
              onClick={() => directlyRotateBones('greeting')} 
              className="debug-button test-pose-button"
            >
              Test 안녕 Pose
            </button>
            
            <button 
              onClick={() => directlyRotateBones('natural')} 
              className="debug-button test-pose-button"
            >
              Natural Pose
            </button>
            
            <button 
              onClick={() => directlyRotateBones('reset')} 
              className="debug-button test-pose-button"
            >
              Reset Pose
            </button>
          </div>
          
          {animationFramesRef.current && (
            <div className="animation-controls">
              <div>
                <button
                  onClick={() => {
                    // Jump to first frame
                    currentFrameRef.current = 0;
                    
                    // Find skinned mesh
                    let skinnedMesh = null;
                    modelRef.current.traverse(node => {
                      if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
                        skinnedMesh = node;
                      }
                    });
                    
                    if (skinnedMesh && animationFramesRef.current) {
                      // Apply first frame
                      applyKeypointFrameToModel(
                        animationFramesRef.current,
                        skinnedMesh.skeleton,
                        0,
                        { debug: debugMode, scaleFactor: 0.01 }
                      );
                      
                      if (showKeypointsMode) {
                        visualizeKeypoints(animationFramesRef.current[0]);
                      }
                    }
                  }}
                  className="debug-button anim-button"
                >
                  First Frame
                </button>
                
                <button
                  onClick={() => {
                    // Advance to next frame
                    const nextFrame = (currentFrameRef.current + 1) % animationFramesRef.current.length;
                    currentFrameRef.current = nextFrame;
                    
                    // Find skinned mesh
                    let skinnedMesh = null;
                    modelRef.current.traverse(node => {
                      if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
                        skinnedMesh = node;
                      }
                    });
                    
                    if (skinnedMesh && animationFramesRef.current) {
                      // Apply next frame
                      applyKeypointFrameToModel(
                        animationFramesRef.current,
                        skinnedMesh.skeleton,
                        nextFrame,
                        { debug: debugMode, scaleFactor: 0.01 }
                      );
                      
                      if (showKeypointsMode) {
                        visualizeKeypoints(animationFramesRef.current[nextFrame]);
                      }
                    }
                  }}
                  className="debug-button anim-button"
                >
                  Next Frame
                </button>
                
                <button
                  onClick={() => {
                    // Toggle animation
                    if (isAnimatingRef.current) {
                      stopAnimation();
                    } else {
                      // Start animation if we have frames
                      if (animationFramesRef.current) {
                        startAnimation(animationFramesRef.current);
                      }
                    }
                  }}
                  className="debug-button anim-button"
                >
                  {isAnimatingRef.current ? 'Stop Animation' : 'Play Animation'}
                </button>
                
                <button
                  onClick={() => stopAnimation()}
                  className="debug-button anim-button"
                >
                  Reset Animation
                </button>
              </div>
              
              <div>
                <button
                  onClick={() => {
                    animationSpeedRef.current = Math.max(0.5, animationSpeedRef.current - 0.5);
                  }}
                  className="debug-button anim-button"
                >
                  Slower
                </button>
                <button
                  onClick={() => {
                    animationSpeedRef.current = Math.min(3, animationSpeedRef.current + 0.5);
                  }}
                  className="debug-button anim-button"
                >
                  Faster
                </button>
                <span>Speed: {animationSpeedRef.current.toFixed(1)}x</span>
              </div>
            </div>
          )}
          
          <div className="debug-info">
            <h4>Debug Information</h4>
            <div>Model Status: {status.loading ? 'Loading' : 'Loaded'}</div>
            <div>Current Word: {word || 'None'}</div>
            <div>Animation: {status.message}</div>
            {animationFramesRef.current && (
              <div>Frame: {currentFrameRef.current + 1}/{animationFramesRef.current.length}</div>
            )}
            {status.error && <div className="error">Error: {status.error}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignModel;      });
      
      leftArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          // Slightly rotate outward
          bone.rotation.set(0, 0, -0.1);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          // Upper arm slightly bent forward
          bone.rotation.set(0.1, 0, 0);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          // Forearm slightly bent
          bone.rotation.set(0.2, 0, 0);
        } else if (bone.name.toLowerCase().includes('hand')) {
          // Hand natural position
          bone.rotation.set(0, 0, 0);
        }
      });
    }
    else if (poseType === 'greeting') {
      // Create a greeting pose with one hand raised
      rightArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          // Raise arm
          bone.rotation.set(0, 0, -0.5);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          // Bend upper arm
          bone.rotation.set(-0.5, 0, 0);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          // Bend forearm up for wave
          bone.rotation.set(-0.7, 0, 0);
        } else if (bone.name.toLowerCase().includes('hand') || bone.name.toLowerCase().includes('wrist')) {
          // Wave hand
          bone.rotation.set(0, 0, 0.3);
        }
      });
      
      // Left arm in natural position
      leftArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          bone.rotation.set(0, 0, -0.1);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          bone.rotation.set(0.1, 0, 0);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          bone.rotation.set(0.2, 0, 0);
        }
      });
    } else if (poseType === 'apple') {
      // Create an apple sign pose
      rightArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          // Shoulder slightly rotated
          bone.rotation.set(0.1, 0, -0.2);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          // Bend upper arm forward and up
          bone.rotation.set(-0.4, 0, 0);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          // Bend forearm toward face
          bone.rotation.set(-0.8, 0, 0);
        } else if (bone.name.toLowerCase().includes('hand') || bone.name.toLowerCase().includes('wrist')) {
          // Hand in eating position
          bone.rotation.set(0.3, 0, 0);
        }
      });
      
      // Left arm in supporting position
      leftArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          bone.rotation.set(0, 0, -0.2);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          bone.rotation.set(-0.3, 0, 0);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          bone.rotation.set(-0.6, 0, 0.2);
        } else if (bone.name.toLowerCase().includes('hand') || bone.name.toLowerCase().includes('wrist')) {
          bone.rotation.set(0.2, 0, 0.1);
        }
      });
    }
    
    // Update the skeleton
    skinnedMesh.skeleton.update();
  };

  // Main function to animate a word using OpenPose keypoint files or pre-defined poses
  const animateWord = async (word) => {
    if (!word || !modelRef.current) return;
    
    console.log(`Animating word: "${word}"`);
    
    setStatus({
      loading: true,
      message: `Loading animation for "${word}"...`,
      error: null
    });
    
    // Stop any running animations
    stopAnimation();
    
    try {
      // For known words, directly apply the corresponding pose if not using keypoints
      if (!debugMode && word === '사과') {
        directlyRotateBones('apple');
        setStatus({
          loading: false,
          message: `Showing pose for "${word}"`,
          error: null
        });
        return;
      } else if (!debugMode && word === '안녕') {
        directlyRotateBones('greeting');
        setStatus({
          loading: false,
          message: `Showing pose for "${word}"`,
          error: null
        });
        return;
      }
      
      // Try to load and animate using OpenPose keypoints
      const frames = await loadKeypointsForWord(word);
      
      if (frames && frames.length > 0) {
        console.log(`Successfully loaded ${frames.length} keypoint frames for "${word}"`);
        
        // Store the frames for animation
        animationFramesRef.current = frames;
        currentFrameRef.current = 0;
        
        // Find a skinned mesh for animation
        let skinnedMesh = null;
        modelRef.current.traverse(node => {
          if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
            skinnedMesh = node;
          }
        });
        
        if (skinnedMesh) {
          // Set up animation mixer if not already created
          if (!mixerRef.current) {
            mixerRef.current = new THREE.AnimationMixer(skinnedMesh);
          }
          
          // Stop any current animations
          mixerRef.current.stopAllAction();
          
          // Show keypoints for first frame if debug mode is enabled
          if (debugMode && showKeypointsMode) {
            visualizeKeypoints(frames[0]);
          }
          
          // Start animation using the improved system
          startAnimation(frames);
          
          setStatus({
            loading: false,
            message: `Animating "${word}" using keypoints`,
            error: null
          });
          return;
        }
      }
      
      // If keypoints couldn't be loaded, use fallback animations
      console.log(`Using fallback animation for "${word}"`);
      
      // Try to directly manipulate bones based on known sign patterns
      if (word === '사과') {
        directlyRotateBones('apple');
      } else if (word === '안녕') {
        directlyRotateBones('greeting');
      } else {
        directlyRotateBones('natural');
      }
      
      setStatus({
        loading: false,
        message: `Showing pose for "${word}"`,
        error: null
      });
      
    } catch (error) {
      console.error(`Error animating "${word}":`, error);
      
      // If all else fails, reset to default pose
      setStatus({
        loading: false,
        message: 'Showing default pose',
        error: `Could not animate "${word}": ${error.message}`
      });
      
      // Reset to default pose
      directlyRotateBones('natural');
    }
  };

  // Start animation for a sequence of frames
  const startAnimation = (frames) => {
    if (!frames || frames.length === 0 || !modelRef.current) return;
    
    console.log(`Starting animation with ${frames.length} frames`);
    
    // Reset current frame counter
    currentFrameRef.current = 0;
    
    // Store frames for animation
    animationFramesRef.current = frames;
    
    // Initialize lastUpdateTime
    animationFramesRef.current.lastUpdateTime = performance.now();
    
    // Set animation state to running
    isAnimatingRef.current = true;
  };
  
  // Stop the animation
  const stopAnimation = () => {
    isAnimatingRef.current = false;
    
    // Remove keypoint visualization
    if (showKeypointsMode) {
      removeKeypointVisualization();
    }
  };

  // Effect to handle word changes
  useEffect(() => {
    if (word) {
      // Stop any running animation before starting a new one
      stopAnimation();
      animateWord(word);
    }
    
    // Cleanup function to stop animation when component unmounts or word changes
    return () => {
      stopAnimation();
    };
  }, [word]);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          // Forearm slightly bent
          bone.rotation.set(0.2, 0, 0);
        } else if (bone.name.toLowerCase().includes('hand')) {
          // Hand natural position
          bone.rotation.set(0, 0, 0);
        }
      });
    } else if (poseType === 'greeting') {
      // Create a greeting pose with one hand raised
      rightArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          // Raise arm
          bone.rotation.set(0, 0, -0.5);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          // Bend upper arm
          bone.rotation.set(-0.5, 0, 0);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          // Bend forearm up for wave
          bone.rotation.set(-0.7, 0, 0);
        } else if (bone.name.toLowerCase().includes('hand') || bone.name.toLowerCase().includes('wrist')) {
          // Wave hand
          bone.rotation.set(0, 0, 0.3);
        }
      });
      
      // Left arm in natural position
      leftArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          bone.rotation.set(0, 0, -0.1);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          bone.rotation.set(0.1, 0, 0);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          bone.rotation.set(0.2, 0, 0);
        }
      });
    } else if (poseType === 'apple') {
      // Create an apple sign pose
      rightArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          // Shoulder slightly rotated
          bone.rotation.set(0.1, 0, -0.2);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          // Bend upper arm forward and up
          bone.rotation.set(-0.4, 0, 0);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          // Bend forearm toward face
          bone.rotation.set(-0.8, 0, 0);
        } else if (bone.name.toLowerCase().includes('hand') || bone.name.toLowerCase().includes('wrist')) {
          // Hand in eating position
          bone.rotation.set(0.3, 0, 0);
        }
      });
      
      // Left arm in supporting position
      leftArmBones.forEach(bone => {
        if (bone.name.toLowerCase().includes('shoulder')) {
          bone.rotation.set(0, 0, -0.2);
        } else if (bone.name.toLowerCase().includes('arm') && !bone.name.toLowerCase().includes('fore')) {
          bone.rotation.set(-0.3, 0, 0);
        } else if (bone.name.toLowerCase().includes('forearm') || bone.name.toLowerCase().includes('elbow')) {
          bone.rotation.set(-0.6, 0, 0.2);
        } else if (bone.name.toLowerCase().includes('hand') || bone.name.toLowerCase().includes('wrist')) {
          bone.rotation.set(0.2, 0, 0.1);
        }
      });
    }
    
    // Update the skeleton
    skinnedMesh.skeleton.update();
  };

  // Main function to animate a word using OpenPose keypoint files or pre-defined poses
  const animateWord = async (word) => {
    if (!word || !modelRef.current) return;
    
    console.log(`Animating word: "${word}"`);
    
    setStatus({
      loading: true,
      message: `Loading animation for "${word}"...`,
      error: null
    });
    
    // Stop any running animations
    stopAnimation();
    
    try {
      // For known words, directly apply the corresponding pose if not using keypoints
      if (!debugMode && word === '사과') {
        directlyRotateBones('apple');
        setStatus({
          loading: false,
          message: `Showing pose for "${word}"`,
          error: null
        });
        return;
      } else if (!debugMode && word === '안녕') {
        directlyRotateBones('greeting');
        setStatus({
          loading: false,
          message: `Showing pose for "${word}"`,
          error: null
        });
        return;
      }
      
      // Try to load and animate using OpenPose keypoints
      const frames = await loadKeypointsForWord(word);
      
      if (frames && frames.length > 0) {
        console.log(`Successfully loaded ${frames.length} keypoint frames for "${word}"`);
        
        // Store the frames for animation
        animationFramesRef.current = frames;
        currentFrameRef.current = 0;
        
        // Find a skinned mesh for animation
        let skinnedMesh = null;
        modelRef.current.traverse(node => {
          if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
            skinnedMesh = node;
          }
        });
        
        if (skinnedMesh) {
          // Set up animation mixer if not already created
          if (!mixerRef.current) {
            mixerRef.current = new THREE.AnimationMixer(skinnedMesh);
          }
          
          // Stop any current animations
          mixerRef.current.stopAllAction();
          
          // Show keypoints for first frame if debug mode is enabled
          if (debugMode && showKeypointsMode) {
            visualizeKeypoints(frames[0]);
          }
          
          // Start animation using the improved system
          startAnimation(frames);
          
          setStatus({
            loading: false,
            message: `Animating "${word}" using keypoints`,
            error: null
          });
          return;
        }
      }
      
      // If keypoints couldn't be loaded, use fallback animations
      console.log(`Using fallback animation for "${word}"`);
      
      // Try to directly manipulate bones based on known sign patterns
      if (word === '사과') {
        directlyRotateBones('apple');
      } else if (word === '안녕') {
        directlyRotateBones('greeting');
      } else {
        directlyRotateBones('natural');
      }
      
      setStatus({
        loading: false,
        message: `Showing pose for "${word}"`,
        error: null
      });
      
    } catch (error) {
      console.error(`Error animating "${word}":`, error);
      
      // If all else fails, reset to default pose
      setStatus({
        loading: false,
        message: 'Showing default pose',
        error: `Could not animate "${word}": ${error.message}`
      });
      
      // Reset to default pose
      directlyRotateBones('natural');
    }
  };

  // Start animation for a sequence of frames
  const startAnimation = (frames) => {
    if (!frames || frames.length === 0 || !modelRef.current) return;
    
    console.log(`Starting animation with ${frames.length} frames`);
    
    // Reset current frame counter
    currentFrameRef.current = 0;
    
    // Store frames for animation
    animationFramesRef.current = frames;
    
    // Initialize lastUpdateTime
    animationFramesRef.current.lastUpdateTime = performance.now();
    
    // Set animation state to running
    isAnimatingRef.current = true;
  };
  
  // Stop the animation
  const stopAnimation = () => {
    isAnimatingRef.current = false;
    
    // Remove keypoint visualization
    if (showKeypointsMode) {
      removeKeypointVisualization();
    }
  };

  // Effect to handle word changes
  useEffect(() => {
    if (word) {
      // Stop any running animation before starting a new one
      stopAnimation();
      animateWord(word);
    }
    
    // Cleanup function to stop animation when component unmounts or word changes
    return () => {
      stopAnimation();
    };
  }, [word]);

  return (
    <div className="sign-model-container">
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
      
      {/* Debug controls */}
      {debugMode && (
        <div className="debug-controls">
          <h3>Debug Controls</h3>
          <button 
            onClick={toggleDebugMode} 
            className={`debug-button ${debugMode ? 'active' : ''}`}
          >
            {debugMode ? 'Disable Debug' : 'Enable Debug'}
          </button>
          
          <label>
            <input 
              type="checkbox" 
              checked={showKeypointsMode}
              onChange={() => setShowKeypointsMode(!showKeypointsMode)}
            />
            Show Keypoints
          </label>
          
          <div className="pose-buttons">
            <button 
              onClick={() => directlyRotateBones('apple')} 
              className="debug-button test-pose-button"
            >
              Test 사과 Pose
            </button>
            
            <button 
              onClick={() => directlyRotateBones('greeting')} 
              className="debug-button test-pose-button"
            >
              Test 안녕 Pose
            </button>
            
            <button 
              onClick={() => directlyRotateBones('natural')} 
              className="debug-button test-pose-button"
            >
              Natural Pose
            </button>
            
            <button 
              onClick={() => directlyRotateBones('reset')} 
              className="debug-button test-pose-button"
            >
              Reset Pose
            </button>
          </div>
          
          {animationFramesRef.current && (
            <div className="animation-controls">
              <div>
                <button
                  onClick={() => {
                    // Jump to first frame
                    currentFrameRef.current = 0;
                    
                    // Find skinned mesh
                    let skinnedMesh = null;
                    modelRef.current.traverse(node => {
                      if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
                        skinnedMesh = node;
                      }
                    });
                    
                    if (skinnedMesh && animationFramesRef.current) {
                      // Apply first frame
                      applyKeypointFrameToModel(
                        animationFramesRef.current,
                        skinnedMesh.skeleton,
                        0,
                        { debug: debugMode, scaleFactor: 0.01 }
                      );
                      
                      if (showKeypointsMode) {
                        visualizeKeypoints(animationFramesRef.current[0]);
                      }
                    }
                  }}
                  className="debug-button anim-button"
                >
                  First Frame
                </button>
                
                <button
                  onClick={() => {
                    // Advance to next frame
                    const nextFrame = (currentFrameRef.current + 1) % animationFramesRef.current.length;
                    currentFrameRef.current = nextFrame;
                    
                    // Find skinned mesh
                    let skinnedMesh = null;
                    modelRef.current.traverse(node => {
                      if (node.isSkinnedMesh && node.skeleton && !skinnedMesh) {
                        skinnedMesh = node;
                      }
                    });
                    
                    if (skinnedMesh && animationFramesRef.current) {
                      // Apply next frame
                      applyKeypointFrameToModel(
                        animationFramesRef.current,
                        skinnedMesh.skeleton,
                        nextFrame,
                        { debug: debugMode, scaleFactor: 0.01 }
                      );
                      
                      if (showKeypointsMode) {
                        visualizeKeypoints(animationFramesRef.current[nextFrame]);
                      }
                    }
                  }}
                  className="debug-button anim-button"
                >
                  Next Frame
                </button>
                
                <button
                  onClick={() => {
                    // Toggle animation
                    if (isAnimatingRef.current) {
                      stopAnimation();
                    } else {
                      // Start animation if we have frames
                      if (animationFramesRef.current) {
                        startAnimation(animationFramesRef.current);
                      }
                    }
                  }}
                  className="debug-button anim-button"
                >
                  {isAnimatingRef.current ? 'Stop Animation' : 'Play Animation'}
                </button>
                
                <button
                  onClick={() => stopAnimation()}
                  className="debug-button anim-button"
                >
                  Reset Animation
                </button>
              </div>
              
              <div>
                <button
                  onClick={() => {
                    animationSpeedRef.current = Math.max(0.5, animationSpeedRef.current - 0.5);
                  }}
                  className="debug-button anim-button"
                >
                  Slower
                </button>
                <button
                  onClick={() => {
                    animationSpeedRef.current = Math.min(3, animationSpeedRef.current + 0.5);
                  }}
                  className="debug-button anim-button"
                >
                  Faster
                </button>
                <span>Speed: {animationSpeedRef.current.toFixed(1)}x</span>
              </div>
            </div>
          )}
          
          <div className="debug-info">
            <h4>Debug Information</h4>
            <div>Model Status: {status.loading ? 'Loading' : 'Loaded'}</div>
            <div>Current Word: {word || 'None'}</div>
            <div>Animation: {status.message}</div>
            {animationFramesRef.current && (
              <div>Frame: {currentFrameRef.current + 1}/{animationFramesRef.current.length}</div>
            )}
            {status.error && <div className="error">Error: {status.error}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignModel;