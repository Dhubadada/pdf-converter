const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { PDFDocument } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Directory Setup ──────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');
[UPLOADS_DIR, OUTPUTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/outputs', express.static(OUTPUTS_DIR));

// ─── Multer Config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      '.doc', '.docx', '.ppt', '.pptx', '.odt', '.odp',
      '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff',
      '.pdf', '.txt', '.html'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported`));
    }
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

function getLibreOfficeCmd() {
  return new Promise(resolve => {
    exec('soffice --version', (err) => {
      if (!err) return resolve('soffice');
      exec('libreoffice --version', (err2) => {
        if (!err2) return resolve('libreoffice');
        // Try full Windows path
        const winPath = '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"';
        exec(`${winPath} --version`, (err3) => {
          resolve(err3 ? null : winPath);
        });
      });
    });
  });
}

function checkLibreOffice() {
  return getLibreOfficeCmd().then(cmd => cmd !== null);
}

function cleanupFile(filePath) {
  setTimeout(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }, 30 * 60 * 1000); // Delete after 30 minutes
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/convert
 * Converts uploaded file to PDF using LibreOffice or pdf-lib
 */
app.post('/api/convert', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();
  const outputName = `${uuidv4()}.pdf`;
  const outputPath = path.join(OUTPUTS_DIR, outputName);

  try {
    // ── Image → PDF (using pdf-lib, no LibreOffice needed) ──
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext)) {
      await convertImageToPdf(inputPath, outputPath, ext);
    }
    // ── Word / PPT / ODT / ODP → PDF (LibreOffice) ──
    else if (['.doc', '.docx', '.ppt', '.pptx', '.odt', '.odp', '.txt'].includes(ext)) {
      const loCmd = await getLibreOfficeCmd();
      if (!loCmd) {
        fs.unlinkSync(inputPath);
        return res.status(503).json({
          success: false,
          error: 'LibreOffice not found. Please install from https://www.libreoffice.org and restart the server.',
          requiresLibreOffice: true
        });
      }
      await runCommand(
        `${loCmd} --headless --convert-to pdf --outdir "${OUTPUTS_DIR}" "${inputPath}"`
      );
      // LibreOffice names it based on input filename
      const libreOutputName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
      const libreOutputPath = path.join(OUTPUTS_DIR, libreOutputName);
      if (fs.existsSync(libreOutputPath)) {
        fs.renameSync(libreOutputPath, outputPath);
      } else {
        throw new Error('LibreOffice conversion failed - output file not found');
      }
    }
    // ── PDF passthrough ──
    else if (ext === '.pdf') {
      fs.copyFileSync(inputPath, outputPath);
    }
    else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    // Clean up input file
    fs.unlinkSync(inputPath);

    // Schedule output cleanup
    cleanupFile(outputPath);

    const stats = fs.statSync(outputPath);
    return res.json({
      success: true,
      filename: outputName,
      originalName: req.file.originalname,
      size: stats.size,
      downloadUrl: `/outputs/${outputName}`
    });

  } catch (err) {
    // Cleanup on error
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    console.error('Conversion error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/merge
 * Merges multiple PDFs into one
 */
app.post('/api/merge', upload.array('files', 20), async (req, res) => {
  if (!req.files || req.files.length < 2) {
    return res.status(400).json({ success: false, error: 'Please upload at least 2 PDF files to merge' });
  }

  const outputName = `merged_${uuidv4()}.pdf`;
  const outputPath = path.join(OUTPUTS_DIR, outputName);

  try {
    const mergedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const pdfBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
      fs.unlinkSync(file.path);
    }

    const mergedBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedBytes);
    cleanupFile(outputPath);

    const stats = fs.statSync(outputPath);
    return res.json({
      success: true,
      filename: outputName,
      originalName: 'merged.pdf',
      size: stats.size,
      downloadUrl: `/outputs/${outputName}`
    });
  } catch (err) {
    req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/split
 * Splits a PDF into individual pages or range
 */
app.post('/api/split', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const { pages } = req.body; // e.g. "1,3,5-8" or empty for all
  const inputPath = req.file.path;

  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(pdfBytes);
    const totalPages = srcPdf.getPageCount();

    // Parse page ranges
    let pageIndices = [];
    if (pages && pages.trim()) {
      const parts = pages.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map(n => parseInt(n) - 1);
          for (let i = start; i <= Math.min(end, totalPages - 1); i++) pageIndices.push(i);
        } else {
          const idx = parseInt(trimmed) - 1;
          if (idx >= 0 && idx < totalPages) pageIndices.push(idx);
        }
      }
    } else {
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    }

    const results = [];
    for (const idx of pageIndices) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(srcPdf, [idx]);
      newPdf.addPage(copiedPage);
      const splitBytes = await newPdf.save();
      const outName = `page_${idx + 1}_${uuidv4()}.pdf`;
      const outPath = path.join(OUTPUTS_DIR, outName);
      fs.writeFileSync(outPath, splitBytes);
      cleanupFile(outPath);
      results.push({ page: idx + 1, filename: outName, downloadUrl: `/outputs/${outName}` });
    }

    fs.unlinkSync(inputPath);
    return res.json({ success: true, pages: results, total: results.length });
  } catch (err) {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/compress
 * Compresses a PDF (reduces file size)
 */
app.post('/api/compress', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputName = `compressed_${uuidv4()}.pdf`;
  const outputPath = path.join(OUTPUTS_DIR, outputName);

  try {
    // Try Ghostscript first (best compression)
    const hasGS = await new Promise(resolve => exec('gs --version', err => resolve(!err)));

    if (hasGS) {
      await runCommand(
        `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen ` +
        `-dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`
      );
    } else {
      // Fallback: reload and re-save with pdf-lib (minor compression)
      const pdfBytes = fs.readFileSync(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const saved = await pdf.save({ useObjectStreams: true });
      fs.writeFileSync(outputPath, saved);
    }

    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    fs.unlinkSync(inputPath);
    cleanupFile(outputPath);

    return res.json({
      success: true,
      filename: outputName,
      originalName: req.file.originalname,
      originalSize,
      compressedSize,
      reduction: Math.round((1 - compressedSize / originalSize) * 100),
      downloadUrl: `/outputs/${outputName}`
    });
  } catch (err) {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/health
 * Server health check + tool availability
 */
app.get('/api/health', async (req, res) => {
  const hasLibreOffice = await checkLibreOffice();
  const hasGhostscript = await new Promise(resolve => exec('gs --version', err => resolve(!err)));
  res.json({
    status: 'ok',
    tools: {
      libreoffice: hasLibreOffice,
      ghostscript: hasGhostscript,
      pdfLib: true
    },
    uptime: process.uptime()
  });
});

// ─── Image to PDF Helper ──────────────────────────────────────────────────────
async function convertImageToPdf(imagePath, outputPath, ext) {
  let sharp;
  try { sharp = require('sharp'); } catch (e) { sharp = null; }

  const { PDFDocument, rgb } = require('pdf-lib');
  const pdfDoc = await PDFDocument.create();

  let imgBuffer = fs.readFileSync(imagePath);

  // Convert to JPEG if needed (sharp handles it; fallback raw)
  if (sharp && ['.webp', '.gif', '.bmp', '.tiff'].includes(ext)) {
    imgBuffer = await sharp(imgBuffer).jpeg({ quality: 85 }).toBuffer();
    ext = '.jpg';
  }

  let image;
  if (ext === '.png') {
    image = await pdfDoc.embedPng(imgBuffer);
  } else {
    image = await pdfDoc.embedJpg(imgBuffer);
  }

  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 PDF Converter Pro running at http://localhost:${PORT}`);
  console.log(`📁 Uploads: ${UPLOADS_DIR}`);
  console.log(`📁 Outputs: ${OUTPUTS_DIR}\n`);
});
