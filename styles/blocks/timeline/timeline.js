import { appState } from '../../../js/common/data.js';
import { getPeriodName } from '../../../js/common/utils.js';

function setupTimeline() {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const active = document.querySelector('.period-btn.active');
      if (active) {
        active.classList.remove('active');
        active.setAttribute('aria-selected', 'false');
      }
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      appState.currentPeriod = btn.dataset.period || 'all';
      renderTimelineEvents();
      if (typeof window.applyFilters === 'function') {
        window.applyFilters();
      }
    });
  });
}

function renderTimelineEvents() {
  const el = document.getElementById('timelineEvents');
  if (!el) return;
  const eventsByPeriod = {
    ancient: ['Формирование первых поселений вдоль крупных рек.', 'Появление оборонительных валов и святилищ.', 'Развитие скотоводства и земледелия в регионе.'],
    medieval: ['Строительство крепостей и монастырей.', 'Развитие ремесленных центров и торговых путей.', 'Формирование первых городов и укреплённых поселений.'],
    modern: ['Формирование городских ансамблей и усадеб.', 'Создание парков и общественных пространств.', 'Развитие промышленности и торговли.'],
    contemporary: ['Появление памятников и мемориалов новейшей истории.', 'Реставрация и музеефикация исторических объектов.', 'Сохранение культурного наследия для будущих поколений.']
  };
  const periodsToShow = appState.currentPeriod === 'all' ? Object.keys(eventsByPeriod) : [appState.currentPeriod];
  el.classList.toggle('timeline-events--single', periodsToShow.length === 1);
  el.innerHTML = periodsToShow.map((period, index) => `
    <article class="timeline-card" data-aos="fade-up" data-aos-delay="${index * 100}">
      <h3>${getPeriodName(period)}</h3>
      <ul>${eventsByPeriod[period].map(ev => `<li>${ev}</li>`).join('')}</ul>
    </article>
  `).join('');
  if (window.AOS) AOS.refresh();
}

export { setupTimeline, renderTimelineEvents };

