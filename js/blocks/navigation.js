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
    let touchStartTime = 0;
    let touchStartTarget = null;
    
    // Handle touch events first
    link.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchStartTarget = e.target;
      link.dataset.touching = 'true';
      // Don't prevent default - allow navigation
    }, { passive: true });
    
    link.addEventListener('touchend', (e) => {
      const touchDuration = Date.now() - touchStartTime;
      const isSameTarget = e.target === touchStartTarget || e.target.closest('a') === link;
      
      if (touchDuration < 300 && isSameTarget) {
        // This is a tap, not a scroll
        e.stopPropagation();
        const href = link.getAttribute('href');
        if (href && href !== '#') {
          if (href.startsWith('#')) {
            toggleMenu(false);
            // Allow default navigation
          } else {
            toggleMenu(false);
            // Allow default navigation
          }
        } else {
          toggleMenu(false);
        }
      }
      delete link.dataset.touching;
      touchStartTime = 0;
      touchStartTarget = null;
    }, { passive: false });
    
    // Use click event as fallback
    link.addEventListener('click', (e) => {
      // Don't prevent default - allow navigation
      const href = link.getAttribute('href');
      if (href && href !== '#') {
        // For same-page anchors, close immediately
        if (href.startsWith('#')) {
          toggleMenu(false);
        } else {
          // For external links, close after a short delay
          setTimeout(() => {
            toggleMenu(false);
          }, 50);
        }
      } else {
        toggleMenu(false);
      }
    }, { passive: true });
  });
  
  // Close menu when clicking outside
  const handleOutsideClick = (e) => {
    // Don't close if clicking on a link or if we just touched a link
    const clickedLink = e.target.closest('.header__nav-link');
    if (clickedLink || clickedLink?.dataset.touching === 'true') {
      return;
    }
    // Don't close if clicking on the toggle button
    if (menuToggle.contains(e.target)) {
      return;
    }
    // Only close if clicking outside the menu
    if (!mainNav.contains(e.target)) {
      if (mainNav.classList.contains('menu-open')) {
        toggleMenu(false);
      }
    }
  };
  
  // Use mousedown instead of click for better mobile support
  document.addEventListener('mousedown', handleOutsideClick);
  document.addEventListener('touchstart', (e) => {
    // Only handle if not touching a link
    const clickedLink = e.target.closest('.header__nav-link');
    if (!clickedLink || clickedLink.dataset.touching !== 'true') {
      // Small delay to let link handlers run first
      setTimeout(() => {
        if (!clickedLink || clickedLink.dataset.touching !== 'true') {
          handleOutsideClick(e);
        }
      }, 10);
    }
  }, { passive: true });
  
  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav.classList.contains('menu-open')) {
      toggleMenu(false);
    }
  });
}

export { focusPlaceOnMap, checkAndFocusPlaceOnLoad, initMobileMenu };

