/**
 * parser-engine.js — Движок парсинга структуры сайта
 * Работает через chrome.runtime.sendMessage → service-worker
 * Собирает: URL, Title, Description, H1, HTTP-статус, canonical, robots
 */

const ParserEngine = {
  /**
   * Главная функция парсинга
   * @param {Object} options — настройки сканирования
   * @param {Function} onProgress — колбэк прогресса (current, total, url)
   * @param {Function} onPageParsed — колбэк на каждую страницу
   * @param {Function} onComplete — колбэк завершения
   * @param {Function} onError — колбэк ошибки
   */
  async scanSite(options, onProgress, onPageParsed, onComplete, onError) {
    const {
      domain,
      source = 'sitemap',   // 'sitemap' | 'crawl' | 'upload'
      uploadedUrls = [],
      filter404 = true,
      filterNoindex = true,
      filterPath = '',
      maxPages = 500,
      maxDepth = 3,
    } = options;

    let urls = [];

    try {
      // Шаг 1: Получаем список URL
      onProgress(0, 0, 'Получаем список страниц...');

      if (source === 'upload') {
        urls = uploadedUrls;
      } else if (source === 'sitemap') {
        urls = await this.fetchSitemap(domain);
        if (urls.length === 0) {
          // Если sitemap не найден, пробуем краул
          onProgress(0, 0, 'Sitemap не найден, пробуем краул...');
          urls = await this.crawlDomain(domain, maxDepth, maxPages);
        }
      } else {
        urls = await this.crawlDomain(domain, maxDepth, maxPages);
      }

      // Фильтрация URL
      if (filterPath) {
        urls = urls.filter(url => url.includes(filterPath));
      }

      // Ограничение количества
      urls = urls.slice(0, maxPages);
      
      // Убираем дубликаты
      urls = [...new Set(urls)];

      const total = urls.length;
      onProgress(0, total, `Найдено ${total} URL. Начинаем парсинг...`);

      // Шаг 2: Парсим каждую страницу
      const parsedPages = [];
      let errors = 0;

      // Парсим параллельно, но ограничиваем конкурентность
      const concurrency = 5;
      const batches = this.chunkArray(urls, concurrency);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const promises = batch.map(url => this.parsePage(url));

        const results = await Promise.allSettled(promises);

        for (const result of results) {
          if (result.status === 'fulfilled') {
            const page = result.value;
            
            // Фильтры
            if (filter404 && page.httpStatus === 404) {
              errors++;
              continue;
            }
            if (filter404 && page.httpStatus >= 400) {
              errors++;
              continue;
            }
            if (filterNoindex && page.robots === 'noindex') {
              errors++;
              continue;
            }

            parsedPages.push(page);
            onPageParsed(page);
          } else {
            errors++;
          }
        }

        const processed = Math.min((batchIndex + 1) * concurrency, total);
        onProgress(processed, total, `Обработано ${processed} из ${total}`);
      }

      // Шаг 3: Поиск дубликатов и проблем
      const duplicates = Validators.findDuplicates(parsedPages, 'title');
      const missingH1 = parsedPages.filter(p => !p.h1).length;
      const missingDesc = parsedPages.filter(p => !p.description).length;

      const warnings = [];
      if (duplicates.length > 0) {
        warnings.push({
          type: 'warning',
          message: `Найдено ${duplicates.length} дубликатов Title`,
          details: duplicates,
        });
      }
      if (missingH1 > 0) {
        warnings.push({
          type: 'warning',
          message: `${missingH1} страниц без H1`,
        });
      }
      if (missingDesc > 0) {
        warnings.push({
          type: 'warning',
          message: `${missingDesc} страниц без Description`,
        });
      }

      onComplete({
        pages: parsedPages,
        total: parsedPages.length,
        errors,
        warnings,
        domain,
      });

    } catch (error) {
      onError(error.message || 'Ошибка парсинга');
    }
  },

  /**
   * Парсинг одной страницы через chrome.runtime.sendMessage
   */
  async parsePage(url) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'fetchPage',
          url: url,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Неизвестная ошибка'));
          }
        }
      );
    });
  },

  /**
   * Получить sitemap.xml и извлечь URL
   */
  async fetchSitemap(domain) {
    const urls = [];
    const baseUrl = this.normalizeDomain(domain);
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemap-index.xml`,
      `${baseUrl}/wp-sitemap.xml`,
      `${baseUrl}/sitemap.php`,
    ];

    for (const sitemapUrl of sitemapUrls) {
      try {
        const result = await this.parsePage(sitemapUrl);
        
        if (result.httpStatus === 200 && result.rawHtml) {
          // Парсим XML sitemap
          const extractedUrls = this.extractUrlsFromSitemap(result.rawHtml, baseUrl);
          if (extractedUrls.length > 0) {
            urls.push(...extractedUrls);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    return urls;
  },

  /**
   * Извлечь URL из XML sitemap
   */
  extractUrlsFromSitemap(xml, baseUrl) {
    const urls = [];
    
    // Ищем <loc> теги
    const locRegex = /<loc>(.*?)<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      let url = match[1].trim();
      // Относительные URL делаем абсолютными
      if (url.startsWith('/')) {
        url = baseUrl + url;
      }
      if (url.startsWith('http')) {
        urls.push(url);
      }
    }

    // Если есть вложенные sitemap — рекурсивно не идём для простоты
    return urls;
  },

  /**
   * Краул домена — рекурсивный сбор ссылок
   */
  async crawlDomain(domain, maxDepth, maxPages) {
    const baseUrl = this.normalizeDomain(domain);
    const visited = new Set();
    const toVisit = [baseUrl];
    const allUrls = [];
    let depth = 0;

    while (toVisit.length > 0 && allUrls.length < maxPages && depth < maxDepth) {
      const currentLevel = [...toVisit];
      toVisit.length = 0;
      depth++;

      for (const url of currentLevel) {
        if (visited.has(url)) continue;
        if (allUrls.length >= maxPages) break;
        
        visited.add(url);

        try {
          const page = await this.parsePage(url);
          
          if (page.httpStatus === 200) {
            allUrls.push(url);

            // Извлекаем ссылки из HTML
            if (page.rawLinks && depth < maxDepth) {
              for (const link of page.rawLinks) {
                const absoluteLink = this.resolveUrl(link, baseUrl);
                if (
                  absoluteLink &&
                  absoluteLink.startsWith(baseUrl) &&
                  !visited.has(absoluteLink) &&
                  !this.isNonHtmlUrl(absoluteLink)
                ) {
                  toVisit.push(absoluteLink);
                }
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    return allUrls;
  },

  /**
   * Разрешить относительный URL в абсолютный
   */
  resolveUrl(url, baseUrl) {
    try {
      if (url.startsWith('http')) return url;
      if (url.startsWith('//')) return 'https:' + url;
      if (url.startsWith('/')) return baseUrl + url;
      if (url.startsWith('#')) return null;
      if (url.startsWith('mailto:')) return null;
      if (url.startsWith('tel:')) return null;
      if (url.startsWith('javascript:')) return null;
      return baseUrl + '/' + url;
    } catch (e) {
      return null;
    }
  },

  /**
   * Проверить, не является ли URL не-HTML ресурсом
   */
  isNonHtmlUrl(url) {
    const nonHtml = [
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
      '.css', '.js', '.json', '.xml', '.pdf', '.doc', '.docx',
      '.zip', '.rar', '.mp4', '.mp3', '.webm', '.woff', '.woff2',
      '.ttf', '.eot',
    ];
    return nonHtml.some(ext => url.toLowerCase().endsWith(ext));
  },

  /**
   * Нормализация домена
   */
  normalizeDomain(domain) {
    let url = domain.trim();
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    // Убираем trailing slash
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  },

  /**
   * Разбить массив на чанки
   */
  chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Извлечь доменное имя из URL
   */
  extractHostname(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url.replace(/^https?:\/\//, '').split('/')[0];
    }
  },
};

window.ParserEngine = ParserEngine;