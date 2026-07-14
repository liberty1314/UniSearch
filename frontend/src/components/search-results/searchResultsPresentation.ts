import type { CloudTypeValue } from "@/types/search";
import type { ResourceObject } from "@/types/resource";
import type { ResultItem } from "@/utils/cloudTypeUtils";
import { sortResources } from "@/utils/searchResultSorter";

export const SEARCH_RESULTS_FIRST_PAGE_SIZE = 48;

interface BuildSearchResultsPresentationParams {
  resources: ResourceObject[] | null | undefined;
  keyword: string;
  selectedCloudTypes: CloudTypeValue[];
  displayedCount: number;
  enableSourceDiversity: boolean;
  maxPerSource: number;
}

export function rebalanceFirstPageBySource(
  items: ResultItem[],
  pageSize: number,
  maxPerSource: number,
): ResultItem[] {
  const head: ResultItem[] = [];
  const deferred: ResultItem[] = [];
  const tail: ResultItem[] = [];
  const counts = new Map<string, number>();

  for (const item of items) {
    if (head.length >= pageSize) {
      tail.push(item);
      continue;
    }

    const sourceId = String(item.resource.source.id || "unknown").trim() || "unknown";
    const count = counts.get(sourceId) || 0;
    if (count >= maxPerSource) {
      deferred.push(item);
      continue;
    }

    head.push(item);
    counts.set(sourceId, count + 1);
  }

  const fillCount = pageSize - head.length;
  return [
    ...head,
    ...deferred.slice(0, fillCount),
    ...deferred.slice(fillCount),
    ...tail,
  ];
}

export function buildSearchResultsPresentation({
  resources,
  keyword,
  selectedCloudTypes,
  displayedCount,
  enableSourceDiversity,
  maxPerSource,
}: BuildSearchResultsPresentationParams): {
  allSortedResults: ResultItem[];
  displayedResults: ResultItem[];
} {
  const sortedResults = sortResources(resources, keyword);
  const filteredResults = selectedCloudTypes.length === 0
    ? sortedResults
    : sortedResults.filter((item) =>
        selectedCloudTypes.includes(item.cloudType as CloudTypeValue),
      );
  const presentedResults = enableSourceDiversity
    ? rebalanceFirstPageBySource(
        filteredResults,
        SEARCH_RESULTS_FIRST_PAGE_SIZE,
        maxPerSource,
      )
    : filteredResults;

  return {
    allSortedResults: presentedResults,
    displayedResults: presentedResults.slice(0, displayedCount),
  };
}
