export function parseWikipediaTag(value) {
  const parts = value.split(':');
  const lang = parts.length > 1 ? parts[0] : 'en';
  const title = parts.length > 1 ? parts.slice(1).join(':') : parts[0];
  return { lang, title };
}

export async function fetchWikipediaExtract(lang, title) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&exlimit=1&explaintext=1&exsentences=5&formatversion=2&prop=extracts&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  const response = await fetch(url, { mode: 'cors' });
  const data = await response.json();
  return data?.query?.pages?.[0]?.extract || '';
}

export async function fetchWikipediaImages(lang, title) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=images&imlimit=4&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  const response = await fetch(url, { mode: 'cors' });
  const data = await response.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  return pages.length > 0 && pages[0].images ? pages[0].images : [];
}

export async function fetchWikipediaImageUrl(lang, imageTitle) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(imageTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
  const response = await fetch(url, { mode: 'cors' });
  const data = await response.json();
  const filePages = data?.query?.pages ? Object.values(data.query.pages) : [];
  return filePages?.[0]?.imageinfo?.[0]?.url || null;
}

export async function fetchWikidataEntity(wikidataId) {
  if (!wikidataId) return null;
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
  const response = await fetch(url);
  const data = await response.json();
  return data?.entities?.[wikidataId] || null;
}
