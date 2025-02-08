import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Download, 
  ChevronDown, 
  ChevronRight, 
  GitBranch, 
  Loader2, 
  BarChart2,
  X,
  FileText 
} from 'lucide-react';
import WordTree from './WordTree';
import TextViewer from './TextViewer';
import Logger from '../utils/logger';
import ChartExporter from './ChartExporter';

const CHUNK_SIZE = 50;
const DELAY_BETWEEN_CHUNKS = 100;

// Helper function for consistent keyword ID creation
const createKeywordConfigId = (keyword, settings) => {
  const settingsStr = JSON.stringify({
    caseSensitive: settings.caseSensitive,
    useExactText: settings.useExactText,
    useFuzzyMatch: settings.useFuzzyMatch,
    fuzzyMatchThreshold: settings.fuzzyMatchThreshold,
    contextBefore: settings.contextBefore,
    contextAfter: settings.contextAfter,
    contextRange: settings.contextRange
  });
  return `${keyword}_${settingsStr}`;
};

// Loader component
const ExportLoader = ({ message, error = null }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-[9999]">
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl flex items-center gap-3">
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-gray-700 dark:text-gray-300">{message}</span>
        </>
      )}
    </div>
  </div>
);

// Main component
function AnalysisResults({ results, documents }) {
  const [expandedDocs, setExpandedDocs] = useState(new Set());
  const [expandedKeywords, setExpandedKeywords] = useState(new Set());
  const [showWordTree, setShowWordTree] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState(null);
  const [showChartExporter, setShowChartExporter] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [selectedTextDoc, setSelectedTextDoc] = useState(null);

  const toggleDoc = useCallback((docId) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  }, []);

  const toggleKeyword = useCallback((docId, keywordId) => {
    setExpandedKeywords(prev => {
      const key = `${docId}-${keywordId}`;
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  const processDataForExcel = async (results, onProgress) => {
    const summarySheetData = [];
    const detailedSheetData = [];
    const totalDocs = results.length;
    
    for (let docIndex = 0; docIndex < results.length; docIndex++) {
      const doc = results[docIndex];
      const summaryRow = { 'Document Name': doc.documentName };
      
      // Process keywords for summary
      Object.entries(doc.keywords).forEach(([_, data]) => {
        const settingsStr = [
          data.originalSettings.caseSensitive ? 'Case Sensitive' : 'Case Insensitive',
          data.originalSettings.useExactText ? 'Exact Match' : 
          data.originalSettings.useFuzzyMatch ? `Fuzzy (${data.originalSettings.fuzzyMatchThreshold})` : 
          'Normal Match'
        ].join(', ');

        summaryRow[`${data.word} (${settingsStr})`] = data.count || 0;
      });
      
      summarySheetData.push(summaryRow);

      // Process matches for detailed sheet
      for (const [_, data] of Object.entries(doc.keywords)) {
        if (!data.matches) continue;
        
        const chunkSize = 100;
        for (let i = 0; i < data.matches.length; i += chunkSize) {
          const matchChunk = data.matches.slice(i, i + chunkSize);
          
          matchChunk.forEach(match => {
            detailedSheetData.push({
              'Document Name': doc.documentName,
              'Keyword': data.word,
              'Settings': [
                data.originalSettings.caseSensitive ? 'Case Sensitive' : 'Case Insensitive',
                data.originalSettings.useExactText ? 'Exact Match' : 
                data.originalSettings.useFuzzyMatch ? `Fuzzy (${data.originalSettings.fuzzyMatchThreshold})` : 
                'Normal Match'
              ].join(', '),
              'Category': data.category || '',
              'Context': match.context || '',
              'Words Before': match.wordsBefore || '',
              'Matched Text': match.term || '',
              'Words After': match.wordsAfter || '',
              'Similarity': match.similarity?.toFixed(3) || 'N/A'
            });
          });

          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
        }
      }
      
      onProgress((docIndex + 1) / totalDocs * 100);
    }

    return { summarySheetData, detailedSheetData };
  };

  const exportToExcel = useCallback(async () => {
    try {
      Logger.info('AnalysisResults', 'Starting Excel export');
      setIsExporting(true);
      setExportError(null);
      setExportProgress(0);

      const { summarySheetData, detailedSheetData } = await processDataForExcel(
        results,
        setExportProgress
      );

      const wb = XLSX.utils.book_new();
      const summaryWS = XLSX.utils.json_to_sheet(summarySheetData);
      const detailedWS = XLSX.utils.json_to_sheet(detailedSheetData);

      const columnWidths = new Array(20).fill({ wch: 20 });
      summaryWS['!cols'] = columnWidths;
      detailedWS['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");
      XLSX.utils.book_append_sheet(wb, detailedWS, "Detailed Matches");

      XLSX.writeFile(wb, "keyword-analysis.xlsx");
      Logger.info('AnalysisResults', 'Export completed successfully');

    } catch (error) {
      Logger.error('AnalysisResults', 'Export failed', error);
      setExportError(error.message);
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [results]);

  const handleShowRawText = (docId) => {
    const document = documents.find(doc => doc.id === docId);
    if (document) {
      setSelectedTextDoc(document);
      setShowRawText(true);
    }
  };
  
  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Analysis Results
        </h2>
        <div className="flex items-center gap-2">
          {isExporting && (
            <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                Generating files ({Math.round(exportProgress)}%)...
              </span>
            </div>
          )}
          <button
            onClick={() => setShowWordTree(true)}
            disabled={isExporting}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GitBranch className="h-4 w-4" />
            View Word Trees
          </button>
          <button
            onClick={() => setShowChartExporter(true)}
            disabled={isExporting}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart2 className="h-4 w-4" />
            Export Charts
          </button>
          <button
            onClick={exportToExcel}
            disabled={isExporting}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
        </div>
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
                {Object.keys(doc.keywords).length} keyword configurations analyzed
              </div>
            </div>

            {expandedDocs.has(doc.documentId) && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2">Keyword</th>
                      <th className="pb-2">Settings</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Count</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(doc.keywords).map(([keywordId, data]) => (
                      <React.Fragment key={keywordId}>
                        <tr className="border-t border-gray-100 dark:border-gray-700">
                          <td className="py-2">{data.word}</td>
                          <td className="py-2 text-sm">
                            {[
                              data.originalSettings.caseSensitive ? 'Case Sensitive' : 'Case Insensitive',
                              data.originalSettings.useExactText ? 'Exact Match' : 
                              data.originalSettings.useFuzzyMatch ? `Fuzzy (${data.originalSettings.fuzzyMatchThreshold})` : 
                              'Normal Match'
                            ].join(', ')}
                          </td>
                          <td className="py-2">{data.category}</td>
                          <td className="py-2">{data.count}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleKeyword(doc.documentId, keywordId)}
                                className="text-blue-500 hover:text-blue-600 text-sm"
                              >
                                {expandedKeywords.has(`${doc.documentId}-${keywordId}`) ? 
                                  'Hide Matches' : 'Show Matches'}
                              </button>
                              <button
                                onClick={() => handleShowRawText(doc.documentId)}
                                className="text-green-500 hover:text-green-600 text-sm flex items-center gap-1"
                              >
                                <FileText className="h-4 w-4" />
                                Show Raw Text
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedKeywords.has(`${doc.documentId}-${keywordId}`) && (
                          <tr>
                            <td colSpan="5" className="py-2">
                              <div className="pl-4 space-y-2">
                                {data.matches.map((match, idx) => (
                                  <div 
                                    key={idx}
                                    className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded"
                                  >
                                    <div className="flex flex-col">
                                      <div className="font-medium text-gray-700 dark:text-gray-300">
                                        Context:
                                      </div>
                                      <div className="mt-1">
                                        <span className="text-gray-600 dark:text-gray-400">
                                          {match.wordsBefore}
                                        </span>
                                        <span className="mx-1 font-bold text-blue-600 dark:text-blue-400">
                                          {match.term}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400">
                                          {match.wordsAfter}
                                        </span>
                                      </div>
                                      {match.similarity && match.similarity !== 1 && (
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                          Similarity: {match.similarity.toFixed(3)}
                                        </div>
                                      )}
                                    </div>
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

      {showChartExporter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-[90vw] h-[90vh] bg-white dark:bg-gray-800 rounded-lg p-6 overflow-auto">
            <button
              onClick={() => setShowChartExporter(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
            <ChartExporter analysisResults={results} />
          </div>
        </div>
      )}

      {showWordTree && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="relative w-[90vw] h-[90vh] bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="absolute top-4 right-4 flex items-center gap-4">
            <select
              onChange={(e) => {
                const selectedKeywordId = e.target.value;
                if (selectedKeywordId) {
                  const keywordData = results.find(doc => doc.keywords[selectedKeywordId])?.keywords[selectedKeywordId];
                  if (keywordData) {
                    setSelectedKeyword({
                      word: keywordData.word,
                      matches: results.flatMap(doc => 
                        doc.keywords[selectedKeywordId]?.matches || []
                      )
                    });
                  }
                } else {
                  setSelectedKeyword(null);
                }
              }}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              defaultValue=""
            >
              <option value="">Select a keyword...</option>
              {Object.entries(results[0]?.keywords || {}).map(([keywordId, data]) => (
                <option key={keywordId} value={keywordId}>
                  {data.word} ({results.reduce((total, doc) => 
                    total + (doc.keywords[keywordId]?.matches?.length || 0), 0
                  )} total matches)
                </option>
              ))}
            </select>
            <select
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              defaultValue="all"
            >
              <option value="all">All Documents</option>
              {results.map(doc => (
                <option key={doc.documentId} value={doc.documentId}>
                  {doc.documentName}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setShowWordTree(false);
                setSelectedKeyword(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {selectedKeyword ? (
            <WordTree
              analysisResults={selectedDoc === 'all' ? results : 
                results.filter(doc => doc.documentId === selectedDoc)}
              keyword={selectedKeyword.word}
              onClose={() => {
                setShowWordTree(false);
                setSelectedKeyword(null);
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              Please select a keyword to view its word tree
            </div>
          )}
        </div>
      </div>
    )}

    {showRawText && selectedTextDoc && (
        <TextViewer
          document={selectedTextDoc}
          onClose={() => {
            setShowRawText(false);
            setSelectedTextDoc(null);
          }}
        />
      )}

      {isExporting && (
        <ExportLoader 
          message={exportError ? undefined : `Generating Excel file (${Math.round(exportProgress)}%)`}
          error={exportError}
        />
      )}
    </div>
  );
}

export default AnalysisResults;