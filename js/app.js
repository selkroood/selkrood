const App = {
    worker: null,
    isProcessing: false,
    processedCount: 0,
    startTime: 0,

    ui: {
        fileInput: document.getElementById('file-input'),
        btnProcess: document.getElementById('btn-process'),
        btnStop: document.getElementById('btn-stop'),
        output: document.getElementById('data-output'),
        domainInput: document.getElementById('domain-input'),
        btnCopyFiltered: document.getElementById('btn-copy-filtered'),
        btnCopyUnique: document.getElementById('btn-copy-unique'),
        stats: {
            lines: document.getElementById('stat-lines'),
            emails: document.getElementById('stat-emails'),
            tps: document.getElementById('stat-tps')
        }
    },

    init() {
        this.initWorker();
        this.initListeners();
        ShadowDB.open().then(() => this.refreshStats());
    },

    initWorker() {
        this.worker = new Worker('js/worker.js');
        this.worker.onmessage = (e) => {
            if (e.data.type === 'CHUNK_PROCESSED') {
                this.handleData(e.data.data, e.data.metrics);
            }
        };
    },

    initListeners() {
        this.ui.fileInput.onchange = () => this.ui.btnProcess.disabled = false;
        this.ui.btnProcess.onclick = () => this.start();
        this.ui.btnStop.onclick = () => this.isProcessing = false;
        
        // أزرار النسخ الذكي
        this.ui.btnCopyFiltered.onclick = () => this.smartCopyByDomain();
        this.ui.btnCopyUnique.onclick = () => this.copyUniqueDomains();
        
        document.getElementById('btn-clear').onclick = async () => {
            if(confirm('PURGE DATABASE?')) { await ShadowDB.clear(); location.reload(); }
        };
    },

    async smartCopyByDomain() {
        const target = this.ui.domainInput.value.toLowerCase().trim();
        if(!target) return alert("ENTER DOMAIN FIRST");
        
        const all = await ShadowDB.getAll();
        const filtered = all
            .filter(i => i.type === 'EMAIL' && i.metadata.toLowerCase().includes(target))
            .map(i => i.content);
            
        this.toClipboard(filtered, `COPIED ${filtered.length} EMAILS`);
    },

    async copyUniqueDomains() {
        const all = await ShadowDB.getAll();
        const domains = [...new Set(all
            .filter(i => i.type === 'EMAIL')
            .map(i => i.metadata.toLowerCase())
        )].filter(d => d);
        
        this.toClipboard(domains, `COPIED ${domains.length} UNIQUE DOMAINS`);
    },

    toClipboard(data, msg) {
        if(data.length === 0) return alert("NO DATA MATCHES");
        navigator.clipboard.writeText(data.join('\n')).then(() => alert(msg));
    },

    async start() {
        this.isProcessing = true;
        this.startTime = performance.now();
        this.ui.btnProcess.disabled = true;
        this.ui.btnStop.disabled = false;

        for (const file of this.ui.fileInput.files) {
            if (!this.isProcessing) break;
            let offset = 0;
            const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB
            while (offset < file.size && this.isProcessing) {
                const text = await file.slice(offset, offset + CHUNK_SIZE).text();
                this.worker.postMessage({ type: 'PROCESS_CHUNK', text });
                offset += CHUNK_SIZE;
                await new Promise(r => setTimeout(r, 5));
            }
        }
    },

    async handleData(records, metrics) {
        await ShadowDB.addBulk(records);
        this.processedCount += records.length;
        this.ui.stats.lines.innerText = this.processedCount.toLocaleString();
        
        // تحديث إحصائيات الإيميلات
        const current = parseInt(this.ui.stats.emails.innerText.replace(/,/g, ''));
        this.ui.stats.emails.innerText = (current + metrics.emailCount).toLocaleString();

        // عرض عينة حية
        if(this.ui.output.children.length > 30) this.ui.output.innerHTML = '';
        records.slice(0, 3).forEach(r => {
            const row = document.createElement('div');
            row.className = 'log-row';
            row.innerHTML = `<span>${r.type}</span><span style="color:var(--primary)">${r.content}</span><span>${r.metadata}</span>`;
            this.ui.output.appendChild(row);
        });
    },

    async refreshStats() {
        const count = await ShadowDB.count();
        this.processedCount = count;
        this.ui.stats.lines.innerText = count.toLocaleString();
    }
};

App.init();
