import * as pdfjsLib from 'pdfjs-dist';

// Configure worker with CDN URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Create a worker
let pdfWorker = null;

// Initialize worker
function initWorker() {
  if (pdfWorker === null) {
    pdfWorker = new Worker(new URL('./pdfWorker.js', import.meta.url), { type: 'module' });
  }
  return pdfWorker;
}

export async function parsePDF(file) {
  return new Promise((resolve, reject) => {
    try {
      const worker = initWorker();
      
      // Handle worker response
      const messageHandler = (e) => {
        if (e.data.result && e.data.result.fileName === file.name) {
          worker.removeEventListener('message', messageHandler);
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };
      
      worker.addEventListener('message', messageHandler);
      
      // Send file to worker as ArrayBuffer
      file.arrayBuffer().then(buffer => {
        worker.postMessage({
          action: 'parsePDF',
          file: {
            data: buffer,
            name: file.name
          }
        }, [buffer]); // Transfer ownership of the buffer
      });
      
    } catch (error) {
      console.error('Error setting up PDF parsing:', error);
      reject(error);
    }
  });
}

async function getPageText(pdf, pageNo) {
  try {
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  } catch (error) {
    console.error(`Error extracting text from page ${pageNo}:`, error);
    return '';
  }
}