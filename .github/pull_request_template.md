<!-- markdownlint-disable -->

## Overview

<!-- 1-2 sentence summary of what this PR delivers -->
<!-- Example: This PR implements the Analytics Tab module with complete data visualization, state management, and API integration for dashboard analytics. -->

## PR Size

<!-- Mark the appropriate size -->

- [ ] 🐣 Small (< 100 lines, 1-3 files)
- [ ] 🐤 Medium (100-500 lines, 4-10 files)
- [ ] 🦅 Large (500+ lines, 10+ files)

## Ticket Info

- **Ticket ID:** <!-- e.g., FS-019, TICKET-123 -->
- **Scope:** <!-- e.g., Frontend, Backend, Full Stack -->
- **Status:** <!-- e.g., In Progress, Ready for Review, Blocked -->
- **Related Issues:** <!-- e.g., #123, #456 -->

## Goals

<!-- Checkbox list of implementation objectives -->
<!-- Example: - [ ] Implement analytics dashboard with real-time data visualization -->

- [ ] <!-- Goal 1 -->
- [ ] <!-- Goal 2 -->
- [ ] <!-- Goal 3 -->
- [ ] <!-- Goal 4 -->

## Deliverables

<!-- Specific routes, modules, and features delivered -->

### Routes

- `<!-- /route/path -->` - <!-- Description -->

### Modules

- `<!-- module-name -->` - <!-- Description -->

### Features

- <!-- Feature 1 -->
- <!-- Feature 2 -->
- <!-- Feature 3 -->

## Implementation Summary

### State Management

<!-- Redux slices, thunks, and state structure -->

- **Slice:** `<!-- store/slices/example.ts -->`
  - Actions: `<!-- action1, action2 -->`
  - Thunks: `<!-- fetchData, updateData -->`
  - State: `<!-- { data, loading, error } -->`

### Components

<!-- Key components and their responsibilities -->

- `<!-- ComponentName -->` - <!-- Responsibility -->
- `<!-- ComponentName -->` - <!-- Responsibility -->

### API Integration

<!-- API endpoints and integration points -->

- **Endpoint:** `<!-- GET /api/v1/endpoint -->`
- **Method:** `<!-- GET / POST / PUT / DELETE -->`
- **Integration:** `<!-- Thunk → API → Types → Component -->`

## File Structure

<!-- Organized listing of changed/added files -->

### New Files

```
src/
├── views/
│   └── module/
│       ├── index.tsx
│       └── components/
│           └── ComponentName.tsx
├── store/
│   └── slices/
│       └── moduleSlice.ts
└── types/
    └── module.types.ts
```

### Modified Files

- `<!-- path/to/file.ts -->` - <!-- What changed -->
- `<!-- path/to/file.ts -->` - <!-- What changed -->

### Deleted Files

- `<!-- path/to/file.ts -->` - <!-- Why deleted -->

## Data Flow

### Thunks → API → Types → Components

<!-- Complete data flow mapping -->

```
User Action
    ↓
Component Dispatch
    ↓
Thunk (Async Action)
    ↓
API Call (axios/fetch)
    ↓
Backend Response
    ↓
Type Validation
    ↓
Redux Store Update
    ↓
Component Re-render
```

### Per-Module Flow

<!-- Detailed breakdown by tab/endpoint -->

#### Module: <!-- Module Name -->

1. **Trigger:** <!-- User action or lifecycle -->
2. **Thunk:** `<!-- fetchModuleData -->`
3. **API:** `<!-- GET /api/v1/module/data -->`
4. **Types:** `<!-- ModuleDataResponse -->`
5. **Component:** `<!-- ModuleComponent -->`
6. **State:** `<!-- module.data -->`

#### Endpoint: <!-- Endpoint Name -->

- **Request:** `<!-- Request structure -->`
- **Response:** `<!-- Response structure -->`
- **Error Handling:** `<!-- Error handling approach -->`

## Task Checklist

<!-- Implementation verification -->

### Development

- [ ] Code follows project style guidelines
- [ ] ESLint, Prettier, and TypeScript checks pass locally and in CI
- [ ] No console.log statements
- [ ] No unused imports or variables
- [ ] Proper error handling implemented
- [ ] Loading states implemented
- [ ] Empty states implemented

### State Management

- [ ] Redux slice created/updated
- [ ] Thunks properly typed
- [ ] State structure matches API response
- [ ] Error states handled
- [ ] Loading states handled
- [ ] Selectors created (if needed)

### API Integration

- [ ] API endpoints correctly configured
- [ ] Request/response types defined
- [ ] Error handling implemented
- [ ] Loading indicators added
- [ ] Retry logic (if applicable)
- [ ] Caching strategy (if applicable)

### Components

- [ ] Components properly typed
- [ ] Props interfaces defined
- [ ] Responsive design implemented
- [ ] Accessibility considerations
- [ ] Loading states
- [ ] Error states
- [ ] Empty states

### Testing

- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Manual testing completed
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Cross-browser testing (if applicable)

## Acceptance Criteria

<!-- Functional requirements -->

- [ ] <!-- Criterion 1 -->
- [ ] <!-- Criterion 2 -->
- [ ] <!-- Criterion 3 -->
- [ ] <!-- Criterion 4 -->

## Testing & Validation

### Unit Tests

<!-- Test coverage details -->

- **Files Tested:** `<!-- test files -->`
- **Coverage:** `<!-- percentage -->`
- **Key Tests:**
  - <!-- Test case 1 -->
  - <!-- Test case 2 -->

### Integration Tests

- **Scenarios Tested:**
  - <!-- Scenario 1 -->
  - <!-- Scenario 2 -->

### Manual Testing

- **Browsers Tested:** <!-- Chrome, Firefox, Safari, Edge -->
- **Devices Tested:** <!-- Desktop, Tablet, Mobile -->
- **User Flows Tested:**
  - <!-- Flow 1 -->
  - <!-- Flow 2 -->

### Edge Cases

- <!-- Edge case 1 -->
- <!-- Edge case 2 -->

## UX/DX Details

### User Experience

<!-- User-facing improvements -->

- <!-- UX improvement 1 -->
- <!-- UX improvement 2 -->

### Developer Experience

<!-- Developer-facing improvements -->

- <!-- DX improvement 1 -->
- <!-- DX improvement 2 -->

### Performance

<!-- Performance considerations -->

- <!-- Performance note 1 -->
- <!-- Performance note 2 -->

## Screenshots/Recordings

<!-- Visual documentation -->

### Before

<!-- Screenshot or description of previous state -->

### After

<!-- Screenshot or description of new state -->

### Key Interactions

<!-- GIFs or recordings of key user interactions -->

## Breaking Changes

<!-- If applicable -->

**None**

<!-- OR -->

- <!-- Breaking change 1 -->
- <!-- Breaking change 2 -->

<details>
<summary>Migration Guide</summary>

<!-- If applicable -->

N/A

<!-- OR -->

1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->

</details>

<details>
<summary>Dependencies</summary>

<!-- New dependencies or updates -->

- **Added:**
  - `<!-- package-name@version -->` - <!-- Reason -->
- **Updated:**
  - `<!-- package-name@version -->` - <!-- Reason -->
- **Removed:**
  - `<!-- package-name -->` - <!-- Reason -->

</details>

## Deployment Notes

<!-- Special considerations for deployment -->

- [ ] Database migrations required
- [ ] Environment variables need to be updated
- [ ] Third-party service configuration needed
- [ ] Cache invalidation required
- [ ] Feature flags needed
- [ ] No special deployment steps

<details>
<summary>Next Steps</summary>

<!-- Follow-up work or future improvements -->

- <!-- Next step 1 -->
- <!-- Next step 2 -->
- <!-- Next step 3 -->

</details>

<details>
<summary>Additional Context</summary>

<!-- Any other relevant information -->
<!-- Include blockers, dependencies, or related work -->

</details>

## Reviewers

<!-- Tag specific reviewers if needed -->
<!-- @username @team-name -->

## Related PRs

<!-- Link to related PRs -->

- <!-- PR link or description -->

---

**Note:** This PR targets the `develop` branch. After merge and validation, it will be promoted to `staging` and then `production` through the standard deployment process.

**Type of Change:**

- [ ] 🐛 Bug fix (fixes a bug)
- [ ] ✨ Feature (adds a new feature)
- [ ] 💥 Breaking change (fix or feature that causes existing functionality to change)
- [ ] 📝 Documentation (documentation only changes)
- [ ] 🎨 Style (formatting, missing semi colons, etc; no code change)
- [ ] ♻️ Refactor (code change that neither fixes a bug nor adds a feature)
- [ ] ⚡ Performance (code change that improves performance)
- [ ] ✅ Test (adding missing tests or correcting existing tests)
- [ ] 🔧 Chore (changes to build process or auxiliary tools)
- [ ] 🔒 Security (security vulnerability fix)
