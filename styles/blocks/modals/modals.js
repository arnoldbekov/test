import { appState } from '../../../js/common/data.js';
import { isPlaceFavorite, togglePlaceFavorite } from '../../../js/common/favorites.js';
import { getPeriodName, getTypeName } from '../../../js/common/utils.js';
import { normalizeImagePath } from '../../../js/common/data.js';

function setupModals() {
  document.querySelectorAll('.modal .close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
  });
  document.addEventListener('click', evt => {
    const modal = evt.target.closest('.modal');
    if (modal && evt.target === modal) closeModal(modal);
  });
  document.addEventListener('keydown', evt => {
    if (evt.key === 'Escape') {
      document.querySelectorAll('.modal[aria-hidden="false"]').forEach(modal => closeModal(modal));
    }
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('modal--visible');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modal) {
  if (!modal) return;
  const modalDialog = modal.querySelector('.modal-dialog');
  if (modalDialog) modalDialog.classList.remove('modal-single-image');
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('modal--visible');
  document.body.style.overflow = '';
}

function openObjectModal(place) {
  const titleEl = document.getElementById('objTitle');
  const contentEl = document.getElementById('objContent');
  if (!titleEl || !contentEl) return;
  const isFavorite = isPlaceFavorite(place.id);
  const hasOldImage = place.images && place.images.old && place.images.old.trim() !== '';
  const hasNowImage = place.images && place.images.now && place.images.now.trim() !== '';
  
  const map = document.getElementById('pmrMap');
  const mapSection = document.getElementById('map');
  const isHighlightedOnMap = map && mapSection ? (() => {
    const highlightedZone = document.querySelector('.map-zone.highlighted');
    if (highlightedZone) {
      const highlightedId = Number(highlightedZone.dataset.id);
      return highlightedId === place.id;
    }
    return false;
  })() : false;
  
  titleEl.textContent = place.name;
  contentEl.innerHTML = `
    ${hasNowImage ? `
    <figure class="object-figure">
      <img src="${normalizeImagePath(place.images.now)}" alt="${place.name}" loading="lazy" onerror="this.style.display='none'">
      <button class="favorite-btn modal-image-favorite ${isFavorite ? 'active' : ''}" data-id="${place.id}" data-type="place" aria-label="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}" title="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </figure>
    ` : `
    <div class="modal-header-actions">
      <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${place.id}" data-type="place" aria-label="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}" title="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>
    `}
    <dl class="object-details">
      <div>
        <dt>Исторический период</dt>
        <dd>${getPeriodName(place.period)}</dd>
      </div>
      <div>
        <dt>Тип объекта</dt>
        <dd>${getTypeName(place.type)}</dd>
      </div>
      <div>
        <dt>Адрес</dt>
        <dd>${place.address || '—'}</dd>
      </div>
      ${place.events ? `<div><dt>Связанные события</dt><dd>${place.events}</dd></div>` : ''}
    </dl>
    <p>${place.desc}</p>
    <div class="object-actions">
      ${hasOldImage && hasNowImage ? `<button class="btn-secondary" type="button" data-action="compare" data-id="${place.id}">Тогда и сейчас</button>` : ''}
      <button class="btn-secondary" type="button" data-action="add-to-route" data-id="${place.id}">+ В маршрут</button>
      ${!isHighlightedOnMap ? `<button class="btn-secondary" type="button" data-action="show-on-map" data-id="${place.id}">Показать на карте</button>` : ''}
    </div>
  `;
  contentEl.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleObjectAction(btn));
  });
  const favoriteBtn = contentEl.querySelector('.favorite-btn[data-type="place"]');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', () => {
      const id = Number(favoriteBtn.dataset.id);
      const isFavorite = togglePlaceFavorite(id);
      favoriteBtn.classList.toggle('active', isFavorite);
      favoriteBtn.setAttribute('aria-label', isFavorite ? 'Убрать из избранного' : 'Добавить в избранное');
      favoriteBtn.setAttribute('title', isFavorite ? 'Убрать из избранного' : 'Добавить в избранное');
      const svg = favoriteBtn.querySelector('svg');
      svg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
      const listBtn = document.querySelector(`.object-card .favorite-btn[data-id="${id}"]`);
      if (listBtn) {
        listBtn.classList.toggle('active', isFavorite);
        const listSvg = listBtn.querySelector('svg');
        listSvg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
      }
    });
  }
  openModal('objectModal');
}

function handleObjectAction(btn) {
  const action = btn.dataset.action;
  const id = Number(btn.dataset.id);
  const place = appState.places.find(p => p.id === id);
  if (!place) return;
  if (action === 'compare') {
    const hasOldImage = place.images && place.images.old && place.images.old.trim() !== '';
    const hasNowImage = place.images && place.images.now && place.images.now.trim() !== '';
    if (hasOldImage && hasNowImage) {
      if (typeof window.openCompareModal === 'function') {
        window.openCompareModal(place);
      }
    }
  }
  if (action === 'add-to-route') {
    if (typeof window.ensureRouteChecklist === 'function') {
      window.ensureRouteChecklist();
    }
    const checkbox = document.querySelector(`#routeChecklist input[value="${place.id}"]`);
    if (checkbox) checkbox.checked = true;
    openModal('routeModal');
  }
  if (action === 'show-on-map') {
    const objectModal = document.getElementById('objectModal');
    if (typeof window.focusPlaceOnMap === 'function') {
      window.focusPlaceOnMap(id, objectModal);
    }
  }
}

function openCompareModal(place) {
  const container = document.getElementById('compareContainer');
  const titleEl = document.getElementById('compareTitle');
  const modal = document.getElementById('compareModal');
  const modalDialog = modal ? modal.querySelector('.modal-dialog') : null;
  if (!container) return;
  const hasOldImage = place.images && place.images.old && place.images.old.trim() !== '';
  const hasNowImage = place.images && place.images.now && place.images.now.trim() !== '';
  if (!hasOldImage || !hasNowImage) {
    if (typeof window.openSingleImageModal === 'function') {
      window.openSingleImageModal(place);
    }
    return;
  }
  if (titleEl) titleEl.textContent = place.name;
  if (modalDialog) modalDialog.classList.remove('modal-single-image');
  if (typeof window.setCurrentGalleryIndex === 'function') {
    window.setCurrentGalleryIndex(place.id);
  }
  if (typeof window.updateGalleryNavButtons === 'function') {
    window.updateGalleryNavButtons();
  }
  container.innerHTML = `
    <div>
      <h4>Архивная фотография</h4>
      <img src="${normalizeImagePath(place.images.old)}" alt="Исторический вид: ${place.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling && (this.nextElementSibling.style.display='block');" style="display: block;">
      <p style="display: none; color: var(--muted); padding: 1rem; text-align: center;">Архивное фото недоступно</p>
    </div>
    <div>
      <h4>Современный вид</h4>
      <img src="${normalizeImagePath(place.images.now)}" alt="Современный вид: ${place.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling && (this.nextElementSibling.style.display='block');" style="display: block;">
      <p style="display: none; color: var(--muted); padding: 1rem; text-align: center;">Современное фото недоступно</p>
    </div>
    ${place.short ? `<p class="compare-description">${place.short}</p>` : ''}
    <div class="modal-actions">
      <button type="button" class="btn-primary details-btn" data-id="${place.id}">Подробнее</button>
      <button type="button" class="btn-secondary map-focus-btn" data-id="${place.id}">Посмотреть на карте</button>
    </div>
  `;
  if (typeof window.attachMapFocusHandler === 'function') {
    window.attachMapFocusHandler(place.id);
  }
  if (typeof window.attachDetailsHandler === 'function') {
    window.attachDetailsHandler(place.id);
  }
  openModal('compareModal');
  setTimeout(() => {
    if (typeof window.updateGalleryNavButtons === 'function') {
      window.updateGalleryNavButtons();
    }
  }, 100);
}

function openSingleImageModal(place) {
  const container = document.getElementById('compareContainer');
  const titleEl = document.getElementById('compareTitle');
  const modal = document.getElementById('compareModal');
  const modalDialog = modal ? modal.querySelector('.modal-dialog') : null;
  if (!container || !titleEl) return;
  const hasNowImage = place.images && place.images.now && place.images.now.trim() !== '';
  if (!hasNowImage) return;
  if (modalDialog) modalDialog.classList.add('modal-single-image');
  titleEl.textContent = place.name;
  const isCompactSingle = place.id === 24 || place.id === 27 || place.id === 18;
  if (typeof window.setCurrentGalleryIndex === 'function') {
    window.setCurrentGalleryIndex(place.id);
  }
  if (typeof window.updateGalleryNavButtons === 'function') {
    window.updateGalleryNavButtons();
  }
  container.innerHTML = `
    <div class="single-image-wrapper${isCompactSingle ? ' single-image-small single-image-compact' : ''}">
      <img src="${normalizeImagePath(place.images.now)}" alt="${place.name}" loading="lazy" onerror="this.parentElement.innerHTML='<p>Фото недоступно</p>'">
    </div>
    ${place.short ? `<p class="compare-description">${place.short}</p>` : ''}
    <div class="modal-actions">
      <button type="button" class="btn-primary details-btn" data-id="${place.id}">Подробнее</button>
      <button type="button" class="btn-secondary map-focus-btn" data-id="${place.id}">Посмотреть на карте</button>
    </div>
  `;
  if (typeof window.attachMapFocusHandler === 'function') {
    window.attachMapFocusHandler(place.id);
  }
  if (typeof window.attachDetailsHandler === 'function') {
    window.attachDetailsHandler(place.id);
  }
  openModal('compareModal');
  setTimeout(() => {
    if (typeof window.updateGalleryNavButtons === 'function') {
      window.updateGalleryNavButtons();
    }
  }, 100);
}

export { setupModals, openModal, closeModal, openObjectModal, handleObjectAction, openCompareModal, openSingleImageModal };

