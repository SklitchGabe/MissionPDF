import * as pdfjsLib from 'pdfjs-dist';

// Configure worker with CDN URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function parsePDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const maxPages = pdf.numPages;
    const pageTextPromises = [];

    // Extract text from each page
    for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
      pageTextPromises.push(getPageText(pdf, pageNo));
    }

    const pagesText = await Promise.all(pageTextPromises);
    
    return {
      fileName: file.name,
      text: pagesText.join(' '),
      pageCount: maxPages,
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF ${file.name}: ${error.message}`);
  }
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