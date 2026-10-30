function firstMessage(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstMessage(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const found = firstMessage(value[key]);
      if (found) return found;
    }
  }
  return null;
}

export function getErrorMessage(error, fallback = 'Kuch ghalat ho gaya. Dobara koshish karein.') {
  const response = error?.response;
  if (!response) return 'Server se rabta nahi ho raha. Internet ya backend check karein.';
  const { status, data } = response;
  if (status === 401) return 'Session khatam ho gaya. Dobara login karein.';
  if (status === 403) return 'Aap ko is kaam ki ijazat nahi hai.';
  if (status === 429) return 'Bohat zyada koshishein. Thori der baad dobara try karein.';
  if (status >= 500) return 'Server mein masla hai. Thori der baad dobara try karein.';
  return firstMessage(data) ?? fallback;
}


// 400 ke jawab ko "field ke hisaab se" aur "aam" paighamon mein baantta hai.
export function splitApiErrors(error, fieldNames) {
  const data = error?.response?.data;
  const fields = {};
  const general = [];
  if (error?.response?.status === 400 && data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      const message = firstMessage(value);
      if (!message) continue;
      if (fieldNames.includes(key)) fields[key] = message;
      else general.push(message);
    }
    return { fields, general: general[0] ?? '' };
  }
  return { fields, general: getErrorMessage(error) };
}