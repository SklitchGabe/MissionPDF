import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

const PDFUploader = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((files) => {
    const pdfFiles = Array.from(files).filter(file => 
      file.type === 'application/pdf'
    );

    if (pdfFiles.length === 0) {
      alert('Please upload PDF files only');
      return;
    }

    setUploadedFiles(prev => [...prev, ...pdfFiles]);
    onFileUpload && onFileUpload(pdfFiles);
  }, [onFileUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    processFiles(files);
  }, [processFiles]);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    processFiles(files);
  }, [processFiles]);

  const removeFile = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
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
          Drag and drop PDF files here, or
          <label className="mx-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
            browse
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf"
              onChange={handleFileInput}
            />
          </label>
        </p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Uploaded Files:
          </h3>
          <ul className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <span className="truncate text-gray-900 dark:text-white">
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;