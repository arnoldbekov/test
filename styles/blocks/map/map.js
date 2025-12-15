import { appState } from '../../../js/common/data.js';
import { normalizeImagePath } from '../../../js/common/data.js';

function setupMapInteractions() {
  const map = document.getElementById('pmrMap');
  if (!map) return;
  const content = document.getElementById('mapContent');
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 700;
  let scale = 1, minScale = 1, maxScale = 6, translateX = 0, translateY = 0, isPanning = false, startX = 0, startY = 0;

  function clampTransform() {
    const minX = SVG_WIDTH * (1 - scale), maxX = 0, minY = SVG_HEIGHT * (1 - scale), maxY = 0;
    if (translateX < minX) translateX = minX;
    if (translateX > maxX) translateX = maxX;
    if (translateY < minY) translateY = minY;
    if (translateY > maxY) translateY = maxY;
  }

  function applyTransform() {
    clampTransform();
    if (content) content.setAttribute('transform', `translate(${translateX} ${translateY}) scale(${scale})`);
  }

  function smoothZoom(targetScale, centerX, centerY) {
    const newScale = Math.min(maxScale, Math.max(minScale, targetScale));
    if (!content || newScale === scale) return;
    const rect = map.getBoundingClientRect();
    const pt = map.createSVGPoint();
    pt.x = centerX;
    pt.y = centerY;
    const svgP = pt.matrixTransform(map.getScreenCTM().inverse());
    const scaleRatio = newScale / scale;
    translateX = svgP.x - (svgP.x - translateX) * scaleRatio;
    translateY = svgP.y - (svgP.y - translateY) * scaleRatio;
    scale = newScale;
    applyTransform();
  }

  map.addEventListener('wheel', evt => {
    evt.preventDefault();
    const delta = -evt.deltaY;
    smoothZoom(scale * (delta > 0 ? 1.15 : 0.85), evt.clientX, evt.clientY);
  }, { passive: false });

  map.addEventListener('mousedown', evt => {
    if (evt.button !== 0) return;
    isPanning = true;
    startX = evt.clientX - translateX;
    startY = evt.clientY - translateY;
  });

  window.addEventListener('mousemove', evt => {
    if (!isPanning) return;
    translateX = evt.clientX - startX;
    translateY = evt.clientY - startY;
    applyTransform();
  });

  window.addEventListener('mouseup', () => { isPanning = false; });

  let touchStartDistance = 0;
  let touchStartScale = 1;
  let lastTouchTime = 0;

  map.addEventListener('touchstart', evt => {
    if (evt.touches.length === 2) {
      const touch1 = evt.touches[0];
      const touch2 = evt.touches[1];
      touchStartDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartScale = scale;
      isPanning = false;
    } else if (evt.touches.length === 1) {
      const t = evt.touches[0];
      const now = Date.now();
      if (now - lastTouchTime < 300) {
        return;
      }
      isPanning = true;
      startX = t.clientX - translateX;
      startY = t.clientY - translateY;
    }
  }, { passive: true });

  map.addEventListener('touchmove', evt => {
    if (evt.touches.length === 2) {
      evt.preventDefault();
      const touch1 = evt.touches[0];
      const touch2 = evt.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const newScale = touchStartScale * (distance / touchStartDistance);
      const rect = map.getBoundingClientRect();
      const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
      const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
      smoothZoom(newScale, centerX, centerY);
    } else if (isPanning && evt.touches.length === 1) {
      const t = evt.touches[0];
      translateX = t.clientX - startX;
      translateY = t.clientY - startY;
      applyTransform();
      evt.preventDefault();
    }
  }, { passive: false });

  map.addEventListener('touchend', (evt) => {
    if (evt.touches.length === 0) {
      isPanning = false;
      lastTouchTime = Date.now();
    } else if (evt.touches.length === 1) {
      isPanning = true;
      const t = evt.touches[0];
      startX = t.clientX - translateX;
      startY = t.clientY - translateY;
    }
  });

  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
    const rect = map.getBoundingClientRect();
    smoothZoom(scale * 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
    const rect = map.getBoundingClientRect();
    smoothZoom(scale * 0.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
  });

  setupMapTooltips(map, 'mapTooltip');
}

function setupMapTooltips(mapElement, tooltipId) {
  const tooltip = document.getElementById(tooltipId);
  if (!tooltip) return;
  const tooltipTitle = tooltip.querySelector('.tooltip-title');
  const tooltipDescription = tooltip.querySelector('.tooltip-description');
  const tooltipImage = tooltip.querySelector('.tooltip-image');
  const tooltipDetailsBtn = tooltip.querySelector('.tooltip-details-btn');
  const mapWrapper = mapElement.closest('.map-wrapper') || mapElement.closest('.fullscreen-map-wrapper') || mapElement.closest('.map-modal-wrapper');
  if (!tooltipTitle || !tooltipDescription || !tooltipImage || !mapWrapper) return;
  let currentZone = null, hideTimeout = null, showTimeout = null, currentPlace = null, isSticky = false, isTouchPanning = false;

  function closeMapModalsIfOpen() {
    const modalToClose = tooltip.closest('.modal');
    const mainMapModal = document.getElementById('mapModal');
    const routesMapModal = document.getElementById('mapModalRoutes');
    if (modalToClose && typeof window.closeModal === 'function') {
      window.closeModal(modalToClose);
    }
    if (routesMapModal && routesMapModal.classList.contains('modal--visible') && typeof window.closeModal === 'function') {
      window.closeModal(routesMapModal);
    }
    if (mainMapModal && mainMapModal.classList.contains('modal--visible') && typeof window.closeModal === 'function') {
      window.closeModal(mainMapModal);
    }
  }

  function showTooltip(zone, place, sticky = false) {
    if (!place) {
      place = appState.places.find(p => p.id === Number(zone.dataset.id));
    }
    if (!place) return;
    currentPlace = place;
    isSticky = sticky;
    tooltipTitle.textContent = place.name;
    const descriptionText = place.short || '';
    tooltipDescription.textContent = descriptionText.length > 50 ? descriptionText.substring(0, 50) + '...' : descriptionText;
    if (place.images && place.images.now) {
      tooltipImage.src = normalizeImagePath(place.images.now);
      tooltipImage.alt = place.name;
      tooltipImage.style.display = 'block';
      tooltipImage.onerror = () => { tooltipImage.style.display = 'none'; };
    } else {
      tooltipImage.style.display = 'none';
    }
    const wrapperRect = mapWrapper.getBoundingClientRect();
    const zoneCircle = zone.querySelector('circle.map-pin') || zone.querySelector('circle');
    if (!zoneCircle) return;
    const circleRect = zoneCircle.getBoundingClientRect();
    const relativeX = circleRect.left + circleRect.width / 2 - wrapperRect.left;
    const relativeY = circleRect.top + circleRect.height / 2 - wrapperRect.top;
    const tooltipWidth = 280;
    const tooltipHeight = tooltipImage.style.display === 'none' ? 140 : 180;
    let left = relativeX + 25, top = relativeY - tooltipHeight / 2;
    if (left + tooltipWidth > wrapperRect.width) left = relativeX - tooltipWidth - 25;
    if (left < 0) left = 10;
    if (top < 0) top = 10;
    if (top + tooltipHeight > wrapperRect.height) top = wrapperRect.height - tooltipHeight - 10;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.setAttribute('aria-hidden', 'false');
    tooltip.style.pointerEvents = 'auto';
    if (isSticky) {
      tooltip.classList.add('tooltip-sticky');
    } else {
      tooltip.classList.remove('tooltip-sticky');
    }
    currentZone = zone;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function hideTooltip(force = false) {
    if (isSticky && !force) return;
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.style.pointerEvents = 'none';
    tooltip.classList.remove('tooltip-sticky');
    currentZone = null;
    currentPlace = null;
    isSticky = false;
  }

  if (tooltipDetailsBtn) {
    const handleDetailsClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const place = currentPlace;
      if (place) {
        hideTooltip(true);
        closeMapModalsIfOpen();
        setTimeout(() => {
          if (typeof window.openObjectModal === 'function') {
            window.openObjectModal(place);
          } else {
            console.error('openObjectModal function not found');
          }
        }, 50);
      }
    };
    
    tooltipDetailsBtn.addEventListener('click', handleDetailsClick, true);
    tooltipDetailsBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleDetailsClick(e);
    }, true);
  }

  mapElement.addEventListener('mouseover', (evt) => {
    if (isSticky) return;
    const zone = evt.target.closest('.map-zone');
    if (!zone || zone === currentZone) return;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    if (showTimeout) clearTimeout(showTimeout);
    showTimeout = setTimeout(() => {
      showTooltip(zone, null, false);
      showTimeout = null;
    }, 300);
  }, true);

  mapElement.addEventListener('mouseout', (evt) => {
    if (isSticky) return;
    const zone = evt.target.closest('.map-zone');
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (zone && zone === currentZone) {
      const relatedTarget = evt.relatedTarget;
      if (!relatedTarget || !tooltip.contains(relatedTarget)) {
        hideTimeout = setTimeout(() => hideTooltip(), 200);
      }
    }
  }, true);

  tooltip.addEventListener('mouseleave', () => {
    if (!isSticky) {
      hideTimeout = setTimeout(() => hideTooltip(), 100);
    }
  });

  mapElement.addEventListener('click', (evt) => {
    if (appState.isSelectingStartPoint) return;
    if (evt.target.closest('.tooltip-details-btn') || evt.target.classList.contains('tooltip-details-btn')) {
      return;
    }
    if (tooltip.contains(evt.target)) {
      return;
    }
    const zone = evt.target.closest('.map-zone');
    if (!zone) {
      if (!tooltip.contains(evt.target)) {
        hideTooltip(true);
      }
      return;
    }
    const place = appState.places.find(p => p.id === Number(zone.dataset.id));
    if (place) {
      showTooltip(zone, place, true);
    }
  }, true);

  mapElement.addEventListener('touchstart', (evt) => {
    if (evt.touches.length === 2) {
      isTouchPanning = true;
      return;
    }
    const zone = evt.target.closest('.map-zone');
    if (zone && evt.touches.length === 1 && !isTouchPanning) {
      evt.preventDefault();
      const place = appState.places.find(p => p.id === Number(zone.dataset.id));
      if (place) {
        showTooltip(zone, place, true);
      }
    }
  }, { passive: false });

  mapElement.addEventListener('touchend', () => {
    isTouchPanning = false;
  });

  tooltip.addEventListener('click', (evt) => {
    if (evt.target.closest('.tooltip-details-btn') || evt.target.classList.contains('tooltip-details-btn')) {
      return;
    }
    evt.stopPropagation();
  }, true);

  mapWrapper.addEventListener('click', (evt) => {
    if (evt.target.closest('.tooltip-details-btn') || evt.target.classList.contains('tooltip-details-btn')) {
      return;
    }
    if (!tooltip.contains(evt.target) && !evt.target.closest('.map-zone')) {
      hideTooltip(true);
    }
  }, true);
}

function setupMapInteractionsRoutes() {
  const map = document.getElementById('pmrMapRoutes');
  if (!map) return;
  const content = document.getElementById('mapContentRoutes');
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 700;
  const shared = window.__routesMapTransform || { scale: 1, translateX: 0, translateY: 0 };
  window.__routesMapTransform = shared;
  let { scale, translateX, translateY } = shared;
  const minScale = 1, maxScale = 6;
  let isPanning = false, startX = 0, startY = 0;

  function clampTransform() {
    const minX = SVG_WIDTH * (1 - scale), maxX = 0, minY = SVG_HEIGHT * (1 - scale), maxY = 0;
    if (translateX < minX) translateX = minX;
    if (translateX > maxX) translateX = maxX;
    if (translateY < minY) translateY = minY;
    if (translateY > maxY) translateY = maxY;
  }

  function syncTransformAll() {
    shared.scale = scale;
    shared.translateX = translateX;
    shared.translateY = translateY;
    const targets = [
      document.getElementById('mapContentRoutes'),
      document.getElementById('mapContentModalRoutes')
    ].filter(Boolean);
    targets.forEach(t => t.setAttribute('transform', `translate(${translateX} ${translateY}) scale(${scale})`));
  }

  function applyTransform() {
    clampTransform();
    syncTransformAll();
  }

  function smoothZoom(newScale, centerX, centerY) {
    const target = Math.min(maxScale, Math.max(minScale, newScale));
    if (!content || target === scale) return;
    const pt = map.createSVGPoint();
    pt.x = centerX;
    pt.y = centerY;
    const svgP = pt.matrixTransform(map.getScreenCTM().inverse());
    translateX = svgP.x - (svgP.x - translateX) * (target / scale);
    translateY = svgP.y - (svgP.y - translateY) * (target / scale);
    scale = target;
    applyTransform();
  }

  map.addEventListener('wheel', evt => {
    evt.preventDefault();
    const delta = -evt.deltaY;
    smoothZoom(scale * (delta > 0 ? 1.15 : 0.85), evt.clientX, evt.clientY);
  }, { passive: false });

  map.addEventListener('mousedown', evt => {
    if (evt.button !== 0) return;
    isPanning = true;
    startX = evt.clientX - translateX;
    startY = evt.clientY - translateY;
    map.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', evt => {
    if (!isPanning) return;
    translateX = evt.clientX - startX;
    translateY = evt.clientY - startY;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    map.style.cursor = '';
  });

  let touchStartDistance = 0;
  let touchStartScale = 1;
  let lastTouchTime = 0;

  map.addEventListener('touchstart', evt => {
    if (evt.touches.length === 2) {
      const touch1 = evt.touches[0];
      const touch2 = evt.touches[1];
      touchStartDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartScale = scale;
      isPanning = false;
    } else if (evt.touches.length === 1) {
      const t = evt.touches[0];
      const now = Date.now();
      if (now - lastTouchTime < 300) {
        return;
      }
      isPanning = true;
      startX = t.clientX - translateX;
      startY = t.clientY - translateY;
    }
  }, { passive: true });

  map.addEventListener('touchmove', evt => {
    if (evt.touches.length === 2) {
      evt.preventDefault();
      const touch1 = evt.touches[0];
      const touch2 = evt.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const newScale = touchStartScale * (distance / touchStartDistance);
      const rect = map.getBoundingClientRect();
      const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
      const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
      smoothZoom(newScale, centerX, centerY);
    } else if (isPanning && evt.touches.length === 1) {
      const t = evt.touches[0];
      translateX = t.clientX - startX;
      translateY = t.clientY - startY;
      applyTransform();
      evt.preventDefault();
    }
  }, { passive: false });

  map.addEventListener('touchend', (evt) => {
    if (evt.touches.length === 0) {
      isPanning = false;
      lastTouchTime = Date.now();
    } else if (evt.touches.length === 1) {
      isPanning = true;
      const t = evt.touches[0];
      startX = t.clientX - translateX;
      startY = t.clientY - translateY;
    }
  });

  const zoomInBtn = document.getElementById('zoomInBtnRoutes');
  const zoomOutBtn = document.getElementById('zoomOutBtnRoutes');
  const zoomResetBtn = document.getElementById('zoomResetBtnRoutes');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      const rect = map.getBoundingClientRect();
      smoothZoom(scale * 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      const rect = map.getBoundingClientRect();
      smoothZoom(scale * 0.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
    });
  }

  setupMapTooltips(map, 'mapTooltipRoutes');
}

function setupHideMapButton() {
  const hideBtn = document.getElementById('hideMapBtn');
  if (hideBtn) hideBtn.addEventListener('click', () => {
    const mapSection = document.getElementById('map');
    if (mapSection) {
      mapSection.style.display = 'none';
      document.querySelectorAll('.map-zone').forEach(z => z.classList.remove('active-route'));
    }
  });
}

function filterMapZones() {
  const zones = document.querySelectorAll('.map-zone');
  const ids = new Set(appState.filteredPlaces.map(p => p.id));
  zones.forEach(zone => {
    const zonePeriod = zone.dataset.period;
    const id = Number(zone.dataset.id);
    const matchesPeriod = appState.currentPeriod === 'all' || zonePeriod === appState.currentPeriod;
    const matchesData = ids.has(id);
    zone.style.display = matchesPeriod && matchesData ? 'block' : 'none';
  });
}

function highlightPlaceOnMap(placeId) {
  document.querySelectorAll('.map-zone.highlighted').forEach(z => z.classList.remove('highlighted'));
  
  const zones = document.querySelectorAll('.map-zone');
  let found = false;
  zones.forEach(z => {
    const zoneId = Number(z.dataset.id);
    if (zoneId === placeId) {
      z.classList.add('highlighted');
      found = true;
    }
  });
  
  if (!found) {
    setTimeout(() => highlightPlaceOnMap(placeId), 200);
  }
}

function getMapCoordinates(placeId) {
  const map = document.getElementById('pmrMap') || document.getElementById('pmrMapRoutes');
  if (!map) return null;
  const zone = map.querySelector(`.map-zone[data-id="${placeId}"]`);
  if (!zone) return null;
  const pin = zone.querySelector('.map-pin');
  if (!pin) return null;
  return {
    x: parseFloat(pin.getAttribute('cx')),
    y: parseFloat(pin.getAttribute('cy'))
  };
}

function setupMapModal() {
  const openBtn = document.getElementById('openMapModalBtn');
  const mapModal = document.getElementById('mapModal');
  const closeBtn = mapModal ? mapModal.querySelector('.close') : null;
  
  if (openBtn && mapModal) {
    openBtn.addEventListener('click', () => {
      if (typeof window.openModal === 'function') {
        window.openModal('mapModal');
        setTimeout(() => {
          const modalMap = document.getElementById('pmrMapModal');
          if (modalMap && typeof window.loadAndRenderMapZones === 'function') {
            window.loadAndRenderMapZones('mapContentModal');
          }
          if (modalMap) {
            setupMapInteractionsForModal();
            setupMapTooltipsForModal();
          }
        }, 100);
      }
    });
  }
  
  if (closeBtn && mapModal) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (typeof window.closeModal === 'function') {
        window.closeModal(mapModal);
      } else if (mapModal) {
        mapModal.setAttribute('aria-hidden', 'true');
        mapModal.classList.remove('modal--visible');
        document.body.style.overflow = '';
      }
    });
  }

  if (mapModal) {
    mapModal.addEventListener('click', (e) => {
      if (e.target === mapModal || e.target.classList.contains('modal-dialog--map')) {
        if (typeof window.closeModal === 'function') {
          window.closeModal(mapModal);
        } else {
          mapModal.setAttribute('aria-hidden', 'true');
          mapModal.classList.remove('modal--visible');
          document.body.style.overflow = '';
        }
      }
    });
  }
}

function setupMapInteractionsForModal() {
  const map = document.getElementById('pmrMapModal');
  if (!map) return;
  const content = document.getElementById('mapContentModal');
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 700;
  let scale = 1, minScale = 1, maxScale = 6, translateX = 0, translateY = 0, isPanning = false, startX = 0, startY = 0;

  function clampTransform() {
    const minX = SVG_WIDTH * (1 - scale), maxX = 0, minY = SVG_HEIGHT * (1 - scale), maxY = 0;
    if (translateX < minX) translateX = minX;
    if (translateX > maxX) translateX = maxX;
    if (translateY < minY) translateY = minY;
    if (translateY > maxY) translateY = maxY;
  }

  function applyTransform() {
    clampTransform();
    if (content) content.setAttribute('transform', `translate(${translateX} ${translateY}) scale(${scale})`);
  }

  function smoothZoom(targetScale, centerX, centerY) {
    const newScale = Math.min(maxScale, Math.max(minScale, targetScale));
    if (!content || newScale === scale) return;
    const rect = map.getBoundingClientRect();
    const pt = map.createSVGPoint();
    pt.x = centerX;
    pt.y = centerY;
    const svgP = pt.matrixTransform(map.getScreenCTM().inverse());
    const scaleRatio = newScale / scale;
    translateX = svgP.x - (svgP.x - translateX) * scaleRatio;
    translateY = svgP.y - (svgP.y - translateY) * scaleRatio;
    scale = newScale;
    applyTransform();
  }

  const zoomInBtn = document.getElementById('zoomInBtnModal');
  const zoomOutBtn = document.getElementById('zoomOutBtnModal');
  const zoomResetBtn = document.getElementById('zoomResetBtnModal');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      const rect = map.getBoundingClientRect();
      smoothZoom(scale * 1.3, rect.width / 2, rect.height / 2);
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      const rect = map.getBoundingClientRect();
      smoothZoom(scale / 1.3, rect.width / 2, rect.height / 2);
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
    });
  }

  map.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = map.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    smoothZoom(scale * delta, x, y);
  }, { passive: false });

  map.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !e.target.closest('.map-zone')) {
      isPanning = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      map.style.cursor = 'grabbing';
    }
  });

  map.addEventListener('mousemove', (e) => {
    if (isPanning) {
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      applyTransform();
    }
  });

  map.addEventListener('mouseup', () => {
    isPanning = false;
    map.style.cursor = 'default';
  });

  map.addEventListener('mouseleave', () => {
    isPanning = false;
    map.style.cursor = 'default';
  });

  let touchStartDistance = 0;
  let touchStartScale = 1;

  map.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      touchStartDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartScale = scale;
    } else if (e.touches.length === 1) {
      isPanning = true;
      const touch = e.touches[0];
      const rect = map.getBoundingClientRect();
      startX = touch.clientX - translateX;
      startY = touch.clientY - translateY;
    }
  }, { passive: true });

  map.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const newScale = touchStartScale * (distance / touchStartDistance);
      const rect = map.getBoundingClientRect();
      const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
      const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
      smoothZoom(newScale, centerX, centerY);
    } else if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      const touch = e.touches[0];
      translateX = touch.clientX - startX;
      translateY = touch.clientY - startY;
      applyTransform();
    }
  }, { passive: false });

  map.addEventListener('touchend', () => {
    isPanning = false;
  });

  // Click handler removed - now handled in setupMapTooltipsForModal

  map.addEventListener('keydown', evt => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      const zone = evt.target.closest('.map-zone');
      if (!zone) return;
      evt.preventDefault();
      const place = appState.places.find(p => p.id === Number(zone.dataset.id));
      if (place && typeof window.openObjectModal === 'function') {
        window.openObjectModal(place);
      }
    }
  });
}

function setupMapTooltipsForModal() {
  const map = document.getElementById('pmrMapModal');
  if (!map) return;
  const tooltip = document.getElementById('mapTooltipModal');
  if (!tooltip) return;
  const tooltipTitle = tooltip.querySelector('.tooltip-title');
  const tooltipDescription = tooltip.querySelector('.tooltip-description');
  const tooltipImage = tooltip.querySelector('.tooltip-image');
  const tooltipDetailsBtn = tooltip.querySelector('.tooltip-details-btn');
  const mapWrapper = map.closest('.map-modal-wrapper');
  if (!tooltipTitle || !tooltipDescription || !tooltipImage || !mapWrapper) return;
  let currentZone = null, hideTimeout = null, showTimeout = null, currentPlace = null, isSticky = false, isTouchPanning = false;

  function closeMapModalsIfOpen() {
    const modalToClose = tooltip.closest('.modal');
    const mainMapModal = document.getElementById('mapModal');
    const routesMapModal = document.getElementById('mapModalRoutes');
    if (modalToClose && typeof window.closeModal === 'function') {
      window.closeModal(modalToClose);
    }
    if (routesMapModal && routesMapModal.classList.contains('modal--visible') && typeof window.closeModal === 'function') {
      window.closeModal(routesMapModal);
    }
    if (mainMapModal && mainMapModal.classList.contains('modal--visible') && typeof window.closeModal === 'function') {
      window.closeModal(mainMapModal);
    }
  }

  function showTooltip(zone, place, sticky = false) {
    if (!place) {
      place = appState.places.find(p => p.id === Number(zone.dataset.id));
    }
    if (!place) return;
    currentPlace = place;
    isSticky = sticky;
    tooltipTitle.textContent = place.name;
    const descriptionText = place.short || '';
    tooltipDescription.textContent = descriptionText.length > 50 ? descriptionText.substring(0, 50) + '...' : descriptionText;
    if (place.images && place.images.now) {
      tooltipImage.src = normalizeImagePath(place.images.now);
      tooltipImage.alt = place.name;
      tooltipImage.style.display = 'block';
      tooltipImage.onerror = () => { tooltipImage.style.display = 'none'; };
    } else {
      tooltipImage.style.display = 'none';
    }
    const wrapperRect = mapWrapper.getBoundingClientRect();
    const zoneCircle = zone.querySelector('circle.map-pin') || zone.querySelector('circle');
    if (!zoneCircle) return;
    const circleRect = zoneCircle.getBoundingClientRect();
    const relativeX = circleRect.left + circleRect.width / 2 - wrapperRect.left;
    const relativeY = circleRect.top + circleRect.height / 2 - wrapperRect.top;
    const tooltipWidth = 280;
    const tooltipHeight = tooltipImage.style.display === 'none' ? 140 : 180;
    let left = relativeX + 25, top = relativeY - tooltipHeight / 2;
    if (left + tooltipWidth > wrapperRect.width) left = relativeX - tooltipWidth - 25;
    if (left < 0) left = 10;
    if (top < 0) top = 10;
    if (top + tooltipHeight > wrapperRect.height) top = wrapperRect.height - tooltipHeight - 10;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.setAttribute('aria-hidden', 'false');
    tooltip.style.pointerEvents = 'auto';
    if (isSticky) {
      tooltip.classList.add('tooltip-sticky');
    } else {
      tooltip.classList.remove('tooltip-sticky');
    }
    currentZone = zone;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function hideTooltip(force = false) {
    if (isSticky && !force) return;
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.style.pointerEvents = 'none';
    tooltip.classList.remove('tooltip-sticky');
    currentZone = null;
    currentPlace = null;
    isSticky = false;
  }

  if (tooltipDetailsBtn) {
    const handleDetailsClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const place = currentPlace;
      if (place) {
        hideTooltip(true);
        closeMapModalsIfOpen();
        setTimeout(() => {
          if (typeof window.openObjectModal === 'function') {
            window.openObjectModal(place);
          } else {
            console.error('openObjectModal function not found');
          }
        }, 50);
      }
    };
    
    tooltipDetailsBtn.addEventListener('click', handleDetailsClick, true);
    tooltipDetailsBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleDetailsClick(e);
    }, true);
  }

  map.addEventListener('mouseover', (evt) => {
    if (isSticky) return;
    const zone = evt.target.closest('.map-zone');
    if (!zone || zone === currentZone) return;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    if (showTimeout) clearTimeout(showTimeout);
    showTimeout = setTimeout(() => {
      showTooltip(zone, null, false);
      showTimeout = null;
    }, 300);
  }, true);

  map.addEventListener('mouseout', (evt) => {
    if (isSticky) return;
    const zone = evt.target.closest('.map-zone');
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (zone && zone === currentZone) {
      const relatedTarget = evt.relatedTarget;
      if (!relatedTarget || !tooltip.contains(relatedTarget)) {
        hideTimeout = setTimeout(() => hideTooltip(), 200);
      }
    }
  }, true);

  tooltip.addEventListener('mouseleave', () => {
    if (!isSticky) {
      hideTimeout = setTimeout(() => hideTooltip(), 100);
    }
  });

  map.addEventListener('click', (evt) => {
    if (isTouchPanning) return;
    if (evt.target.closest('.tooltip-details-btn') || evt.target.classList.contains('tooltip-details-btn')) {
      return;
    }
    if (tooltip.contains(evt.target)) {
      return;
    }
    const zone = evt.target.closest('.map-zone');
    if (!zone) {
      if (!tooltip.contains(evt.target)) {
        hideTooltip(true);
      }
      return;
    }
    const place = appState.places.find(p => p.id === Number(zone.dataset.id));
    if (place) {
      showTooltip(zone, place, true);
    }
  }, true);

  tooltip.addEventListener('click', (evt) => {
    if (evt.target.closest('.tooltip-details-btn') || evt.target.classList.contains('tooltip-details-btn')) {
      return;
    }
    evt.stopPropagation();
  }, true);

  mapWrapper.addEventListener('click', (evt) => {
    if (!tooltip.contains(evt.target) && !evt.target.closest('.map-zone')) {
      hideTooltip(true);
    }
  });

  map.addEventListener('touchstart', (evt) => {
    if (evt.touches.length === 2) {
      isTouchPanning = true;
      return;
    }
    const zone = evt.target.closest('.map-zone');
    if (zone && evt.touches.length === 1 && !isTouchPanning) {
      evt.preventDefault();
      const place = appState.places.find(p => p.id === Number(zone.dataset.id));
      if (place) {
        showTooltip(zone, place, true);
      }
    }
  }, { passive: false });

  map.addEventListener('touchend', () => {
    isTouchPanning = false;
  });
}

function setupMapModalRoutes() {
  const openBtn = document.getElementById('openMapModalBtnRoutes');
  const mapModal = document.getElementById('mapModalRoutes');
  const closeBtn = mapModal ? mapModal.querySelector('.close') : null;
  
  if (openBtn && mapModal) {
    openBtn.addEventListener('click', () => {
      if (typeof window.openModal === 'function') {
        window.openModal('mapModalRoutes');
        setTimeout(() => {
          const modalMap = document.getElementById('pmrMapModalRoutes');
          if (modalMap && typeof window.loadAndRenderMapZones === 'function') {
            window.loadAndRenderMapZones('mapContentModalRoutes');
          }
          if (modalMap) {
            setupMapInteractionsForModalRoutes();
            setupMapTooltipsForModalRoutes();
          }
        }, 100);
      }
    });
  }
  
  if (closeBtn && mapModal) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (typeof window.closeModal === 'function') {
        window.closeModal(mapModal);
      } else if (mapModal) {
        mapModal.setAttribute('aria-hidden', 'true');
        mapModal.classList.remove('modal--visible');
        document.body.style.overflow = '';
      }
    });
  }

  if (mapModal) {
    mapModal.addEventListener('click', (e) => {
      if (e.target === mapModal || e.target.classList.contains('modal-dialog--map')) {
        if (typeof window.closeModal === 'function') {
          window.closeModal(mapModal);
        } else {
          mapModal.setAttribute('aria-hidden', 'true');
          mapModal.classList.remove('modal--visible');
          document.body.style.overflow = '';
        }
      }
    });
  }
}

function setupMapInteractionsForModalRoutes() {
  const map = document.getElementById('pmrMapModalRoutes');
  if (!map) return;
  const content = document.getElementById('mapContentModalRoutes');
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 700;
  const shared = window.__routesMapTransform || { scale: 1, translateX: 0, translateY: 0 };
  window.__routesMapTransform = shared;
  let { scale, translateX, translateY } = shared;
  const minScale = 1, maxScale = 6;
  let isPanning = false, startX = 0, startY = 0;

  function clampTransform() {
    const minX = SVG_WIDTH * (1 - scale), maxX = 0, minY = SVG_HEIGHT * (1 - scale), maxY = 0;
    if (translateX < minX) translateX = minX;
    if (translateX > maxX) translateX = maxX;
    if (translateY < minY) translateY = minY;
    if (translateY > maxY) translateY = maxY;
  }

  function syncTransformAll() {
    shared.scale = scale;
    shared.translateX = translateX;
    shared.translateY = translateY;
    const targets = [
      document.getElementById('mapContentRoutes'),
      document.getElementById('mapContentModalRoutes')
    ].filter(Boolean);
    targets.forEach(t => t.setAttribute('transform', `translate(${translateX} ${translateY}) scale(${scale})`));
  }

  function applyTransform() {
    clampTransform();
    syncTransformAll();
  }

  function smoothZoom(targetScale, centerX, centerY) {
    const newScale = Math.min(maxScale, Math.max(minScale, targetScale));
    if (!content || newScale === scale) return;
    const rect = map.getBoundingClientRect();
    const pt = map.createSVGPoint();
    pt.x = centerX;
    pt.y = centerY;
    const svgP = pt.matrixTransform(map.getScreenCTM().inverse());
    const scaleRatio = newScale / scale;
    translateX = svgP.x - (svgP.x - translateX) * scaleRatio;
    translateY = svgP.y - (svgP.y - translateY) * scaleRatio;
    scale = newScale;
    applyTransform();
  }

  const zoomInBtn = document.getElementById('zoomInBtnModalRoutes');
  const zoomOutBtn = document.getElementById('zoomOutBtnModalRoutes');
  const zoomResetBtn = document.getElementById('zoomResetBtnModalRoutes');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      const rect = map.getBoundingClientRect();
      smoothZoom(scale * 1.3, rect.width / 2, rect.height / 2);
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      const rect = map.getBoundingClientRect();
      smoothZoom(scale / 1.3, rect.width / 2, rect.height / 2);
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
    });
  }

  map.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = map.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    smoothZoom(scale * delta, x, y);
  }, { passive: false });

  map.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !e.target.closest('.map-zone')) {
      isPanning = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      map.style.cursor = 'grabbing';
    }
  });

  map.addEventListener('mousemove', (e) => {
    if (isPanning) {
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      applyTransform();
    }
  });

  map.addEventListener('mouseup', () => {
    isPanning = false;
    map.style.cursor = 'default';
  });

  map.addEventListener('mouseleave', () => {
    isPanning = false;
    map.style.cursor = 'default';
  });

  let touchStartDistance = 0;
  let touchStartScale = 1;

  map.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      touchStartDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartScale = scale;
    } else if (e.touches.length === 1) {
      isPanning = true;
      const touch = e.touches[0];
      const rect = map.getBoundingClientRect();
      startX = touch.clientX - translateX;
      startY = touch.clientY - translateY;
    }
  }, { passive: true });

  map.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const newScale = touchStartScale * (distance / touchStartDistance);
      const rect = map.getBoundingClientRect();
      const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
      const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
      smoothZoom(newScale, centerX, centerY);
    } else if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      const touch = e.touches[0];
      translateX = touch.clientX - startX;
      translateY = touch.clientY - startY;
      applyTransform();
    }
  }, { passive: false });

  map.addEventListener('touchend', () => {
    isPanning = false;
  });

  map.addEventListener('keydown', evt => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      const zone = evt.target.closest('.map-zone');
      if (!zone) return;
      evt.preventDefault();
      const place = appState.places.find(p => p.id === Number(zone.dataset.id));
      if (place && typeof window.openObjectModal === 'function') {
        window.openObjectModal(place);
      }
    }
  });
}

function setupMapTooltipsForModalRoutes() {
  const map = document.getElementById('pmrMapModalRoutes');
  if (!map) return;
  const tooltip = document.getElementById('mapTooltipModalRoutes');
  if (!tooltip) return;
  const tooltipTitle = tooltip.querySelector('.tooltip-title');
  const tooltipDescription = tooltip.querySelector('.tooltip-description');
  const tooltipImage = tooltip.querySelector('.tooltip-image');
  const tooltipDetailsBtn = tooltip.querySelector('.tooltip-details-btn');
  const mapWrapper = map.closest('.map-modal-wrapper');
  if (!tooltipTitle || !tooltipDescription || !tooltipImage || !mapWrapper) return;
  let currentZone = null, hideTimeout = null, showTimeout = null, currentPlace = null, isSticky = false;
  let isPanning = false;

  function closeMapModalsIfOpen() {
    const modalToClose = tooltip.closest('.modal');
    const mainMapModal = document.getElementById('mapModal');
    const routesMapModal = document.getElementById('mapModalRoutes');
    if (modalToClose && typeof window.closeModal === 'function') {
      window.closeModal(modalToClose);
    }
    if (routesMapModal && routesMapModal.classList.contains('modal--visible') && typeof window.closeModal === 'function') {
      window.closeModal(routesMapModal);
    }
    if (mainMapModal && mainMapModal.classList.contains('modal--visible') && typeof window.closeModal === 'function') {
      window.closeModal(mainMapModal);
    }
  }

  function showTooltip(zone, place, sticky = false) {
    if (!place) {
      place = appState.places.find(p => p.id === Number(zone.dataset.id));
    }
    if (!place) return;
    currentPlace = place;
    isSticky = sticky;
    tooltipTitle.textContent = place.name;
    const descriptionText = place.short || '';
    tooltipDescription.textContent = descriptionText.length > 50 ? descriptionText.substring(0, 50) + '...' : descriptionText;
    if (place.images && place.images.now) {
      tooltipImage.src = normalizeImagePath(place.images.now);
      tooltipImage.alt = place.name;
      tooltipImage.style.display = 'block';
      tooltipImage.onerror = () => { tooltipImage.style.display = 'none'; };
    } else {
      tooltipImage.style.display = 'none';
    }
    const wrapperRect = mapWrapper.getBoundingClientRect();
    const zoneCircle = zone.querySelector('circle.map-pin') || zone.querySelector('circle');
    if (!zoneCircle) return;
    const circleRect = zoneCircle.getBoundingClientRect();
    const relativeX = circleRect.left + circleRect.width / 2 - wrapperRect.left;
    const relativeY = circleRect.top + circleRect.height / 2 - wrapperRect.top;
    const tooltipWidth = 280;
    const tooltipHeight = tooltipImage.style.display === 'none' ? 140 : 180;
    let left = relativeX + 25, top = relativeY - tooltipHeight / 2;
    if (left + tooltipWidth > wrapperRect.width) left = relativeX - tooltipWidth - 25;
    if (left < 0) left = 10;
    if (top < 0) top = 10;
    if (top + tooltipHeight > wrapperRect.height) top = wrapperRect.height - tooltipHeight - 10;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.setAttribute('aria-hidden', 'false');
    tooltip.style.pointerEvents = 'auto';
    if (isSticky) {
      tooltip.classList.add('tooltip-sticky');
    } else {
      tooltip.classList.remove('tooltip-sticky');
    }
    currentZone = zone;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function hideTooltip(force = false) {
    if (isSticky && !force) return;
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.style.pointerEvents = 'none';
    tooltip.classList.remove('tooltip-sticky');
    currentZone = null;
    currentPlace = null;
    isSticky = false;
  }

  if (tooltipDetailsBtn) {
    const handleDetailsClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const place = currentPlace;
      if (place) {
        hideTooltip(true);
        closeMapModalsIfOpen();
        setTimeout(() => {
          if (typeof window.openObjectModal === 'function') {
            window.openObjectModal(place);
          } else {
            console.error('openObjectModal function not found');
          }
        }, 50);
      }
    };
    
    tooltipDetailsBtn.addEventListener('click', handleDetailsClick, true);
    tooltipDetailsBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleDetailsClick(e);
    }, true);
  }

  map.addEventListener('mouseover', (evt) => {
    if (isSticky) return;
    const zone = evt.target.closest('.map-zone');
    if (!zone || zone === currentZone) return;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    if (showTimeout) clearTimeout(showTimeout);
    showTimeout = setTimeout(() => {
      showTooltip(zone, null, false);
      showTimeout = null;
    }, 300);
  }, true);

  map.addEventListener('mouseout', (evt) => {
    if (isSticky) return;
    const zone = evt.target.closest('.map-zone');
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (zone && zone === currentZone) {
      const relatedTarget = evt.relatedTarget;
      if (!relatedTarget || !tooltip.contains(relatedTarget)) {
        hideTimeout = setTimeout(() => hideTooltip(), 200);
      }
    }
  }, true);

  tooltip.addEventListener('mouseleave', () => {
    if (!isSticky) {
      hideTimeout = setTimeout(() => hideTooltip(), 100);
    }
  });

  map.addEventListener('click', (evt) => {
    if (isPanning) return;
    if (evt.target.closest('.tooltip-details-btn') || evt.target.classList.contains('tooltip-details-btn')) {
      return;
    }
    if (tooltip.contains(evt.target)) {
      return;
    }
    const zone = evt.target.closest('.map-zone');
    if (!zone) {
      if (!tooltip.contains(evt.target)) {
        hideTooltip(true);
      }
      return;
    }
    const place = appState.places.find(p => p.id === Number(zone.dataset.id));
    if (place) {
      showTooltip(zone, place, true);
    }
  }, true);

  tooltip.addEventListener('click', (evt) => {
    if (evt.target.closest('.tooltip-details-btn') || evt.target.classList.contains('tooltip-details-btn')) {
      return;
    }
    evt.stopPropagation();
  }, true);

  mapWrapper.addEventListener('click', (evt) => {
    if (!tooltip.contains(evt.target) && !evt.target.closest('.map-zone')) {
      hideTooltip(true);
    }
  });

  map.addEventListener('touchstart', (evt) => {
    if (evt.touches.length === 2) {
      isPanning = true;
      return;
    }
    const zone = evt.target.closest('.map-zone');
    if (zone && evt.touches.length === 1 && !isPanning) {
      evt.preventDefault();
      const place = appState.places.find(p => p.id === Number(zone.dataset.id));
      if (place) {
        showTooltip(zone, place, true);
      }
    }
  }, { passive: false });

  map.addEventListener('touchend', () => {
    isPanning = false;
  });
}

export { setupMapInteractions, setupMapInteractionsRoutes, setupMapTooltips, setupHideMapButton, filterMapZones, highlightPlaceOnMap, getMapCoordinates, setupMapModal, setupMapModalRoutes };

