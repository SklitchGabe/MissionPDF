import React, { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';

const KeywordAnalyzer = ({ documents, onAnalyze }) => {
  const [keywords, setKeywords] = useState([{ 
    word: '',
    category: ''
  }]);

  const addKeyword = () => {
    setKeywords([...keywords, { word: '', category: '' }]);
  };

  const removeKeyword = (index) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const updateKeyword = (index, field, value) => {
    const newKeywords = [...keywords];
    newKeywords[index] = { ...newKeywords[index], [field]: value };
    setKeywords(newKeywords);
  };

  const handleAnalyze = () => {
    // Filter out empty keywords
    const validKeywords = keywords.filter(k => k.word.trim() !== '');
    if (validKeywords.length === 0) {
      alert('Please enter at least one keyword');
      return;
    }
    
    // Call the parent's analyze function with minimal settings
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