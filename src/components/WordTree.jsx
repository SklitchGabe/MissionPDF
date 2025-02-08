import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';

const WordTree = ({ analysisResults, keyword, onClose }) => {
  const [selectedDoc, setSelectedDoc] = useState('all');
  const [zoom, setZoom] = useState(1);
  const [treeData, setTreeData] = useState(null);
  const [wordRange, setWordRange] = useState(5);
  const [showCount, setShowCount] = useState(100);
  const [hoveredLine, setHoveredLine] = useState(null);
  const containerRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (containerRef.current) {
      setViewportHeight(containerRef.current.clientHeight);
    }
  }, []);

  useEffect(() => {
    if (!keyword || !analysisResults?.length) return;

    const extractWordTreeData = () => {
      const flows = {
        instances: [],
        documentFlows: {}
      };

      analysisResults.forEach(doc => {
        flows.documentFlows[doc.documentId] = {
          instances: [],
          documentName: doc.documentName
        };

        Object.values(doc.keywords).forEach(keywordData => {
          if (keywordData.word === keyword && keywordData.matches) {
            keywordData.matches.forEach(match => {
              const beforeWords = match.wordsBefore?.split(/\s+/).filter(w => w && w.length > 0) || [];
              const afterWords = match.wordsAfter?.split(/\s+/).filter(w => w && w.length > 0) || [];

              const instance = {
                before: beforeWords.slice(-wordRange).join(' '),
                after: afterWords.slice(0, wordRange).join(' '),
                term: match.term || keyword,
                position: match.position,
                documentId: doc.documentId,
                documentName: doc.documentName,
                fullContext: `${beforeWords.slice(-wordRange).join(' ')} ${match.term || keyword} ${afterWords.slice(0, wordRange).join(' ')}`
              };

              flows.instances.push(instance);
              flows.documentFlows[doc.documentId].instances.push(instance);
            });
          }
        });
      });

      setTreeData(flows);
    };

    extractWordTreeData();
  }, [analysisResults, keyword, wordRange]);

  const renderTree = () => {
    if (!treeData) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">
            Processing data...
          </p>
        </div>
      );
    }

    const instances = selectedDoc === 'all' ? 
      treeData.instances : 
      treeData.documentFlows[selectedDoc]?.instances || [];

    if (instances.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">
            No validated matches found for "{keyword}"
          </p>
        </div>
      );
    }

    const sortedInstances = [...instances].sort((a, b) => 
      (a.before || '').localeCompare(b.before || '')
    );
    const visibleInstances = sortedInstances.slice(0, showCount);

    const width = containerRef.current?.clientWidth || 800;
    const lineHeight = 24;
    const totalHeight = Math.max(viewportHeight, visibleInstances.length * lineHeight + 100);
    const lineWidth = 60;
    const textOffset = 70;
    const centerX = width / 2;
    const contentStartY = 60;

    // Helper function to render text with highlighted keyword
    const renderContextText = (text, isHovered) => {
      if (!isHovered) return text;

      const parts = text.split(new RegExp(`(${keyword})`, 'i'));
      return parts.map((part, index) => {
        if (part.toLowerCase() === keyword.toLowerCase()) {
          return (
            <tspan key={index} className="fill-blue-600 dark:fill-blue-400 font-bold">
              {part}
            </tspan>
          );
        }
        return <tspan key={index}>{part}</tspan>;
      });
    };

    return (
      <div className="w-full h-full overflow-y-auto overflow-x-hidden">
        <svg 
          width={width}
          height={totalHeight}
          className="transform-gpu"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <text
            x={centerX}
            y={30}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-400 text-sm"
          >
            Showing {visibleInstances.length} of {instances.length} matches
          </text>

          <text
            x={centerX}
            y={contentStartY - 10}
            textAnchor="middle"
            alignmentBaseline="middle"
            className="fill-blue-600 dark:fill-blue-400 font-bold text-lg"
          >
            {keyword}
          </text>

          {visibleInstances.map((_, index) => {
            const y = contentStartY + (index * lineHeight);
            return (
              <g key={`lines-${index}`}>
                <line 
                  x1={centerX - lineWidth} 
                  x2={centerX}
                  y1={y}
                  y2={y}
                  className="stroke-gray-200 dark:stroke-gray-700"
                  strokeWidth={1}
                />
                <line 
                  x1={centerX}
                  x2={centerX + lineWidth} 
                  y1={y}
                  y2={y}
                  className="stroke-gray-200 dark:stroke-gray-700"
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {visibleInstances.map((instance, index) => {
            const y = contentStartY + (index * lineHeight);
            const uniqueId = `${instance.documentId}-${instance.position}-${index}`;
            const isHovered = hoveredLine === uniqueId;

            return (
              <g 
                key={uniqueId}
                onMouseEnter={() => setHoveredLine(uniqueId)}
                onMouseLeave={() => setHoveredLine(null)}
                className="opacity-90 hover:opacity-100 transition-opacity"
              >
                {!isHovered ? (
                  <>
                    <text 
                      x={centerX - textOffset}
                      y={y} 
                      textAnchor="end"
                      alignmentBaseline="middle"
                      className="fill-gray-600 dark:fill-gray-300 text-sm font-medium"
                    >
                      {instance.before || ''}
                    </text>

                    <text 
                      x={centerX + textOffset}
                      y={y}
                      textAnchor="start"
                      alignmentBaseline="middle"
                      className="fill-gray-600 dark:fill-gray-300 text-sm font-medium"
                    >
                      {instance.after || ''}
                    </text>
                  </>
                ) : (
                  <text 
                    x={centerX}
                    y={y}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    className="fill-gray-600 dark:fill-gray-300 text-sm font-medium"
                  >
                    {renderContextText(instance.fullContext, true)}
                  </text>
                )}

                {isHovered && (
                  <text
                    x={centerX + 300}
                    y={y}
                    textAnchor="start"
                    alignmentBaseline="middle"
                    className="fill-blue-500 dark:fill-blue-400 text-xs font-medium"
                  >
                    {instance.documentName}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {showCount < instances.length && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => setShowCount(prev => prev + 50)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Load More Results
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative h-[90vh] w-[90vw] bg-white dark:bg-gray-800 rounded-lg p-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Word Tree: "{keyword}"
          </h2>
          
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Words to Show
              </label>
              <input
                type="number"
                value={wordRange}
                onChange={(e) => setWordRange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 p-1 rounded border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1"
                max="20"
              />
            </div>

            <select
              value={selectedDoc}
              onChange={(e) => {
                setSelectedDoc(e.target.value);
                setShowCount(100);
              }}
              className="p-2 rounded-md border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Documents</option>
              {analysisResults.map(doc => (
                <option key={doc.documentId} value={doc.documentId}>
                  {doc.documentName}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ZoomOut className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <RefreshCcw className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ZoomIn className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="h-[calc(90vh-6rem)] bg-white dark:bg-gray-800 rounded-lg overflow-hidden"
        >
          {renderTree()}
        </div>
      </div>
    </div>
  );
};

export default WordTree;