// Универсальная инициализация мобильного меню для всех страниц
import { initMobileMenu } from './navigation.js';

// Инициализируем меню сразу при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof initMobileMenu === 'function') {
      initMobileMenu();
    }
  });
} else {
  // DOM уже загружен
  if (typeof initMobileMenu === 'function') {
    initMobileMenu();
  }
}

// Также инициализируем при полной загрузке страницы (на всякий случай)
window.addEventListener('load', () => {
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav && !toggle.dataset.initialized) {
    if (typeof initMobileMenu === 'function') {
      initMobileMenu();
      toggle.dataset.initialized = 'true';
    }
  }
});
