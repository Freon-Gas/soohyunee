import React, { useState, useEffect } from 'react';
import './SpeechRecognizer.css';

const SpeechRecognizer = ({ onResult, onTextInput }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
      setError(null);
    } else {
      setError('Speech recognition not supported in your browser');
    }
    
    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, [onResult]);

  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        console.error('Error starting recognition', err);
        setError(`Error starting recognition: ${err.message}`);
      }
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onTextInput(inputText);
      setInputText('');
    }
  };

  return (
    <div className="speech-recognizer">
      <div className="input-methods">
        <div className="voice-input">
          <button 
            className={`mic-button ${isListening ? 'active' : ''}`}
            onClick={toggleListening}
            disabled={!recognition}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
          <div className="status">
            {isListening ? 'Listening...' : 'Tap to speak'}
          </div>
        </div>

        <div className="text-divider">OR</div>

        <form className="text-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type what you want to translate..."
            className="text-input"
          />
          <button type="submit" className="submit-button">
            Translate
          </button>
        </form>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default SpeechRecognizer;