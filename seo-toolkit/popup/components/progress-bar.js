/**
 * progress-bar.js — Компонент прогресс-бара
 */

const ProgressBar = {
  elements: {
    container: null,
    text: null,
    count: null,
    fill: null,
    found: null,
    errors: null,
  },

  init() {
    this.elements.container = document.getElementById('scanProgress');
    this.elements.text = document.getElementById('progressText');
    this.elements.count = document.getElementById('progressCount');
    this.elements.fill = document.getElementById('progressFill');
    this.elements.found = document.getElementById('statFound');
    this.elements.errors = document.getElementById('statErrors');
  },

  show() {
    if (this.elements.container) {
      this.elements.container.style.display = '';
    }
    this.reset();
  },

  hide() {
    if (this.elements.container) {
      this.elements.container.style.display = 'none';
    }
  },

  reset() {
    this.update(0, 0, '');
    if (this.elements.found) this.elements.found.textContent = '0';
    if (this.elements.errors) this.elements.errors.textContent = '0';
  },

  update(current, total, text = '') {
    if (this.elements.text) {
      this.elements.text.textContent = text || `Обработано ${current} из ${total}`;
    }
    if (this.elements.count) {
      this.elements.count.textContent = `${current}/${total}`;
    }
    if (this.elements.fill) {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      this.elements.fill.style.width = percent + '%';
    }
  },

  setFound(count) {
    if (this.elements.found) {
      this.elements.found.textContent = count;
    }
  },

  setErrors(count) {
    if (this.elements.errors) {
      this.elements.errors.textContent = count;
    }
  },

  pulse() {
    if (this.elements.fill) {
      this.elements.fill.style.animation = 'none';
      void this.elements.fill.offsetWidth; // reflow
      this.elements.fill.style.animation = 'pulse 0.5s ease';
    }
  },
};