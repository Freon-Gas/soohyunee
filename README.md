# Korean Sign Language Translator

This project is a web-based application that visualizes Korean Sign Language (KSL) using 3D models and OpenPose keypoint data. It converts audio or text input to corresponding sign language animations displayed through an interactive 3D character.

## Features

- **Speech-to-Text Conversion**: Uses OpenAI's Whisper API to convert Korean speech to text
- **Text-to-Sign Translation**: Processes Korean text to identify key words for sign language representation
- **3D Animation**: Visualizes sign language using a 3D model with realistic pose animation
- **Conversation History**: Saves and manages conversation history for future reference
- **Multiple Modes**:
  - Normal Mode: Basic sign language visualization
  - Test Mode: Debug and test sign language animations
  - Enhanced Mode: Improved visualization with sentence processing

## Technology Stack

- **Frontend**: React.js
- **3D Visualization**: Three.js
- **Motion Data**: OpenPose format keypoints
- **Speech Recognition**: OpenAI Whisper API
- **Backend**: Node.js with Express

## Project Structure

```
/sign-language-translator/
├── public/
│   ├── data/
│   │   └── signs/          # Sign language keypoint data
│   │       └── 사과/       # Example: "Apple" sign keypoints
│   └── models/             # 3D model files
├── src/
│   ├── components/         # React components
│   │   ├── SignModel.js    # 3D model renderer with animation
│   │   ├── ConversationHistory.js
│   │   ├── TestAnimation.js
│   │   └── SignLanguageDemo.js
│   ├── utils/              # Utility functions
│   │   ├── signLanguageMapper.js  # Maps Korean to sign language
│   │   ├── keypointMapper.js      # Maps keypoints to bone animation
│   │   └── improvedAnimationUtils.js
│   └── App.js              # Main application
└── /sign-language-translator-backend/
    ├── routes/
    │   └── whisperService.js  # Speech-to-text API route
    └── server.js              # Express server
```

## Key Components

1. **SignModel**: The core component that renders the 3D model and applies animations based on sign language keypoints.

2. **improvedAnimationUtils**: Utilities for loading and applying OpenPose keypoint animations to the 3D model.

3. **signLanguageMapper**: Maps Korean words and phrases to available sign language animations.

4. **whisperService**: Backend API for speech-to-text conversion using OpenAI's Whisper.

## Supported Signs

The application currently supports the following Korean signs:
- 안녕/안녕하세요 (Hello/Hi)
- 사과 (Apple)
- 감사합니다 (Thank you)
- 괜찮아요 (Okay)
- 네/예 (Yes)
- 아니오 (No)
- 도와주세요 (Help)
- 물 (Water)
- 배고파요 (Hungry)
- 이름 (Name)
- 만나서 반가워요 (Nice to meet you)

## How It Works

1. **Input Processing**:
   - Audio input is captured and sent to the Whisper API for transcription to Korean text
   - Text input is directly processed by the application

2. **Sign Language Mapping**:
   - Korean text is analyzed to identify key words that correspond to known sign language gestures
   - The application extracts the most relevant signs from the input

3. **3D Animation**:
   - The system first checks if there are OpenPose keypoint data available for the identified word
   - If available, it loads the keypoint sequence and applies it to the 3D model bones
   - If not available, it falls back to predefined animations for known signs
   - Each animation is visualized through the 3D character in real-time

4. **Conversation Management**:
   - The application stores each conversation with timestamps
   - Users can review past conversations and re-animate previously translated phrases

## Extended Functionality

- **Keypoint Visualization**: In debug mode, the application can visualize the OpenPose keypoints in 3D space
- **Test Animation**: Developers can test different poses and keypoint animations
- **Enhanced Demo**: Processes full sentences by breaking them into individual signs and animating them in sequence

## Future Enhancements

- Add support for more Korean sign language words and phrases
- Implement neural machine translation for improved text-to-sign conversion
- Support more complex sentence structures and grammar
- Add fingerspelling for words without direct sign translations
- Integrate with real-time video analysis for sign language recognition

## Running the Project

### Prerequisites
- Node.js and npm
- OpenAI API key (for Whisper speech-to-text)

### Setup Steps
1. Clone the repository
2. Install dependencies for both frontend and backend:
   ```
   cd sign-language-translator
   npm install
   
   cd ../sign-language-translator-backend
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the backend directory with your OpenAI API key:
     ```
     OPENAI_API_KEY=your_api_key_here
     ```

4. Start the backend server:
   ```
   cd sign-language-translator-backend
   node server.js
   ```

5. Start the frontend application:
   ```
   cd sign-language-translator
   npm start
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Using the Application

### Normal Mode
1. Speak into your microphone or type Korean text in the input field
2. The application will process the input and display the corresponding sign language animation
3. Your conversations will be saved in the sidebar for future reference

### Test Mode
1. Select a word from the test words list or type a custom word
2. View the animation and debug information
3. Test different poses and animations directly

### Enhanced Mode
1. Type a sentence or select an example phrase
2. The application will break down the sentence into individual signs
3. Watch as the 3D model animates each sign in sequence

## Contributing

We welcome contributions to improve this project! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Three.js](https://threejs.org/) for 3D rendering
- [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text) for speech recognition
- [OpenPose](https://github.com/CMU-Perceptual-Computing-Lab/openpose) for keypoint data format
- [React](https://reactjs.org/) for the UI framework