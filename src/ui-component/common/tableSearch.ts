// ui-component/common/tableSearch.ts
//
// AllyviaPaginatedTable's free-text search rule, extracted so it can be tested
// and — more to the point — so a screen can reason about what will and will not
// be found.
//
// The rule is a substring match over the row's OWN TOP-LEVEL VALUES. That is
// load-bearing for callers: a nested object stringifies to "[object Object]"
// and matches nothing, so a screen that wants a nested field searchable has to
// project it onto the row (see views/inventory/garmentFields.ts).

export const rowMatchesSearch = (row: object, searchTerm: string): boolean => {
  if (!searchTerm) return true;
  const needle = searchTerm.toLowerCase();
  return Object.values(row || {}).some((value) => String(value).toLowerCase().includes(needle));
};
