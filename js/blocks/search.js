import { appState } from '../common/data.js';
import { getPeriodName } from '../common/utils.js';

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.addEventListener('input', applyFilters);
}

function applyFilters() {
  const searchValue = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  appState.filteredPlaces = appState.places.filter(p => {
    const byPeriod = appState.currentPeriod === 'all' || p.period === appState.currentPeriod;
    const bySearch = !searchValue || p.name.toLowerCase().includes(searchValue) || (p.type || '').toLowerCase().includes(searchValue) || getPeriodName(p.period).toLowerCase().includes(searchValue);
    return byPeriod && bySearch;
  });
  if (typeof window.renderObjectGrid === 'function') {
    window.renderObjectGrid();
  }
  if (typeof window.filterMapZones === 'function') {
    window.filterMapZones();
  }
}

export { setupSearch, applyFilters };

