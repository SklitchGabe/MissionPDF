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
      contextRangeBefore: keyword.contextRangeBefore,
      contextRangeAfter: keyword.contextRangeAfter,
      exactContextBefore: keyword.exactContextBefore,
      exactContextAfter: keyword.exactContextAfter,
      fuzzyContextBefore: keyword.fuzzyContextBefore,
      fuzzyContextAfter: keyword.fuzzyContextAfter,
      fuzzyContextThresholdBefore: keyword.fuzzyContextThresholdBefore,
      fuzzyContextThresholdAfter: keyword.fuzzyContextThresholdAfter,
      contextLogicType: keyword.contextLogicType
    })}`
  }));

  function checkContextMatch(text, position, contextSettings, direction) {
    const {
      contextBefore,
      contextAfter,
      exactContextBefore,
      exactContextAfter,
      fuzzyContextBefore,
      fuzzyContextAfter,
      fuzzyContextThresholdBefore,
      fuzzyContextThresholdAfter,
      contextRangeBefore,
      contextRangeAfter
    } = contextSettings;

    // Get the appropriate context words and settings based on direction
    const contextWords = direction === 'before' ? 
      (contextBefore || '').split(',').map(w => w.trim()).filter(w => w.length > 0) :
      (contextAfter || '').split(',').map(w => w.trim()).filter(w => w.length > 0);

    // If no context words specified for this direction, return true
    if (contextWords.length === 0) {
      return true;
    }

    const words = text.split(/\s+/);
    const contextRange = direction === 'before' ? contextRangeBefore : contextRangeAfter;
    const startPos = direction === 'before' ? Math.max(0, position - contextRange) : position + 1;
    const endPos = direction === 'before' ? position : Math.min(words.length, position + contextRange + 1);
    const contextText = words.slice(startPos, endPos).join(' ');

    // Check for matches based on settings
    return contextWords.some(targetWord => {
      if ((direction === 'before' && exactContextBefore) || 
          (direction === 'after' && exactContextAfter)) {
        return contextText.toLowerCase().includes(targetWord.toLowerCase());
      } 
      
      if ((direction === 'before' && fuzzyContextBefore) || 
          (direction === 'after' && fuzzyContextAfter)) {
        return contextText.toLowerCase().split(/\s+/).some(contextWord => {
          const similarity = stringSimilarity.compareTwoStrings(
            contextWord,
            targetWord.toLowerCase()
          );
          return similarity >= (direction === 'before' ? 
            fuzzyContextThresholdBefore : 
            fuzzyContextThresholdAfter);
        });
      }
      
      const regex = new RegExp(`\\b${targetWord.toLowerCase()}\\b`);
      return regex.test(contextText.toLowerCase());
    });
  }

  function hasValidContext(text, position, contextSettings) {
    // Parse context words
    const beforeWords = (contextSettings.contextBefore || '').split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0);
    const afterWords = (contextSettings.contextAfter || '')
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0);

    // If no context words specified in either direction, return true
    if (beforeWords.length === 0 && afterWords.length === 0) {
      return true;
    }

    // Check each direction only if context words are specified
    const beforeMatches = beforeWords.length === 0 ? true :
      checkContextMatch(text, position, contextSettings, 'before');
    const afterMatches = afterWords.length === 0 ? true :
      checkContextMatch(text, position, contextSettings, 'after');

    // Apply logic type only if both directions have context words
    if (beforeWords.length > 0 && afterWords.length > 0) {
      return contextSettings.contextLogicType === 'AND' ? 
        (beforeMatches && afterMatches) : 
        (beforeMatches || afterMatches);
    }

    // If only one direction has context words, just return that result
    return beforeWords.length > 0 ? beforeMatches : afterMatches;
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
      await new Promise(resolve => setTimeout(resolve, 0));

      if (!keyword.word) continue;
      
      const searchTerm = keyword.caseSensitive ? keyword.word : keyword.word.toLowerCase();
      console.log(`Searching for keyword: "${searchTerm}" (case ${keyword.caseSensitive ? 'sensitive' : 'insensitive'})`);
      
      const matches = [];

      if (keyword.useExactText) {
        const exactMatches = findExactTextMatches(doc.content, keyword.word, keyword.caseSensitive);
        
        for (const match of exactMatches) {
          const contextStart = Math.max(0, doc.content.lastIndexOf(' ', match.index) + 1);
          const contextEnd = doc.content.indexOf(' ', match.index + keyword.word.length);
          const wordIndex = doc.content.slice(0, match.index).split(/\s+/).length - 1;
          
          if (hasValidContext(doc.content, wordIndex, keyword)) {
            const beforeContextStart = keyword.contextBefore ? 
              Math.max(0, contextStart - (keyword.contextRangeBefore * 10)) : 
              contextStart;
            const afterContextEnd = keyword.contextAfter ? 
              (contextEnd === -1 ? doc.content.length : Math.min(contextEnd + (keyword.contextRangeAfter * 10), doc.content.length)) : 
              contextEnd;

            matches.push({
              position: match.index,
              term: match.matchedText,
              context: doc.content.slice(beforeContextStart, afterContextEnd).trim(),
              wordsBefore: doc.content.slice(beforeContextStart, match.index).trim(),
              wordsAfter: doc.content.slice(match.index + keyword.word.length, afterContextEnd).trim(),
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
            if (hasValidContext(documentWords.join(' '), i, keyword)) {
              const contextStartIdx = keyword.contextBefore ? 
                Math.max(0, i - keyword.contextRangeBefore) : 
                Math.max(0, i - 5); // Default context for display
              const contextEndIdx = keyword.contextAfter ? 
                Math.min(documentWords.length, i + keyword.contextRangeAfter + 1) : 
                Math.min(documentWords.length, i + 6); // Default context for display
              
              matches.push({
                position: i,
                term: documentWords[i],
                context: documentWords.slice(contextStartIdx, contextEndIdx).join(' '),
                wordsBefore: documentWords.slice(contextStartIdx, i).join(' '),
                wordsAfter: documentWords.slice(i + 1, contextEndIdx).join(' '),
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
          contextRangeBefore: keyword.contextRangeBefore,
          contextRangeAfter: keyword.contextRangeAfter,
          exactContextBefore: keyword.exactContextBefore,
          exactContextAfter: keyword.exactContextAfter,
          fuzzyContextBefore: keyword.fuzzyContextBefore,
          fuzzyContextAfter: keyword.fuzzyContextAfter,
          fuzzyContextThresholdBefore: keyword.fuzzyContextThresholdBefore,
          fuzzyContextThresholdAfter: keyword.fuzzyContextThresholdAfter,
          contextLogicType: keyword.contextLogicType
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