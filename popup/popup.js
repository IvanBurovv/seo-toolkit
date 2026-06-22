/**
 * popup.js — Главный контроллер расширения
 * Роутинг вкладок, инициализация, общие обработчики
 */

const App = {
  // Состояние приложения
  state: {
    activeTab: 'parser',
    theme: 'light',
    currentPageUrl: '',
    lastScannedDomain: '',
    scanResults: null,      // Результаты последнего сканирования
    parsedPages: [],        // URL | Title | Description | H1
  },

  // Инициализация
  async init() {
    this.loadSettings();
    this.bindTabs();
    this.bindHeaderButtons();
    this.bindGlobalEvents();
    await this.getCurrentTabUrl();
    this.updateStatus('🟢 Готов к работе');
  },

  // Загрузка настроек из chrome.storage
  async loadSettings() {
    try {
      const data = await chrome.storage.local.get(['theme', 'scanHistory', 'settings', 'antipf_checklist']);
      
      // Тема
      if (data.theme === 'dark') {
        this.state.theme = 'dark';
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('btnTheme').textContent = '☀️';
      }

      // История доменов для автоподстановки
      if (data.scanHistory && Array.isArray(data.scanHistory)) {
        this.updateDomainHistory(data.scanHistory);
      }

      // Настройки
      this.state.settings = data.settings || {
        maxPages: 500,
        maxDepth: 3,
        defaultExport: 'xlsx',
        showToolbar: false,
      };
      
      // Сохраняем чек-лист анти-ПФ в localStorage
      if (data.antipf_checklist) {
        localStorage.setItem('antipf_checklist', JSON.stringify(data.antipf_checklist));
      }
    } catch (e) {
      console.warn('Не удалось загрузить настройки:', e);
    }
  },

  // Сохранение настроек
  async saveSettings() {
    try {
      await chrome.storage.local.set({ theme: this.state.theme });
    } catch (e) {
      console.warn('Не удалось сохранить настройки:', e);
    }
  },

  // Переключение вкладок
  bindTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });
  },

  switchTab(tabName) {
    // Очищаем предыдущую вкладку если нужно
    if (this.state.activeTab === 'antipf' && window.antiPFTabInstance) {
      window.antiPFTabInstance.destroy();
    }
    if (this.state.activeTab === 'pfgenerator' && window.pfGeneratorInstance) {
      window.pfGeneratorInstance.destroy();
    }

    // Обновляем кнопки вкладок
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
    const activeTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('tab--active');

    // Обновляем контент
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('tab-content--active'));
    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) activeContent.classList.add('tab-content--active');

    this.state.activeTab = tabName;

    // Инициализация специфичных вкладок при открытии
    if (tabName === 'audit') {
      this.updateAuditTabUrl();
    }
    if (tabName === 'antipf') {
      if (!window.antiPFTabInstance) {
        window.antiPFTabInstance = new AntiPFTab(this);
      }
      window.antiPFTabInstance.init();
    }
    if (tabName === 'pfgenerator') {
      if (!window.pfGeneratorInstance) {
        window.pfGeneratorInstance = new PFGeneratorTab(this);
      }
      window.pfGeneratorInstance.init();
    }
  },

  // Кнопки в шапке
  bindHeaderButtons() {
    // Тема
    document.getElementById('btnTheme').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Справка
    document.getElementById('btnHelp').addEventListener('click', () => {
      this.showHelp();
    });

    // Настройки
    document.getElementById('btnSettings').addEventListener('click', () => {
      this.showSettings();
    });
  },

  toggleTheme() {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    const btn = document.getElementById('btnTheme');
    
    if (this.state.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      btn.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      btn.textContent = '🌙';
    }
    
    this.saveSettings();
  },

  showHelp() {
    alert(
      '🔧 SEO Toolkit v2.3.0\n\n' +
      '📊 Парсер — сбор структуры сайта, Title, Description, H1\n' +
      '📋 Аудит — проверка SEO текущей страницы\n' +
      '🛡️ Анти-ПФ — проверка готовности сайта к ПФ и защита\n' +
      '📝 ПФ-Генератор — создание TXT файла для запуска ПФ\n\n' +
      'Горячие клавиши:\n' +
      'Ctrl+Shift+1 — Парсер\n' +
      'Ctrl+Shift+2 — Аудит\n' +
      'Ctrl+Shift+3 — Анти-ПФ\n' +
      'Ctrl+Shift+4 — ПФ-Генератор\n\n' +
      'По вопросам: support@seo-academy.ru'
    );
  },

  showSettings() {
    alert(
      '⚙ Настройки (будут в следующей версии)\n\n' +
      '• Лимит страниц: ' + (this.state.settings?.maxPages || 500) + '\n' +
      '• Глубина краула: ' + (this.state.settings?.maxDepth || 3) + '\n' +
      '• Экспорт по умолчанию: XLSX\n' +
      '• Тулбар на сайте: ' + (this.state.settings?.showToolbar ? 'вкл' : 'выкл')
    );
  },

  // Глобальные события
  bindGlobalEvents() {
    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case '1': e.preventDefault(); this.switchTab('parser'); break;
          case '2': e.preventDefault(); this.switchTab('audit'); break;
          case '3': e.preventDefault(); this.switchTab('antipf'); break;
          case '4': e.preventDefault(); this.switchTab('pfgenerator'); break;
        }
      }
    });
  },

  // Получить URL текущей активной вкладки браузера
  async getCurrentTabUrl() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        this.state.currentPageUrl = tab.url;
        const auditUrlElement = document.getElementById('auditCurrentUrl');
        if (auditUrlElement) {
          auditUrlElement.textContent = 'Текущая вкладка: ' + this.truncateUrl(tab.url, 50);
        }
      }
    } catch (e) {
      console.warn('Не удалось получить URL вкладки:', e);
    }
  },

  // Обновить URL во вкладке аудита
  updateAuditTabUrl() {
    const el = document.getElementById('auditCurrentUrl');
    if (el && this.state.currentPageUrl) {
      el.textContent = 'Текущая вкладка: ' + this.truncateUrl(this.state.currentPageUrl, 50);
    }
  },

  // Вспомогательные методы
  truncateUrl(url, maxLength = 40) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  },

  updateStatus(text, isError = false) {
    const statusEl = document.getElementById('statusText');
    if (statusEl) {
      statusEl.textContent = isError ? '🔴 ' + text : text;
    }
  },

  // Обновить историю доменов для datalist
  updateDomainHistory(history) {
    const datalist = document.getElementById('domainsHistory');
    if (!datalist) return;
    
    datalist.innerHTML = '';
    history.forEach(domain => {
      const option = document.createElement('option');
      option.value = domain;
      datalist.appendChild(option);
    });
  },

  // Добавить домен в историю
  async addDomainToHistory(domain) {
    try {
      const data = await chrome.storage.local.get('scanHistory');
      let history = data.scanHistory || [];
      
      // Убираем дубликат и добавляем в начало
      history = history.filter(d => d !== domain);
      history.unshift(domain);
      
      // Храним последние 20
      history = history.slice(0, 20);
      
      await chrome.storage.local.set({ scanHistory: history });
      this.updateDomainHistory(history);
    } catch (e) {
      console.warn('Не удалось сохранить историю:', e);
    }
  },

  // Сохранить чек-лист анти-ПФ
  async saveAntiPFChecklist(checklistData) {
    try {
      await chrome.storage.local.set({ antipf_checklist: checklistData });
      localStorage.setItem('antipf_checklist', JSON.stringify(checklistData));
    } catch (e) {
      console.warn('Не удалось сохранить чек-лист:', e);
    }
  },

  // Показать/скрыть элемент
  toggleElement(el, show) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.style.display = show ? '' : 'none';
  },

  // Форматирование даты
  formatDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  },
};

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Экспорт для доступа из других модулей
window.App = App;