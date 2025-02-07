import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';

const WordTree = ({ analysisResults, keyword, onClose }) => {
  const [selectedDoc, setSelectedDoc] = useState('all');
  const [zoom, setZoom] = useState(1);
  const [treeData, setTreeData] = useState(null);
  const [wordRange, setWordRange] = useState(5);
  const [showCount, setShowCount] = useState(50);
  const [hoveredLine, setHoveredLine] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (!keyword || !analysisResults?.length) return;

    const extractWordTreeData = () => {
      const flows = {
        instances: [],
        documentFlows: {}
      };

      analysisResults.forEach(doc => {
        // Initialize document flows
        flows.documentFlows[doc.id] = {
          instances: [],
          documentName: doc.documentName
        };

        // Get matches for this keyword from analysis results
        const keywordData = doc.keywords[keyword];
        if (!keywordData || !keywordData.matches) return;

        // Process each validated match
        keywordData.matches.forEach(match => {
          // Split the surrounding context into words
          const beforeWords = match.wordsBefore.split(/\s+/).filter(w => w.length > 0);
          const afterWords = match.wordsAfter.split(/\s+/).filter(w => w.length > 0);

          // Create instance with the actual matched term and its context
          const instance = {
            before: beforeWords.slice(-wordRange).join(' '),
            after: afterWords.slice(0, wordRange).join(' '),
            term: match.term,
            position: match.position,
            documentId: doc.documentId,
            documentName: doc.documentName
          };

          flows.instances.push(instance);
          flows.documentFlows[doc.id].instances.push(instance);
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

    const sortedInstances = [...instances].sort((a, b) => a.before.localeCompare(b.before));
    const visibleInstances = sortedInstances.slice(0, showCount);

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    const centerX = width / 2;
    const centerY = height / 2;

    const lineHeight = 24;
    const totalHeight = visibleInstances.length * lineHeight;
    const startY = -totalHeight / 2;
    const lineWidth = 300;
    const textOffset = 40;

    return (
      <svg 
        width="100%" 
        height="100%" 
        className="transform-gpu"
        style={{ transform: `scale(${zoom})` }}
      >
        <g transform={`translate(${centerX}, ${centerY})`}>
          {visibleInstances.map((instance, index) => {
            const y = startY + (index * lineHeight);
            const uniqueId = `${instance.documentId}-${instance.position}`;

            return (
              <g 
                key={uniqueId}
                onMouseEnter={() => setHoveredLine(uniqueId)}
                onMouseLeave={() => setHoveredLine(null)}
                className="opacity-90 hover:opacity-100 transition-opacity"
              >
                {/* Before text */}
                <text 
                  x={-textOffset}
                  y={y} 
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="fill-gray-600 dark:fill-gray-300 text-sm font-medium"
                >
                  {instance.before}
                </text>

                {/* Lines */}
                <line 
                  x1={-lineWidth} 
                  x2="0"
                  y1={y}
                  y2={y}
                  className="stroke-gray-300 dark:stroke-gray-600"
                  strokeWidth={1}
                />
                <line 
                  x1="0"
                  x2={lineWidth} 
                  y1={y}
                  y2={y}
                  className="stroke-gray-300 dark:stroke-gray-600"
                  strokeWidth={1}
                />

                {/* After text */}
                <text 
                  x={textOffset}
                  y={y}
                  textAnchor="start"
                  alignmentBaseline="middle"
                  className="fill-gray-600 dark:fill-gray-300 text-sm font-medium"
                >
                  {instance.after}
                </text>

                {/* Document name (visible on hover) */}
                {hoveredLine === uniqueId && (
                  <text
                    x={lineWidth + 30}
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

          {/* Central keyword */}
          <text
            x="0"
            y={0}
            textAnchor="middle"
            alignmentBaseline="middle"
            className="fill-blue-600 dark:fill-blue-400 font-bold text-lg"
          >
            {keyword}
          </text>

          {/* Total count indicator */}
          <text
            x="0"
            y={-totalHeight/2 - 20}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-400 text-sm"
          >
            Showing {visibleInstances.length} of {instances.length} matches
          </text>
        </g>
      </svg>
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
                setShowCount(50);
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