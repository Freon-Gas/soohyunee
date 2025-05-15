/**
 * Utility for mapping Korean text to sign language keypoint data
 * This file manages the mapping between Korean words and available sign animations
 */

// Dictionary of known signs with fallback animations
export const KNOWN_SIGNS = {
  '안녕': 'greeting',
  '안녕하세요': 'greeting',
  '사과': 'apple',
  
  // Add more known signs with fallback animations
  '감사합니다': 'thank_you',
  '감사': 'thank_you',
  '고맙습니다': 'thank_you',
  '괜찮아요': 'okay',
  '네': 'yes',
  '예': 'yes',
  '아니오': 'no',
  '아니오': 'no',
  '도와주세요': 'help',
  '도움': 'help',
  '물': 'water',
  '배고파요': 'hungry',
  '이름': 'name',
  '만나서 반가워요': 'nice_to_meet_you',
  '반갑습니다': 'nice_to_meet_you'
};

/**
 * Checks if we have keypoint data for a specific word
 * @param {string} word - Korean word to check
 * @returns {boolean} - Whether we have keypoint data for this word
 */
export function hasKeypointData(word) {
  return !!word && (
    // Check if we have specific keypoint data folder for this word
    // or if it's in our known signs dictionary
    KNOWN_SIGNS.hasOwnProperty(word)
  );
}

/**
 * Gets the fallback animation type for a word if available
 * @param {string} word - Korean word to check
 * @returns {string|null} - Fallback animation type or null if none
 */
export function getFallbackAnimation(word) {
  return KNOWN_SIGNS[word] || null;
}

/**
 * Extracts the most important word for sign language from a Korean sentence
 * This is a simplified implementation - in a full product, you would need more
 * sophisticated NLP for Korean language
 * 
 * @param {string} text - Korean text to process
 * @returns {string} - The most important word for signing
 */
export function extractKeySignWord(text) {
  if (!text) return '';
  
  // First, check if the entire phrase is in our known signs
  if (KNOWN_SIGNS.hasOwnProperty(text)) {
    return text;
  }
  
  // Split the sentence into words
  // Note: This is a simplified approach - Korean would need proper tokenization
  const words = text.split(/\s+/);
  
  // Check if any individual words are in our known signs
  for (const word of words) {
    if (KNOWN_SIGNS.hasOwnProperty(word)) {
      return word;
    }
  }
  
  // If no known words, return the first word as fallback
  return words[0] || '';
}

/**
 * Maps a sequence of words to sign language motions
 * For future expansion to handle sentences
 * 
 * @param {string} text - Full text to process
 * @returns {Array<string>} - Sequence of sign words
 */
export function textToSignSequence(text) {
  if (!text) return [];
  
  // This would be expanded for more sophisticated Korean language processing
  // For now, we'll just extract the key word
  const keyWord = extractKeySignWord(text);
  return keyWord ? [keyWord] : [];
}
