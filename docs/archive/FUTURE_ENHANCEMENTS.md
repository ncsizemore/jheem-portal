# Future Enhancements - HIV Age Projections App

**Last Updated**: October 20, 2025
**Current Status**: Production-ready MVP with real data

---

## High Priority - Should Address Soon

### 1. Add "By Sex" Tab ⏱️ Est: 45-60 minutes
**What**: Third tab showing MSM vs Non-MSM breakdowns
**Why**: Completes the demographic faceting feature set
**How**:
- Run `scripts/prepare_sex_data.R` (create from race template)
- Generate `hiv-age-projections-by-sex.json`
- Create `BySexView.tsx` component (copy from ByRaceView)
- Update tab navigation (change `disabled` to active)

**Files to create**:
- `scripts/prepare_sex_data.R`
- `src/data/hiv-age-projections-sex.ts`
- `src/components/BySexView.tsx`

**Data structure**: Already available in `race_sex_results.Rdata` (1.1GB)

---

### 2. Error Boundaries for Data Loading ⏱️ Est: 15 minutes
**What**: Graceful error handling if JSON fails to load or parse
**Why**: Prevents entire app crash on data issues

**Implementation**:
```typescript
// src/components/ByRaceView.tsx
try {
  const raceData = getMultiStateRaceData(stateCodes, selectedRaces);
  if (!raceData || raceData.length === 0) {
    return <ErrorFallback message="No race data available" />;
  }
} catch (error) {
  console.error('Error loading race data:', error);
  return <ErrorFallback message="Failed to load race data. Please refresh." />;
}
```

**Also add to**: BySexView (when created)

---

### 3. Clarify "Other" Race Category ⏱️ Est: 5 minutes
**What**: Add tooltip explaining what "Other" includes
**Why**: Prevents user confusion about data aggregation

**Implementation**:
```tsx
<button className="...">
  Other
  <span className="ml-1 text-xs" title="Includes White, Asian, Native American, and multiracial groups">
    ⓘ
  </span>
</button>
```

---

### 4. Loading State for Initial Render ⏱️ Est: 10 minutes
**What**: Show skeleton/spinner while React hydrates
**Why**: Better UX on slower devices, prevents flash of empty content

**Implementation**:
```typescript
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  // Small delay to ensure data is ready
  setTimeout(() => setIsLoading(false), 100);
}, []);

if (isLoading) {
  return <ChartSkeleton count={6} />;
}
```

---

## Medium Priority - Technical Debt

### 5. Bundle Size Optimization ⏱️ Est: 30 minutes
**Current**: 245KB (will be ~350-400KB after adding sex data)
**Target**: <300KB if possible

**Approaches**:
- **Code splitting**: Lazy load race/sex components
  ```typescript
  const ByRaceView = dynamic(() => import('@/components/ByRaceView'), {
    loading: () => <LoadingSpinner />,
    ssr: false
  });
  ```
- **Monitor**: If >500KB after sex data, implement splitting
- **Verify**: Next.js is serving gzipped JSON (automatic in production)

---

### 6. Confidence Intervals Display ⏱️ Est: 60 minutes
**What**: Add toggle to show/hide 95% CI bands on charts
**Why**: We have the data (median + lower/upper), should visualize uncertainty

**Implementation**:
```typescript
const [showCI, setShowCI] = useState(false);

// Add to chart:
{showCI && (
  <>
    <Area dataKey="CA_55+_upper" fill="#10B981" fillOpacity={0.15} stroke="none" />
    <Area dataKey="CA_55+_lower" fill="#10B981" fillOpacity={0.15} stroke="none" />
  </>
)}
```

**Challenge**: Need to transform data to include upper/lower in chart format

---

### 7. Race-Specific Sparklines in State Selector ⏱️ Est: 45 minutes
**What**: When viewing "By Race", state selector shows race-specific trends instead of total
**Why**: Currently shows total sparkline even in race view (slightly misleading)

**Implementation**:
- Pass `viewMode` and `selectedRaces` to StateSelector
- Calculate sparklines based on active view
- Show sum of selected races when in race view

---

### 8. Centralize getStateCode() Usage ⏱️ Est: 10 minutes
**What**: Remove duplicate state mapping in `page.tsx` line 89-98
**Why**: Already have centralized utility, no need to duplicate

**Fix**:
```typescript
// Replace lines 89-98 with:
import { getStateCode } from '@/data/hiv-age-projections';
const stateCodes = selectedStateNames.map(getStateCode);
```

---

## Low Priority - Polish & Nice-to-Haves

### 9. Accessibility Improvements ⏱️ Est: 60 minutes
**What**: ARIA labels, keyboard navigation, screen reader support
**Issues**:
- Race selector buttons lack ARIA labels
- Tab navigation should use `role="tablist"`, `role="tab"`, `aria-selected`
- Export button needs better description for screen readers

**Standards**: WCAG 2.1 AA compliance

---

### 10. Mobile Responsiveness ⏱️ Est: 30 minutes
**What**: Optimize layout for tablets and phones
**Issues**:
- 3-column control layout cramped on tablets
- State selector grid might need fewer columns on mobile
- Charts might be too small on narrow screens

**Test on**: iPad (768px), iPhone (375px)

---

### 11. Enhanced Export Options ⏱️ Est: 45 minutes
**What**: More export formats and options
**Features**:
- Export to PDF (multi-page for many charts)
- Export data as CSV
- Export specific date range only
- Include CI in export

**Library**: Consider `jspdf` for PDF generation

---

### 12. Comparative Baseline Mode ⏱️ Est: 90 minutes
**What**: Show difference from one selected baseline state
**Use case**: "How does California compare to national average?"

**Implementation**:
- Add "Compare to:" dropdown
- Show bars as difference from baseline (+/- from selected state)
- Color code: green for higher, red for lower

---

### 13. Animated Transitions Between Views ⏱️ Est: 30 minutes
**What**: Smooth morphing animation when switching tabs
**Why**: More polished feel, easier to track what changed

**Library**: Already have Framer Motion, extend usage

---

### 14. Dark Mode Support ⏱️ Est: 45 minutes
**What**: Light/dark theme toggle
**Why**: Matches rest of portal (if others have it)

**Implementation**: Tailwind dark mode classes

---

## Long-Term / Strategic

### 15. Testing Infrastructure ⏱️ Est: 4-6 hours
**What**: Unit tests, integration tests, E2E tests
**Current**: Zero test coverage

**Priorities**:
1. **Unit tests**: Data transformation functions (high value, low effort)
2. **Integration tests**: Component interactions with React Testing Library
3. **E2E tests**: URL state management, tab switching (Playwright/Cypress)

**ROI**: Critical if this becomes a long-term maintained project

---

### 16. API-Based Data Loading ⏱️ Est: 1-2 days
**What**: Fetch data from API instead of bundled JSON
**Why**: Reduces bundle size, enables dynamic updates, caching

**Approach**:
- Build Next.js API route: `/api/hiv-projections/[view]`
- Load data on demand (client-side fetch or React Query)
- Add caching layer (Redis or Next.js cache)

**When**: If data updates frequently OR bundle size >500KB

---

### 17. Short URL Generation ⏱️ Est: 2-3 hours
**What**: Create short links for complex configurations
**Example**: `/hiv-age-projections?view=race&states=CA,TX,NY,FL,GA&races=black,hispanic&normalized=true&years=2030-2040`
→ `/s/abc123`

**Implementation**:
- Database table: `{ short_code: string, full_params: json }`
- API route: `/api/shorten` and `/s/[code]`
- UI: "Copy short link" button

**Benefit**: Easier sharing on Slack/Teams

---

### 18. Saved Configurations ⏱️ Est: 1 week
**What**: User accounts with saved favorite views
**Features**:
- Save current configuration with custom name
- Load saved configurations from dropdown
- Share saved configs with team

**Requires**: Authentication system, database

---

### 19. Performance Monitoring ⏱️ Est: 1 day
**What**: Track real-world performance metrics
**Metrics**:
- Time to first render
- Chart rendering time with 25 states
- Bundle load time by geography
- Error rates

**Tools**: Vercel Analytics, Sentry, or custom instrumentation

---

### 20. User Analytics ⏱️ Est: 1 day
**What**: Track how users interact with the app
**Questions**:
- Which views are most used? (State vs Race vs Sex)
- Which states are most compared?
- What year ranges are most interesting?
- Do users use proportional or absolute display?

**Tools**: Google Analytics, Plausible, or custom events

**Privacy**: Ensure HIPAA/IRB compliance if applicable

---

## Code Quality Improvements

### 21. Reduce Prop Drilling
**Issue**: ByRaceView takes 8 props
**Solution**: React Context or Zustand store for shared state

---

### 22. Extract URL State Management to Hook
**Issue**: 120 lines of URL logic in page component
**Solution**: Create `useURLState()` custom hook

```typescript
const {
  viewMode, setViewMode,
  selectedStates, setSelectedStates,
  // ... etc
} = useURLState();
```

---

### 23. Memoize Heavy Computations
**Issue**: `getMultiStateRaceData()` runs on every render
**Solution**: Already using `useMemo`, but could add `React.memo` to ByRaceView

---

## Documentation Improvements

### 24. Add JSDoc Comments
**What**: Document complex functions with JSDoc
**Where**: Data transformation functions, helper utilities

---

### 25. Create Developer Onboarding Guide
**What**: README section for new developers joining project
**Contents**:
- Project structure
- How to add new data dimensions
- How to add new tabs
- Testing locally with real data

---

## Performance Benchmarks (Current)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Bundle size | 245 KB | <300 KB | ✅ Good |
| Time to interactive | ~1.2s | <2s | ✅ Good |
| Chart render (25 states) | ~400ms | <500ms | ✅ Good |
| First load JS | 383 KB | <500 KB | ✅ Good |

---

## Questions to Discuss with Team

1. **Data Update Frequency**: How often will JHEEM outputs update?
   - If quarterly → Current approach fine
   - If monthly → Consider API approach

2. **User Accounts**: Do we need authentication?
   - Affects saved configurations feature

3. **Analytics**: What metrics matter most?
   - Usage patterns? Performance? Errors?

4. **Accessibility**: Are there specific WCAG requirements?
   - Government funding may require AA or AAA compliance

5. **Mobile**: What % of users on mobile/tablet?
   - Affects priority of responsive optimization

---

## Implementation Priority Matrix

### Do First (High Impact, Low Effort)
- ✅ URL state management (DONE)
- ✅ Centralize state mapping (DONE)
- Add "By Sex" tab
- Add "Other" race tooltip
- Error boundaries

### Do Soon (High Impact, Medium Effort)
- Confidence intervals display
- Loading states
- Bundle size optimization
- Testing infrastructure (unit tests)

### Do Later (Medium Impact, Various Effort)
- Race-specific sparklines
- Mobile optimization
- Accessibility improvements
- Enhanced export options

### Maybe Someday (Low Priority or High Effort)
- API-based data loading
- Saved configurations
- User analytics
- Dark mode

---

## How to Use This Document

**Before starting new work:**
1. Check if feature is listed here
2. Review estimated effort and priority
3. Update status when complete
4. Add new ideas as they arise

**During team planning:**
- Use priority matrix to guide sprint planning
- Discuss questions section to align on long-term direction
- Re-prioritize based on user feedback

**After major releases:**
- Archive completed items
- Re-assess priorities based on learnings

---

**Status Legend**:
- ⏱️ = Estimated effort
- ✅ = Completed
- 🚧 = In progress
- 📋 = Planned for next sprint
- 💡 = Idea / Not yet scoped

