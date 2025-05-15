import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './mode-buttons.css';
import SignModel from './components/SignModel';
import ConversationHistory from './components/ConversationHistory';
import TestAnimation from './components/TestAnimation';
import SignLanguageDemo from './components/SignLanguageDemo';

function App() {
  const [text, setText] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState(null);
  
  // References for audio recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);

  // Load saved conversations from localStorage
  useEffect(() => {
    const savedConversations = localStorage.getItem('signLanguageConversations');
    if (savedConversations) {
      try {
        setConversations(JSON.parse(savedConversations));
      } catch (error) {
        console.error('대화 기록 로딩 오류:', error);
      }
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('signLanguageConversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Set up audio recording
  const setupRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        try {
          // Create an audio blob from the recorded chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Reset audio chunks for next recording
          audioChunksRef.current = [];
          
          // Send audio to backend Whisper API
          const audioFormData = new FormData();
          audioFormData.append('file', audioBlob, 'recording.webm');
          
          try {
            // Make sure to use the correct CORS origin from your .env file
            const response = await fetch('http://localhost:3001/api/whisper-transcribe', {
              method: 'POST',
              body: audioFormData,
              // Add proper headers for CORS
              headers: {
                'Accept': 'application/json'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.text) {
              // Use the transcribed text from Whisper
              handleSpeechResult(data.text);
            } else {
              setError('인식된 텍스트가 없습니다.');
              setIsProcessing(false);
            }
          } catch (err) {
            console.error('Error connecting to Whisper service:', err);
            setError('음성 인식 서비스에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.');
            setIsProcessing(false);
          }
        } catch (err) {
          console.error('Error processing audio:', err);
          setError('음성 처리 중 오류가 발생했습니다.');
          setIsProcessing(false);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      setError(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('마이크 접근에 실패했습니다. 마이크 권한을 확인해주세요.');
    }
  };

  // Toggle recording state
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
      
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    } else {
      // Start new recording
      try {
        await setupRecording();
        if (mediaRecorderRef.current) {
          audioChunksRef.current = [];
          mediaRecorderRef.current.start();
          setIsRecording(true);
          setError(null);
          
          // Set a timeout to stop recording after 10 seconds
          recordingTimeoutRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          }, 10000); // 10 seconds
        }
      } catch (err) {
        console.error('Error starting recording:', err);
        setError('녹음 시작에 실패했습니다.');
      }
    }
  };

  const handleSpeechResult = (transcript) => {
    setText(transcript);
    processText(transcript);
    
    // Save to conversation history
    saveToConversationHistory(transcript);
  };

  const handleTextInput = () => {
    if (!inputText.trim()) return;
    
    setText(inputText);
    processText(inputText);
    
    // Save to conversation history
    saveToConversationHistory(inputText);
    
    // Clear input field
    setInputText('');
  };

  const saveToConversationHistory = (newText) => {
    const now = new Date();
    
    // Create a new conversation or add to existing one
    if (!currentConversationId || conversations.length === 0) {
      // Create new conversation - use Korean date format
      const newConversation = {
        id: Date.now().toString(),
        title: `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`,
        phrases: [{ text: newText, timestamp: now }],
        lastUpdated: now
      };
      
      setConversations([newConversation, ...conversations]);
      setCurrentConversationId(newConversation.id);
    } else {
      // Add to existing conversation
      setConversations(conversations.map(convo => {
        if (convo.id === currentConversationId) {
          return {
            ...convo,
            phrases: [...convo.phrases, { text: newText, timestamp: now }],
            lastUpdated: now
          };
        }
        return convo;
      }));
    }
  };

  // Dynamic text processing function - works with any word
  const processText = (text) => {
    setIsProcessing(true);
    
    // For Korean text, we need to process it properly
    if (!text || !text.trim()) {
      setIsProcessing(false);
      setError('처리할 텍스트가 없습니다.');
      return;
    }
    
    // Import the sign language mapper
    import('./utils/signLanguageMapper')
      .then(({ extractKeySignWord, textToSignSequence }) => {
        // Process the text to get key sign words
        const keyWord = extractKeySignWord(text);
        
        if (!keyWord) {
          setIsProcessing(false);
          setError('추출할 수화 단어가 없습니다.');
          return;
        }
        
        console.log(`Processing word: "${keyWord}"`);
        
        // Set the current word - the SignModel component will try to load
        // keypoint data from the folder with this name
        setTimeout(() => {
          setCurrentWord(keyWord);
          setIsProcessing(false);
        }, 300);
        
        // Future enhancement: Process full sequence of signs
        // const signSequence = textToSignSequence(text);
        // This would allow for showing multiple signs in sequence
      })
      .catch(error => {
        console.error('Error processing text:', error);
        setIsProcessing(false);
        setError('텍스트 처리 중 오류가 발생했습니다.');
      });
  };

  const handleSelectConversation = (convoId, phraseText) => {
    setText(phraseText);
    processText(phraseText);
    setCurrentConversationId(convoId);
  };

  const handleDeleteConversation = (convoId) => {
    setConversations(conversations.filter(convo => convo.id !== convoId));
    if (currentConversationId === convoId) {
      setCurrentConversationId(null);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const dismissError = () => {
    setError(null);
  };

  const [displayMode, setDisplayMode] = useState('normal'); // 'normal', 'test', or 'improved'

  const toggleMode = (mode) => {
    setDisplayMode(mode);
  };

  return (
    <div className="app">
      <div className="main-header">
        <h1 className="app-title">SOOHYUNEE</h1>
        <div className="mode-buttons">
          <button 
            className={`mode-button ${displayMode === 'normal' ? 'active' : ''}`} 
            onClick={() => toggleMode('normal')}
          >
            일반 모드
          </button>
          <button 
            className={`mode-button ${displayMode === 'test' ? 'active' : ''}`} 
            onClick={() => toggleMode('test')}
          >
            테스트 모드
          </button>
          <button 
            className={`mode-button ${displayMode === 'improved' ? 'active' : ''}`} 
            onClick={() => toggleMode('improved')}
          >
            향상된 모드
          </button>
        </div>
      </div>

      {displayMode === 'test' ? (
        <div className="app-content">
          <TestAnimation />
        </div>
      ) : displayMode === 'improved' ? (
        <div className="app-content">
          <SignLanguageDemo />
        </div>
      ) : (
        <div className={`app-container ${showSidebar ? 'with-sidebar' : ''}`}>
        {/* Sidebar with conversation history */}
        <div className="sidebar">
          <ConversationHistory 
            conversations={conversations} 
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>
        
        {/* Sidebar toggle button - always attached to the sidebar */}
        <div className="sidebar-toggle" onClick={toggleSidebar}>
          {showSidebar ? '◀' : '▶'}
        </div>
        
        <div className="main-content">
          <header className="app-header">
            {/* Removed h1 since it's now in the main header */}
          </header>

          <main className="app-main">            
            {/* 3D Model Visualization */}
            <div className="visualization-section">
              <SignModel word={currentWord} />
              
              {/* Only show model info when there's a word being displayed */}
              {currentWord && (
                <div className="model-info">
                  {`수화: ${currentWord}`}
                </div>
              )}
              
              {/* Compact control panel at bottom */}
              <div className="control-panel">
                <button 
                  className={`speech-button ${isRecording ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
                  onClick={toggleRecording}
                  disabled={isProcessing}
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
                    placeholder="번역할 텍스트를 입력하세요..."
                    onKeyPress={(e) => e.key === 'Enter' && handleTextInput()}
                  />
                  <button 
                    className="submit-button"
                    onClick={handleTextInput}
                  >
                    →
                  </button>
                </div>
              </div>
              
              {/* Error message toast */}
              {error && (
                <div className="error-toast">
                  <span>{error}</span>
                  <button onClick={dismissError}>×</button>
                </div>
              )}
              
              {/* Debug button */}
              <button className="debug-button" onClick={() => {
                window.debug_3d_model && window.debug_3d_model();
              }}>
                Debug
              </button>
            </div>
          </main>
        </div>
      </div>
      )}
    </div>
  );
}

export default App;