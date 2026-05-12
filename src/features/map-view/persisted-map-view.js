const mapViewStorageKey = 'map-view-v1';

export const defaultMapView = {
  center: [13.5, 52.5],
  zoom: 10,
  bearing: 0,
  pitch: 0
};

function readStoredMapView() {
  try {
    const raw = localStorage.getItem(mapViewStorageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const lng = Number(parsed?.lng);
    const lat = Number(parsed?.lat);
    const zoom = Number(parsed?.zoom);
    const bearing = Number(parsed?.bearing);
    const pitch = Number(parsed?.pitch);

    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(zoom)) {
      return null;
    }

    return {
      center: [lng, lat],
      zoom,
      bearing: Number.isFinite(bearing) ? bearing : 0,
      pitch: Number.isFinite(pitch) ? pitch : 0
    };
  } catch (error) {
    console.warn('Could not read map view from localStorage', error);
    return null;
  }
}

function storeMapView(map) {
  try {
    const center = map.getCenter();
    const payload = {
      lng: Number(center.lng.toFixed(6)),
      lat: Number(center.lat.toFixed(6)),
      zoom: Number(map.getZoom().toFixed(3)),
      bearing: Number(map.getBearing().toFixed(2)),
      pitch: Number(map.getPitch().toFixed(2))
    };

    localStorage.setItem(mapViewStorageKey, JSON.stringify(payload));
  } catch (error) {
    console.warn('Could not store map view in localStorage', error);
  }
}

export function getInitialMapView() {
  const hasHashInUrl = window.location.hash.length > 1;
  const storedMapView = readStoredMapView();
  if (hasHashInUrl || !storedMapView) {
    return defaultMapView;
  }
  return storedMapView;
}

export function bindMapViewPersistence(map) {
  map.on('moveend', () => {
    storeMapView(map);
  });
}
