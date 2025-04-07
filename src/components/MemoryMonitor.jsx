import React, { useState, useEffect } from 'react';

const MemoryMonitor = () => {
  const [memoryUsage, setMemoryUsage] = useState(null);
  
  useEffect(() => {
    // Only works in Chrome with performance memory API
    if (window.performance && window.performance.memory) {
      const updateMemory = () => {
        const { usedJSHeapSize, jsHeapSizeLimit } = window.performance.memory;
        const used = (usedJSHeapSize / 1024 / 1024).toFixed(1);
        const total = (jsHeapSizeLimit / 1024 / 1024).toFixed(1);
        const percentage = ((usedJSHeapSize / jsHeapSizeLimit) * 100).toFixed(1);
        
        setMemoryUsage({ used, total, percentage });
      };
      
      updateMemory();
      const interval = setInterval(updateMemory, 2000);
      
      return () => clearInterval(interval);
    }
  }, []);
  
  if (!memoryUsage) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 text-xs opacity-70 hover:opacity-100 transition-opacity">
      <div className="text-gray-600 dark:text-gray-300">
        Memory: {memoryUsage.used}MB / {memoryUsage.total}MB ({memoryUsage.percentage}%)
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
        <div 
          className={`h-1.5 rounded-full ${
            parseFloat(memoryUsage.percentage) > 80 
              ? 'bg-red-500' 
              : parseFloat(memoryUsage.percentage) > 60 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
          }`}
          style={{ width: `${memoryUsage.percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default MemoryMonitor; 