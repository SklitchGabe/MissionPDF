import stringSimilarity from 'string-similarity';

export async function analyzeText(documents, keywords, globalSettings) {
  console.log('Starting analysis with:', {
    documentCount: documents.length,
    keywords: keywords.map(k => k.word),
    settings: globalSettings
  });

  function checkContextMatch(text, position, contextWords, range) {
    if (!contextWords || contextWords.length === 0) return true;
    
    const words = text.split(/\s+/);
    const startPos = Math.max(0, position - range);
    const endPos = Math.min(words.length, position + range);
    const contextText = words.slice(startPos, endPos).join(' ').toLowerCase();
    
    return contextWords.some(word => contextText.includes(word.toLowerCase()));
  }

  function findMatches(text, keyword, settings) {
    const matches = [];
    const searchTerm = settings.caseSensitive ? keyword : keyword.toLowerCase();
    const searchText = settings.caseSensitive ? text : text.toLowerCase();
    const words = text.split(/\s+/);
    
    // Function to get word index from character position
    const getWordIndexFromPosition = (pos) => {
      const textBefore = text.substring(0, pos);
      return textBefore.split(/\s+/).length - 1;
    };

    // For exact text matching
    if (settings.useExactText) {
      let lastIndex = 0;
      while ((lastIndex = searchText.indexOf(searchTerm, lastIndex)) !== -1) {
        const wordIndex = getWordIndexFromPosition(lastIndex);
        
        // Check context requirements
        const hasValidContext = (
          checkContextMatch(text, wordIndex, settings.contextBefore?.split(','), settings.contextRange) &&
          checkContextMatch(text, wordIndex, settings.contextAfter?.split(','), settings.contextRange)
        );

        if (hasValidContext) {
          matches.push({
            position: lastIndex,
            term: text.slice(lastIndex, lastIndex + keyword.length),
            wordIndex: wordIndex,
            similarity: 1
          });
        }
        lastIndex += 1;
      }
    } 
    // For word-based matching (either exact or fuzzy)
    else {
      const searchWords = keyword.split(/\s+/);
      
      for (let i = 0; i <= words.length - searchWords.length; i++) {
        let isMatch = false;

        if (settings.useFuzzyMatch) {
          // Check fuzzy match for each word in the phrase
          let totalSimilarity = 0;
          let allWordsMatch = true;
          
          for (let j = 0; j < searchWords.length; j++) {
            const similarity = stringSimilarity.compareTwoStrings(
              settings.caseSensitive ? words[i + j] : words[i + j].toLowerCase(),
              settings.caseSensitive ? searchWords[j] : searchWords[j].toLowerCase()
            );
            
            if (similarity < settings.fuzzyMatchThreshold) {
              allWordsMatch = false;
              break;
            }
            totalSimilarity += similarity;
          }
          
          isMatch = allWordsMatch;
          if (isMatch) {
            isMatch = totalSimilarity / searchWords.length >= settings.fuzzyMatchThreshold;
          }
        } else {
          // Exact word match
          isMatch = searchWords.every((searchWord, j) => {
            const word = settings.caseSensitive ? words[i + j] : words[i + j].toLowerCase();
            const term = settings.caseSensitive ? searchWord : searchWord.toLowerCase();
            return word === term;
          });
        }

        if (isMatch) {
          // Check context requirements
          const hasValidContext = (
            checkContextMatch(text, i, settings.contextBefore?.split(','), settings.contextRange) &&
            checkContextMatch(text, i, settings.contextAfter?.split(','), settings.contextRange)
          );

          if (hasValidContext) {
            const matchedPhrase = words.slice(i, i + searchWords.length).join(' ');
            matches.push({
              position: text.indexOf(matchedPhrase),
              term: matchedPhrase,
              wordIndex: i,
              similarity: settings.useFuzzyMatch ? 
                stringSimilarity.compareTwoStrings(
                  matchedPhrase.toLowerCase(),
                  keyword.toLowerCase()
                ) : 1
            });
          }
        }
      }
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

    for (const keyword of keywords) {
      if (!keyword.word) continue;
      
      console.log(`Searching for keyword: "${keyword.word}" with settings:`, keyword);

      const matches = findMatches(doc.content, keyword.word, keyword);

      // Get surrounding context for each match
      const matchesWithContext = matches.map(match => {
        const textBefore = doc.content.substring(0, match.position).split(/\s+/).slice(-keyword.contextRange).join(' ');
        const textAfter = doc.content.substring(match.position + match.term.length).split(/\s+/).slice(0, keyword.contextRange).join(' ');
        
        return {
          ...match,
          wordsBefore: textBefore,
          wordsAfter: textAfter,
          context: `${textBefore} ${match.term} ${textAfter}`.trim()
        };
      });
      
      docResult.keywords[keyword.word] = {
        count: matchesWithContext.length,
        category: keyword.category || '',
        matches: matchesWithContext,
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

      console.log(`Found ${matchesWithContext.length} matches for "${keyword.word}" in ${doc.name}`);
    }
    
    results.push(docResult);
  }
  
  return results;
}