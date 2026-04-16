const STORAGE_KEY = 'food-memory-app-items-v2';
const LEGACY_STORAGE_KEY = 'food-memory-app-items-v1';
const SAMPLE_DATA_URL = './sample-food-items.json';

let items = loadItems().map(normalizeLoadedItem);
let editingId = null;

const els = {
  listSection: document.getElementById('listSection'),
  statsSection: document.getElementById('statsSection'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  sortSelect: document.getElementById('sortSelect'),
  foodDialog: document.getElementById('foodDialog'),
  importDialog: document.getElementById('importDialog'),
  foodForm: document.getElementById('foodForm'),
  quickAddForm: document.getElementById('quickAddForm'),
  dialogTitle: document.getElementById('dialogTitle'),
  categoryList: document.getElementById('categoryList'),
  fileInput: document.getElementById('fileInput'),
  foodCardTemplate: document.getElementById('foodCardTemplate'),
  statCardTemplate: document.getElementById('statCardTemplate'),
};

bindEvents();
render();
registerServiceWorker();
bootstrapSampleData();

function bindEvents() {
  document.getElementById('openAddBtn').addEventListener('click', () => openFoodDialog());
  document.getElementById('openImportBtn').addEventListener('click', openImportDialog);
  document.getElementById('emptyAddBtn').addEventListener('click', () => openFoodDialog());
  document.getElementById('emptyImportBtn').addEventListener('click', openImportDialog);
  document.getElementById('closeDialogBtn').addEventListener('click', closeFoodDialog);
  document.getElementById('cancelBtn').addEventListener('click', closeFoodDialog);
  document.getElementById('closeImportBtn').addEventListener('click', closeImportDialog);
  document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
  document.getElementById('seedBtn').addEventListener('click', seedDemoData);
  document.getElementById('resetBtn').addEventListener('click', resetAll);
  document.getElementById('downloadSampleBtn').addEventListener('click', downloadSampleJSON);
  document.getElementById('downloadCsvSampleBtn').addEventListener('click', downloadSampleCSV);

  els.searchInput.addEventListener('input', render);
  els.categoryFilter.addEventListener('change', render);
  els.sortSelect.addEventListener('change', render);
  els.foodForm.addEventListener('submit', onSubmitFoodForm);
  els.quickAddForm.addEventListener('submit', onSubmitQuickAddForm);
  els.fileInput.addEventListener('change', onImportFile);
}

function loadItems() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      return JSON.parse(current);
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    return JSON.parse(legacy || '[]');
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function bootstrapSampleData() {
  if (items.length) {
    return;
  }

  try {
    items = await loadSampleItems();
    saveItems();
    render();
  } catch (error) {
    console.error('Failed to load sample items:', error);
  }
}

function render() {
  renderFilters();
  const filtered = getFilteredItems();
  renderStats(filtered);
  renderList(filtered);
  els.emptyState.classList.toggle('hidden', items.length !== 0);
}

function renderFilters() {
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const current = els.categoryFilter.value;

  els.categoryFilter.innerHTML = `
    <option value="">全部分類</option>
    ${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}
  `;
  els.categoryFilter.value = categories.includes(current) ? current : '';
  els.categoryList.innerHTML = categories
    .map(category => `<option value="${escapeHtml(category)}"></option>`)
    .join('');
}

function getFilteredItems() {
  const query = els.searchInput.value.trim().toLowerCase();
  const category = els.categoryFilter.value;

  const result = items.filter(item => {
    const haystack = [
      item.shopName,
      item.foodName,
      item.category,
      item.address,
      item.reason,
      item.note,
      item.source,
    ].join(' ').toLowerCase();

    return (!query || haystack.includes(query)) && (!category || item.category === category);
  });

  switch (els.sortSelect.value) {
    case 'visited-desc':
      result.sort((a, b) => new Date(b.visitedAt || 0) - new Date(a.visitedAt || 0));
      break;
    case 'rating-desc':
      result.sort((a, b) => Number(b.rating) - Number(a.rating));
      break;
    case 'rating-asc':
      result.sort((a, b) => Number(a.rating) - Number(b.rating));
      break;
    case 'shop-asc':
      result.sort((a, b) => (a.shopName || '').localeCompare(b.shopName || '', 'zh-Hant'));
      break;
    default:
      result.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }

  return result;
}

function renderStats(filtered) {
  const total = items.length;
  const revisits = items.filter(item => item.revisit).length;
  const mapped = items.filter(item => item.googleMapUrl || item.address).length;
  const avgRating = total
    ? (items.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total).toFixed(1)
    : '0.0';

  const data = [
    ['總收藏數', total],
    ['目前顯示', filtered.length],
    ['平均評分', avgRating],
    ['可開地圖', mapped],
    ['想再回訪', revisits],
  ];

  els.statsSection.innerHTML = '';
  data.forEach(([label, value]) => {
    const node = els.statCardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.stat-label').textContent = label;
    node.querySelector('.stat-value').textContent = value;
    els.statsSection.appendChild(node);
  });
}

function renderList(list) {
  els.listSection.innerHTML = '';

  if (!list.length && items.length) {
    els.listSection.innerHTML = `
      <section class="empty card">
        <div class="empty-emoji">🔎</div>
        <h2>目前沒有符合條件的結果</h2>
        <p>可以換個關鍵字、分類，或直接新增一筆新的美食紀錄。</p>
      </section>
    `;
    return;
  }

  list.forEach(item => {
    const card = els.foodCardTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector('.food-title').textContent = item.foodName || '未命名餐點';
    card.querySelector('.food-shop').textContent = item.shopName || '未命名店家';
    card.querySelector('.rating-badge').textContent = `${'★'.repeat(Number(item.rating || 0))} ${item.rating || 0}/5`;
    card.querySelector('.food-reason').textContent = item.reason || '還沒寫下喜歡它的理由。';

    const noteEl = card.querySelector('.food-note');
    if (item.note) {
      noteEl.classList.remove('hidden');
      noteEl.textContent = `備註：${item.note}`;
    }

    card.querySelector('.food-meta').innerHTML = buildMetaMarkup(item);

    const tagRow = card.querySelector('.tag-row');
    const tags = [
      item.category || '未分類',
      item.revisit ? '值得回訪' : '先收藏',
      item.sourceLabel,
    ].filter(Boolean);

    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tagRow.appendChild(span);
    });

    card.querySelector('.action-map').disabled = !item.googleMapUrl && !item.address && !item.shopName;
    card.querySelector('.action-map').addEventListener('click', () => openMap(item));
    card.querySelector('.action-edit').addEventListener('click', () => openFoodDialog(item));
    card.querySelector('.action-delete').addEventListener('click', () => deleteItem(item.id));
    els.listSection.appendChild(card);
  });
}

function buildMetaMarkup(item) {
  const parts = [];

  if (item.address) {
    parts.push(`<span>地址：${escapeHtml(item.address)}</span>`);
  }
  if (item.visitedAt) {
    parts.push(`<span>最近去吃：${escapeHtml(formatDate(item.visitedAt))}</span>`);
  }
  if (item.updatedAt) {
    parts.push(`<span>更新時間：${escapeHtml(formatDateTime(item.updatedAt))}</span>`);
  }

  return parts.join('<span class="dot">•</span>') || '<span>還沒有補上地址或時間資訊</span>';
}

function openFoodDialog(item = null) {
  editingId = item?.id || null;
  els.dialogTitle.textContent = editingId ? '編輯美食紀錄' : '新增美食紀錄';
  els.foodForm.reset();

  if (item) {
    Object.entries({
      shopName: item.shopName,
      foodName: item.foodName,
      category: item.category,
      rating: String(item.rating || 5),
      address: item.address,
      googleMapUrl: item.googleMapUrl,
      visitedAt: item.visitedAt,
      source: item.source,
      reason: item.reason,
      note: item.note,
      revisit: String(Boolean(item.revisit)),
    }).forEach(([key, value]) => {
      if (els.foodForm.elements[key]) {
        els.foodForm.elements[key].value = value ?? '';
      }
    });
  } else {
    els.foodForm.elements.rating.value = '5';
    els.foodForm.elements.revisit.value = 'true';
    els.foodForm.elements.source.value = 'manual';
  }

  els.foodDialog.showModal();
}

function closeFoodDialog() {
  editingId = null;
  els.foodDialog.close();
}

function openImportDialog() {
  els.importDialog.showModal();
}

function closeImportDialog() {
  els.fileInput.value = '';
  els.importDialog.close();
}

function onSubmitQuickAddForm(event) {
  event.preventDefault();
  const formData = new FormData(els.quickAddForm);
  const now = new Date().toISOString();

  items.unshift(normalizeLoadedItem({
    id: crypto.randomUUID(),
    shopName: formData.get('shopName')?.toString().trim(),
    foodName: formData.get('foodName')?.toString().trim(),
    category: formData.get('category')?.toString().trim(),
    address: '',
    googleMapUrl: '',
    rating: 5,
    visitedAt: '',
    source: 'manual',
    reason: '',
    note: '',
    revisit: true,
    createdAt: now,
    updatedAt: now,
  }));

  saveItems();
  els.quickAddForm.reset();
  render();
}

function onSubmitFoodForm(event) {
  event.preventDefault();
  const formData = new FormData(els.foodForm);
  const now = new Date().toISOString();
  const original = items.find(item => item.id === editingId);

  const payload = normalizeLoadedItem({
    id: editingId || crypto.randomUUID(),
    shopName: formData.get('shopName')?.toString().trim(),
    foodName: formData.get('foodName')?.toString().trim(),
    category: formData.get('category')?.toString().trim(),
    address: formData.get('address')?.toString().trim(),
    googleMapUrl: formData.get('googleMapUrl')?.toString().trim(),
    rating: Number(formData.get('rating') || 5),
    visitedAt: formData.get('visitedAt')?.toString().trim(),
    source: formData.get('source')?.toString().trim() || 'manual',
    reason: formData.get('reason')?.toString().trim(),
    note: formData.get('note')?.toString().trim(),
    revisit: formData.get('revisit') === 'true',
    createdAt: original?.createdAt || now,
    updatedAt: now,
  });

  if (editingId) {
    items = items.map(item => item.id === editingId ? payload : item);
  } else {
    items.unshift(payload);
  }

  saveItems();
  closeFoodDialog();
  render();
}

function deleteItem(id) {
  if (!confirm('確定要刪除這筆美食紀錄嗎？')) {
    return;
  }

  items = items.filter(item => item.id !== id);
  saveItems();
  render();
}

function openMap(item) {
  const directUrl = item.googleMapUrl?.trim();
  const query = [item.shopName, item.foodName, item.address].filter(Boolean).join(' ');
  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(directUrl || fallbackUrl, '_blank', 'noopener');
}

async function onImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const imported = file.name.toLowerCase().endsWith('.json')
      ? parseImportedJson(text)
      : parseCsv(text);
    const now = new Date().toISOString();

    const normalized = imported
      .map(row => normalizeImportedItem(row, now))
      .filter(Boolean)
      .map(normalizeLoadedItem);

    items = [...normalized, ...items];
    saveItems();
    render();
    closeImportDialog();
    alert(`成功匯入 ${normalized.length} 筆資料。`);
  } catch (error) {
    alert(`匯入失敗：${error.message}`);
  }
}

function normalizeImportedItem(row, now) {
  if (!row.shopName && !row.foodName) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    shopName: `${row.shopName || ''}`.trim(),
    foodName: `${row.foodName || ''}`.trim(),
    category: `${row.category || ''}`.trim(),
    address: `${row.address || ''}`.trim(),
    googleMapUrl: `${row.googleMapUrl || ''}`.trim(),
    rating: Number(row.rating || 5),
    visitedAt: `${row.visitedAt || ''}`.trim(),
    source: `${row.source || 'import'}`.trim() || 'import',
    reason: `${row.reason || ''}`.trim(),
    note: `${row.note || ''}`.trim(),
    revisit: parseBoolean(row.revisit, true),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeLoadedItem(item) {
  return {
    id: item.id || crypto.randomUUID(),
    shopName: `${item.shopName || ''}`.trim(),
    foodName: `${item.foodName || ''}`.trim(),
    category: `${item.category || ''}`.trim(),
    address: `${item.address || ''}`.trim(),
    googleMapUrl: `${item.googleMapUrl || ''}`.trim(),
    rating: clampRating(item.rating),
    visitedAt: normalizeDateInput(item.visitedAt),
    source: `${item.source || 'manual'}`.trim() || 'manual',
    sourceLabel: sourceToLabel(item.source),
    reason: `${item.reason || ''}`.trim(),
    note: `${item.note || ''}`.trim(),
    revisit: parseBoolean(item.revisit, true),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

function parseImportedJson(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error('JSON 檔案格式必須是陣列。');
  }
  return data;
}

async function fetchSampleItems() {
  const response = await fetch(SAMPLE_DATA_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`無法讀取示範資料：${response.status}`);
  }

  return parseImportedJson(await response.text());
}

async function loadSampleItems() {
  const imported = await fetchSampleItems();
  const now = new Date().toISOString();

  return imported
    .map(row => normalizeImportedItem(row, now))
    .filter(Boolean)
    .map(normalizeLoadedItem);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) {
    return [];
  }

  const [headerLine, ...rows] = lines;
  const headers = splitCsvLine(headerLine).map(value => value.trim());

  return rows.map(line => {
    const values = splitCsvLine(line);
    return headers.reduce((record, key, index) => {
      record[key] = values[index] ?? '';
      return record;
    }, {});
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function exportJSON() {
  downloadFile('food-memory-export.json', JSON.stringify(items, null, 2), 'application/json');
}

async function seedDemoData() {
  if (!confirm('要載入示範資料嗎？這會用示範資料取代你目前的清單。')) {
    return;
  }

  try {
    items = await loadSampleItems();
    saveItems();
    render();
  } catch (error) {
    alert(`載入示範資料失敗：${error.message}`);
  }
}

function resetAll() {
  if (!confirm('確定要清空全部資料嗎？這個動作無法復原。')) {
    return;
  }

  items = [];
  saveItems();
  render();
}

function downloadSampleJSON() {
  window.open(SAMPLE_DATA_URL, '_blank', 'noopener');
}

async function downloadSampleCSV() {
  const header = 'shopName,foodName,category,address,googleMapUrl,rating,reason,note,revisit,visitedAt,source';
  try {
    const sampleItems = await fetchSampleItems();
    const rows = sampleItems.map(item => [
      item.shopName,
      item.foodName,
      item.category,
      item.address,
      item.googleMapUrl,
      item.rating,
      item.reason,
      item.note,
      item.revisit,
      item.visitedAt,
      item.source,
    ].map(csvEscape).join(','));

    downloadFile('sample-food-items.csv', [header, ...rows].join('\n'), 'text/csv;charset=utf-8');
  } catch (error) {
    alert(`下載 CSV 範例失敗：${error.message}`);
  }
}

function csvEscape(value) {
  const text = `${value ?? ''}`;
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function clampRating(value) {
  const rating = Number(value || 5);
  return Math.min(5, Math.max(1, Number.isFinite(rating) ? rating : 5));
}

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value).toLowerCase() !== 'false';
}

function normalizeDateInput(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium' }).format(date);
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function sourceToLabel(source) {
  switch (`${source || 'manual'}`.trim()) {
    case 'import':
      return '匯入資料';
    case 'friend':
      return '朋友推薦';
    case 'social':
      return '社群收藏';
    default:
      return '手動新增';
  }
}

function escapeHtml(text) {
  return `${text}`.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
