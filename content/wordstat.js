// content/wordstat.js
// Добавляет кнопки сбора запросов в WordStat

(function() {
  'use strict';
  
  // Проверяем что мы на странице WordStat
  if (!window.location.href.includes('wordstat.yandex')) return;
  
  console.log('🔧 SEO Toolkit: WordStat helper started');
  
  let savedCount = 0;
  
  // Ждём загрузки таблицы
  function waitForTable() {
    const table = document.querySelector('table.table__wrapper tbody[role="rowgroup"]');
    
    if (table) {
      console.log('✅ Таблица WordStat найдена');
      addButtons();
      observeChanges();
      
      // Пробуем ещё раз через секунду (подгрузка данных)
      setTimeout(addButtons, 2000);
      setTimeout(addButtons, 5000);
    } else {
      console.log('⏳ Жду таблицу...');
      setTimeout(waitForTable, 500);
    }
  }
  
  function observeChanges() {
    const container = document.querySelector('.wordstat__table-wrapper');
    if (!container) return;
    
    const observer = new MutationObserver(() => {
      setTimeout(addButtons, 500);
    });
    
    observer.observe(container, { childList: true, subtree: true });
  }
  
  function addButtons() {
    const rows = document.querySelectorAll('table.table__wrapper tbody tr[role="row"]');
    
    console.log(`🔍 Найдено строк: ${rows.length}`);
    
    rows.forEach((row, index) => {
      // Проверяем, не добавлена ли уже кнопка
      if (row.querySelector('.seo-toolkit-add-btn')) return;
      
      const cells = row.querySelectorAll('td[role="cell"]');
      if (cells.length < 2) return;
      
      const queryCell = cells[0];
      const freqCell = cells[1];
      
      // Получаем текст запроса
      const queryLink = queryCell.querySelector('a');
      if (!queryLink) return;
      
      const query = queryLink.textContent.trim();
      
      // Получаем частоту и убираем пробелы
      let freq = freqCell.textContent.trim();
      freq = freq.replace(/\s/g, '');
      
      if (!query || !freq || isNaN(freq)) return;
      
      // Создаём кнопку "Добавить"
      const btn = document.createElement('button');
      btn.className = 'seo-toolkit-add-btn';
      btn.textContent = '+';
      btn.title = `Добавить "${query}" (${freq})`;
      btn.setAttribute('data-query', query);
      btn.setAttribute('data-freq', freq);
      btn.style.cssText = `
        display: inline-block;
        margin-left: 6px;
        padding: 1px 6px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        line-height: 1.4;
        opacity: 0.3;
        transition: opacity 0.2s;
        vertical-align: middle;
      `;
      
      // Показываем при наведении
      btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
      btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.3'; });
      
      // Всегда показываем первую кнопку
      if (index === 0) btn.style.opacity = '0.7';
      
      // Клик — сохраняем запрос
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const q = this.getAttribute('data-query');
        const f = this.getAttribute('data-freq');
        const data = q + '\t' + f;
        
        // Сохраняем в storage
        chrome.storage.local.get(['wordstat_queries'], (result) => {
          let queries = result.wordstat_queries || [];
          
          // Проверяем, нет ли дубликата
          const exists = queries.some(item => item.startsWith(q + '\t'));
          if (!exists) {
            queries.push(data);
            
            // Ограничиваем 500 запросов
            if (queries.length > 500) queries = queries.slice(-500);
            
            chrome.storage.local.set({ wordstat_queries: queries }, () => {
              savedCount = queries.length;
              
              // Визуальная обратная связь
              this.textContent = '✓';
              this.style.background = '#388E3C';
              this.style.opacity = '1';
              setTimeout(() => {
                this.textContent = '+';
                this.style.background = '#4CAF50';
                this.style.opacity = '0.3';
              }, 800);
              
              // Обновляем счётчик
              updateCounter();
              
              console.log(`✅ Добавлен запрос #${queries.length}: "${q}" (${f})`);
            });
          } else {
            // Уже есть — показываем что дубль
            this.textContent = '✓✓';
            this.style.background = '#FF9800';
            setTimeout(() => {
              this.textContent = '+';
              this.style.background = '#4CAF50';
              this.style.opacity = '0.3';
            }, 600);
          }
        });
      });
      
      // Добавляем кнопку в ячейку с частотой
      freqCell.appendChild(btn);
    });
    
    // Обновляем плавающий счётчик
    updateCounter();
  }
  
  // Плавающий счётчик и кнопка очистки
  function createCounter() {
    // Удаляем старый если есть
    const old = document.querySelector('.seo-toolkit-counter');
    if (old) old.remove();
    
    const counter = document.createElement('div');
    counter.className = 'seo-toolkit-counter';
    counter.innerHTML = `
      <span class="seo-toolkit-counter-text">📋 Собрано: <strong>0</strong></span>
      <button class="seo-toolkit-clear-btn" title="Очистить список">🗑</button>
    `;
    counter.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1a1a2e;
      color: white;
      padding: 10px 16px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: transform 0.2s, opacity 0.2s;
      cursor: default;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    // Кнопка очистки
    const clearBtn = counter.querySelector('.seo-toolkit-clear-btn');
    clearBtn.style.cssText = `
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
    `;
    clearBtn.addEventListener('mouseenter', () => {
      clearBtn.style.background = 'rgba(244,67,54,0.7)';
    });
    clearBtn.addEventListener('mouseleave', () => {
      clearBtn.style.background = 'rgba(255,255,255,0.15)';
    });
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.storage.local.set({ wordstat_queries: [] }, () => {
        savedCount = 0;
        updateCounter();
        console.log('🗑 Список запросов очищен');
        
        // Анимация
        counter.style.transform = 'scale(0.9)';
        setTimeout(() => { counter.style.transform = 'scale(1)'; }, 150);
      });
    });
    
    document.body.appendChild(counter);
    
    return counter;
  }
  
  function updateCounter() {
    const counter = document.querySelector('.seo-toolkit-counter');
    if (!counter) {
      createCounter();
      chrome.storage.local.get(['wordstat_queries'], (result) => {
        const count = (result.wordstat_queries || []).length;
        updateCounterDisplay(count);
      });
      return;
    }
    
    chrome.storage.local.get(['wordstat_queries'], (result) => {
      const count = (result.wordstat_queries || []).length;
      updateCounterDisplay(count);
    });
  }
  
  function updateCounterDisplay(count) {
    const counter = document.querySelector('.seo-toolkit-counter');
    if (!counter) return;
    
    const strong = counter.querySelector('strong');
    if (strong) strong.textContent = count;
    
    if (count > 0) {
      counter.style.opacity = '1';
      counter.style.display = 'flex';
    } else {
      counter.style.opacity = '0.5';
    }
  }
  
  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      waitForTable();
      createCounter();
    });
  } else {
    waitForTable();
    createCounter();
  }
  
})();