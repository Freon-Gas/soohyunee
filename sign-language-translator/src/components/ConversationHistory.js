import React, { useState } from 'react';
import './ConversationHistory.css';

const ConversationHistory = ({ conversations, onSelectConversation, onDeleteConversation }) => {
  const [expandedConvo, setExpandedConvo] = useState(null);

  const toggleExpand = (id) => {
    if (expandedConvo === id) {
      setExpandedConvo(null);
    } else {
      setExpandedConvo(id);
    }
  };

  return (
    <div className="conversation-history">
      <h3>Conversation History</h3>
      
      {conversations.length === 0 ? (
        <div className="no-conversations">
          <p>대화가 아직 없네요! 새 대화를 시작해보세요!</p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map((convo) => (
            <div key={convo.id} className="conversation-item">
              <div 
                className="conversation-header" 
                onClick={() => toggleExpand(convo.id)}
              >
                <span className="conversation-title">
                  {convo.title || convo.phrases[0]?.text.substring(0, 20) + '...'}
                </span>
                <div className="conversation-controls">
                  <span className="conversation-time">
                    {new Date(convo.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <span className="expand-icon">
                    {expandedConvo === convo.id ? '▼' : '►'}
                  </span>
                </div>
              </div>
              
              {expandedConvo === convo.id && (
                <div className="conversation-details">
                  {convo.phrases.map((phrase, index) => (
                    <div 
                      key={index} 
                      className="conversation-phrase"
                      onClick={() => onSelectConversation(convo.id, phrase.text)}
                    >
                      <div className="phrase-original">
                        원문: {phrase.text}
                      </div>
                      {phrase.signGrammar && phrase.signGrammar !== phrase.text && (
                        <div className="phrase-sign-grammar">
                          수어: {phrase.signGrammar}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="conversation-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(convo.id);
                      }}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;