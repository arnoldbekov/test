let places = [];
let currentPeriod = 'all';
let filteredPlaces = [];
let chartInstance = null;
let galleryOrder = [];
let currentGalleryIndex = -1;
let pendingPlaceFocus = null;
let selectedStartPointId = null;
let selectedStartPointCoords = null;
let isSelectingStartPoint = false;

function loadPlacesData() {
  const dataPath = window.location.pathname.includes('/pages/') ? '../data/sites.json' : 'data/sites.json';
  if (typeof axios !== 'undefined') {
    return axios.get(dataPath)
      .then(response => {
        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
          places = data;
          return Promise.resolve();
        } else {
          throw new Error('Данные в файле sites.json некорректны.');
        }
      })
      .catch(() => loadPlacesDataFallback());
  } else {
    return loadPlacesDataFallback();
  }
}

function loadPlacesDataFallback() {
  const dataPath = window.location.pathname.includes('/pages/') ? '../data/sites.json' : 'data/sites.json';
  return fetch(dataPath)
    .then(resp => {
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
      return resp.json();
    })
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        places = data;
        return Promise.resolve();
      } else {
        throw new Error('Данные в файле sites.json некорректны.');
      }
    })
    .catch(err => {
      const errorMsg = err.message || 'Неизвестная ошибка';
      const isCorsError = errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch');
      const is404Error = errorMsg.includes('404') || errorMsg.includes('status: 404');
      let userMessage = 'Не удалось загрузить данные о наследиях. ';
      if (isCorsError || window.location.protocol === 'file:') {
        userMessage += 'Для корректной работы сайта необходимо запустить его через локальный сервер.';
      } else if (is404Error) {
        userMessage += 'Файл data/sites.json не найден.';
      } else {
        userMessage += `Ошибка: ${errorMsg}`;
      }
      if (typeof window.showError === 'function') {
        window.showError(userMessage);
      }
      return Promise.reject(new Error(userMessage));
    });
}

function normalizeImagePath(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const isInPages = window.location.pathname.includes('/pages/');
  if (path.startsWith('image/')) {
    return isInPages ? `../${path}` : path;
  }
  if (path.startsWith('assets/img/') || path.startsWith('../assets/img/')) {
    return path;
  }
  if (path.startsWith('img/')) {
    return isInPages ? `../${path}` : path;
  }
  return path;
}

export const appState = {
  get places() { return places; },
  set places(val) { places = val; },
  get currentPeriod() { return currentPeriod; },
  set currentPeriod(val) { currentPeriod = val; },
  get filteredPlaces() { return filteredPlaces; },
  set filteredPlaces(val) { filteredPlaces = val; },
  get chartInstance() { return chartInstance; },
  set chartInstance(val) { chartInstance = val; },
  get galleryOrder() { return galleryOrder; },
  set galleryOrder(val) { galleryOrder = val; },
  get currentGalleryIndex() { return currentGalleryIndex; },
  set currentGalleryIndex(val) { currentGalleryIndex = val; },
  get pendingPlaceFocus() { return pendingPlaceFocus; },
  set pendingPlaceFocus(val) { pendingPlaceFocus = val; },
  get selectedStartPointId() { return selectedStartPointId; },
  set selectedStartPointId(val) { selectedStartPointId = val; },
  get selectedStartPointCoords() { return selectedStartPointCoords; },
  set selectedStartPointCoords(val) { selectedStartPointCoords = val; },
  get isSelectingStartPoint() { return isSelectingStartPoint; },
  set isSelectingStartPoint(val) { isSelectingStartPoint = val; }
};

export { loadPlacesData, normalizeImagePath };

