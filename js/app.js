const App = {
    worker: null,
    isProcessing: false,
    startTime: 0,
    processedCount: 0,
    dbInitialized: false,

    ui: {
        fileInput: document.getElementById('file-input'),
        btnProcess: document.getElementById('btn-process'),
        btnStop: document.getElementById('btn-stop'),
        btnExportJson: document.getElementById('btn-export-json'),
        btnExportCsv: document.getElementById('btn-export-csv'),
        btnClear: document.getElementById('btn-clear'),
        output: document.getElementById('data-output'),
        progressBar: document.getElementById('progress-bar'),
        domainInput: document.getElementById('domain-filter-input'), // تم تصحيح الـ ID
        btnCopyFiltered: document.getElementById('btn-copy-filtered'),
        btnCopyUnique: document.getElementById('btn-copy-unique'),
        stats: {
            lines: document.getElementById('stat-lines'),
            tps: document.getElementById('stat-tps'),
            mem: document.getElementById('stat-mem'),
            emails: document.getElementById('stat-emails')
        }
    },

    init() {
        this.initDB();
        this.initWorker();
        this.initListeners();
        this.startMonitor();
    },

    async initDB() {
        try {
            await ShadowDB.open();
            this.dbInitialized = true;
            this.refreshStats();
            console.log("DB Protocol: Initialized");
        } catch (err) {
            console.error("DB Error:", err);
        }
    },

    initWorker() {
        this.worker = new Worker('js/worker.js');
        this.worker.onmessage = (e) => {
            if (e.data.type === 'CHUNK_PROCESSED') {
                this.handleChunkProcessed(e.data.data, e.data.metrics);
            }
        };
    },

    initListeners() {
        // تأكد من وجود العناصر قبل إضافة المستمعات لتجنب الـ TypeError
        if (this.ui.fileInput) {
            this.ui.fileInput.addEventListener('change', () => {
                this.ui.btnProcess.disabled = false;
            });
        }

        this.ui.btnProcess?.addEventListener('click', () => this.startProcessing());
        this.ui.btnStop?.addEventListener('click', () => this.isProcessing = false);
        this.ui.btnClear?.addEventListener('click', () => this.purgeData());
        this.ui.btnCopyFiltered?.addEventListener('click', () => this.copyFiltered());
        this.ui.btnCopyUnique?.addEventListener('click', () => this.copyUnique());
        this.ui.btnExportJson?.addEventListener('click', () => this.exportData('json'));
        this.ui.btnExportCsv?.addEventListener('click', () => this.exportData('csv'));
    },

    async startProcessing() {
        if (!this.dbInitialized) return alert("SYSTEM ERROR: DB NOT READY");
        
        const files = this.ui.fileInput.files;
        this.isProcessing = true;
        this.ui.btnProcess.disabled = true;
        this.ui.btnStop.disabled = false;
        this.startTime = performance.now();

        for (const file of files) {
            if (!this.isProcessing) break;
            let offset = 0;
            const CHUNK_SIZE = 1024 * 1024 * 2;
            while (offset < file.size && this.isProcessing) {
                const text = await file.slice(offset, offset + CHUNK_SIZE).text();
                this.worker.postMessage({ type: 'PROCESS_CHUNK', text, fileName: file.name });
                offset += CHUNK_SIZE;
                await new Promise(r => setTimeout(r, 10));
            }
        }
        this.ui.btnProcess.disabled = false;
        this.ui.btnStop.disabled = true;
    },

    async handleChunkProcessed(records, metrics) {
        await ShadowDB.addBulk(records);
        this.processedCount += records.length;
        this.refreshStats();
        
        // تحديث عداد الإيميلات
        const currentEmails = parseInt(this.ui.stats.emails.innerText.replace(/,/g, ''));
        this.ui.stats.emails.innerText = (currentEmails + metrics.emailCount).toLocaleString();
        
        // عرض حي للبيانات
        if (this.ui.output.children.length > 20) this.ui.output.innerHTML = '';
        records.slice(0, 2).forEach(r => {
            const row = document.createElement('div');
            row.className = 'log-row';
            row.innerHTML = `<span>${r.type}</span><span style="color:var(--primary)">${r.content}</span><span>${r.metadata}</span>`;
            this.ui.output.appendChild(row);
        });
    },

    async copyFiltered() {
        const target = this.ui.domainInput.value.toLowerCase().trim();
        if (!target) return alert("ENTER TARGET DOMAIN");
        const all = await ShadowDB.getAll();
        const data = all.filter(i => i.type === 'EMAIL' && i.metadata.includes(target)).map(i => i.content);
        this.toClipboard(data, `COPIED ${data.length} EMAILS`);
    },

    async copyUnique() {
        const all = await ShadowDB.getAll();
        const domains = [...new Set(all.filter(i => i.type === 'EMAIL').map(i => i.metadata))];
        this.toClipboard(domains, `COPIED ${domains.length} DOMAINS`);
    },

    toClipboard(arr, msg) {
        if (arr.length === 0) return alert("NO DATA FOUND");
        navigator.clipboard.writeText(arr.join('\n')).then(() => alert(msg));
    },

    async purgeData() {
        if (confirm("DELETE ALL DATA?")) {
            await ShadowDB.clear();
            location.reload();
        }
    },

    async refreshStats() {
        const count = await ShadowDB.count();
        this.ui.stats.lines.innerText = count.toLocaleString();
    },

    startMonitor() {
        setInterval(() => {
            if (this.isProcessing) {
                const elapsed = (performance.now() - this.startTime) / 1000;
                this.ui.stats.tps.innerText = Math.round(this.processedCount / elapsed).toLocaleString();
            }
        }, 1000);
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());
