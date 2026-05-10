import { elements } from '../../dom/elements.js';
import { humanize, createLink } from '../../utils/text.js';
import {
  parseWikipediaTag,
  fetchWikipediaExtract,
  fetchWikipediaImages,
  fetchWikipediaImageUrl,
  fetchWikidataEntity
} from '../../services/wiki.js';

export function createSidebarRenderer({ isFavorite, onToggleFavorite }) {
  let currentSelection = null;

  elements.favoriteToggle.addEventListener('click', () => {
    if (currentSelection) {
      onToggleFavorite(currentSelection);
      updateFavoriteButton();
    }
  });

  function show() {
    elements.sidebar.classList.remove('hidden');
  }

  function hide() {
    elements.sidebar.classList.add('hidden');
  }

  function createImage(src, alt) {
    const div = document.createElement('div');
    div.className = 'image-wrapper';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    div.appendChild(img);
    elements.images.appendChild(div);
  }

  function addLink(url, text) {
    const a = createLink(url, text);
    elements.links.appendChild(a);
    elements.linksDetails.style.display = 'block';
  }

  function clear() {
    elements.title.textContent = '';
    elements.type.textContent = '';
    elements.description.textContent = '';
    elements.favoriteToggle.classList.add('hidden');
    elements.favoriteToggle.classList.remove('active');
    elements.favoriteToggle.textContent = '♡';
    elements.openstreetmapDetails.open = false;
    elements.openstreetmap.innerHTML = '';
    elements.linksDetails.style.display = 'none';
    elements.linksDetails.open = false;
    elements.links.innerHTML = '';
    elements.images.innerHTML = '';
    elements.contactSection.style.display = 'none';
    elements.contact.innerHTML = '';
    elements.address.innerHTML = '';
    elements.extract.textContent = '';
    currentSelection = null;
  }

  function setSelection(selection) {
    currentSelection = selection;
    elements.favoriteToggle.classList.remove('hidden');
    updateFavoriteButton();
  }

  function getSelection() {
    return currentSelection;
  }

  function updateFavoriteButton() {
    if (!currentSelection) return;

    const favorite = isFavorite(currentSelection.osm_type, currentSelection.osm_id);
    elements.favoriteToggle.textContent = favorite ? '♥' : '♡';
    elements.favoriteToggle.classList.toggle('active', favorite);
    elements.favoriteToggle.setAttribute('aria-label', favorite ? 'Remove favorite' : 'Save as favorite');
    elements.favoriteToggle.title = favorite ? 'Remove favorite' : 'Save as favorite';
  }

  async function handleWikipediaTag(value) {
    if (elements.extract.textContent.trim() !== '') {
      return;
    }

    const { lang, title } = parseWikipediaTag(value);
    const extract = await fetchWikipediaExtract(lang, title);
    if (extract) {
      const strippedExtract = extract.replace(/==+/g, '').replace(/\n+/g, '\n').trim();
      elements.extract.textContent = strippedExtract;
      const wikiLink = document.createElement('a');
      wikiLink.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
      wikiLink.textContent = 'Read more on Wikipedia';
      wikiLink.classList = 'block';
      wikiLink.target = '_blank';
      const oldLink = elements.extract.nextSibling;
      if (oldLink && oldLink.tagName === 'A') {
        oldLink.remove();
      }
      elements.extract.appendChild(wikiLink);
    }

    const images = await fetchWikipediaImages(lang, title);
    for (const image of images) {
      if (image.title.match(/\.(jpg|jpeg|png)$/i)) {
        const fileTitle = image.title.split(':')[1];
        const imgUrl = await fetchWikipediaImageUrl(lang, image.title);
        if (imgUrl) {
          createImage(imgUrl, fileTitle);
        }
      }
    }
  }

  function renderRoutes(relationsData) {
    const routeRelations = relationsData.elements.filter(el => el.type === 'relation' && el.tags && el.tags.type === 'route');
    routeRelations.forEach(relation => {
      const routeType = relation.tags.route || 'route';
      const routeName = relation.tags.name || `${humanize(routeType)} ${relation.tags.ref}`;
      const routeUrl = `/?osm_type=relation&osm_id=${relation.id}`;
      const routeLink = createLink(routeUrl, routeName, '_self');
      elements.links.appendChild(routeLink);
      elements.linksDetails.style.display = 'block';
    });
  }

  function renderRouteStops(relationsData) {
    const routeRelations = relationsData.elements.filter(el => el.type === 'relation' && el.tags && el.tags.type === 'route');
    routeRelations.forEach(relation => {
      relation.members.forEach(member => {
        if (member.role === 'stop' || member.role === 'platform' || member.role === 'stop_exit' || member.role === 'stop_entry' || member.role === 'site') {
          const ref = relationsData.elements.find(el => el.type === member.type && el.id === member.ref);
          if (!ref?.tags?.name) return;
          const stopUrl = `/?osm_type=${member.type}&osm_id=${member.ref}`;
          const stopLink = createLink(stopUrl, ref.tags.name, '_self');
          stopLink.classList = 'block';
          elements.links.appendChild(stopLink);
        }
      });
      elements.linksDetails.style.display = 'block';
    });
  }

  async function renderWikidata(wikidataId) {
    const entity = await fetchWikidataEntity(wikidataId);
    if (!entity) return;

    const title = (entity.labels && (entity.labels.en?.value || Object.values(entity.labels)[0]?.value)) || wikidataId;
    const desc = (entity.descriptions && (entity.descriptions.en?.value || Object.values(entity.descriptions)[0]?.value)) || '';
    elements.title.textContent = title;
    if (desc) {
      elements.description.textContent = desc;
    }

    const p18 = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (p18) {
      const imgUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p18)}`;
      createImage(imgUrl, title);
    }

    if (entity.sitelinks) {
      for (const key in entity.sitelinks) {
        const sitelink = entity.sitelinks[key];
        const label = sitelink.site.replace('wiki', '').toUpperCase();
        const url = sitelink.url || `https://${sitelink.site.replace('wiki', 'wikipedia.org')}/wiki/${encodeURIComponent(sitelink.title)}`;
        if (label === navigator.language.split('-')[0].toUpperCase()) {
          await handleWikipediaTag(`${label}:${sitelink.title}`);
        }
        addLink(url, `${label}: ${sitelink.title}`);
      }
    }
  }

  function renderTags(tags) {
    const contact = {};
    const addr = {};
    const mutableTags = { ...tags };

    if (Object.keys(mutableTags).length > 0) {
      elements.title.textContent = mutableTags.name || mutableTags.operator || '';
      delete mutableTags.name;

      for (const key in mutableTags) {
        const value = mutableTags[key];

        if (key === 'amenity' || key === 'tourism' || key === 'leisure' || key === 'craft') {
          elements.type.textContent = humanize(value);
        } else if (key === 'shop' || key === 'office') {
          elements.type.textContent = `${humanize(value)} ${humanize(key)}`;
        } else if (key === 'natural' || key === 'historic') {
          elements.type.textContent = `${humanize(key)} ${humanize(value)}`;
        } else if (key === 'highway' && value === 'bus_stop') {
          elements.type.textContent = humanize(value);
        } else if (key === 'description') {
          elements.type.textContent = humanize(value);
        } else if (key === 'wheelchair') {
          const dt = document.createElement('dt');
          dt.textContent = 'Wheelchair accessible';
          const dd = document.createElement('dd');
          dd.textContent = humanize(value);
          elements.contact.appendChild(dt);
          elements.contact.appendChild(dd);
          elements.contactSection.style.display = 'block';
        } else if (key === 'website' || key === 'url' || key === 'contact:website' || key === 'contact:url') {
          const a = document.createElement('a');
          a.href = value;
          a.target = '_blank';
          a.textContent = value;
          const dt = document.createElement('dt');
          dt.textContent = humanize(key.split(':')[1] || key);
          const dd = document.createElement('dd');
          dd.appendChild(a);
          elements.contact.appendChild(dt);
          elements.contact.appendChild(dd);
          elements.contactSection.style.display = 'block';
        } else if (key === 'opening_hours') {
          const dt = document.createElement('dt');
          dt.textContent = 'Opening Hours';
          const dd = document.createElement('dd');
          const oh = new opening_hours(value, {}, { locale: navigator.language });
          const prettifiedValue = oh.prettifyValue({
            conf: { locale: navigator.language, rule_sep_string: '<br>', print_semicolon: false }
          });
          const state =
            'Currently: ' +
            (oh.getUnknown() ? 'Unknown' : oh.getState() ? '<span style="color:green;">Open</span>' : '<span style="color:red;">Closed</span>') +
            '<br>';
          dd.innerHTML = state + prettifiedValue;
          elements.contact.appendChild(dt);
          elements.contact.appendChild(dd);
          elements.contactSection.style.display = 'block';
        } else if (key.startsWith('addr:')) {
          addr[key.split(':')[1]] = value;
        } else if (key.startsWith('contact:')) {
          contact[humanize(key.split(':')[1])] = value;
        } else if (key === 'phone' || key === 'fax' || key === 'email') {
          contact[humanize(key)] = value;
        } else if (key === 'wikipedia') {
          handleWikipediaTag(value);
        } else if (/^https?:\/\//.test(value)) {
          addLink(value, value);
        } else if (key === 'wikidata') {
          addLink(`https://www.wikidata.org/wiki/${value}`, `Wikidata: ${value}`);
        } else {
          const dt = document.createElement('dt');
          dt.textContent = humanize(key);
          const dd = document.createElement('dd');
          dd.textContent = humanize(value);
          elements.openstreetmap.appendChild(dt);
          elements.openstreetmap.appendChild(dd);
        }

        elements.openstreetmapDetails.style.display = 'block';
      }
    }

    if (Object.keys(addr).length > 0) {
      const dt = document.createElement('dt');
      dt.textContent = 'Address';
      const dd = document.createElement('dd');
      const addrParts = [];
      const addrPartNames = [
        ['street', 'place', 'housename', 'housenumber'],
        ['postcode', 'hamlet', 'suburb', 'subdistrict', 'district', 'village', 'city', 'province', 'state']
      ];

      for (let i = 0; i < addrPartNames.length; i += 1) {
        const rows = addrPartNames[i];
        const row = [];
        for (let j = 0; j < rows.length; j += 1) {
          const key = rows[j];
          if (addr[key]) {
            row.push(addr[key]);
          }
        }
        if (row.length > 0) {
          addrParts.push(row.join(' '));
        }
      }

      dd.innerHTML = addrParts.join('<br>');
      elements.address.appendChild(dt);
      elements.address.appendChild(dd);
      elements.contactSection.style.display = 'block';
    }

    if (Object.keys(contact).length > 0) {
      for (const key in contact) {
        const dt = document.createElement('dt');
        dt.textContent = key;
        const dd = document.createElement('dd');
        dd.textContent = contact[key];
        elements.contact.appendChild(dt);
        elements.contact.appendChild(dd);
      }
      elements.contactSection.style.display = 'block';
    }
  }

  function addOpenStreetMapLink(osmType, osmId) {
    const osmUrl = `https://www.openstreetmap.org/${osmType}/${osmId}`;
    const osmLink = createLink(osmUrl, `OpenStreetMap ${osmType} ${osmId}`);
    elements.openstreetmap.appendChild(osmLink);
  }

  return {
    show,
    hide,
    clear,
    setSelection,
    getSelection,
    updateFavoriteButton,
    renderTags,
    renderWikidata,
    renderRoutes,
    renderRouteStops,
    addOpenStreetMapLink
  };
}
