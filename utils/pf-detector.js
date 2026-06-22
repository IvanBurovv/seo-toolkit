// utils/pf-detector.js
// Заглушка (не используется в новой версии, оставлена для обратной совместимости)

class PFDetector {
  constructor(fetchFn) {
    this.fetchFn = fetchFn;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PFDetector;
}