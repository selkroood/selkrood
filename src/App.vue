<template>
  <v-app class="cyberpunk-font">
    <v-app-bar flat color="transparent" class="border-bottom">
      <v-app-bar-title class="text-primary font-weight-bold">
        <v-icon icon="mdi-skull-scan" class="mr-2"></v-icon>
        SHΔDØW <span class="text-white">V64</span>
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-chip color="primary" variant="outlined" class="mr-2">
        <v-icon start icon="mdi-memory"></v-icon> RAM: {{ memoryUsage }} MB
      </v-chip>
      <v-chip color="secondary" variant="outlined">
        <v-icon start icon="mdi-speedometer"></v-icon> {{ tps }} TPS
      </v-chip>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <!-- Hero / Upload Section -->
        <v-row v-if="!processing && totalRecords === 0" justify="center" align="center" style="height: 60vh;">
          <v-col cols="12" md="8" class="text-center">
            <div class="glitch-wrapper mb-5">
              <h1 class="glitch text-h2 font-weight-bold text-primary">SYSTEM READY</h1>
            </div>
            <p class="text-grey mb-5">استيراد البيانات الضخمة للمعالجة المحلية الآمنة</p>
            
            <v-file-input
              v-model="files"
              label="اختر ملف (TXT, CSV, LOG)"
              variant="outlined"
              prepend-icon="mdi-database-import"
              color="primary"
              show-size
              @update:modelValue="startProcessing"
            ></v-file-input>
          </v-col>
        </v-row>

        <!-- Dashboard -->
        <v-row v-else>
          <!-- Stats Cards -->
          <v-col cols="12" md="3">
            <v-card border color="surface" class="mb-3">
              <v-card-text>
                <div class="text-caption text-grey">إجمالي السجلات</div>
                <div class="text-h4 text-primary">{{ totalRecords.toLocaleString() }}</div>
              </v-card-text>
            </v-card>
            <v-card border color="surface" class="mb-3">
              <v-card-text>
                <div class="text-caption text-grey">رسائل البريد</div>
                <div class="text-h4 text-info">{{ stats.emails.toLocaleString() }}</div>
              </v-card-text>
            </v-card>
            <v-card border color="surface" class="mb-3">
              <v-card-text>
                <div class="text-caption text-grey">كلمات مرور ضعيفة</div>
                <div class="text-h4 text-error">{{ stats.weakPasswords.toLocaleString() }}</div>
              </v-card-text>
            </v-card>
            
            <!-- Domain List -->
            <v-card border color="surface" height="300" class="overflow-y-auto">
              <v-card-title class="text-subtitle-2">أبرز النطاقات</v-card-title>
              <v-list density="compact" bg-color="transparent">
                <v-list-item v-for="(count, domain) in topDomains" :key="domain">
                  <template v-slot:prepend>
                    <v-icon color="secondary" size="small">mdi-earth</v-icon>
                  </template>
                  <v-list-item-title>{{ domain }}</v-list-item-title>
                  <template v-slot:append>
                    <v-chip size="x-small" color="primary">{{ count }}</v-chip>
                    <v-btn icon="mdi-content-copy" size="x-small" variant="text" @click="copyText(domain)"></v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>

          <!-- Main Data Grid (Virtual Scroll) -->
          <v-col cols="12" md="9">
            <v-card border color="surface" height="80vh" class="d-flex flex-column">
              <v-toolbar density="compact" color="transparent">
                <v-text-field
                  v-model="search"
                  prepend-inner-icon="mdi-magnify"
                  label="بحث سريع (Client-Side)"
                  variant="plain"
                  hide-details
                  class="mx-4"
                ></v-text-field>
                <v-btn color="primary" variant="tonal" @click="exportData('json')">
                  تصدير JSON
                  <v-icon end>mdi-code-json</v-icon>
                </v-btn>
              </v-toolbar>
              
              <v-divider></v-divider>

              <!-- Virtual Scroller for Performance -->
              <v-virtual-scroll
                :items="filteredData"
                height="100%"
                item-height="50"
              >
                <template v-slot:default="{ item }">
                  <v-list-item :class="{'bg-red-subtle': item.risk === 'high'}">
                    <template v-slot:prepend>
                       <v-icon :color="item.type === 'email' ? 'info' : 'grey'" size="small">
                         {{ item.type === 'email' ? 'mdi-email' : 'mdi-file-document' }}
                       </v-icon>
                    </template>
                    <v-list-item-title class="font-mono">{{ item.raw }}</v-list-item-title>
                    <template v-slot:append>
                      <v-chip v-if="item.domain" size="x-small" variant="outlined" color="secondary">{{ item.domain }}</v-chip>
                      <v-icon v-if="item.risk === 'high'" color="error" class="ml-2">mdi-alert</v-icon>
                    </template>
                  </v-list-item>
                  <v-divider></v-divider>
                </template>
              </v-virtual-scroll>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Worker from './workers/processor.js?worker';

// State
const files = ref([]);
const processing = ref(false);
const totalRecords = ref(0);
const memoryUsage = ref(0);
const tps = ref(0);
const search = ref('');
const dataset = ref([]); // In-memory buffer for demo (IndexedDB recommended for production)
const stats = ref({
  emails: 0,
  weakPasswords: 0,
  domains: {}
});

// Performance Monitoring Loop
let perfInterval;

// Web Worker
const worker = new Worker();

worker.onmessage = (e) => {
  if (e.data.type === 'CHUNK_PROCESSED') {
    const { data, stats: chunkStats } = e.data;
    
    // Update Data
    // Note: For millions of rows, we would push to IndexedDB here, not RAM.
    // Keeping in RAM for demo simplicity.
    dataset.value.push(...data);
    totalRecords.value += data.length;

    // Update Stats
    stats.value.emails += chunkStats.emails;
    stats.value.weakPasswords += chunkStats.weakPasswords;
    
    Object.entries(chunkStats.domains).forEach(([domain, count]) => {
      stats.value.domains[domain] = (stats.value.domains[domain] || 0) + count;
    });
  }
};

const startProcessing = async () => {
  if (!files.value.length) return;
  processing.value = true;
  
  const file = files.value[0];
  const chunkSize = 1024 * 1024; // 1MB chunks
  let offset = 0;

  // Stream reader loop
  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const text = await slice.text();
    
    worker.postMessage({
      type: 'PROCESS_CHUNK',
      payload: { textChunk: text }
    });

    offset += chunkSize;
    // Simulate TPS calculation
    tps.value = Math.floor(Math.random() * 500) + 1000;
    await new Promise(r => setTimeout(r, 50)); // Prevent UI freeze
  }
};

// Computed
const filteredData = computed(() => {
  if (!search.value) return dataset.value;
  return dataset.value.filter(d => d.raw.toLowerCase().includes(search.value.toLowerCase()));
});

const topDomains = computed(() => {
  return Object.entries(stats.value.domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .reduce((obj, [key, val]) => { obj[key] = val; return obj }, {});
});

// Utils
const copyText = (text) => {
  navigator.clipboard.writeText(text);
};

const exportData = (format) => {
  const blob = new Blob([JSON.stringify(dataset.value, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `shadow_export_${Date.now()}.json`;
  link.click();
};

onMounted(() => {
  perfInterval = setInterval(() => {
    if (performance && performance.memory) {
      memoryUsage.value = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
  }, 1000);
});

onUnmounted(() => {
  clearInterval(perfInterval);
  worker.terminate();
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

.cyberpunk-font {
  font-family: 'Cairo', sans-serif;
}

.font-mono {
  font-family: 'Share Tech Mono', monospace !important;
}

.border-bottom {
  border-bottom: 1px solid rgba(0, 255, 157, 0.2);
}

/* Glitch Effect */
.glitch {
  position: relative;
  color: #00ff9d;
}
.bg-red-subtle {
  background-color: rgba(255, 0, 60, 0.1) !important;
}
</style>