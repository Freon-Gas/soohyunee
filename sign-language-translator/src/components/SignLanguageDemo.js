import React, { useState, useEffect, useRef } from 'react';
import SignModel from './SignModel';
import './SignLanguageDemo.css';

/**
 * Enhanced demo component with improved sign language visualization
 */
const SignLanguageDemo = () => {
  const [inputText, setInputText] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [signSequence, setSignSequence] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [supportedWords, setSupportedWords] = useState([]);
  
  const timerRef = useRef(null);
  
  // Effect to load supported signs
  useEffect(() => {
    // Import the sign language mapper to get supported signs
    import('../utils/signLanguageMapper')
      .then(({ KNOWN_SIGNS }) => {
        if (KNOWN_SIGNS) {
          const words = Object.keys(KNOWN_SIGNS);
          setSupportedWords(words);
        }
      })
      .catch(error => {
        console.error('Error loading sign language mapper:', error);
        setError('오류: 수화 매퍼를 불러올 수 없습니다.');
      });
  }, []);

  // Effect to handle the animation sequence
  useEffect(() => {
    if (isPlaying && signSequence.length > 0) {
      // Set the current word based on the sequence index
      setCurrentWord(signSequence[currentWordIndex]);
      
      // Schedule the next word after a delay
      if (currentWordIndex < signSequence.length - 1) {
        timerRef.current = setTimeout(() => {
          setCurrentWordIndex(prevIndex => prevIndex + 1);
        }, 3000); // 3 seconds per sign
      } else {
        // End of sequence
        setTimeout(() => {
          setIsPlaying(false);
        }, 3000);
      }
    }
    
    // Cleanup timer on component unmount or when stopping
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, signSequence, currentWordIndex]);

  const processText = () => {
    if (!inputText.trim()) {
      setError('처리할 텍스트가 없습니다.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    // Import the sign language mapper
    import('../utils/signLanguageMapper')
      .then(({ textToSignSequence, extractKeySignWord }) => {
        // Simple approach - just extract the key words that we can sign
        const sequence = [];
        
        // Split the text by spaces and punctuation
        const words = inputText.split(/[\s,.?!;:]+/).filter(w => w);
        
        words.forEach(word => {
          const signWord = extractKeySignWord(word);
          if (signWord) {
            sequence.push(signWord);
          }
        });
        
        if (sequence.length === 0) {
          setError('번역할 수 있는 수화 단어가 없습니다.');
          setIsProcessing(false);
          return;
        }
        
        // Set the sequence and start playing
        setSignSequence(sequence);
        setCurrentWordIndex(0);
        setIsPlaying(true);
        setIsProcessing(false);
      })
      .catch(error => {
        console.error('Error processing text:', error);
        setIsProcessing(false);
        setError('텍스트 처리 중 오류가 발생했습니다.');
      });
  };

  const stopPlaying = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (isPlaying) {
      stopPlaying();
    }
    processText();
  };

  const handleExampleClick = (example) => {
    setInputText(example);
    if (isPlaying) {
      stopPlaying();
    }
    setCurrentWord('');
  };
  
  // Example phrases to demonstrate
  const examples = [
    '안녕하세요',
    '감사합니다',
    '도와주세요',
    '물 주세요',
    '배고파요'
  ];

  return (
    <div className="sign-language-demo">
      <h2>향상된 한국 수화 번역기</h2>

      <div className="demo-controls">
        <form onSubmit={handleTextSubmit} className="input-form">
          <div className="input-container">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="번역할 텍스트를 입력하세요..."
              disabled={isProcessing || isPlaying}
            />
            <button 
              type="submit" 
              disabled={!inputText.trim() || isProcessing || isPlaying}
              className="translate-button"
            >
              {isPlaying ? '번역 중...' : '수화로 번역'}
            </button>
          </div>
        </form>

        {isPlaying && (
          <div className="playback-controls">
            <span>번역중: {currentWordIndex + 1}/{signSequence.length}</span>
            <button onClick={stopPlaying} className="stop-button">
              중지
            </button>
          </div>
        )}
      </div>

      <div className="examples-section">
        <h3>예시 문장:</h3>
        <div className="examples-container">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="example-button"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="model-visualization">
        <div className="model-container">
          <SignModel word={currentWord} />
          
          {currentWord && (
            <div className="current-word-display">
              <strong>현재 단어:</strong> {currentWord}
            </div>
          )}
        </div>
        
        {signSequence.length > 0 && (
          <div className="sequence-display">
            <h3>번역 순서:</h3>
            <div className="sequence-words">
              {signSequence.map((word, index) => (
                <span 
                  key={index} 
                  className={`sequence-word ${index === currentWordIndex && isPlaying ? 'active' : ''}`}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="supported-signs">
        <details>
          <summary>지원되는 단어 목록 ({supportedWords.length}개)</summary>
          <div className="supported-words-list">
            {supportedWords.map((word, index) => (
              <span key={index} className="supported-word">
                {word}
              </span>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};

export default SignLanguageDemo;