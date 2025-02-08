import React, { useState } from 'react';
import { Plus, X, Search, ChevronDown, ChevronUp } from 'lucide-react';

const KeywordAnalyzer = ({ documents, onAnalyze }) => {
  const [keywords, setKeywords] = useState([{ 
    word: '',
    category: '',
    contextBefore: '',
    contextAfter: '',
    contextRangeBefore: 5,
    contextRangeAfter: 5,
    showAdvanced: false,
    useFuzzyMatch: false,
    fuzzyMatchThreshold: 0.8,
    useExactText: false,
    caseSensitive: false,
    exactContextBefore: false,
    exactContextAfter: false,
    fuzzyContextBefore: false,
    fuzzyContextAfter: false,
    fuzzyContextThresholdBefore: 0.8,
    fuzzyContextThresholdAfter: 0.8,
    contextLogicType: 'OR'
  }]);

  const addKeyword = () => {
    setKeywords([...keywords, { 
      word: '', 
      category: '',
      contextBefore: '',
      contextAfter: '',
      contextRangeBefore: 5,
      contextRangeAfter: 5,
      showAdvanced: false,
      useFuzzyMatch: false,
      fuzzyMatchThreshold: 0.8,
      useExactText: false,
      caseSensitive: false,
      exactContextBefore: false,
      exactContextAfter: false,
      fuzzyContextBefore: false,
      fuzzyContextAfter: false,
      fuzzyContextThresholdBefore: 0.8,
      fuzzyContextThresholdAfter: 0.8,
      contextLogicType: 'OR'
    }]);
  };

  const removeKeyword = (index) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const updateKeyword = (index, field, value) => {
    const newKeywords = [...keywords];
    newKeywords[index] = { ...newKeywords[index], [field]: value };
    
    // If exact text is enabled, disable fuzzy matching
    if (field === 'useExactText' && value === true) {
      newKeywords[index].useFuzzyMatch = false;
    }
    // If fuzzy matching is enabled, disable exact text
    if (field === 'useFuzzyMatch' && value === true) {
      newKeywords[index].useExactText = false;
    }
    
    // For context words, disable exact match if fuzzy is enabled and vice versa
    if (field === 'exactContextBefore' && value === true) {
      newKeywords[index].fuzzyContextBefore = false;
    }
    if (field === 'fuzzyContextBefore' && value === true) {
      newKeywords[index].exactContextBefore = false;
    }
    if (field === 'exactContextAfter' && value === true) {
      newKeywords[index].fuzzyContextAfter = false;
    }
    if (field === 'fuzzyContextAfter' && value === true) {
      newKeywords[index].exactContextAfter = false;
    }
    
    setKeywords(newKeywords);
  };

  const toggleAdvanced = (index) => {
    const newKeywords = [...keywords];
    newKeywords[index] = { 
      ...newKeywords[index], 
      showAdvanced: !newKeywords[index].showAdvanced 
    };
    setKeywords(newKeywords);
  };

  const handleAnalyze = () => {
    const validKeywords = keywords.filter(k => k.word.trim() !== '');
    if (validKeywords.length === 0) {
      alert('Please enter at least one keyword');
      return;
    }
    
    onAnalyze(validKeywords);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Keyword Analysis
      </h2>

      <div className="space-y-4">
        {keywords.map((keyword, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Keyword {index + 1}
              </h3>
              {keywords.length > 1 && (
                <button
                  onClick={() => removeKeyword(index)}
                  className="text-red-500 hover:text-red-600 dark:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Category (optional)
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
            </div>

            <div className="mt-4">
              <button
                onClick={() => toggleAdvanced(index)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 
                         dark:text-gray-400 dark:hover:text-gray-200"
              >
                {keyword.showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Advanced Options
              </button>

              {keyword.showAdvanced && (
                <div className="mt-4 space-y-4">
                  {/* Matching Options */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Matching Options
                    </h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={keyword.caseSensitive}
                          onChange={(e) => updateKeyword(index, 'caseSensitive', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          Case sensitive matching
                        </label>
                      </div>

                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={keyword.useExactText}
                          onChange={(e) => updateKeyword(index, 'useExactText', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          Use exact text matching (finds text within words)
                        </label>
                      </div>

                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={keyword.useFuzzyMatch}
                          onChange={(e) => updateKeyword(index, 'useFuzzyMatch', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600"
                          disabled={keyword.useExactText}
                        />
                        <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          Enable fuzzy matching (allows for minor spelling variations)
                        </label>
                      </div>

                      {keyword.useFuzzyMatch && (
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Similarity Threshold (0.0 - 1.0)
                          </label>
                          <input
                            type="number"
                            value={keyword.fuzzyMatchThreshold}
                            onChange={(e) => updateKeyword(index, 'fuzzyMatchThreshold', 
                              Math.min(1, Math.max(0, parseFloat(e.target.value) || 0.8)))}
                            step="0.1"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            min="0"
                            max="1"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Higher values require closer matches (0.8 recommended)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Context Settings */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        Context Requirements
                      </h4>
                      <div className="flex items-center gap-4">
                        <select
                          value={keyword.contextLogicType}
                          onChange={(e) => updateKeyword(index, 'contextLogicType', e.target.value)}
                          className="p-1 text-sm border border-gray-300 dark:border-gray-600 rounded
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="OR">Match ANY context (OR)</option>
                          <option value="AND">Match ALL context (AND)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Before Context */}
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">
                              Words Before (comma-separated)
                            </label>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={keyword.exactContextBefore}
                                  onChange={(e) => updateKeyword(index, 'exactContextBefore', e.target.checked)}
                                  className="rounded border-gray-300 dark:border-gray-600 mr-2"
                                  disabled={keyword.fuzzyContextBefore}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Exact
                                </span>
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={keyword.fuzzyContextBefore}
                                  onChange={(e) => updateKeyword(index, 'fuzzyContextBefore', e.target.checked)}
                                  className="rounded border-gray-300 dark:border-gray-600 mr-2"
                                  disabled={keyword.exactContextBefore}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Fuzzy
                                </span>
                              </div>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={keyword.contextBefore}
                            onChange={(e) => updateKeyword(index, 'contextBefore', e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="e.g., agricultural, environmental"
                          />
                          {keyword.fuzzyContextBefore && (
                            <div className="mt-2">
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Context Before Similarity Threshold (0.0 - 1.0)
                              </label>
                              <input
                                type="number"
                                value={keyword.fuzzyContextThresholdBefore}
                                onChange={(e) => updateKeyword(index, 'fuzzyContextThresholdBefore', 
                                  Math.min(1, Math.max(0, parseFloat(e.target.value) || 0.8)))}
                                step="0.1"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                min="0"
                                max="1"
                              />
                            </div>
                          )}
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {keyword.exactContextBefore ? 
                              "Will match exact character sequences within words" :
                              keyword.fuzzyContextBefore ?
                              "Will match similar words based on threshold" :
                              "Will match whole words only"}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Context Range Before (words)
                          </label>
                          <input
                            type="number"
                            value={keyword.contextRangeBefore}
                            onChange={(e) => updateKeyword(index, 'contextRangeBefore', 
                              Math.max(1, parseInt(e.target.value) || 5))}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            min="1"
                            max="50"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Number of words to search before matches (1-50)
                          </p>
                        </div>
                      </div>

                      {/* After Context */}
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">
                              Words After (comma-separated)
                            </label>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={keyword.exactContextAfter}
                                  onChange={(e) => updateKeyword(index, 'exactContextAfter', e.target.checked)}
                                  className="rounded border-gray-300 dark:border-gray-600 mr-2"
                                  disabled={keyword.fuzzyContextAfter}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Exact
                                </span>
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={keyword.fuzzyContextAfter}
                                  onChange={(e) => updateKeyword(index, 'fuzzyContextAfter', e.target.checked)}
                                  className="rounded border-gray-300 dark:border-gray-600 mr-2"
                                  disabled={keyword.exactContextAfter}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Fuzzy
                                </span>
                              </div>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={keyword.contextAfter}
                            onChange={(e) => updateKeyword(index, 'contextAfter', e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="e.g., practices, methods"
                          />
                          {keyword.fuzzyContextAfter && (
                            <div className="mt-2">
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Context After Similarity Threshold (0.0 - 1.0)
                              </label>
                              <input
                                type="number"
                                value={keyword.fuzzyContextThresholdAfter}
                                onChange={(e) => updateKeyword(index, 'fuzzyContextThresholdAfter', 
                                  Math.min(1, Math.max(0, parseFloat(e.target.value) || 0.8)))}
                                step="0.1"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                min="0"
                                max="1"
                              />
                            </div>
                          )}
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {keyword.exactContextAfter ? 
                              "Will match exact character sequences within words" :
                              keyword.fuzzyContextAfter ?
                              "Will match similar words based on threshold" :
                              "Will match whole words only"}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Context Range After (words)
                          </label>
                          <input
                            type="number"
                            value={keyword.contextRangeAfter}
                            onChange={(e) => updateKeyword(index, 'contextRangeAfter', 
                              Math.max(1, parseInt(e.target.value) || 5))}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            min="1"
                            max="50"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Number of words to search after matches (1-50)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
            onClick={handleAnalyze}
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