/**
 * parser.js — Вкладка "Парсер структуры сайта"
 */

const ParserTab = {
  elements: {},
  isScanning: false,

  init() {
    // Кешируем элементы
    this.elements = {
      domainInput: document.getElementById('parserDomain'),
      startBtn: document.getElementById('btnStartScan'),
      scanSource: document.getElementsByName('scanSource'),
      uploadFile: document.getElementById('uploadUrlsFile'),
      filter404: document.getElementById('filter404'),
      filterNoindex: document.getElementById('filterNoindex'),
      filterPath: document.getElementById('filterPath'),
      downloadXlsx: document.getElementById('btnDownloadXlsx'),
      copyResults: document.getElementById('btnCopyResults'),
      detailView: document.getElementById('btnDetailView'),
      rescan: document.getElementById('btnRescan'),
    };

    // Инициализация компонентов
    ProgressBar.init();
    WarningBadge.init();

    // Обработчики
    this.elements.startBtn.addEventListener('click', () => this.startScan());
    this.elements.domainInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.startScan();
    });
    this.elements.downloadXlsx.addEventListener('click', () => this.downloadXlsx());
    this.elements.copyResults.addEventListener('click', () => this.copyResults());
    this.elements.detailView.addEventListener('click', () => this.openDetailView());
    this.elements.rescan.addEventListener('click', () => this.resetScan());

    // Переключение источника сканирования
    this.elements.scanSource.forEach(radio => {
      radio.addEventListener('change', () => {
        const uploadInput = document.getElementById('uploadUrlsFile');
        if (radio.value === 'upload' && radio.checked) {
          uploadInput.style.display = '';
        } else {
          uploadInput.style.display = 'none';
        }
      });
    });

    // Загрузка файла URL
    this.elements.uploadFile.addEventListener('change', (e) => this.handleFileUpload(e));
  },

  async startScan() {
    if (this.isScanning) return;

    const domain = this.elements.domainInput.value.trim();
    if (!domain) {
      alert('Введите домен для сканирования');
      this.elements.domainInput.focus();
      return;
    }

    // Определяем источник
    let source = 'sitemap';
    this.elements.scanSource.forEach(radio => {
      if (radio.checked) source = radio.value;
    });

    // Проверяем загрузку файла
    let uploadedUrls = [];
    if (source === 'upload') {
      const file = this.elements.uploadFile.files[0];
      if (!file) {
        alert('Выберите файл с URL (CSV или TXT)');
        return;
      }
      uploadedUrls = await this.readUrlsFromFile(file);
      if (uploadedUrls.length === 0) {
        alert('Файл пуст или не содержит URL');
        return;
      }
    }

    // Нормализуем домен
    const normalizedDomain = ParserEngine.normalizeDomain(domain);
    this.elements.domainInput.value = normalizedDomain;

    // Сохраняем в историю
    App.addDomainToHistory(normalizedDomain);
    App.state.lastScannedDomain = normalizedDomain;

    // Скрываем предыдущие результаты
    this.hideResults();

    // Показываем прогресс
    this.isScanning = true;
    this.elements.startBtn.disabled = true;
    this.elements.startBtn.textContent = '⏳';
    ProgressBar.show();
    WarningBadge.hide();

    App.updateStatus('🔍 Сканирование...');

    const options = {
      domain: normalizedDomain,
      source,
      uploadedUrls,
      filter404: this.elements.filter404.checked,
      filterNoindex: this.elements.filterNoindex.checked,
      filterPath: this.elements.filterPath.value.trim(),
      maxPages: App.state.settings?.maxPages || 500,
      maxDepth: App.state.settings?.maxDepth || 3,
    };

    ParserEngine.scanSite(
      options,
      // onProgress
      (current, total, text) => {
        ProgressBar.update(current, total, text);
      },
      // onPageParsed
      (page) => {
        ProgressBar.pulse();
      },
      // onComplete
      (result) => {
        this.onScanComplete(result);
      },
      // onError
      (error) => {
        this.onScanError(error);
      }
    );
  },

  onScanComplete(result) {
    this.isScanning = false;
    this.elements.startBtn.disabled = false;
    this.elements.startBtn.textContent = '▶';

    const { pages, total, errors, warnings, domain } = result;

    // Сохраняем результаты
    App.state.scanResults = result;
    App.state.parsedPages = pages;

    // Обновляем прогресс
    ProgressBar.update(total, total, `Завершено!`);
    ProgressBar.setFound(total);
    ProgressBar.setErrors(errors);

    // Показываем результаты
    TableView.populateResultsTable(pages, 5);

    // Показываем предупреждения
    if (warnings && warnings.length > 0) {
      WarningBadge.show(warnings);
    } else {
      WarningBadge.show([{
        type: 'success',
        message: `✅ Всё хорошо! Обработано ${total} страниц без критических проблем.`,
      }]);
    }

    // Показываем кнопки действий
    this.showActions();

    App.updateStatus(`✅ Готово: ${total} страниц`);

    // Автоматически заполняем поле в Редиректах
    if (domain) {
      const redirectTargetInput = document.getElementById('redirectTarget');
      if (redirectTargetInput && !redirectTargetInput.value) {
        redirectTargetInput.value = domain;
      }
    }
  },

  onScanError(error) {
    this.isScanning = false;
    this.elements.startBtn.disabled = false;
    this.elements.startBtn.textContent = '▶';

    ProgressBar.hide();
    WarningBadge.show([{
      type: 'error',
      message: `❌ Ошибка: ${error}`,
    }]);

    App.updateStatus('❌ Ошибка сканирования');
  },

  hideResults() {
    document.getElementById('scanResults').style.display = 'none';
    document.getElementById('scanActions').style.display = 'none';
    WarningBadge.hide();
  },

  showActions() {
    document.getElementById('scanActions').style.display = '';
  },

  resetScan() {
    this.hideResults();
    ProgressBar.hide();
    WarningBadge.hide();
    App.state.scanResults = null;
    App.state.parsedPages = [];
    this.elements.startBtn.disabled = false;
    this.elements.startBtn.textContent = '▶';
    App.updateStatus('🟢 Готов к работе');
  },

  downloadXlsx() {
    if (!App.state.parsedPages || App.state.parsedPages.length === 0) {
      alert('Нет данных для экспорта. Сначала выполните сканирование.');
      return;
    }
    Excel.downloadPagesXlsx(
      App.state.parsedPages,
      App.state.lastScannedDomain || 'site'
    );
  },

  async copyResults() {
    if (!App.state.parsedPages || App.state.parsedPages.length === 0) {
      alert('Нет данных для копирования');
      return;
    }

    const text = App.state.parsedPages.map((p, i) => 
      `${i + 1}. ${p.url}\n   Title: ${p.title || '—'}\n   Desc: ${p.description || '—'}\n   H1: ${p.h1 || '—'}`
    ).join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      App.updateStatus('📋 Скопировано в буфер');
      setTimeout(() => {
        if (App.state.scanResults) {
          App.updateStatus(`✅ Готово: ${App.state.scanResults.total} страниц`);
        }
      }, 2000);
    } catch (e) {
      alert('Не удалось скопировать');
    }
  },

  openDetailView() {
    if (!App.state.parsedPages || App.state.parsedPages.length === 0) {
      alert('Нет данных для просмотра');
      return;
    }
    TableView.openDetailView(App.state.parsedPages);
  },

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const urls = await this.readUrlsFromFile(file);
    if (urls.length > 0) {
      App.updateStatus(`📁 Загружено ${urls.length} URL`);
    }
  },

  async readUrlsFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target.result;
        let urls = [];

        if (file.name.endsWith('.csv')) {
          // CSV — берём первый столбец
          const lines = content.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              // Берём значение до первой запятой или всю строку
              const firstCol = trimmed.split(',')[0].replace(/^"|"$/g, '').trim();
              if (firstCol.startsWith('http')) {
                urls.push(firstCol);
              }
            }
          }
        } else {
          // TXT — каждая строка = URL
          const lines = content.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.startsWith('http')) {
              urls.push(trimmed);
            }
          }
        }

        resolve(urls);
      };

      reader.onerror = () => resolve([]);
      reader.readAsText(file);
    });
  },
};

// Инициализация при загрузке popup
document.addEventListener('DOMContentLoaded', () => {
  ParserTab.init();
});

window.ParserTab = ParserTab;