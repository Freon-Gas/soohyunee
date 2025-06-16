const fs = require('fs');
const path = require('path');

/**
 * Script to generate index.json with all word patterns
 * Run this from the sign-language-translator folder: node generate-word-index.js
 */

const SIGNS_DIR = './public/data/signs';
const OUTPUT_FILE = './public/data/word-patterns.json';

async function generateWordIndex() {
  console.log('🚀 Generating word pattern index...');
  
  const wordPatterns = {};
  let totalWords = 0;
  let successfulWords = 0;
  
  try {
    // Get all word folders
    const wordFolders = fs.readdirSync(SIGNS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`📁 Found ${wordFolders.length} word folders`);
    
    for (const word of wordFolders) {
      totalWords++;
      const wordPath = path.join(SIGNS_DIR, word);
      
      try {
        // Get all JSON files in this word folder
        const files = fs.readdirSync(wordPath)
          .filter(file => file.endsWith('_keypoints.json'));
        
        if (files.length === 0) {
          console.log(`⚠️  No keypoint files in: ${word}`);
          continue;
        }
        
        // Extract pattern from first file
        const firstFile = files[0];
        const pattern = extractPatternFromFilename(firstFile);
        
        if (pattern) {
          wordPatterns[word] = {
            pattern: pattern,
            fileCount: files.length,
            sampleFile: firstFile
          };
          successfulWords++;
          
          // Progress indicator
          if (successfulWords % 100 === 0) {
            console.log(`📈 Processed ${successfulWords} words...`);
          }
        } else {
          console.log(`❌ Could not extract pattern from: ${firstFile} in ${word}`);
        }
        
      } catch (error) {
        console.log(`❌ Error processing word "${word}": ${error.message}`);
      }
    }
    
    // Write the index file
    const indexData = {
      generatedAt: new Date().toISOString(),
      totalWords: successfulWords,
      patterns: wordPatterns
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(indexData, null, 2));
    
    console.log(`✅ Generated word index successfully!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total folders: ${totalWords}`);
    console.log(`   - Successful patterns: ${successfulWords}`);
    console.log(`   - Output file: ${OUTPUT_FILE}`);
    
    // Show some sample patterns
    console.log(`\n📋 Sample patterns:`);
    const sampleWords = Object.keys(wordPatterns).slice(0, 10);
    sampleWords.forEach(word => {
      console.log(`   ${word}: ${wordPatterns[word].pattern} (${wordPatterns[word].fileCount} files)`);
    });
    
  } catch (error) {
    console.error(`❌ Failed to generate word index: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Extract pattern from filename
 * e.g., "NIA_SL_WORD0099_REAL09_F_000000000000_keypoints.json" -> "NIA_SL_WORD0099_REAL09_F_"
 */
function extractPatternFromFilename(filename) {
  const match = filename.match(/^(NIA_SL_WORD\d{4}_REAL\d{2}_F_)\d{12}_keypoints\.json$/);
  return match ? match[1] : null;
}

// Run the script
if (require.main === module) {
  generateWordIndex();
}

module.exports = { generateWordIndex };
