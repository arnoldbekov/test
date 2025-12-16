import { appState } from '../common/data.js';
import { setupTimeline, renderTimelineEvents } from '../../styles/blocks/timeline/timeline.js';
import { setupSearch, applyFilters } from './search.js';
import { setupMapInteractions, setupMapInteractionsRoutes, setupHideMapButton, setupMapModal, setupMapModalRoutes } from '../../styles/blocks/map/map.js';
import { setupModals } from '../../styles/blocks/modals/modals.js';
import { buildStats } from '../../styles/blocks/stats/stats.js';
import { buildGallery } from '../../styles/blocks/gallery/gallery.js';
import { checkAndFocusPlaceOnLoad, initMobileMenu } from './navigation.js';
import { renderObjectGrid } from '../../styles/blocks/cards/cards.js';

function initApp() {
  // Мобильное меню уже инициализировано в DOMContentLoaded, но на всякий случай проверяем
  if (typeof initMobileMenu === 'function') {
    const toggle = document.getElementById('menuToggle');
    if (toggle && !toggle.dataset.initialized) {
      initMobileMenu();
      toggle.dataset.initialized = 'true';
    }
  }
  if (typeof window.setupTimeline === 'function') window.setupTimeline();
  if (typeof window.setupSearch === 'function') window.setupSearch();
  if (typeof window.setupMapInteractions === 'function') window.setupMapInteractions();
  if (typeof window.setupMapInteractionsRoutes === 'function') window.setupMapInteractionsRoutes();
  if (typeof window.setupMapModal === 'function') window.setupMapModal();
  if (typeof window.setupMapModalRoutes === 'function') window.setupMapModalRoutes();
  if (typeof window.setupRoutes === 'function') window.setupRoutes();
  if (typeof window.setupModals === 'function') window.setupModals();
  if (typeof window.renderTimelineEvents === 'function') window.renderTimelineEvents();
  if (typeof window.applyFilters === 'function') window.applyFilters();
  if (typeof window.loadSavedRoutes === 'function') window.loadSavedRoutes();
  if (typeof window.buildStats === 'function') window.buildStats();
  if (document.getElementById('galleryGrid') && typeof window.buildGallery === 'function') {
    window.buildGallery();
  }
  if (typeof window.setupHideMapButton === 'function') window.setupHideMapButton();
  
  const objectsGrid = document.getElementById('objectsGrid');
  if (objectsGrid && typeof window.renderObjectGrid === 'function') {
    window.renderObjectGrid();
  }
  
  setTimeout(async () => {
    if (typeof window.loadAndRenderMapZones === 'function') {
      const mapContent = document.getElementById('mapContent');
      const mapContentRoutes = document.getElementById('mapContentRoutes');
      const promises = [];
      if (mapContent) {
        promises.push(window.loadAndRenderMapZones('mapContent'));
      }
      if (mapContentRoutes) {
        promises.push(window.loadAndRenderMapZones('mapContentRoutes'));
      }
      await Promise.all(promises);
      if (typeof window.checkAndFocusPlaceOnLoad === 'function') {
        window.checkAndFocusPlaceOnLoad();
      }
      if (typeof window.checkAndShowSavedRoute === 'function') {
        setTimeout(() => window.checkAndShowSavedRoute(), 200);
      }
    } else {
      setTimeout(() => {
        if (typeof window.checkAndFocusPlaceOnLoad === 'function') {
          window.checkAndFocusPlaceOnLoad();
        }
        if (typeof window.checkAndShowSavedRoute === 'function') {
          window.checkAndShowSavedRoute();
        }
      }, 500);
    }
  }, 100);
  
  if (window.location.pathname.includes('routes.html')) {
    const mapSection = document.getElementById('map');
    if (mapSection) {
      mapSection.style.display = 'block';
    }
  }
}

export { initApp };

