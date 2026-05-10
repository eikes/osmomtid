export function createNominatimGeocoderApi() {
  return {
    forwardGeocode: async config => {
      const features = [];
      try {
        const request = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(config.query)}&format=geojson&polygon_geojson=1&addressdetails=1`;
        const response = await fetch(request);
        const geojson = await response.json();

        for (const feature of geojson.features || []) {
          if (!Array.isArray(feature.bbox) || feature.bbox.length < 4) {
            continue;
          }

          const center = [
            feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
            feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2
          ];

          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: center
            },
            place_name: feature.properties.display_name,
            properties: feature.properties,
            text: feature.properties.display_name,
            place_type: ['place'],
            center
          });
        }
      } catch (error) {
        console.error(`Failed to forwardGeocode with error: ${error}`);
      }

      return { features };
    }
  };
}

export function addNominatimGeocoderControl(map) {
  const geocoderApi = createNominatimGeocoderApi();
  map.addControl(
    new MaplibreGeocoder(geocoderApi, {
      maplibregl
    }),
    'top-left'
  );
}
