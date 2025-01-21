export async function analyzeText(documents, keywords, globalSettings) {
  console.log('Starting analysis with:', {
    documentCount: documents.length,
    keywords: keywords.map(k => k.word),
    settings: globalSettings
  });

  // Helper function to check if context words exist within range
  function checkContextMatch(text, position, contextWords, range) {
    if (!contextWords || contextWords.length === 0) return true;
    
    const words = text.split(' ');
    const startPos = Math.max(0, position - range);
    const endPos = Math.min(words.length, position + range);
    const contextText = words.slice(startPos, endPos).join(' ').toLowerCase();
    
    return contextWords.some(word => contextText.includes(word.toLowerCase()));
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

    const documentText = doc.content.toLowerCase();
    const documentWords = documentText.split(' ');
    
    for (const keyword of keywords) {
      if (!keyword.word) continue;
      
      const searchTerm = keyword.word.toLowerCase();
      console.log(`Searching for keyword: "${searchTerm}"`);
      
      // Parse context words if provided
      const contextBefore = keyword.contextBefore ? 
        keyword.contextBefore.split(',').map(w => w.trim()).filter(w => w) : [];
      const contextAfter = keyword.contextAfter ? 
        keyword.contextAfter.split(',').map(w => w.trim()).filter(w => w) : [];
      const contextRange = keyword.contextRange || 5; // Default to 5 words if not specified
      
      const matches = [];
      let position = 0;
      let lastIndex = -1;
      
      // Find all occurrences
      while ((position = documentText.indexOf(searchTerm, lastIndex + 1)) !== -1) {
        // Get word position in the split array
        const wordPosition = documentText.slice(0, position).split(' ').length - 1;
        
        // Check context conditions if specified
        const hasValidContext = (
          checkContextMatch(documentText, wordPosition, contextBefore, contextRange) &&
          checkContextMatch(documentText, wordPosition, contextAfter, contextRange)
        );
        
        // Only add match if context conditions are met or no context was specified
        if (hasValidContext) {
          // Get surrounding context for display
          const contextStart = Math.max(0, wordPosition - contextRange);
          const contextEnd = Math.min(documentWords.length, wordPosition + contextRange + 1);
          const context = documentWords.slice(contextStart, contextEnd).join(' ');
          
          matches.push({
            position: position,
            term: keyword.word,
            context: context,
            wordsBefore: documentWords.slice(
              Math.max(0, wordPosition - contextRange),
              wordPosition
            ).join(' '),
            wordsAfter: documentWords.slice(
              wordPosition + 1,
              Math.min(documentWords.length, wordPosition + contextRange + 1)
            ).join(' ')
          });
        }
        
        lastIndex = position;
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