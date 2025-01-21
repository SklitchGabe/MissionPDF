import { useState, useCallback } from 'react';
import { parsePDF } from '../utils/pdfParser';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const processDocuments = useCallback(async (files) => {
    setIsProcessing(true);
    setError(null);
    console.log('Processing files:', files);

    try {
      const processedDocs = await Promise.all(
        files.map(async (file) => {
          console.log('Processing file:', file.name);
          const parsed = await parsePDF(file);
          console.log('Parsed content preview:', parsed.text.slice(0, 100));
          return {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            content: parsed.text,
            pageCount: parsed.pageCount,
            size: file.size,
            lastModified: file.lastModified
          };
        })
      );

      console.log('Processed documents:', processedDocs);
      setDocuments(prev => [...prev, ...processedDocs]);
    } catch (err) {
      setError(err.message);
      console.error('Error processing documents:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const removeDocument = useCallback((documentId) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  }, []);

  return {
    documents,
    isProcessing,
    error,
    processDocuments,
    removeDocument
  };
}