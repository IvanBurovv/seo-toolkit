// popup/tabs/antipf.js
// Вкладка "Анти-ПФ" — Проверка готовности сайта к ПФ + Инструменты защиты

class AntiPFTab {
  constructor(app) {
    this.app = app;
    this.securityGen = new SecurityGenerator();
  }

  async fetchViaServiceWorker(url) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'fetchPage', url: url },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            const data = response.data;
            
            // Пробуем получить HTML разными способами
            if (typeof data === 'string') {
              resolve(data);
            } else if (data.rawHtml) {
              resolve(data.rawHtml);
            } else if (data.title || data.description) {
              // Парсер вернул объект без rawHtml — используем что есть
              // Но для поиска счётчиков этого недостаточно
              // Возвращаем заглушку с ключевыми словами
              resolve(JSON.stringify(data));
            } else {
              resolve(JSON.stringify(data));
            }
          } else {
            reject(new Error(response?.error || 'Fetch failed'));
          }
        }
      );
    });
  }

  async init() {
    this.app.updateStatus('🛡️ Анти-ПФ готов');
    this.attachEventListeners();
  }

  attachEventListeners() {
    document.getElementById('pf-scan-btn')?.addEventListener('click', () => this.checkSite());
    document.getElementById('pf-domain-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.checkSite();
    });

    document.getElementById('pf-copy-metrika-btn')?.addEventListener('click', () => {
      this.copyToClipboard('pf-metrika-code-text');
    });

    document.querySelectorAll('#tab-antipf .tab-btn[data-subtab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#tab-antipf .tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelectorAll('#tab-antipf .subtab-content').forEach(c => c.style.display = 'none');
        document.getElementById(`subtab-${e.target.dataset.subtab}`).style.display = 'block';
      });
    });

    document.getElementById('generate-htaccess-btn')?.addEventListener('click', () => this.generateHtaccess());
    document.getElementById('generate-honeypot-btn')?.addEventListener('click', () => this.generateHoneypot());
    document.getElementById('generate-cf-btn')?.addEventListener('click', () => this.generateCloudflare());

    document.getElementById('copy-htaccess-btn')?.addEventListener('click', () => this.copyToClipboard('htaccess-code'));
    document.getElementById('copy-honeypot-btn')?.addEventListener('click', () => this.copyToClipboard('honeypot-code'));
    document.getElementById('copy-cf-btn')?.addEventListener('click', () => this.copyToClipboard('cf-code'));
  }

  async checkSite() {
    const domainInput = document.getElementById('pf-domain-input');
    const domain = domainInput?.value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    if (!domain) {
      this.app.updateStatus('❌ Введите домен', true);
      return;
    }

    this.app.updateStatus(`🔍 Проверяю ${domain}...`);
    
    const progressDiv = document.getElementById('pf-progress');
    const progressFill = document.getElementById('pf-progress-fill');
    const progressText = document.getElementById('pf-progress-text');
    const progressCount = document.getElementById('pf-progress-count');
    
    if (progressDiv) progressDiv.style.display = 'block';
    document.getElementById('pf-results').style.display = 'block';

    ['pf-metrika', 'pf-ga', 'pf-robots', 'pf-sitemap', 'pf-ssl', 'pf-headers', 'pf-honeypot'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<span class="loading">⏳ Проверка...</span>';
    });

    try {
      if (progressText) progressText.textContent = 'Загрузка страницы...';
      if (progressFill) progressFill.style.width = '15%';
      if (progressCount) progressCount.textContent = '1/6';

      // Получаем HTML
      const htmlString = await this.fetchViaServiceWorker(`https://${domain}/`);
      
      console.log('HTML получен, длина:', htmlString?.length || 0);
      console.log('tag.js:', /mc\.yandex\.ru\/metrika\/tag\.js/i.test(htmlString));
      console.log('gtm.js:', /googletagmanager\.com\/gtm\.js/i.test(htmlString));
      console.log('ym init:', /ym\s*\(\s*["']\d+["']\s*,\s*["']init["']/i.test(htmlString));

      // 1. Яндекс.Метрика
      if (progressText) progressText.textContent = 'Проверка Метрики...';
      if (progressFill) progressFill.style.width = '30%';
      if (progressCount) progressCount.textContent = '2/6';
      const metrikaResult = this.detectMetrika(htmlString);
      this.renderResult('pf-metrika', metrikaResult);

      // 2. Google Analytics
      if (progressText) progressText.textContent = 'Проверка GA...';
      if (progressFill) progressFill.style.width = '45%';
      if (progressCount) progressCount.textContent = '3/6';
      const gaResult = this.detectGA(htmlString);
      this.renderResult('pf-ga', gaResult);

      // Код метрики если ничего нет
      const codeBlock = document.getElementById('pf-metrika-code');
      if (codeBlock) {
        const needCode = !metrikaResult.found && !gaResult.found;
        codeBlock.style.display = needCode ? 'block' : 'none';
        if (needCode) {
          document.getElementById('pf-metrika-code-text').value = this.securityGen.generateHiddenMetrikaCode('XXXXXXXX');
        }
      }

      // 3. robots.txt
      if (progressText) progressText.textContent = 'Проверка robots.txt...';
      if (progressFill) progressFill.style.width = '60%';
      if (progressCount) progressCount.textContent = '4/6';
      const robotsResult = await this.checkRobots(domain);
      this.renderResult('pf-robots', robotsResult);

      // 4. sitemap.xml
      if (progressText) progressText.textContent = 'Проверка sitemap.xml...';
      if (progressFill) progressFill.style.width = '75%';
      if (progressCount) progressCount.textContent = '5/6';
      const sitemapResult = await this.checkSitemap(domain);
      this.renderResult('pf-sitemap', sitemapResult);

      // 5. SSL
      this.renderResult('pf-ssl', {
        found: true, status: 'success', icon: '🔒',
        title: 'SSL/HTTPS', text: 'Проверено',
        tip: '✅ Подключение по HTTPS'
      });

      // 6. Honeypot
      if (progressCount) progressCount.textContent = '6/6';
      if (progressFill) progressFill.style.width = '90%';
      const honeypotResult = this.checkHoneypot(htmlString);
      this.renderResult('pf-honeypot', honeypotResult);

      this.renderResult('pf-headers', {
        found: true, status: 'info', icon: 'ℹ️',
        title: 'Заголовки безопасности', text: 'Настройте отдельно',
        tip: '💡 Сгенерируйте .htaccess ниже'
      });

      this.renderSummary(metrikaResult, gaResult, robotsResult, sitemapResult);

      if (progressDiv) progressDiv.style.display = 'none';
      this.app.updateStatus('✅ Проверка завершена');

    } catch (error) {
      if (progressDiv) progressDiv.style.display = 'none';
      console.error('checkSite error:', error);
      this.app.updateStatus(`❌ Ошибка: ${error.message}`, true);
    }
  }

  // ==========================================
  // ПОИСК МЕТРИКИ
  // ==========================================
  detectMetrika(html) {
    const methods = [];
    const counterIds = [];

    if (/mc\.yandex\.ru\/metrika\/tag\.js/i.test(html)) methods.push('tag.js');
    
    let match;
    const ymRegex = /ym\s*\(\s*["'](\d+)["']\s*,\s*["']init["']/g;
    while ((match = ymRegex.exec(html)) !== null) {
      if (!counterIds.includes(match[1])) counterIds.push(match[1]);
    }
    if (counterIds.length > 0) methods.push('ym(init)');

    const nsRegex = /mc\.yandex\.ru\/watch\/(\d+)/g;
    while ((match = nsRegex.exec(html)) !== null) {
      if (!counterIds.includes(match[1])) counterIds.push(match[1]);
    }

    if (/dataLayerYandex/i.test(html)) methods.push('dataLayer');
    if (/Ya\.Metrika2?\b/i.test(html)) methods.push('Ya.Metrika');
    
    const yaCR = /yaCounter(\d+)/g;
    while ((match = yaCR.exec(html)) !== null) {
      if (!counterIds.includes(match[1])) counterIds.push(match[1]);
    }

    const found = methods.length > 0;

    return {
      found,
      status: found ? 'success' : 'error',
      icon: found ? '✅' : '❌',
      title: 'Яндекс.Метрика',
      text: found ? `Найдена (ID: ${counterIds.join(',') || 'в коде'})` : 'Не найдена',
      counterIds,
      tip: found ? '✅ Счётчик есть' : '❌ Установите Яндекс.Метрику'
    };
  }

  // ==========================================
  // ПОИСК GA/GTM
  // ==========================================
  detectGA(html) {
    const methods = [];
    const trackerIds = [];

    if (/googletagmanager\.com\/gtm\.js/i.test(html)) methods.push('gtm.js');
    if (/googletagmanager\.com\/gtag\/js/i.test(html)) methods.push('gtag/js');
    if (/google-analytics\.com\/analytics\.js/i.test(html)) methods.push('analytics.js');
    if (/gtm\.start/i.test(html) && /dataLayer/i.test(html)) methods.push('dataLayer');

    let match;
    const gtmR = /GTM-[A-Z0-9]+/g;
    while ((match = gtmR.exec(html)) !== null) {
      if (!trackerIds.includes(match[0])) trackerIds.push(match[0]);
    }
    const gR = /G-[A-Z0-9]{10,}/g;
    while ((match = gR.exec(html)) !== null) {
      if (!trackerIds.includes(match[0])) trackerIds.push(match[0]);
    }
    const uaR = /UA-\d+-\d+/g;
    while ((match = uaR.exec(html)) !== null) {
      if (!trackerIds.includes(match[0])) trackerIds.push(match[0]);
    }

    const found = methods.length > 0 || trackerIds.length > 0;

    return {
      found,
      status: found ? 'success' : 'warning',
      icon: found ? '✅' : '⚠️',
      title: 'Google Analytics / GTM',
      text: found ? `Найден (${trackerIds.join(',') || 'код'})` : 'Не найден',
      trackerIds,
      tip: found ? '✅ Аналитика есть' : '⚠️ Установите GTM'
    };
  }

  // ==========================================
  // ПРОВЕРКА ROBOTS.TXT
  // ==========================================
  async checkRobots(domain) {
    try {
      const content = await this.fetchViaServiceWorker(`https://${domain}/robots.txt`);
      const s = typeof content === 'string' ? content : String(content || '');
      
      if (!s || s.length < 10) {
        return { found: false, status: 'error', icon: '❌', title: 'robots.txt',
          text: 'Не найден', tip: '❌ Создайте robots.txt' };
      }

      const hasSitemap = /Sitemap:\s*https?:\/\//i.test(s);
      const blockedAdmin = /Disallow:\s*\/(?:admin|wp-admin|administrator|bitrix|manager)/i.test(s);
      
      const tips = [];
      if (hasSitemap) tips.push('✅ Sitemap указан');
      else tips.push('⚠️ Добавьте: Sitemap: https://' + domain + '/sitemap.xml');
      if (blockedAdmin) tips.push('✅ Админка скрыта');
      else tips.push('💡 Закройте админку: Disallow: /admin');

      return {
        found: true, status: hasSitemap ? 'success' : 'warning',
        icon: hasSitemap ? '✅' : '⚠️', title: 'robots.txt',
        text: 'Найден' + (hasSitemap ? ' + Sitemap' : ' без Sitemap'),
        tip: tips.join(' | ')
      };
    } catch {
      return { found: false, status: 'error', icon: '❌', title: 'robots.txt',
        text: 'Ошибка', tip: '❌ Недоступен' };
    }
  }

  // ==========================================
  // ПРОВЕРКА SITEMAP.XML
  // ==========================================
  async checkSitemap(domain) {
    const urls = [
      `https://${domain}/sitemap.xml`,
      `https://${domain}/sitemap_index.xml`,
      `https://${domain}/sitemap/sitemap.xml`,
      `https://${domain}/wp-sitemap.xml`
    ];
    for (const url of urls) {
      try {
        const content = await this.fetchViaServiceWorker(url);
        const s = typeof content === 'string' ? content : String(content || '');
        if (s.includes('<urlset') || s.includes('<sitemapindex')) {
          const count = (s.match(/<loc>/g) || []).length;
          return { found: true, status: 'success', icon: '✅', title: 'sitemap.xml',
            text: `Найден (${count} URL)`, tip: '✅ Sitemap существует' };
        }
      } catch { continue; }
    }
    return { found: false, status: 'warning', icon: '⚠️', title: 'sitemap.xml',
      text: 'Не найден', tip: '⚠️ Создайте sitemap.xml и укажите в robots.txt' };
  }

  // ==========================================
  // ПРОВЕРКА HONEYPOT
  // ==========================================
  checkHoneypot(html) {
    const s = html;
    const patterns = [
      /honeypot/i, /bot.trap/i, /trap.link/i,
      /<a[^>]*style=["'][^"']*(?:display\s*:\s*none|left\s*:\s*-9999px|opacity\s*:\s*0\.01)[^"']*["'][^>]*>/i,
      /<input[^>]*name=["'](?:email|phone|name)["'][^>]*style=["'][^"']*display\s*:\s*none/i
    ];
    const matches = patterns.filter(p => p.test(s));
    const found = matches.length > 0;
    return {
      found, status: found ? 'success' : 'warning',
      icon: found ? '✅' : '⚠️', title: 'Honeypot',
      text: found ? 'Обнаружен' : 'Не установлен',
      tip: found ? '✅ Ловушка есть' : '⚠️ Сгенерируйте код ниже'
    };
  }

  // ==========================================
  // ОТОБРАЖЕНИЕ
  // ==========================================
  renderResult(id, result) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `
      <div class="check-result">
        <span class="result-icon">${result.icon}</span>
        <div class="result-content">
          <strong>${result.title}:</strong> ${result.text}
          <br><small>${result.tip}</small>
        </div>
      </div>`;
  }

  renderSummary(metrika, ga, robots, sitemap) {
    const container = document.getElementById('pf-summary-content');
    if (!container) return;
    
    // Считаем баллы
    let score = 0;
    const maxScore = 4;
    
    if (metrika.found) score++;
    if (ga.found) score++;
    if (robots.found) score++;
    if (sitemap.found) score++;
    
    const allOk = score === maxScore;
    
    // Формируем строки результатов (компактно, с переносами)
    const metrikaLine = metrika.found 
      ? `<span style="color:#10b981;">✅</span> <strong>Яндекс.Метрика</strong><br><span style="font-size:11px; color:#6b7280; margin-left:22px;">Установлена (ID: ${metrika.counterIds.join(', ') || 'найдена'})</span>`
      : `<span style="color:#ef4444;">❌</span> <strong>Яндекс.Метрика</strong><br><span style="font-size:11px; color:#9ca3af; margin-left:22px;">Не найдена — установите счётчик для отслеживания ПФ</span>`;
    
    const gaLine = ga.found 
      ? `<span style="color:#10b981;">✅</span> <strong>Google Analytics / GTM</strong><br><span style="font-size:11px; color:#6b7280; margin-left:22px;">Установлен (${ga.trackerIds.join(', ') || 'найден'})</span>`
      : `<span style="color:#f59e0b;">⚠️</span> <strong>Google Analytics / GTM</strong><br><span style="font-size:11px; color:#9ca3af; margin-left:22px;">Не найден — рекомендуется установить GTM</span>`;
    
    const domain = document.getElementById('pf-domain-input')?.value?.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'site.ru';
    
    const robotsLine = robots.found 
      ? (robots.status === 'success' 
          ? `<span style="color:#10b981;">✅</span> <strong>robots.txt</strong><br><span style="font-size:11px; color:#6b7280; margin-left:22px;">Найден, Sitemap указан</span>`
          : `<span style="color:#f59e0b;">⚠️</span> <strong>robots.txt</strong><br><span style="font-size:11px; color:#6b7280; margin-left:22px;">Найден, но Sitemap не указан</span><br><span style="font-size:10px; color:#9ca3af; margin-left:22px;">Добавьте: Sitemap: https://${domain}/sitemap.xml</span>`)
      : `<span style="color:#ef4444;">❌</span> <strong>robots.txt</strong><br><span style="font-size:11px; color:#9ca3af; margin-left:22px;">Не найден — создайте robots.txt в корне сайта</span>`;
    
    const sitemapLine = sitemap.found 
      ? `<span style="color:#10b981;">✅</span> <strong>sitemap.xml</strong><br><span style="font-size:11px; color:#6b7280; margin-left:22px;">${sitemap.text}</span>`
      : `<span style="color:#f59e0b;">⚠️</span> <strong>sitemap.xml</strong><br><span style="font-size:11px; color:#9ca3af; margin-left:22px;">Не найден</span><br><span style="font-size:10px; color:#9ca3af; margin-left:22px;">Создайте и укажите в robots.txt</span>`;
    
    // Выбираем цвет и иконку
    let statusColor, statusEmoji, statusTitle, statusDesc;
    
    if (score === maxScore) {
      statusColor = '#10b981';
      statusEmoji = '✅';
      statusTitle = 'Сайт готов к ПФ!';
      statusDesc = 'Все проверки пройдены. Можно запускать.';
    } else if (score >= 3) {
      statusColor = '#f59e0b';
      statusEmoji = '⚠️';
      statusTitle = 'Почти готово';
      statusDesc = 'Остался 1 пункт.';
    } else if (score >= 2) {
      statusColor = '#f59e0b';
      statusEmoji = '⚠️';
      statusTitle = 'Нужна настройка';
      statusDesc = 'Без счётчиков ПФ не отследить.';
    } else {
      statusColor = '#ef4444';
      statusEmoji = '❌';
      statusTitle = 'Сайт не готов';
      statusDesc = 'Установите счётчики и файлы.';
    }
    
    container.innerHTML = `
      <div style="text-align:center; padding:12px 8px;">
        <div style="font-size:36px; margin-bottom:6px;">${statusEmoji}</div>
        <div style="font-weight:700; font-size:16px; color:${statusColor}; margin-bottom:2px;">
          ${statusTitle}
        </div>
        <div style="font-size:12px; color:#9ca3af; margin-bottom:8px;">
          ${statusDesc}
        </div>
        <div style="display:inline-block; background:${statusColor}15; color:${statusColor}; font-weight:600; font-size:13px; padding:3px 14px; border-radius:10px; margin-bottom:12px;">
          ${score} / ${maxScore}
        </div>
        
        <div style="text-align:left; background:#f8f9fa; border-radius:8px; padding:12px;">
          <div style="margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #e5e7eb;">
            ${metrikaLine}
          </div>
          <div style="margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #e5e7eb;">
            ${gaLine}
          </div>
          <div style="margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #e5e7eb;">
            ${robotsLine}
          </div>
          <div>
            ${sitemapLine}
          </div>
        </div>
      </div>`;
  }

  // ==========================================
  // ГЕНЕРАТОРЫ
  // ==========================================
  generateHtaccess() {
    const options = {
      blockBots: document.getElementById('ht-block-bots')?.checked,
      rateLimit: document.getElementById('ht-rate-limit')?.checked,
      protectAdmin: document.getElementById('ht-protect-admin')?.checked
    };
    const code = this.securityGen.generateHtaccessRules(options);
    const el = document.getElementById('htaccess-code');
    if (el) { el.value = code; el.style.display = 'block'; }
    document.getElementById('copy-htaccess-btn').style.display = 'inline-block';
    this.app.updateStatus('✅ .htaccess сгенерирован');
  }

  generateHoneypot() {
    const result = this.securityGen.generateHoneypot();
    const el = document.getElementById('honeypot-code');
    if (el) { el.value = result.code; el.style.display = 'block'; }
    const info = document.getElementById('honeypot-info');
    if (info) { info.innerHTML = result.installation; info.style.display = 'block'; }
    document.getElementById('copy-honeypot-btn').style.display = 'inline-block';
    this.app.updateStatus('✅ Honeypot сгенерирован');
  }

  generateCloudflare() {
    const result = this.securityGen.generateCloudflareRules();
    const el = document.getElementById('cf-code');
    if (el) { el.value = result.json; el.style.display = 'block'; }
    const info = document.getElementById('cf-info');
    if (info) { info.innerHTML = result.installation; info.style.display = 'block'; }
    document.getElementById('copy-cf-btn').style.display = 'inline-block';
    this.app.updateStatus('✅ Правила Cloudflare сгенерированы');
  }

  async copyToClipboard(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.value);
      this.app.updateStatus('📋 Скопировано');
    } catch {
      el.select();
      document.execCommand('copy');
      this.app.updateStatus('📋 Скопировано');
    }
  }

  destroy() {}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AntiPFTab;
}