import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import WordTree from './WordTree';

const AnalysisResults = ({ results, documents }) => {
  const [expandedDocs, setExpandedDocs] = useState(new Set());
  const [expandedKeywords, setExpandedKeywords] = useState(new Set());
  const [showWordTree, setShowWordTree] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState(null);

  const toggleDoc = (docId) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocs(newExpanded);
  };

  const toggleKeyword = (docId, keyword) => {
    const key = `${docId}-${keyword}`;
    const newExpanded = new Set(expandedKeywords);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeywords(newExpanded);
  };

  const exportToExcel = () => {
    // Create summary sheet
    const summaryData = results.map(doc => {
      const row = {
        'Document Name': doc.documentName,
      };
      // Add counts for each keyword
      Object.entries(doc.keywords).forEach(([keyword, data]) => {
        row[`${keyword} Count`] = data.count;
      });
      return row;
    });

    // Create detailed matches sheet
    const detailedData = [];
    results.forEach(doc => {
      Object.entries(doc.keywords).forEach(([keyword, data]) => {
        data.matches.forEach(match => {
          detailedData.push({
            'Document Name': doc.documentName,
            'Keyword': keyword,
            'Category': data.category,
            'Context': match.context,
            'Similarity': match.similarity?.toFixed(3) || 'N/A'
          });
        });
      });
    });

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    const summaryWS = XLSX.utils.json_to_sheet(summaryData);
    const detailedWS = XLSX.utils.json_to_sheet(detailedData);

    XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");
    XLSX.utils.book_append_sheet(wb, detailedWS, "Detailed Matches");

    // Save the file
    XLSX.writeFile(wb, "keyword-analysis.xlsx");
  };

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Analysis Results
        </h2>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </button>
      </div>

      <div className="space-y-4">
        {results.map(doc => (
          <div 
            key={doc.documentId}
            className="border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => toggleDoc(doc.documentId)}
            >
              <div className="flex items-center gap-2">
                {expandedDocs.has(doc.documentId) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {doc.documentName}
                </h3>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {Object.keys(doc.keywords).length} keywords analyzed
              </div>
            </div>

            {expandedDocs.has(doc.documentId) && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2">Keyword</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Count</th>
                      <th className="pb-2">Actions</th>
                      <th className="pb-2">Visualization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(doc.keywords).map(([keyword, data]) => (
                      <React.Fragment key={keyword}>
                        <tr className="border-t border-gray-100 dark:border-gray-700">
                          <td className="py-2">{keyword}</td>
                          <td className="py-2">{data.category}</td>
                          <td className="py-2">{data.count}</td>
                          <td className="py-2">
                            <button
                              onClick={() => toggleKeyword(doc.documentId, keyword)}
                              className="text-blue-500 hover:text-blue-600 text-sm"
                            >
                              {expandedKeywords.has(`${doc.documentId}-${keyword}`) ? 
                                'Hide Matches' : 'Show Matches'}
                            </button>
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => {
                                setSelectedKeyword(keyword);
                                setShowWordTree(true);
                              }}
                              className="flex items-center gap-1 text-green-500 hover:text-green-600 text-sm"
                            >
                              <GitBranch className="h-4 w-4" />
                              Word Tree
                            </button>
                          </td>
                        </tr>
                        {expandedKeywords.has(`${doc.documentId}-${keyword}`) && (
                          <tr>
                            <td colSpan="5" className="py-2">
                              <div className="pl-4 space-y-2">
                                {data.matches.map((match, idx) => (
                                  <div 
                                    key={idx}
                                    className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded"
                                  >
                                    <div>
                                      {match.context}
                                    </div>
                                    {match.similarity && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Similarity: {match.similarity.toFixed(3)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {showWordTree && selectedKeyword && (
        <WordTree
          documents={documents}
          keyword={selectedKeyword}
          onClose={() => {
            setShowWordTree(false);
            setSelectedKeyword(null);
          }}
        />
      )}
    </div>
  );
};

export default AnalysisResults;