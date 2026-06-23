// popup/tabs/pfgenerator.js
// Генератор TXT файла для запуска ПФ

class PFGeneratorTab {
  constructor(app) {
    this.app = app;
    this.generatedTxt = '';
    this.generatedFilename = 'pf_queries';
  }

  init() {
    this.app.updateStatus('📝 ПФ-Генератор готов');
    this.attachEventListeners();
    this.loadWordstatQueries();
  }

  attachEventListeners() {
    document.getElementById('pf-generate-txt-btn')?.addEventListener('click', () => this.generateTxt());
    document.getElementById('pf-download-txt-btn')?.addEventListener('click', () => this.downloadTxt());
    document.getElementById('pf-copy-txt-btn')?.addEventListener('click', () => this.copyTxt());
    
    // Кнопка загрузки из WordStat
    const loadBtn = document.getElementById('pf-load-wordstat-btn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.loadWordstatQueries());
    }
  }

  // Загружаем запросы, собранные в WordStat
  loadWordstatQueries() {
    chrome.storage.local.get(['wordstat_queries'], (result) => {
      const queries = result.wordstat_queries || [];
      
      if (queries.length === 0) {
        this.app.updateStatus('ℹ️ Нет сохранённых запросов. Откройте WordStat и нажимайте 📋', false);
        return;
      }
      
      const textarea = document.getElementById('pf-queries-input');
      if (textarea) {
        // Убираем пробелы из частот (486 361 → 486361)
        const cleaned = queries.map(q => {
          const parts = q.split('\t');
          if (parts.length === 2) {
            return parts[0] + '\t' + parts[1].replace(/\s/g, '');
          }
          return q.replace(/\s+/g, '\t').replace(/\t(\d)\s+(\d)/g, '\t$1$2');
        });
        
        textarea.value = cleaned.join('\n');
        this.app.updateStatus(`✅ Загружено ${queries.length} запросов из WordStat`, false);
      }
      
      // Очищаем хранилище после загрузки
      chrome.storage.local.set({ wordstat_queries: [] });
    });
  }

  generateTxt() {
    const queriesText = document.getElementById('pf-queries-input')?.value.trim();
    const geo = document.getElementById('pf-geo-input')?.value.trim() || '213';
    const domain = document.getElementById('pf-target-domain')?.value.trim();
    const filename = document.getElementById('pf-filename-input')?.value.trim() || 'pf_queries';

    if (!queriesText) {
      this.app.updateStatus('❌ Вставьте список запросов или соберите их в WordStat', true);
      return;
    }

    if (!domain) {
      this.app.updateStatus('❌ Укажите домен', true);
      return;
    }

    // Парсим строки
    const lines = queriesText.split('\n').filter(line => line.trim());
    const parsed = [];

    for (const line of lines) {
      let query, frequency;

      if (line.includes('\t')) {
        const parts = line.split('\t');
        query = parts[0].trim();
        frequency = parseInt(parts[parts.length - 1].trim().replace(/\s/g, '')) || 0;
      } else {
        const match = line.match(/^(.*?)\s+(\d[\d\s]*)$/);
        if (match) {
          query = match[1].trim();
          frequency = parseInt(match[2].replace(/\s/g, '')) || 0;
        } else {
          query = line.trim();
          frequency = 0;
        }
      }

      if (query) {
        const dailyFrequency = Math.max(1, Math.round(frequency / 30));
        parsed.push({ query, frequency, dailyFrequency });
      }
    }

    if (parsed.length === 0) {
      this.app.updateStatus('❌ Не удалось распарсить запросы', true);
      return;
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const txtLines = parsed.map(item =>
      `${cleanDomain};${item.query};${item.dailyFrequency};&lr=${geo}`
    );

    this.generatedTxt = txtLines.join('\n');
    this.generatedFilename = filename;

    document.getElementById('pf-txt-result').style.display = 'block';
    const preview = txtLines.slice(0, 10).join('\n');
    document.getElementById('pf-txt-preview').value = preview + (txtLines.length > 10 ? '\n...' : '');
    document.getElementById('pf-txt-count').textContent = txtLines.length;

    this.app.updateStatus(`✅ Сгенерировано ${txtLines.length} строк`);
  }

  downloadTxt() {
    if (!this.generatedTxt) {
      this.app.updateStatus('❌ Сначала сгенерируйте файл', true);
      return;
    }
    const blob = new Blob(['\ufeff' + this.generatedTxt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.generatedFilename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.app.updateStatus('📥 Файл скачан');
  }

  copyTxt() {
    if (!this.generatedTxt) {
      this.app.updateStatus('❌ Сначала сгенерируйте файл', true);
      return;
    }
    navigator.clipboard.writeText(this.generatedTxt).then(() => {
      this.app.updateStatus('📋 Скопировано');
    }).catch(() => {
      this.app.updateStatus('❌ Ошибка', true);
    });
  }

  destroy() {}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PFGeneratorTab;
}