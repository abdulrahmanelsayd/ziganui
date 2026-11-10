import type { ImageMetadata } from 'astro';
import heroPhoto from '../assets/images/hero/heroo.png';
import coachPhoto from '../assets/images/coach/manager.png';

export interface PhotoAsset {
  src: ImageMetadata;
  alt: string;
  focalPoint?: string;
}

export const photos: {
  hero: PhotoAsset | null;
  coach: PhotoAsset & { desktopSrc: string; mobileSrcSet: string };
  locations: Record<string, PhotoAsset>;
} = {
  hero: { src: heroPhoto, alt: '' },
  coach: {
    src: coachPhoto,
    alt: 'الكابتن محمد القيسي',
    desktopSrc: '/images/coach/manager-1280.webp',
    mobileSrcSet: '/images/coach/manager-900.webp 681w, /images/coach/manager-1280.webp 968w',
  },
  locations: {},
};
