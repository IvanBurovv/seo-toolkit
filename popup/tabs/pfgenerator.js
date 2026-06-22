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
  }

  attachEventListeners() {
    document.getElementById('pf-generate-txt-btn')?.addEventListener('click', () => this.generateTxt());
    document.getElementById('pf-download-txt-btn')?.addEventListener('click', () => this.downloadTxt());
    document.getElementById('pf-copy-txt-btn')?.addEventListener('click', () => this.copyTxt());
  }

  generateTxt() {
    const queriesText = document.getElementById('pf-queries-input')?.value.trim();
    const geo = document.getElementById('pf-geo-input')?.value.trim() || '213';
    const domain = document.getElementById('pf-target-domain')?.value.trim();
    const filename = document.getElementById('pf-filename-input')?.value.trim() || 'pf_queries';

    if (!queriesText) {
      this.app.updateStatus('❌ Вставьте список запросов', true);
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
        // Табуляция
        const parts = line.split('\t');
        query = parts[0].trim();
        frequency = parseInt(parts[parts.length - 1].trim()) || 0;
      } else {
        // Пробел: ищем последнее число
        const match = line.match(/^(.*?)\s+(\d+)\s*$/);
        if (match) {
          query = match[1].trim();
          frequency = parseInt(match[2]) || 0;
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
      this.app.updateStatus('❌ Не удалось распарсить запросы. Проверьте формат.', true);
      return;
    }

    // Формируем TXT
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const txtLines = parsed.map(item =>
      `${cleanDomain};${item.query};${item.dailyFrequency};&lr=${geo}`
    );

    this.generatedTxt = txtLines.join('\n');
    this.generatedFilename = filename;

    // Показываем результат
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
      this.app.updateStatus('📋 Скопировано в буфер');
    }).catch(() => {
      this.app.updateStatus('❌ Ошибка копирования', true);
    });
  }

  destroy() {}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PFGeneratorTab;
}