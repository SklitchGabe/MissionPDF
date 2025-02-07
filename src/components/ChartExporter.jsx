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
    settingsDiv.style.padding = '20px';
    settingsDiv.style.marginTop = '20px';
    settingsDiv.style.borderTop = '1px solid #ccc';
    settingsDiv.style.fontSize = '12px';
    settingsDiv.style.color = '#000';

    const title = document.createElement('div');
    title.style.fontSize = '14px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.innerText = 'Search Configuration Details';
    settingsDiv.appendChild(title);

    const description = document.createElement('div');
    description.style.marginBottom = '15px';
    description.style.fontSize = '12px';
    description.style.color = '#666';
    description.innerText = 'The following settings were used to configure how matches for this keyword were identified in the documents:';
    settingsDiv.appendChild(description);

    const createSection = (title) => {
      const section = document.createElement('div');
      section.style.marginBottom = '15px';
      
      const sectionTitle = document.createElement('div');
      sectionTitle.style.fontSize = '13px';
      sectionTitle.style.fontWeight = 'bold';
      sectionTitle.style.marginBottom = '8px';
      sectionTitle.style.color = '#2563eb';
      sectionTitle.innerText = title;
      section.appendChild(sectionTitle);
      
      return section;
    };

    const addSettingWithDescription = (section, label, value, description) => {
      const settingDiv = document.createElement('div');
      settingDiv.style.marginBottom = '8px';
      
      const mainInfo = document.createElement('div');
      mainInfo.style.display = 'flex';
      mainInfo.style.gap = '8px';
      mainInfo.style.marginBottom = '3px';
      
      const labelSpan = document.createElement('span');
      labelSpan.style.fontWeight = 'bold';
      labelSpan.innerText = label + ':';
      
      const valueSpan = document.createElement('span');
      valueSpan.innerText = value;
      
      mainInfo.appendChild(labelSpan);
      mainInfo.appendChild(valueSpan);
      settingDiv.appendChild(mainInfo);

      if (description) {
        const descriptionDiv = document.createElement('div');
        descriptionDiv.style.fontSize = '11px';
        descriptionDiv.style.color = '#666';
        descriptionDiv.style.marginLeft = '8px';
        descriptionDiv.innerText = description;
        settingDiv.appendChild(descriptionDiv);
      }
      
      section.appendChild(settingDiv);
    };

    // Basic Matching Section
    const basicSection = createSection('Basic Matching Configuration');
    settingsDiv.appendChild(basicSection);

    addSettingWithDescription(
      basicSection,
      'Case Sensitivity',
      settings.caseSensitive ? 'Enabled' : 'Disabled',
      settings.caseSensitive 
        ? 'Matches must exactly match the uppercase/lowercase letters in the keyword'
        : 'Matches can be found regardless of uppercase/lowercase letters'
    );

    addSettingWithDescription(
      basicSection,
      'Exact Text Match',
      settings.useExactText ? 'Enabled' : 'Disabled',
      settings.useExactText 
        ? 'Searches for the exact sequence of characters, even within other words (e.g., will find "NBR" within "NBRTCD")'
        : 'Searches for the keyword as a complete word'
    );

    // Fuzzy Matching Section
    if (settings.useFuzzyMatch) {
      const fuzzySection = createSection('Fuzzy Matching Settings');
      settingsDiv.appendChild(fuzzySection);

      addSettingWithDescription(
        fuzzySection,
        'Fuzzy Matching',
        'Enabled',
        'Allows finding matches with slight spelling variations'
      );

      addSettingWithDescription(
        fuzzySection,
        'Similarity Threshold',
        settings.fuzzyMatchThreshold.toFixed(2),
        `Matches must be at least ${(settings.fuzzyMatchThreshold * 100).toFixed(0)}% similar to the keyword. Higher values require closer matches.`
      );
    }

    // Context Requirements Section
    const contextSection = createSection('Context Requirements');
    settingsDiv.appendChild(contextSection);

    const hasContextRequirements = settings.contextBefore || settings.contextAfter;

    if (hasContextRequirements) {
      if (settings.contextBefore && settings.contextBefore.length > 0) {
        addSettingWithDescription(
          contextSection,
          'Required Words Before',
          settings.contextBefore,
          'At least one of these words must appear before the keyword within the specified range'
        );
      }

      if (settings.contextAfter && settings.contextAfter.length > 0) {
        addSettingWithDescription(
          contextSection,
          'Required Words After',
          settings.contextAfter,
          'At least one of these words must appear after the keyword within the specified range'
        );
      }

      addSettingWithDescription(
        contextSection,
        'Context Search Range',
        `${settings.contextRange} words`,
        `The required words must appear within ${settings.contextRange} words before or after the keyword`
      );
    } else {
      addSettingWithDescription(
        contextSection,
        'Context Requirements',
        'None',
        'No specific words were required to appear near the keyword'
      );
    }

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
        chartContainer.style.height = '900px'; // Increased height for settings
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

        // Create chart container
        const chartDiv = document.createElement('div');
        chartDiv.style.width = '100%';
        chartDiv.style.height = '600px'; // Reduced height to make room for settings
        chartContainer.appendChild(chartDiv);

        // Add settings summary
        const settingsDiv = createSettingsSummary(chartData[i].settings);
        chartContainer.appendChild(settingsDiv);

        // Render the chart
        const chart = (
          <BarChart
            width={1160}
            height={580} // Adjusted height
            data={chartData[i].data}
            margin={{
              top: 20,
              right: 30,
              left: 150,
              bottom: 100
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="documentName"
              interval={0}
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{ 
                value: 'Number of Matches',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
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