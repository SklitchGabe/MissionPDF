import React, { useState, useCallback, useRef, useEffect } from 'react';
import { parsePDF } from '../utils/pdfParser';

// Further reduce batch size for very large uploads
const BATCH_SIZE = 2;
// Increase delay between batches
const BATCH_DELAY = 500;
// Limit for text storage per document (for very large documents)
const MAX_TEXT_LENGTH = 1000000; // ~1MB of text

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [documentTexts, setDocumentTexts] = useState({}); // Store texts separately
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

  // Clear documents when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any large objects
      setDocumentTexts({});
    };
  }, []);

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
    // Force garbage collection hint
    if (window.gc) {
      window.gc();
    }
    
    // Log memory usage if available
    if (window.performance && window.performance.memory) {
      console.log('Memory usage:', 
        (window.performance.memory.usedJSHeapSize / 1048576).toFixed(2), 'MB / ',
        (window.performance.memory.jsHeapSizeLimit / 1048576).toFixed(2), 'MB');
    }
    
    // Create pressure for garbage collection
    const pressure = [];
    setTimeout(() => pressure.length = 0, 0);
  }, []);

  // Truncate text if needed to save memory
  const processDocumentText = useCallback((text) => {
    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`Truncating document text from ${text.length} to ${MAX_TEXT_LENGTH} characters`);
      return text.substring(0, MAX_TEXT_LENGTH) + 
        `... [Content truncated. Original length: ${text.length} characters]`;
    }
    return text;
  }, []);

  // Process a document with memory management
  const processDocument = useCallback(async (file) => {
    try {
      const parsed = await parsePDF(file);
      const id = `${file.name}-${Date.now()}`;
      
      // Store document metadata separate from content
      const docMeta = {
        id,
        name: file.name,
        pageCount: parsed.pageCount,
        size: file.size,
        lastModified: file.lastModified,
        hasFullText: parsed.text.length <= MAX_TEXT_LENGTH
      };
      
      // Store text separately to allow GC to manage memory better
      setDocumentTexts(prev => ({
        ...prev,
        [id]: processDocumentText(parsed.text)
      }));
      
      return docMeta;
    } catch (err) {
      console.error(`Error processing ${file.name}:`, err);
      setFailedUploads(prev => [...prev, file]);
      return null;
    }
  }, [processDocumentText]);

  // Get document text (on-demand retrieval)
  const getDocumentText = useCallback((docId) => {
    return documentTexts[docId] || '';
  }, [documentTexts]);

  const processBatch = useCallback(async (files, startIndex) => {
    if (isPaused) {
      pendingFilesRef.current = files;
      return;
    }

    processingRef.current = true;
    const batchEnd = Math.min(startIndex + BATCH_SIZE, files.length);
    const currentBatch = files.slice(startIndex, batchEnd);

    try {
      // Process one document at a time instead of Promise.all to reduce peak memory usage
      const validDocs = [];
      for (const file of currentBatch) {
        const doc = await processDocument(file);
        if (doc) validDocs.push(doc);
        
        // Allow browser to breathe between individual files
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Update state with new documents
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
        pendingFilesRef.current = files.slice(batchEnd);
        
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
  }, [isPaused, cleanupMemory, processDocument]);

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
    resumeProcessing,
    getDocumentText // Expose method to get text on demand
  };
}