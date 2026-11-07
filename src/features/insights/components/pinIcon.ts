// Below 768px a global rule in src/themes/compStyleOverride.tsx sets every
// `svg` to `width: 100% !important; max-width: 100% !important` (the ApexCharts
// responsive fix). A Tabler icon's `size` prop is only an attribute, so on a
// phone each icon stretches to its parent's width. Spread this into the sx of
// the element that holds the icon to pin it back to its size. Leave the global
// rule alone: charts across the app rely on it.

export const pinIcon = (size: number) => ({
  '& svg': {
    width: `${size}px !important`,
    maxWidth: 'none !important',
    height: `${size}px`,
    flex: 'none'
  }
});
