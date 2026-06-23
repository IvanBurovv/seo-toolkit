/**
 * excel.js — Генерация XLSX файлов через SheetJS
 * Бесплатная библиотека, включена в проект (lib/xlsx.full.min.js)
 */

const Excel = {
  /**
   * Скачать XLSX со структурой сайта
   * @param {Array} pages — [{url, title, description, h1, status, ...}]
   * @param {String} domain — домен для имени файла
   */
  downloadPagesXlsx(pages, domain) {
    if (!pages || pages.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    // Подготавливаем данные
    const data = pages.map((page, index) => ({
      '#': index + 1,
      'URL': page.url || '',
      'Title': page.title || '',
      'Title длина': page.title ? page.title.length : 0,
      'Title статус': this.getTitleStatus(page.title),
      'Description': page.description || '',
      'Desc длина': page.description ? page.description.length : 0,
      'Desc статус': this.getDescStatus(page.description),
      'H1': page.h1 || '',
      'HTTP статус': page.httpStatus || '',
      'Canonical': page.canonical || '',
      'Robots': page.robots || '',
    }));

    // Создаём книгу
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Настраиваем ширину колонок
    const colWidths = [
      { wch: 4 },   // #
      { wch: 45 },  // URL
      { wch: 55 },  // Title
      { wch: 10 },  // Title длина
      { wch: 14 },  // Title статус
      { wch: 60 },  // Description
      { wch: 10 },  // Desc длина
      { wch: 14 },  // Desc статус
      { wch: 45 },  // H1
      { wch: 10 },  // HTTP статус
      { wch: 30 },  // Canonical
      { wch: 12 },  // Robots
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Структура сайта');

    // Генерируем имя файла
    const safeDomain = this.sanitizeFilename(domain);
    const date = new Date().toISOString().split('T')[0];
    const filename = `seo_structure_${safeDomain}_${date}.xlsx`;

    // Скачиваем
    XLSX.writeFile(wb, filename);
  },

  /**
   * Скачать XLSX с редиректами
   */
  downloadRedirectsXlsx(redirects, sourceDomain, targetDomain) {
    if (!redirects || redirects.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    const data = redirects.map((r, index) => ({
      '#': index + 1,
      'Старый URL': r.source || '',
      'Новый URL': r.target || '',
      'HTTP код': 301,
      'Статус': r.matched ? 'Сопоставлен' : 'Не сопоставлен',
      'Комментарий': r.comment || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 4 },
      { wch: 50 },
      { wch: 50 },
      { wch: 8 },
      { wch: 16 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, '301 Редиректы');

    const date = new Date().toISOString().split('T')[0];
    const filename = `redirects_301_${date}.xlsx`;
    XLSX.writeFile(wb, filename);
  },

  // Вспомогательные методы
  getTitleStatus(title) {
    if (!title) return 'Отсутствует';
    const len = title.length;
    if (len < 30) return 'Короткий';
    if (len > 60) return 'Длинный';
    return 'OK';
  },

  getDescStatus(desc) {
    if (!desc) return 'Отсутствует';
    const len = desc.length;
    if (len < 70) return 'Короткий';
    if (len > 170) return 'Длинный';
    return 'OK';
  },

  sanitizeFilename(name) {
    return name
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9а-яА-Я\-_.]/g, '_')
      .substring(0, 40);
  },
};

window.Excel = Excel;