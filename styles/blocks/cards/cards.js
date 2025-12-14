import { appState } from '../../../js/common/data.js';
import { getFavorites, togglePlaceFavorite } from '../../../js/common/favorites.js';
import { getPeriodName, getTypeName } from '../../../js/common/utils.js';

function renderObjectGrid() {
  const grid = document.getElementById('objectsGrid');
  if (!grid) return;
  const favorites = getFavorites();
  grid.innerHTML = appState.filteredPlaces.map(place => {
    const isFavorite = favorites.places.includes(place.id);
    return createObjectCardHTML(place, isFavorite);
  }).join('');
  setupObjectCardHandlers(grid);
}

function createObjectCardHTML(place, isFavorite) {
  return `
    <article class="object-card" itemscope itemtype="https://schema.org/TouristAttraction" data-aos="fade-up" data-aos-duration="600">
      <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${place.id}" data-type="place" aria-label="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}" title="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <div class="object-card-header">
        <h3 itemprop="name">${place.name}</h3>
      </div>
      <div class="object-meta">
        <span class="object-meta-item" itemprop="temporalCoverage">${getPeriodName(place.period)}</span>
        <span class="object-meta-item" itemprop="category">${getTypeName(place.type)}</span>
      </div>
      <p itemprop="description">${place.short}</p>
      ${place.address ? `<meta itemprop="address" content="${place.address}">` : ''}
      <div class="object-actions">
        <button class="btn-secondary btn-details" data-id="${place.id}">Подробнее →</button>
      </div>
    </article>
  `;
}

function setupObjectCardHandlers(container) {
  container.querySelectorAll('.btn-details').forEach(btn => {
    btn.addEventListener('click', () => {
      const place = appState.places.find(p => p.id === Number(btn.dataset.id));
      if (place && typeof window.openObjectModal === 'function') {
        window.openObjectModal(place);
      }
    });
  });
  container.querySelectorAll('.favorite-btn[data-type="place"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const isFavorite = togglePlaceFavorite(id);
      btn.classList.toggle('active', isFavorite);
      btn.setAttribute('aria-label', isFavorite ? 'Убрать из избранного' : 'Добавить в избранное');
      btn.setAttribute('title', isFavorite ? 'Убрать из избранного' : 'Добавить в избранное');
      const svg = btn.querySelector('svg');
      svg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    });
  });
}

export { renderObjectGrid, createObjectCardHTML, setupObjectCardHandlers };

