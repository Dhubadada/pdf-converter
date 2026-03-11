/* ─── PDFCraft Pro – Frontend Script ─────────────────────────────── */

// ── Tool Config ──────────────────────────────────────────────────────
const TOOL_CONFIG = {
  'word-to-pdf': {
    title: 'Word to PDF',
    desc: 'Upload a .doc or .docx file to convert',
    accept: '.doc,.docx',
    multiple: false,
    endpoint: '/api/convert',
    color: '#3B82F6',
    icon: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="1.8" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><polyline stroke="currentColor" stroke-width="1.8" points="14 2 14 8 20 8"/></svg>`
  },
  'ppt-to-pdf': {
    title: 'PPT to PDF',
    desc: 'Upload a .ppt or .pptx file to convert',
    accept: '.ppt,.pptx',
    multiple: false,
    endpoint: '/api/convert',
    color: '#F97316',
    icon: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect stroke="currentColor" stroke-width="1.8" x="2" y="3" width="20" height="14" rx="2"/><line stroke="currentColor" stroke-width="1.8" x1="12" y1="17" x2="12" y2="21"/><line stroke="currentColor" stroke-width="1.8" x1="8" y1="21" x2="16" y2="21"/></svg>`
  },
  'jpg-to-pdf': {
    title: 'Image to PDF',
    desc: 'Upload a JPG, PNG, or WebP image to convert',
    accept: '.jpg,.jpeg,.png,.webp',
    multiple: false,
    endpoint: '/api/convert',
    color: '#10B981',
    icon: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect stroke="currentColor" stroke-width="1.8" x="3" y="3" width="18" height="18" rx="2"/><circle stroke="currentColor" stroke-width="1.8" cx="8.5" cy="8.5" r="1.5"/><polyline stroke="currentColor" stroke-width="1.8" points="21 15 16 10 5 21"/></svg>`
  },
  'merge-pdf': {
    title: 'Merge PDF',
    desc: 'Upload 2 or more PDF files to merge them',
    accept: '.pdf',
    multiple: true,
    endpoint: '/api/merge',
    color: '#8B5CF6',
    icon: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="1.8" d="M8 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/><rect stroke="currentColor" stroke-width="1.8" x="10" y="2" width="12" height="14" rx="2"/></svg>`
  },
  'compress-pdf': {
    title: 'Compress PDF',
    desc: 'Upload a PDF to reduce its file size',
    accept: '.pdf',
    multiple: false,
    endpoint: '/api/compress',
    color: '#EAB308',
    icon: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><polyline stroke="currentColor" stroke-width="1.8" points="8 17 12 21 16 17"/><line stroke="currentColor" stroke-width="1.8" x1="12" y1="12" x2="12" y2="21"/><path stroke="currentColor" stroke-width="1.8" d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>`
  },
  'split-pdf': {
    title: 'Split PDF',
    desc: 'Upload a PDF to extract individual pages',
    accept: '.pdf',
    multiple: false,
    endpoint: '/api/split',
    color: '#EF4444',
    icon: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><line stroke="currentColor" stroke-width="1.8" x1="6" y1="3" x2="6" y2="15"/><path stroke="currentColor" stroke-width="1.8" d="M20 9H6"/><path stroke="currentColor" stroke-width="1.8" d="M20 9l-4-4M20 9l-4 4M2 14l4 4-4 4"/></svg>`
  }
};

// ── State ────────────────────────────────────────────────────────────
let currentTool = 'word-to-pdf';
let selectedFiles = [];

// ── Elements ─────────────────────────────────────────────────────────
const dropzone    = document.getElementById('dropzone');
const fileInput   = document.getElementById('fileInput');
const dzIdle      = document.getElementById('dz-idle');
const dzFile      = document.getElementById('dz-file');
const dzFileList  = document.getElementById('dz-file-list');
const dzTypes     = document.getElementById('dz-types');
const btnClear    = document.getElementById('btn-clear');
const btnConvert  = document.getElementById('btn-convert');
const btnText     = btnConvert.querySelector('.btn-text');
const progressWrap = document.getElementById('progress-wrap');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const resultWrap  = document.getElementById('result-wrap');
const resultName  = document.getElementById('result-name');
const resultMeta  = document.getElementById('result-meta');
const btnDownload = document.getElementById('btn-download');
const btnAgain    = document.getElementById('btn-again');
const splitResults = document.getElementById('split-results');
const splitList   = document.getElementById('split-list');
const btnSplitAgain = document.getElementById('btn-split-again');
const errorWrap   = document.getElementById('error-wrap');
const errorMsg    = document.getElementById('error-msg');
const btnRetry    = document.getElementById('btn-retry');
const splitOptions = document.getElementById('split-options');
const wsIcon      = document.getElementById('ws-icon');
const wsTitle     = document.getElementById('ws-title');
const wsDesc      = document.getElementById('ws-desc');

// ── Tool Selection ────────────────────────────────────────────────────
document.querySelectorAll('.tool-card').forEach(card => {
  card.addEventListener('click', () => {
    const toolId = card.dataset.tool;
    selectTool(toolId);
    document.getElementById('workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function selectTool(toolId) {
  currentTool = toolId;
  const cfg = TOOL_CONFIG[toolId];

  // Update active card
  document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-tool="${toolId}"]`)?.classList.add('active');

  // Update workspace header
  wsIcon.innerHTML = cfg.icon;
  wsIcon.style.background = cfg.color + '20';
  wsIcon.style.color = cfg.color;
  wsTitle.textContent = cfg.title;
  wsDesc.textContent = cfg.desc;

  // Update file input
  fileInput.accept = cfg.accept;
  fileInput.multiple = cfg.multiple;
  dzTypes.textContent = 'Accepts: ' + cfg.accept;

  // Update convert button label
  btnText.textContent = toolId === 'merge-pdf' ? 'Merge PDFs'
    : toolId === 'compress-pdf' ? 'Compress PDF'
    : toolId === 'split-pdf' ? 'Split PDF'
    : 'Convert to PDF';

  // Show/hide split options
  if (toolId === 'split-pdf') {
    splitOptions.classList.remove('hidden');
  } else {
    splitOptions.classList.add('hidden');
  }

  // Accent color for dropzone hover
  dropzone.style.setProperty('--tool-color', cfg.color);

  resetState();
}

// ── File Handling ────────────────────────────────────────────────────
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  handleFiles(Array.from(e.dataTransfer.files));
});

fileInput.addEventListener('change', e => {
  handleFiles(Array.from(e.target.files));
  e.target.value = ''; // allow re-selecting same file
});

function handleFiles(files) {
  const cfg = TOOL_CONFIG[currentTool];
  const acceptedExts = cfg.accept.split(',').map(e => e.trim().toLowerCase());

  const valid = files.filter(f => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    return acceptedExts.includes(ext);
  });

  if (valid.length === 0) {
    showError(`Invalid file type. Please use: ${cfg.accept}`);
    return;
  }

  if (!cfg.multiple) {
    selectedFiles = [valid[0]];
  } else {
    selectedFiles = [...selectedFiles, ...valid];
  }

  renderFileList();
  hideAllPanels();
}

function renderFileList() {
  if (selectedFiles.length === 0) {
    dzIdle.classList.remove('hidden');
    dzFile.classList.add('hidden');
    btnConvert.disabled = true;
    return;
  }

  dzIdle.classList.add('hidden');
  dzFile.classList.remove('hidden');
  btnConvert.disabled = false;

  dzFileList.innerHTML = selectedFiles.map((f, i) => `
    <div class="dz-file-item">
      <span class="file-ext-badge">${f.name.split('.').pop().toUpperCase()}</span>
      <span class="file-name">${f.name}</span>
      <span class="file-size">${formatSize(f.size)}</span>
    </div>
  `).join('');
}

btnClear.addEventListener('click', resetState);

// ── Conversion ───────────────────────────────────────────────────────
btnConvert.addEventListener('click', startConversion);

async function startConversion() {
  if (selectedFiles.length === 0) return;
  const cfg = TOOL_CONFIG[currentTool];

  // Build form data
  const formData = new FormData();
  if (cfg.multiple) {
    selectedFiles.forEach(f => formData.append('files', f));
  } else {
    formData.append('file', selectedFiles[0]);
  }

  // Split pages
  if (currentTool === 'split-pdf') {
    const pages = document.getElementById('split-pages').value.trim();
    if (pages) formData.append('pages', pages);
  }

  // UI: show progress
  hideAllPanels();
  progressWrap.classList.remove('hidden');
  btnConvert.disabled = true;
  progressFill.classList.add('indeterminate');
  progressLabel.textContent = 'Uploading file…';

  try {
    // Simulated progress stages
    const progressStages = [
      { pct: null, label: 'Uploading file…' },    // indeterminate
      { pct: 60,   label: 'Converting…' },
      { pct: 90,   label: 'Finalizing PDF…' }
    ];

    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      stageIdx++;
      if (stageIdx < progressStages.length) {
        const s = progressStages[stageIdx];
        if (s.pct !== null) {
          progressFill.classList.remove('indeterminate');
          progressFill.style.width = s.pct + '%';
        }
        progressLabel.textContent = s.label;
      }
    }, 1800);

    const response = await fetch(cfg.endpoint, {
      method: 'POST',
      body: formData
    });

    clearInterval(stageTimer);
    progressFill.classList.remove('indeterminate');
    progressFill.style.width = '100%';
    progressLabel.textContent = 'Done!';

    const data = await response.json();

    await sleep(400);
    progressWrap.classList.add('hidden');

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Conversion failed');
    }

    // Handle result based on tool
    if (currentTool === 'split-pdf') {
      showSplitResults(data);
    } else {
      showResult(data);
    }

  } catch (err) {
    progressWrap.classList.add('hidden');
    showError(err.message);
  }
}

function showResult(data) {
  resultName.textContent = data.originalName
    ? data.originalName.replace(/\.[^.]+$/, '') + '.pdf'
    : data.filename;

  let meta = formatSize(data.size);
  if (data.reduction) {
    meta += ` · ${data.reduction}% smaller`;
  }
  if (data.compressedSize && data.originalSize) {
    meta = `${formatSize(data.originalSize)} → ${formatSize(data.compressedSize)} (${data.reduction}% reduction)`;
  }
  resultMeta.textContent = meta;

  btnDownload.href = data.downloadUrl;
  btnDownload.download = data.filename;

  resultWrap.classList.remove('hidden');
}

function showSplitResults(data) {
  splitList.innerHTML = data.pages.map(p => `
    <div class="split-item">
      <span class="split-page-num">Page ${p.page}</span>
      <span style="font-size:13px;color:var(--muted)">page_${p.page}.pdf</span>
      <a href="${p.downloadUrl}" download="page_${p.page}.pdf">Download →</a>
    </div>
  `).join('');
  splitResults.classList.remove('hidden');
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorWrap.classList.remove('hidden');
  btnConvert.disabled = selectedFiles.length === 0;
}

// ── Reset ────────────────────────────────────────────────────────────
btnAgain.addEventListener('click', resetState);
btnSplitAgain.addEventListener('click', resetState);
btnRetry.addEventListener('click', resetState);

function resetState() {
  selectedFiles = [];
  fileInput.value = '';
  progressFill.style.width = '0%';
  progressFill.classList.remove('indeterminate');
  hideAllPanels();
  renderFileList();
}

function hideAllPanels() {
  progressWrap.classList.add('hidden');
  resultWrap.classList.add('hidden');
  splitResults.classList.add('hidden');
  errorWrap.classList.add('hidden');
}

// ── Server Health Check ───────────────────────────────────────────────
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (!data.tools.libreoffice) {
      console.warn('LibreOffice not detected. Word/PPT conversion requires LibreOffice to be installed.');
    }
  } catch (e) {
    // Server might not be running in preview mode
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Init ─────────────────────────────────────────────────────────────
checkHealth();
selectTool('word-to-pdf');
