# URL State Management - HIV Age Projections

## Overview
The HIV Age Projections app now supports **shareable URLs** that preserve all user selections. This means you can:
- **Share specific configurations** with colleagues via URL
- **Bookmark** interesting patterns
- **Use browser back/forward** naturally
- **Refresh the page** without losing your selections

## URL Parameter Format

### Base URL
```
https://your-domain.com/hiv-age-projections?[parameters]
```

### Available Parameters

| Parameter | Values | Description | Example |
|-----------|--------|-------------|---------|
| `view` | `state`, `race`, `sex` | Active tab/view mode | `view=race` |
| `states` | Comma-separated state codes | Selected states (use 2-letter codes or `total`) | `states=CA,TX,NY` |
| `races` | `black`, `hispanic`, `other` | Selected race categories (race view only) | `races=black,hispanic` |
| `normalized` | `true` | Display mode (omit for case counts, add for proportional %) | `normalized=true` |
| `years` | `YYYY-YYYY` | Year range (omit for default 2025-2040) | `years=2025-2035` |

### Example URLs

#### 1. Default View (By State)
```
/hiv-age-projections?view=state&states=CA,TX
```
Shows California and Texas in the "By State" tab.

#### 2. By Race View with Proportional Display
```
/hiv-age-projections?view=race&states=CA,FL,NY&races=black,hispanic&normalized=true
```
Shows California, Florida, and New York with Black and Hispanic breakdowns, displayed as percentages.

#### 3. Custom Year Range
```
/hiv-age-projections?view=state&states=total&years=2030-2040
```
Shows only the "Total" aggregate, focusing on 2030-2040 projections.

#### 4. Multi-State Race Comparison
```
/hiv-age-projections?view=race&states=CA,TX,GA,FL&races=black,hispanic,other
```
Shows 4 states × 3 races = 12 charts comparing all racial groups.

## Testing the Implementation

### Test 1: Tab Switching Preserves State
1. Start at default view (`By State`, CA + TX)
2. Change year range to 2030-2040
3. Toggle to proportional display
4. Switch to `By Race` tab
5. **Expected**: Year range and display mode preserved, URL updates
6. Switch back to `By State` tab
7. **Expected**: State selections still intact

### Test 2: URL Sharing
1. Configure a specific view (e.g., race view with multiple states)
2. Copy the URL from address bar
3. Open in new browser tab/window
4. **Expected**: Exact same configuration loads

### Test 3: Browser Back/Forward
1. Start with default view
2. Change states to CA, TX, NY
3. Click browser back button
4. **Expected**: Returns to CA, TX
5. Click browser forward button
6. **Expected**: Returns to CA, TX, NY

### Test 4: Refresh Persistence
1. Configure any view with custom selections
2. Refresh the page (Cmd/Ctrl + R)
3. **Expected**: Configuration persists after reload

### Test 5: Invalid URL Handling
1. Try URL with invalid state code: `?states=ZZ,XX`
2. **Expected**: Falls back to default (CA, TX)
3. Try URL with invalid race: `?races=invalid`
4. **Expected**: Falls back to all races

## State Mapping

### State Codes (24 states + Total)
```
AL - Alabama         AR - Arkansas        AZ - Arizona
CA - California      CO - Colorado        FL - Florida
GA - Georgia         IL - Illinois        KY - Kentucky
LA - Louisiana       MD - Maryland        MI - Michigan
MO - Missouri        MS - Mississippi     NC - North Carolina
NY - New York        OH - Ohio            OK - Oklahoma
SC - South Carolina  TN - Tennessee       TX - Texas
VA - Virginia        WA - Washington      WI - Wisconsin
total - Total (all states aggregate)
```

### Race Categories
- `black` - Black
- `hispanic` - Hispanic
- `other` - Other (includes White, Asian, Native American, multiracial)

## Implementation Details

### Key Components
- **URL Parsing**: On mount, reads `searchParams` and initializes React state
- **URL Updating**: `useEffect` watches state changes and updates URL via `router.replace()`
- **Validation**: Invalid parameters fall back to sensible defaults
- **Suspense Boundary**: Required by Next.js App Router for `useSearchParams()`

### Files Modified
- `src/app/hiv-age-projections/page.tsx` - Main URL state management logic
- `src/data/hiv-age-projections.ts` - Centralized state name↔code utilities
- `src/components/ByRaceView.tsx` - Updated to accept props instead of local state

### Performance Considerations
- URL updates use `router.replace()` with `scroll: false` to avoid page jumps
- State changes are debounced by React's batching (no manual throttling needed)
- URL is only updated after initial parse (`isInitialized` flag prevents loops)

## Future Enhancements

### Potential Additions
1. **Short URL generation**: API endpoint to create short links (e.g., `/s/abc123`)
2. **Saved configurations**: User accounts with saved favorite views
3. **URL parameter compression**: Base64-encode complex configurations
4. **Social sharing**: Generate preview images for URLs shared on Slack/Teams

### Known Limitations
- URLs can get long with many states selected (~100-150 characters)
- No validation of impossible combinations (e.g., requesting 100 states)
- State changes during initial URL parse are ignored

## Troubleshooting

### URL doesn't update when changing selections
- **Check**: Dev server running? (URL state only works in client-side mode)
- **Fix**: Restart dev server

### Configuration doesn't restore from URL
- **Check**: Are parameters spelled correctly? (case-sensitive)
- **Check**: Are state codes valid 2-letter abbreviations?
- **Fix**: Use examples above as template

### Build fails with "useSearchParams" error
- **Cause**: Missing Suspense boundary around component using `useSearchParams()`
- **Fix**: Already wrapped in `<Suspense>` - should not occur

## Questions or Issues?
Contact: [Your team contact info]

---

**Implementation Date**: October 20, 2025
**Last Updated**: October 20, 2025
**Status**: ✅ Production Ready
