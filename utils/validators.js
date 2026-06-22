/**
 * validators.js — Валидаторы SEO-метрик
 * Проверка длины Title, Description, H1
 * Расчёт пиксельной ширины для Google-сниппетов
 */

const Validators = {
  // Лимиты
  LIMITS: {
    title: {
      minChars: 30,
      maxChars: 60,
      maxPixels: 600,
    },
    description: {
      minChars: 70,
      maxChars: 170,
      maxPixelsDesktop: 930,
      maxPixelsMobile: 680,
    },
    h1: {
      minChars: 1,
      maxChars: 70,
    },
  },

  /**
   * Расчёт примерной ширины текста в пикселях (Google-сниппет)
   * Приблизительная формула на основе Arial 18px для Title и 13px для Description
   */
  charWidths: {
    // Title: Arial 18px (примерные значения)
    title: {
      default: 10,
      wide: 12,    // W, M, Ш, Щ, Ж, Ю, Ы
      narrow: 5,   // i, l, I, 1, . , : ; '
      medium: 8,   // t, f, r
    },
    // Description: Arial 13px
    desc: {
      default: 7,
      wide: 9,
      narrow: 3,
      medium: 5,
    },
  },

  // Широкие символы (латиница + кириллица)
  wideChars: new Set('WwMmШшЩщЖжЮюЫыФф@%&'),
  
  // Узкие символы
  narrowChars: new Set('iIl1.,:;\'"!| '),
  
  // Средние символы
  mediumChars: new Set('tTrfJj'),

  /**
   * Подсчёт пикселей для Title
   */
  calcTitlePixels(text) {
    let pixels = 0;
    for (const char of text) {
      if (this.wideChars.has(char)) {
        pixels += this.charWidths.title.wide;
      } else if (this.narrowChars.has(char)) {
        pixels += this.charWidths.title.narrow;
      } else if (this.mediumChars.has(char)) {
        pixels += this.charWidths.title.medium;
      } else {
        pixels += this.charWidths.title.default;
      }
    }
    return pixels;
  },

  /**
   * Подсчёт пикселей для Description
   */
  calcDescPixels(text) {
    let pixels = 0;
    for (const char of text) {
      if (this.wideChars.has(char)) {
        pixels += this.charWidths.desc.wide;
      } else if (this.narrowChars.has(char)) {
        pixels += this.charWidths.desc.narrow;
      } else if (this.mediumChars.has(char)) {
        pixels += this.charWidths.desc.medium;
      } else {
        pixels += this.charWidths.desc.default;
      }
    }
    return pixels;
  },

  /**
   * Проверка Title
   * @returns {Object} { length, pixels, status, message, badge }
   */
  validateTitle(text) {
    if (!text || text.trim() === '') {
      return {
        length: 0,
        pixels: 0,
        status: 'bad',
        badge: '❌ Отсутствует',
        message: 'Title обязателен для SEO',
        cssClass: 'bad',
      };
    }

    const length = text.length;
    const pixels = this.calcTitlePixels(text);
    let status, badge, message, cssClass;

    if (length < this.LIMITS.title.minChars) {
      status = 'warn';
      badge = '⚠️ Короткий';
      message = `Слишком короткий: ${length} симв. Минимум 30. Добавьте ключевые слова.`;
      cssClass = 'warn';
    } else if (length > this.LIMITS.title.maxChars || pixels > this.LIMITS.title.maxPixels) {
      status = 'bad';
      badge = '❌ Длинный';
      message = `Будет обрезан! ${length} симв., ${pixels} px. Укоротите до 60 симв. / 600 px.`;
      cssClass = 'bad';
    } else if (length > this.LIMITS.title.maxChars - 5 || pixels > this.LIMITS.title.maxPixels - 50) {
      status = 'warn';
      badge = '⚠️ На границе';
      message = `На границе обрезки: ${length}/60 симв., ${pixels}/600 px.`;
      cssClass = 'warn';
    } else {
      status = 'good';
      badge = '✅ Норма';
      message = `Длина: ${length} симв., ${pixels} px — поместится полностью.`;
      cssClass = 'good';
    }

    return { length, pixels, status, badge, message, cssClass };
  },

  /**
   * Проверка Description
   */
  validateDescription(text, device = 'desktop') {
    const maxPixels = device === 'mobile' 
      ? this.LIMITS.description.maxPixelsMobile 
      : this.LIMITS.description.maxPixelsDesktop;

    if (!text || text.trim() === '') {
      return {
        length: 0,
        pixels: 0,
        status: 'bad',
        badge: '❌ Отсутствует',
        message: 'Description обязателен для сниппета',
        cssClass: 'bad',
      };
    }

    const length = text.length;
    const pixels = this.calcDescPixels(text);
    let status, badge, message, cssClass;

    if (length < this.LIMITS.description.minChars) {
      status = 'warn';
      badge = '⚠️ Короткий';
      message = `Короткий: ${length} симв. Минимум 70 для хорошего сниппета.`;
      cssClass = 'warn';
    } else if (length > this.LIMITS.description.maxChars || pixels > maxPixels) {
      status = 'bad';
      badge = '❌ Длинный';
      message = `Будет обрезан! ${length} симв., ${pixels} px. Укоротите.`;
      cssClass = 'bad';
    } else if (length > this.LIMITS.description.maxChars - 15 || pixels > maxPixels - 40) {
      status = 'warn';
      badge = '⚠️ На границе';
      message = `На границе обрезки: ${length}/170 симв., ${pixels}/${maxPixels} px.`;
      cssClass = 'warn';
    } else {
      status = 'good';
      badge = '✅ Норма';
      message = `Длина: ${length} симв., ${pixels} px — показывается полностью.`;
      cssClass = 'good';
    }

    return { length, pixels, status, badge, message, cssClass, maxPixels };
  },

  /**
   * Проверка H1
   */
  validateH1(text) {
    if (!text || text.trim() === '') {
      return {
        length: 0,
        status: 'bad',
        badge: '❌ Отсутствует',
        message: 'H1 обязателен на странице',
        cssClass: 'bad',
      };
    }

    const length = text.length;
    let status, badge, message, cssClass;

    if (length > this.LIMITS.h1.maxChars) {
      status = 'warn';
      badge = '⚠️ Длинный';
      message = `H1 длинный: ${length} симв. Рекомендуется до 70.`;
      cssClass = 'warn';
    } else {
      status = 'good';
      badge = '✅ Ок';
      message = `Длина: ${length} симв.`;
      cssClass = 'good';
    }

    return { length, status, badge, message, cssClass };
  },

  /**
   * Проверка наличия ключевого слова в начале Title
   */
  checkKeywordPosition(title, keyword) {
    if (!keyword || !title) return null;
    const pos = title.toLowerCase().indexOf(keyword.toLowerCase());
    if (pos === -1) return { found: false, message: 'Ключевое слово не найдено в Title' };
    if (pos > 10) return { found: true, nearStart: false, message: 'Ключевое слово далеко от начала Title' };
    return { found: true, nearStart: true, message: 'Ключевое слово в начале Title ✅' };
  },

  /**
   * Поиск дубликатов в массиве
   */
  findDuplicates(items, key = 'title') {
    const seen = new Map();
    const duplicates = [];

    items.forEach((item, index) => {
      const value = (item[key] || '').toLowerCase().trim();
      if (!value) return;
      
      if (seen.has(value)) {
        duplicates.push({
          value: item[key],
          firstIndex: seen.get(value),
          duplicateIndex: index,
        });
      } else {
        seen.set(value, index);
      }
    });

    return duplicates;
  },

  /**
   * Проверка структуры заголовков H1-H6
   */
  validateHeadingStructure(headings) {
    const warnings = [];
    let prevLevel = 0;

    headings.forEach((heading, index) => {
      const level = heading.level;
      
      // Пропуск уровней (например, H1 → H3 без H2)
      if (index > 0 && level > prevLevel + 1) {
        warnings.push({
          type: 'skip',
          message: `Пропущен уровень H${prevLevel + 1} перед H${level}`,
          index,
        });
      }

      prevLevel = level;
    });

    return warnings;
  },
};

window.Validators = Validators;