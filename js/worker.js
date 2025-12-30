self.onmessage = function(e) {
    if (e.data.type === 'PROCESS_CHUNK') {
        const lines = e.data.text.split('\n');
        const results = [];
        let emailCount = 0;
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;

        lines.forEach(line => {
            const clean = line.trim();
            if (!clean) return;

            const match = clean.match(emailRegex);
            if (match) {
                results.push({
                    id: Date.now() + Math.random(),
                    type: 'EMAIL',
                    content: match[0],
                    metadata: match[0].split('@')[1], // استخراج النطاق هنا
                    security: 'SAFE'
                });
                emailCount++;
            }
        });

        self.postMessage({
            type: 'CHUNK_PROCESSED',
            data: results,
            metrics: { emailCount }
        });
    }
};
