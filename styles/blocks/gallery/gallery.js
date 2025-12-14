import { appState } from '../../../js/common/data.js';
import { getFavorites, togglePlaceFavorite } from '../../../js/common/favorites.js';
import { getPeriodName, getTypeName } from '../../../js/common/utils.js';
import { normalizeImagePath } from '../../../js/common/data.js';

function buildGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const items = appState.places.filter(p => p.images && p.images.now && p.images.now.trim() !== '');
  const itemsWithComparison = items.filter(p => {
    const hasOldImage = p.images && p.images.old && p.images.old.trim() !== '';
    const hasNowImage = p.images && p.images.now && p.images.now.trim() !== '';
    return hasOldImage && hasNowImage;
  });
  const itemsWithoutComparison = items.filter(p => {
    const hasOldImage = p.images && p.images.old && p.images.old.trim() !== '';
    const hasNowImage = p.images && p.images.now && p.images.now.trim() !== '';
    return !hasOldImage && hasNowImage;
  });
  const sortedItems = [...itemsWithComparison, ...itemsWithoutComparison];
  appState.galleryOrder = sortedItems.map(p => p.id);
  const favorites = getFavorites();
  grid.innerHTML = sortedItems.map((place) => {
    const isFavorite = favorites.places.includes(place.id);
    const hasOldImage = place.images && place.images.old && place.images.old.trim() !== '';
    const hasBothImages = hasOldImage && place.images.now && place.images.now.trim() !== '';
    return `
    <article class="gallery-card" tabindex="0" aria-label="${hasBothImages ? 'Сравнить тогда и сейчас' : 'Просмотреть фото'}: ${place.name}">
      <div class="gallery-thumb">
        <img src="${normalizeImagePath(place.images.now)}" alt="${place.name}" loading="lazy">
        <button class="favorite-btn gallery-favorite ${isFavorite ? 'active' : ''}" data-id="${place.id}" data-type="place" aria-label="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}" title="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <h3>${place.name}</h3>
      <p>${getPeriodName(place.period)} • ${getTypeName(place.type)}</p>
      <button type="button" class="btn-secondary" data-id="${place.id}" data-has-old="${hasOldImage}">${hasBothImages ? 'Тогда и сейчас' : 'Просмотреть фото'}</button>
    </article>
  `;
  }).join('');
  grid.querySelectorAll('button.btn-secondary[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const place = appState.places.find(p => p.id === Number(btn.dataset.id));
      if (place) {
        if (btn.dataset.hasOld === 'true') {
          if (typeof window.openCompareModal === 'function') {
            window.openCompareModal(place);
          }
        } else {
          if (typeof window.openSingleImageModal === 'function') {
            window.openSingleImageModal(place);
          }
        }
      }
    });
  });
  grid.querySelectorAll('.favorite-btn[data-type="place"]').forEach(btn => {
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

function setCurrentGalleryIndex(placeId) {
  if (!appState.galleryOrder || appState.galleryOrder.length === 0) {
    appState.currentGalleryIndex = -1;
    updateGalleryNavButtons();
    return;
  }
  const idx = appState.galleryOrder.indexOf(placeId);
  appState.currentGalleryIndex = idx;
  updateGalleryNavButtons();
}

function updateGalleryNavButtons() {
  const prevBtn = document.getElementById('comparePrev');
  const nextBtn = document.getElementById('compareNext');
  const hasOrder = Array.isArray(appState.galleryOrder) && appState.galleryOrder.length > 0;
  if (!prevBtn || !nextBtn) return;
  prevBtn.style.display = 'flex';
  nextBtn.style.display = 'flex';
  if (!hasOrder || appState.currentGalleryIndex === -1) {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  prevBtn.disabled = appState.currentGalleryIndex <= 0;
  nextBtn.disabled = appState.currentGalleryIndex >= appState.galleryOrder.length - 1;
}

function openGalleryByOffset(offset) {
  if (!Array.isArray(appState.galleryOrder) || appState.galleryOrder.length === 0) return;
  const targetIndex = appState.currentGalleryIndex + offset;
  if (targetIndex < 0 || targetIndex >= appState.galleryOrder.length) return;
  const targetId = appState.galleryOrder[targetIndex];
  const place = appState.places.find(p => p.id === targetId);
  if (!place) return;
  appState.currentGalleryIndex = targetIndex;
  const hasOldImage = place.images && place.images.old && place.images.old.trim() !== '';
  const hasNowImage = place.images && place.images.now && place.images.now.trim() !== '';
  if (hasOldImage && hasNowImage) {
    if (typeof window.openCompareModal === 'function') {
      window.openCompareModal(place);
    }
  } else if (hasNowImage) {
    if (typeof window.openSingleImageModal === 'function') {
      window.openSingleImageModal(place);
    }
  }
}

function attachMapFocusHandler(placeId) {
  const btn = document.querySelector(`.map-focus-btn[data-id="${placeId}"]`);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const compareModal = document.getElementById('compareModal');
    if (typeof window.focusPlaceOnMap === 'function') {
      window.focusPlaceOnMap(placeId, compareModal);
    }
  });
}

function attachDetailsHandler(placeId) {
  const btn = document.querySelector(`.details-btn[data-id="${placeId}"]`);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const place = appState.places.find(p => p.id === placeId);
    if (place) {
      if (typeof window.closeModal === 'function') {
        window.closeModal(document.getElementById('compareModal'));
      }
      if (typeof window.openObjectModal === 'function') {
        window.openObjectModal(place);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const prevBtn = document.getElementById('comparePrev');
  const nextBtn = document.getElementById('compareNext');
  if (prevBtn) prevBtn.addEventListener('click', () => openGalleryByOffset(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => openGalleryByOffset(1));
  document.addEventListener('keydown', (evt) => {
    const compareModal = document.getElementById('compareModal');
    const isOpen = compareModal && compareModal.getAttribute('aria-hidden') === 'false';
    if (!isOpen) return;
    if (evt.key === 'ArrowLeft') openGalleryByOffset(-1);
    if (evt.key === 'ArrowRight') openGalleryByOffset(1);
  });
});

export { buildGallery, setCurrentGalleryIndex, updateGalleryNavButtons, openGalleryByOffset, attachMapFocusHandler, attachDetailsHandler };

