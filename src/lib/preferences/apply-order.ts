/** Merges a saved order into the application-defined default order: known
 *  ids are re-sorted to match the saved order; any id the save predates
 *  (added to the app after the user last saved) keeps its default relative
 *  position, appended at the end. Includes hidden ids — callers that only
 *  want to render the visible set should also apply a hidden-set filter
 *  (see applyOrderAndVisibility below); callers editing the full
 *  show/hide+reorder UI want every id, hidden or not. */
export function mergeOrder(defaultOrder: string[], savedOrder: string[]): string[] {
  const known = new Set(defaultOrder);
  return [
    ...savedOrder.filter((id) => known.has(id)),
    ...defaultOrder.filter((id) => !savedOrder.includes(id)),
  ];
}

/** Applies a saved order/hidden-set to a default-ordered id list — the
 *  actual "what should render, in what order" resolution. Shared by both
 *  the dashboard-widget and sidebar-item pickers so "add a new widget/nav
 *  item later" never orphans a user's saved layout — it just appears at
 *  the end until they explicitly reorder it.
 *
 *  Pure, zero-dependency — safe to import from client components (the
 *  sidebar needs it to resolve its own display order without a server
 *  round-trip), unlike the rest of src/lib/preferences which touches the
 *  database. */
export function applyOrderAndVisibility(
  defaultOrder: string[],
  savedOrder: string[],
  hidden: string[],
): string[] {
  const hiddenSet = new Set(hidden);
  return mergeOrder(defaultOrder, savedOrder).filter((id) => !hiddenSet.has(id));
}
