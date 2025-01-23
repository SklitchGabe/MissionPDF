import { useState, useCallback } from 'react';
import { parsePDF } from '../utils/pdfParser';

const BATCH_SIZE = 5; // Process 5 PDFs at a time

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [error, setError] = useState(null);

  const processBatch = async (files, startIndex) => {
    const batchEnd = Math.min(startIndex + BATCH_SIZE, files.length);
    const currentBatch = files.slice(startIndex, batchEnd);

    const processedDocs = await Promise.all(
      currentBatch.map(async (file) => {
        try {
          const parsed = await parsePDF(file);
          return {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            content: parsed.text,
            pageCount: parsed.pageCount,
            size: file.size,
            lastModified: file.lastModified
          };
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          return null;
        }
      })
    );

    // Filter out failed documents
    const validDocs = processedDocs.filter(doc => doc !== null);
    
    // Update state with new documents
    setDocuments(prev => [...prev, ...validDocs]);
    
    // Update progress
    setProgress(prev => ({
      ...prev,
      processed: prev.processed + currentBatch.length
    }));

    // Process next batch if there are more files
    if (batchEnd < files.length) {
      await processBatch(files, batchEnd);
    }
  };

  const processDocuments = useCallback(async (files) => {
    setIsProcessing(true);
    setError(null);
    setProgress({ processed: 0, total: files.length });

    try {
      await processBatch(files, 0);
    } catch (err) {
      setError(err.message);
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
    progress,
    error,
    processDocuments,
    removeDocument
  };
}