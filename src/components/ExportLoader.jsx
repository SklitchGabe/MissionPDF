import React from 'react';
import { Loader2 } from 'lucide-react';

const ExportLoader = ({ message, error = null }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-[9999]">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center gap-4 max-w-md">
      {error ? (
        <>
          <div className="text-red-500 font-semibold">Error</div>
          <div className="text-gray-700 dark:text-gray-300 text-center">{error}</div>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <div className="text-gray-700 dark:text-gray-300 text-center">
            {message}
          </div>
        </>
      )}
    </div>
  </div>
);

export default ExportLoader;