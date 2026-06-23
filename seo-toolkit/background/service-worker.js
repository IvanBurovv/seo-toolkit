/**
 * service-worker.js — Фоновый процесс расширения
 * Обрабатывает fetch-запросы, парсит HTML, обходит CORS
 */

// Обработка сообщений от popup и content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchPage') {
    fetchAndParsePage(message.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Держим канал открытым для асинхронного ответа
  }

  if (message.action === 'fetchMultiplePages') {
    fetchMultiplePages(message.urls, message.concurrency || 5)
      .then(results => sendResponse({ success: true, results }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'getCurrentTabInfo') {
    getCurrentTabInfo()
      .then(info => sendResponse({ success: true, info }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'injectContentScript') {
    injectContentScript(message.tabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Основная функция — фетч и парсинг страницы
 */
async function fetchAndParsePage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 секунд таймаут

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOToolkit/2.1; +https://seo-toolkit.local)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const httpStatus = response.status;
    const finalUrl = response.url;
    const contentType = response.headers.get('content-type') || '';

    // Если это редирект — возвращаем информацию
    if (response.redirected) {
      return {
        url: finalUrl,
        originalUrl: url,
        httpStatus,
        isRedirect: true,
        redirectTarget: finalUrl,
        title: '',
        description: '',
        h1: '',
        canonical: '',
        robots: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        headings: {},
        rawLinks: [],
      };
    }

    // Если не HTML — возвращаем базовую информацию
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return {
        url: finalUrl,
        originalUrl: url,
        httpStatus,
        isHtml: false,
        title: '',
        description: '',
        h1: '',
        canonical: '',
        robots: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        headings: {},
        rawLinks: [],
      };
    }

    const html = await response.text();

    // Парсим HTML
    const parsed = parseHtml(html, finalUrl);

    return {
      url: finalUrl,
      originalUrl: url,
      httpStatus,
      isHtml: true,
      rawHtml: html, // Для sitemap и доп. обработки
      ...parsed,
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        url,
        httpStatus: 0,
        error: 'Timeout',
        title: '',
        description: '',
        h1: '',
        canonical: '',
        robots: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        headings: {},
        rawLinks: [],
      };
    }

    return {
      url,
      httpStatus: 0,
      error: error.message,
      title: '',
      description: '',
      h1: '',
      canonical: '',
      robots: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      headings: {},
      rawLinks: [],
    };
  }
}

/**
 * Множественный фетч с ограничением конкурентности
 */
async function fetchMultiplePages(urls, concurrency = 5) {
  const results = [];
  const batches = chunkArray(urls, concurrency);

  for (const batch of batches) {
    const promises = batch.map(url => 
      fetchAndParsePage(url).catch(err => ({
        url,
        httpStatus: 0,
        error: err.message,
        title: '',
        description: '',
        h1: '',
        canonical: '',
        robots: '',
      }))
    );
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Парсинг HTML — извлечение SEO-метаданных
 */
function parseHtml(html, baseUrl) {
  const result = {
    title: '',
    description: '',
    h1: '',
    h1List: [],
    canonical: '',
    robots: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    headings: {
      h1: 0,
      h2: 0,
      h3: 0,
      h4: 0,
      h5: 0,
      h6: 0,
    },
    rawLinks: [],
    noindex: false,
    nofollow: false,
  };

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    result.title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Meta Description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  if (descMatch) {
    result.description = decodeHtmlEntities(descMatch[1].trim());
  }

  // Meta Robots
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']robots["'][^>]*>/i);
  if (robotsMatch) {
    result.robots = robotsMatch[1].trim().toLowerCase();
    result.noindex = result.robots.includes('noindex');
    result.nofollow = result.robots.includes('nofollow');
  }

  // Canonical
  const canonMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i)
    || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i);
  if (canonMatch) {
    result.canonical = canonMatch[1].trim();
  }

  // Open Graph
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["'][^>]*>/i);
  if (ogTitleMatch) {
    result.ogTitle = decodeHtmlEntities(ogTitleMatch[1].trim());
  }

  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["'][^>]*>/i);
  if (ogDescMatch) {
    result.ogDescription = decodeHtmlEntities(ogDescMatch[1].trim());
  }

  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["'][^>]*>/i);
  if (ogImageMatch) {
    result.ogImage = ogImageMatch[1].trim();
  }

  // H1
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    result.h1 = stripTags(h1Match[1]).trim();
  }

  // Все H1 (может быть несколько)
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let h1m;
  while ((h1m = h1Regex.exec(html)) !== null) {
    result.h1List.push(stripTags(h1m[1]).trim());
  }

  // Подсчёт заголовков
  for (let i = 1; i <= 6; i++) {
    const regex = new RegExp(`<h${i}[^>]*>`, 'gi');
    const matches = html.match(regex);
    result.headings[`h${i}`] = matches ? matches.length : 0;
  }

  // Извлечение всех ссылок
  const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const href = linkMatch[1].trim();
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      result.rawLinks.push(href);
    }
  }

  return result;
}

/**
 * Получить информацию о текущей вкладке
 */
async function getCurrentTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('Вкладка не найдена');

  return {
    url: tab.url,
    title: tab.title,
    tabId: tab.id,
  };
}

/**
 * Инжектить content script во вкладку
 */
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/toolbar.js'],
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/toolbar.css'],
    });
  } catch (e) {
    console.warn('Не удалось внедрить content script:', e);
  }
}

// Вспомогательные функции
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'");
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, '');
}