function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #8B0000; color: white; padding: 1rem 2rem; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

function getPeriodName(key) {
  const names = {
    ancient: 'Древность',
    medieval: 'Средневековье',
    modern: 'Новое время',
    contemporary: 'Современность'
  };
  return names[key] || 'Неизвестный период';
}

function getTypeName(key) {
  const names = {
    architecture: 'Архитектура',
    fortress: 'Крепость',
    religious: 'Религиозный объект',
    archaeology: 'Археологический объект',
    museum: 'Музей',
    memorial: 'Мемориал',
    monument: 'Памятник',
    park: 'Парк / сад'
  };
  return names[key] || 'Объект культурного наследия';
}

export { showError, getPeriodName, getTypeName };

