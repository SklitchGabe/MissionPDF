import React, { useState, useCallback } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';

const PDFUploader = ({ onFileUpload, isProcessing, progress }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [warning, setWarning] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((files) => {
    // 200MB per file
    const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
    // 2GB total
    const MAX_TOTAL_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

    const pdfFiles = Array.from(files).filter(file => 
      file.type === 'application/pdf'
    );

    if (pdfFiles.length === 0) {
      setWarning('Please upload PDF files only');
      return;
    }

    // Check individual file sizes
    const largeFiles = pdfFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (largeFiles.length > 0) {
      setWarning(`${largeFiles.length} files exceed 200MB size limit`);
      return;
    }

    // Check total size
    const totalSize = pdfFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      setWarning('Total upload size exceeds 2GB limit');
      return;
    }

    setUploadedFiles(prev => [...prev, ...pdfFiles]);
    setWarning(null);
    onFileUpload(pdfFiles);
}, [onFileUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = useCallback((e) => {
    processFiles(e.target.files);
  }, [processFiles]);

  const removeFile = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600'
        } dark:bg-gray-800`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isProcessing ? (
            `Processing: ${progress.processed} of ${progress.total} files`
          ) : (
            <>
              Drag and drop PDF files here, or
              <label className="mx-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
                browse
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf"
                  onChange={handleFileInput}
                  disabled={isProcessing}
                />
              </label>
            </>
          )}
        </p>
        
        {warning && (
          <div className="mt-2 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm">{warning}</span>
          </div>
        )}

        {isProcessing && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Uploaded Files:
          </h3>
          <div className="max-h-60 overflow-auto">
            <ul className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <span className="truncate text-gray-900 dark:text-white mr-4">
                    {file.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    {!isProcessing && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;