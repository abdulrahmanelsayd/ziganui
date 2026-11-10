import { site } from './site';

const office = site.locations.find(location => location.id === 'office');
if (!office) throw new Error('The headquarters location is missing.');

// Presentation only: the office record remains the authority for address/hours.
const [plusCode, ...addressParts] = office.address.split('،').map(part => part.trim());
const arabicDigits = (text: string) => text.replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]!);
const reception = office.receptionLabel?.match(/^(.*?) (\d+) (.*?) حتى (\d+) (.*)$/);
if (!reception) throw new Error('The headquarters reception label has an unsupported format.');

export const headquartersMap = {
  title: office.title,
  city: addressParts.join('، '),
  plusCode,
  mapUrl: office.mapUrl,
  reception: {
    lead: `الاستقبال ${reception[1]} `,
    start: arabicDigits(reception[2]!),
    between: ` ${reception[3]} إلى `,
    end: arabicDigits(reception[4]!),
    tail: ` ${reception[5]} · بتوقيت الأردن`,
  },
  headingLead: 'قريبون من',
  headingFocus: 'خطوتك الأولى.',
  supporting: ['زورنا في مقر أكاديمية زيغان', 'بالزرقاء، الأردن.'],
  directionsLabel: 'الاتجاهات للمقر',
  iframeTitle: 'خريطة مقر أكاديمية زيغان في الزرقاء',
  fallbackSentence: 'موقع مقر الأكاديمية على خرائط جوجل.',
  fallbackAction: 'اعرض الخريطة ↗',
  embedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3379.245092170602!2d36.0525772!3d32.1166826!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151b7b0049020045%3A0xe6767631e61f0723!2z2KfZg9in2K_ZitmF2YrYqSDYstmK2LrYp9mGINin2YTYsdmK2KfYttmK2Kk!5e0!3m2!1sar!2seg!4v1793639721690!5m2!1sar!2seg',
} as const;
