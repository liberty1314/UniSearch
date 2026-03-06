export const replaceSelectedKeys = <K extends string | number>(
  clearSelected: () => void,
  selectKey: (key: K, checked: boolean) => void,
  nextSelected: Set<K>
) => {
  clearSelected();
  nextSelected.forEach((key) => selectKey(key, true));
};

export const buildSelectionPreviewText = <T, K extends string | number>(
  orderedItems: T[],
  selectedKeys: Set<K>,
  getKey: (item: T) => K,
  getLabel: (item: T) => string,
  limit = 3
) =>
  orderedItems
    .filter((item) => selectedKeys.has(getKey(item)))
    .map((item) => getLabel(item))
    .slice(0, limit)
    .join('、');

export const areAllFilteredSelected = <T, K extends string | number>(
  filteredItems: T[],
  selectedKeys: Set<K>,
  getKey: (item: T) => K
) =>
  filteredItems.length > 0 &&
  filteredItems.every((item) => selectedKeys.has(getKey(item)));
