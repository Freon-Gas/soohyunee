import React, { useState, useRef, useEffect } from 'react';
import './SpeechRecognizer.css'; // Reuse the existing styles

const WhisperRecognizer = ({ onResult, compact = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
          
          // Send to Whisper API
          await sendAudioToWhisper(audioBlob);
        } catch (err) {
          console.error('Error processing audio:', err);
          setError('음성 처리 중 오류가 발생했습니다.');
        } finally {
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

  // Initialize recording setup on component mount
  useEffect(() => {
    setupRecording();
    
    // Cleanup on unmount
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Toggle recording state
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      // Start new recording
      try {
        await setupRecording();
        if (mediaRecorderRef.current) {
          audioChunksRef.current = [];
          mediaRecorderRef.current.start();
          setIsRecording(true);
          setError(null);
        }
      } catch (err) {
        console.error('Error starting recording:', err);
        setError('녹음 시작에 실패했습니다.');
      }
    }
  };

  // Send audio to Whisper API
  const sendAudioToWhisper = async (audioBlob) => {
    // Create a FormData object to send the audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ko'); // Specify Korean language
    
    try {
      // Replace with your API endpoint that handles the Whisper API call
      // This could be your backend server that proxies to OpenAI
      const response = await fetch('/api/whisper-transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.text) {
        // Pass the transcribed text back to the parent component
        onResult(data.text);
      } else {
        setError('인식된 텍스트가 없습니다.');
      }
    } catch (err) {
      console.error('Error sending audio to Whisper:', err);
      setError('음성 인식 서비스에 연결할 수 없습니다.');
      throw err;
    }
  };

  // Render compact version for Soohyunee layout
  if (compact) {
    return (
      <div className="speech-recognizer-compact">
        <button 
          className={`mic-button-compact ${isRecording ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
          onClick={toggleRecording}
          disabled={isProcessing}
          title={isRecording ? '녹음 중...' : isProcessing ? '처리 중...' : '말하기'}
        >
          {isProcessing ? (
            // Show loading spinner when processing
            <div className="loading-spinner"></div>
          ) : (
            // Show microphone icon
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
        
        {error && (
          <div className="error-bubble">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Render standard version
  return (
    <div className="speech-recognizer">
      <div className="voice-input">
        <button 
          className={`mic-button ${isRecording ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
          onClick={toggleRecording}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="loading-spinner"></div>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
        <div className="status">
          {isRecording ? '녹음 중...' : isProcessing ? '처리 중...' : '눌러서 말하기'}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default WhisperRecognizer;