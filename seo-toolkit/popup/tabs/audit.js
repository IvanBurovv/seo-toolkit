/**
 * audit.js — Вкладка "SEO-аудит страницы"
 */

const AuditTab = {
  elements: {},

  init() {
    this.elements = {
      currentUrlLabel: document.getElementById('auditCurrentUrl'),
      auditCurrentBtn: document.getElementById('btnAuditCurrent'),
      manualUrlInput: document.getElementById('auditManualUrl'),
      auditManualBtn: document.getElementById('btnAuditManual'),
      results: document.getElementById('auditResults'),
      copyBtn: document.getElementById('btnCopyAudit'),
    };

    // Обработчики
    this.elements.auditCurrentBtn.addEventListener('click', () => this.auditCurrentTab());
    this.elements.auditManualBtn.addEventListener('click', () => this.auditManualUrl());
    this.elements.manualUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.auditManualUrl();
    });
    this.elements.copyBtn.addEventListener('click', () => this.copyAuditResults());
  },

  updateCurrentUrl() {
    if (this.elements.currentUrlLabel && App.state.currentPageUrl) {
      this.elements.currentUrlLabel.textContent = 
        'Текущая вкладка: ' + App.truncateUrl(App.state.currentPageUrl, 55);
    }
  },

  async auditCurrentTab() {
    if (!App.state.currentPageUrl) {
      alert('Не удалось определить URL текущей вкладки');
      return;
    }
    await this.performAudit(App.state.currentPageUrl);
  },

  async auditManualUrl() {
    const url = this.elements.manualUrlInput.value.trim();
    if (!url) {
      alert('Введите URL для аудита');
      return;
    }
    await this.performAudit(url);
  },

  async performAudit(url) {
    App.updateStatus('🔍 Аудит страницы...');
    
    // Показываем лоадер
    this.elements.results.style.display = '';
    this.showLoading();

    try {
      const page = await ParserEngine.parsePage(url);

      if (page.httpStatus === 0 || page.error) {
        this.showError(`Не удалось загрузить страницу: ${page.error || 'Неизвестная ошибка'}`);
        App.updateStatus('❌ Ошибка аудита');
        return;
      }

      if (page.httpStatus === 404) {
        this.showError('Страница не найдена (404)');
        App.updateStatus('❌ 404 Not Found');
        return;
      }

      this.renderAuditResults(page, url);
      App.updateStatus('✅ Аудит завершён');

    } catch (error) {
      this.showError(`Ошибка: ${error.message}`);
      App.updateStatus('❌ Ошибка аудита');
    }
  },

  showLoading() {
    document.getElementById('titleValue').textContent = 'Загрузка...';
    document.getElementById('descValue').textContent = 'Загрузка...';
    document.getElementById('h1Value').textContent = 'Загрузка...';
  },

  showError(message) {
    document.getElementById('titleValue').textContent = message;
    document.getElementById('descValue').textContent = '';
    document.getElementById('h1Value').textContent = '';
  },

  renderAuditResults(page, url) {
    // === Title ===
    const titleResult = Validators.validateTitle(page.title);
    document.getElementById('titleValue').textContent = page.title || '(отсутствует)';
    document.getElementById('titleBadge').textContent = titleResult.badge;
    document.getElementById('titleBadge').className = 
      `audit-block__badge audit-block__badge--${titleResult.cssClass}`;
    document.getElementById('titleStats').textContent = 
      `${titleResult.length} симв. / ${titleResult.pixels} px`;
    document.getElementById('titleTip').textContent = titleResult.message;
    
    // Title meter
    const titleMeter = document.getElementById('titleMeter');
    const titlePercent = Math.min((titleResult.length / 60) * 100, 100);
    titleMeter.style.width = titlePercent + '%';
    titleMeter.className = `meter__bar meter__bar--${titleResult.cssClass}`;

    // === Description ===
    const descResult = Validators.validateDescription(page.description);
    document.getElementById('descValue').textContent = page.description || '(отсутствует)';
    document.getElementById('descBadge').textContent = descResult.badge;
    document.getElementById('descBadge').className = 
      `audit-block__badge audit-block__badge--${descResult.cssClass}`;
    document.getElementById('descStats').textContent = 
      `${descResult.length} симв. / ${descResult.pixels} px`;
    document.getElementById('descTip').textContent = descResult.message;
    
    // Desc meter
    const descMeter = document.getElementById('descMeter');
    const descPercent = Math.min((descResult.length / 170) * 100, 100);
    descMeter.style.width = descPercent + '%';
    descMeter.className = `meter__bar meter__bar--${descResult.cssClass}`;

    // === H1 ===
    const h1Text = page.h1 || page.h1List?.[0] || '';
    const h1Result = Validators.validateH1(h1Text);
    document.getElementById('h1Value').textContent = h1Text || '(отсутствует)';
    document.getElementById('h1Badge').textContent = h1Result.badge;
    document.getElementById('h1Badge').className = 
      `audit-block__badge audit-block__badge--${h1Result.cssClass}`;
    document.getElementById('h1Tip').textContent = h1Result.message;

    // Дополнительные H1
    if (page.h1List && page.h1List.length > 1) {
      document.getElementById('h1Tip').textContent += 
        ` ⚠️ Обнаружено несколько H1 (${page.h1List.length})!`;
    }

    // === Структура заголовков ===
    this.renderHeadingsStructure(page.headings);

    // === Дополнительно ===
    this.renderExtras(page, url);
  },

  renderHeadingsStructure(headings) {
    const container = document.getElementById('headingsStructure');
    if (!container) return;

    if (!headings) {
      container.innerHTML = '<span style="color:var(--text-muted);font-size:12px">Нет данных</span>';
      return;
    }

    container.innerHTML = '';
    const maxCount = Math.max(
      headings.h1 || 0,
      headings.h2 || 0,
      headings.h3 || 0,
      headings.h4 || 0,
      headings.h5 || 0,
      headings.h6 || 0,
      1
    );

    for (let i = 1; i <= 4; i++) {
      const count = headings[`h${i}`] || 0;
      const height = count > 0 ? Math.max((count / maxCount) * 50, 8) : 4;
      
      const bar = document.createElement('div');
      bar.className = `heading-bar heading-bar--h${i}`;
      bar.style.height = height + 'px';
      bar.title = `H${i}: ${count}`;
      
      const label = document.createElement('span');
      label.style.cssText = 'font-size:10px;text-align:center;color:var(--text-muted)';
      label.textContent = `H${i}`;
      
      const col = document.createElement('div');
      col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
      col.appendChild(bar);
      col.appendChild(label);
      
      container.appendChild(col);
    }

    // Счётчики
    const counts = document.createElement('div');
    counts.style.cssText = 'margin-left:12px;font-size:11px;color:var(--text-secondary)';
    counts.innerHTML = `
      H1: ${headings.h1 || 0} | 
      H2: ${headings.h2 || 0} | 
      H3: ${headings.h3 || 0} | 
      H4: ${headings.h4 || 0}
    `;
    container.appendChild(counts);
  },

  renderExtras(page, url) {
    const container = document.getElementById('auditExtras');
    if (!container) return;

    let html = '';

    // Canonical
    if (page.canonical) {
      const isSelfCanonical = page.canonical === url || page.canonical === page.url;
      html += `<span class="audit-extra ${isSelfCanonical ? 'audit-extra--good' : 'audit-extra--warn'}">
        ${isSelfCanonical ? '✅' : '⚠️'} Canonical: ${page.canonical}
      </span>`;
    } else {
      html += '<span class="audit-extra audit-extra--warn">⚠️ Нет canonical</span>';
    }

    // OG
    if (page.ogTitle || page.ogDescription) {
      html += '<span class="audit-extra audit-extra--good">✅ Open Graph</span>';
    } else {
      html += '<span class="audit-extra audit-extra--warn">⚠️ Нет Open Graph</span>';
    }

    // Status
    const statusEmoji = page.httpStatus === 200 ? '✅' : '⚠️';
    html += `<span class="audit-extra">${statusEmoji} HTTP ${page.httpStatus}</span>`;

    // Noindex
    if (page.noindex) {
      html += '<span class="audit-extra audit-extra--warn">⚠️ noindex</span>';
    }

    container.innerHTML = html;
  },

  async copyAuditResults() {
    const title = document.getElementById('titleValue')?.textContent || '';
    const desc = document.getElementById('descValue')?.textContent || '';
    const h1 = document.getElementById('h1Value')?.textContent || '';
    const titleBadge = document.getElementById('titleBadge')?.textContent || '';
    const descBadge = document.getElementById('descBadge')?.textContent || '';
    const h1Badge = document.getElementById('h1Badge')?.textContent || '';

    const text = `SEO Аудит страницы
==================
URL: ${App.state.currentPageUrl || ''}

Title (${titleBadge}): ${title}
Description (${descBadge}): ${desc}
H1 (${h1Badge}): ${h1}
`;

    try {
      await navigator.clipboard.writeText(text);
      App.updateStatus('📋 Аудит скопирован');
    } catch (e) {
      alert('Не удалось скопировать');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  AuditTab.init();
});

window.AuditTab = AuditTab;