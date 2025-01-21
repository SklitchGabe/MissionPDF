import stringSimilarity from 'string-similarity';

export async function analyzeText(documents, keywords, globalSettings) {
  console.log('Starting analysis with:', {
    documentCount: documents.length,
    keywords: keywords.map(k => k.word),
    settings: globalSettings
  });

  function checkContextMatch(text, position, contextWords, range) {
    if (!contextWords || contextWords.length === 0) return true;
    
    const words = text.split(' ');
    const startPos = Math.max(0, position - range);
    const endPos = Math.min(words.length, position + range);
    const contextText = words.slice(startPos, endPos).join(' ').toLowerCase();
    
    return contextWords.some(word => contextText.includes(word.toLowerCase()));
  }

  // New helper function to check fuzzy match
  function checkFuzzyMatch(word1, word2, threshold) {
    if (!threshold || threshold === 0) {
      return word1 === word2; // Exact match if no fuzzy matching requested
    }
    const similarity = stringSimilarity.compareTwoStrings(word1, word2);
    return similarity >= threshold;
  }

  const results = [];
  
  for (const doc of documents) {
    if (!doc.content) {
      console.warn(`Document ${doc.name} has no content`);
      continue;
    }

    console.log(`Analyzing document: ${doc.name}, content length: ${doc.content.length}`);
    
    const docResult = {
      documentId: doc.id,
      documentName: doc.name,
      keywords: {}
    };

    // Split into words for better fuzzy matching
    const documentWords = doc.content.toLowerCase().split(/\s+/);
    
    for (const keyword of keywords) {
      if (!keyword.word) continue;
      
      const searchTerm = keyword.word.toLowerCase();
      console.log(`Searching for keyword: "${searchTerm}"`);
      
      const contextBefore = keyword.contextBefore ? 
        keyword.contextBefore.split(',').map(w => w.trim()).filter(w => w) : [];
      const contextAfter = keyword.contextAfter ? 
        keyword.contextAfter.split(',').map(w => w.trim()).filter(w => w) : [];
      const contextRange = keyword.contextRange || 5;
      
      const matches = [];
      
      // Check each word in the document
      for (let i = 0; i < documentWords.length; i++) {
        const currentWord = documentWords[i];
        
        // Check for match (exact or fuzzy based on settings)
        const isMatch = checkFuzzyMatch(
          currentWord, 
          searchTerm, 
          keyword.useFuzzyMatch ? (keyword.fuzzyMatchThreshold || 0.8) : 0
        );
        
        if (isMatch) {
          // Check context conditions if specified
          const hasValidContext = (
            checkContextMatch(documentWords.join(' '), i, contextBefore, contextRange) &&
            checkContextMatch(documentWords.join(' '), i, contextAfter, contextRange)
          );
          
          if (hasValidContext) {
            // Get surrounding context for display
            const contextStart = Math.max(0, i - contextRange);
            const contextEnd = Math.min(documentWords.length, i + contextRange + 1);
            const context = documentWords.slice(contextStart, contextEnd).join(' ');
            
            matches.push({
              position: i,
              term: currentWord,
              context: context,
              wordsBefore: documentWords.slice(contextStart, i).join(' '),
              wordsAfter: documentWords.slice(i + 1, contextEnd).join(' '),
              similarity: keyword.useFuzzyMatch ? 
                stringSimilarity.compareTwoStrings(currentWord, searchTerm) : 1
            });
          }
        }
      }
      
      docResult.keywords[keyword.word] = {
        count: matches.length,
        category: keyword.category || '',
        matches: matches
      };

      console.log(`Found ${matches.length} matches for "${searchTerm}" in ${doc.name}`);
    }
    
    results.push(docResult);
  }
  
  return results;
}