class KoreanSpeechRecognition {
  constructor() {
    this.recognition = null;
    this.isSupported = false;
    this.isListening = false;
    this.callbacks = {
      onResult: null,
      onError: null,
      onStart: null,
      onEnd: null
    };
    
    this.initializeRecognition();
  }

  initializeRecognition() {
    // Check if Web Speech API is supported
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new window.webkitSpeechRecognition();
      this.isSupported = true;
      this.setupRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new window.SpeechRecognition();
      this.isSupported = true;
      this.setupRecognition();
    } else {
      console.warn('Speech Recognition not supported in this browser');
      this.isSupported = false;
    }
  }

  setupRecognition() {
    if (!this.recognition) return;

    // Configure recognition settings - 한국어 최적화
    this.recognition.continuous = true; // 연속 듣기 모드
    this.recognition.interimResults = true; // 중간 결과 표시
    this.recognition.lang = 'ko-KR'; // 한국어
    this.recognition.maxAlternatives = 3; 

    console.log('Speech Recognition configured for Korean:', {
      continuous: this.recognition.continuous,
      interimResults: this.recognition.interimResults,
      lang: this.recognition.lang,
      maxAlternatives: this.recognition.maxAlternatives
    });

    // Event handlers
    this.recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      this.isListening = true;
      if (this.callbacks.onStart) {
        this.callbacks.onStart();
      }
    };

    this.recognition.onresult = (event) => {
      console.log('🎯 Speech recognition result event (Korean):', event);
      console.log('Total results:', event.results.length);
      
      let finalTranscript = '';
      let interimTranscript = '';

      // Process all results from the last result index
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;

        console.log(`Result ${i} (Korean):`, {
          transcript,
          confidence,
          isFinal: result.isFinal,
          alternatives: Array.from(result).map(alt => alt.transcript)
        });

        if (result.isFinal) {
          finalTranscript += transcript;
          console.log('🎯 FINAL Korean transcript:', transcript);
        } else {
          interimTranscript += transcript;
          console.log('💬 INTERIM Korean transcript:', transcript);
        }
      }

      // Call the result callback
      if (this.callbacks.onResult) {
        const resultData = {
          final: finalTranscript,
          interim: interimTranscript,
          confidence: event.results[event.results.length - 1][0].confidence || 0
        };
        console.log('Calling Korean onResult callback with:', resultData);
        this.callbacks.onResult(resultData);
      } else {
        console.warn('No onResult callback set for Korean recognition!');
      }
    };

    this.recognition.onerror = (event) => {
      console.error('🚨 Speech recognition error:', event);
      console.error('Error details:', {
        error: event.error,
        message: event.message,
        type: event.type
      });
      this.isListening = false;
      
      let errorMessage = '음성 인식 오류가 발생했습니다.';
      
      switch (event.error) {
        case 'network':
          errorMessage = '네트워크 연결을 확인해주세요.';
          break;
        case 'not-allowed':
          errorMessage = '마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
          break;
        case 'no-speech':
          errorMessage = '음성이 감지되지 않았습니다. 다시 시도해주세요.';
          break;
        case 'audio-capture':
          errorMessage = '마이크에 접근할 수 없습니다.';
          break;
        case 'service-not-allowed':
          errorMessage = '음성 인식 서비스를 사용할 수 없습니다.';
          break;
        default:
          errorMessage = `음성 인식 오류: ${event.error}`;
      }

      console.log('Calling onError callback with:', errorMessage);
      if (this.callbacks.onError) {
        this.callbacks.onError(errorMessage);
      }
    };

    this.recognition.onend = () => {
      console.log('🔊 Speech recognition ended');
      this.isListening = false;
      if (this.callbacks.onEnd) {
        this.callbacks.onEnd();
      }
    };

    // 추가 이벤트들 - 디버그용
    this.recognition.onspeechstart = () => {
      console.log('🗣️ Speech detected - user is speaking');
    };

    this.recognition.onspeechend = () => {
      console.log('⏹️ Speech ended - user stopped speaking');
    };

    this.recognition.onsoundstart = () => {
      console.log('🔊 Sound detected');
    };

    this.recognition.onsoundend = () => {
      console.log('🔇 Sound ended');
    };

    this.recognition.onaudiostart = () => {
      console.log('🎧 Audio capture started');
    };

    this.recognition.onaudioend = () => {
      console.log('🎧 Audio capture ended');
    };

    this.recognition.onnomatch = () => {
      console.log('❌ No speech recognized - no match found');
    };
  }

  // Start listening
  start() {
    console.log('🚀 Attempting to start speech recognition...');
    
    if (!this.isSupported) {
      console.error('❌ Speech recognition not supported');
      if (this.callbacks.onError) {
        this.callbacks.onError('이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
      }
      return false;
    }

    if (this.isListening) {
      console.warn('⚠️ Already listening - stopping current session first');
      this.recognition.stop();
      return false;
    }

    // Check microphone permissions first
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log('✓ Microphone access granted');
        this.startRecognition();
      })
      .catch((error) => {
        console.error('❌ Microphone access denied:', error);
        if (this.callbacks.onError) {
          this.callbacks.onError('마이크 접근 권한이 필요합니다. 브라우저에서 마이크를 허용해주세요.');
        }
      });

    return true;
  }

  startRecognition() {
    console.log('✓ Starting speech recognition with config:', {
      lang: this.recognition.lang,
      continuous: this.recognition.continuous,
      interimResults: this.recognition.interimResults
    });

    try {
      this.recognition.start();
      console.log('✓ Recognition start() called successfully');
    } catch (error) {
      console.error('❌ Error starting recognition:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('음성 인식을 시작할 수 없습니다.');
      }
    }
  }

  // Stop listening
  stop() {
    console.log('🛑 Stopping speech recognition...');
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Abort current recognition
  abort() {
    console.log('⚠️ Aborting speech recognition...');
    if (this.recognition && this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  // Set callbacks
  onResult(callback) {
    this.callbacks.onResult = callback;
  }

  onError(callback) {
    this.callbacks.onError = callback;
  }

  onStart(callback) {
    this.callbacks.onStart = callback;
  }

  onEnd(callback) {
    this.callbacks.onEnd = callback;
  }

  // Check if currently listening
  getIsListening() {
    return this.isListening;
  }

  // Check if supported
  getIsSupported() {
    return this.isSupported;
  }
}

export default KoreanSpeechRecognition;