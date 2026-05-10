import { favoritesLayerId, favoritesSourceId } from '../../config.js';

export function createFavoritesLayer(map, favoritesStore, onSelectFavorite) {
  let visible = true;

  function render() {
    const source = map.getSource(favoritesSourceId);
    if (!source) return;
    source.setData(favoritesStore.collectFavoriteFeatures());
  }

  function setVisibility(nextVisible) {
    visible = nextVisible;
    if (map.getLayer(favoritesLayerId)) {
      map.setLayoutProperty(favoritesLayerId, 'visibility', visible ? 'visible' : 'none');
    }
  }

  function syncToggleButton(button) {
    button.classList.toggle('inactive', !visible);
    button.title = visible ? 'Hide favorites layer' : 'Show favorites layer';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', visible ? 'true' : 'false');
  }

  function addToggleControl() {
    class FavoritesLayerToggleControl {
      onAdd() {
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'favorites-layer-toggle';
        this.button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 3 3 8.25 12 13.5 21 8.25 12 3"></polygon><polyline points="3 12.75 12 18 21 12.75"></polyline><polyline points="3 17.25 12 22 21 17.25"></polyline></svg>';
        this.button.addEventListener('click', () => {
          setVisibility(!visible);
          syncToggleButton(this.button);
        });

        this.container.appendChild(this.button);
        syncToggleButton(this.button);
        return this.container;
      }

      onRemove() {
        this.container.parentNode.removeChild(this.container);
      }
    }

    map.addControl(new FavoritesLayerToggleControl(), 'top-right');
  }

  function init() {
    map.addSource(favoritesSourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    map.addLayer({
      id: favoritesLayerId,
      type: 'circle',
      source: favoritesSourceId,
      paint: {
        'circle-color': '#0055cc',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 10, 8, 16, 12],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-stroke-opacity': 0.9
      }
    });

    render();
    setVisibility(true);
    addToggleControl();
  }

  function isFavoriteHit(point) {
    return map.queryRenderedFeatures(point, { layers: [favoritesLayerId] }).length > 0;
  }

  function handleFavoriteClick(event) {
    if (!event.features || event.features.length === 0) return;
    const feature = event.features[0];
    const props = feature.properties || {};
    const osmType = props.__favorite_osm_type;
    const osmId = props.__favorite_osm_id;

    if (!osmType || !osmId) return;
    if (event.originalEvent && typeof event.originalEvent.stopPropagation === 'function') {
      event.originalEvent.stopPropagation();
    }
    onSelectFavorite(osmType, osmId);
  }

  return {
    init,
    render,
    isFavoriteHit,
    handleFavoriteClick,
    getLayerId: () => favoritesLayerId
  };
}
