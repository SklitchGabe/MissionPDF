import { useState } from 'react';
import PDFUploader from './components/PDFUploader';
import TextViewer from './components/TextViewer';
import { useDocuments } from './hooks/useDocuments';

function App() {
  const {
    documents,
    isProcessing,
    error,
    processDocuments,
    removeDocument
  } = useDocuments();
  const [selectedDocument, setSelectedDocument] = useState(null);

  const handleFileUpload = async (files) => {
    await processDocuments(files);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Document Analysis Tool
        </h1>
        
        <PDFUploader onFileUpload={handleFileUpload} />
        
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
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Processed Documents
            </h2>
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

        {selectedDocument && (
          <TextViewer
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;