import {
  fetchElementRelations,
  fetchElementDetails,
  fetchOverpassStreetGeojson,
  extractMainElementGeojson,
  decodeFeatureToOsm
} from '../../services/osm.js';
import { osmStreetTypes } from '../../config.js';

export function createSelectionController({ sidebar, highlight, favoritesStore, favoritesLayer }) {
  async function loadElementDetails(osmType, osmId) {
    history.pushState(null, '', `?osm_type=${osmType}&osm_id=${osmId}`);

    const data = await fetchElementDetails(osmType, osmId);
    const mainElement = Array.isArray(data.elements)
      ? data.elements.find(element => element.type === osmType && String(element.id) === String(osmId))
      : null;

    const tags = mainElement?.tags || {};
    const selection = {
      osm_type: osmType,
      osm_id: osmId,
      title: tags.name || tags.operator || '',
      geojson: extractMainElementGeojson(data, osmType, osmId)
    };

    sidebar.setSelection(selection);
    highlight.clear();

    if (osmType === 'way' && osmStreetTypes.includes(tags.highway) && tags.name) {
      const streetGeojson = await fetchOverpassStreetGeojson(osmId, tags.name);
      highlight.showStreetGeojson(streetGeojson);
    } else {
      if (osmType === 'relation') {
        sidebar.renderRouteStops(data);
      }
      highlight.showRawOsmData(data, osmType);
    }

    sidebar.renderTags(tags);
    sidebar.renderWikidata(tags.wikidata);
  }

  async function selectOsm(osmType, osmId) {
    sidebar.clear();
    sidebar.show();
    sidebar.addOpenStreetMapLink(osmType, osmId);

    if (osmType === 'node') {
      const relationsData = await fetchElementRelations(osmType, osmId);
      if (relationsData?.elements) {
        sidebar.renderRoutes(relationsData);

        const labelRelation = relationsData.elements.find(
          relation => relation.members && relation.members.some(member => member.type === 'node' && member.ref === osmId && member.role === 'label')
        );

        if (labelRelation) {
          await loadElementDetails('relation', labelRelation.id);
          return;
        }
      }
      await loadElementDetails(osmType, osmId);
      return;
    }

    if (osmType === 'way') {
      const relationsData = await fetchElementRelations(osmType, osmId);
      if (relationsData?.elements) {
        sidebar.renderRoutes(relationsData);
      }
      await loadElementDetails(osmType, osmId);
      return;
    }

    await loadElementDetails(osmType, osmId);
  }

  function clearSelection() {
    sidebar.hide();
    sidebar.clear();
    highlight.clear();
    history.pushState(null, '', '?');
  }

  function toggleCurrentFavorite() {
    const selection = sidebar.getSelection();
    if (!selection) return;
    favoritesStore.toggleFavorite(selection);
    sidebar.updateFavoriteButton();
    favoritesLayer.render();
  }

  function hydrateFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const osmTypeParam = urlParams.get('osm_type');
    const osmIdParam = urlParams.get('osm_id');

    if (osmTypeParam && osmIdParam) {
      selectOsm(osmTypeParam, osmIdParam);
    }
  }

  function mapFeatureToOsm(feature) {
    return decodeFeatureToOsm(feature.id);
  }

  return {
    selectOsm,
    clearSelection,
    toggleCurrentFavorite,
    hydrateFromUrl,
    mapFeatureToOsm
  };
}
