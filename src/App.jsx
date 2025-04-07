import { useState, useRef } from 'react';
import PDFUploader from './components/PDFUploader';
import TextViewer from './components/TextViewer';
import KeywordAnalyzer from './components/KeywordAnalyzer';
import AnalysisResults from './components/AnalysisResults';
import Loader from './components/Loader';
import { analyzeText } from './utils/textAnalyzer.js';
import { useDocuments } from './hooks/useDocuments';
import { ChevronUp, ChevronDown, XCircle } from 'lucide-react';
import MemoryMonitor from './components/MemoryMonitor';

function App() {
  const {
    documents,
    isProcessing,
    progress,
    error,
    processDocuments,
    removeDocument,
    failedUploads,
    reprocessFailedUploads,
    uploadDocuments,
    isPaused,
    pauseProcessing,
    resumeProcessing,
    getDocumentText
  } = useDocuments();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showDocuments, setShowDocuments] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const abortControllerRef = useRef(null);

  const handleFileUpload = async (files) => {
    console.log('Files received:', files);
    await processDocuments(files);
    console.log('Documents after processing:', documents);
  };

  const handleAnalyze = async (keywords, globalSettings) => {
    try {
      // Create a new AbortController
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      
      // Create complete documents with text
      const documentsWithText = documents.map(doc => ({
        ...doc,
        content: getDocumentText(doc.id) // Get text content only when needed
      }));
      
      const totalWork = documentsWithText.length * keywords.length;
      let completedWork = 0;
  
      const updateProgress = () => {
        completedWork++;
        const currentProgress = (completedWork / totalWork) * 100;
        setAnalysisProgress(currentProgress);
      };
  
      const results = await analyzeText(documentsWithText, keywords, globalSettings, updateProgress, signal);
      
      // Only update results if not aborted
      if (!signal.aborted) {
        setAnalysisResults(results);
        setShowDocuments(false);
      }
    } catch (error) {
      // Don't show error if it was just aborted
      if (error.name !== 'AbortError') {
        console.error('Analysis error:', error);
        alert('Error during analysis: ' + error.message);
      } else {
        console.log('Analysis was cancelled by user');
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      abortControllerRef.current = null;
    }
  };

  const killAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div style={{ width: '80%', margin: '0 auto' }} className="p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Document Analysis Tool
        </h1>
        
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
            <div className="mt-4">
              <PDFUploader 
                onFileUpload={uploadDocuments}
                isProcessing={isProcessing}
                progress={progress}
                failedUploads={failedUploads}
                reprocessFailedUploads={() => {/* ... */}}
                isPaused={isPaused}
                onPause={pauseProcessing}
                onResume={resumeProcessing}
              />
            </div>
          )}
        </div>

        {documents.length > 0 && (
          <KeywordAnalyzer 
            documents={documents}
            onAnalyze={handleAnalyze}
          />
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

        {isAnalyzing && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center gap-4 max-w-md">
              <h3 className="text-lg font-semibold">Analyzing Documents</h3>
              <Loader progress={analysisProgress} />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Processing {Math.round(analysisProgress)}% complete...
              </p>
              <button
                onClick={killAnalysis}
                className="mt-2 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
              >
                <XCircle className="h-4 w-4" />
                Kill Analysis
              </button>
            </div>
          </div>
        )}
      </div>
      <MemoryMonitor />
    </div>
  );
}

export default App;