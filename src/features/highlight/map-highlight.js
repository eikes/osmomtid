import { highlightedSourceId } from '../../config.js';

export function createMapHighlight(map) {
  let firstLoad = true;

  function ensureSource() {
    if (!map.getSource(highlightedSourceId)) {
      map.addSource(highlightedSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
    }
  }

  function createLayer(type, paint = {}, layout = {}) {
    map.addLayer({
      id: `highlighted-feature-${type}`,
      type,
      source: highlightedSourceId,
      paint,
      layout
    });
  }

  function clear() {
    const types = ['circle', 'line', 'fill'];
    for (const type of types) {
      const layerId = `highlighted-feature-${type}`;
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    }
    const source = map.getSource(highlightedSourceId);
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  }

  function fitBounds(geojson) {
    const bbox = turf.bbox(geojson);
    const currentBounds = map.getBounds();
    const bboxSW = [bbox[0], bbox[1]];
    const bboxNE = [bbox[2], bbox[3]];

    const outside =
      bboxSW[0] < currentBounds.getWest() ||
      bboxSW[1] < currentBounds.getSouth() ||
      bboxNE[0] > currentBounds.getEast() ||
      bboxNE[1] > currentBounds.getNorth();

    if (outside) {
      map.fitBounds([bboxSW, bboxNE], { padding: 20 });
    }
  }

  function showRawOsmData(data, osmType) {
    ensureSource();
    const osmgeojson = osmtogeojson(data);

    if (firstLoad) {
      const center = turf.centerOfMass(osmgeojson);
      map.setCenter([center.geometry.coordinates[0], center.geometry.coordinates[1]]);
      firstLoad = false;
    }

    if (osmType === 'node') {
      map.flyTo({ center: [osmgeojson.features[0].geometry.coordinates[0], osmgeojson.features[0].geometry.coordinates[1]] });
      createLayer('circle', {
        'circle-radius': 10,
        'circle-color': '#ff0000'
      });
    } else if (osmType === 'way' || osmType === 'relation') {
      fitBounds(osmgeojson);
      createLayer('line', {
        'line-width': 5,
        'line-color': '#ff0000'
      });
    }

    map.getSource(highlightedSourceId).setData(osmgeojson);
  }

  function showStreetGeojson(geojson) {
    ensureSource();
    fitBounds(geojson);
    map.getSource(highlightedSourceId).setData(geojson);
    createLayer('line', {
      'line-width': 5,
      'line-color': '#ff0000'
    });
  }

  return {
    ensureSource,
    clear,
    fitBounds,
    showRawOsmData,
    showStreetGeojson
  };
}
