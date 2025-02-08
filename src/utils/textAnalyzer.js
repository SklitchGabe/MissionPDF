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

  function checkContextMatch(text, position, contextWords, isExactMatch, isFuzzyMatch, fuzzyThreshold, range, isBeforeContext) {
    if (!contextWords || contextWords.length === 0) return true;
    
    const words = text.split(/\s+/);
    const startPos = isBeforeContext ? Math.max(0, position - range) : position + 1;
    const endPos = isBeforeContext ? position : Math.min(words.length, position + range + 1);
    const contextText = words.slice(startPos, endPos).join(' ');
    const contextWordsArray = contextWords.filter(word => word.length > 0);
    
    if (isExactMatch) {
      // For exact matching, look for character sequences anywhere in the context
      return contextWordsArray.some(word => 
        contextText.toLowerCase().includes(word.toLowerCase())
      );
    } else if (isFuzzyMatch) {
      // For fuzzy matching, check similarity with each word in context
      return contextWordsArray.some(targetWord => {
        // Split context into individual words for comparison
        const contextWords = contextText.toLowerCase().split(/\s+/);
        return contextWords.some(contextWord => {
          const similarity = stringSimilarity.compareTwoStrings(
            contextWord,
            targetWord.toLowerCase()
          );
          return similarity >= fuzzyThreshold;
        });
      });
    } else {
      // For whole word matching, ensure word boundaries
      return contextWordsArray.some(word => {
        const regex = new RegExp(`\\b${word.toLowerCase()}\\b`);
        return regex.test(contextText.toLowerCase());
      });
    }
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
      const contextRangeBefore = keyword.contextRangeBefore || 5;
      const contextRangeAfter = keyword.contextRangeAfter || 5;
      
      const matches = [];

      if (keyword.useExactText) {
        const exactMatches = findExactTextMatches(doc.content, keyword.word, keyword.caseSensitive);
        
        for (const match of exactMatches) {
          const contextStart = Math.max(0, doc.content.lastIndexOf(' ', match.index) + 1);
          const contextEnd = doc.content.indexOf(' ', match.index + keyword.word.length);
          const wordIndex = doc.content.slice(0, match.index).split(/\s+/).length - 1;
          
          // Check context based on logic type (AND/OR)
          const hasValidContext = keyword.contextLogicType === 'AND' ?
            (checkContextMatch(
              doc.content, 
              wordIndex, 
              contextBefore, 
              keyword.exactContextBefore,
              keyword.fuzzyContextBefore,
              keyword.fuzzyContextThresholdBefore,
              contextRangeBefore,
              true
            ) &&
            checkContextMatch(
              doc.content,
              wordIndex,
              contextAfter,
              keyword.exactContextAfter,
              keyword.fuzzyContextAfter,
              keyword.fuzzyContextThresholdAfter,
              contextRangeAfter,
              false
            )) :
            (contextBefore.length === 0 && contextAfter.length === 0) ||
            checkContextMatch(
              doc.content,
              wordIndex,
              contextBefore,
              keyword.exactContextBefore,
              keyword.fuzzyContextBefore,
              keyword.fuzzyContextThresholdBefore,
              contextRangeBefore,
              true
            ) ||
            checkContextMatch(
              doc.content,
              wordIndex,
              contextAfter,
              keyword.exactContextAfter,
              keyword.fuzzyContextAfter,
              keyword.fuzzyContextThresholdAfter,
              contextRangeAfter,
              false
            );

          if (hasValidContext) {
            // Extract context using different ranges for before and after
            const beforeContextStart = Math.max(0, contextStart - (contextRangeBefore * 10));
            const afterContextEnd = contextEnd === -1 ? 
              doc.content.length : 
              Math.min(contextEnd + (contextRangeAfter * 10), doc.content.length);

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
            const hasValidContext = keyword.contextLogicType === 'AND' ?
              (checkContextMatch(
                documentWords.join(' '),
                i,
                contextBefore,
                keyword.exactContextBefore,
                keyword.fuzzyContextBefore,
                keyword.fuzzyContextThresholdBefore,
                contextRangeBefore,
                true
              ) &&
              checkContextMatch(
                documentWords.join(' '),
                i,
                contextAfter,
                keyword.exactContextAfter,
                keyword.fuzzyContextAfter,
                keyword.fuzzyContextThresholdAfter,
                contextRangeAfter,
                false
              )) :
              (contextBefore.length === 0 && contextAfter.length === 0) ||
              checkContextMatch(
                documentWords.join(' '),
                i,
                contextBefore,
                keyword.exactContextBefore,
                keyword.fuzzyContextBefore,
                keyword.fuzzyContextThresholdBefore,
                contextRangeBefore,
                true
              ) ||
              checkContextMatch(
                documentWords.join(' '),
                i,
                contextAfter,
                keyword.exactContextAfter,
                keyword.fuzzyContextAfter,
                keyword.fuzzyContextThresholdAfter,
                contextRangeAfter,
                false
              );
            
            if (hasValidContext) {
              const contextStartIdx = Math.max(0, i - contextRangeBefore);
              const contextEndIdx = Math.min(documentWords.length, i + contextRangeAfter + 1);
              
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