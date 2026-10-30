export const PHONE_PATTERN = /^\+?\d{10,15}$/;

export function validatePhone(value) {
  if (!value) return '';
  return PHONE_PATTERN.test(value) ? '' : 'Phone sirf digits mein likhein (10 se 15 digits, shuru mein + allowed).';
}

export function validateEmail(value) {
  if (!value) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Email sahi nahi.';
}

export function validatePasswordChange({ oldPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!oldPassword) errors.oldPassword = 'Purana password likhein.';
  if (!newPassword) errors.newPassword = 'Naya password likhein.';
  else if (newPassword.length < 8) errors.newPassword = 'Kam az kam 8 haroof.';
  else if (/^\d+$/.test(newPassword)) errors.newPassword = 'Sirf digits wala password nahi chalega.';
  else if (newPassword === oldPassword) errors.newPassword = 'Naya password purane se alag hona chahiye.';
  if (newPassword && confirmPassword !== newPassword) errors.confirmPassword = 'Dono password mel nahi khate.';
  return errors;
}


export function validateUsername(value) {
  const text = (value ?? '').trim();
  if (!text) return 'Username likhein.';
  if (text.length > 150) return 'Username 150 haroof se chhota ho.';
  if (!/^[\w.@+-]+$/.test(text)) return 'Username mein sirf haroof, digits aur @ . + - _ chalte hain.';
  return '';
}

export function validateNewPassword(password, username = '') {
  if (!password) return 'Password likhein.';
  if (password.length < 8) return 'Kam az kam 8 haroof.';
  if (/^\d+$/.test(password)) return 'Sirf digits wala password nahi chalega.';
  const name = (username ?? '').trim().toLowerCase();
  if (name.length >= 3 && password.toLowerCase().includes(name)) return 'Password mein username nahi hona chahiye.';
  return '';
}