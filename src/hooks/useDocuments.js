import { useState, useCallback } from 'react';
import { parsePDF } from '../utils/pdfParser';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const processDocuments = useCallback(async (files) => {
    setIsProcessing(true);
    setError(null);

    try {
      const processedDocs = await Promise.all(
        files.map(async (file) => {
          const parsed = await parsePDF(file);
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