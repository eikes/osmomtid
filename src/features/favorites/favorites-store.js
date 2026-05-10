import { favoritesStorageKey } from '../../config.js';

function loadFavorites() {
  try {
    const raw = localStorage.getItem(favoritesStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Could not parse favorites from localStorage', error);
    return [];
  }
}

export function createFavoritesStore() {
  let favorites = loadFavorites();

  function saveFavorites() {
    localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites));
  }

  function favoriteId(osmType, osmId) {
    return `${osmType}/${osmId}`;
  }

  function isFavorite(osmType, osmId) {
    return favorites.some(favorite => favorite.id === favoriteId(osmType, osmId));
  }

  function toggleFavorite(selection) {
    const id = favoriteId(selection.osm_type, selection.osm_id);
    const index = favorites.findIndex(favorite => favorite.id === id);

    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push({
        id,
        osm_type: selection.osm_type,
        osm_id: selection.osm_id,
        title: selection.title || '',
        geojson: selection.geojson
      });
    }

    saveFavorites();
  }

  function collectFavoriteFeatures() {
    const features = favorites
      .map(favorite => {
        if (!favorite.geojson) return null;
        try {
          const center = turf.center(favorite.geojson);
          return {
            type: 'Feature',
            geometry: center.geometry,
            properties: {
              __favorite_osm_type: favorite.osm_type,
              __favorite_osm_id: String(favorite.osm_id)
            }
          };
        } catch (error) {
          console.warn('Could not compute favorite center', favorite, error);
          return null;
        }
      })
      .filter(Boolean);

    return {
      type: 'FeatureCollection',
      features
    };
  }

  return {
    isFavorite,
    toggleFavorite,
    collectFavoriteFeatures
  };
}
