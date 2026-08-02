<div align="center">

# NoCloudPDF

[![Version](https://img.shields.io/badge/version-0.0.0-blue.svg?style=for-the-badge)](https://github.com/ChethiyaB/NoCloudPDF)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)](https://www.electronjs.org/)

*Seamless, powerful, and beautiful PDF manipulation directly on your desktop.*

<br />

<img src="https://via.placeholder.com/800x450.png?text=App+Screenshot+Here" alt="App Screenshot Placeholder" width="800"/>

<br />
</div>

## Table of Contents
- [Background](#background)
- [Security](#security)
- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## Background

**NoCloudPDF** was created to address the growing need for privacy-first document manipulation. Most free PDF editors require uploading sensitive documents to third-party servers, which poses a significant data privacy risk. NoCloudPDF brings a premium, drag-and-drop PDF editing experience entirely offline to your local machine.

### Key Features
- **Merge & Reorder**: Select multiple PDFs, reorder them visually, and merge them into a single file.
- **Page Organization**: Delete, rotate, and rearrange individual pages from any PDF document.
- **Annotation & Editing**: Advanced editing suite including a native text selection and whiteout eraser tool.
- **Preview Output**: See exactly how large your new PDF will be before saving.
- **Modern UI**: A sleek, intuitive design built with React, Framer Motion, and Tailwind CSS.

---

## Security

**Privacy First.** 
Unlike online PDF editors, NoCloudPDF operates 100% offline. 
- **Zero Cloud Uploads:** Your files never leave your device.
- **Local Processing:** All PDF manipulation, including merging and page deletion, happens locally using CPU and memory on your machine.
- **No Telemetry:** We do not track your usage, telemetry, or document metadata.

---

## Install

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) installed on your machine.

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ChethiyaB/NoCloudPDF.git
   cd NoCloudPDF
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

---

## Usage

### Development Mode
To start the application in development mode with hot-reloading:
```bash
npm run dev
```

### Production Build
To package the application into a standalone executable for your operating system (e.g., AppImage, deb, rpm on Linux):
```bash
npm run build
```

---

## Contributing

We welcome contributions to NoCloudPDF! To get started:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please ensure your code passes linting checks by running `npm run lint` before submitting a PR.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
