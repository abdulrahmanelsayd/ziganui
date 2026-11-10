import facts from '../../design-assets/site-facts.json' with { type: 'json' };

export interface Location {
  id: string;
  title: string;
  mapPlaceName: string;
  address: string;
  mapUrl: string;
  receptionEveryDay: boolean | null;
  receptionLabel: string | null;
  photo: null;
}

export interface TrainingProgram {
  id: string;
  name: string;
  minimumAge: number | null;
  maximumAge: number | null;
  allCategories: boolean;
  ageCaption: string;
}

interface SiteData {
  brand: {
    nameAr: string; shortNameAr: string; nameEn: string; sport: string;
    city: string; country: string; locale: string; direction: string;
    trainingHasStarted: boolean;
  };
  audience: {
    minimumAge: number; maximumAge: number; acceptsBoys: boolean;
    acceptsGirls: boolean; groupingFactors: string[];
  };
  coach: {
    name: string; displayName: string; role: string; university: string;
    fieldOfStudy: string; graduated: boolean; firstAidCourses: boolean;
    experience: string[]; photo: null;
  };
  training: {
    freeTrial: boolean; practicalSessions: boolean; theorySessions: boolean;
    programs: TrainingProgram[];
  };
  subscriptions: {
    period: string; publishPrices: boolean; enquiryRequired: boolean;
    transportOptions: boolean; transportDependsOnArea: boolean; uniformIncluded: boolean;
  };
  contact: {
    phoneLocal: string; phoneInternational: string; phoneHref: string;
    whatsappLocal: string; whatsappInternationalDigits: string;
    whatsappBaseUrl: string; trialMessage: string; generalMessage: string;
    trainingEnquiryMessage: string;
    facebook: string; instagram: string; email: null;
  };
  locations: Location[];
}

// Business facts live in the supplied JSON, never in individual components.
export const site: SiteData = facts;
export const previewMode = true;
export const whatsappUrl = (message: string): string =>
  `${site.contact.whatsappBaseUrl}?text=${encodeURIComponent(message)}`;
export const trainingEnquiryUrl = whatsappUrl(site.contact.trainingEnquiryMessage);
export const trialUrl = whatsappUrl(site.contact.trialMessage);
export const enquiryUrl = whatsappUrl(site.contact.generalMessage);
export const navigation = [
  { label: 'الرئيسية', href: '/' },
  { label: 'عن الأكاديمية', href: '/about/' },
  { label: 'التدريب والبرامج', href: '/programs/' },
  { label: 'الصور والأنشطة', href: '/gallery/' },
  { label: 'المقر والتواصل', href: '/contact/' },
] as const;
