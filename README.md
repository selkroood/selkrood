# SHΔDØW V64 | Big Data Analysis Protocol

SHΔDØW V64 is a cutting-edge client-side platform designed for processing massive text datasets directly within the browser. It leverages Web Workers and IndexedDB to ensure zero-latency performance and absolute data privacy.

## 🚀 Key Features
- **Client-Side Only**: Data never leaves your device.
- **Multithreading**: Uses Web Workers to process data without freezing the UI.
- **Chunking**: Handles large files (GBs) by splitting them into manageable streams.
- **Smart Classification**: Auto-detects emails, passwords, and domains.
- **Persistence**: Saves results to IndexedDB so you don't lose progress on refresh.

## 🛠 Tech Stack
- **HTML5/CSS3**: Cyberpunk aesthetics with Grid/Flexbox.
- **JavaScript (ES6+)**: Async/Await, Classes, Modules.
- **Web APIs**: File API, Web Workers, IndexedDB.

## 📦 Installation
1. Clone the repository.
2. Open `index.html` in a modern browser (Chrome/Edge/Firefox).
3. No server required (Static file serving recommended for Worker security policies, e.g., VS Code Live Server).

## ⚠️ Browser Security Note
Due to browser security policies regarding Web Workers and local files, it is recommended to run this project via a local server (like `python -m http.server` or VS Code Live Server) rather than double-clicking the HTML file.