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
    const pt = map.createSVGPoint();
    pt.x = centerX;
    pt.y = centerY;
    const svgP = pt.matrixTransform(map.getScreenCTM().inverse());
    translateX = svgP.x - (svgP.x - translateX) * (newScale / scale);
    translateY = svgP.y - (svgP.y - translateY) * (newScale / scale);
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

  map.addEventListener('touchstart', evt => {
    if (evt.touches.length !== 1) return;
    const t = evt.touches[0];
    isPanning = true;
    startX = t.clientX - translateX;
    startY = t.clientY - translateY;
  }, { passive: false });

  map.addEventListener('touchmove', evt => {
    if (!isPanning || evt.touches.length !== 1) return;
    const t = evt.touches[0];
    translateX = t.clientX - startX;
    translateY = t.clientY - startY;
    applyTransform();
    evt.preventDefault();
  }, { passive: false });

  map.addEventListener('touchend', () => { isPanning = false; });

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

  map.addEventListener('click', evt => {
    if (appState.isSelectingStartPoint) return;
    const zone = evt.target.closest('.map-zone');
    if (!zone) return;
    const place = appState.places.find(p => p.id === Number(zone.dataset.id));
    if (place && typeof window.openObjectModal === 'function') {
      window.openObjectModal(place);
    }
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

  setupMapTooltips(map, 'mapTooltip');
}

function setupMapTooltips(mapElement, tooltipId) {
  const tooltip = document.getElementById(tooltipId);
  if (!tooltip) return;
  const tooltipTitle = tooltip.querySelector('.tooltip-title');
  const tooltipDescription = tooltip.querySelector('.tooltip-description');
  const tooltipImage = tooltip.querySelector('.tooltip-image');
  const mapWrapper = mapElement.closest('.map-wrapper') || mapElement.closest('.fullscreen-map-wrapper');
  if (!tooltipTitle || !tooltipDescription || !tooltipImage || !mapWrapper) return;
  let currentZone = null, hideTimeout = null, showTimeout = null;

  function showTooltip(zone) {
    const place = appState.places.find(p => p.id === Number(zone.dataset.id));
    if (!place) return;
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
    const tooltipHeight = tooltipImage.style.display === 'none' ? 80 : 120;
    let left = relativeX + 25, top = relativeY - tooltipHeight / 2;
    if (left + tooltipWidth > wrapperRect.width) left = relativeX - tooltipWidth - 25;
    if (left < 0) left = 10;
    if (top < 0) top = 10;
    if (top + tooltipHeight > wrapperRect.height) top = wrapperRect.height - tooltipHeight - 10;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.setAttribute('aria-hidden', 'false');
    currentZone = zone;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function hideTooltip() {
    tooltip.setAttribute('aria-hidden', 'true');
    currentZone = null;
  }

  mapElement.addEventListener('mouseover', (evt) => {
    const zone = evt.target.closest('.map-zone');
    if (!zone || zone === currentZone) return;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    if (showTimeout) clearTimeout(showTimeout);
    showTimeout = setTimeout(() => {
      showTooltip(zone);
      showTimeout = null;
    }, 300);
  }, true);

  mapElement.addEventListener('mouseout', (evt) => {
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
    hideTimeout = setTimeout(() => hideTooltip(), 100);
  });

  if (tooltipBtn) {
    tooltipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentPlace && typeof window.openObjectModal === 'function') {
        window.openObjectModal(currentPlace);
        hideTooltip();
      }
    });
  }
}

function setupMapInteractionsRoutes() {
  const map = document.getElementById('pmrMapRoutes');
  if (!map) return;
  const content = document.getElementById('mapContentRoutes');
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

  map.addEventListener('touchstart', evt => {
    if (evt.touches.length !== 1) return;
    const t = evt.touches[0];
    isPanning = true;
    startX = t.clientX - translateX;
    startY = t.clientY - translateY;
  }, { passive: false });

  map.addEventListener('touchmove', evt => {
    if (!isPanning || evt.touches.length !== 1) return;
    const t = evt.touches[0];
    translateX = t.clientX - startX;
    translateY = t.clientY - startY;
    applyTransform();
    evt.preventDefault();
  }, { passive: false });

  map.addEventListener('touchend', () => { isPanning = false; });

  const zoomInBtn = document.getElementById('zoomInBtnRoutes');
  const zoomOutBtn = document.getElementById('zoomOutBtnRoutes');
  const zoomResetBtn = document.getElementById('zoomResetBtnRoutes');
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

  map.addEventListener('click', evt => {
    if (appState.isSelectingStartPoint) return;
    const zone = evt.target.closest('.map-zone');
    if (!zone) return;
    const place = appState.places.find(p => p.id === Number(zone.dataset.id));
    if (place && typeof window.openObjectModal === 'function') {
      window.openObjectModal(place);
    }
  });

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
    const scaleFactor = newScale / scale;
    // Calculate the point in SVG coordinates before transform
    const currentX = (svgP.x - translateX) / scale;
    const currentY = (svgP.y - translateY) / scale;
    // Calculate new translate to keep the same point under the cursor
    translateX = svgP.x - currentX * newScale;
    translateY = svgP.y - currentY * newScale;
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

  // Add click handler for zones
  map.addEventListener('click', evt => {
    if (isPanning) return;
    const zone = evt.target.closest('.map-zone');
    if (!zone) return;
    const place = appState.places.find(p => p.id === Number(zone.dataset.id));
    if (place && typeof window.openObjectModal === 'function') {
      window.openObjectModal(place);
    }
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

function setupMapTooltipsForModal() {
  const map = document.getElementById('pmrMapModal');
  if (!map) return;
  const tooltip = document.getElementById('mapTooltipModal');
  if (!tooltip) return;
  const tooltipTitle = tooltip.querySelector('.tooltip-title');
  const tooltipDescription = tooltip.querySelector('.tooltip-description');
  const tooltipImage = tooltip.querySelector('.tooltip-image');
  const tooltipBtn = tooltip.querySelector('.tooltip-btn');
  const zones = map.querySelectorAll('.map-zone');
  let currentPlace = null;

  function showTooltip(zone) {
    const place = appState.places.find(p => p.id === Number(zone.dataset.id));
    if (!place) return;
    currentPlace = place;
    tooltipTitle.textContent = place.name;
    const descriptionText = place.short || '';
    tooltipDescription.textContent = descriptionText.length > 50 ? descriptionText.substring(0, 50) + '...' : descriptionText;
    if (tooltipBtn) {
      tooltipBtn.dataset.tooltipId = place.id;
    }
    if (place.images && place.images.now) {
      tooltipImage.src = normalizeImagePath(place.images.now);
      tooltipImage.alt = place.name;
      tooltipImage.style.display = 'block';
    } else {
      tooltipImage.style.display = 'none';
    }
    tooltip.setAttribute('aria-hidden', 'false');
  }

  function hideTooltip() {
    tooltip.setAttribute('aria-hidden', 'true');
  }

  if (tooltipBtn) {
    tooltipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentPlace && typeof window.openObjectModal === 'function') {
        window.openObjectModal(currentPlace);
        hideTooltip();
      }
    });
  }

  zones.forEach(zone => {
    zone.addEventListener('mouseenter', () => showTooltip(zone));
    zone.addEventListener('mouseleave', hideTooltip);
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      showTooltip(zone);
    });
  });
}

export { setupMapInteractions, setupMapInteractionsRoutes, setupMapTooltips, setupHideMapButton, filterMapZones, highlightPlaceOnMap, getMapCoordinates, setupMapModal };

