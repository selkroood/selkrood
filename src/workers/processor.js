/* 
  Web Worker for SHADOW V64
  Handles parsing, classification, and filtering off the main thread.
*/

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'PROCESS_CHUNK') {
    const { textChunk } = payload;
    const lines = textChunk.split(/\r?\n/);
    const results = [];
    const stats = {
      emails: 0,
      weakPasswords: 0,
      domains: {}
    };

    // Regex Patterns
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    
    for (let line of lines) {
      if (!line.trim()) continue;

      const entry = {
        raw: line,
        type: 'unknown',
        domain: null,
        risk: 'low'
      };

      // Email Detection
      const emailMatch = line.match(emailRegex);
      if (emailMatch) {
        entry.type = 'email';
        entry.email = emailMatch[0];
        const domain = entry.email.split('@')[1];
        entry.domain = domain;
        
        stats.emails++;
        stats.domains[domain] = (stats.domains[domain] || 0) + 1;
      }

      // Weak Password Detection (Simple Heuristic)
      if (line.length < 6 || line.toLowerCase().includes('123456') || line.toLowerCase().includes('password')) {
        entry.risk = 'high';
        stats.weakPasswords++;
      }

      results.push(entry);
    }

    self.postMessage({
      type: 'CHUNK_PROCESSED',
      data: results,
      stats: stats
    });
  }
};