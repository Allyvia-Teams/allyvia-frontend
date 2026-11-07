// Width rules for the insights pages (S6).
//
// The layout switches at the theme's md (768px of viewport): below it the
// header stacks, the impact figure drops under the summary, the rationale is
// one column and the chips scroll in one row. But from 768px to about 1090px
// the app's sidebar is open, and the page itself is only 430-700px wide. So
// the page root is a size container, and below 600px of PAGE width the
// stacked layout comes back even on a wide viewport. Write each rule as
// `{ xs: narrow, md: wide }` and follow it with `[NARROW_PAGE]: narrow`; the
// container rule comes later in the CSS, so it wins.
//
// The chip row is the exception: it follows the viewport only, as the brief
// says (scroll below 768px, wrap from 768px).

/** Spread into the sx of each page's root element. */
export const INSIGHTS_CONTAINER = { containerType: 'inline-size', containerName: 'insights' } as const;

/** Page narrower than 600px, whatever the viewport. */
export const NARROW_PAGE = '@container insights (max-width: 599.98px)';
