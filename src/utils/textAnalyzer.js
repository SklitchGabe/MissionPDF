// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator,
        );
      }
    }
    return track[str2.length][str1.length];
  }
  
  // Clean and normalize text based on settings
  function preprocessText(text, settings) {
    let processed = text;
    
    if (settings.deFuzzText) {
      // Remove special characters and normalize spaces
      processed = processed.replace(/[^\w\s]|_/g, ' ')
        .replace(/\s+/g, ' ').trim();
    }
    
    if (settings.normalizeText) {
      // Convert to lowercase and remove diacritics
      processed = processed.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    
    if (settings.ignoreReferences) {
      // Detect common bibliography section headers
      const bibliographyHeaders = /(?:references|bibliography|works cited|literature cited)(?:\s|:|$)/i;
      
      // Find the bibliography section start
      const headerMatch = processed.match(bibliographyHeaders);
      if (headerMatch) {
        // Get the text before the bibliography
        processed = processed.slice(0, headerMatch.index);
      }
  
      // Remove in-text citations
      processed = processed
        // Remove numbered citations [1] or [1,2] or [1-3]
        .replace(/\[\d+(?:[-,]\d+)*\]/g, '')
        // Remove author-year citations (Smith et al., 2023) or (IPCC, 2022)
        .replace(/\([A-Za-z\s]+(?:et al\.)?(?:,|\s)+\d{4}\)/g, '')
        // Remove DOIs
        .replace(/\b(?:https?:\/\/)?(?:dx\.)?doi\.org\/[^\s]+/g, '')
        // Clean up any resulting double spaces
        .replace(/\s+/g, ' ');
    }
    
    return processed;
  }
  
  // Get word variants
  function getWordVariants(word) {
    // This is a simple implementation - could be expanded with a proper morphological analyzer
    const variants = new Set([word]);
    const suffixes = ['s', 'es', 'ed', 'ing', 'al', 'ally', 'ity', 'ities'];
    
    suffixes.forEach(suffix => {
      variants.add(word + suffix);
      if (word.endsWith('e')) {
        variants.add(word.slice(0, -1) + suffix);
      }
    });
    
    return Array.from(variants);
  }
  
  // Check if a word appears in context
  function checkContext(text, position, contextWords, range, before = true) {
    if (!contextWords?.length) return true;
    
    const words = text.split(' ');
    const start = Math.max(0, before ? position - range : position);
    const end = Math.min(words.length, before ? position : position + range);
    const contextText = words.slice(start, end).join(' ');
    
    return contextWords.some(word => contextText.includes(word));
  }
  
  // Score text for likelihood of being a reference
  function isLikelyReference(text) {
    let score = 0;
    
    // Common reference patterns
    const patterns = {
      hasYear: /\(\d{4}\)/,                     // (2023)
      hasVolume: /\d+\s*\(\d+\):/,             // 12(3):
      hasPages: /pp\.\s*\d+[-–]\d+/,           // pp. 123-145
      hasAuthors: /[A-Z][a-z]+,\s*[A-Z]\./,    // Smith, J.
      hasDOI: /10\.\d{4,}/,                    // DOI pattern
      hasEtAl: /et\s+al\./,                    // et al.
      hasAmpersand: /\s&\s/,                   // & between authors
      hasJournalVolume: /Vol\.\s*\d+/i         // Volume indicator
    };
  
    // Check each pattern and increment score
    for (const [_, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) score += 1;
    }
  
    // Likely a reference if it matches multiple patterns
    return score >= 3;
  }
  
  // Main analysis function
  export async function analyzeText(documents, keywords, globalSettings) {
    const results = [];
    
    for (const doc of documents) {
      const docResults = {
        documentId: doc.id,
        documentName: doc.name,
        keywords: {}
      };
      
      // Preprocess text according to settings
      let processedText = preprocessText(doc.content, globalSettings);
      
      // Split into words for analysis
      const words = processedText.split(' ');
      
      // Analyze each keyword
      for (const keyword of keywords) {
        const matches = [];
        const searchTerms = keyword.includeVariants 
          ? getWordVariants(keyword.word)
          : [keyword.word];
        
        for (let i = 0; i < words.length; i++) {
          for (const term of searchTerms) {
            let isMatch = false;
            
            if (keyword.fuzzyMatch) {
              const distance = levenshteinDistance(words[i], term);
              isMatch = distance <= (term.length * (1 - keyword.fuzzyThreshold));
            } else {
              isMatch = keyword.caseSensitive 
                ? words[i] === term
                : words[i].toLowerCase() === term.toLowerCase();
            }
            
            if (isMatch) {
              // Check context requirements
              const contextWords = keyword.contextAll?.split(',').map(w => w.trim());
              const anyContextWords = keyword.contextAny?.split(',').map(w => w.trim());
              const noneContextWords = keyword.contextNone?.split(',').map(w => w.trim());
              
              const range = keyword.wordRange;
              const hasRequiredContext = 
                checkContext(processedText, i, contextWords, range, true) &&
                checkContext(processedText, i, anyContextWords, range, false) &&
                !checkContext(processedText, i, noneContextWords, range);
              
              if (hasRequiredContext) {
                // Get surrounding context for the match
                const contextStart = Math.max(0, i - range);
                const contextEnd = Math.min(words.length, i + range);
                const context = words.slice(contextStart, contextEnd).join(' ');
                
                matches.push({
                  position: i,
                  term: words[i],
                  context: context
                });
              }
            }
          }
        }
        
        docResults.keywords[keyword.word] = {
          count: matches.length,
          category: keyword.category,
          matches: matches
        };
      }
      
      results.push(docResults);
    }
    
    return results;
  }