import type { SearchParams, CloudTypeValue } from "@/types/search";

export type SearchLaunchPresetSource = "template" | "trending" | "recent";

export interface SearchLaunchPreset {
  id: string;
  label: string;
  description?: string;
  source: SearchLaunchPresetSource;
  params: SearchParams;
  fromTrending?: {
    title: string;
    originalTitle?: string;
    keyword: string;
  };
}

export interface SearchLaunchTemplateGroup {
  title: string;
  description: string;
  keywords: SearchLaunchPreset[];
}

export interface SearchLaunchTrendingEntry {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  presets: SearchLaunchPreset[];
}

export interface RecentEffectiveSearch {
  id: string;
  keyword: string;
  params: SearchParams;
  total: number;
  cloudTypes: CloudTypeValue[];
  searchedAt: string;
}
