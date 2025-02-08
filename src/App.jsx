import { useState } from 'react';
import PDFUploader from './components/PDFUploader';
import TextViewer from './components/TextViewer';
import KeywordAnalyzer from './components/KeywordAnalyzer';
import AnalysisResults from './components/AnalysisResults';
import SimpleLoader from './components/Loader';
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
    removeDocument,
    failedUploads,
    reprocessFailedUploads
  } = useDocuments();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showDocuments, setShowDocuments] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const handleFileUpload = async (files) => {
    console.log('Files received:', files);
    await processDocuments(files);
    console.log('Documents after processing:', documents);
  };

  const handleAnalyze = async (keywords, globalSettings) => {
    try {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      
      const totalWork = documents.length * keywords.length;
      let completedWork = 0;
  
      const updateProgress = () => {
        completedWork++;
        const currentProgress = (completedWork / totalWork) * 100;
        setAnalysisProgress(currentProgress);
      };
  
      const results = await analyzeText(documents, keywords, globalSettings, updateProgress);
      setAnalysisResults(results);
      setShowDocuments(false);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Error during analysis: ' + error.message);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                onFileUpload={handleFileUpload} 
                isProcessing={isProcessing}
                progress={progress}
                failedUploads={failedUploads}
                reprocessFailedUploads={reprocessFailedUploads}
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
          <SimpleLoader progress={analysisProgress} />
        )}
      </div>
    </div>
  );
}

export default App;