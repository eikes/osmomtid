export function humanize(str) {
  return String(str)
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .replace(/[_\s]+/g, ' ')
    .replace(/^[a-z]/, m => m.toUpperCase());
}

export function createLink(url, text, target = '_blank') {
  const a = document.createElement('a');
  a.href = url;
  a.target = target;
  a.textContent = text;
  return a;
}
