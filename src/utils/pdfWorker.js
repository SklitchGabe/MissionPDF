import * as pdfjsLib from 'pdfjs-dist';

// Configure worker with CDN URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Parse a single PDF file
async function parsePDF(arrayBuffer, fileName) {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const maxPages = pdf.numPages;
    const pageTextPromises = [];

    // Extract text from each page
    for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
      pageTextPromises.push(getPageText(pdf, pageNo));
    }

    const pagesText = await Promise.all(pageTextPromises);
    
    // Clean up memory
    await pdf.destroy();
    loadingTask.destroy();
    
    return {
      fileName: fileName,
      text: pagesText.join(' '),
      pageCount: maxPages,
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF ${fileName}: ${error.message}`);
  }
}

// Extract text from a single page
async function getPageText(pdf, pageNo) {
  const page = await pdf.getPage(pageNo);
  const textContent = await page.getTextContent();
  const text = textContent.items.map(item => item.str).join(' ');
  
  // Clean up memory
  page.cleanup();
  
  return text;
}

// Expose functions to Worker context
self.onmessage = async function(e) {
  try {
    // Destructure the data from the message
    const { file, action } = e.data;
    
    if (action === 'parsePDF') {
      const result = await parsePDF(file.data, file.name);
      self.postMessage({ success: true, result });
    }
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
}; 