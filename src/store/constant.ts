// theme constant
export const gridSpacing = 3;
export const drawerWidth = 236; // px — design handoff 1.6
export const appDrawerWidth = 320;
export const gridSpacingSm = 1;
export const largeWidgetHeight = 254; // 140 + 90 + 24 (row spacing)
export const xLargeWidgetHeight = 525; // based on employee table in dashboard
export const mediumWidgetHeight = 140;
export const smallWidgetHeight = 90;

// UI tokens (centralized to avoid hard-coded values in components)
// Buttons
export const buttonHeightLg = 50; // px
export const buttonMinWidth = 120; // px
export const buttonHeightSm = 32; // px

// Search widths (Header vs Tables/Pages)
export const headerSearchWidthMd = 360; // px
export const headerSearchWidthLg = 420; // px (design handoff 1.6: max 420)
export const tableSearchWidthMd = 300; // px
export const tableSearchWidthLg = 250; // px

// Header/Content layout metrics
export const headerLogoWidthSm = 160; // px
export const headerLogoWidthLg = 228; // px
export const headerIconSize = 20; // px
export const headerHeight = 68; // px (design handoff 1.6 said 60; owner asked for a little more so it does not read thin — was 88)
// Same height as the app bar, so the two hairlines meet as one continuous line instead of a step.
export const sidebarHeaderHeight = headerHeight; // px
export const headerSearchHeight = 36; // px
export const horizontalHeaderHeight = 135; // px (when horizontal menu)
export const collapsedDrawerWidth = 72; // px (mini variant width)
export const contentPadding = 20; // px
export const contentMargin = 20; // px
export const containerViewportOffset = headerHeight + 2 * 20; // px (header + content padding 20 x 2)

// Tables
export const tableMaxHeight = 500; // px (large table containers)
export const smallTableMaxHeight = 322; // px

// Overlays/Popper
export const mobileSearchPopperWidth = '99%';
export const mobileSearchPopperTopOffset = 55; // px
