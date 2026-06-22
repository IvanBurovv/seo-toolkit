/**
 * toolbar.js — Плавающий SEO-тулбар
 * Внедряется на все страницы, показывает основные SEO-метрики
 */

(function () {
  'use strict';

  // Предотвращаем двойное внедрение
  if (window.__seoToolkitToolbarInjected) return;
  window.__seoToolkitToolbarInjected = true;

  // Проверяем, включён ли тулбар в настройках
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || {};
    if (settings.showToolbar !== true) return;
    initToolbar();
  });

  // Слушаем сообщения от popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleToolbar') {
      const toolbar = document.getElementById('seo-toolkit-toolbar');
      if (toolbar) {
        toolbar.remove();
        sendResponse({ visible: false });
      } else {
        initToolbar();
        sendResponse({ visible: true });
      }
    }
    if (message.action === 'getPageSeoData') {
      sendResponse(collectSeoData());
    }
    return true;
  });

  function initToolbar() {
    // Собираем SEO-данные
    const seoData = collectSeoData();

    // Создаём контейнер
    const container = document.createElement('div');
    container.id = 'seo-toolkit-toolbar';
    container.innerHTML = generateToolbarHtml(seoData);

    document.body.appendChild(container);

    // Обработчики событий
    bindToolbarEvents(container);

    // Автосворачивание через 5 секунд бездействия
    let idleTimer;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      const toolbar = container.querySelector('.seo-toolbar');
      toolbar?.classList.remove('seo-toolbar--collapsed');
      idleTimer = setTimeout(() => {
        toolbar?.classList.add('seo-toolbar--collapsed');
      }, 8000);
    };

    container.addEventListener('mouseenter', resetIdleTimer);
    container.addEventListener('mouseleave', () => {
      clearTimeout(idleTimer);
      const toolbar = container.querySelector('.seo-toolbar');
      toolbar?.classList.add('seo-toolbar--collapsed');
    });

    resetIdleTimer();
  }

  function collectSeoData() {
    const data = {
      title: '',
      titleLength: 0,
      description: '',
      descLength: 0,
      h1Count: 0,
      h1Text: '',
      h2Count: 0,
      h3Count: 0,
      canonical: '',
      robots: '',
      noindex: false,
      ogTitle: '',
      ogDescription: '',
      pageSize: document.documentElement.outerHTML.length,
    };

    // Title
    const titleEl = document.querySelector('title');
    if (titleEl) {
      data.title = titleEl.textContent.trim();
      data.titleLength = data.title.length;
    }

    // Meta Description
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) {
      data.description = descEl.getAttribute('content') || '';
      data.descLength = data.description.length;
    }

    // Meta Robots
    const robotsEl = document.querySelector('meta[name="robots"]');
    if (robotsEl) {
      data.robots = robotsEl.getAttribute('content') || '';
      data.noindex = data.robots.toLowerCase().includes('noindex');
    }

    // Canonical
    const canonEl = document.querySelector('link[rel="canonical"]');
    if (canonEl) {
      data.canonical = canonEl.getAttribute('href') || '';
    }

    // H1
    const h1Els = document.querySelectorAll('h1');
    data.h1Count = h1Els.length;
    if (h1Els.length > 0) {
      data.h1Text = h1Els[0].textContent.trim();
    }

    // Другие заголовки
    data.h2Count = document.querySelectorAll('h2').length;
    data.h3Count = document.querySelectorAll('h3').length;

    // Open Graph
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl) {
      data.ogTitle = ogTitleEl.getAttribute('content') || '';
    }

    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl) {
      data.ogDescription = ogDescEl.getAttribute('content') || '';
    }

    return data;
  }

  function generateToolbarHtml(data) {
    const titleStatus = getTitleStatus(data.titleLength);
    const descStatus = getDescStatus(data.descLength);
    const h1Status = data.h1Count === 1 ? 'good' : data.h1Count === 0 ? 'bad' : 'warn';
    
    // Форматирование размера страницы
    let sizeText;
    if (data.pageSize < 1024) sizeText = data.pageSize + ' B';
    else if (data.pageSize < 1024 * 1024) sizeText = (data.pageSize / 1024).toFixed(1) + ' KB';
    else sizeText = (data.pageSize / (1024 * 1024)).toFixed(1) + ' MB';

    return `
      <div class="seo-toolbar seo-toolbar--collapsed">
        <button class="seo-toolbar__toggle" title="SEO Toolkit">🔧</button>
        <div class="seo-toolbar__content">
          <div class="seo-toolbar__metric seo-toolbar__metric--${titleStatus}" 
               title="Title: ${escapeHtml(data.title || 'Отсутствует')}">
            <span class="seo-toolbar__metric-icon">📝</span>
            <span class="seo-toolbar__metric-value">${data.titleLength}/60</span>
            <span class="seo-toolbar__metric-label">Title</span>
          </div>
          
          <div class="seo-toolbar__divider"></div>
          
          <div class="seo-toolbar__metric seo-toolbar__metric--${descStatus}"
               title="Description: ${escapeHtml(data.description || 'Отсутствует')}">
            <span class="seo-toolbar__metric-icon">📄</span>
            <span class="seo-toolbar__metric-value">${data.descLength}/170</span>
            <span class="seo-toolbar__metric-label">Desc</span>
          </div>
          
          <div class="seo-toolbar__divider"></div>
          
          <div class="seo-toolbar__metric seo-toolbar__metric--${h1Status}"
               title="H1: ${data.h1Count} шт. ${escapeHtml(data.h1Text || '')}">
            <span class="seo-toolbar__metric-icon">🔤</span>
            <span class="seo-toolbar__metric-value">H1:${data.h1Count}</span>
            <span class="seo-toolbar__metric-label">H2:${data.h2Count} H3:${data.h3Count}</span>
          </div>
          
          <div class="seo-toolbar__divider"></div>
          
          <div class="seo-toolbar__metric"
               title="Canonical: ${data.canonical || 'Отсутствует'} | Robots: ${data.robots || 'Не указан'}">
            <span class="seo-toolbar__metric-icon">${data.noindex ? '🚫' : '🔗'}</span>
            <span class="seo-toolbar__metric-value">${data.canonical ? '✅' : '⚠️'}</span>
            <span class="seo-toolbar__metric-label">Canon</span>
          </div>
          
          <div class="seo-toolbar__divider"></div>
          
          <div class="seo-toolbar__metric"
               title="Размер HTML: ${sizeText}">
            <span class="seo-toolbar__metric-icon">📦</span>
            <span class="seo-toolbar__metric-value">${sizeText}</span>
          </div>
        </div>
        <button class="seo-toolbar__close" title="Закрыть тулбар">✕</button>
      </div>
    `;
  }

  function bindToolbarEvents(container) {
    // Переключение свёрнутого состояния
    const toggle = container.querySelector('.seo-toolbar__toggle');
    const toolbar = container.querySelector('.seo-toolbar');
    
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toolbar.classList.toggle('seo-toolbar--collapsed');
    });

    // Клик по метрикам — копирование значения
    container.querySelectorAll('.seo-toolbar__metric').forEach(metric => {
      metric.addEventListener('click', () => {
        const title = metric.getAttribute('title') || '';
        navigator.clipboard.writeText(title).catch(() => {});
        
        // Визуальная обратная связь
        metric.style.transform = 'scale(0.95)';
        setTimeout(() => {
          metric.style.transform = '';
        }, 150);
      });
    });

    // Закрытие тулбара
    const closeBtn = container.querySelector('.seo-toolbar__close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      container.remove();
      
      // Сохраняем настройку
      chrome.storage.local.get('settings', (data) => {
        const settings = data.settings || {};
        settings.showToolbar = false;
        chrome.storage.local.set({ settings });
      });
    });
  }

  function getTitleStatus(length) {
    if (length === 0) return 'bad';
    if (length < 30) return 'warn';
    if (length > 60) return 'bad';
    if (length > 55) return 'warn';
    return 'good';
  }

  function getDescStatus(length) {
    if (length === 0) return 'bad';
    if (length < 70) return 'warn';
    if (length > 170) return 'bad';
    if (length > 160) return 'warn';
    return 'good';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();