# DemographicView - Reusable Pattern for Demographic Analysis

## Purpose

Generic component for displaying demographic breakdowns across any dimension (race, sex, age group, income level, etc.). Created to eliminate code duplication and provide a consistent UX pattern for epidemiological analysis tools.

**Problem Solved:** ByRaceView and BySexView were 98% identical (415 lines total, ~400 duplicated). Any bug fix or feature addition required changing multiple files.

**Solution:** Single reusable component that handles any demographic dimension through configuration.

---

## Quick Start

### Example: Creating a "By Race" View

```typescript
// src/components/ByRaceView.tsx
'use client';

import DemographicView, { DemographicDataItem } from './DemographicView';
import { getMultiStateRaceData, RACE_CATEGORIES, RaceCategory } from '@/data/hiv-age-projections-race';

export default function ByRaceView({
  selectedStateNames,
  onStateChange,
  selectedRaces,
  onRacesChange,
  normalized,
  onNormalizedChange,
  yearRange,
  onYearRangeChange,
}: ByRaceViewProps) {

  // Adapter: Convert your data format to DemographicDataItem[]
  const getRaceData = (stateCodes: string[], categories: RaceCategory[]): DemographicDataItem[] => {
    const raceData = getMultiStateRaceData(stateCodes, categories);

    return raceData.map(item => ({
      state_code: item.state_code,
      state_name: item.state_name,
      category: item.race,              // Your category key (e.g., 'black')
      category_label: item.race_label,  // Display label (e.g., 'Black')
      data: item.data                   // Time series data
    }));
  };

  return (
    <DemographicView
      selectedStateNames={selectedStateNames}
      onStateChange={onStateChange}
      selectedCategories={selectedRaces}
      onCategoriesChange={onRacesChange}
      normalized={normalized}
      onNormalizedChange={onNormalizedChange}
      yearRange={yearRange}
      onYearRangeChange={onYearRangeChange}

      // Configuration: what makes this view unique
      categoryLabel="Races"
      categorySingular="race"
      categoryOptions={RACE_CATEGORIES}
      categoryTooltips={{
        other: 'Includes White, Asian, Native American, and multiracial groups'
      }}
      getDataFn={getRaceData}
    />
  );
}
```

**That's it!** 65 lines vs 208 lines of duplicated code.

---

## Data Format Required

Your data loader must return `DemographicDataItem[]`:

```typescript
interface DemographicDataItem {
  state_code: string;        // e.g., 'CA'
  state_name: string;        // e.g., 'California'
  category: string;          // e.g., 'black', 'msm', 'age_65+'
  category_label: string;    // e.g., 'Black', 'MSM', '65+'
  data: Array<{
    year: number;
    age_cohorts: {
      '13-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55+': number;
    };
  }>;
}
```

---

## Configuration Options

### Required Props

| Prop | Type | Description | Example |
|------|------|-------------|---------|
| `categoryLabel` | `string` | Plural label for UI | `"Races"`, `"Sex Categories"` |
| `categorySingular` | `string` | Singular label for messages | `"race"`, `"category"` |
| `categoryOptions` | `Record<T, string>` | Category keys → display labels | `{ black: 'Black', hispanic: 'Hispanic' }` |
| `getDataFn` | `function` | Data loader function | See example above |

### Optional Props

| Prop | Type | Description | Example |
|------|------|-------------|---------|
| `categoryTooltips` | `Partial<Record<T, string>>` | Tooltips for specific categories | `{ other: 'Includes White, Asian...' }` |
| `emptyMessage` | `string` | Custom empty state message | `"Select states and races to begin"` |

### Standard Props (Passed Through)

All the usual state management props:
- `selectedStateNames`, `onStateChange`
- `selectedCategories`, `onCategoriesChange`
- `normalized`, `onNormalizedChange`
- `yearRange`, `onYearRangeChange`

---

## What You Get (Built-in Features)

✅ **State Selection** - Multi-select with sparkline previews
✅ **Timeline Controls** - Year range slider
✅ **Display Mode Toggle** - Absolute counts ↔ Proportions
✅ **Export to PNG** - With visual feedback (exporting/success/error)
✅ **Category Selection** - Toggle buttons for demographic categories
✅ **Auto-truncate Logic** - Prevents exceeding 25-chart limit
✅ **Warning Banners** - When approaching chart limits
✅ **Responsive Grid** - Adapts to screen size
✅ **Staggered Rendering** - Performance optimization for many charts
✅ **Error Handling** - Graceful degradation if data fails to load

---

## Adding a New Demographic Dimension

**Example:** Add "By Income Level" tab

### Step 1: Create Data Loader (20-30 min)

```typescript
// src/data/hiv-age-projections-income.ts
export const INCOME_CATEGORIES = {
  low: 'Low Income (<$25k)',
  middle: 'Middle Income ($25k-$75k)',
  high: 'High Income (>$75k)'
} as const;

export type IncomeCategory = keyof typeof INCOME_CATEGORIES;

export function getMultiStateIncomeData(
  stateCodes: string[],
  incomeCategories: IncomeCategory[]
): MultiStateIncomeData[] {
  // Your data loading logic here
  // Return data matching DemographicDataItem[] format
}
```

### Step 2: Create View Component (5 min)

```typescript
// src/components/ByIncomeView.tsx
import DemographicView, { DemographicDataItem } from './DemographicView';
import { getMultiStateIncomeData, INCOME_CATEGORIES, IncomeCategory } from '@/data/hiv-age-projections-income';

export default function ByIncomeView({ /* props */ }) {
  const getIncomeData = (stateCodes: string[], categories: IncomeCategory[]) => {
    const data = getMultiStateIncomeData(stateCodes, categories);
    return data.map(item => ({
      state_code: item.state_code,
      state_name: item.state_name,
      category: item.income_level,
      category_label: item.income_label,
      data: item.data
    }));
  };

  return (
    <DemographicView
      {...props}
      categoryLabel="Income Levels"
      categorySingular="income level"
      categoryOptions={INCOME_CATEGORIES}
      getDataFn={getIncomeData}
    />
  );
}
```

### Step 3: Add Tab to Page (5 min)

```typescript
// src/app/hiv-age-projections/page.tsx
import ByIncomeView from '@/components/ByIncomeView';

// Add to ViewMode type
type ViewMode = 'state' | 'race' | 'sex' | 'income';

// Add state
const [selectedIncome, setSelectedIncome] = useState<IncomeCategory[]>(['low', 'middle', 'high']);

// Add tab button + view rendering
```

**Total Time:** ~30-40 minutes for a complete new dimension!

---

## Architecture Decisions

### Why This Pattern?

**Before:**
- 208 lines for ByRaceView
- 207 lines for BySexView
- 98% code duplication
- Bug fixes required changing 2+ files
- Adding new dimension = 200+ lines of copied code

**After:**
- 280 lines for DemographicView (reusable!)
- 65 lines for ByRaceView (adapter only)
- 65 lines for BySexView (adapter only)
- 0% duplication
- Bug fixes in one place
- Adding new dimension = ~65 lines

**Net Result:**
- Eliminated 360+ lines of duplication
- 69% code reduction in view components
- Scalable pattern for future apps

### Trade-offs

**Pros:**
- Single source of truth for demographic view logic
- Consistent UX across all demographic dimensions
- Easy to add features (they apply to all views)
- Type-safe through generics

**Cons:**
- Slightly more complex for first-time readers (generic component)
- Requires data adapter layer
- Less flexibility if views need to diverge significantly

**Verdict:** For epidemiological analysis apps with multiple demographic facets, this is the right pattern. The consistency and maintainability gains far outweigh the slight abstraction cost.

---

## Common Customizations

### Adding a New Built-in Feature

Want to add a feature to all demographic views? Add it to `DemographicView.tsx` once:

```typescript
// Example: Add "Download CSV" button
<button onClick={handleCSVExport}>
  Download CSV
</button>
```

Now all views (Race, Sex, Income, etc.) get CSV export automatically.

### View-Specific Customization

Need something unique for one view? Add it in the wrapper component:

```typescript
// ByRaceView.tsx
export default function ByRaceView({ /* props */ }) {
  return (
    <>
      {/* Custom header for race view only */}
      <div className="bg-blue-50 p-4 mb-4">
        <p>Race data based on CDC classifications</p>
      </div>

      <DemographicView {...props} />
    </>
  );
}
```

---

## Testing Checklist

When using this component:

- [ ] All category buttons work (toggle on/off)
- [ ] Cannot deselect last category
- [ ] State selector enforces max states based on selected categories
- [ ] Auto-truncate works when switching views
- [ ] Export PNG shows: idle → exporting → success states
- [ ] Tooltips appear (if configured)
- [ ] Charts render correctly
- [ ] URL state management preserves configuration
- [ ] Warning banner appears when >20 charts
- [ ] Empty state shows when no data available

---

## Real-World Usage

### Current Implementations

1. **ByRaceView** - Black, Hispanic, Other racial categories
2. **BySexView** - MSM vs Non-MSM categories

### Future Potential Uses

- **By Age Group** - Pediatric, Adult, Elderly
- **By Geography** - Urban, Suburban, Rural
- **By Insurance Status** - Insured, Uninsured, Medicare, Medicaid
- **By Viral Load** - Suppressed, Unsuppressed, Unknown
- **By Comorbidity** - None, 1-2, 3+ conditions

Any demographic dimension fits this pattern!

---

## Performance Considerations

**Built-in Optimizations:**
- `useMemo` for data transformations
- Staggered chart rendering (6 at a time)
- React.memo on child components
- Efficient re-render prevention

**Bundle Size:** ~1KB added for the generic component vs duplicated code.

**Max Scale:** Tested with 25 charts × 3 categories = 75 virtual charts (auto-truncated to 25).

---

## Known Limitations

1. **Max 25 charts** - By design, enforced by auto-truncate
2. **Age cohorts fixed** - Assumes 5 age groups (13-24, 25-34, 35-44, 45-54, 55+)
3. **Time series only** - Designed for year-over-year projections
4. **Single chart type** - Stacked bar charts (could be extended)

These are acceptable for HIV age projection analysis. For other use cases, consider extending the pattern.

---

## Related Documentation

- `URL_STATE_MANAGEMENT.md` - How shareable links work
- `FUTURE_ENHANCEMENTS.md` - Planned improvements
- Data loaders: `src/data/hiv-age-projections-*.ts`

---

## Questions?

This pattern was created to solve real code duplication in the JHEEM Portal HIV Age Projections app. It's opinionated but proven to work well for demographic analysis tools.

**When to use this pattern:**
- Multiple demographic facets to display
- Consistent UX across views is important
- Team wants to reduce maintenance burden

**When NOT to use:**
- Views are fundamentally different (not just different categories)
- You only have 1-2 demographic dimensions
- Heavy customization per view is needed

---

**Created:** October 22, 2025
**Last Updated:** October 22, 2025
**Pattern Status:** ✅ Production-tested, Vercel-deployed
