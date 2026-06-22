/**
 * warning-badge.js — Компонент предупреждений
 */

const WarningBadge = {
  elements: {
    container: null,
  },

  init() {
    this.elements.container = document.getElementById('scanWarnings');
  },

  show(warnings) {
    if (!this.elements.container) return;
    
    this.clear();

    if (!warnings || warnings.length === 0) {
      this.elements.container.style.display = 'none';
      return;
    }

    this.elements.container.style.display = '';
    
    warnings.forEach(warning => {
      const badge = document.createElement('div');
      badge.className = `warning warning--${warning.type || 'warning'}`;
      
      let icon = '⚠️';
      if (warning.type === 'error') icon = '❌';
      if (warning.type === 'success') icon = '✅';
      
      badge.innerHTML = `<span>${icon}</span><span>${warning.message}</span>`;
      this.elements.container.appendChild(badge);
    });
  },

  clear() {
    if (this.elements.container) {
      this.elements.container.innerHTML = '';
      this.elements.container.style.display = 'none';
    }
  },

  hide() {
    if (this.elements.container) {
      this.elements.container.style.display = 'none';
    }
  },
};