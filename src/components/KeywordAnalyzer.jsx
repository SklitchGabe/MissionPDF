import React, { useState } from 'react';
import { Plus, X, Search, Settings } from 'lucide-react';

const KeywordAnalyzer = ({ documents, onAnalyze }) => {
  const [globalSettings, setGlobalSettings] = useState({
    deFuzzText: true, // Remove special characters, extra spaces, etc.
    normalizeText: true, // Convert to lowercase, remove diacritics
    ignoreSectionHeaders: true, // Skip text that appears to be headers/titles
    ignoreReferences: true, // Skip reference/bibliography sections
    ignoreFootnotes: true, // Skip footnotes
    countUniqueInstances: true, // Count each instance once per context
  });

  const [keywords, setKeywords] = useState([{ 
    word: '', 
    // Context requirements
    contextBefore: '',
    contextAfter: '',
    contextAny: '', // Any of these words must appear within range
    contextAll: '', // All of these words must appear within range
    contextNone: '', // None of these words should appear within range
    wordRange: 20,
    
    // Matching options
    fuzzyMatch: false, // Allow for slight misspellings
    fuzzyThreshold: 0.8, // How close the match needs to be (0.0 to 1.0)
    caseSensitive: false,
    wholeWordOnly: true, // Don't match substrings
    
    // Semantic options
    includeVariants: true, // Include morphological variants (e.g., sustain, sustainable, sustainability)
    includeSynonyms: false, // Include common synonyms
    
    // Section constraints
    validSections: [], // Only count matches in specific report sections
    excludedSections: [], // Don't count matches in these sections
    
    // Classification
    category: '', // e.g., "biodiversity", "agriculture", "sustainability"
    weight: 1.0, // Importance weight for this keyword
    
    // Compound conditions
    requiresAny: [], // Match counts only if any of these keywords also appear in document
    requiresAll: [], // Match counts only if all of these keywords also appear in document
    mutuallyExclusive: [], // Keywords that shouldn't appear near this one
    
    // Advanced options
    countInTables: true, // Whether to count matches found in tables
    countInFigures: true, // Whether to count matches found in figure captions
    minPerDocument: 0, // Minimum occurrences needed to count the document
    maxDistance: Infinity, // Maximum word distance between related keywords
  }]);

  const addKeyword = () => {
    setKeywords([...keywords, { ...keywords[0], word: '' }]);
  };

  const removeKeyword = (index) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const updateKeyword = (index, field, value) => {
    const newKeywords = [...keywords];
    newKeywords[index] = { ...newKeywords[index], [field]: value };
    setKeywords(newKeywords);
  };

  const updateGlobalSettings = (field, value) => {
    setGlobalSettings({ ...globalSettings, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Document Analysis Settings
      </h2>

      {/* Global Settings Panel */}
      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
          Global Processing Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.deFuzzText}
              onChange={(e) => updateGlobalSettings('deFuzzText', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Clean text (remove special characters, normalize spaces)
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.normalizeText}
              onChange={(e) => updateGlobalSettings('normalizeText', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Normalize text (case, diacritics)
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.ignoreSectionHeaders}
              onChange={(e) => updateGlobalSettings('ignoreSectionHeaders', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Ignore section headers
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.ignoreReferences}
              onChange={(e) => updateGlobalSettings('ignoreReferences', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Ignore references/bibliography
            </label>
          </div>
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-4">
        {keywords.map((keyword, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Keyword {index + 1}
              </h3>
              <button
                onClick={() => removeKeyword(index)}
                className="text-red-500 hover:text-red-600 dark:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Settings */}
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Keyword
                </label>
                <input
                  type="text"
                  value={keyword.word}
                  onChange={(e) => updateKeyword(index, 'word', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter keyword..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={keyword.category}
                  onChange={(e) => updateKeyword(index, 'category', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., biodiversity, agriculture..."
                />
              </div>

              {/* Context Requirements */}
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Must Include All (comma-separated)
                </label>
                <input
                  type="text"
                  value={keyword.contextAll}
                  onChange={(e) => updateKeyword(index, 'contextAll', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., agricultural, environmental"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Must Include Any (comma-separated)
                </label>
                <input
                  type="text"
                  value={keyword.contextAny}
                  onChange={(e) => updateKeyword(index, 'contextAny', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., forest, ecosystem, habitat"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Must Not Include (comma-separated)
                </label>
                <input
                  type="text"
                  value={keyword.contextNone}
                  onChange={(e) => updateKeyword(index, 'contextNone', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., financial, fiscal"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Word Range
                </label>
                <input
                  type="number"
                  value={keyword.wordRange}
                  onChange={(e) => updateKeyword(index, 'wordRange', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="1"
                  max="100"
                />
              </div>

              {/* Matching Options */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={keyword.fuzzyMatch}
                    onChange={(e) => updateKeyword(index, 'fuzzyMatch', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Enable fuzzy matching
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={keyword.includeVariants}
                    onChange={(e) => updateKeyword(index, 'includeVariants', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Include word variants
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={keyword.wholeWordOnly}
                    onChange={(e) => updateKeyword(index, 'wholeWordOnly', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Whole words only
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={keyword.countInTables}
                    onChange={(e) => updateKeyword(index, 'countInTables', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Include tables
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-between">
          <button
            onClick={addKeyword}
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 
                     dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Plus className="h-4 w-4" />
            Add Keyword
          </button>

          <button
            onClick={() => onAnalyze(keywords, globalSettings)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 
                     text-white px-4 py-2 rounded-md"
          >
            <Search className="h-4 w-4" />
            Analyze Documents
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeywordAnalyzer;