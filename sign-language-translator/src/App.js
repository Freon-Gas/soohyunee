import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import SignModel from './components/ImprovedKeypointSignModel';
import ConversationHistory from './components/ConversationHistory';
import KoreanSpeechRecognition from './utils/speechRecognition';
import { convertToSignLanguageGrammar, simpleSignLanguageConversion } from './utils/signLanguageGrammar';

function App() {
  const [text, setText] = useState('');
  const [signGrammarText, setSignGrammarText] = useState('');
  const [wordSequence, setWordSequence] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState(null);
  
  // References for speech recognition
  const speechRecognitionRef = useRef(null);
  const speechTimeoutRef = useRef(null);
  const signModelRef = useRef(null); // Reference to SignModel component
  const [interimText, setInterimText] = useState('');
  const [recognitionSupported, setRecognitionSupported] = useState(true);

  // Processing control refs (최적화)
  const processingTimeoutRef = useRef(null);
  // FIXED: Remove lastProcessedTextRef to allow repeated words
  // const lastProcessedTextRef = useRef(''); // Removed or not used for duplicate prevention
  const isWordSequenceRunningRef = useRef(false);

  // 최적화된 수어 단어 시퀀스 처리 - 콜백 방식
  const processSignLanguageSequence = useCallback(async (sequence) => {
    
    
    // 이미 실행 중이면 중단
    if (isWordSequenceRunningRef.current) {
      return;
    }
    
    if (!sequence || sequence.length === 0) {
      return;
    }
    
    isWordSequenceRunningRef.current = true;
    setIsProcessing(true);
    
    try {
      for (let i = 0; i < sequence.length; i++) {
        // 중단 체크
        if (!isWordSequenceRunningRef.current) {
          break;
        }
        
        const word = sequence[i];
        
        setCurrentWordIndex(i);
        setCurrentWord(word);
        
        // 애니메이션 완료 대기
        await waitForAnimationCompleteOrError();
      }
      
    } catch (error) {
    } finally {
      setIsProcessing(false);
      isWordSequenceRunningRef.current = false;
      processingTimeoutRef.current = null;
    }
  }, []);

  // 애니메이션 완료 대기 후 
  const waitForAnimationCompleteOrError = useCallback(() => {
    return new Promise((resolve) => {
      const handleComplete = () => {
        resolve();
      };
      
      // 완료 콜백 임시 저장
      processingTimeoutRef.current = handleComplete;
    });
  }, []);

  // 애니메이션 완료 대기 후 
  const waitForAnimationComplete = useCallback(() => {
    return new Promise((resolve) => {
      const handleComplete = () => {
        resolve();
      };
      
      // 완료 콜백을 임시로 저장
      processingTimeoutRef.current = handleComplete;
    });
  }, []);

  // SignModel에서 호출되는 콜백
  const handleAnimationComplete = useCallback((completedWord) => {
    if (processingTimeoutRef.current) {
      processingTimeoutRef.current();
      processingTimeoutRef.current = null;
    }
  }, []);

  // 시퀀스 중단 함수
  const stopWordSequence = useCallback(() => {
    isWordSequenceRunningRef.current = false;
    if (processingTimeoutRef.current) {
      processingTimeoutRef.current();
      processingTimeoutRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  // Load saved conversations from localStorage
  useEffect(() => {
    try {
      const savedConversations = localStorage.getItem('signLanguageConversations');
      if (savedConversations) {
        const parsedConversations = JSON.parse(savedConversations);
        setConversations(parsedConversations);
        
        if (parsedConversations.length > 0) {
          setCurrentConversationId(parsedConversations[0].id);
        }
      } else {
      }
    } catch (error) {
      console.error('❌ 대화 기록 로딩 오류:', error);
    }
  }, []);

  // Save conversations to localStorage whenever they change 
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (conversations.length > 0) {
        localStorage.setItem('signLanguageConversations', JSON.stringify(conversations));
      }
    }, 500); // 500ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [conversations]);

  // Initialize speech recognition
  useEffect(() => {
    
    const speechRecognition = new KoreanSpeechRecognition();
    speechRecognitionRef.current = speechRecognition;
    
    const isSupported = speechRecognition.getIsSupported();
    setRecognitionSupported(isSupported);
    
    if (!isSupported) {
      console.error('❌ Speech recognition not supported in this browser');
      setError('이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
      return;
    }
    
    // Set up callbacks
    speechRecognition.onResult((result) => {
      setInterimText(result.interim);
      
      if (result.final && result.final.trim()) {
        handleSpeechResult(result.final.trim());
        setInterimText('');
      }
    });
    
    speechRecognition.onError((errorMessage) => {
      console.error('🎤 Speech recognition error:', errorMessage);
      setError(errorMessage);
      setIsRecording(false);
      setIsProcessing(false);
      setInterimText('');
    });
    
    speechRecognition.onStart(() => {
      setIsRecording(true);
      setError(null);
      setInterimText('');
      
      // 자동 정지 타이머 (15초)
      speechTimeoutRef.current = setTimeout(() => {
        speechRecognition.stop();
      }, 15000);
    });
    
    speechRecognition.onEnd(() => {
      setIsRecording(false);
      setInterimText('');
      
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
    });
    
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort();
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      stopWordSequence(); // 컴포넌트 언마운트 시 시퀀스 중단
    };
  }, [stopWordSequence]);

  // Toggle speech recognition
  const toggleSpeechRecognition = useCallback(() => {
    
    if (!recognitionSupported) {
      setError('이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
      return;
    }
    
    const speechRecognition = speechRecognitionRef.current;
    if (!speechRecognition) {
      setError('음성 인식이 초기화되지 않았습니다.');
      return;
    }
    
    if (isRecording) {
      // Stop recognition
      speechRecognition.stop();
    } else {
      // Clear any previous timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      
      // Start recognition - DON'T call stopWordSequence here!
      speechRecognition.start();
    }
  }, [recognitionSupported, isRecording]);

  // FIXED: 최적화된 음성 결과 처리 - 중복 방지 제거
  const handleSpeechResult = useCallback(async (transcript) => {
    
    // 이전 처리 중단
    stopWordSequence();
    
    setText(transcript);
    
    // 수어 문법 변환 시작
    setIsConverting(true);
    let convertedSignGrammar = '';
    
    try {
      const conversion = await convertToSignLanguageGrammar(transcript);
      convertedSignGrammar = conversion.signGrammar;
      setSignGrammarText(conversion.signGrammar);
      setWordSequence(conversion.wordSequence);
      
      // 첫 번째 단어부터 애니메이션 시작
      if (conversion.wordSequence.length > 0) {
        setCurrentWordIndex(0);
        processSignLanguageSequence(conversion.wordSequence);
      } else {
      }
      
    } catch (error) {
      console.error('❌ Sign language conversion failed:', error);
      // 변환 실패시 기본 처리
      const fallback = simpleSignLanguageConversion(transcript);
      convertedSignGrammar = fallback.signGrammar;
      setSignGrammarText(fallback.signGrammar);
      setWordSequence(fallback.wordSequence);
      
      if (fallback.wordSequence.length > 0) {
        setCurrentWordIndex(0);
        processSignLanguageSequence(fallback.wordSequence);
      }
    } finally {
      setIsConverting(false);
    }
    
    // Save to conversation history with the converted grammar
    saveToConversationHistory(transcript, convertedSignGrammar);
  }, [processSignLanguageSequence, stopWordSequence]);


  const handleTextInput = useCallback(async () => {
    if (!inputText.trim()) return;
    
    const textToProcess = inputText.trim();
    
    
    // 이전 처리 중단
    stopWordSequence();
    
    setText(textToProcess);
    
    // 수어 문법 변환
    setIsConverting(true);
    let convertedSignGrammar = '';
    
    try {
      const conversion = await convertToSignLanguageGrammar(textToProcess);
      
      convertedSignGrammar = conversion.signGrammar;
      setSignGrammarText(conversion.signGrammar);
      setWordSequence(conversion.wordSequence);
      
      if (conversion.wordSequence.length > 0) {
        setCurrentWordIndex(0);
        processSignLanguageSequence(conversion.wordSequence);
      }
      
    } catch (error) {
      console.error('❌ Text conversion failed:', error);
      const fallback = simpleSignLanguageConversion(textToProcess);
      convertedSignGrammar = fallback.signGrammar;
      setSignGrammarText(fallback.signGrammar);
      setWordSequence(fallback.wordSequence);
      
      if (fallback.wordSequence.length > 0) {
        setCurrentWordIndex(0);
        processSignLanguageSequence(fallback.wordSequence);
      }
    } finally {
      setIsConverting(false);
    }
    
    // Save to conversation history with the converted grammar
    saveToConversationHistory(textToProcess, convertedSignGrammar);
    
    // Clear input field
    setInputText('');
  }, [inputText, processSignLanguageSequence, stopWordSequence]);

  // 최적화된 대화 기록 저장
  const saveToConversationHistory = useCallback((originalText, signGrammarText = null) => {
    const now = new Date();
    
    setConversations(prevConversations => {
      
      const existingConversation = currentConversationId ? 
        prevConversations.find(convo => convo.id === currentConversationId) : null;
      
      if (existingConversation) {
        return prevConversations.map(convo => {
          if (convo.id === currentConversationId) {
            const updatedConvo = {
              ...convo,
              phrases: [...convo.phrases, { 
                text: originalText, 
                signGrammar: signGrammarText,
                timestamp: now 
              }],
              lastUpdated: now
            };
            return updatedConvo;
          }
          return convo;
        });
      } else {
        const newConversation = {
          id: Date.now().toString(),
          title: `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`,
          phrases: [{ 
            text: originalText, 
            signGrammar: signGrammarText,
            timestamp: now 
          }],
          lastUpdated: now
        };
        
        setCurrentConversationId(newConversation.id);
        
        return [newConversation, ...prevConversations];
      }
    });
  }, [currentConversationId]);

  const handleSelectConversation = useCallback(async (convoId, phraseText) => {
    
    // 이전 처리 중단
    stopWordSequence();

    setText(phraseText);
    
    // 수어 문법 변환으로 처리
    setIsConverting(true);
    try {
      const conversion = await convertToSignLanguageGrammar(phraseText);
      setSignGrammarText(conversion.signGrammar);
      setWordSequence(conversion.wordSequence);
      
      if (conversion.wordSequence.length > 0) {
        setCurrentWordIndex(0);
        processSignLanguageSequence(conversion.wordSequence);
      }
    } catch (error) {
      const fallback = simpleSignLanguageConversion(phraseText);
      setSignGrammarText(fallback.signGrammar);
      setWordSequence(fallback.wordSequence);
      
      if (fallback.wordSequence.length > 0) {
        setCurrentWordIndex(0);
        processSignLanguageSequence(fallback.wordSequence);
      }
    } finally {
      setIsConverting(false);
    }
    
    setCurrentConversationId(convoId);
  }, [processSignLanguageSequence, stopWordSequence]);

  const handleDeleteConversation = useCallback((convoId) => {
    setConversations(conversations.filter(convo => convo.id !== convoId));
    if (currentConversationId === convoId) {
      setCurrentConversationId(null);
    }
  }, [conversations, currentConversationId]);

  const toggleSidebar = useCallback(() => {
    setShowSidebar(!showSidebar);
  }, [showSidebar]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  // Enter 키 처리 최적화
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextInput();
    }
  }, [handleTextInput]);

  // 홈페이지로 돌아가기 (idle 포즈)
  const goToIdlePage = useCallback(() => {
    
    // 현재 애니메이션 중단
    stopWordSequence();
    
    // SignModel 컴포넌트 리셋
    if (signModelRef.current && signModelRef.current.resetToIdle) {
      signModelRef.current.resetToIdle();
    }
    
    // 모든 상태 초기화
    setText('');
    setSignGrammarText('');
    setWordSequence([]);
    setCurrentWordIndex(0);
    setCurrentWord('');
    setInputText('');
    setIsProcessing(false);
    setIsConverting(false);
    
    // 음성 인식이 실행 중이면 중단
    if (isRecording && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    
  }, [stopWordSequence, isRecording]);

  return (
    <div className="app">
      <div className={`app-container ${showSidebar ? 'with-sidebar' : ''}`}>
        {/* Sidebar with conversation history */}
        <div className="sidebar">
          <ConversationHistory 
            conversations={conversations} 
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>
        
        {/* Sidebar toggle button */}
        <div className="sidebar-toggle" onClick={toggleSidebar}>
          {showSidebar ? '◀' : '▶'}
        </div>
        
        <div className="main-content">
          <header className="app-header">
            <h1 
              onClick={goToIdlePage}
              style={{ cursor: 'pointer' }}
              title="클릭하여 메인 페이지로 돌아가기"
            >
              SOOHYUNEE
            </h1>
          </header>

          <main className="app-main">            
            {/* 3D Model Visualization */}
            <div className="visualization-section">
              <SignModel 
                word={currentWord} 
                onAnimationComplete={handleAnimationComplete}
                onReset={signModelRef}
              />
              
              {/* Model info - 사이드바 위치에 따라 동적 이동 */}
              {currentWord && (
                <div className="model-info">
                  <div className="current-word">
                    수어: {currentWord}
                    {wordSequence.length > 0 && (
                      <span className="word-progress">
                        ({currentWordIndex + 1}/{wordSequence.length})
                      </span>
                    )}
                  </div>
                  {signGrammarText && text !== signGrammarText && (
                    <div className="grammar-conversion">
                      <div className="original-text">원문: {text}</div>
                      <div className="sign-grammar">수어: {signGrammarText}</div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Show sign language conversion process */}
              {isConverting && (
                <div className="conversion-status">
                  <div className="converting-indicator">
                    수어 문법으로 변환 중...
                  </div>
                </div>
              )}
              
              {/* Show interim speech recognition results */}
              {(isRecording || interimText) && (
                <div className="speech-interim">
                  <div className="listening-indicator">
                    {isRecording && !interimText && '듣고 있습니다...'}
                  </div>
                  {interimText && (
                    <div className="interim-text">
                      {interimText}
                    </div>
                  )}
                </div>
              )}
              
              {/* Compact control panel at bottom */}
              <div className="control-panel">
                <button 
                  className={`speech-button ${isRecording ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
                  onClick={toggleSpeechRecognition}
                  disabled={isProcessing || !recognitionSupported}
                >
                  {isProcessing ? (
                    <div className="loading-spinner"></div>
                  ) : isRecording ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                      <rect x="6" y="6" width="12" height="12" rx="1"></rect>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                </button>
                
                <div className="text-input-container">
                  <input
                    type="text"
                    className="text-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="번역할 텍스트를 입력하세요..."
                    disabled={isProcessing}
                  />
                  <button 
                    className="submit-button"
                    onClick={handleTextInput}
                    disabled={isProcessing || !inputText.trim()}
                  >
                    →
                  </button>
                </div>
                
                {/* Stop button for processing */}
                {isProcessing && (
                  <button 
                    className="stop-button"
                    onClick={stopWordSequence}
                    title="애니메이션 중지"
                  >
                    ⏹
                  </button>
                )}
              </div>
              
              {/* Error message toast */}
              {error && (
                <div className="error-toast">
                  <span>{error}</span>
                  <button onClick={dismissError}>×</button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;