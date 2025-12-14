function renderMapZones(mapContentId, zonesData) {
  const mapContent = document.getElementById(mapContentId);
  if (!mapContent) {
    console.warn(`Элемент с ID "${mapContentId}" не найден`);
    return;
  }

  const existingZones = mapContent.querySelectorAll('.map-zone');
  existingZones.forEach(zone => zone.remove());

  zonesData.forEach(zone => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'map-zone');
    g.setAttribute('data-id', zone.id);
    g.setAttribute('data-period', zone.period);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');

    const hitCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitCircle.setAttribute('cx', zone.cx);
    hitCircle.setAttribute('cy', zone.cy);
    hitCircle.setAttribute('r', '10');
    hitCircle.setAttribute('fill', 'transparent');
    hitCircle.setAttribute('class', 'map-hit');

    const pinCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pinCircle.setAttribute('cx', zone.cx);
    pinCircle.setAttribute('cy', zone.cy);
    pinCircle.setAttribute('r', '5');
    pinCircle.setAttribute('class', `map-pin pin-${zone.period}`);

    const labelX = zone.labelX ?? zone.cx;
    const labelY = zone.labelY ?? zone.cy;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', labelX);
    text.setAttribute('y', labelY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'zone-label');

    g.appendChild(hitCircle);
    g.appendChild(pinCircle);
    g.appendChild(text);
    mapContent.appendChild(g);
  });
}

async function loadAndRenderMapZones(mapContentId) {
  try {
    const dataPath = window.location.pathname.includes('/pages/') ? '../data/map-zones.json' : 'data/map-zones.json';
    const response = await fetch(dataPath);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const zonesData = await response.json();
    renderMapZones(mapContentId, zonesData);
    return Promise.resolve();
  } catch (error) {
    console.error('Ошибка загрузки данных точек карты:', error);
    return Promise.reject(error);
  }
}

window.loadAndRenderMapZones = loadAndRenderMapZones;
window.renderMapZones = renderMapZones;

