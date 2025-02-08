import React, { useState, useEffect } from 'react';
import 'ldrs/superballs';
import 'ldrs/quantum';
import 'ldrs/grid';

const SimpleLoader = ({ progress }) => {
  const [currentLoader, setCurrentLoader] = useState(0);

  useEffect(() => {
    // Change loaders based on progress thresholds
    if (progress >= 66.67) {
      setCurrentLoader(2); // grid
    } else if (progress >= 33.33) {
      setCurrentLoader(1); // quantum
    } else {
      setCurrentLoader(0); // superballs
    }
  }, [progress]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl flex flex-col items-center">
        <div className="mb-4">
          {currentLoader === 0 && (
            <l-superballs
              size="40"
              speed="1.4"
              color="rgb(37, 99, 235)"
            ></l-superballs>
          )}
          {currentLoader === 1 && (
            <l-quantum
              size="45"
              speed="1.75"
              color="rgb(37, 99, 235)"
            ></l-quantum>
          )}
          {currentLoader === 2 && (
            <l-grid
              size="60"
              speed="1.5"
              color="rgb(37, 99, 235)"
            ></l-grid>
          )}
        </div>
        <div className="text-gray-700 dark:text-gray-300 text-center">
          <div className="text-lg font-semibold mb-2">
            Analyzing Documents
          </div>
          <div className="text-sm">
            Progress: {Math.round(progress)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoader;