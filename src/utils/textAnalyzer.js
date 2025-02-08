import stringSimilarity from 'string-similarity';

export async function analyzeText(documents, keywords, globalSettings, onProgress) {
  console.log('Starting analysis with:', {
    documentCount: documents.length,
    keywords: keywords.map(k => k.word),
    settings: globalSettings
  });

  // Create unique identifiers for each keyword configuration
  const processedKeywords = keywords.map((keyword, index) => ({
    ...keyword,
    uniqueId: `${keyword.word}_${index}_${JSON.stringify({
      caseSensitive: keyword.caseSensitive,
      useExactText: keyword.useExactText,
      useFuzzyMatch: keyword.useFuzzyMatch,
      fuzzyMatchThreshold: keyword.fuzzyMatchThreshold,
      contextBefore: keyword.contextBefore,
      contextAfter: keyword.contextAfter,
      contextRange: keyword.contextRange
    })}`
  }));

  function checkContextMatch(text, position, contextWords, range) {
    if (!contextWords || contextWords.length === 0) return true;
    
    const words = text.split(/\s+/);
    const startPos = Math.max(0, position - range);
    const endPos = Math.min(words.length, position + range);
    const contextText = words.slice(startPos, endPos).join(' ');
    
    return contextWords.some(word => contextText.toLowerCase().includes(word.toLowerCase()));
  }

  function checkFuzzyMatch(word1, word2, threshold, caseSensitive) {
    if (!threshold || threshold === 0) {
      return caseSensitive ? word1 === word2 : word1.toLowerCase() === word2.toLowerCase();
    }
    const similarity = stringSimilarity.compareTwoStrings(
      caseSensitive ? word1 : word1.toLowerCase(),
      caseSensitive ? word2 : word2.toLowerCase()
    );
    return similarity >= threshold;
  }

  function findExactTextMatches(text, searchTerm, caseSensitive) {
    const matches = [];
    let lastIndex = 0;
    const searchTermToUse = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    const textToSearch = caseSensitive ? text : text.toLowerCase();

    while ((lastIndex = textToSearch.indexOf(searchTermToUse, lastIndex)) !== -1) {
      matches.push({
        index: lastIndex,
        matchedText: text.slice(lastIndex, lastIndex + searchTerm.length)
      });
      lastIndex += 1;
    }

    return matches;
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

    const documentWords = doc.content.split(/\s+/);
    
    for (const keyword of processedKeywords) {
      // Add a small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));

      if (!keyword.word) continue;
      
      const searchTerm = keyword.caseSensitive ? keyword.word : keyword.word.toLowerCase();
      console.log(`Searching for keyword: "${searchTerm}" (case ${keyword.caseSensitive ? 'sensitive' : 'insensitive'})`);
      
      const contextBefore = keyword.contextBefore ? 
        keyword.contextBefore.split(',').map(w => w.trim()).filter(w => w) : [];
      const contextAfter = keyword.contextAfter ? 
        keyword.contextAfter.split(',').map(w => w.trim()).filter(w => w) : [];
      const contextRange = keyword.contextRange || 5;
      
      const matches = [];

      if (keyword.useExactText) {
        const exactMatches = findExactTextMatches(doc.content, keyword.word, keyword.caseSensitive);
        
        for (const match of exactMatches) {
          const contextStart = Math.max(0, doc.content.lastIndexOf(' ', match.index) + 1);
          const contextEnd = doc.content.indexOf(' ', match.index + keyword.word.length);
          const context = doc.content.slice(
            Math.max(0, contextStart - 50),
            contextEnd === -1 ? Math.min(contextEnd + 50, doc.content.length) : contextEnd + 50
          );

          const wordIndex = doc.content.slice(0, match.index).split(/\s+/).length - 1;
          
          const hasValidContext = (
            checkContextMatch(doc.content, wordIndex, contextBefore, contextRange) &&
            checkContextMatch(doc.content, wordIndex, contextAfter, contextRange)
          );

          if (hasValidContext) {
            matches.push({
              position: match.index,
              term: match.matchedText,
              context: context.trim(),
              wordsBefore: doc.content.slice(Math.max(0, contextStart - 50), match.index).trim(),
              wordsAfter: doc.content.slice(match.index + keyword.word.length, 
                contextEnd === -1 ? doc.content.length : contextEnd + 50).trim(),
              similarity: 1
            });
          }
        }
      } else {
        for (let i = 0; i < documentWords.length; i++) {
          const currentWord = keyword.caseSensitive ? documentWords[i] : documentWords[i].toLowerCase();
          
          const isMatch = keyword.useFuzzyMatch ?
            checkFuzzyMatch(currentWord, searchTerm, keyword.fuzzyMatchThreshold, keyword.caseSensitive) :
            (keyword.caseSensitive ? currentWord === searchTerm : currentWord.toLowerCase() === searchTerm.toLowerCase());
          
          if (isMatch) {
            const hasValidContext = (
              checkContextMatch(documentWords.join(' '), i, contextBefore, contextRange) &&
              checkContextMatch(documentWords.join(' '), i, contextAfter, contextRange)
            );
            
            if (hasValidContext) {
              const contextStart = Math.max(0, i - contextRange);
              const contextEnd = Math.min(documentWords.length, i + contextRange + 1);
              const context = documentWords.slice(contextStart, contextEnd).join(' ');
              
              matches.push({
                position: i,
                term: documentWords[i],
                context: context,
                wordsBefore: documentWords.slice(contextStart, i).join(' '),
                wordsAfter: documentWords.slice(i + 1, contextEnd).join(' '),
                similarity: keyword.useFuzzyMatch ? 
                  stringSimilarity.compareTwoStrings(currentWord, searchTerm) : 1
              });
            }
          }
        }
      }
      
      docResult.keywords[keyword.uniqueId] = {
        word: keyword.word,
        count: matches.length,
        category: keyword.category || '',
        matches: matches,
        originalSettings: {
          caseSensitive: keyword.caseSensitive,
          useExactText: keyword.useExactText,
          useFuzzyMatch: keyword.useFuzzyMatch,
          fuzzyMatchThreshold: keyword.fuzzyMatchThreshold,
          contextBefore: keyword.contextBefore,
          contextAfter: keyword.contextAfter,
          contextRange: keyword.contextRange
        }
      };

      if (onProgress) {
        onProgress();
      }

      console.log(`Found ${matches.length} matches for "${searchTerm}" in ${doc.name}`);
    }
    
    results.push(docResult);
  }
  
  return results;
}