// Content-Disposition header se file ka naam nikalta hai (path jaise khatarnak haroof hata kar).
export function safeFilename(name) {
  const controlChars = Array.from({ length: 32 }, (_, index) => String.fromCharCode(index)).join('');

  return String(name)
    .replace(new RegExp(`[\\\\/:*?"<>|${controlChars}]`, 'g'), '_')
    .replace(/^\.+/, '')
    .trim();
}

export function filenameFromDisposition(header, fallback) {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  if (!match) return fallback;
  let name = match[1];
  try {
    name = decodeURIComponent(name);
  } catch {
    // jaisa hai waisa
  }
  return safeFilename(name) || fallback;
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}