import React, { useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom';

const ChartExporter = ({ analysisResults }) => {
  const chartsRef = useRef([]);
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
        const data = results.map(doc => ({
          documentName: doc.documentName,
          count: doc.keywords[keyword]?.count || 0
        }))
        .sort((a, b) => b.count - a.count)
        .filter(item => item.count > 0);

        return {
          keyword,
          data
        };
      });
    } catch (error) {
      console.error('Error in prepareChartData:', error);
      throw new Error('Failed to prepare chart data: ' + error.message);
    }
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

      // Create temporary container for rendering charts
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
        chartContainer.style.height = '800px';
        chartContainer.style.backgroundColor = 'white';
        chartContainer.style.padding = '20px';
        tempContainer.appendChild(chartContainer);

        // Render the title
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
        chartDiv.style.height = 'calc(100% - 60px)';
        chartContainer.appendChild(chartDiv);

        // Render the chart directly without ResponsiveContainer
        const chart = (
          <BarChart
            width={1160}
            height={700}
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

        // Capture the chart
        try {
          const canvas = await html2canvas(chartContainer, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
          });

          const imgData = canvas.toDataURL('image/jpeg', 1.0);

          // Add a new page for each chart except the first one
          if (i > 0) {
            pdf.addPage();
          }

          // Add image to PDF
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

  // Preview charts in the UI
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