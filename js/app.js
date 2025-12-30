/**
 * SHΔDØW V64 - Main Controller
 * Manages UI, Workers, and File Streams
 */

const App = {
    worker: null,
    isProcessing: false,
    startTime: 0,
    processedCount: 0,
    totalSize: 0,
    processedSize: 0,
    dbInstance: null,

    ui: {
        fileInput: document.getElementById('file-input'),
        btnProcess: document.getElementById('btn-process'),
        btnStop: document.getElementById('btn-stop'),
        btnExportJson: document.getElementById('btn-export-json'),
        btnExportCsv: document.getElementById('btn-export-csv'),
        btnClear: document.getElementById('btn-clear'),
        output: document.getElementById('data-output'),
        progressBar: document.getElementById('progress-bar'),
        stats: {
            lines: document.getElementById('stat-lines'),
            tps: document.getElementById('stat-tps'),
            mem: document.getElementById('stat-mem'),
            emails: document.getElementById('stat-emails')
        }
    },

    init() {
        this.initWorker();
        this.initListeners();
        this.initDB();
        this.startMonitor();
    },

    initDB() {
        ShadowDB.open().then(db => {
            this.dbInstance = db;
            this.refreshStats();
        });
    },

    initWorker() {
        this.worker = new Worker('js/worker.js');
        
        this.worker.onmessage = (e) => {
            const { type, data, metrics } = e.data;
            
            if (type === 'CHUNK_PROCESSED') {
                this.handleChunkProcessed(data, metrics);
            } else if (type === 'ERROR') {
                console.error('Worker Error:', data);
            }
        };
    },

    initListeners() {
        this.ui.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.ui.btnProcess.disabled = false;
                this.ui.output.innerHTML = `<div class="placeholder-text">READY TO PROCESS ${e.target.files.length} FILES</div>`;
            }
        });

        this.ui.btnProcess.addEventListener('click', () => this.startProcessing());
        
        this.ui.btnStop.addEventListener('click', () => {
            this.isProcessing = false;
            this.ui.btnStop.disabled = true;
            this.ui.btnProcess.disabled = false;
        });

        this.ui.btnClear.addEventListener('click', async () => {
            if(confirm('PURGE ALL DATA?')) {
                await ShadowDB.clear();
                this.processedCount = 0;
                this.ui.output.innerHTML = '';
                this.refreshStats();
            }
        });

        this.ui.btnExportJson.addEventListener('click', () => this.exportData('json'));
        this.ui.btnExportCsv.addEventListener('click', () => this.exportData('csv'));
    },

    async startProcessing() {
        const files = this.ui.fileInput.files;
        if (!files.length) return;

        this.isProcessing = true;
        this.ui.btnProcess.disabled = true;
        this.ui.btnStop.disabled = false;
        this.startTime = performance.now();
        this.processedSize = 0;
        this.totalSize = Array.from(files).reduce((acc, f) => acc + f.size, 0);
        this.ui.output.innerHTML = ''; // Clear previous view

        for (const file of files) {
            if (!this.isProcessing) break;
            await this.processFile(file);
        }

        this.isProcessing = false;
        this.ui.btnStop.disabled = true;
        this.ui.btnProcess.disabled = false;
        this.ui.btnExportJson.disabled = false;
        this.ui.btnExportCsv.disabled = false;
    },

    async processFile(file) {
        const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks
        let offset = 0;
        let leftover = '';

        while (offset < file.size && this.isProcessing) {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            const text = await slice.text();
            
            // Handle split lines at chunk boundaries
            const lastNewline = text.lastIndexOf('\n');
            let chunkText = leftover + (lastNewline > -1 ? text.substring(0, lastNewline) : text);
            leftover = lastNewline > -1 ? text.substring(lastNewline + 1) : '';

            if (offset + CHUNK_SIZE >= file.size && leftover) {
                chunkText += '\n' + leftover;
                leftover = '';
            }

            // Send to worker
            this.worker.postMessage({
                type: 'PROCESS_CHUNK',
                text: chunkText,
                fileName: file.name
            });

            offset += CHUNK_SIZE;
            this.processedSize = offset > file.size ? file.size : offset;
            
            // Small delay to allow UI updates
            await new Promise(r => setTimeout(r, 10));
        }
    },

    async handleChunkProcessed(records, metrics) {
        // Save to IndexedDB
        await ShadowDB.addBulk(records);
        
        this.processedCount += records.length;
        
        // Update UI Progress
        const progress = (this.processedSize / this.totalSize) * 100;
        this.ui.progressBar.style.width = `${progress}%`;
        
        // Render a few rows for visual feedback (don't render all to save DOM)
        this.renderLiveRows(records.slice(0, 5));
        
        // Update specific counters
        const currentEmails = parseInt(this.ui.stats.emails.innerText);
        this.ui.stats.emails.innerText = currentEmails + metrics.emailCount;
    },

    renderLiveRows(rows) {
        const fragment = document.createDocumentFragment();
        rows.forEach(row => {
            const div = document.createElement('div');
            div.className = 'log-row';
            let typeClass = row.type === 'EMAIL' ? 'tag-email' : (row.type === 'PASS' ? 'tag-pass' : 'tag-info');
            
            div.innerHTML = `
                <span>${row.id.toString().slice(-4)}</span>
                <span class="${typeClass}">${row.type}</span>
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.content}</span>
                <span>${row.metadata || '-'}</span>
                <span>${row.security || 'OK'}</span>
            `;
            fragment.appendChild(div);
        });
        
        // Keep DOM light, remove old if too many
        if (this.ui.output.children.length > 50) {
            this.ui.output.innerHTML = '';
        }
        this.ui.output.appendChild(fragment);
        this.ui.output.scrollTop = this.ui.output.scrollHeight;
    },

    startMonitor() {
        setInterval(() => {
            // Update TPS
            const now = performance.now();
            const elapsed = (now - this.startTime) / 1000;
            if (this.isProcessing && elapsed > 0) {
                const tps = Math.round(this.processedCount / elapsed);
                this.ui.stats.tps.innerText = tps.toLocaleString();
            }

            // Update Lines
            this.ui.stats.lines.innerText = this.processedCount.toLocaleString();

            // Mock Memory Usage (if API not available)
            if (performance.memory) {
                const mem = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                this.ui.stats.mem.innerText = `${mem} MB`;
            }
        }, 500);
    },

    async refreshStats() {
        const count = await ShadowDB.count();
        this.processedCount = count;
        this.ui.stats.lines.innerText = count.toLocaleString();
    },

    async exportData(format) {
        const allData = await ShadowDB.getAll();
        let content = '';
        let mime = '';

        if (format === 'json') {
            content = JSON.stringify(allData, null, 2);
            mime = 'application/json';
        } else {
            const headers = ['ID', 'Type', 'Content', 'Metadata', 'Security'];
            content = headers.join(',') + '\n' + 
                      allData.map(r => `${r.id},${r.type},"${r.content}",${r.metadata},${r.security}`).join('\n');
            mime = 'text/csv';
        }

        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shadow_export_${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());