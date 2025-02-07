import { useState } from 'react';
import PDFUploader from './components/PDFUploader';
import TextViewer from './components/TextViewer';
import KeywordAnalyzer from './components/KeywordAnalyzer';
import AnalysisResults from './components/AnalysisResults';
import { analyzeText } from './utils/textAnalyzer.js';
import { useDocuments } from './hooks/useDocuments';
import { ChevronUp, ChevronDown } from 'lucide-react';

function App() {
  const {
    documents,
    isProcessing,
    progress,
    error,
    processDocuments,
    removeDocument
  } = useDocuments();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showDocuments, setShowDocuments] = useState(true);

  const handleFileUpload = async (files) => {
    console.log('Files received:', files);
    await processDocuments(files);
    console.log('Documents after processing:', documents);
  };

  const handleAnalyze = async (keywords, globalSettings) => {
    try {
      console.log('Starting analysis with documents:', documents);
      console.log('Keywords to search for:', keywords);
      console.log('Global settings:', globalSettings);

      // Check if we have document content
      documents.forEach(doc => {
        console.log(`Document ${doc.name} content preview:`, 
          doc.content ? doc.content.slice(0, 100) : 'NO CONTENT');
      });

      const results = await analyzeText(documents, keywords, globalSettings);
      console.log('Analysis results:', results);
      setAnalysisResults(results);
      // Automatically hide documents section when analysis is complete
      setShowDocuments(false);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Error during analysis: ' + error.message);
    }
  };

  const documentsSection = (
    <div className={`transition-all duration-300 ${showDocuments ? 'mb-8' : 'mb-2'}`}>
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg"
        onClick={() => setShowDocuments(!showDocuments)}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Document Management
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {progress.totalUploaded} document{progress.totalUploaded !== 1 ? 's' : ''} uploaded
            {progress.totalProcessed > 0 && 
              ` (${progress.totalProcessed} successfully processed${
                isProcessing ? `, ${progress.processed} of ${progress.total} in current batch` : ''
              })`
            }
          </div>
        </div>
        {showDocuments ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {showDocuments && (
        <>
          <div className="mb-8">
            <PDFUploader 
              onFileUpload={handleFileUpload} 
              isProcessing={isProcessing}
              progress={progress}
            />
          </div>
          
          {isProcessing && (
            <div className="mt-4 text-center text-blue-500 dark:text-blue-400">
              Processing documents...
            </div>
          )}
          
          {error && (
            <div className="mt-4 text-center text-red-500 dark:text-red-400">
              Error: {error}
            </div>
          )}

          {documents.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Processed Documents
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} ready for analysis
                </div>
              </div>
              <div className="space-y-4">
                {documents.map(doc => (
                  <div 
                    key={doc.id}
                    className="bg-white p-4 rounded-lg shadow dark:bg-gray-800"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {doc.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {doc.pageCount} pages • {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          View Text
                        </button>
                        <button
                          onClick={() => removeDocument(doc.id)}
                          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Document Analysis Tool
        </h1>
        
        {documentsSection}

        {documents.length > 0 && (
          <>
            <KeywordAnalyzer 
              documents={documents}
              onAnalyze={handleAnalyze}
            />
          </>
        )}

        {selectedDocument && (
          <TextViewer
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
          />
        )}

        {analysisResults && (
          <AnalysisResults 
            results={analysisResults}
            documents={documents}
          />
        )}
      </div>
    </div>
  );
}

export default App;