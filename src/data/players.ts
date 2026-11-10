import type { PhotoAsset } from './photos';

export interface Player {
  id: string;
  firstName: string;
  age: number;
  photo: PhotoAsset;
  photoAlt: string;
  recognition: string;
  featuredOrder: number;
  publicationConsentApproved: boolean;
}

// Actual approved records only. Preview slots are rendered by PlayersSection.
const players: Player[] = [];
export const publishedPlayers = players
  .filter((player) => player.publicationConsentApproved)
  .sort((a, b) => a.featuredOrder - b.featuredOrder);
