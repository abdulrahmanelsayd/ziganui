// Header wording is independent of the footer's navigation in site.ts.
export const headerNavigation = [
  { label: 'الرئيسية', href: '/', aliases: ['زيغان', 'أكاديمية', 'الرئيسية'] },
  { label: 'عن الأكاديمية', href: '/#academy', aliases: ['عن الأكاديمية', 'محمد', 'القيسي', 'المدرب'] },
  { label: 'البرامج', href: '/#training', aliases: ['البرامج', 'تدريب', 'اشتراك', 'أعمار', 'بنات', 'شباب', 'تجريبي', 'مواصلات', 'زي'] },
  { label: 'الصور والأنشطة', href: '/#players', aliases: ['الصور', 'صورة', 'أنشطة', 'أبطال', 'معرض'] },
  { label: 'التواصل', href: '/#locations', aliases: ['التواصل', 'اتصال', 'واتساب', 'مقر', 'عنوان', 'خريطة', 'ملعب'] },
] as const;

export function normalizeHeaderQuery(value: string): string {
  return value.normalize('NFD')
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim();
}

const searchIndex = headerNavigation.map((entry) => ({
  ...entry,
  text: normalizeHeaderQuery([entry.label, ...entry.aliases].join(' ')),
}));

export function searchHeaderNavigation(query: string) {
  const tokens = normalizeHeaderQuery(query).split(' ').filter(Boolean);
  return tokens.length ? searchIndex.filter((entry) => tokens.every((token) => entry.text.includes(token))) : [];
}
