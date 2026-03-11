const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument } = require('pdf-lib');
const https = require('https');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

const ILOVEPDF_PUBLIC_KEY = 'project_public_5fc6187b9dcf641a0211424f571c0106_XDA_ncd9b28254226d3f5bd0ac64f87d83128';
const ILOVEPDF_API = 'api.ilovepdf.com';

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');
[UPLOADS_DIR, OUTPUTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/outputs', express.static(OUTPUTS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.doc','.docx','.ppt','.pptx','.xls','.xlsx','.jpg','.jpeg','.png','.webp','.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error(`File type ${ext} not supported`));
  }
});

function cleanupFile(filePath) {
  setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 30 * 60 * 1000);
}

function ilovepdfAuth() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ public_key: ILOVEPDF_PUBLIC_KEY });
    const req = https.request({
      hostname: ILOVEPDF_API, path: '/v1/auth', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { const j = JSON.parse(body); j.token ? resolve(j.token) : reject(new Error('Auth failed: ' + body)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function ilovepdfStartTask(token, tool) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: ILOVEPDF_API, path: `/v1/start/${tool}`, method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { const j = JSON.parse(body); (j.server && j.task) ? resolve(j) : reject(new Error('Start failed: ' + body)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject); req.end();
  });
}

function ilovepdfUpload(token, server, task, filePath, filename) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('task', task);
    form.append('file', fs.createReadStream(filePath), filename);
    const req = https.request({
      hostname: server, path: '/v1/upload', method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, ...form.getHeaders() }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { const j = JSON.parse(body); j.server_filename ? resolve(j.server_filename) : reject(new Error('Upload failed: ' + body)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject); form.pipe(req);
  });
}

function ilovepdfProcess(token, server, task, tool, serverFilename, originalFilename) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ task, tool, files: [{ server_filename: serverFilename, filename: originalFilename }] });
    const req = https.request({
      hostname: server, path: '/v1/process', method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

function ilovepdfDownload(token, server, task, outputPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: server, path: `/v1/download/${task}`, method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, res => {
      if (res.statusCode !== 200) { reject(new Error(`Download failed: ${res.statusCode}`)); return; }
      const f = fs.createWriteStream(outputPath);
      res.pipe(f);
      f.on('finish', () => f.close(resolve));
      f.on('error', reject);
    });
    req.on('error', reject); req.end();
  });
}

async function convertWithIlovePDF(inputPath, outputPath, originalFilename, tool) {
  const token = await ilovepdfAuth();
  const { server, task } = await ilovepdfStartTask(token, tool);
  const serverFilename = await ilovepdfUpload(token, server, task, inputPath, originalFilename);
  await ilovepdfProcess(token, server, task, tool, serverFilename, originalFilename);
  await ilovepdfDownload(token, server, task, outputPath);
}

async function convertImageToPdf(imagePath, outputPath, ext) {
  const pdfDoc = await PDFDocument.create();
  const imgBuffer = fs.readFileSync(imagePath);
  const image = ext === '.png' ? await pdfDoc.embedPng(imgBuffer) : await pdfDoc.embedJpg(imgBuffer);
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  fs.writeFileSync(outputPath, await pdfDoc.save());
}

app.post('/api/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const inputPath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();
  const outputName = `${uuidv4()}.pdf`;
  const outputPath = path.join(OUTPUTS_DIR, outputName);
  try {
    if (['.jpg','.jpeg','.png','.webp'].includes(ext)) {
      await convertImageToPdf(inputPath, outputPath, ext);
    } else if (['.doc','.docx','.ppt','.pptx','.xls','.xlsx'].includes(ext)) {
      await convertWithIlovePDF(inputPath, outputPath, req.file.originalname, 'officepdf');
    } else if (ext === '.pdf') {
      fs.copyFileSync(inputPath, outputPath);
    } else {
      throw new Error(`Unsupported: ${ext}`);
    }
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    cleanupFile(outputPath);
    const stats = fs.statSync(outputPath);
    res.json({ success: true, filename: outputName, originalName: req.file.originalname, size: stats.size, downloadUrl: `/outputs/${outputName}` });
  } catch(err) {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/merge', upload.array('files', 20), async (req, res) => {
  if (!req.files || req.files.length < 2) return res.status(400).json({ success: false, error: 'Upload at least 2 PDFs' });
  const outputName = `merged_${uuidv4()}.pdf`;
  const outputPath = path.join(OUTPUTS_DIR, outputName);
  try {
    const mergedPdf = await PDFDocument.create();
    for (const file of req.files) {
      const pdf = await PDFDocument.load(fs.readFileSync(file.path));
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
      fs.unlinkSync(file.path);
    }
    fs.writeFileSync(outputPath, await mergedPdf.save());
    cleanupFile(outputPath);
    const stats = fs.statSync(outputPath);
    res.json({ success: true, filename: outputName, originalName: 'merged.pdf', size: stats.size, downloadUrl: `/outputs/${outputName}` });
  } catch(err) {
    req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/split', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const { pages } = req.body;
  const inputPath = req.file.path;
  try {
    const srcPdf = await PDFDocument.load(fs.readFileSync(inputPath));
    const totalPages = srcPdf.getPageCount();
    let pageIndices = pages && pages.trim()
      ? pages.split(',').flatMap(p => {
          p = p.trim();
          if (p.includes('-')) {
            const [s,e] = p.split('-').map(n => parseInt(n)-1);
            return Array.from({length: Math.min(e,totalPages-1)-s+1}, (_,i) => s+i);
          }
          return [parseInt(p)-1];
        }).filter(i => i >= 0 && i < totalPages)
      : Array.from({length: totalPages}, (_,i) => i);

    const results = [];
    for (const idx of pageIndices) {
      const newPdf = await PDFDocument.create();
      const [p] = await newPdf.copyPages(srcPdf, [idx]);
      newPdf.addPage(p);
      const outName = `page_${idx+1}_${uuidv4()}.pdf`;
      const outPath = path.join(OUTPUTS_DIR, outName);
      fs.writeFileSync(outPath, await newPdf.save());
      cleanupFile(outPath);
      results.push({ page: idx+1, filename: outName, downloadUrl: `/outputs/${outName}` });
    }
    fs.unlinkSync(inputPath);
    res.json({ success: true, pages: results, total: results.length });
  } catch(err) {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/compress', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const inputPath = req.file.path;
  const outputName = `compressed_${uuidv4()}.pdf`;
  const outputPath = path.join(OUTPUTS_DIR, outputName);
  try {
    const originalSize = fs.statSync(inputPath).size;
    await convertWithIlovePDF(inputPath, outputPath, req.file.originalname, 'compress');
    const compressedSize = fs.statSync(outputPath).size;
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    cleanupFile(outputPath);
    res.json({
      success: true, filename: outputName, originalName: req.file.originalname,
      originalSize, compressedSize,
      reduction: Math.round((1 - compressedSize / originalSize) * 100),
      downloadUrl: `/outputs/${outputName}`
    });
  } catch(err) {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', converter: 'ilovepdf-api', uptime: process.uptime() });
});

app.use((err, req, res, next) => {
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 PDF Converter Pro running at http://localhost:${PORT}`);
  console.log(`🔑 Using iLovePDF API for Word/PPT/Excel conversion\n`);
});
