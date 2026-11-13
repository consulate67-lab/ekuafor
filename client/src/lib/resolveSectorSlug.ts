/** Firma kaydından sektör slug’ı — eksikse ada / şablon id’den tahmin. */
export function resolveSectorSlug(input: {
  primarySlug?: string | null;
  sectorSlugs?: string[] | null;
  webTemplateId?: string | null;
  name?: string | null;
}): string {
  const primary = (input.primarySlug || '').trim();
  if (primary) return primary;
  const first = (input.sectorSlugs || []).map(s => s.trim()).find(Boolean);
  if (first) return first;
  const tid = (input.webTemplateId || '').trim();
  if (tid.includes('-')) {
    const base = tid.replace(/-\d+$/, '');
    if (base) return base;
  }
  const n = (input.name || '').toLocaleLowerCase('tr-TR');
  if (/berber|barber|sakal|fade|tıraş|tiras/.test(n)) return 'barber';
  if (/kuaför|kuafor|saç|sac |salon/.test(n)) return 'barber';
  if (/nail|tırnak|tirnak|protez/.test(n)) return 'nails';
  if (/diş|dis |dental|ortodont/.test(n)) return 'dental';
  if (/pilates|yoga/.test(n)) return 'pilates_yoga';
  if (/fitness|gym|spor/.test(n)) return 'fitness';
  if (/masaj|spa|wellness/.test(n)) return 'spa';
  if (/güzellik|guzellik|beauty|makyaj/.test(n)) return 'beauty';
  return 'barber';
}
