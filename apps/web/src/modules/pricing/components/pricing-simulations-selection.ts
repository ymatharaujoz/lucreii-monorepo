export function toggleSelectedId(selectedIds: string[], id: string) {
  return selectedIds.includes(id)
    ? selectedIds.filter((selectedId) => selectedId !== id)
    : [...selectedIds, id];
}

export function areAllVisibleSelected(
  selectedIds: string[],
  visibleIds: string[],
) {
  return (
    visibleIds.length > 0 &&
    visibleIds.every((visibleId) => selectedIds.includes(visibleId))
  );
}

export function toggleVisibleSelection(
  selectedIds: string[],
  visibleIds: string[],
) {
  if (areAllVisibleSelected(selectedIds, visibleIds)) {
    return selectedIds.filter((selectedId) => !visibleIds.includes(selectedId));
  }

  return [...new Set([...selectedIds, ...visibleIds])];
}
