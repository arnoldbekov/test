function getFavorites() {
  const stored = localStorage.getItem('heritage_favorites_v1');
  return stored ? JSON.parse(stored) : { places: [], routes: [] };
}

function saveFavorites(favorites) {
  localStorage.setItem('heritage_favorites_v1', JSON.stringify(favorites));
}

function togglePlaceFavorite(placeId) {
  const favorites = getFavorites();
  const index = favorites.places.indexOf(placeId);
  if (index > -1) {
    favorites.places.splice(index, 1);
  } else {
    favorites.places.push(placeId);
  }
  saveFavorites(favorites);
  return index === -1;
}

function toggleRouteFavorite(routeId) {
  const favorites = getFavorites();
  const index = favorites.routes.indexOf(routeId);
  if (index > -1) {
    favorites.routes.splice(index, 1);
  } else {
    favorites.routes.push(routeId);
  }
  saveFavorites(favorites);
  return index === -1;
}

function isPlaceFavorite(placeId) {
  const favorites = getFavorites();
  return favorites.places.includes(placeId);
}

function isRouteFavorite(routeId) {
  const favorites = getFavorites();
  return favorites.routes.includes(routeId);
}

export { getFavorites, saveFavorites, togglePlaceFavorite, toggleRouteFavorite, isPlaceFavorite, isRouteFavorite };

