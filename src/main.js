import { createMapHighlight } from './features/highlight/map-highlight.js';
import { createFavoritesStore } from './features/favorites/favorites-store.js';
import { createFavoritesLayer } from './features/favorites/favorites-layer.js';
import { addNominatimGeocoderControl } from './features/geocoder/nominatim-geocoder.js';
import { createSidebarRenderer } from './features/sidebar/sidebar-render.js';
import { createSelectionController } from './features/selection/selection-controller.js';

const map = new maplibregl.Map({
  container: 'map',
  hash: true,
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [13.5, 52.5],
  zoom: 10
});
window.mp = map;

map.addControl(
  new maplibregl.NavigationControl({
    visualizePitch: true,
    showZoom: true,
    showCompass: true
  })
);

map.addControl(
  new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true,
    showAccuracyCircle: true,
    showUserHeading: true
  })
);

addNominatimGeocoderControl(map);

map.on('load', () => {
  const layerNames = Object.keys(map.style._layers);

  const favoritesStore = createFavoritesStore();
  const highlight = createMapHighlight(map);
  highlight.ensureSource();

  const sidebar = createSidebarRenderer({
    isFavorite: favoritesStore.isFavorite,
    onToggleFavorite: () => controller.toggleCurrentFavorite(),
    onClose: () => controller.clearSelection()
  });

  const favoritesLayer = createFavoritesLayer(map, favoritesStore, (osmType, osmId) => {
    controller.selectOsm(osmType, osmId);
  });

  favoritesLayer.init();

  const controller = createSelectionController({
    sidebar,
    highlight,
    favoritesStore,
    favoritesLayer
  });

  map.on('mousemove', layerNames, event => {
    if (favoritesLayer.isFavoriteHit(event.point)) {
      map.getCanvas().style.cursor = 'pointer';
      return;
    }

    const namedFeatures = event.features.filter(feature => feature.properties?.name);
    map.getCanvas().style.cursor = namedFeatures.length > 0 ? 'pointer' : 'default';
  });

  map.on('mousemove', [favoritesLayer.getLayerId()], () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('click', [favoritesLayer.getLayerId()], event => {
    favoritesLayer.handleFavoriteClick(event);
  });

  map.on('click', event => {
    if (favoritesLayer.isFavoriteHit(event.point)) {
      return;
    }
    controller.clearSelection();
  });

  map.on('click', layerNames, event => {
    const namedFeatures = event.features.filter(feature => feature.properties?.name);
    if (namedFeatures.length === 0) return;

    const feature = namedFeatures[0];
    const { osmType, osmId } = controller.mapFeatureToOsm(feature);
    if (osmType === 'unknown') return;

    controller.selectOsm(osmType, osmId);
  });

  controller.hydrateFromUrl();
});
