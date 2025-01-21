import React, { useState } from 'react';
import { Plus, X, Search, ChevronDown, ChevronUp } from 'lucide-react';

const KeywordAnalyzer = ({ documents, onAnalyze }) => {
  const [keywords, setKeywords] = useState([{ 
    word: '',
    category: '',
    contextBefore: '',
    contextAfter: '',
    contextRange: 5,
    showAdvanced: false,
    useFuzzyMatch: false,
    fuzzyMatchThreshold: 0.8
  }]);

  const addKeyword = () => {
    setKeywords([...keywords, { 
      word: '', 
      category: '',
      contextBefore: '',
      contextAfter: '',
      contextRange: 5,
      showAdvanced: false,
      useFuzzyMatch: false,
      fuzzyMatchThreshold: 0.8
    }]);
  };

  const removeKeyword = (index) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const updateKeyword = (index, field, value) => {
    const newKeywords = [...keywords];
    newKeywords[index] = { ...newKeywords[index], [field]: value };
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
    
    onAnalyze(validKeywords, {
      deFuzzText: false,
      normalizeText: false,
      ignoreReferences: false
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Keyword Analysis
      </h2>

      <div className="space-y-4">
        {keywords.map((keyword, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            {/* Basic Keyword Fields */}
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

            {/* Advanced Options */}
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
                  {/* Context Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Words Before (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={keyword.contextBefore}
                        onChange={(e) => updateKeyword(index, 'contextBefore', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., agricultural, environmental"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Words After (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={keyword.contextAfter}
                        onChange={(e) => updateKeyword(index, 'contextAfter', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., practices, methods"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Word Range
                      </label>
                      <input
                        type="number"
                        value={keyword.contextRange}
                        onChange={(e) => updateKeyword(index, 'contextRange', 
                          Math.max(1, parseInt(e.target.value) || 5))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="1"
                        max="50"
                      />
                    </div>
                  </div>

                  {/* Fuzzy Matching Settings */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Fuzzy Matching
                    </h4>
                    
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={keyword.useFuzzyMatch}
                        onChange={(e) => updateKeyword(index, 'useFuzzyMatch', e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        Enable fuzzy matching
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