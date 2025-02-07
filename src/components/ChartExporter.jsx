import React, { useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom';

const ChartExporter = ({ analysisResults }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const prepareChartData = (results) => {
    try {
      const keywords = new Set();
      results.forEach(doc => {
        Object.keys(doc.keywords).forEach(keyword => keywords.add(keyword));
      });

      return Array.from(keywords).map(keyword => {
        // Find the keyword settings from any document that has it
        const keywordSettings = results.find(doc => doc.keywords[keyword])?.keywords[keyword];
        const originalSettings = analysisResults.find(doc => 
          doc.keywords[keyword] && doc.keywords[keyword].originalSettings
        )?.keywords[keyword].originalSettings;

        const data = results.map(doc => ({
          documentName: doc.documentName,
          count: doc.keywords[keyword]?.count || 0
        }))
        .sort((a, b) => b.count - a.count)
        .filter(item => item.count > 0);

        return {
          keyword,
          data,
          settings: originalSettings || {} // Include the original search settings
        };
      });
    } catch (error) {
      console.error('Error in prepareChartData:', error);
      throw new Error('Failed to prepare chart data: ' + error.message);
    }
  };

  const createSettingsSummary = (settings) => {
    const settingsDiv = document.createElement('div');
    settingsDiv.style.padding = '10px 20px';
    settingsDiv.style.marginTop = '10px';
    settingsDiv.style.borderTop = '1px solid #ccc';
    settingsDiv.style.fontSize = '10px'; // Slightly smaller font
    settingsDiv.style.color = '#000';
    settingsDiv.style.maxHeight = '200px'; // Control maximum height

    const title = document.createElement('div');
    title.style.fontSize = '12px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    title.innerText = 'Search Configuration Details';
    settingsDiv.appendChild(title);

    // Create two-column layout
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr';
    grid.style.gap = '15px';
    grid.style.width = '100%';

    // Create left column (Basic and Fuzzy settings)
    const leftColumn = document.createElement('div');
    
    // Basic Settings Section
    const basicSettings = document.createElement('div');
    basicSettings.style.marginBottom = '10px';
    
    const basicTitle = document.createElement('div');
    basicTitle.style.fontSize = '11px';
    basicTitle.style.fontWeight = 'bold';
    basicTitle.style.color = '#2563eb';
    basicTitle.style.marginBottom = '5px';
    basicTitle.innerText = 'Basic Matching Settings';
    basicSettings.appendChild(basicTitle);

    // Add Case Sensitivity setting
    const caseSetting = document.createElement('div');
    caseSetting.style.marginBottom = '5px';
    caseSetting.innerHTML = `
      <div style="font-weight: bold;">Case Sensitivity: ${settings.caseSensitive ? 'Enabled' : 'Disabled'}</div>
      <div style="color: #666; font-size: 9px; margin-left: 8px;">
        ${settings.caseSensitive 
          ? 'Matches must exactly match the uppercase/lowercase letters'
          : 'Matches can be found regardless of letter case'}
      </div>
    `;
    basicSettings.appendChild(caseSetting);

    // Add Exact Text setting
    const exactSetting = document.createElement('div');
    exactSetting.style.marginBottom = '5px';
    exactSetting.innerHTML = `
      <div style="font-weight: bold;">Exact Text Match: ${settings.useExactText ? 'Enabled' : 'Disabled'}</div>
      <div style="color: #666; font-size: 9px; margin-left: 8px;">
        ${settings.useExactText 
          ? 'Finds exact character sequences, even within words'
          : 'Matches complete words only'}
      </div>
    `;
    basicSettings.appendChild(exactSetting);

    leftColumn.appendChild(basicSettings);

    // Fuzzy Matching Section (if enabled)
    if (settings.useFuzzyMatch) {
      const fuzzySettings = document.createElement('div');
      fuzzySettings.style.marginBottom = '10px';
      
      const fuzzyTitle = document.createElement('div');
      fuzzyTitle.style.fontSize = '11px';
      fuzzyTitle.style.fontWeight = 'bold';
      fuzzyTitle.style.color = '#2563eb';
      fuzzyTitle.style.marginBottom = '5px';
      fuzzyTitle.innerText = 'Fuzzy Matching Settings';
      fuzzySettings.appendChild(fuzzyTitle);

      fuzzySettings.innerHTML += `
        <div style="margin-bottom: 5px;">
          <div style="font-weight: bold;">Similarity Threshold: ${(settings.fuzzyMatchThreshold * 100).toFixed(0)}%</div>
          <div style="color: #666; font-size: 9px; margin-left: 8px;">
            Matches must be at least ${(settings.fuzzyMatchThreshold * 100).toFixed(0)}% similar
          </div>
        </div>
      `;
      
      leftColumn.appendChild(fuzzySettings);
    }

    // Create right column (Context settings)
    const rightColumn = document.createElement('div');
    
    const contextTitle = document.createElement('div');
    contextTitle.style.fontSize = '11px';
    contextTitle.style.fontWeight = 'bold';
    contextTitle.style.color = '#2563eb';
    contextTitle.style.marginBottom = '5px';
    contextTitle.innerText = 'Context Requirements';
    rightColumn.appendChild(contextTitle);

    if (settings.contextBefore || settings.contextAfter) {
      if (settings.contextBefore) {
        const beforeSetting = document.createElement('div');
        beforeSetting.style.marginBottom = '5px';
        beforeSetting.innerHTML = `
          <div style="font-weight: bold;">Required Words Before:</div>
          <div style="color: #666; font-size: 9px; margin-left: 8px;">
            Words required before: ${settings.contextBefore}
          </div>
        `;
        rightColumn.appendChild(beforeSetting);
      }

      if (settings.contextAfter) {
        const afterSetting = document.createElement('div');
        afterSetting.style.marginBottom = '5px';
        afterSetting.innerHTML = `
          <div style="font-weight: bold;">Required Words After:</div>
          <div style="color: #666; font-size: 9px; margin-left: 8px;">
            Words required after: ${settings.contextAfter}
          </div>
        `;
        rightColumn.appendChild(afterSetting);
      }

      const rangeSetting = document.createElement('div');
      rangeSetting.style.marginBottom = '5px';
      rangeSetting.innerHTML = `
        <div style="font-weight: bold;">Search Range: ${settings.contextRange} words</div>
        <div style="color: #666; font-size: 9px; margin-left: 8px;">
          Required words must appear within this distance
        </div>
      `;
      rightColumn.appendChild(rangeSetting);
    } else {
      const noContext = document.createElement('div');
      noContext.style.color = '#666';
      noContext.style.fontSize = '9px';
      noContext.innerText = 'No specific context requirements set';
      rightColumn.appendChild(noContext);
    }

    // Add columns to grid
    grid.appendChild(leftColumn);
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
        throw new Error('No chart data available to generate');
      }

      setProgress({ current: 0, total: chartData.length });

      // Create temporary container
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      document.body.appendChild(tempContainer);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < chartData.length; i++) {
        setProgress(prev => ({ ...prev, current: i + 1 }));

        // Create a container for the current chart
        const chartContainer = document.createElement('div');
        chartContainer.style.width = '1200px';
        chartContainer.style.height = '700px'; // Reduced from 800px
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

        // Create chart container with updated height
        const chartDiv = document.createElement('div');
        chartDiv.style.width = '100%';
        chartDiv.style.height = 'calc(100% - 250px)'; // Leave more room for settings
        chartContainer.appendChild(chartDiv);

        // Add settings summary
        const settingsDiv = createSettingsSummary(chartData[i].settings);
        chartContainer.appendChild(settingsDiv);

        // Render the chart
        const chart = (
          <BarChart
            width={1160}
            height={580}
            data={chartData[i].data}
            margin={{
              top: 20,
              right: 30,
              left: 150,
              bottom: 140  // Increased bottom margin for rotated labels
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="documentName"
              interval={0}
              angle={-45}
              textAnchor="end"
              height={130}  // Increased height for labels
              tick={{
                fontSize: 8,  // Smaller font size
                dy: 8,      // Adjust vertical position of labels
                dx: -8      // Adjust horizontal position of labels
              }}
              tickFormatter={(value) => {
                // Truncate long document names
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

        // Render the chart
        const root = document.createElement('div');
        chartDiv.appendChild(root);
        ReactDOM.render(chart, root);

        // Wait for render
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

          // Clean up
          chartDiv.removeChild(root);
          chartContainer.remove();

        } catch (error) {
          console.error(`Error processing chart ${i + 1}:`, error);
          throw new Error(`Failed to process chart ${i + 1}: ${error.message}`);
        }
      }

      // Clean up temporary container
      document.body.removeChild(tempContainer);

      // Save the PDF
      pdf.save('keyword-frequency-charts.pdf');

    } catch (error) {
      console.error('Error in downloadCharts:', error);
      setError(error.message || 'An unknown error occurred');
      alert(`Error generating charts: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const chartData = prepareChartData(analysisResults);

  if (chartData.length === 0) {
    return (
      <div className="mt-8 text-gray-600 dark:text-gray-400">
        No chart data available. Make sure there are keywords with matches.
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Frequency Charts
        </h3>
        <div className="flex items-center gap-4">
          {isGenerating && (
            <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400">
              <Loader className="h-4 w-4 animate-spin" />
              <span>
                Generating charts ({progress.current} of {progress.total})...
              </span>
            </div>
          )}
          {error && (
            <div className="text-red-500 dark:text-red-400">
              {error}
            </div>
          )}
          <button
            onClick={downloadCharts}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Download Charts'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartExporter;