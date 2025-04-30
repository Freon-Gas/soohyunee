import React from 'react';
import './TextDisplay.css';

const TextDisplay = ({ text, isProcessing }) => {
  return (
    <div className="text-display">
      <h2>Recognized Text</h2>
      
      <div className="text-content">
        {text ? (
          <p>{text}</p>
        ) : (
          <p className="placeholder">Your spoken words will appear here...</p>
        )}
      </div>
      
      {isProcessing && (
        <div className="processing-indicator">
          <div className="loading-spinner"></div>
          <p>Processing text...</p>
        </div>
      )}
    </div>
  );
};

export default TextDisplay;