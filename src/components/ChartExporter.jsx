import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom';
import Logger from '../utils/logger';

const ChartExporter = ({ analysisResults }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const prepareChartData = (results) => {
    if (!results || !Array.isArray(results)) {
      return [];
    }

    try {
      // Create a map of unique keyword configurations
      const uniqueConfigs = new Map();
      results.forEach(doc => {
        Object.entries(doc.keywords).forEach(([_, data]) => {
          const key = `${data.word}_${JSON.stringify(data.originalSettings)}`;
          if (!uniqueConfigs.has(key)) {
            uniqueConfigs.set(key, {
              keyword: data.word,
              settings: data.originalSettings,
              category: data.category
            });
          }
        });
      });

      return Array.from(uniqueConfigs.entries()).map(([key, config]) => {
        const data = results.map(doc => {
          const keywordData = Object.values(doc.keywords).find(data => 
            `${data.word}_${JSON.stringify(data.originalSettings)}` === key
          );

          return {
            documentName: doc.documentName,
            count: keywordData?.count || 0
          };
        })
        .sort((a, b) => b.count - a.count)
        .filter(item => item.count > 0);

        return {
          keyword: config.keyword,
          settings: config.settings,
          category: config.category,
          data
        };
      });
    } catch (error) {
      Logger.error('ChartExporter', 'Error in prepareChartData:', error);
      return [];
    }
  };

  const createSettingsSummary = (settings) => {
    const settingsDiv = document.createElement('div');
    settingsDiv.style.padding = '10px 20px';
    settingsDiv.style.marginTop = '10px';
    settingsDiv.style.borderTop = '1px solid #ccc';
    settingsDiv.style.fontSize = '10px';
    settingsDiv.style.color = '#000';
    settingsDiv.style.maxHeight = '200px';

    const title = document.createElement('div');
    title.style.fontSize = '12px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    title.innerText = 'Search Configuration Details';
    settingsDiv.appendChild(title);

    // Create grid container with three columns
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr 1fr';
    grid.style.gap = '12px';
    grid.style.width = '100%';

    // Left column - Keyword matching settings
    const leftColumn = document.createElement('div');
    
    // Basic Settings Section
    const basicSettings = document.createElement('div');
    basicSettings.style.marginBottom = '8px';
    
    const basicTitle = document.createElement('div');
    basicTitle.style.fontSize = '11px';
    basicTitle.style.fontWeight = 'bold';
    basicTitle.style.color = '#2563eb';
    basicTitle.style.marginBottom = '4px';
    basicTitle.innerText = 'Keyword Matching Settings';
    basicSettings.appendChild(basicTitle);

    basicSettings.innerHTML += `
      <div style="margin-bottom: 4px;">
        <div style="font-weight: bold;">Case Sensitivity: ${settings.caseSensitive ? 'Enabled' : 'Disabled'}</div>
        <div style="color: #666; font-size: 9px; margin-left: 8px;">
          ${settings.caseSensitive ? 
            'Matches must exactly match the uppercase/lowercase letters' : 
            'Matches can be found regardless of letter case'}
        </div>
      </div>
      <div style="margin-bottom: 4px;">
        <div style="font-weight: bold;">Exact Text Match: ${settings.useExactText ? 'Enabled' : 'Disabled'}</div>
        <div style="color: #666; font-size: 9px; margin-left: 8px;">
          ${settings.useExactText ? 
            'Finds exact character sequences, even within words' : 
            'Matches complete words only'}
        </div>
      </div>
    `;

    if (settings.useFuzzyMatch) {
      basicSettings.innerHTML += `
        <div style="margin-top: 4px;">
          <div style="font-weight: bold;">Fuzzy Matching: Enabled</div>
          <div style="color: #666; font-size: 9px; margin-left: 8px;">
            Similarity threshold: ${(settings.fuzzyMatchThreshold * 100).toFixed(0)}%
          </div>
        </div>
      `;
    }

    leftColumn.appendChild(basicSettings);

    // Middle column - Context Before settings
    const middleColumn = document.createElement('div');
    
    const contextBeforeTitle = document.createElement('div');
    contextBeforeTitle.style.fontSize = '11px';
    contextBeforeTitle.style.fontWeight = 'bold';
    contextBeforeTitle.style.color = '#2563eb';
    contextBeforeTitle.style.marginBottom = '4px';
    contextBeforeTitle.innerText = 'Context Requirements (Before)';
    middleColumn.appendChild(contextBeforeTitle);

    // Context Logic Type
    middleColumn.innerHTML += `
      <div style="margin-bottom: 4px;">
        <div style="font-weight: bold;">Context Logic: ${settings.contextLogicType}</div>
        <div style="color: #666; font-size: 9px; margin-left: 8px;">
          ${settings.contextLogicType === 'AND' ? 
            'Requires all context conditions to match' : 
            'Requires any context condition to match'}
        </div>
      </div>
    `;

    // Context Before Settings
    if (settings.contextBefore) {
      middleColumn.innerHTML += `
        <div style="margin-bottom: 4px;">
          <div style="font-weight: bold;">Words Before:</div>
          <div style="color: #666; font-size: 9px; margin-left: 8px; line-height: 1.2;">
            Terms: ${settings.contextBefore}<br>
            Range: ${settings.contextRangeBefore} words<br>
            ${settings.exactContextBefore ? 'Exact character matching' : 
              settings.fuzzyContextBefore ? 
              `Fuzzy matching (${(settings.fuzzyContextThresholdBefore * 100).toFixed(0)}% similarity)` : 
              'Whole word matching'}
          </div>
        </div>
      `;
    }

    // Right column - Context After settings
    const rightColumn = document.createElement('div');
    
    const contextAfterTitle = document.createElement('div');
    contextAfterTitle.style.fontSize = '11px';
    contextAfterTitle.style.fontWeight = 'bold';
    contextAfterTitle.style.color = '#2563eb';
    contextAfterTitle.style.marginBottom = '4px';
    contextAfterTitle.innerText = 'Context Requirements (After)';
    rightColumn.appendChild(contextAfterTitle);

    // Context After Settings
    if (settings.contextAfter) {
      rightColumn.innerHTML += `
        <div style="margin-bottom: 4px;">
          <div style="font-weight: bold;">Words After:</div>
          <div style="color: #666; font-size: 9px; margin-left: 8px; line-height: 1.2;">
            Terms: ${settings.contextAfter}<br>
            Range: ${settings.contextRangeAfter} words<br>
            ${settings.exactContextAfter ? 'Exact character matching' : 
              settings.fuzzyContextAfter ? 
              `Fuzzy matching (${(settings.fuzzyContextThresholdAfter * 100).toFixed(0)}% similarity)` : 
              'Whole word matching'}
          </div>
        </div>
      `;
    }

    if (!settings.contextBefore && !settings.contextAfter) {
      middleColumn.innerHTML += `
        <div style="color: #666; font-size: 9px;">
          No specific context requirements set
        </div>
      `;
    }

    // Add columns to grid
    grid.appendChild(leftColumn);
    grid.appendChild(middleColumn);
    grid.appendChild(rightColumn);
    settingsDiv.appendChild(grid);

    return settingsDiv;
  };

  const downloadCharts = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const chartData = prepareChartData(analysisResults);
      if (chartData.length === 0) {
        throw new Error('No chart data available');
      }

      setProgress({ current: 0, total: chartData.length });

      // Create temporary container
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < chartData.length; i++) {
        setProgress(prev => ({ ...prev, current: i + 1 }));

        const chartContainer = document.createElement('div');
        chartContainer.style.width = '1200px';
        chartContainer.style.height = '700px';
        chartContainer.style.backgroundColor = 'white';
        chartContainer.style.padding = '20px';
        tempContainer.appendChild(chartContainer);

        // Add title
        const titleDiv = document.createElement('div');
        titleDiv.style.fontSize = '24px';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.textAlign = 'center';
        titleDiv.style.marginBottom = '20px';
        titleDiv.style.color = '#000';
        titleDiv.innerText = `Frequency Distribution: "${chartData[i].keyword}"`;
        chartContainer.appendChild(titleDiv);

        // Chart container
        const chartDiv = document.createElement('div');
        chartDiv.style.width = '100%';
        chartDiv.style.height = 'calc(100% - 250px)';
        chartContainer.appendChild(chartDiv);

        // Settings summary
        const settingsDiv = createSettingsSummary(chartData[i].settings);
        chartContainer.appendChild(settingsDiv);

        // Render chart
        const chart = (
          <BarChart
            width={1160}
            height={480}
            data={chartData[i].data}
            margin={{
              top: 20,
              right: 30,
              left: 150,
              bottom: 140
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="documentName"
              interval={0}
              angle={-45}
              textAnchor="end"
              height={130}
              tick={{
                fontSize: 8,
                dy: 8,
                dx: -8
              }}
              tickFormatter={(value) => {
                return value.length > 30 ? value.substring(0, 27) + '...' : value;
              }}
            />
            <YAxis
              label={{ 
                value: 'Number of Matches',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
              tick={{ fontSize: 10 }}
            />
            <Tooltip 
              formatter={(value, name, props) => [value, 'Matches']}
              labelFormatter={(label) => `Document: ${label}`}
            />
            <Bar
              dataKey="count"
              fill="#2563eb"
              name="Matches"
            />
          </BarChart>
        );

        const root = document.createElement('div');
        chartDiv.appendChild(root);
        ReactDOM.render(chart, root);

        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          const canvas = await html2canvas(chartContainer, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
          });

          const imgData = canvas.toDataURL('image/jpeg', 1.0);

          if (i > 0) {
            pdf.addPage();
          }

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

          // Cleanup
          chartDiv.removeChild(root);
          chartContainer.remove();

        } catch (error) {
          Logger.error('ChartExporter', `Error processing chart ${i + 1}:`, error);
          throw new Error(`Failed to process chart ${i + 1}: ${error.message}`);
        }
      }

      document.body.removeChild(tempContainer);
      pdf.save('keyword-frequency-charts.pdf');
      Logger.info('ChartExporter', 'Charts exported successfully');

    } catch (error) {
      Logger.error('ChartExporter', 'Error generating charts:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Frequency Charts
        </h3>
        <div className="flex items-center gap-4">
          {isGenerating && (
            <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400">
              <Loader className="h-5 w-5 animate-spin" />
              <span className="text-lg">
                Generating charts ({progress.current} of {progress.total})...
              </span>
            </div>
          )}
          {error && (
            <div className="text-red-500 dark:text-red-400 text-lg">
              {error}
            </div>
          )}
          <button
            onClick={downloadCharts}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-lg ${
              isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            <Download className="h-5 w-5" />
            {isGenerating ? 'Generating...' : 'Download Charts'}
          </button>
        </div>
      </div>

      {/* Preview Charts */}
      <div className="mt-8 space-y-12 max-h-[75vh] overflow-y-auto p-6">
        {prepareChartData(analysisResults).map((chartItem, index) => (
          <div 
            key={`${chartItem.keyword}-${index}`}
            className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg"
          >
            <h4 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
              Frequency Distribution: "{chartItem.keyword}"
            </h4>
            
            {/* Chart with optimized dimensions for many data points */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[1500px]"> {/* Increased minimum width */}
                <BarChart
                  width={1500}  // Increased width
                  height={700}  // Increased height
                  data={chartItem.data}
                  margin={{
                    top: 30,
                    right: 40,
                    left: 120,
                    bottom: 200  // Increased bottom margin for labels
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="documentName"
                    interval={0}  // Show all labels
                    angle={-60}  // More vertical angle for better stacking
                    textAnchor="end"
                    height={180}  // Increased height for labels
                    tick={{
                      fontSize: 10,  // Smaller font
                      dy: 0,
                      dx: 0
                    }}
                    tickFormatter={(value) => {
                      // Show more of the filename but remove common extensions
                      const withoutExtension = value.replace(/\.(pdf|doc|docx|txt)$/i, '');
                      return withoutExtension.length > 20 ? 
                        withoutExtension.substring(0, 17) + '...' : 
                        withoutExtension;
                    }}
                  />
                  <YAxis
                    label={{ 
                      value: 'Number of Matches',
                      angle: -90,
                      position: 'insideLeft',
                      style: { 
                        textAnchor: 'middle',
                        fontSize: 14,
                        fontWeight: 500
                      }
                    }}
                    tick={{ 
                      fontSize: 12,
                      fontWeight: 500
                    }}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => [value, 'Matches']}
                    labelFormatter={(label) => `Document: ${label}`}
                    contentStyle={{
                      fontSize: '12px',
                      padding: '8px'
                    }}
                    wrapperStyle={{
                      zIndex: 1000
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#2563eb"
                    name="Matches"
                    // Make bars thinner to prevent overlap
                    barSize={15}
                  />
                </BarChart>
              </div>
            </div>

            {/* Settings Summary - Same as before */}
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
              <h5 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Search Configuration
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h6 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-3">
                    Basic Matching Settings
                  </h6>
                  <div className="space-y-3 text-base text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="font-medium">Case Sensitivity: </span>
                      {chartItem.settings.caseSensitive ? 'Enabled' : 'Disabled'}
                    </div>
                    <div>
                      <span className="font-medium">Exact Text Match: </span>
                      {chartItem.settings.useExactText ? 'Enabled' : 'Disabled'}
                    </div>
                    {chartItem.settings.useFuzzyMatch && (
                      <div>
                        <span className="font-medium">Similarity Threshold: </span>
                        {(chartItem.settings.fuzzyMatchThreshold * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h6 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-3">
                    Context Requirements
                  </h6>
                  <div className="space-y-3 text-base text-gray-700 dark:text-gray-300">
                    {chartItem.settings.contextBefore && (
                      <div>
                        <span className="font-medium">Required Words Before: </span>
                        {chartItem.settings.contextBefore}
                      </div>
                    )}
                    {chartItem.settings.contextAfter && (
                      <div>
                        <span className="font-medium">Required Words After: </span>
                        {chartItem.settings.contextAfter}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Search Range: </span>
                      {chartItem.settings.contextRange} words
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default ChartExporter;