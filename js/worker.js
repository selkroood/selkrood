/**
 * SHΔDØW V64 - Worker Thread
 * Handles Regex parsing and data classification
 */

self.onmessage = function(e) {
    const { type, text, fileName } = e.data;

    if (type === 'PROCESS_CHUNK') {
        try {
            const lines = text.split('\n');
            const results = [];
            let emailCount = 0;

            // Regex Patterns
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
            const passRegex = /password|passwd|pwd/i;
            
            lines.forEach(line => {
                const cleanLine = line.trim();
                if (!cleanLine) return;

                let item = {
                    id: Date.now() + Math.random(),
                    content: cleanLine,
                    type: 'UNKNOWN',
                    metadata: '',
                    security: 'SAFE',
                    source: fileName
                };

                // Classification Logic
                const emailMatch = cleanLine.match(emailRegex);
                if (emailMatch) {
                    item.type = 'EMAIL';
                    item.content = emailMatch[0];
                    item.metadata = emailMatch[0].split('@')[1]; // Domain extraction
                    emailCount++;
                } else if (passRegex.test(cleanLine) || cleanLine.length > 32) {
                    item.type = 'PASS';
                    item.security = 'WEAK'; // Placeholder logic
                    if (cleanLine.length < 8) item.security = 'CRITICAL';
                } else {
                    item.type = 'DATA';
                }

                results.push(item);
            });

            self.postMessage({
                type: 'CHUNK_PROCESSED',
                data: results,
                metrics: { emailCount }
            });

        } catch (err) {
            self.postMessage({ type: 'ERROR', data: err.message });
        }
    }
};