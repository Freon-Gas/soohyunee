// This file should be placed in your server-side code
// For example, if using Express.js, it could be in a routes folder

const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Endpoint for Whisper transcription
router.post('/whisper-transcribe', upload.single('file'), async (req, res) => {
  try {
    // Get the uploaded file
    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Create form data to send to OpenAI
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFile.path));
    formData.append('model', 'whisper-1');
    
    // Specify Korean language
    formData.append('language', 'ko');
    
    // Add any additional parameters
    if (req.body.prompt) {
      formData.append('prompt', req.body.prompt);
    }
    
    try {
      // Get API key from environment variable
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not found');
      }

      // Add retry logic with exponential backoff
      let retries = 0;
      const maxRetries = 3;
      let response;
      
      while (retries <= maxRetries) {
        try {
          // Send request to OpenAI Whisper API
          response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${apiKey}`,
              },
              timeout: 10000, // 10 second timeout
            }
          );
          
          // If successful, break out of retry loop
          break;
        } catch (error) {
          // If we hit a rate limit (429)
          if (error.response && error.response.status === 429) {
            retries++;
            if (retries <= maxRetries) {
              const delay = Math.pow(2, retries) * 1000; // Exponential backoff
              console.log(`Rate limited. Retrying in ${delay/1000} seconds...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw new Error('Rate limit exceeded after multiple retries');
            }
          } else {
            // For other errors, just throw immediately
            throw error;
          }
        }
      }

      // Clean up the temporary file
      fs.unlinkSync(audioFile.path);

      // Return the transcription
      return res.json(response.data);
    } catch (error) {
      console.error('Error in Whisper transcription:', error);
      
      // Clean up temp file if it exists
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Error deleting temporary file:', e);
        }
      }
      
      return res.status(500).json({ 
        error: 'Error processing audio',
        details: error.message 
      });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

module.exports = router;