import { appState, loadPlacesData, normalizeImagePath } from '../common/data.js';
import { getFavorites, saveFavorites, togglePlaceFavorite, toggleRouteFavorite, isPlaceFavorite, isRouteFavorite } from '../common/favorites.js';
import { showError, getPeriodName, getTypeName } from '../common/utils.js';
import { cityTravelTimes } from '../common/constants.js';
import { setupTimeline, renderTimelineEvents } from '../../styles/blocks/timeline/timeline.js';
import { setupSearch, applyFilters } from '../blocks/search.js';
import { renderObjectGrid, createObjectCardHTML, setupObjectCardHandlers } from '../../styles/blocks/cards/cards.js';
import { setupModals, openModal, closeModal, openObjectModal, handleObjectAction, openCompareModal, openSingleImageModal } from '../../styles/blocks/modals/modals.js';
import { setupMapInteractions, setupMapInteractionsRoutes, setupHideMapButton, filterMapZones, highlightPlaceOnMap, getMapCoordinates, setupMapModal, setupMapModalRoutes } from '../../styles/blocks/map/map.js';
import { buildGallery, setCurrentGalleryIndex, updateGalleryNavButtons, openGalleryByOffset, attachMapFocusHandler, attachDetailsHandler } from '../../styles/blocks/gallery/gallery.js';
import { focusPlaceOnMap, checkAndFocusPlaceOnLoad, initMobileMenu } from '../blocks/navigation.js';
import { buildStats, openPeriodModal } from '../../styles/blocks/stats/stats.js';
import { initApp } from '../blocks/init.js';

window.appState = appState;
window.places = appState.places;
window.currentPeriod = appState.currentPeriod;
window.filteredPlaces = appState.filteredPlaces;
window.getPeriodName = getPeriodName;
window.getTypeName = getTypeName;
window.showError = showError;
window.cityTravelTimes = cityTravelTimes;
window.getFavorites = getFavorites;
window.saveFavorites = saveFavorites;
window.togglePlaceFavorite = togglePlaceFavorite;
window.toggleRouteFavorite = toggleRouteFavorite;
window.isPlaceFavorite = isPlaceFavorite;
window.isRouteFavorite = isRouteFavorite;
window.normalizeImagePath = normalizeImagePath;
window.renderObjectGrid = renderObjectGrid;
window.createObjectCardHTML = createObjectCardHTML;
window.setupObjectCardHandlers = setupObjectCardHandlers;
window.setupModals = setupModals;
window.openModal = openModal;
window.closeModal = closeModal;
window.openObjectModal = openObjectModal;
window.handleObjectAction = handleObjectAction;
window.openCompareModal = openCompareModal;
window.openSingleImageModal = openSingleImageModal;
window.setupMapInteractions = setupMapInteractions;
window.setupMapInteractionsRoutes = setupMapInteractionsRoutes;
window.setupHideMapButton = setupHideMapButton;
window.setupMapModal = setupMapModal;
window.setupMapModalRoutes = setupMapModalRoutes;
window.filterMapZones = filterMapZones;
window.highlightPlaceOnMap = highlightPlaceOnMap;
window.getMapCoordinates = getMapCoordinates;
window.setupTimeline = setupTimeline;
window.renderTimelineEvents = renderTimelineEvents;
window.setupSearch = setupSearch;
window.applyFilters = applyFilters;
window.buildStats = buildStats;
window.openPeriodModal = openPeriodModal;
window.buildGallery = buildGallery;
window.setCurrentGalleryIndex = setCurrentGalleryIndex;
window.updateGalleryNavButtons = updateGalleryNavButtons;
window.openGalleryByOffset = openGalleryByOffset;
window.focusPlaceOnMap = focusPlaceOnMap;
window.checkAndFocusPlaceOnLoad = checkAndFocusPlaceOnLoad;
window.attachMapFocusHandler = attachMapFocusHandler;
window.attachDetailsHandler = attachDetailsHandler;
window.initApp = initApp;

document.addEventListener('DOMContentLoaded', () => {
  if (CSS.supports('scroll-behavior', 'smooth')) {
    document.documentElement.style.scrollBehavior = 'smooth';
  }
  
  // Отключаем AOS на мобильных для производительности
  const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (window.AOS && !isMobile) {
    AOS.init({ duration: 800, once: true, offset: 100, easing: 'ease-out-cubic', delay: 0 });
  }
  
  // Всегда инициализируем мобильное меню
  if (typeof initMobileMenu === 'function') {
    initMobileMenu();
  }
  
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#map') {
      window.scrollTo(0, 0);
      setTimeout(() => {
        if (typeof window.checkAndFocusPlaceOnLoad === 'function') {
          window.checkAndFocusPlaceOnLoad();
        }
      }, 300);
    }
  });
  
  if (window.location.hash === '#map') {
    window.scrollTo(0, 0);
    setTimeout(() => {
      if (typeof window.checkAndFocusPlaceOnLoad === 'function') {
        window.checkAndFocusPlaceOnLoad();
      }
    }, 300);
  }

  loadPlacesData()
    .then(() => {
      if (typeof window.syncFromAppState === 'function') {
        window.syncFromAppState();
      }
      try {
        if (typeof window.initApp === 'function') {
          window.initApp();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    })
    .catch((error) => {
      console.error('Error loading places data:', error);
    });
});
