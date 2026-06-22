// utils/security-generator.js
// Генераторы защитного кода от накрутки ПФ

class SecurityGenerator {
  constructor() {
    this.botUserAgents = [
      'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'BLEXBot',
      'MegaIndex', 'ZoominfoBot', 'Barkrowler', 'DataForSeoBot',
      'Screaming Frog SEO Spider', 'Scrapy', 'PetalBot', 'PycURL',
      'HTTrack', 'linkdexbot', 'MauiBot', 'SISTRIX', 'XoviBot'
    ];
  }

  // ==========================================
  // .HTACCESS ГЕНЕРАТОР
  // ==========================================
  generateHtaccessRules(options = {}) {
    const { blockBots = true, rateLimit = true, protectAdmin = true } = options;
    let htaccess = '# Защита от накрутки ПФ — сгенерировано SEO Toolkit\n';
    htaccess += '# Дата: ' + new Date().toLocaleDateString('ru-RU') + '\n';
    htaccess += '# Установите этот код в файл .htaccess в корне сайта\n\n';
    
    htaccess += '<IfModule mod_rewrite.c>\n  RewriteEngine On\n\n';

    if (blockBots) {
      htaccess += '  # Блокировка SEO-ботов и парсеров по User-Agent\n';
      htaccess += '  RewriteCond %{HTTP_USER_AGENT} "' + this.botUserAgents.join('|') + '" [NC]\n';
      htaccess += '  RewriteRule .* - [F,L]\n\n';
    }

    if (rateLimit) {
      htaccess += '  # Защита от спама форм (проверка реферера)\n';
      htaccess += '  RewriteCond %{REQUEST_METHOD} POST\n';
      htaccess += '  RewriteCond %{HTTP_REFERER} !^https?://%{HTTP_HOST} [NC]\n';
      htaccess += '  RewriteRule .* - [F,L]\n\n';
    }

    if (protectAdmin) {
      htaccess += '  # Защита админ-панели (только с вашего IP)\n';
      htaccess += '  # ЗАМЕНИТЕ 127.0.0.1 на ваш реальный IP!\n';
      htaccess += '  RewriteCond %{REQUEST_URI} ^/(wp-admin|admin|administrator) [NC]\n';
      htaccess += '  RewriteCond %{REMOTE_ADDR} !^127\\.0\\.0\\.1$\n';
      htaccess += '  RewriteRule .* - [F,L]\n\n';
    }

    htaccess += '</IfModule>\n';
    return htaccess;
  }

  // ==========================================
  // HONEYPOT ГЕНЕРАТОР (работает в РФ)
  // ==========================================
  generateHoneypot() {
    const uniqueId = 'honeypot_' + Math.random().toString(36).substr(2, 9);
    
    const code = `// ==========================================
// Honeypot ловушка для ботов
// Сгенерировано: SEO Toolkit Anti-PF
// ID: ${uniqueId}
// ==========================================
// 🔧 ИНСТРУКЦИЯ ПО УСТАНОВКЕ:
// 
// 1. ВСТАВЬТЕ ЭТОТ КОД в футер сайта, перед закрывающим тегом </body>
//    (во всех CMS это файл footer.php или footer.tpl)
// 
// 2. ЗАМЕНИТЕ XXXXXX на номер вашего счётчика Яндекс.Метрики
//    Строка: ym(XXXXXX, 'reachGoal', 'honeypot_activated'
//    Где взять ID: Метрика → Настройки → Код счётчика → число в ym(XXXXXXXX)
// 
// 3. СОЗДАЙТЕ СТРАНИЦУ-ЗАГЛУШКУ /bot-detected.html
//    Это может быть просто: "404 Страница не найдена" или пустая страница
// 
// 4. ПРОВЕРЬТЕ:
//    Откройте Консоль браузера (F12) — должно быть тихо
//    Зайдите в Метрику → Конверсии → Цели → honeypot_activated
//    Если есть переходы — вы видите ботов!
// 
// 5. КАК ОТСЕЯТЬ БОТОВ В МЕТРИКЕ:
//    Заходите в отчёты по цели "honeypot_activated"
//    Смотрите IP, User-Agent, время визита
//    Блокируйте эти IP в .htaccess или Cloudflare
// 
// ⚠️ РАБОТАЕТ В РФ: Яндекс.Метрика и Google Analytics работают в России
// ⚠️ НЕ УДАЛЯЙТЕ MutationObserver — он защищает код от удаления
// ==========================================

(function() {
  'use strict';
  
  // Создаём скрытую ссылку-ловушку
  const honeypot = document.createElement('a');
  honeypot.href = '/bot-detected.html';
  honeypot.textContent = '';
  honeypot.id = '${uniqueId}';
  honeypot.setAttribute('rel', 'nofollow');
  honeypot.setAttribute('aria-hidden', 'true');
  
  // Делаем ссылку невидимой для людей, но видимой для ботов
  honeypot.style.cssText = [
    'position: absolute !important',
    'left: -9999px !important',
    'top: -9999px !important',
    'width: 1px !important',
    'height: 1px !important',
    'opacity: 0.01 !important',
    'pointer-events: none !important',
    'tab-index: -1 !important',
    'z-index: -1 !important',
    'color: transparent !important',
    'text-decoration: none !important',
    'overflow: hidden !important'
  ].join(';');
  
  // Ждём загрузки body
  if (document.body) {
    document.body.appendChild(honeypot);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(honeypot);
    });
  }
  
  let clickDetected = false;
  
  // Отслеживаем клики по ловушке
  honeypot.addEventListener('click', function(e) {
    if (clickDetected) return;
    clickDetected = true;
    
    // Логируем в консоль
    console.warn('🔴 Honeypot activated! Bot detected!', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      url: window.location.href
    });
    
    // Отправляем в Яндекс.Метрику
    if (typeof ym !== 'undefined') {
      try {
        // ЗАМЕНИТЕ XXXXXX НА НОМЕР ВАШЕГО СЧЁТЧИКА
        ym(XXXXXX, 'reachGoal', 'honeypot_activated', {
          user_agent: navigator.userAgent,
          timestamp: Date.now()
        });
      } catch(e) {
        console.warn('Метрика не найдена, проверьте ID счётчика');
      }
    }
    
    // Отправляем в Google Analytics
    if (typeof gtag !== 'undefined') {
      try {
        gtag('event', 'honeypot_activated', {
          event_category: 'bot_detection',
          event_label: 'honeypot_click',
          non_interaction: true
        });
      } catch(e) {}
    }
    
    // Перенаправляем бота на заглушку
    e.preventDefault();
    window.location.href = '/bot-detected.html';
  });
  
  // Защита от удаления ловушки
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          const removed = Array.from(mutation.removedNodes);
          if (removed.includes(honeypot)) {
            if (!document.getElementById('${uniqueId}')) {
              document.body.appendChild(honeypot);
            }
          }
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // Самодиагностика при загрузке
  window.addEventListener('load', function() {
    if (!document.getElementById('${uniqueId}')) {
      console.warn('⚠️ Honeypot не найден после загрузки — проверьте установку');
    }
  });
  
})();`;

    const installation = `
      <div style="font-size:12px; line-height:1.6; color:var(--text-primary);">
        <strong>📋 Инструкция по установке Honeypot:</strong><br><br>
        
        <strong>1. Куда вставить код:</strong><br>
        • Откройте файл <code>footer.php</code> (WordPress) или <code>footer.tpl</code> (Bitrix/OpenCart)<br>
        • Вставьте код <strong>перед закрывающим тегом &lt;/body&gt;</strong><br>
        • Путь в WordPress: Внешний вид → Редактор тем → footer.php<br>
        • Путь в Bitrix: Админка → Настройки → Шаблоны → footer.php<br><br>
        
        <strong>2. Что заменить:</strong><br>
        • <code>XXXXXX</code> → номер вашего счётчика Яндекс.Метрики (например <code>47060232</code>)<br>
        • Где найти: Метрика → Настройки → Код отслеживания → цифры в <code>ym(XXXXXXXX)</code><br><br>
        
        <strong>3. Создайте страницу-заглушку:</strong><br>
        • Создайте файл <code>/bot-detected.html</code> в корне сайта<br>
        • Содержимое: пустая страница или «404 Не найдено»<br>
        • Это нужно чтобы бот не попал на реальную страницу<br><br>
        
        <strong>4. Как проверить что работает:</strong><br>
        • Нажмите F12 → Консоль — ошибок быть не должно<br>
        • В Метрике: Отчёты → Конверсии → Цель «honeypot_activated»<br>
        • Если есть данные — боты ловятся ✅<br><br>
        
        <strong>🇷🇺 Работает в РФ:</strong><br>
        • Яндекс.Метрика — полностью работает в России<br>
        • Google Analytics — работает, но может быть замедлен<br>
        • Код на чистом JavaScript — не зависит от внешних сервисов<br>
      </div>`;

    return { code, installation };
  }

  // ==========================================
  // СКРЫТАЯ МЕТРИКА
  // ==========================================
  generateHiddenMetrikaCode(counterId = 'XXXXXXXX') {
    return `<!-- Скрытая Яндекс.Метрика для мониторинга аномалий -->
<!-- ЗАМЕНИТЕ XXXXXXXX на номер счётчика -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){
     m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
     m[i].l=1*new Date();
     for (var j=0; j<document.scripts.length; j++) {
       if (document.scripts[j].src===r) return;
     }
     k=e.createElement(t),a=e.getElementsByTagName(t)[0];
     k.async=1;k.src=r;a.parentNode.insertBefore(k,a)
   })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   
   ym(${counterId}, "init", {
     clickmap:false,
     trackLinks:false,
     accurateTrackBounce:true,
     webvisor:false,
     trackHash:false,
     ut:"noindex",
     params: { is_monitoring: true, source: 'anti_pf_tool' }
   });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${counterId}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>`;
  }

  // ==========================================
  // CLOUDFLARE RULES
  // ==========================================
  generateCloudflareRules() {
    const rules = [
      {
        description: 'Блокировка SEO-ботов по User-Agent',
        expression: `(http.user_agent contains "AhrefsBot") or (http.user_agent contains "SemrushBot") or (http.user_agent contains "MJ12bot") or (http.user_agent contains "DotBot") or (http.user_agent contains "BLEXBot")`,
        action: 'block'
      },
      {
        description: 'Rate limiting админ-панели',
        expression: `(http.request.uri.path matches "^/(wp-admin|admin|administrator)") and (cf.threat_score ge 10)`,
        action: 'managed_challenge'
      },
      {
        description: 'Защита от ботов с низким скорингом',
        expression: `(cf.bot_management.score lt 30)`,
        action: 'managed_challenge'
      }
    ];

    const installation = `
      <div style="font-size:12px; line-height:1.6; color:var(--text-primary);">
        <strong>📋 Как установить правила Cloudflare:</strong><br><br>
        <strong>1.</strong> Зайдите в панель Cloudflare<br>
        <strong>2.</strong> Выберите сайт → Security → WAF → Firewall Rules<br>
        <strong>3.</strong> Нажмите <strong>Create Rule</strong><br>
        <strong>4.</strong> Вставьте выражение из кода выше<br>
        <strong>5.</strong> Выберите действие: Block или Managed Challenge<br>
        <strong>6.</strong> Сохраните и включите правило<br>
      </div>`;

    return {
      rules,
      json: JSON.stringify(rules, null, 2),
      installation
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityGenerator;
}