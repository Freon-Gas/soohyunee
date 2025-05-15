import React, { useState, useRef, useEffect } from 'react';
import SignModel from './SignModel';
import './TestAnimation.css';

/**
 * Component for testing the 3D model animation
 */
const TestAnimation = () => {
  const [wordToTest, setWordToTest] = useState('사과');
  const [debugMode, setDebugMode] = useState(true);
  const [showKeypoints, setShowKeypoints] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [supportedWords, setSupportedWords] = useState([]);
  const [supportedPoses, setSupportedPoses] = useState([]);
  const modelRef = useRef(null);

  // Effect to load supported signs
  useEffect(() => {
    // Import the sign language mapper to get supported signs
    import('../utils/signLanguageMapper')
      .then(({ KNOWN_SIGNS }) => {
        if (KNOWN_SIGNS) {
          const words = Object.keys(KNOWN_SIGNS);
          setSupportedWords(words);
          
          // Get unique poses
          const poses = [...new Set(Object.values(KNOWN_SIGNS))];
          setSupportedPoses(poses);
          
          setTestResult(`테스트 가능한 단어: ${words.length}개, 포즈: ${poses.length}개`);
        }
      })
      .catch(error => {
        console.error('Error loading sign language mapper:', error);
        setTestResult('오류: 수화 매퍼를 불러올 수 없습니다.');
      });
  }, []);

  const handleWordChange = (e) => {
    setWordToTest(e.target.value);
  };

  const handleReload = () => {
    // Force refresh by setting to empty and back to the word
    if (wordToTest) {
      setTestResult(`단어 "${wordToTest}" 애니메이션을 다시 로드하는 중...`);
      setWordToTest('');
      setTimeout(() => setWordToTest(wordToTest), 50);
    }
  };
  
  const handleTestPose = (poseType) => {
    // Call the global pose test function
    setTestResult(`포즈 테스트: ${poseType}`);
    if (window.test_3d_pose) {
      window.test_3d_pose(poseType);
    } else {
      console.error('Pose test function not available');
      setTestResult('오류: 포즈 테스트 함수를 사용할 수 없습니다.');
    }
  };
  
  const handleResetPose = () => {
    // Reset to default pose
    setTestResult('포즈 초기화');
    if (window.test_3d_pose) {
      window.test_3d_pose('reset');
    } else {
      console.error('Pose test function not available');
      setTestResult('오류: 포즈 테스트 함수를 사용할 수 없습니다.');
    }
  };

  return (
    <div className="test-animation">
      <h2>3D 모델 애니메이션 테스트</h2>
      
      <div className="test-controls">
        <div className="control-group">
          <label htmlFor="word-input">단어 입력:</label>
          <input 
            id="word-input"
            type="text" 
            value={wordToTest} 
            onChange={handleWordChange}
            placeholder="수화할 단어를 입력하세요..."
          />
        </div>
        
        <div className="control-group">
          <button className="main-button" onClick={handleReload}>
            애니메이션 다시 로드
          </button>
        </div>
      </div>
      
      <div className="checkbox-container">
        <label>
          <input 
            type="checkbox" 
            checked={debugMode}
            onChange={() => setDebugMode(!debugMode)}
          />
          디버그 모드
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={showKeypoints}
            onChange={() => setShowKeypoints(!showKeypoints)}
          />
          키포인트 보기
        </label>
      </div>
      
      <div className="control-group pose-buttons">
        <span>테스트 포즈:</span>
        <button className="pose-button" onClick={() => handleTestPose('natural')}>
          자연스럽게
        </button>

        {supportedPoses.map(pose => (
          <button 
            key={pose} 
            className="pose-button" 
            onClick={() => handleTestPose(pose)}
          >
            {pose}
          </button>
        ))}

        <button className="pose-button reset" onClick={handleResetPose}>
          초기화
        </button>
      </div>
      
      <div className="sample-words scrollable-buttons">
        <span>테스트 단어:</span>
        <div className="buttons-container">
          {supportedWords.map(word => (
            <button 
              key={word} 
              onClick={() => {
                setWordToTest(word);
                setTestResult(`단어 "${word}" 선택됨`);
              }}
              className={wordToTest === word ? 'active' : ''}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
      
      <div className="model-container">
        <SignModel 
          word={wordToTest} 
          debug={debugMode}
          showKeypoints={showKeypoints}
        />
      </div>
      
      {testResult && (
        <div className="test-result">
          {testResult}
        </div>
      )}
      
      <div className="debug-info">
        <h3>디버그 정보</h3>
        <p>현재 테스트 단어: <strong>{wordToTest || '없음'}</strong></p>
        <p>자세한 로그는 브라우저 콘솔을 확인해주세요 (F12)</p>
        <p>지원되는 단어: {supportedWords.slice(0, 5).join(', ')}{supportedWords.length > 5 ? ` 등 ${supportedWords.length}개` : ''}</p>
        <p>개발자 도구에서 Javascript 오류가 있는지 확인해보세요.</p>
      </div>
    </div>
  );
};

export default TestAnimation;