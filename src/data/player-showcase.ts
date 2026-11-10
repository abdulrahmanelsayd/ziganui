/** Selected local-preview photographs, not personal player records or a squad total. */
export interface PlayerShowcasePhoto {
  assetId: string;
  width: number;
  height: number;
  src: string;
  srcSet: string;
  thumbnail: string;
  alt: string;
  stickerIndex: number;
}

// Public source snapshot. Only consent-approved records are used.
export const previewPlayerShowcase: readonly PlayerShowcasePhoto[] = [];
