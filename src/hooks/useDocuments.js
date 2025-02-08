import React, { useState, useCallback } from 'react';
import { parsePDF } from '../utils/pdfParser';

const BATCH_SIZE = 5; // Process 5 PDFs at a time

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ 
    processed: 0,
    total: 0,
    totalProcessed: 0,
    totalUploaded: 0
  });
  const [error, setError] = useState(null);
  const [failedUploads, setFailedUploads] = useState([]);

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
          setFailedUploads(prev => [...prev, file]);
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
      processed: prev.processed + currentBatch.length,
      totalProcessed: prev.totalProcessed + validDocs.length
    }));

    // Process next batch if there are more files
    if (batchEnd < files.length) {
      await processBatch(files, batchEnd);
    }
  };

  const processDocuments = useCallback(async (files) => {
    setIsProcessing(true);
    setError(null);
    setProgress(prev => ({ 
      processed: 0,
      total: files.length,
      totalProcessed: prev.totalProcessed,
      totalUploaded: prev.totalUploaded + files.length
    }));

    try {
      await processBatch(files, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const removeDocument = useCallback((documentId) => {
    setDocuments(prev => {
      const newDocs = prev.filter(doc => doc.id !== documentId);
      setProgress(prev => ({
        ...prev,
        totalProcessed: Math.max(0, prev.totalProcessed - 1),
        totalUploaded: Math.max(0, prev.totalUploaded - 1)
      }));
      return newDocs;
    });
  }, []);

  const reprocessFailedUploads = useCallback(async () => {
    if (failedUploads.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      await processBatch(failedUploads, 0);
      setFailedUploads([]); // Clear the failed uploads after successful reprocessing
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [failedUploads]);

  return {
    documents,
    isProcessing,
    progress,
    error,
    failedUploads,
    processDocuments,
    removeDocument,
    reprocessFailedUploads
  };
}