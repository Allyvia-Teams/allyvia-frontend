# Task Overview

## Current Status

- Navigation (`menu-items/routes.ts`) remains the source for path/component/icon metadata.
- Permission registry (`menu-items/permissionData.ts`) now derives module display names, hierarchy, and manage flags from the navigation data.
- Role tooling (`permissionNodeAdapter.ts`, role UI components) reads all display metadata from the unified permission registry.
- Icon utilities (`utils/permission-icons.ts`) sync module/page icons with navigation but still inline tab/action overrides.

## File Responsibilities

| #   | File                                                    | Description / Purpose                                                    | Key Consumers                      | Notes                                                                   |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------- |
| 1   | `package.json`                                          | Updated project scripts/dependencies to support new tooling.             | Build, lint, runtime scripts       | Coordinate with `package-lock.json` changes.                            |
| 2   | `package-lock.json`                                     | Lockfile reflecting dependency updates.                                  | npm                                | Automatically generated.                                                |
| 3   | `TASK.md`                                               | Working document tracking unified permission work.                       | Developers                         | This file.                                                              |
| 4   | `src/api/company.api.ts`                                | New company API helper utilities.                                        | Settings flows, profile updates    | Interfaces with backend company endpoints.                              |
| 5   | `src/api/role.api.ts`                                   | New role-management API helper (create/update roles, fetch permissions). | Role UI components                 | Replaces legacy `src/api/role.ts` (deleted).                            |
| 6   | `src/api/subscription.api.ts`                           | Subscription API utilities (list plans, manage subscriptions).           | Billing screens                    | Imports module display names from unified registry.                     |
| 7   | `src/config/route-mapping.ts`                           | Permission-to-menu mapping for guards/menu filtering.                    | ProtectedRoute, permission helpers | Still manually maintained; candidate for later derivation.              |
| 8   | `src/config/subscription-plans.ts`                      | Plan definitions + helper functions.                                     | Billing tab, pricing flows         | Reuses module display names from unified registry.                      |
| 9   | `src/config/themes.ts`                                  | Theme configuration helpers.                                             | Theme builder/profile UI           | Supports custom theme components.                                       |
| 10  | `src/layout/MainLayout/Header/ProfileSection/index.tsx` | Header profile section adjustments.                                      | Global layout                      | Hooks into profile APIs.                                                |
| 11  | `src/layout/MainLayout/MenuList/index.tsx`              | Side menu filtered by subscription & permissions.                        | Layout                             | Dropped unused imports, now depends on unified menu data.               |
| 12  | `src/menu-items/index.ts`                               | Public menu export (`{ items: [...] }`).                                 | Breadcrumbs, menu list             | Pulls from unified helpers.                                             |
| 13  | `src/menu-items/routes.ts`                              | Canonical navigation schema (paths, components, icons).                  | Routing, permissions, icons        | Expanded to keep hierarchy consistent.                                  |
| 14  | `src/menu-items/utils.ts`                               | Builds router objects/menu trees from schema.                            | Router setup, subscription menu    | Lint reports unused `ComponentType`.                                    |
| 15  | `src/menu-items/permissionData.ts`                      | Permission registry (modules/pages/tabs/actions).                        | Role UI, billing, plans            | Derives module names/hierarchy from routes; tabs/actions still curated. |
| 16  | `src/menu-items/pages.ts`                               | **Deleted** legacy menu export (redundant).                              | —                                  | Replaced by unified helpers.                                            |
| 17  | `src/routes/MainRoutes.tsx`                             | Main app routes using new helpers.                                       | Router                             | Cleaned up imports/formatting.                                          |
| 18  | `src/routes/index.tsx`                                  | Router initialization update.                                            | App entry                          | Aligns with new route structure.                                        |
| 19  | `src/routes/guards/ProtectedRoute.tsx`                  | Permission-aware route guard.                                            | Route tree                         | New guard implementation using unified helpers.                         |
| 20  | `src/store/reducer.ts`                                  | Root reducer updates for new slices.                                     | Redux store                        | Integrates role/subscription logic.                                     |
| 21  | `src/store/slices/auth.ts`                              | Auth slice updates (role awareness).                                     | Auth flows                         | Tracks role permission loading state.                                   |
| 22  | `src/store/slices/integrations.ts`                      | Integration slice adjustments.                                           | Integrations UI                    | Updated for new APIs.                                                   |
| 23  | `src/store/slices/subscription.ts`                      | Subscription slice updates.                                              | Billing management                 | Syncs with new API helpers.                                             |
| 24  | `src/store/slices/role.ts`                              | New Redux slice for role state.                                          | Role UI                            | Manages permissions, available modules.                                 |
| 25  | `src/themes/palette.tsx`                                | Palette tweaks supporting custom themes.                                 | Theme components                   | Used by profile theme builder.                                          |
| 26  | `src/types/api.ts`                                      | API request/response types.                                              | API helpers                        | New shared types.                                                       |
| 27  | `src/types/company.ts`                                  | Company type updates.                                                    | Company API & UI                   | Matches new backend fields.                                             |
| 28  | `src/types/config.ts`                                   | Config type updates.                                                     | Config context                     | Aligns with new theme/customization data.                               |
| 29  | `src/types/employee.ts`                                 | Employee type updates.                                                   | Employee management                | Reflects new fields.                                                    |
| 30  | `src/types/permission.ts`                               | Permission node types.                                                   | Permission adapters, role UI       | New file.                                                               |
| 31  | `src/types/role.ts`                                     | Role-related types.                                                      | Role API, store                    | New file.                                                               |
| 32  | `src/types/settings.ts`                                 | Settings types.                                                          | Profile/settings UI                | New file.                                                               |
| 33  | `src/types/subscription.ts`                             | Subscription types.                                                      | Subscription API/store             | New file.                                                               |
| 34  | `src/ui-component/profile/ChangePasswordDialog.tsx`     | Dialog for password change.                                              | Profile settings                   | New component.                                                          |
| 35  | `src/ui-component/profile/ColorPicker.tsx`              | Theme color picker.                                                      | Custom theme builder               | New component.                                                          |
| 36  | `src/ui-component/profile/CustomThemeBuilder.tsx`       | Custom theme builder UI.                                                 | Profile settings                   | New component.                                                          |
| 37  | `src/ui-component/profile/PreferencesWidget.tsx`        | Preferences panel.                                                       | Profile page                       | New component.                                                          |
| 38  | `src/ui-component/profile/ProfileForm.tsx`              | Profile form updates (company/profile APIs).                             | Profile UI                         | Uses new APIs/types.                                                    |
| 39  | `src/ui-component/profile/ProfileInfoWidget.tsx`        | Profile info display widget.                                             | Profile UI                         | New component.                                                          |
| 40  | `src/ui-component/profile/ThemeSelectorModal.tsx`       | Theme selector modal.                                                    | Profile UI                         | New component.                                                          |
| 41  | `src/ui-component/role/ChangeUserRoleModal.tsx`         | Modal to change user roles.                                              | Role management                    | Updated to read from unified metadata.                                  |
| 42  | `src/ui-component/role/`…                               | Role tree parts (Tabs panel, inspector, preview, tree).                  | Role management                    | Components updated to use new metadata/icons.                           |
| 43  | `src/ui-component/subscription/`…                       | Subscription management components (manage modal, etc.).                 | Billing flows                      | New/updated components for subscription UI.                             |
| 44  | `src/ui-component/profile/ThemeSelectorModal.tsx`       | (duplicate) Already listed; see row 40.                                  | —                                  | —                                                                       |
| 45  | `src/utils/customTheme.ts`                              | Custom theme utilities.                                                  | Theme builder                      | New helper file.                                                        |
| 46  | `src/utils/debounce.ts`                                 | Debounce helper.                                                         | Misc utilities                     | New helper.                                                             |
| 47  | `src/utils/mockApi.ts`                                  | Mock API adjustments.                                                    | Mock/testing flows                 | Updated to align with new APIs.                                         |
| 48  | `src/utils/permission-helpers.ts`                       | Build allowed keys & menu checker.                                       | ProtectedRoute, menu filtering     | Still references separate mapping.                                      |
| 49  | `src/utils/permission-icons.ts`                         | Icon registry synced with navigation.                                    | Role UI (tabs/actions).            | Tabs/actions still curated overrides.                                   |
| 50  | `src/utils/permissionNodeAdapter.ts`                    | Converts backend permission data ↔ UI tree.                             | Role UI                            | Now imports unified metadata.                                           |
| 51  | `src/utils/subscription-menu.ts`                        | Menu filtering by plan.                                                  | Layout menu                        | Uses unified menu data.                                                 |
| 52  | `src/utils/mockApi.ts`                                  | (duplicate entry earlier; ensures record)                                | Mock data updates                  | Aligns with new API fields.                                             |
| 53  | `src/routes/index.tsx`                                  | (duplicate earlier) Router init.                                         | —                                  | —                                                                       |
| 54  | `src/views/pages/error/index.tsx`                       | Error page updates.                                                      | Routing                            | Possibly new error handling.                                            |
| 55  | `src/views/pages/error/Unauthorized.tsx`                | Unauthorized page addition.                                              | Protected route fallback           | New component.                                                          |
| 56  | `src/views/pages/playground/index.tsx`                  | Playground view tweaks.                                                  | Dev/test area                      | Reflects new permission info.                                           |
| 57  | `src/views/playground/AvailablePages.tsx`               | Playground component listing pages.                                      | Dev/test area                      | New component.                                                          |
| 58  | `src/views/subscription/PaymentPlanSelection.tsx`       | Payment plan selection updates.                                          | Subscription onboarding            | Uses new plan metadata.                                                 |
| 59  | `src/views/subscription/SuccessfulCheckout.tsx`         | Checkout success view adjustments.                                       | Subscription flows                 | Updated for new APIs.                                                   |
| 60  | `src/views/settings/`…                                  | Settings tabs (Account, Billing, Company Info, Role Management, index).  | Settings UI                        | Updated to leverage new APIs/types.                                     |
| 61  | `src/views/settings/tabs/BillingTab.tsx`                | Billing tab logic.                                                       | Settings                           | Uses unified module display names.                                      |
| 62  | `src/views/settings/tabs/AccountTab.tsx`                | Account settings tab.                                                    | Settings                           | Updated with new API/types.                                             |
| 63  | `src/views/settings/tabs/CompanyInfoTab.tsx`            | Company info tab.                                                        | Settings                           | Updated for new API/type structure.                                     |
| 64  | `src/views/settings/tabs/UserRoleManagementTab.tsx`     | Role management tab.                                                     | Settings                           | Uses new role slice/API.                                                |
| 65  | `src/config/themes.ts`                                  | (duplicate earlier) theme config adjustments.                            | —                                  | —                                                                       |
| 66  | `src/views/settings/index.tsx`                          | Settings page index.                                                     | Settings                           | Coordinates updated tabs/components.                                    |
| 67  | `src/mock/`                                             | Mock data updates (`settings.mock.ts`, `storage.ts`).                    | Testing                            | Updated to mirror new data structures.                                  |
| 68  | `src/api/role.ts`                                       | **Deleted** old role API helper.                                         | —                                  | Replaced by `src/api/role.api.ts`.                                      |
| 69  | `src/menu-items/pages.ts`                               | **Deleted** legacy menu export.                                          | —                                  | Superseded by unified helpers.                                          |

_(Rows listing duplicates note that the file appeared multiple times in the change list. Where possible, deduplicated or clarified.)_

## Permission Flow (End-to-End)

1. **Backend Plan/Role Data** — API returns `available_modules` describing what a company/plan can use.
2. **Unified Registry (`permissionData.ts`)** — Supplements navigation metadata with curated tabs/actions and capability flags.
3. **Role Editing UI** — `permissionNodeAdapter` merges backend availability with the registry to create the UI tree (RoleTree, Tabs panel, Inspectors, Navigation preview).
4. **Saving Roles** — Adapter converts the UI state back to the API structure and submits changes.
5. **Enforcement** — `ProtectedRoute` guards routes; `getMenuItemsFromSubscription` filters navigation items based on plan availability.
6. **Billing / Plan Views** — Billing tab and subscription flows use registry display names and plan metadata for presentation.

## Gaps / Future Work

1. **Schema unification** — Tab/action metadata still curated manually; aim to centralize everything and synchronise with backend keys. Also derive `permissionKeyToMenuIdMap` from the unified data.
2. **Backend alignment** — Need richer permission payloads (display names, hierarchy, actions) to fully generate the registry from API responses.
3. **Lint cleanup** — `npm run lint` fails due to numerous pre-existing unused imports/variables; address before commit.

## Next Actions

- Design the final unified schema (routes, modules, pages, tabs, actions) and circulate for review.
- Refactor routing, role UI, icons, plan tooling to consume the new schema incrementally.
- Coordinate with backend to provide enriched permission metadata for alignment.
- Tackle lint debt (clear or suppress unused code warnings) prior to merging.
