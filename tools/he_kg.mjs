// משקל בק״ג במילים, לצורך ההקלטה: "ארבעים ושניים וחצי קילו". "קילו" הוא זכר, ולכן המספרים בזכר.
const U = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שְׁמוֹנָה', 'תשעה', 'עשרה', 'אחד־עשר', 'שנים־עשר', 'שלושה־עשר', 'ארבעה־עשר', 'חמישה־עשר', 'שישה־עשר', 'שבעה־עשר', 'שְׁמוֹנָה־עשר', 'תשעה־עשר'];
const T = ['', '', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'];
const H = ['', 'מאה', 'מאתיים'];
export function heInt(n) {
  const parts = [];
  if (n >= 100) parts.push(H[Math.floor(n / 100)]);
  const r = n % 100;
  if (r >= 20) { parts.push(T[Math.floor(r / 10)]); if (r % 10) parts.push(U[r % 10]); } else if (r) parts.push(U[r]);
  return parts.length > 1 ? `${parts.slice(0, -1).join(' ')} ו${parts[parts.length - 1]}` : parts[0] || '';
}
export function heKg(w) {
  const n = Math.floor(w), half = w % 1 !== 0;
  if (w === 0.5) return 'חצי קילו.';
  if (w === 1) return 'קילו אחד.';
  if (w === 1.5) return 'קילו וחצי.';
  if (w === 2) return 'שני קילו.';
  return `${heInt(n)}${half ? ' וחצי' : ''} קילו.`;
}
export const enKg = (w) => (w === 0.5 ? 'Half a kilo.' : w === 1 ? 'One kilo.' : `${Math.floor(w)}${w % 1 ? ' and a half' : ''} kilos.`);
