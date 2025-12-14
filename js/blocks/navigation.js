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

function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  
  if (!menuToggle || !mainNav) return;
  
  const toggleMenu = (open) => {
    menuToggle.setAttribute('aria-expanded', String(open));
    mainNav.setAttribute('aria-expanded', String(open));
    if (open) {
      mainNav.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
    } else {
      mainNav.classList.remove('menu-open');
      document.body.style.overflow = '';
    }
  };
  
  const handleToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
    toggleMenu(!isExpanded);
  };
  
  menuToggle.addEventListener('click', handleToggle);
  menuToggle.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleToggle(e);
  }, { passive: false });
  
  // Close menu when clicking on a link
  const navLinks = mainNav.querySelectorAll('.header__nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      toggleMenu(false);
    });
    link.addEventListener('touchend', (e) => {
      e.preventDefault();
      toggleMenu(false);
    }, { passive: false });
  });
  
  // Close menu when clicking outside
  const handleOutsideClick = (e) => {
    if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
      if (mainNav.classList.contains('menu-open')) {
        toggleMenu(false);
      }
    }
  };
  
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('touchend', handleOutsideClick);
  
  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav.classList.contains('menu-open')) {
      toggleMenu(false);
    }
  });
}

export { focusPlaceOnMap, checkAndFocusPlaceOnLoad, initMobileMenu };

