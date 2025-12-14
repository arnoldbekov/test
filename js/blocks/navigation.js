import { appState } from '../common/data.js';

function focusPlaceOnMap(placeId, closeModalEl = null) {
  if (closeModalEl && typeof window.closeModal === 'function') {
    window.closeModal(closeModalEl);
  } else {
    if (typeof window.closeModal === 'function') {
      window.closeModal(document.getElementById('compareModal'));
      window.closeModal(document.getElementById('objectModal'));
    }
  }
  
  const map = document.getElementById('pmrMap');
  const mapSection = document.getElementById('map');
  
  if (map && mapSection) {
    mapSection.style.display = 'block';
    setTimeout(() => {
      if (typeof window.highlightPlaceOnMap === 'function') {
        window.highlightPlaceOnMap(placeId);
      }
      setTimeout(() => {
        mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }, 100);
    return;
  }
  
  const isInPages = window.location.pathname.includes('/pages/');
  const targetPath = isInPages ? '../index.html#map' : 'index.html#map';
  
  localStorage.setItem('show_place_focus', String(placeId));
  
  const currentPath = window.location.pathname;
  if (currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath.endsWith('index.html#map')) {
    window.location.hash = 'map';
    setTimeout(() => {
      checkAndFocusPlaceOnLoad();
    }, 100);
    return;
  }
  
  window.location.href = targetPath;
}

function checkAndFocusPlaceOnLoad() {
  const stored = localStorage.getItem('show_place_focus');
  if (!stored) return;
  const placeId = Number(stored);
  const map = document.getElementById('pmrMap');
  const mapSection = document.getElementById('map');
  if (map && mapSection && !Number.isNaN(placeId)) {
    mapSection.style.display = 'block';
    setTimeout(() => {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    
    const checkMapZones = () => {
      const zones = document.querySelectorAll('.map-zone');
      if (zones.length > 0) {
        if (typeof window.highlightPlaceOnMap === 'function') {
          window.highlightPlaceOnMap(placeId);
        }
        localStorage.removeItem('show_place_focus');
      } else {
        setTimeout(checkMapZones, 200);
      }
    };
    setTimeout(checkMapZones, 300);
  }
}

export { focusPlaceOnMap, checkAndFocusPlaceOnLoad };

