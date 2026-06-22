/**
 * table-view.js — Компонент таблицы результатов
 */

const TableView = {
  /**
   * Заполнить таблицу результатов парсинга
   */
  populateResultsTable(pages, maxRows = 5) {
    const tbody = document.querySelector('#resultsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const displayPages = pages.slice(0, maxRows);

    displayPages.forEach((page, index) => {
      const tr = document.createElement('tr');
      
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td class="text-truncate" title="${this.escapeHtml(page.url)}">${this.truncateUrl(page.url)}</td>
        <td class="text-truncate" title="${this.escapeHtml(page.title || '')}">
          ${page.title ? this.truncateText(page.title, 40) : '<span class="text-muted">—</span>'}
        </td>
        <td>
          ${this.getStatusBadge(page)}
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Показать количество
    const totalEl = document.getElementById('resultsTotal');
    if (totalEl) {
      totalEl.textContent = `Показано ${Math.min(pages.length, maxRows)} из ${pages.length}`;
    }

    // Показать блок результатов
    const resultsEl = document.getElementById('scanResults');
    if (resultsEl) {
      resultsEl.style.display = '';
    }
  },

  /**
   * Детальная таблица в новой вкладке
   */
  openDetailView(pages) {
    const html = this.generateDetailHtml(pages);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url });
  },

  generateDetailHtml(pages) {
    const rows = pages.map((page, index) => {
      const titleValid = Validators.validateTitle(page.title);
      const descValid = Validators.validateDescription(page.description);
      
      return `
        <tr>
          <td>${index + 1}</td>
          <td><a href="${this.escapeHtml(page.url)}" target="_blank">${this.escapeHtml(this.truncateUrl(page.url, 60))}</a></td>
          <td class="${titleValid.cssClass === 'bad' ? 'cell-warn' : titleValid.cssClass === 'warn' ? 'cell-caution' : ''}">
            ${this.escapeHtml(page.title || '—')}
            <br><small>${titleValid.message}</small>
          </td>
          <td class="${descValid.cssClass === 'bad' ? 'cell-warn' : descValid.cssClass === 'warn' ? 'cell-caution' : ''}">
            ${this.escapeHtml(page.description || '—')}
            <br><small>${descValid.message}</small>
          </td>
          <td>${this.escapeHtml(page.h1 || '—')}</td>
          <td>${page.httpStatus || '?'}</td>
          <td>${page.canonical || '—'}</td>
          <td>${page.robots || '—'}</td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Результаты сканирования — SEO Toolkit</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 20px; max-width: 1400px; margin: 0 auto; }
    h1 { margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f0f0f0; padding: 8px 10px; text-align: left; position: sticky; top: 0; }
    td { padding: 8px 10px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
    tr:hover td { background: #fafafa; }
    a { color: #2563eb; }
    small { color: #888; font-size: 11px; }
    .cell-warn { background: #fee2e2; }
    .cell-caution { background: #fef3c7; }
    .summary { margin-bottom: 20px; color: #666; }
  </style>
</head>
<body>
  <h1>📊 Результаты сканирования</h1>
  <p class="summary">Всего страниц: ${pages.length} | Дата: ${new Date().toLocaleString('ru-RU')}</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>URL</th>
        <th>Title</th>
        <th>Description</th>
        <th>H1</th>
        <th>HTTP</th>
        <th>Canonical</th>
        <th>Robots</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
  },

  /**
   * Заполнить таблицу редиректов
   */
  populateRedirectTable(matches) {
    const tbody = document.querySelector('#redirectTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    matches.forEach(match => {
      const tr = document.createElement('tr');
      
      const sourceDisplay = this.extractPathDisplay(match.source);
      const targetDisplay = match.target ? this.extractPathDisplay(match.target) : '';
      
      let statusHtml;
      if (match.matched && match.matchMethod === 'exact_path') {
        statusHtml = '<span style="color:var(--success)">✅ Точное</span>';
      } else if (match.matched) {
        statusHtml = '<span style="color:var(--warning)">⚠️ Похожее</span>';
      } else {
        statusHtml = '<span style="color:var(--error)">❌ Не найдено</span>';
      }

      tr.innerHTML = `
        <td class="text-truncate" title="${this.escapeHtml(match.source)}">${this.escapeHtml(sourceDisplay)}</td>
        <td style="text-align:center">→</td>
        <td class="text-truncate" title="${this.escapeHtml(match.target)}">${this.escapeHtml(targetDisplay)}</td>
        <td>${statusHtml}</td>
      `;

      tbody.appendChild(tr);
    });

    // Статистика
    const matched = matches.filter(m => m.matched).length;
    const total = matches.length;
    const statsEl = document.getElementById('redirectMatchStats');
    if (statsEl) {
      statsEl.textContent = `Совпадений: ${matched}/${total} (${Math.round(matched/total*100)}%)`;
    }
  },

  // Вспомогательные методы
  getStatusBadge(page) {
    if (!page.title) return '<span style="color:var(--error)">❌ Нет Title</span>';
    const len = page.title.length;
    if (len > 60) return '<span style="color:var(--error)">❌ Длинный</span>';
    if (len < 30) return '<span style="color:var(--warning)">⚠️ Короткий</span>';
    return '<span style="color:var(--success)">✅ ОК</span>';
  },

  truncateUrl(url, maxLen = 35) {
    if (!url) return '';
    const cleaned = url.replace(/^https?:\/\//, '');
    if (cleaned.length <= maxLen) return cleaned;
    return cleaned.substring(0, maxLen - 3) + '...';
  },

  truncateText(text, maxLen = 40) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
  },

  extractPathDisplay(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch (e) {
      return url;
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};