# PDFCraft Pro v2.0
### Free, Self-Hosted PDF Converter

A professional PDF conversion tool built with Node.js. Convert Word, PowerPoint, and images to PDF. Merge, compress, and split PDFs — all from your browser.

---

## Features

| Tool | Requires |
|------|---------|
| Word → PDF (.doc, .docx) | LibreOffice |
| PPT → PDF (.ppt, .pptx) | LibreOffice |
| Image → PDF (.jpg, .png, .webp) | Built-in (pdf-lib) |
| Merge PDFs | Built-in (pdf-lib) |
| Compress PDF | Ghostscript or pdf-lib fallback |
| Split PDF | Built-in (pdf-lib) |

---

## Quick Start

### Windows
1. Install [Node.js](https://nodejs.org) (v16+)
2. Install [LibreOffice](https://www.libreoffice.org/download/) for Word/PPT conversion
3. Double-click `START-WINDOWS.bat`
4. Browser opens automatically at http://localhost:3000

### Linux / Mac
```bash
chmod +x start.sh
./start.sh
```

### Manual
```bash
npm install
node server.js
```

---

## Installation: LibreOffice

LibreOffice is **required** for Word (.docx) and PowerPoint (.pptx) conversion.

**Ubuntu/Debian:**
```bash
sudo apt-get install libreoffice
```

**Windows:**
Download from https://www.libreoffice.org/download/libreoffice-fresh/

**Mac:**
```bash
brew install --cask libreoffice
```

---

## Ghostscript (Optional — Better PDF Compression)

**Ubuntu:**
```bash
sudo apt-get install ghostscript
```

**Windows:** Download from https://www.ghostscript.com/

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/convert` | Convert file to PDF |
| POST | `/api/merge` | Merge multiple PDFs |
| POST | `/api/split` | Split PDF into pages |
| POST | `/api/compress` | Compress a PDF |
| GET | `/api/health` | Server status & tool availability |

### Example: Convert with curl
```bash
curl -X POST http://localhost:3000/api/convert \
  -F "file=@document.docx" \
  -o output.pdf
```

---

## Project Structure

```
pdf-converter/
├── server.js          # Node.js backend (Express)
├── package.json       # Dependencies
├── START-WINDOWS.bat  # Windows launcher
├── start.sh           # Linux/Mac launcher
├── public/
│   ├── index.html     # Frontend UI
│   ├── style.css      # Styles
│   └── script.js      # Frontend JS
├── uploads/           # Temp upload storage (auto-cleaned)
└── outputs/           # Generated PDFs (auto-deleted after 30 min)
```

---

## SEO Tips (for hosting publicly)

1. **Domain:** Use keyword-rich domain like `wordtopdfconverter.com`
2. **Each tool gets its own URL:** `/word-to-pdf`, `/ppt-to-pdf`, etc.
3. **Google Search Console:** Submit your sitemap
4. **Page speed:** Enable gzip, CDN (Cloudflare free tier)
5. **Backlinks:** Submit to ProductHunt, AlternativeTo, G2

---

## License
MIT — Free to use, modify, and deploy.
