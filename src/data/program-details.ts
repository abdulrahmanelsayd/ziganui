// Approved editorial copy, keyed by the central program ID. Names, ages and order live in site.ts.
export const programDetails: Record<string, { description: string; focus: string[] }> = {
  "grassroots": {
    "description": "بداية منظّمة للتعرّف على كرة القدم. نركّز على الحركة بالكرة وتعلّم التمرير والاستلام، مع تشجيع المشاركة والتعاون داخل المجموعة.",
    "focus": ["التحكّم بالكرة", "التمرير والاستلام", "المشاركة في اللعب"]
  },
  "juniors": {
    "description": "تطوير المهارات الأساسية وربطها بمواقف اللعب. نهتم بدقّة الأداء، وقراءة المساحات، وتوقيت التمرير والتحرّك مع الفريق.",
    "focus": ["تطوير المهارة", "قراءة المساحات", "توقيت القرار"]
  },
  "youth": {
    "description": "تدريب يربط جودة المهارة بفهم الدور داخل الفريق. نركّز على التعامل مع مواقف اللعب، والتعاون في بناء الهجمة ومساندة الزملاء.",
    "focus": ["جودة الأداء", "التحرّك مع الفريق", "التطبيق في مواقف اللعب"]
  },
  "goalkeepers": {
    "description": "اهتمام بمهارات حارس المرمى ودوره في اللعب. يركّز هذا المسار على التمركز، والتعامل مع الكرة، والتواصل مع الزملاء.",
    "focus": ["التمركز", "التعامل مع الكرة", "التواصل مع الفريق"]
  },
  "fitness": {
    "description": "تدريب على عناصر اللياقة المرتبطة بممارسة كرة القدم، مع الاهتمام بجودة الحركة والتوازن والتوافق، بما يراعي عمر اللاعب ومستواه.",
    "focus": ["جودة الحركة", "التوازن والتوافق", "الجاهزية للتمرين"]
  }
};

export function getProgramDetails(id: string): { description: string; focus: string[] } {
  const detail = programDetails[id];
  if (!detail) throw new Error(`Missing approved Programs copy for ${id}`);
  return detail;
}
