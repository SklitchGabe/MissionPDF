import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Settings2 } from 'lucide-react';
import stringSimilarity from 'string-similarity';

// Generate a list of distinct colors for different keywords
const HIGHLIGHT_COLORS = [
  'text-red-600 dark:text-red-400',
  'text-blue-600 dark:text-blue-400',
  'text-green-600 dark:text-green-400',
  'text-purple-600 dark:text-purple-400',
  'text-yellow-600 dark:text-yellow-400',
  'text-indigo-600 dark:text-indigo-400',
  'text-pink-600 dark:text-pink-400',
  'text-teal-600 dark:text-teal-400',
  'text-orange-600 dark:text-orange-400',
  'text-cyan-600 dark:text-cyan-400'
];

const TextViewer = ({ 
  document, 
  onClose, 
  highlightKeywords = [], // Array of { word, settings } objects from analysis
  initialKeyword = null // Optional keyword to focus on initially
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSettings, setSearchSettings] = useState({
    useFuzzyMatch: false,
    useExactText: false,
    fuzzyMatchThreshold: 0.8,
    caseSensitive: false
  });
  const [showSearchSettings, setShowSearchSettings] = useState(false);
  const [keywordMatches, setKeywordMatches] = useState(new Map());

  // Process keywords to handle overlaps and assign colors
  const processedKeywords = useMemo(() => {
    const keywords = new Map();
    
    // First, process the analysis keywords
    highlightKeywords.forEach((keywordObj, index) => {
      const colorIndex = index % HIGHLIGHT_COLORS.length;
      const key = `${keywordObj.word}_${JSON.stringify(keywordObj.settings)}`;
      keywords.set(key, {
        ...keywordObj,
        color: HIGHLIGHT_COLORS[colorIndex],
        source: 'analysis'
      });
    });

    // Add the search term if it exists
    if (searchTerm) {
      const key = `search_${searchTerm}_${JSON.stringify(searchSettings)}`;
      keywords.set(key, {
        word: searchTerm,
        settings: searchSettings,
        color: 'text-amber-600 dark:text-amber-400', // Special color for search matches
        source: 'search'
      });
    }

    return keywords;
  }, [highlightKeywords, searchTerm, searchSettings]);

  // Find matches for a single keyword with its settings
  const findMatches = (text, keyword) => {
    const matches = [];
    const { settings } = keyword;

    if (settings.useExactText) {
      // Exact character sequence matching
      let position = 0;
      const searchText = settings.caseSensitive ? text : text.toLowerCase();
      const searchTerm = settings.caseSensitive ? keyword.word : keyword.word.toLowerCase();
      
      while ((position = searchText.indexOf(searchTerm, position)) !== -1) {
        matches.push({
          start: position,
          end: position + keyword.word.length,
          text: text.slice(position, position + keyword.word.length)
        });
        position += 1;
      }
    } else {
      // Word-based matching
      const words = text.split(/(\s+)/);
      let position = 0;
      
      words.forEach((word, index) => {
        if (settings.useFuzzyMatch) {
          // Fuzzy word matching
          const similarity = stringSimilarity.compareTwoStrings(
            settings.caseSensitive ? word : word.toLowerCase(),
            settings.caseSensitive ? keyword.word : keyword.word.toLowerCase()
          );
          if (similarity >= settings.fuzzyMatchThreshold) {
            matches.push({
              start: position,
              end: position + word.length,
              text: word,
              similarity
            });
          }
        } else {
          // Exact word matching
          const matches1 = settings.caseSensitive
            ? word === keyword.word
            : word.toLowerCase() === keyword.word.toLowerCase();
          if (matches1) {
            matches.push({
              start: position,
              end: position + word.length,
              text: word
            });
          }
        }
        position += word.length;
      });
    }

    return matches;
  };

  // Find all keyword matches in the text
  const findAllMatches = (text) => {
    const allMatches = new Map();
    
    processedKeywords.forEach((keyword, key) => {
      const matches = findMatches(text, keyword);
      if (matches.length > 0) {
        allMatches.set(key, {
          matches,
          keyword
        });
      }
    });

    return allMatches;
  };

  // Update matches when text, search term, or keywords change
  useEffect(() => {
    if (document?.content) {
      const matches = findAllMatches(document.content);
      setKeywordMatches(matches);
    }
  }, [document?.content, processedKeywords]);

  // Render text with highlighted matches
  const renderHighlightedText = (text, matches) => {
    // Sort all matches by start position
    const allMatches = Array.from(matches.values()).flatMap(({ matches, keyword }) =>
      matches.map(match => ({
        ...match,
        keyword
      }))
    ).sort((a, b) => a.start - b.start);

    // Handle overlapping matches
    const segments = [];
    let lastEnd = 0;

    allMatches.forEach(match => {
      if (match.start > lastEnd) {
        // Add non-matching text segment
        segments.push({
          text: text.slice(lastEnd, match.start),
          isMatch: false
        });
      }

      if (match.start >= lastEnd) {
        // Add matching text segment
        segments.push({
          text: match.text,
          isMatch: true,
          color: match.keyword.color,
          similarity: match.similarity
        });
        lastEnd = match.end;
      }
    });

    // Add remaining text
    if (lastEnd < text.length) {
      segments.push({
        text: text.slice(lastEnd),
        isMatch: false
      });
    }

    return segments.map((segment, index) => (
      segment.isMatch ? (
        <span 
          key={index} 
          className={`font-bold ${segment.color}`}
          title={segment.similarity ? `Similarity: ${segment.similarity.toFixed(3)}` : undefined}
        >
          {segment.text}
        </span>
      ) : (
        <span key={index}>{segment.text}</span>
      )
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative h-[90vh] w-[90vw] rounded-lg bg-white dark:bg-gray-800 p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {document.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in text..."
              className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <button
            onClick={() => setShowSearchSettings(!showSearchSettings)}
            className="p-2 rounded-md border border-gray-300 dark:border-gray-600 
                     hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Search Settings"
          >
            <Settings2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Search Settings */}
        {showSearchSettings && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Search Settings
            </h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchSettings.useExactText}
                  onChange={(e) => setSearchSettings(prev => ({
                    ...prev,
                    useExactText: e.target.checked,
                    useFuzzyMatch: e.target.checked ? false : prev.useFuzzyMatch
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Exact text match (find character sequences)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchSettings.useFuzzyMatch}
                  onChange={(e) => setSearchSettings(prev => ({
                    ...prev,
                    useFuzzyMatch: e.target.checked,
                    useExactText: e.target.checked ? false : prev.useExactText
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Fuzzy match
                </span>
              </label>
              {searchSettings.useFuzzyMatch && (
                <div className="pl-6">
                  <label className="block text-sm text-gray-700 dark:text-gray-300">
                    Similarity threshold:
                    <input
                      type="number"
                      value={searchSettings.fuzzyMatchThreshold}
                      onChange={(e) => setSearchSettings(prev => ({
                        ...prev,
                        fuzzyMatchThreshold: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0.8))
                      }))}
                      step="0.1"
                      min="0"
                      max="1"
                      className="ml-2 w-20 p-1 border border-gray-300 dark:border-gray-600 rounded"
                    />
                  </label>
                </div>
              )}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchSettings.caseSensitive}
                  onChange={(e) => setSearchSettings(prev => ({
                    ...prev,
                    caseSensitive: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Case sensitive
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Content with highlights */}
        <div className="h-[calc(90vh-12rem)] overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 dark:text-gray-200">
            {renderHighlightedText(document.content, keywordMatches)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TextViewer;