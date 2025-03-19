import React, { useState, useCallback, useRef } from 'react';
import { parsePDF } from '../utils/pdfParser';

// Reduced batch size for more frequent UI updates
const BATCH_SIZE = 3; 
// Add delay between batches to prevent browser lock-up
const BATCH_DELAY = 300; 

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
  const [isPaused, setIsPaused] = useState(false);
  const processingRef = useRef(false);
  const pendingFilesRef = useRef([]);

  const pauseProcessing = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeProcessing = useCallback(() => {
    setIsPaused(false);
    if (pendingFilesRef.current.length > 0 && !processingRef.current) {
      processBatch(pendingFilesRef.current, progress.processed);
    }
  }, [progress.processed]);

  const cleanupMemory = useCallback(() => {
    // Force garbage collection if possible (though JavaScript doesn't expose direct GC control)
    if (window.gc) {
      window.gc(); // Only works if browser is started with --expose-gc flag
    }
    
    // Clear any large objects that might be in memory
    if (window.performance && window.performance.memory) {
      console.log('Memory usage before cleanup:', window.performance.memory.usedJSHeapSize / 1048576, 'MB');
    }
  }, []);

  const processBatch = useCallback(async (files, startIndex) => {
    if (isPaused) {
      pendingFilesRef.current = files;
      return;
    }

    processingRef.current = true;
    const batchEnd = Math.min(startIndex + BATCH_SIZE, files.length);
    const currentBatch = files.slice(startIndex, batchEnd);

    try {
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
      
      // Update state with new documents - use functional update to avoid race conditions
      setDocuments(prev => [...prev, ...validDocs]);
      
      // Update progress
      setProgress(prev => ({
        ...prev,
        processed: prev.processed + currentBatch.length,
        totalProcessed: prev.totalProcessed + validDocs.length
      }));
      
      // Clean up memory after each batch
      cleanupMemory();

      // If we have more files to process, wait and then process the next batch
      if (batchEnd < files.length) {
        pendingFilesRef.current = files;
        
        // Add a delay between batches to let the browser breathe
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        
        // Check if we're still processing before continuing
        if (!isPaused) {
          await processBatch(files, batchEnd);
        }
      } else {
        processingRef.current = false;
        pendingFilesRef.current = [];
      }
    } catch (error) {
      console.error("Batch processing error:", error);
      setError(`Error processing files: ${error.message}`);
      processingRef.current = false;
    }
  }, [isPaused, cleanupMemory]);

  const uploadDocuments = useCallback(async (files) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress({
        processed: 0,
        total: files.length,
        totalProcessed: 0,
        totalUploaded: files.length
      });

      await processBatch(files, 0);
    } catch (err) {
      setError(`Failed to process documents: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [processBatch]);

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
    uploadDocuments,
    removeDocument,
    reprocessFailedUploads,
    isPaused,
    pauseProcessing,
    resumeProcessing
  };
}