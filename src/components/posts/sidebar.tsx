/**
 * Shape parity for the communities returned by /api/communities. Still used by
 * the feed for `?community=` filtering and the selected-community banner.
 */
export type RailCommunity = {
  id: string;
  name: string;
  slug: string;
  description: string;
  members: number;
  icon: string;
  tone: string;
  postCount: number;
  joined: boolean;
};

/**
 * A college community row used by the sidebar join control in earlier builds.
 * Retained as a type only; the left sidebar has been removed from the Posts
 * page (join now lives in the community header).
 */
export type RailCollege = {
  id: string;
  href: string;
  shortName: string;
  name: string;
  color: string;
  soft: string;
  border: string;
  members: number;
  postCount: number;
  joined: boolean;
};
