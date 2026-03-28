let sidebarElem = document.getElementById('sidebar');
let titleElem = document.getElementById('title');
let typeElem = document.getElementById('type');
let descriptionElem = document.getElementById('description');
let imagesElem = document.getElementById('images');
let openstreetmapElem = document.getElementById('openstreetmap');
let linksElem = document.getElementById('links');
let openstreetmapDetailsElem = document.getElementById('openstreetmap-details');
let linksDetailsElem = document.getElementById('links-details');
let contactSectionElem = document.getElementById('contact-section');
let contactElem = document.getElementById('contact');
let addressElem = document.getElementById('address');
let extractElem = document.getElementById('extract');

// let overpassBaseUrl = 'https://overpass-api.de/api/interpreter';
let overpassBaseUrl = 'https://overpass.private.coffee/api/interpreter';


// MapLibre GL JS API docs: https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/
var map = new maplibregl.Map({
  container: "map",
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

function createImage(src, alt) {
  let div = document.createElement('div');
  div.className = 'image-wrapper';
  let img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  div.appendChild(img);
  imagesElem.appendChild(div);
}

function createLayer(type, paint, layout) {
  map.addLayer({
    'id': `highlighted-feature-${type}`,
    'type': type,
    'source': 'highlighted-feature-source',
    'paint': paint || {},
    'layout': layout || {}
  });
}

// Helper to add a link to the links section
function addLink(url, text) {
  let linksElem = document.getElementById('links');
  let linksDetailsElem = document.getElementById('links-details');
  let a = createLink(url, text)
  linksElem.appendChild(a);
  linksDetailsElem.style.display = 'block';
}

// Helper to add a link to the links section
function createLink(url, text, target='_blank') {
  let a = document.createElement('a');
  a.href = url;
  a.target = target;
  a.textContent = text;
  return a;
}

function humanize(str) {
  return str
      .replace(/^[\s_]+|[\s_]+$/g, '')
      .replace(/[_\s]+/g, ' ')
      .replace(/^[a-z]/, function(m) { return m.toUpperCase(); });
}

// Wikipedia API docs:
// https://www.mediawiki.org/wiki/API:Main_page
// https://www.mediawiki.org/wiki/API:Get_the_contents_of_a_page
// https://www.mediawiki.org/wiki/API:Images
// Handle the wikipedia tag: fetch extract and images
function handleWikipediaTag(value) {
  if (extractElem.textContent.trim() !== '') {
    // already have an extract
    return;
  }
  let parts = value.split(':');
  let lang = parts.length > 1 ? parts[0] : 'en';
  let title = parts.length > 1 ? parts.slice(1).join(':') : parts[0];
  // Fetch extract from Wikipedia API
  let wiki_extract_url = `https://${lang}.wikipedia.org/w/api.php?action=query&exlimit=1&explaintext=1&exsentences=5&formatversion=2&prop=extracts&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  fetch(wiki_extract_url, {mode: 'cors'}).then(response => response.json()).then(wiki_data => {
    if (wiki_data.query && wiki_data.query.pages && wiki_data.query.pages.length > 0) {
      let extract = wiki_data.query.pages[0].extract;
      if (extract) {
        let stripped_extract = extract.replace(/==+/g, '').replace(/\n+/g, "\n").trim();
        extractElem.textContent = stripped_extract;
        // Add plain text link to Wikipedia page below the extract
        let wikiLink = document.createElement('a');
        wikiLink.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
        wikiLink.textContent = `Read more on Wikipedia`;
        wikiLink.classList = 'block';
        wikiLink.target = '_blank';
        // Remove any previous link
        let oldLink = extractElem.nextSibling;
        if (oldLink && oldLink.tagName === 'A') {
          oldLink.remove();
        }
        extractElem.appendChild(wikiLink);
      }
    }
  });

  // Fetch images from Wikipedia API
  let wiki_images_url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=images&imlimit=4&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  fetch(wiki_images_url, {mode: 'cors'})
    .then(response => response.json())
    .then(imageData => {
      if (imageData.query && imageData.query.pages) {
        let pages = Object.values(imageData.query.pages);
        if (pages.length > 0 && pages[0].images) {
          let images = pages[0].images;
          images.forEach(imgObj => {
            // Only fetch common image types
            if (imgObj.title.match(/\.(jpg|jpeg|png)$/i)) {
              // Get the actual image URL from Wikipedia API
              let fileTitle = imgObj.title.split(':')[1];
              let fileInfoUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(imgObj.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
              fetch(fileInfoUrl, {mode: 'cors'})
                .then(response => response.json())
                .then(fileInfoData => {
                  console.log(fileInfoData)
                  if (fileInfoData.query && fileInfoData.query.pages) {
                    let filePages = Object.values(fileInfoData.query.pages);
                    if (filePages.length > 0 && filePages[0].imageinfo && filePages[0].imageinfo.length > 0) {
                      let imgUrl = filePages[0].imageinfo[0].url;
                      createImage(imgUrl, fileTitle);
                    }
                  }
                });
            }
          });
        }
      }
    });
}

function clearSidebar() {
  // Clear previous sidebar content
  titleElem.textContent = '';
  typeElem.textContent = '';
  descriptionElem.textContent = '';
  openstreetmapDetailsElem.open = false;
  openstreetmapElem.innerHTML = '';
  linksDetailsElem.style.display = 'none';
  linksDetailsElem.open = false;
  linksElem.innerHTML = '';
  imagesElem.innerHTML = '';
  contactSectionElem.style.display = 'none';
  contactElem.innerHTML = '';
  addressElem.innerHTML = '';
  extractElem.textContent = '';
}

function clearMapHighlight() {
  types = ['circle', 'line', 'fill'];
  for (const type of types) {
    layer_id = `highlighted-feature-${type}`;
    if (map.getLayer(layer_id)) {
      map.removeLayer(layer_id);
    }
  }
  map.getSource('highlighted-feature-source').setData({
    "type": "FeatureCollection",
    "features": []
  });
}

showRoutes = function(relationsData) {
  console.log('showRoutes', relationsData)
  const routeRelations = relationsData.elements.filter(el => el.type === 'relation' && el.tags && el.tags.type === 'route');
  routeRelations.forEach(relation => {
    let route_type = relation.tags.route || 'route';
    let route_name = relation.tags.name || `${humanize(route_type)} ${relation.tags.ref}`;
    let route_url = `/?osm_type=relation&osm_id=${relation.id}`;
    let routeLink = createLink(route_url, route_name, '_self');
    linksElem.appendChild(routeLink);
    linksDetailsElem.style.display = 'block';
  });
}

showRouteStops = function(relationsData) {
  console.log('showRouteStops', relationsData)
  const routeRelations = relationsData.elements.filter(el => el.type === 'relation' && el.tags && el.tags.type === 'route');
  routeRelations.forEach(relation => {
    // add each route stop as a link to the links section
    relation.members.forEach(member => {
      if (member.role === 'stop' || member.role === 'platform' || member.role === 'stop_exit' || member.role === 'stop_entry' || member.role === 'site') {
        let ref = relationsData.elements.find((el) => el.type == member.type && el.id == member.ref);
        let stop_url = `/?osm_type=${member.type}&osm_id=${member.ref}`;
        let stopLink = createLink(stop_url, ref.tags.name, '_self');
        stopLink.classList = 'block';
        linksElem.appendChild(stopLink);
      }
    });
    linksDetailsElem.style.display = 'block';
  });
}

let firstLoad = true;

function addOsmDataToMap(data, osm_type, osm_id) { 
  // convert osm json to geojson:
  let osmgeojson = osmtogeojson(data);

  if (firstLoad) {
    // don't fly to the location on the first load, to avoid unwanted map movements when the page is loaded with URL parameters
    let center = turf.centerOfMass(osmgeojson)
    map.setCenter([center.geometry.coordinates[0], center.geometry.coordinates[1]]);
    firstLoad = false;
  }

  if (osm_type === 'node') {
    map.flyTo({center: [osmgeojson.features[0].geometry.coordinates[0], osmgeojson.features[0].geometry.coordinates[1]]});
    createLayer('circle', {
      'circle-radius': 10,
      'circle-color': '#ff0000'
    });
  } else if (osm_type === 'way' || osm_type === 'relation') {
    fitBounds(osmgeojson);
    createLayer('line', {
      'line-width': 5,
      'line-color': '#ff0000'
    });
  }
  map.getSource('highlighted-feature-source').setData(osmgeojson);
}

function fitBounds(geojson) {
  let bbox = turf.bbox(geojson);
  // Get current map bounds
  let currentBounds = map.getBounds();
  // bbox: [minX, minY, maxX, maxY]
  let bboxSW = [bbox[0], bbox[1]];
  let bboxNE = [bbox[2], bbox[3]];
  // Check if bbox is outside current map bounds
  let outside =
    bboxSW[0] < currentBounds.getWest() ||
    bboxSW[1] < currentBounds.getSouth() ||
    bboxNE[0] > currentBounds.getEast() ||
    bboxNE[1] > currentBounds.getNorth();
  if (outside) {
    map.fitBounds([bboxSW, bboxNE], {padding: 20});
  }
}

function addOsmDataToSidebar(tags) {
  console.log('addOsmDataToSidebar:', tags);
  contact = {};
  addr = {};

  // Add tags as a definition list (dl/dt/dd)
  if (Object.keys(tags).length > 0) {
    titleElem.textContent = tags.name || tags.operator;
    delete tags.name;
    // Extract and display contact info
    // Add other tags to OpenStreetMap section
    for (let key in tags) {
      let value = tags[key];
      if (key === 'amenity' || key === 'tourism' || key === 'leisure' || key === 'craft') {
        typeElem.textContent = humanize(value);
      } else if (key === 'shop' || key === 'office') {
        typeElem.textContent = humanize(value) + " " + humanize(key);
      } else if (key === 'natural' || key === 'historic') {
        typeElem.textContent = humanize(key) + " " + humanize(value);
      } else if (key === 'highway' && value === 'bus_stop') {
        typeElem.textContent = humanize(value);
      } else if (key === 'description') {
        typeElem.textContent = humanize(value);
      } else if (key === 'wheelchair') {
        let dt = document.createElement('dt');
        dt.textContent = 'Wheelchair accessible';
        let dd = document.createElement('dd');
        dd.textContent = humanize(value);
        contactElem.appendChild(dt);
        contactElem.appendChild(dd);
        contactSectionElem.style.display = 'block';
      } else if (key == 'website' || key == 'url' || key == 'contact:website' || key == 'contact:url') {
        let a = document.createElement('a');
        a.href = value;
        a.target = '_blank';
        a.textContent = value;
        let dt = document.createElement('dt');
        dt.textContent = humanize(key.split(':')[1] || key);
        let dd = document.createElement('dd');
        dd.appendChild(a);
        contactElem.appendChild(dt);
        contactElem.appendChild(dd);
        contactSectionElem.style.display = 'block';
      } else if (key === 'opening_hours') {
        let dt = document.createElement('dt');
        dt.textContent = 'Opening Hours';
        let dd = document.createElement('dd');
        // opening_hours docs:
        // https://wiki.openstreetmap.org/wiki/Key:opening_hours
        // https://github.com/opening-hours/opening_hours.js/
        let oh = new opening_hours(value, {}, { locale: navigator.language });
        let prettified_value = oh.prettifyValue({ conf: { locale: navigator.language, rule_sep_string: '<br>', print_semicolon: false } });
        let state = "Currently: " + (oh.getUnknown() ? 'Unknown' : (oh.getState() ? '<span style="color:green;">Open</span>' : '<span style="color:red;">Closed</span>')) + '<br>';
        dd.innerHTML = state + prettified_value;
        contactElem.appendChild(dt);
        contactElem.appendChild(dd);
        contactSectionElem.style.display = 'block';
      } else if (key.startsWith('addr:')) {
        addr[key.split(':')[1]] = value;
      } else if (key.startsWith('contact:')) {
        contact[humanize(key.split(':')[1])] = value;
      } else if (key == 'phone' || key == 'fax' || key == 'email') {
        contact[humanize(key)] = value;
      } else if (key === 'wikipedia') {
        handleWikipediaTag(value);
      } else if (value.match(/^https?:\/\//)) {
        // if (key === 'image') {
        //   imgElem.src = value;
        //   imgElem.style.display = 'block';
        // } else 
        addLink(value, value);
      } else if (key === 'wikidata') {
        let wikidata_url = `https://www.wikidata.org/wiki/${value}`;
        addLink(wikidata_url, "Wikidata: " + value);
      } else {
        let dt = document.createElement('dt');
        dt.textContent = humanize(key);
        let dd = document.createElement('dd');
        dd.textContent = humanize(value);
        openstreetmapElem.appendChild(dt);
        openstreetmapElem.appendChild(dd);
      }
      openstreetmapDetailsElem.style.display = 'block';
    }
  }

  if (Object.keys(addr).length > 0) {
    let dt = document.createElement('dt');
    dt.textContent = 'Address';
    let dd = document.createElement('dd');
    let addr_parts = [];
    let addr_part_names = [
      ['street', 'place', 'housename', 'housenumber'],
      ['postcode', 'hamlet', 'suburb', 'subdistrict', 'district', 'village', 'city', 'province', 'state'],
      // ['country']
    ];

    for (let i = 0; i < addr_part_names.length; i++) {
      let rows = addr_part_names[i];
      let row = [];
      for (let j = 0; j < rows.length; j++) {
        let key = rows[j];
        if (addr[key]) {
          row.push(addr[key]);
        }
      }
      if (row.length > 0) {
        addr_parts.push(row.join(' '));
      }
    }
    dd.innerHTML = addr_parts.join('<br>');
    addressElem.appendChild(dt);
    addressElem.appendChild(dd);
    contactSectionElem.style.display = 'block';
  }

  if (Object.keys(contact).length > 0) {
    for (let k in contact) {
      let dt = document.createElement('dt');
      dt.textContent = k;
      let dd = document.createElement('dd');
      dd.textContent = contact[k];
      contactElem.appendChild(dt);
      contactElem.appendChild(dd);
    }
    contactSectionElem.style.display = 'block';
  }
}

function addWikidataToSidebar(wikidata_id) {
  if (!wikidata_id) return;
  // Wikidata EntityData docs:
  // https://www.wikidata.org/wiki/Wikidata:Data_access
  // https://www.wikidata.org/wiki/Special:MyLanguage/Help:JSON
  let wikidata_url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidata_id}.json`;
  fetch(wikidata_url).then(response => response.json()).then(wikidata_data => {
    console.log('Wikidata details for', wikidata_id, wikidata_data);

    let entity = wikidata_data.entities[wikidata_id];
    if (!entity) return;

    let title = (entity.labels && (entity.labels.en?.value || Object.values(entity.labels)[0]?.value)) || wikidata_id;
    let desc = (entity.descriptions && (entity.descriptions.en?.value || Object.values(entity.descriptions)[0]?.value)) || '';
    titleElem.textContent = title;
    if (desc) {
      descriptionElem.textContent = desc;
    }

    // P18 image (Commons image)
    let p18 = null;
    if (entity.claims && entity.claims.P18 && entity.claims.P18[0]?.mainsnak?.datavalue?.value) {
      p18 = entity.claims.P18[0].mainsnak.datavalue.value;
    }
    if (p18) {
      // Commons image URL: 
      let imgUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p18)}`;
      createImage(imgUrl, title);
    }

    // Wikilinks (Wikipedia, Commons, etc.)
    if (entity.sitelinks) {
      for (let key in entity.sitelinks) {
        let sitelink = entity.sitelinks[key];
        let label = sitelink.site.replace('wiki', '').toUpperCase();
        let url = sitelink.url || `https://${sitelink.site.replace('wiki','wikipedia.org')}/wiki/${encodeURIComponent(sitelink.title)}`;
        if (label == navigator.language.split('-')[0].toUpperCase()) {
          handleWikipediaTag(label + ':' + sitelink.title);
        }
        addLink(url, label + ': ' + sitelink.title);
      }
    }
  });
}

const osm_street_types = [
  'primary', 
  'primary_link',
  'secondary', 
  'secondary_link', 
  'tertiary', 
  'tertiary_link',
  'residential', 
  'living_street',
  'service',
  'unclassified',
  'pedestrian',
  'footway',
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'cycleway',
  'path'
]

function showOverpassStreet(osm_type, osm_id, tags, data) {
  // Overpass API / Overpass QL docs:
  // https://wiki.openstreetmap.org/wiki/Overpass_API
  // https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#The_block_statement_complete
  // Build Overpass API URL
  // basically using this query https://overpass-turbo.eu/s/2iKf
  // to get the full geometry of the street

  let overpassQuery = `
    [out:json];
    way(${osm_id});
    complete{
      ._;
      way(around:150)["name"="${tags.name}"]["highway"~"^(${osm_street_types.join('|')})$"];
    };
    out geom;
  `.trim().replace(/\s+/g, ' ');
  fetch(overpassBaseUrl, { method: "POST", body: overpassQuery })
    .then(response => response.json())
    .then(json => {
      let osmgeojson = osmtogeojson(json);
      fitBounds(osmgeojson);
      // Highlight the street on the map
      map.getSource('highlighted-feature-source').setData(osmgeojson);
      createLayer('line', {
        'line-width': 5,
        'line-color': '#ff0000'
      });
    });
}

// OpenStreetMap API v0.6 docs:
// https://wiki.openstreetmap.org/wiki/API_v0.6
// https://wiki.openstreetmap.org/wiki/API_v0.6#Read:_GET_/api/0.6/[node|way|relation]/#id.json
// https://wiki.openstreetmap.org/wiki/API_v0.6#Relations_for_element:_GET_/api/0.6/[node|way|relation]/#id/relations
// Fetch OSM details
function fetchFirstOsmDetails(osm_type, osm_id) {
  clearSidebar() 

  // add a link to the OSM element:
  let osmUrl = `https://www.openstreetmap.org/${osm_type}/${osm_id}`;
  let osmLink = createLink(osmUrl, `OpenStreetMap ${osm_type} ${osm_id}`);
  openstreetmapElem.appendChild(osmLink);
  
  const relationsUrl = `https://www.openstreetmap.org/api/0.6/${osm_type}/${osm_id}/relations.json`;

  if (osm_type === 'node') {
    // Fetch node details as before
    // fetchSecondOsmDetails('node', osm_id);
    // Fetch relations for this node
    fetch(relationsUrl)
      .then(response => response.json())
      .then(relationsData => {
        if (relationsData && relationsData.elements) {
          console.log('Relations for node', osm_id, relationsData);
          // Find relation where this node is a label
          const labelRelation = relationsData.elements.find(rel =>
            rel.members && rel.members.some(m => m.type === 'node' && m.ref === osm_id && m.role === 'label')
          );
          showRoutes(relationsData);
          if (labelRelation) {
            // Fetch and display the relation
            fetchSecondOsmDetails('relation', labelRelation.id);
          } else {
            fetchSecondOsmDetails('node', osm_id);
          }
        }
      });
  } else if (osm_type === 'way') {
    fetch(relationsUrl)
      .then(response => response.json())
      .then(relationsData => {
        if (relationsData.elements) {
          showRoutes(relationsData);
        }
      });
    fetchSecondOsmDetails(osm_type, osm_id);
  } else if (osm_type === 'relation') {
    fetchSecondOsmDetails(osm_type, osm_id);
  }

  sidebarElem.classList.remove('hidden');
}

// OpenStreetMap API v0.6 full element docs:
// https://wiki.openstreetmap.org/wiki/API_v0.6#Full:_GET_/api/0.6/[way|relation]/#id/full
// Fetch OSM details and display on map
function fetchSecondOsmDetails(osm_type, osm_id) {
  // Use push state to update URL without reloading
  history.pushState(null, '', `?osm_type=${osm_type}&osm_id=${osm_id}`);

  let details_url;
  if (osm_type === 'way' || osm_type === 'relation') {
    details_url = `https://www.openstreetmap.org/api/0.6/${osm_type}/${osm_id}/full.json`;
  } else {
    details_url = `https://www.openstreetmap.org/api/0.6/node/${osm_id}.json`;
  }

  fetch(details_url).then(response => response.json()).then(data => {
    // Find the main element (node/way/relation) with tags
    let mainElement = null;
    if (data.elements && Array.isArray(data.elements)) {
      // Prefer node, then way, then relation
      mainElement = data.elements.find(e => e.type === osm_type && e.id == osm_id);
    }
    let tags = mainElement.tags || {};
    console.log('OSM details for', osm_type, osm_id, tags);
    
    clearMapHighlight();

    // If the feature is a street (way with highway and name), fetch from Overpass
    // debugger
    if (osm_type === 'way' && (osm_street_types.includes(tags.highway))) {
      showOverpassStreet(osm_type, osm_id, tags, data);
    } else if (osm_type === 'relation') {
      showRouteStops(data);
      addOsmDataToMap(data, osm_type, osm_id);
    } else {
      addOsmDataToMap(data, osm_type, osm_id);
    }
    addOsmDataToSidebar(tags);
    addWikidataToSidebar(tags.wikidata);
  });
}

map.on('load', (e) => { 
  layer_names = Object.keys(map.style._layers);
  console.log('Layer names:', layer_names);

  map.addSource('highlighted-feature-source', {
    'type': 'geojson',
    'data': {
      "type": "FeatureCollection",
      "features": []
    }
  });

  map.on('mousemove', layer_names, (e) => {
    named_features = e.features.filter(f => f.properties.name)
    if (named_features.length > 0) {
      map._canvas.style.cursor = 'pointer';
    } else {
      map._canvas.style.cursor = 'default';
    }
  });


  // On page load, check URL parameters for osm_type and osm_id
  const urlParams = new URLSearchParams(window.location.search);
  const osm_type_param = urlParams.get('osm_type');
  const osm_id_param = urlParams.get('osm_id');
  if (osm_type_param && osm_id_param) {
    // simulate a click event to load the details
    fetchFirstOsmDetails(osm_type_param, osm_id_param);
  }

  map.on('click', (e) => {
    sidebarElem.classList.add('hidden');
    clearMapHighlight();
    clearSidebar();
    history.pushState(null, '', `?`);
  });

  map.on('click', layer_names, (e) => {
    console.log('Clicked features:', e.features);
    named_features = e.features.filter(f => f.properties.name)
    if (named_features.length == 0) return;
    feature = named_features[0];
    console.log('Clicked feature:', feature.properties);

    // OpenMapTiles / Planetiler feature ID docs:
    // https://openmaptiles.org/schema/
    // https://github.com/onthegomap/planetiler/pull/826
    // MVT IDs encoded as {ID} * 10 + {1 for OSM nodes, 2 for OSM ways, 3 for OSM relations, 0 for any other source} by default
    osm_id = Math.floor(feature.id / 10);
    osm_type_code = feature.id % 10;
    osm_type = osm_type_code == 1 ? 'node' : osm_type_code == 2 ? 'way' : osm_type_code == 3 ? 'relation' : 'unknown';

    fetchFirstOsmDetails(osm_type, osm_id);
  });
});
