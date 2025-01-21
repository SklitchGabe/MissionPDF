import React from 'react';
import { X } from 'lucide-react';

const TextViewer = ({ document, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative h-[90vh] w-[90vw] rounded-lg bg-white dark:bg-gray-800 p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {document.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-slate-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="h-[calc(90vh-8rem)] overflow-auto rounded-lg bg-slate-50 dark:bg-gray-900 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 dark:text-gray-200">
            {document.content}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TextViewer;