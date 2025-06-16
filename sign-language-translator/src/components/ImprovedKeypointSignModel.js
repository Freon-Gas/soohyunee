import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { loadKeypointsForWord } from '../utils/indexBasedAnimationUtils';
import './SignModel.css';

const ImprovedKeypointSignModel = ({ word, preloadedData, onAnimationComplete, onReset }) => {
  // State
  const [status, setStatus] = useState({
    loading: false,
    message: 'Ready for sign language visualization',
    error: null
  });
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(10); // FPS

  // Three.js refs
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Animation refs
  const keypointFramesRef = useRef([]);
  const animationIntervalRef = useRef(null);
  const isAnimatingRef = useRef(false);

  // Visualization groups
  const groupsRef = useRef({
    pose: null,
    leftHand: null,
    rightHand: null,
    face: null,
    bones: null,
    mesh: null // 메쉬
  });

  // Mouse control - fixed camera position, camera cant rotate or zoom
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });
  const cameraControlRef = useRef({ angleX: -0.3, angleY: 0, distance: 1.2 });

  // 색상 및 연결선 정의 
  const colors = {
    pose: 0xa0522d,      // 어두운 갈색 (기존 빨간색 대신)
    leftHand: 0x228b22,  // 어두운 초록색
    rightHand: 0x4169e1, // 어두운 파란색
    face: 0xb8860b,      // 어두운 골드
    bones: 0x696969      // 어두운 회색 (기존 흰색 대신)
  };

  // 손 연결선 생성 
  const createHandConnections = (points, connections, group, color) => {
    connections.forEach(([startIdx, endIdx]) => {
      if (startIdx >= points.length || endIdx >= points.length) return;

      const startPoint = points[startIdx];
      const endPoint = points[endIdx];

      if (startPoint.confidence > 0.2 && endPoint.confidence > 0.2) {
        // Create a curve from start to end point
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z),
          new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z)
        );
        
        // Create tube geometry for thicker lines 
        const geometry = new THREE.TubeGeometry(curve, 1, 0.05, 8, false);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const tube = new THREE.Mesh(geometry, material);
        
        group.add(tube);
      }
    });
  };

  const poseConnections = [
    // nose to neck is removed
    [1, 2], [1, 5],  // neck to shoulders
    [2, 3], [3, 4],  // left arm
    [5, 6], [6, 7],  // right arm
    [1, 8],  // neck to mid hip
    [8, 9], [8, 12],  // mid hip to hips
    [9, 10], [10, 11],  // left leg
    [12, 13], [13, 14]  // right leg
  ];

  // separate line from chin to bottome of the beck - connecting the body and the head
  const chinToNeckConnection = [[8, 1]]; // 턱 중앙에서 목으로

  const handConnections = [
    [0, 1], [1, 2], [2, 3], [3, 4],    // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],    // Index finger
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
    [0, 17], [17, 18], [18, 19], [19, 20]  // Pinky
  ];

  // 얼굴 키포인트 연결선 정의 (OpenPose 70-point 얼굴 모델)
  const faceConnections = [
    // 얼굴 윤곽 (jaw line) - 0-16
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
    [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16],
    
    // 오른쪽 눈썹 (right eyebrow) - 17-21
    [17, 18], [18, 19], [19, 20], [20, 21],
    
    // 왼쪽 눈썹 (left eyebrow) - 22-26  
    [22, 23], [23, 24], [24, 25], [25, 26],
    
    // 코 빙두리 (nose bridge) - 27-30
    [27, 28], [28, 29], [29, 30],
    
    // 코 끝 (nose tip area) - 31-35
    [31, 32], [32, 33], [33, 34], [34, 35], [35, 31],
    
    // 오른쪽 눈 (right eye) - 36-41
    [36, 37], [37, 38], [38, 39], [39, 40], [40, 41], [41, 36],
    
    // 왼쪽 눈 (left eye) - 42-47
    [42, 43], [43, 44], [44, 45], [45, 46], [46, 47], [47, 42],
    
    // 외부 입술 (outer lip) - 48-59
    [48, 49], [49, 50], [50, 51], [51, 52], [52, 53], [53, 54],
    [54, 55], [55, 56], [56, 57], [57, 58], [58, 59], [59, 48],
    
    // 내부 입술 (inner lip) - 60-67
    [60, 61], [61, 62], [62, 63], [63, 64], [64, 65], [65, 66], [66, 67], [67, 60]
  ];

  // Three.js 초기화
  useEffect(() => {
    if (!mountRef.current) return;

    console.log('🚀 Initializing Improved Keypoint Visualizer...');
    cleanup();

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFDEEDC);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      27, // Fixed FOV for consistency between idle and word visualization
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    setupLighting(scene);

    // Create groups (메쉬 그룹 포함)
    groupsRef.current = {
      pose: new THREE.Group(),
      leftHand: new THREE.Group(),
      rightHand: new THREE.Group(),
      face: new THREE.Group(),
      bones: new THREE.Group(),
      mesh: new THREE.Group() // 메쉬 그룹
    };

    Object.values(groupsRef.current).forEach(group => scene.add(group));

    // Mouse controls
    setupMouseControls();

    // Animation loop
    startRenderLoop();

    // 기본 idle 포즈 표시
    showIdlePose();

    return () => {
      cleanup();
    };
  }, []);

  // 조명 설정
  const setupLighting = (scene) => {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
  };

  // 마우스 컨트롤 설정 - 고정해놓음
  const setupMouseControls = () => {
    // Camera controls disabled 
    return () => {};
  };

  // 렌더 루프
  const startRenderLoop = () => {
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // 카메라 위치 업데이트
      const { angleX, angleY, distance } = cameraControlRef.current;
      if (cameraRef.current) {
        cameraRef.current.position.x = Math.sin(angleY) * Math.cos(angleX) * distance;
        cameraRef.current.position.y = Math.sin(angleX) * distance;
        cameraRef.current.position.z = Math.cos(angleY) * Math.cos(angleX) * distance;
        cameraRef.current.lookAt(0, -0.405, 0); // Restore original lookAt
      }

      if (rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  // 키포인트 데이터 로딩 (미리 로딩된 데이터 우선 사용)
  const loadKeypointData = async (word) => {
    setStatus({ loading: true, message: `"${word}" 수어 데이터를 불러오는 중...`, error: null });

    try {
      let frames;
      
      // 미리 로딩된 데이터가 있는지 확인
      if (preloadedData && preloadedData[word]) {
        console.log(`📦 Using preloaded data for "${word}"`);
        frames = preloadedData[word];
        setStatus({ loading: false, message: `"${word}" 미리 로딩된 데이터 사용`, error: null });
      } else {
        console.log(`🔄 Loading data on demand for "${word}"`);
        // 미리 로딩된 데이터가 없으면 기존 방식으로 로딩
        frames = await loadKeypointsForWord(word);
      }
      
      
      // Check if data is already processed and if so, use it directly
      if (frames.length > 0 && frames[0].pose && Array.isArray(frames[0].pose)) {
        keypointFramesRef.current = frames; // Use frames as-is
      } else {
        // Process each frame through processOpenPoseFrame
        const processedFrames = frames.map((frame, index) => {
          const processed = processOpenPoseFrame(frame);
          
          // Debug first few frames
          if (index < 3) {
            console.log(`🔍 Frame ${index} RAW:`, frame);
            console.log(`🔍 Frame ${index} PROCESSED:`, processed);
          }
          
          return processed;
        });
        keypointFramesRef.current = processedFrames;
      }
      
      setTotalFrames(keypointFramesRef.current.length);
      setCurrentFrame(0);

      if (keypointFramesRef.current.length > 0) {
        // 첫 번째 프레임을 즉시 표시
        const firstFrame = keypointFramesRef.current[0];
        visualizeFrame(firstFrame);
        setCurrentFrame(0);
        
        // 애니메이션 시작
        startAnimation();
        setStatus({ loading: false, message: `"${word}" 수어를 표시 중`, error: null });
      } else {
        throw new Error('No keypoint data found');
      }

    } catch (error) {
      console.error(`❌ Error loading keypoint data:`, error);
      
      // 지원되지 않는 단어에 대한 알림 메시지
      const isWordNotFound = error.message.includes('not found in patterns index');
      const errorMessage = isWordNotFound 
        ? `죄송합니다. "${word}"는 현재 지원되지 않는 단어입니다.`
        : '수어 데이터를 불러오는 중 오류가 발생했습니다.';
      
      setStatus({ 
        loading: false, 
        message: errorMessage, 
        error: errorMessage 
      });
      
      // 오류 상태일 때는 idle 포즈로 돌아가기 및 완료 신호 보내기
      setTimeout(() => {
        showIdlePose();
        
        // 3초 후 다음 단어로 넘어가도록 완료 신호 보내기
        if (onAnimationComplete && word) {
          console.log(`🚨 Error handling complete for word: "${word}", moving to next`);
          onAnimationComplete(word);
        }
      }, 3000); // 3초 후 idle 포즈 표시 및 다음 단어로
    }
  };

  // OpenPose 프레임 처리
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

      if (!person) {
        return processed;
      }

      // FIXED: Handle both formats
      // Format 1: OpenPose JSON format (pose_keypoints_3d, etc.)
      // Format 2: Processed format (pose, leftHand, etc.)
      
      // Check if data is already in processed format
      if (person.pose && Array.isArray(person.pose)) {
        
        // Convert from processed format back to flat arrays for extractKeypoints
        if (person.pose && person.pose.length > 0) {
          processed.pose = person.pose.map(p => ({
            x: p.x || 0,
            y: p.y || 0, 
            z: p.z || 0,
            confidence: p.confidence || 0
          }));
        }
        
        if (person.leftHand && person.leftHand.length > 0) {
          processed.leftHand = person.leftHand.map(p => ({
            x: p.x || 0,
            y: p.y || 0,
            z: p.z || 0,
            confidence: p.confidence || 0
          }));
        }
        
        if (person.rightHand && person.rightHand.length > 0) {
          processed.rightHand = person.rightHand.map(p => ({
            x: p.x || 0,
            y: p.y || 0,
            z: p.z || 0,
            confidence: p.confidence || 0
          }));
        }
        
        if (person.face && person.face.length > 0) {
          processed.face = person.face.map(p => ({
            x: p.x || 0,
            y: p.y || 0,
            z: p.z || 0,
            confidence: p.confidence || 0
          }));
        }
        
      } else {
        // Original OpenPose JSON format processing
        if (person.pose_keypoints_3d) {
          processed.pose = extractKeypoints(person.pose_keypoints_3d, 4, true);
        } else if (person.pose_keypoints_2d) {
          processed.pose = extractKeypoints(person.pose_keypoints_2d, 3, false);
        } else {
        }

        if (person.hand_left_keypoints_3d) {
          processed.leftHand = extractKeypoints(person.hand_left_keypoints_3d, 4, true);
        } else if (person.hand_left_keypoints_2d) {
          processed.leftHand = extractKeypoints(person.hand_left_keypoints_2d, 3, false);
        } else {
        }

        if (person.hand_right_keypoints_3d) {
          processed.rightHand = extractKeypoints(person.hand_right_keypoints_3d, 4, true);
        } else if (person.hand_right_keypoints_2d) {
          processed.rightHand = extractKeypoints(person.hand_right_keypoints_2d, 3, false);
        } else {
        }

        if (person.face_keypoints_3d) {
          processed.face = extractKeypoints(person.face_keypoints_3d, 4, true);
        } else if (person.face_keypoints_2d) {
          processed.face = extractKeypoints(person.face_keypoints_2d, 3, false);
        } else {
        }
      }

    } catch (error) {
      console.error('❌ Error processing frame:', error);
    }

    const validCounts = {
      pose: processed.pose.filter(p => p.confidence > 0.2).length,
      leftHand: processed.leftHand.filter(p => p.confidence > 0.2).length,
      rightHand: processed.rightHand.filter(p => p.confidence > 0.2).length,
      face: processed.face.filter(p => p.confidence > 0.2).length
    };
    
    return processed;
  };

  // 키포인트 추출 
  const extractKeypoints = (flatArray, stride, is3D) => {

    if (!flatArray || !Array.isArray(flatArray)) {
      return [];
    }

    const points = [];
    const confidenceThreshold = 0.2;

    for (let i = 0; i < flatArray.length; i += stride) {
      if (i + (stride - 1) >= flatArray.length) break;

      const confidence = flatArray[i + (stride - 1)];
      
      // Debug first few points
      if (i < stride * 3) {
        console.log(`Point ${i/stride}:`, {
          x: flatArray[i],
          y: flatArray[i + 1], 
          z: is3D ? flatArray[i + 2] : 0,
          confidence: confidence,
          passesThreshold: confidence > confidenceThreshold
        });
      }

      if (confidence > confidenceThreshold) {
        if (is3D) {
          points.push({
            x: flatArray[i] * 1.0,
            y: -flatArray[i + 1] * 1.0,  // Y축 반전
            z: -flatArray[i + 2] * 1.0,  // Z축 반전
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

    const validCount = points.filter(p => p.confidence > confidenceThreshold).length;
    
    // Debug first few valid points
    const validPoints = points.filter(p => p.confidence > confidenceThreshold);
    if (validPoints.length > 0) {
      console.log('📍 First few valid points:', validPoints.slice(0, 3));
    }

    return points;
  };

  // 애니메이션 시작
  const startAnimation = () => {
    if (isAnimatingRef.current) {
      stopAnimation();
    }

    if (keypointFramesRef.current.length === 0) return;

    
    isAnimatingRef.current = true;
    setIsPlaying(true);
    setCurrentFrame(0);

    let frameIndex = 0;
    
    animationIntervalRef.current = setInterval(() => {
      if (!isAnimatingRef.current) return;

      const frameData = keypointFramesRef.current[frameIndex];
      if (frameData) {
        visualizeFrame(frameData);
        setCurrentFrame(frameIndex);
      }

      frameIndex++;

      // 마지막 프레임에 도달하면 애니메이션 종료
      if (frameIndex >= keypointFramesRef.current.length) {
        stopAnimation();
        // 마지막 프레임을 계속 표시
        const lastFrame = keypointFramesRef.current[keypointFramesRef.current.length - 1];
        if (lastFrame) {
          visualizeFrame(lastFrame);
        }
        
        // 마지막 프레임 대기 후 애니메이션 완료 알림
        setTimeout(() => {
          if (onAnimationComplete && word) {
            onAnimationComplete(word);
          }
        }, 500); // 0.5초 대기 후 완료 신호
      }

    }, 1000 / animationSpeed);
  };

  // 애니메이션 중지
  const stopAnimation = () => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    isAnimatingRef.current = false;
    setIsPlaying(false);
  };

  // 프레임 데이터 스케일링 및 위치 조정 함수 - 기울어진 문제 해결
const scaleFrameData = (frameData, scaleFactor) => {
  // 모든 데이터에 기울어진 문제 해결을 위한 회전 및 위치 조정 적용
  const rotationAngle = 0.05; // 약 14.3도 시계방향 회전으로 기울어짐 보정
  const positionOffset = { x: 0.15, y: -0.8, z: 0 }; // 오른쪽으로, 아래로 이동
  
  const scaleAndAdjustPoints = (points, yOffset = 0) => {
    return points.map(point => {
      let adjustedX = point.x * scaleFactor;
      let adjustedY = point.y * scaleFactor + yOffset;
      let adjustedZ = point.z * scaleFactor;
      
      // 회전 적용 (Z축 중심 회전) - 모든 데이터에 적용
      const cos = Math.cos(rotationAngle);
      const sin = Math.sin(rotationAngle);
      const newX = adjustedX * cos - adjustedY * sin;
      const newY = adjustedX * sin + adjustedY * cos;
      adjustedX = newX;
      adjustedY = newY;
      
      // 위치 오프셋 적용 - 모든 데이터에 적용
      adjustedX += positionOffset.x;
      adjustedY += positionOffset.y;
      adjustedZ += positionOffset.z;
      
      return {
        ...point,
        x: adjustedX,
        y: adjustedY,
        z: adjustedZ
      };
    });
  };

  return {
    pose: frameData.pose ? scaleAndAdjustPoints(frameData.pose, 0) : [],
    leftHand: frameData.leftHand ? scaleAndAdjustPoints(frameData.leftHand, 0) : [],
    rightHand: frameData.rightHand ? scaleAndAdjustPoints(frameData.rightHand, 0) : [],
    face: frameData.face ? scaleAndAdjustPoints(frameData.face, 0) : []
  };
};

  // 프레임 시각화
  const visualizeFrame = (frameData) => {
    
    if (!frameData || !groupsRef.current) {
      return;
    }

    // Detect data type: OpenPose 3D data vs processed data with large coordinates
    const isLargeCoordinateData = frameData.pose && frameData.pose.length > 0 && 
      frameData.pose.some(p => p.x && (Math.abs(p.x) > 100 || Math.abs(p.y) > 100));
    
    // Use more consistent scaling for better size matching
    const scaleFactor = isLargeCoordinateData ? 0.015 : 25.0;
    
    const scaledFrameData = scaleFrameData(frameData, scaleFactor);


    // DEBUGGING: Log some sample coordinates to see where things are positioned
    if (scaledFrameData.pose && scaledFrameData.pose.length > 0) {
      const validPosePoints = scaledFrameData.pose.filter(p => p.confidence > 0.2);
      if (validPosePoints.length > 0) {

        
        // Calculate bounding box
        const xs = validPosePoints.map(p => p.x);
        const ys = validPosePoints.map(p => p.y);
        const zs = validPosePoints.map(p => p.z);
        const bounds = {
          minX: Math.min(...xs), maxX: Math.max(...xs),
          minY: Math.min(...ys), maxY: Math.max(...ys),
          minZ: Math.min(...zs), maxZ: Math.max(...zs)
        };
        
        // Keep camera settings consistent for all visualizations
        if (cameraRef.current) {
          // Fixed camera settings for consistent sizing
          cameraControlRef.current.distance = 1.2;
          cameraRef.current.fov = 30;
          cameraRef.current.updateProjectionMatrix();
          
        }
      }
    }

    // 모든 그룹 클리어
    Object.values(groupsRef.current).forEach(group => {
      if (group) {
        group.clear();
      }
    });

    let visualizedSomething = false;

    // 포즈 키포인트
    if (scaledFrameData.pose && scaledFrameData.pose.length > 0) {
      const poseSize = 0.009; // Fixed size for consistency
      createKeypoints(scaledFrameData.pose, groupsRef.current.pose, colors.pose, poseSize);
      createConnections(scaledFrameData.pose, poseConnections, groupsRef.current.bones, colors.bones);
      
      // 몸통 메쉬 추가
      createBodyMesh(scaledFrameData.pose);
      visualizedSomething = true;
    }

    // 왼손 키포인트
    if (scaledFrameData.leftHand && scaledFrameData.leftHand.length > 0) {
      const leftHandSize = 0.007; // Fixed size for consistency
      createKeypoints(scaledFrameData.leftHand, groupsRef.current.leftHand, colors.leftHand, leftHandSize);
      createHandConnections(scaledFrameData.leftHand, handConnections, groupsRef.current.bones, colors.leftHand);
      
      // 왼손 메쉬 추가
      createHandMesh(scaledFrameData.leftHand, 'left');
      visualizedSomething = true;
    }

    // 오른손 키포인트
    if (scaledFrameData.rightHand && scaledFrameData.rightHand.length > 0) {
      const rightHandSize = 0.007; // Fixed size for consistency
      createKeypoints(scaledFrameData.rightHand, groupsRef.current.rightHand, colors.rightHand, rightHandSize);
      createHandConnections(scaledFrameData.rightHand, handConnections, groupsRef.current.bones, colors.rightHand);
      
      // 오른손 메쉬 추가
      createHandMesh(scaledFrameData.rightHand, 'right');
      visualizedSomething = true;
    }

    // 얼굴 키포인트 
    if (scaledFrameData.face && scaledFrameData.face.length > 0) {
      const faceSize = 0.03;
      createKeypoints(scaledFrameData.face, groupsRef.current.face, colors.face, faceSize);
      
      // 얼굴 연결선 추가
      createConnections(scaledFrameData.face, faceConnections, groupsRef.current.bones, colors.face);
      
      // 얼굴 메쉬는 추가하지 않음
      visualizedSomething = true;
    }

    // 턱에서 목으로 연결 (얼굴과 포즈 데이터가 모두 있을 때)
    if (scaledFrameData.face && scaledFrameData.face.length > 8 && 
        scaledFrameData.pose && scaledFrameData.pose.length > 1) {
      // 턱 중앙(8번)에서 목(1번)으로 연결
      const chinPoint = scaledFrameData.face[8];
      const neckPoint = scaledFrameData.pose[1];
      
      if (chinPoint && neckPoint && chinPoint.confidence > 0.2 && neckPoint.confidence > 0.2) {
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(chinPoint.x, chinPoint.y, chinPoint.z),
          new THREE.Vector3(neckPoint.x, neckPoint.y, neckPoint.z)
        );
        
        const geometry = new THREE.TubeGeometry(curve, 1, 0.032, 8, false);
        const material = new THREE.MeshBasicMaterial({ color: colors.bones });
        const tube = new THREE.Mesh(geometry, material);
        
        groupsRef.current.bones.add(tube);
      }
    }
    
    if (visualizedSomething) {
      console.log('✅ Successfully visualized frame');
    } else {
      console.log('❌ No valid keypoints found in frame');
    }
  };

  // 키포인트 생성
  const createKeypoints = (points, group, color, size) => {
    points.forEach((point, index) => {
      if (point.confidence > 0.2) {
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshPhongMaterial({ color: color });
        const sphere = new THREE.Mesh(geometry, material);
        
        sphere.position.set(point.x, point.y, point.z);
        sphere.castShadow = true;
        
        group.add(sphere);
      }
    });
  };

  // 연결선 생성
  const createConnections = (points, connections, group, color) => {
    connections.forEach(([startIdx, endIdx]) => {
      if (startIdx >= points.length || endIdx >= points.length) return;

      let startPoint = points[startIdx];
      let endPoint = points[endIdx];

      if (startPoint.confidence > 0.2 && endPoint.confidence > 0.2) {
        // 일반 연결선 생성 (nose to neck 특별 처리 제거)
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z),
          new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z)
        );
        
        const geometry = new THREE.TubeGeometry(curve, 1, 0.032, 8, false);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const tube = new THREE.Mesh(geometry, material);
        
        group.add(tube);
      }
    });
  };

  // 몸통 mesh 생성 (얼굴 제외, 목뼈 길이 제한)
  const createBodyMesh = (posePoints) => {
    if (!posePoints || posePoints.length < 15) return;

    // 몸통과 팔다리 삼각형들 (목-얼굴 연결 제거)
    const bodyTriangles = [
      // 상체 메쉬 (목과 얼굴을 연결하지 않음)
      [1, 2, 5],   // 목-어깨 삼각형
      [1, 2, 8],   // 목-오른어깨-허리
      [1, 5, 8],   // 목-왼어깨-허리
      [2, 8, 9],   // 오른어깨-허리-오른엉덩이
      [5, 8, 12],  // 왼어깨-허리-왼엉덩이
      [8, 9, 12],  // 허리 삼각형
      
      // 팔뚝 메쉬 추가 (목과 직접 연결하지 않음)
      [2, 3, 5],   // 오른팔 상부 (목 대신 어깨들 연결)
      [3, 4, 2],   // 오른팔 하부
      [5, 6, 2],   // 왼팔 상부 (목 대신 어깨들 연결)
      [6, 7, 5],   // 왼팔 하부
      
      // 다리 메쉬 추가
      [9, 10, 8],  // 오른다리 상부
      [10, 11, 9], // 오른다리 하부
      [12, 13, 8], // 왼다리 상부
      [13, 14, 12] // 왼다리 하부
    ];

    createMeshFromTriangles(posePoints, bodyTriangles, {
      color: 0xfdbcb4, // 자연스러운 살색
      transparent: true,
      opacity: 0.5,   // 투명도 조정
      side: THREE.DoubleSide
    });
  };

  // 손 mesh 생성
  const createHandMesh = (handPoints, side) => {
    if (!handPoints || handPoints.length < 21) return;

    // 손바닥 삼각형들
    const handTriangles = [
      // 손바닥 중앙 삼각형들
      [0, 5, 9],   // 손목-검지-중지 기준
      [0, 9, 13],  // 손목-중지-약지 기준
      [0, 13, 17], // 손목-약지-새끼 기준
      [0, 17, 5],  // 손목-새끼-검지 기준
      [5, 9, 13],  // 중앙 삼각형
      [5, 13, 17], // 중앙 삼각형 2
    ];

    createMeshFromTriangles(handPoints, handTriangles, {
      color: 0xfdbcb4, // 몸과 같은 살색
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
  };

  // 삼각형에서 mesh 생성
  const createMeshFromTriangles = (points, triangles, materialProps) => {
    const vertices = [];
    const indices = [];
    const validPointIndices = new Map();
    let vertexIndex = 0;

    // 유효한 포인트들만 추가
    points.forEach((point, originalIndex) => {
      if (point.confidence > 0.2) {
        vertices.push(point.x, point.y, point.z);
        validPointIndices.set(originalIndex, vertexIndex);
        vertexIndex++;
      }
    });

    // 삼각형 인덱스 추가
    triangles.forEach(triangle => {
      const validIndices = triangle.map(index => validPointIndices.get(index)).filter(index => index !== undefined);
      
      if (validIndices.length === 3) {
        indices.push(...validIndices);
      }
    });

    if (vertices.length === 0 || indices.length === 0) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial(materialProps);
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    groupsRef.current.mesh.add(mesh);
  };

  // 특정 프레임으로 이동
  const goToFrame = (frameIndex) => {
    if (frameIndex >= 0 && frameIndex < keypointFramesRef.current.length) {
      const frameData = keypointFramesRef.current[frameIndex];
      if (frameData) {
        visualizeFrame(frameData);
        setCurrentFrame(frameIndex);
      }
    }
  };

  // Reset function for external control
  const resetToIdle = () => {
    
    // Stop any running animation
    stopAnimation();
    
    // Clear keypoint frames
    keypointFramesRef.current = [];
    
    // Reset state
    setTotalFrames(0);
    setCurrentFrame(0);
    setIsPlaying(false);
    
    // Show idle pose
    showIdlePose();
  };

  // Expose reset function to parent component
  React.useImperativeHandle(onReset, () => ({
    resetToIdle
  }), []);

  // 기본 idle 포즈 표시 (사과의 첫 번째 프레임 사용)
  const showIdlePose = async () => {
    
    try {
      // 사과의 첫 번째 프레임을 동적으로 로드
      const frames = await loadKeypointsForWord('사과');
      if (frames && frames.length > 0) {
        const firstFrame = frames[0];
        const processedIdleFrame = processOpenPoseFrame(firstFrame);
        visualizeFrame(processedIdleFrame);
      } else {
      }
    } catch (error) {
    }
    
    setStatus({ 
      loading: false, 
      message: '수어 시각화 준비 완료', 
      error: null 
    });
  };

  // word 변경시 데이터 로딩
  useEffect(() => {
    if (word && word.trim()) {
      
      // 수동 디버깅: 사과 폴더의 알려진 파일을 직접 테스트
      if (word === '사과') {
        console.log('🍎 Testing known apple files...');
        testAppleFiles().then(() => {
          loadKeypointData(word.trim());
        });
      } else {
        loadKeypointData(word.trim());
      }
    } else if (word === '') {
      // 단어가 비어있으면 idle 포즈 표시
      console.log('👤 No word provided, showing idle pose');
      showIdlePose();
      setTotalFrames(0);
      setCurrentFrame(0);
      setIsPlaying(false);
    }
    // word가 undefined이거나 null인 경우는 아무것도 하지 않음 (초기 로딩 상태 유지)
  }, [word]);
  
  // 사과 파일 테스트 함수
  const testAppleFiles = async () => {
    const testFiles = [
      '/data/signs/사과/NIA_SL_WORD0099_REAL09_F_000000000000_keypoints.json',
      '/data/signs/사과/NIA_SL_WORD1501_REAL01_F_000000000000_keypoints.json'
    ];
    
    for (const file of testFiles) {
      try {
        const response = await fetch(file);
        if (response.ok) {
          const data = await response.json();
        } else {
        }
      } catch (error) {
      }
    }
  };

  // cleanup
  const cleanup = () => {
    stopAnimation();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (rendererRef.current && mountRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
      mountRef.current.removeChild(rendererRef.current.domElement);
    }

    if (sceneRef.current) {
      sceneRef.current.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
  };

  return (
    <div className="sign-model" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      zIndex: 0,
      overflow: 'hidden'
    }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Loading overlay */}
      {status.loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          zIndex: 1000
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }} />
          <div>{status.message}</div>
        </div>
      )}

      {/* 상태 메시지 표시 */}
      {!status.loading && status.error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(220, 53, 69, 0.9)',
          color: 'white',
          padding: '20px 30px',
          borderRadius: '10px',
          textAlign: 'center',
          zIndex: 1000,
          maxWidth: '80%',
          fontSize: '14px'
        }}>
          {status.message}
        </div>
      )}

      {/* Animation controls */}
      <div style={{
        position: 'absolute',
        top: '100px',
        right: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        zIndex: 1000,
        minWidth: '200px',
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
          🎭 수어 애니메이션
        </div>
        
        <div style={{ marginBottom: '8px', fontSize: '11px' }}>
          단어: {word || '없음'}
        </div>
        
        <div style={{ marginBottom: '8px', fontSize: '11px', color: '#cd853f' }}>
          프레임: {currentFrame + 1} / {totalFrames}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <input
            type="range"
            min="0"
            max={Math.max(0, totalFrames - 1)}
            value={currentFrame}
            onChange={(e) => goToFrame(parseInt(e.target.value))}
            style={{ 
              width: '100%', 
              height: '4px',
              background: '#d2b48c',
              outline: 'none',
              borderRadius: '2px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
          <button
            onClick={isPlaying ? stopAnimation : startAnimation}
            disabled={totalFrames === 0}
            style={{
              background: isPlaying ? '#f44336' : '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
          </button>
          
          <button
            onClick={() => goToFrame(0)}
            disabled={totalFrames === 0}
            style={{
              background: '#8b4513',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            ⏮ 처음으로
          </button>
        </div>
        
        <div style={{ marginBottom: '8px', fontSize: '11px' }}>
          속도: {animationSpeed} FPS
          <input
            type="range"
            min="5"
            max="30"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
            style={{ 
              width: '100%', 
              height: '4px',
              background: '#d2b48c',
              outline: 'none',
              borderRadius: '2px'
            }}
          />
        </div>

        <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '8px' }}>
          🟢 왼손 | 🔵 오른손 | 🟡 얼굴
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Range slider styling */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: #d2b48c;
          outline: none;
          border-radius: 2px;
        }
        
        /* Webkit browsers (Chrome, Safari) */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8b4513;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        /* Firefox */
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8b4513;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        /* Firefox track */
        input[type="range"]::-moz-range-track {
          background: #d2b48c;
          height: 4px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default ImprovedKeypointSignModel;