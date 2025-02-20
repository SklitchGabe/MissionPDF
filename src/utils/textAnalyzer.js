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
      contextLogicType: keyword.contextLogicType,
      displayContextRange: keyword.displayContextRange || 20 // Default to 20 if not specified
    })}`
  }));

  function checkContextMatch(text, position, settings, direction) {
    console.log(`Checking ${direction} context at position ${position}`);
    
    const words = text.split(/\s+/);
    const contextWords = direction === 'before' 
      ? (settings.contextBefore || '').split(',').map(w => w.trim()).filter(w => w.length > 0)
      : (settings.contextAfter || '').split(',').map(w => w.trim()).filter(w => w.length > 0);
      
    const range = parseInt(direction === 'before' ? settings.contextRangeBefore : settings.contextRangeAfter);
    
    console.log('Context settings:', {
      contextWords,
      range,
      exact: direction === 'before' ? settings.exactContextBefore : settings.exactContextAfter,
      fuzzy: direction === 'before' ? settings.fuzzyContextBefore : settings.fuzzyContextAfter
    });

    // Get the exact slice of words within the specified range
    const startIdx = direction === 'before' 
      ? Math.max(0, position - range)
      : position + 1;
    const endIdx = direction === 'before'
      ? position
      : Math.min(words.length, position + range + 1);
    
    const contextSlice = words.slice(startIdx, endIdx);
    console.log(`Checking context slice (${range} words ${direction}):`, contextSlice);

    // For each required context word, check if it exists in the range
    for (const contextWord of contextWords) {
      const found = contextSlice.some(word => {
        if (direction === 'before' ? settings.exactContextBefore : settings.exactContextAfter) {
          return word === contextWord;
        } else if (direction === 'before' ? settings.fuzzyContextBefore : settings.fuzzyContextAfter) {
          const threshold = direction === 'before' 
            ? settings.fuzzyContextThresholdBefore 
            : settings.fuzzyContextThresholdAfter;
          return stringSimilarity.compareTwoStrings(word.toLowerCase(), contextWord.toLowerCase()) >= threshold;
        } else {
          return word.toLowerCase() === contextWord.toLowerCase();
        }
      });

      console.log(`Context word "${contextWord}" ${found ? 'found' : 'not found'} in ${range}-word ${direction} range`);
      
      if (found && settings.contextLogicType === 'OR') {
        return true;
      } else if (!found && settings.contextLogicType === 'AND') {
        return false;
      }
    }

    return settings.contextLogicType === 'AND';
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

  function findExactTextMatches(text, searchTerm, caseSensitive, displayRange) {
    const matches = [];
    let lastIndex = 0;
    const searchTermToUse = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    const textToSearch = caseSensitive ? text : text.toLowerCase();
    const words = text.split(/\s+/);

    while ((lastIndex = textToSearch.indexOf(searchTermToUse, lastIndex)) !== -1) {
      // Find the word position for this match
      const textBefore = text.slice(0, lastIndex);
      const wordPosition = textBefore.split(/\s+/).length - 1;
      
      // Extract display context based on displayRange
      const startPos = Math.max(0, wordPosition - displayRange);
      const endPos = Math.min(words.length, wordPosition + displayRange + 1);
      
      matches.push({
        index: lastIndex,
        position: wordPosition,
        matchedText: text.slice(lastIndex, lastIndex + searchTerm.length),
        wordsBefore: words.slice(startPos, wordPosition).join(' '),
        wordsAfter: words.slice(wordPosition + 1, endPos).join(' ')
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
      
      // Initialize matches array for this keyword
      const matches = [];

      if (keyword.useExactText) {
        const exactMatches = findExactTextMatches(doc.content, keyword.word, keyword.caseSensitive, keyword.displayContextRange);
        
        console.log(`Found ${exactMatches.length} potential exact matches before context validation`);
        
        for (const match of exactMatches) {
          console.log(`Validating context for match at position ${match.position}`);
          console.log('Context settings:', {
            before: keyword.contextBefore,
            after: keyword.contextAfter,
            rangeBefore: keyword.contextRangeBefore,
            rangeAfter: keyword.contextRangeAfter
          });
          
          if (hasValidContext(documentWords.join(' '), match.position, keyword)) {
            console.log('Match passed context validation');
            matches.push({
              position: match.position,
              term: match.matchedText,
              wordsBefore: match.wordsBefore,
              wordsAfter: match.wordsAfter,
              similarity: 1
            });
          } else {
            console.log('Match failed context validation');
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
              const startIdx = Math.max(0, i - keyword.displayContextRange);
              const endIdx = Math.min(documentWords.length, i + keyword.displayContextRange + 1);
              
              matches.push({
                position: i,
                term: documentWords[i],
                wordsBefore: documentWords.slice(startIdx, i).join(' '),
                wordsAfter: documentWords.slice(i + 1, endIdx).join(' '),
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
          contextLogicType: keyword.contextLogicType,
          displayContextRange: keyword.displayContextRange
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