export async function analyzeText(documents, keywords, globalSettings) {
  // For debugging
  console.log('Starting analysis with:', {
    documentCount: documents.length,
    keywords: keywords.map(k => k.word),
    settings: globalSettings
  });

  const results = [];
  
  for (const doc of documents) {
    // Basic document validation
    if (!doc.content) {
      console.warn(`Document ${doc.name} has no content`);
      continue;
    }

    console.log(`Analyzing document: ${doc.name}, content length: ${doc.content.length}`);
    
    // Prepare document result object
    const docResult = {
      documentId: doc.id,
      documentName: doc.name,
      keywords: {}
    };

    // Convert content to lowercase for case-insensitive search
    const documentText = doc.content.toLowerCase();
    
    // Process each keyword
    for (const keyword of keywords) {
      if (!keyword.word) continue;
      
      // Convert keyword to lowercase for matching
      const searchTerm = keyword.word.toLowerCase();
      console.log(`Searching for keyword: "${searchTerm}"`);
      
      // Simple text search
      const matches = [];
      let position = 0;
      let lastIndex = -1;
      
      // Find all occurrences
      while ((position = documentText.indexOf(searchTerm, lastIndex + 1)) !== -1) {
        // Get surrounding context (20 words before and after)
        const contextStart = documentText.lastIndexOf(' ', Math.max(0, position - 100)) + 1;
        const contextEnd = documentText.indexOf(' ', Math.min(documentText.length, position + searchTerm.length + 100));
        
        const context = documentText.slice(
          contextStart === -1 ? 0 : contextStart,
          contextEnd === -1 ? documentText.length : contextEnd
        );
        
        matches.push({
          position: position,
          term: keyword.word,
          context: context
        });
        
        lastIndex = position;
      }
      
      // Store results for this keyword
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