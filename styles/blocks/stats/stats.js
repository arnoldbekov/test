import { appState } from '../../../js/common/data.js';
import { getPeriodName, getTypeName } from '../../../js/common/utils.js';

function buildStats() {
  const counts = { ancient: 0, medieval: 0, modern: 0, contemporary: 0 };
  appState.places.forEach(p => {
    if (counts[p.period] !== undefined) counts[p.period] += 1;
  });
  const list = document.getElementById('statsList');
  if (list) {
    list.innerHTML = Object.entries(counts).map(([key, value]) => `
      <li><strong>${getPeriodName(key)}:</strong> ${value} объект(ов)</li>
    `).join('');
  }
  const ctx = document.getElementById('periodChart');
  if (ctx && window.Chart) {
    if (appState.chartInstance) appState.chartInstance.destroy();
    appState.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(counts).map(getPeriodName),
        datasets: [{
          label: 'Количество объектов',
          data: Object.values(counts),
          backgroundColor: ['#D4AF37', '#8B0000', '#1E3A5F', '#a67c52']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const periodKey = Object.keys(counts)[elements[0].index];
            openPeriodModal(periodKey);
          }
        },
        onHover: (evt, elements) => {
          ctx.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
      }
    });
  }
}

function openPeriodModal(periodKey) {
  const modal = document.getElementById('periodModal');
  const titleEl = document.getElementById('periodModalTitle');
  const contentEl = document.getElementById('periodModalContent');
  if (!modal || !titleEl || !contentEl) return;
  const periodName = getPeriodName(periodKey);
  const periodPlaces = appState.places.filter(p => p.period === periodKey);
  titleEl.textContent = `Объекты периода: ${periodName}`;
  if (periodPlaces.length === 0) {
    contentEl.innerHTML = '<p>Объектов этого периода не найдено.</p>';
  } else {
    contentEl.innerHTML = `
      <p class="period-modal-count">Найдено объектов: <strong>${periodPlaces.length}</strong></p>
      <div class="period-objects-list">
        ${periodPlaces.map(place => `
          <article class="period-object-item" data-id="${place.id}">
            <h4>${place.name}</h4>
            <p class="period-object-meta">
              <span>${getTypeName(place.type)}</span>
              ${place.address ? `<span>• ${place.address}</span>` : ''}
            </p>
            <p class="period-object-desc">${place.short}</p>
            <button class="btn-secondary btn-view-details" data-id="${place.id}">Подробнее →</button>
          </article>
        `).join('')}
      </div>
    `;
    contentEl.querySelectorAll('.btn-view-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const place = appState.places.find(p => p.id === Number(btn.dataset.id));
        if (place) {
          if (typeof window.closeModal === 'function') {
            window.closeModal(modal);
          }
          setTimeout(() => {
            if (typeof window.openObjectModal === 'function') {
              window.openObjectModal(place);
            }
          }, 300);
        }
      });
    });
  }
  if (typeof window.openModal === 'function') {
    window.openModal('periodModal');
  }
}

export { buildStats, openPeriodModal };

