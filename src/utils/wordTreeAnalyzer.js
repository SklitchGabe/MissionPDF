// Helper function to extract word flows
export function extractWordTreeData(documents, keyword, windowSize = 5) {
    const flows = {
      before: {}, // Words flowing into the keyword
      after: {},  // Words flowing out of the keyword
      documentFlows: {} // Flows by document
    };
    
    // Process each document
    documents.forEach(doc => {
      if (!doc.content) return;
      
      const words = doc.content.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"\n\r]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 0);
      
      // Initialize document-specific flows
      flows.documentFlows[doc.id] = {
        before: {},
        after: {},
        documentName: doc.name
      };
  
      // Find all instances of the keyword
      words.forEach((word, index) => {
        if (word === keyword.toLowerCase()) {
          // Extract words before
          for (let i = Math.max(0, index - windowSize); i < index; i++) {
            const sequence = words.slice(i, index).join(' ');
            flows.before[sequence] = (flows.before[sequence] || 0) + 1;
            flows.documentFlows[doc.id].before[sequence] = 
              (flows.documentFlows[doc.id].before[sequence] || 0) + 1;
          }
          
          // Extract words after
          for (let i = index + 1; i <= Math.min(words.length, index + windowSize); i++) {
            const sequence = words.slice(index + 1, i + 1).join(' ');
            flows.after[sequence] = (flows.after[sequence] || 0) + 1;
            flows.documentFlows[doc.id].after[sequence] = 
              (flows.documentFlows[doc.id].after[sequence] || 0) + 1;
          }
        }
      });
    });
  
    // Convert to hierarchical format for D3
    function convertToHierarchy(flows, type) {
      const root = {
        name: type === 'before' ? '' : keyword,
        children: []
      };
      
      Object.entries(flows).forEach(([sequence, count]) => {
        const words = sequence.split(' ');
        let currentNode = root;
        
        // For 'before' flows, process words in reverse
        if (type === 'before') {
          words.reverse();
        }
        
        words.forEach((word, i) => {
          let child = currentNode.children.find(c => c.name === word);
          if (!child) {
            child = {
              name: word,
              count: 0,
              children: []
            };
            currentNode.children.push(child);
          }
          child.count += count;
          currentNode = child;
        });
      });
      
      return root;
    }
  
    // Process global flows
    const hierarchicalData = {
      before: convertToHierarchy(flows.before, 'before'),
      after: convertToHierarchy(flows.after, 'after'),
      keyword: keyword,
      documentFlows: {}
    };
  
    // Process document-specific flows
    Object.entries(flows.documentFlows).forEach(([docId, docFlows]) => {
      hierarchicalData.documentFlows[docId] = {
        before: convertToHierarchy(docFlows.before, 'before'),
        after: convertToHierarchy(docFlows.after, 'after'),
        documentName: docFlows.documentName
      };
    });
  
    return hierarchicalData;
  }