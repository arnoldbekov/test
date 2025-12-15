let selectedStartPointId = null;
let selectedStartPointCoords = null;
let isSelectingStartPoint = false;

function setupRoutes() {
  document.querySelectorAll('.route-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const type = btn.dataset.route;
      if (!type) return;
      const routePlaces = getPremadeRoute(type);
      if (!routePlaces || routePlaces.length === 0) {
        alert('Для этого маршрута не найдено объектов.');
        return;
      }
      const ids = routePlaces.map(p => p.id);
      const map = document.getElementById('pmrMap');
      const mapRoutes = document.getElementById('pmrMapRoutes');
      const buildRoute = () => {
        if (map) {
          highlightRoute(ids, selectedStartPointId, selectedStartPointCoords);
          const placeIds = routePlaces.map(p => p.id);
          showRouteSummary('Готовый маршрут', routePlaces, placeIds, selectedStartPointId, selectedStartPointCoords);
        } else if (mapRoutes) {
          const mapSection = document.getElementById('map');
          if (mapSection) {
            mapSection.style.display = 'block';
            setTimeout(() => mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }
          highlightRouteOnRoutesPage(ids, selectedStartPointId, selectedStartPointCoords);
          const placeIds = routePlaces.map(p => p.id);
          showRouteSummary('Готовый маршрут', routePlaces, placeIds, selectedStartPointId, selectedStartPointCoords);
        } else {
          localStorage.setItem('show_route_on_load', JSON.stringify({ routeId: null, routeName: btn.textContent.trim(), placeIds: ids }));
          const isInPages = window.location.pathname.includes('/pages/');
          window.location.href = isInPages ? '../index.html#map' : 'index.html#map';
        }
      };
      startStartPointSelection({
        skipCloseModal: true,
        openModalOnSelect: false,
        onSelected: () => buildRoute()
      });
    });
  });
  const createBtn = document.getElementById('createCustom');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      ensureRouteChecklist();
      selectedStartPointId = null;
      selectedStartPointCoords = null;
      const display = document.getElementById('startPointDisplay');
      if (display) {
        display.textContent = '';
        display.style.color = '';
        display.style.fontWeight = '';
      }
      if (typeof window.openModal === 'function') {
        window.openModal('routeModal');
      }
    });
  }
  const saveBtn = document.getElementById('saveRoute');
  if (saveBtn) saveBtn.addEventListener('click', saveCustomRoute);
  const selectStartPointBtn = document.getElementById('selectStartPoint');
  if (selectStartPointBtn) {
    selectStartPointBtn.addEventListener('click', () => {
      startStartPointSelection();
    });
  }
}

function ensureRouteChecklist() {
  const list = document.getElementById('routeChecklist');
  if (!list) return;
  if (list.children.length === 0) {
    const places = window.appState?.places || window.places || [];
    const getPeriodName = window.getPeriodName || (() => '');
    const getTypeName = window.getTypeName || (() => '');
    list.innerHTML = places.map(p => `
      <label>
        <input type="checkbox" value="${p.id}">
        <span>${p.name} (${getPeriodName(p.period)}, ${getTypeName(p.type)})</span>
      </label>
    `).join('');
  }
}

function getPremadeRoute(type) {
  const places = window.appState?.places || window.places || [];
  switch (type) {
    case 'architecture': {
      const archIds = [1, 3, 10, 16, 19, 23, 30, 31];
      return archIds
        .map(id => places.find(p => p.id === id))
        .filter(Boolean);
    }
    case 'military': return places.filter(p => p.type === 'fortress' || p.type === 'memorial').slice(0, 7);
    case 'religious': return places.filter(p => p.type === 'religious').slice(0, 7);
    case 'urban': return places.filter(p => p.type === 'monument' || p.type === 'museum').slice(0, 7);
    default: return [];
  }
}

function getIntermediatePoint(p1, p2) {
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 700;
  const centerX = SVG_WIDTH / 2;
  const centerY = SVG_HEIGHT / 2;
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const perpAngle = angle + Math.PI / 2;
  const pullToCenter = Math.min(dist * 0.15, 30);
  const centerPullX = (centerX - midX) * 0.3;
  const centerPullY = (centerY - midY) * 0.3;
  return {
    x: midX + centerPullX + Math.cos(perpAngle) * pullToCenter * 0.3,
    y: midY + centerPullY + Math.sin(perpAngle) * pullToCenter * 0.3
  };
}

function drawRoutePath(ids, startPointId = null, startPointCoords = null) {
  const maps = [
    document.getElementById('pmrMapRoutes'),
    document.getElementById('pmrMapModalRoutes'),
    document.getElementById('pmrMap'),
    document.getElementById('pmrMapModal')
  ].filter(Boolean);
  if (!maps.length || !ids || ids.length === 0) return;
  const optimizedIds = optimizeRoute(ids, startPointId, startPointCoords);
  if (optimizedIds.length < 1) return;
  let pathStartCoord = null;
  if (startPointId) {
    pathStartCoord = getMapCoordinates(startPointId);
  } else if (startPointCoords) {
    pathStartCoord = startPointCoords;
  }
  const coords = optimizedIds.map(id => getMapCoordinates(id)).filter(c => c !== null);
  if (coords.length < 1) return;
  if (!pathStartCoord && coords.length < 2) return;
  const SVG_WIDTH = 1000;
  const centerX = SVG_WIDTH / 2;
  const centerY = 700 / 2;
  let pathData = '';
  if (pathStartCoord && coords.length > 0) {
    pathData = `M ${pathStartCoord.x} ${pathStartCoord.y}`;
    const firstCoord = coords[0];
    const dx = firstCoord.x - pathStartCoord.x;
    const dy = firstCoord.y - pathStartCoord.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 50) {
      const midX = (pathStartCoord.x + firstCoord.x) / 2;
      const midY = (pathStartCoord.y + firstCoord.y) / 2;
      const pullX = (centerX - midX) * 0.2;
      const pullY = (centerY - midY) * 0.2;
      pathData += ` L ${midX + pullX} ${midY + pullY}`;
    }
    pathData += ` L ${firstCoord.x} ${firstCoord.y}`;
  } else if (coords.length > 0) {
    pathData = `M ${coords[0].x} ${coords[0].y}`;
  }
  if (!pathData) return;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 80) {
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      const pullX = (centerX - midX) * 0.25;
      const pullY = (centerY - midY) * 0.25;
      pathData += ` L ${midX + pullX} ${midY + pullY}`;
    }
    pathData += ` L ${curr.x} ${curr.y}`;
  }
  maps.forEach(m => {
    const content = m.querySelector('#mapContentRoutes') || m.querySelector('#mapContent') || m.querySelector('#mapContentModalRoutes') || m.querySelector('#mapContentModal');
    if (!content) return;
    const existingPath = content.querySelector('.route-path');
    const existingMarker = content.querySelector('.start-point-marker');
    if (existingPath) existingPath.remove();
    if (existingMarker) existingMarker.remove();
    if (pathStartCoord) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('class', 'start-point-marker');
      marker.setAttribute('cx', pathStartCoord.x);
      marker.setAttribute('cy', pathStartCoord.y);
      marker.setAttribute('r', '10');
      marker.setAttribute('fill', '#00ff00');
      marker.setAttribute('stroke', '#008000');
      marker.setAttribute('stroke-width', '3');
      content.appendChild(marker);
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'route-path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#b30000');
    path.setAttribute('stroke-width', '3.5');
    path.setAttribute('stroke-dasharray', '8,4');
    path.setAttribute('opacity', '0.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    content.appendChild(path);
  });
}

function highlightRoute(ids, startPointId = null, startPointCoords = null) {
  const zones = document.querySelectorAll('.map-zone');
  const idSet = new Set(ids);
  zones.forEach(z => {
    const zoneId = Number(z.dataset.id);
    z.classList.toggle('active-route', idSet.has(zoneId));
    z.classList.remove('start-point', 'highlighted');
  });
  drawRoutePath(ids, startPointId, startPointCoords);
}

function highlightRouteOnRoutesPage(ids, startPointId = null, startPointCoords = null) {
  highlightRoute(ids, startPointId, startPointCoords);
}

function showRouteSummary(titlePrefix, routePlaces, placeIds = null, startPointId = null, startPointCoords = null) {
  const el = document.getElementById('routeSummary');
  if (!el) return;
  if (!routePlaces.length) {
    el.textContent = 'Подходящих объектов для маршрута не найдено.';
    const objectsGrid = document.getElementById('objectsGridRoutes');
    if (objectsGrid) objectsGrid.innerHTML = '';
    return;
  }
  const ids = placeIds || routePlaces.map(p => p.id);
  const hours = estimateDuration(ids, startPointId, startPointCoords);
  el.innerHTML = `
    <p><strong>${titlePrefix}</strong>: ${routePlaces.length} объектов, ориентировочное время прохождения — ${hours} ч.</p>
    <ul>${routePlaces.map(p => `<li>${p.name}</li>`).join('')}</ul>
  `;
  const objectsGrid = document.getElementById('objectsGridRoutes');
  if (objectsGrid) {
    const getFavorites = window.getFavorites || (() => ({ places: [], routes: [] }));
    const favorites = getFavorites();
    const createObjectCardHTML = window.createObjectCardHTML || (() => '');
    const setupObjectCardHandlers = window.setupObjectCardHandlers || (() => {});
    objectsGrid.innerHTML = routePlaces.map(place => {
      const isFavorite = favorites.places.includes(place.id);
      return createObjectCardHTML(place, isFavorite);
    }).join('');
    setupObjectCardHandlers(objectsGrid);
  }
}

function getMapCoordinates(placeId) {
  const maps = [
    document.getElementById('pmrMapRoutes'),
    document.getElementById('pmrMapModalRoutes'),
    document.getElementById('pmrMap'),
    document.getElementById('pmrMapModal')
  ].filter(Boolean);
  for (const map of maps) {
    const zone = map.querySelector(`.map-zone[data-id="${placeId}"]`);
    if (zone) {
      const pin = zone.querySelector('.map-pin');
      if (pin) {
        return {
          x: parseFloat(pin.getAttribute('cx')),
          y: parseFloat(pin.getAttribute('cy'))
        };
      }
    }
  }
  return null;
}

function calculateDistance(coord1, coord2) {
  if (!coord1 || !coord2) return Infinity;
  const dx = coord2.x - coord1.x;
  const dy = coord2.y - coord1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function optimizeRoute(placeIds, startPointId, startPointCoords = null) {
  if (!placeIds || placeIds.length === 0) return [];
  if (placeIds.length === 1) return placeIds;
  const remaining = [...placeIds];
  const optimized = [];
  let currentId = startPointId;
  let currentCoord = null;
  if (startPointCoords) {
    currentCoord = startPointCoords;
    let nearestId = remaining[0];
    let nearestDist = calculateDistance(currentCoord, getMapCoordinates(nearestId));
    for (let i = 1; i < remaining.length; i++) {
      const coord = getMapCoordinates(remaining[i]);
      if (coord) {
        const dist = calculateDistance(currentCoord, coord);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = remaining[i];
        }
      }
    }
    currentId = nearestId;
    optimized.push(nearestId);
    remaining.splice(remaining.indexOf(nearestId), 1);
  } else if (currentId && remaining.includes(currentId)) {
    optimized.push(currentId);
    remaining.splice(remaining.indexOf(currentId), 1);
  } else if (remaining.length > 0) {
    currentId = remaining.shift();
    optimized.push(currentId);
  }
  while (remaining.length > 0) {
    currentCoord = getMapCoordinates(currentId);
    if (!currentCoord) {
      optimized.push(remaining.shift());
      continue;
    }
    let nearestId = remaining[0];
    let nearestDist = calculateDistance(currentCoord, getMapCoordinates(nearestId));
    for (let i = 1; i < remaining.length; i++) {
      const coord = getMapCoordinates(remaining[i]);
      if (coord) {
        const dist = calculateDistance(currentCoord, coord);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = remaining[i];
        }
      }
    }
    optimized.push(nearestId);
    remaining.splice(remaining.indexOf(nearestId), 1);
    currentId = nearestId;
  }
  return optimized;
}

function getCityFromAddress(address) {
  if (!address) return null;
  const addressLower = address.toLowerCase();
  if (addressLower.includes('г. тирасполь') || addressLower.includes('г.тирасполь') || (addressLower.includes('тирасполь') && !addressLower.includes('тираспольск'))) {
    return 'Тирасполь';
  }
  if (addressLower.includes('г. бендеры') || addressLower.includes('г.бендеры') || addressLower.includes('бендеры')) {
    return 'Бендеры';
  }
  if (addressLower.includes('г. днестровск') || addressLower.includes('г.днестровск') || addressLower.includes('днестровск')) {
    return 'Днестровск';
  }
  if (addressLower.includes('г. григориополь') || addressLower.includes('г.григориополь') || addressLower.includes('григориопольск')) {
    return 'Григориополь';
  }
  if (addressLower.includes('г. дубоссары') || addressLower.includes('г.дубоссары') || addressLower.includes('дубоссарск')) {
    return 'Дубоссары';
  }
  if (addressLower.includes('г. рыбница') || addressLower.includes('г.рыбница') || addressLower.includes('рыбницк')) {
    return 'Рыбница';
  }
  if (addressLower.includes('г. каменка') || addressLower.includes('г.каменка') || addressLower.includes('каменск')) {
    return 'Каменка';
  }
  if (addressLower.includes('слободзейск')) {
    return 'Тирасполь';
  }
  if (addressLower.includes('григориопольск')) {
    return 'Григориополь';
  }
  return null;
}

function getCityForPlace(placeId) {
  const places = window.appState?.places || window.places || [];
  const place = places.find(p => p.id === placeId);
  if (!place || !place.address) return null;
  return getCityFromAddress(place.address);
}

function getTravelTimeBetweenCities(city1, city2) {
  if (!city1 || !city2) {
    return 1.0;
  }
  if (city1 === city2) {
    return 0.08;
  }
  const cityTravelTimes = window.cityTravelTimes || {};
  const times = cityTravelTimes[city1];
  if (!times) {
    return 1.0;
  }
  const time = times[city2];
  if (time === undefined || time === null) {
    return 1.0;
  }
  return time;
}

function getCityForCoordinates(coords) {
  if (!coords) return null;
  const places = window.appState?.places || window.places || [];
  let nearestPlace = null;
  let nearestDist = Infinity;
  for (const place of places) {
    const placeCoords = getMapCoordinates(place.id);
    if (placeCoords) {
      const dist = calculateDistance(coords, placeCoords);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlace = place;
      }
    }
  }
  if (nearestPlace) {
    const city = getCityFromAddress(nearestPlace.address);
    if (city) return city;
  }
  const cities = [
    { name: 'Тирасполь', x: 600, y: 550 },
    { name: 'Бендеры', x: 615, y: 555 },
    { name: 'Днестровск', x: 605, y: 480 },
    { name: 'Григориополь', x: 450, y: 350 },
    { name: 'Дубоссары', x: 350, y: 250 },
    { name: 'Рыбница', x: 250, y: 150 },
    { name: 'Каменка', x: 340, y: 50 }
  ];
  let nearestCity = cities[0];
  let nearestCityDist = calculateDistance(coords, { x: nearestCity.x, y: nearestCity.y });
  for (let i = 1; i < cities.length; i++) {
    const dist = calculateDistance(coords, { x: cities[i].x, y: cities[i].y });
    if (dist < nearestCityDist) {
      nearestCityDist = dist;
      nearestCity = cities[i];
    }
  }
  return nearestCity.name;
}

function estimateDuration(placeIds, startPointId, startPointCoords = null) {
  if (!placeIds || placeIds.length === 0) return '0';
  const optimizedRoute = optimizeRoute(placeIds, startPointId, startPointCoords);
  if (optimizedRoute.length === 1) {
    if (startPointId || startPointCoords) {
      const startCity = startPointId ? getCityForPlace(startPointId) : getCityForCoordinates(startPointCoords);
      const endCity = getCityForPlace(optimizedRoute[0]);
      const travelTime = getTravelTimeBetweenCities(startCity, endCity);
      return (travelTime + 0.4).toFixed(1);
    }
    return '0.5';
  }
  let totalTravelTime = 0;
  if (startPointCoords) {
    const startCity = getCityForCoordinates(startPointCoords);
    const firstCity = getCityForPlace(optimizedRoute[0]);
    const travelTime = getTravelTimeBetweenCities(startCity, firstCity);
    totalTravelTime += travelTime;
  } else if (startPointId) {
    const startCity = getCityForPlace(startPointId);
    const firstCity = getCityForPlace(optimizedRoute[0]);
    if (startCity !== firstCity) {
      const travelTime = getTravelTimeBetweenCities(startCity, firstCity);
      totalTravelTime += travelTime;
    } else {
      totalTravelTime += 0.08;
    }
  }
  for (let i = 0; i < optimizedRoute.length - 1; i++) {
    const city1 = getCityForPlace(optimizedRoute[i]);
    const city2 = getCityForPlace(optimizedRoute[i + 1]);
    const travelTime = getTravelTimeBetweenCities(city1, city2);
    totalTravelTime += travelTime;
  }
  const visitTimePerPlace = 0.4;
  const totalVisitTime = placeIds.length * visitTimePerPlace;
  const totalHours = totalTravelTime + totalVisitTime;
  return totalHours.toFixed(1);
}

function clearRouteVisualization() {
  const zones = document.querySelectorAll('.map-zone');
  zones.forEach(z => {
    z.classList.remove('active-route', 'start-point');
  });
  document.querySelectorAll('.route-path').forEach(p => p.remove());
}

function startStartPointSelection(options = {}) {
  const { skipCloseModal = false, openModalOnSelect = true, onSelected = null } = options;
  const routeModal = document.getElementById('routeModal');
  if (!skipCloseModal && routeModal) {
    const closeModal = window.closeModal || (() => {});
    closeModal(routeModal);
  }
  clearRouteVisualization();
  selectedStartPointId = null;
  selectedStartPointCoords = null;
  isSelectingStartPoint = true;
  if (window.appState) {
    window.appState.isSelectingStartPoint = true;
    window.appState.selectedStartPointId = null;
    window.appState.selectedStartPointCoords = null;
  }

  const modalMap = document.getElementById('pmrMapModal');
  const modalRoutesMap = document.getElementById('pmrMapModalRoutes');
  const isModalMapVisible = modalMap && modalMap.closest('.modal') && modalMap.closest('.modal').classList.contains('modal--visible');
  const isModalRoutesVisible = modalRoutesMap && modalRoutesMap.closest('.modal') && modalRoutesMap.closest('.modal').classList.contains('modal--visible');

  const baseMap = document.getElementById('pmrMap') || document.getElementById('pmrMapRoutes');
  const map = (isModalMapVisible && modalMap) ||
              (isModalRoutesVisible && modalRoutesMap) ||
              baseMap;

  const mapSection = document.getElementById('map');
  if (mapSection) {
    mapSection.style.display = 'block';
    setTimeout(() => {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
  if (!map) {
    if (window.location.pathname.includes('routes.html') || window.location.pathname.includes('favorites.html')) {
      setTimeout(() => {
        const checkMap = document.getElementById('pmrMapRoutes') || document.getElementById('pmrMap');
        if (checkMap) {
          showStartPointSelectionHint();
          setupStartPointMapClick(checkMap, { openModalOnSelect, onSelected });
        }
        const checkModalRoutesMap = document.getElementById('pmrMapModalRoutes');
        if (checkModalRoutesMap) {
          showStartPointSelectionHint();
          setupStartPointMapClick(checkModalRoutesMap, { openModalOnSelect, onSelected });
        }
      }, 300);
    } else {
      showStartPointSelectionHint();
      setTimeout(() => {
        const checkMap = document.getElementById('pmrMap');
        if (checkMap) setupStartPointMapClick(checkMap, { openModalOnSelect, onSelected });
        const checkModalMap = document.getElementById('pmrMapModal');
        if (checkModalMap) setupStartPointMapClick(checkModalMap, { openModalOnSelect, onSelected });
      }, 100);
    }
  } else {
    showStartPointSelectionHint();
    setupStartPointMapClick(map, { openModalOnSelect, onSelected });
    if (modalMap) setupStartPointMapClick(modalMap, { openModalOnSelect, onSelected });
    if (modalRoutesMap) setupStartPointMapClick(modalRoutesMap, { openModalOnSelect, onSelected });
  }
}

function showStartPointSelectionHint() {
  const existingHint = document.getElementById('startPointHint');
  if (existingHint) existingHint.remove();
  const hint = document.createElement('div');
  hint.id = 'startPointHint';
  hint.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #D4AF37; color: #fff; padding: 1rem 2rem; border-radius: 8px; z-index: 3000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-weight: 600;';
  hint.textContent = 'Кликните на точку наследия или в любое место на карте, чтобы выбрать начальную точку маршрута';
  document.body.appendChild(hint);
  const mapSection = document.getElementById('map');
  if (mapSection) {
    setTimeout(() => mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
}

function getSVGCoordinates(map, evt) {
  const svg = map.closest('svg') || map;
  if (!svg) return null;
  try {
    const point = svg.createSVGPoint();
    point.x = evt.clientX;
    point.y = evt.clientY;
    const content =
      svg.querySelector('#mapContent') ||
      svg.querySelector('#mapContentRoutes') ||
      svg.querySelector('#mapContentModal') ||
      svg.querySelector('#mapContentModalRoutes');
    const ctm = content ? content.getScreenCTM() : svg.getScreenCTM();
    if (!ctm) return null;
    const svgPoint = point.matrixTransform(ctm.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  } catch (e) {
    const rect = svg.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * 1000;
    const y = ((evt.clientY - rect.top) / rect.height) * 700;
    return { x: x, y: y };
  }
}

function setupStartPointMapClick(map, opts = {}) {
  const { openModalOnSelect = true, onSelected = null } = opts;
  map.style.cursor = 'crosshair';
  const tempHandler = (evt) => {
    if (!isSelectingStartPoint) {
      map.removeEventListener('click', tempHandler);
      map.style.cursor = '';
      return;
    }
    evt.stopPropagation();
    const zone = evt.target.closest('.map-zone');
    if (zone) {
      const placeId = Number(zone.dataset.id);
      const places = window.appState?.places || window.places || [];
      const place = places.find(p => p.id === placeId);
      if (place) {
        selectedStartPointId = placeId;
        selectedStartPointCoords = null;
        isSelectingStartPoint = false;
        if (window.appState) {
          window.appState.isSelectingStartPoint = false;
          window.appState.selectedStartPointId = placeId;
          window.appState.selectedStartPointCoords = null;
        }
        map.style.cursor = '';
        const hint = document.getElementById('startPointHint');
        if (hint) hint.remove();
        const display = document.getElementById('startPointDisplay');
        if (display) {
          display.textContent = `Выбрано: ${place.name}`;
          display.style.color = 'var(--primary)';
          display.style.fontWeight = '600';
        }
        map.removeEventListener('click', tempHandler);
        if (typeof onSelected === 'function') onSelected();
        else if (openModalOnSelect) {
          const openModal = window.openModal || (() => {});
          openModal('routeModal');
        }
        return;
      }
    }
    const coords = getSVGCoordinates(map, evt);
    if (coords) {
      const SVG_WIDTH = 1000;
      const SVG_HEIGHT = 700;
      if (coords.x >= 0 && coords.x <= SVG_WIDTH && coords.y >= 0 && coords.y <= SVG_HEIGHT) {
        selectedStartPointId = null;
        selectedStartPointCoords = { x: Math.round(coords.x * 10) / 10, y: Math.round(coords.y * 10) / 10 };
          isSelectingStartPoint = false;
          if (window.appState) {
            window.appState.isSelectingStartPoint = false;
            window.appState.selectedStartPointId = null;
            window.appState.selectedStartPointCoords = selectedStartPointCoords;
          }
        map.style.cursor = '';
        map.removeEventListener('click', tempHandler);
        const hint = document.getElementById('startPointHint');
        if (hint) hint.remove();
        const display = document.getElementById('startPointDisplay');
        if (display) {
          display.textContent = `Выбрано: произвольная точка на карте`;
          display.style.color = 'var(--primary)';
          display.style.fontWeight = '600';
        }
        if (typeof onSelected === 'function') onSelected();
        else if (openModalOnSelect) {
          const openModal = window.openModal || (() => {});
          openModal('routeModal');
        }
      }
    }
  };
  map.addEventListener('click', tempHandler, { once: false });
}

function saveCustomRoute() {
  const checklist = document.getElementById('routeChecklist');
  const nameInput = document.getElementById('routeNameInput');
  if (!checklist || !nameInput) return;
  if (!selectedStartPointId && !selectedStartPointCoords) {
    window.alert('Пожалуйста, укажите начальную точку маршрута на карте.');
    return;
  }
  const selectedIds = Array.from(checklist.querySelectorAll('input:checked')).map(cb => Number(cb.value));
  if (!selectedIds.length) {
    window.alert('Выберите хотя бы один объект для маршрута.');
    return;
  }
  const name = nameInput.value.trim() || `Мой маршрут`;
  const allRoutes = JSON.parse(localStorage.getItem('heritage_routes_v1') || '[]');
  const places = window.appState?.places || window.places || [];
  const placesInRoute = places.filter(p => selectedIds.includes(p.id));
  const optimizedIds = optimizeRoute(selectedIds, selectedStartPointId, selectedStartPointCoords);
  const duration = estimateDuration(optimizedIds, selectedStartPointId, selectedStartPointCoords);
  allRoutes.push({
    id: Date.now(),
    name,
    placeIds: optimizedIds,
    startPointId: selectedStartPointId,
    startPointCoords: selectedStartPointCoords,
    createdAt: new Date().toISOString(),
    durationHours: parseFloat(duration)
  });
  localStorage.setItem('heritage_routes_v1', JSON.stringify(allRoutes));
  nameInput.value = '';
  checklist.querySelectorAll('input').forEach(cb => { cb.checked = false; });
  const display = document.getElementById('startPointDisplay');
  if (display) {
    display.textContent = '';
    display.style.color = '';
    display.style.fontWeight = '';
  }
  const savedRouteId = allRoutes[allRoutes.length - 1].id;
  const savedRoute = allRoutes[allRoutes.length - 1];
  selectedStartPointId = null;
  selectedStartPointCoords = null;
  loadSavedRoutes();
  const closeModal = window.closeModal || (() => {});
  closeModal(document.getElementById('routeModal'));
  
  setTimeout(() => {
    const map = document.getElementById('pmrMap') || document.getElementById('pmrMapRoutes');
    if (map) {
      highlightRoute(savedRoute.placeIds, savedRoute.startPointId, savedRoute.startPointCoords);
      const places = window.appState?.places || window.places || [];
      const routePlaces = places.filter(p => savedRoute.placeIds.includes(p.id));
      showRouteSummary(`Маршрут: ${savedRoute.name}`, routePlaces, savedRoute.placeIds, savedRoute.startPointId, savedRoute.startPointCoords);
      const mapSection = document.getElementById('map');
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setTimeout(() => {
        const mapRetry = document.getElementById('pmrMap') || document.getElementById('pmrMapRoutes');
        if (mapRetry) {
          highlightRoute(savedRoute.placeIds, savedRoute.startPointId, savedRoute.startPointCoords);
          const places = window.appState?.places || window.places || [];
          const routePlaces = places.filter(p => savedRoute.placeIds.includes(p.id));
          showRouteSummary(`Маршрут: ${savedRoute.name}`, routePlaces, savedRoute.placeIds, savedRoute.startPointId, savedRoute.startPointCoords);
          const mapSection = document.getElementById('map');
          if (mapSection) {
            mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 500);
    }
  }, 300);
}

function loadSavedRoutes() {
  const container = document.getElementById('savedRoutesList');
  if (!container) return;
  const routes = JSON.parse(localStorage.getItem('heritage_routes_v1') || '[]');
  if (!routes.length) {
    container.innerHTML = '<p>Пока нет сохранённых маршрутов.</p>';
    return;
  }
  const isRouteFavorite = window.isRouteFavorite || (() => false);
  const toggleRouteFavorite = window.toggleRouteFavorite || (() => false);
  container.innerHTML = routes.map(route => {
    const count = route.placeIds?.length || 0;
    const routePlaceIds = route.placeIds || [];
    const routeStartPointId = route.startPointId || null;
    const routeStartPointCoords = route.startPointCoords || null;
    const calculatedDuration = estimateDuration(routePlaceIds, routeStartPointId, routeStartPointCoords);
    const duration = route.durationHours ? parseFloat(route.durationHours).toFixed(1) : calculatedDuration;
    const isFavorite = isRouteFavorite(route.id);
    return `
      <article class="saved-route">
        <div>
          <h4>${route.name}</h4>
          <p>${count} объектов, примерно ${duration} ч.</p>
        </div>
        <div class="saved-route-actions">
          <button class="favorite-btn ${isFavorite ? 'active' : ''}" type="button" data-id="${route.id}" data-type="route" aria-label="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}" title="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button type="button" data-id="${route.id}" data-action="show">Показать на карте</button>
          <button type="button" data-id="${route.id}" data-action="delete">Удалить</button>
        </div>
      </article>
    `;
  }).join('');
  container.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleSavedRouteAction(btn));
  });
  container.querySelectorAll('.favorite-btn[data-type="route"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const isFavorite = toggleRouteFavorite(id);
      btn.classList.toggle('active', isFavorite);
      btn.setAttribute('aria-label', isFavorite ? 'Убрать из избранного' : 'Добавить в избранное');
      btn.setAttribute('title', isFavorite ? 'Убрать из избранного' : 'Добавить в избранное');
      const svg = btn.querySelector('svg');
      svg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    });
  });
}

function handleSavedRouteAction(btn) {
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;
  const stored = JSON.parse(localStorage.getItem('heritage_routes_v1') || '[]');
  const route = stored.find(r => r.id === id);
  if (!route) return;
  if (action === 'show') {
    const ids = route.placeIds || [];
    const startPointId = route.startPointId || null;
    const startPointCoords = route.startPointCoords || null;
    const map = document.getElementById('pmrMap');
    const mapRoutes = document.getElementById('pmrMapRoutes');
    if (map) {
      highlightRoute(ids, startPointId, startPointCoords);
      const places = window.appState?.places || window.places || [];
      const routePlaces = places.filter(p => ids.includes(p.id));
      showRouteSummary(`Маршрут: ${route.name}`, routePlaces, ids, startPointId, startPointCoords);
      map.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (mapRoutes) {
      const mapSection = document.getElementById('map');
      if (mapSection) {
        mapSection.style.display = 'block';
        setTimeout(() => mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
      highlightRoute(ids, startPointId, startPointCoords);
      const places = window.appState?.places || window.places || [];
      const routePlaces = places.filter(p => ids.includes(p.id));
      showRouteSummary(`Маршрут: ${route.name}`, routePlaces, ids, startPointId, startPointCoords);
    } else {
      localStorage.setItem('show_route_on_load', JSON.stringify({ routeId: id, routeName: route.name, placeIds: ids, startPointId: startPointId, startPointCoords: startPointCoords }));
      const isInPages = window.location.pathname.includes('/pages/');
      const targetPath = isInPages ? '../index.html#map' : 'index.html#map';
      if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html#map')) {
        window.location.hash = 'map';
        setTimeout(() => {
          if (typeof window.checkAndShowSavedRoute === 'function') {
            window.checkAndShowSavedRoute();
          }
        }, 500);
      } else {
        window.location.href = targetPath;
      }
    }
  } else if (action === 'delete') {
    const updated = stored.filter(r => r.id !== id);
    localStorage.setItem('heritage_routes_v1', JSON.stringify(updated));
    loadSavedRoutes();
  }
}

function checkAndShowSavedRoute() {
  const savedRouteData = localStorage.getItem('show_route_on_load');
  if (!savedRouteData) return;
  const map = document.getElementById('pmrMap');
  if (!map) {
    setTimeout(() => checkAndShowSavedRoute(), 200);
    return;
  }
  try {
    const routeData = JSON.parse(savedRouteData);
    const ids = routeData.placeIds || [];
    const startPointId = routeData.startPointId || null;
    const startPointCoords = routeData.startPointCoords || null;
    if (ids.length > 0) {
      setTimeout(() => {
        highlightRoute(ids, startPointId, startPointCoords);
        const places = window.appState?.places || window.places || [];
        const routePlaces = places.filter(p => ids.includes(p.id));
        showRouteSummary(`Маршрут: ${routeData.routeName || 'Сохраненный маршрут'}`, routePlaces, ids, startPointId, startPointCoords);
        localStorage.removeItem('show_route_on_load');
        if (window.location.hash === '#map' || window.location.hash === '') {
          setTimeout(() => {
            const mapSection = document.getElementById('map');
            if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }, 300);
    }
  } catch (e) {
    localStorage.removeItem('show_route_on_load');
  }
}

window.setupRoutes = setupRoutes;
window.ensureRouteChecklist = ensureRouteChecklist;
window.getPremadeRoute = getPremadeRoute;
window.getIntermediatePoint = getIntermediatePoint;
window.drawRoutePath = drawRoutePath;
window.highlightRoute = highlightRoute;
window.highlightRouteOnRoutesPage = highlightRouteOnRoutesPage;
window.showRouteSummary = showRouteSummary;
window.getMapCoordinates = getMapCoordinates;
window.calculateDistance = calculateDistance;
window.optimizeRoute = optimizeRoute;
window.getCityFromAddress = getCityFromAddress;
window.getCityForPlace = getCityForPlace;
window.getTravelTimeBetweenCities = getTravelTimeBetweenCities;
window.getCityForCoordinates = getCityForCoordinates;
window.estimateDuration = estimateDuration;
window.clearRouteVisualization = clearRouteVisualization;
window.startStartPointSelection = startStartPointSelection;
window.showStartPointSelectionHint = showStartPointSelectionHint;
window.getSVGCoordinates = getSVGCoordinates;
window.setupStartPointMapClick = setupStartPointMapClick;
window.saveCustomRoute = saveCustomRoute;
window.loadSavedRoutes = loadSavedRoutes;
window.handleSavedRouteAction = handleSavedRouteAction;
window.checkAndShowSavedRoute = checkAndShowSavedRoute;
