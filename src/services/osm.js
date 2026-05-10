import { overpassBaseUrl, osmStreetTypes } from '../config.js';

export function extractMainElementGeojson(data, osmType, osmId) {
  const osmgeojson = osmtogeojson(data);
  let selectedFeatures = osmgeojson.features.filter(feature => {
    const props = feature.properties || {};
    if (props.type === osmType && String(props.id) === String(osmId)) {
      return true;
    }
    const fid = String(feature.id || '');
    return fid === `${osmType}/${osmId}` || fid === String(osmId);
  });

  if (selectedFeatures.length === 0 && osmgeojson.features.length > 0) {
    selectedFeatures = [osmgeojson.features[0]];
  }

  return {
    type: 'FeatureCollection',
    features: selectedFeatures
  };
}

export function decodeFeatureToOsm(featureId) {
  const osmId = Math.floor(featureId / 10);
  const osmTypeCode = featureId % 10;
  const osmType = osmTypeCode === 1 ? 'node' : osmTypeCode === 2 ? 'way' : osmTypeCode === 3 ? 'relation' : 'unknown';

  return { osmType, osmId };
}

export async function fetchElementRelations(osmType, osmId) {
  const relationsUrl = `https://www.openstreetmap.org/api/0.6/${osmType}/${osmId}/relations.json`;
  const response = await fetch(relationsUrl);
  return response.json();
}

export async function fetchElementDetails(osmType, osmId) {
  const detailsUrl =
    osmType === 'way' || osmType === 'relation'
      ? `https://www.openstreetmap.org/api/0.6/${osmType}/${osmId}/full.json`
      : `https://www.openstreetmap.org/api/0.6/node/${osmId}.json`;

  const response = await fetch(detailsUrl);
  return response.json();
}

export async function fetchOverpassStreetGeojson(osmId, streetName) {
  const overpassQuery = `
    [out:json];
    way(${osmId});
    complete{
      ._;
      way(around:150)["name"="${streetName}"]["highway"~"^(${osmStreetTypes.join('|')})$"];
    };
    out geom;
  `
    .trim()
    .replace(/\s+/g, ' ');

  const response = await fetch(overpassBaseUrl, { method: 'POST', body: overpassQuery });
  const json = await response.json();
  return osmtogeojson(json);
}
