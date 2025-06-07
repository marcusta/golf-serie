# Series API Client

This module provides React hooks for managing golf series using TanStack Query.

## Types

### Core Types
- `Series` - Main series interface with id, name, description, banner_image_url, is_public, timestamps
- `CreateSeriesDto` - Data for creating a new series
- `UpdateSeriesDto` - Data for updating an existing series
- `SeriesStandings` - Complete standings data for a series
- `SeriesTeamStanding` - Individual team standing within a series

## Query Hooks

### `useSeries()`
Fetches all series (admin view).

### `usePublicSeries()`
Fetches only public series (player view).

### `useSingleSeries(id: number)`
Fetches a single series by ID.

### `useSeriesStandings(id: number)`
Fetches complete standings for a series, including:
- Team rankings with total points
- Individual competition results per team
- Points breakdown

### `useSeriesCompetitions(id: number)`
Fetches all competitions in a series.

### `useSeriesTeams(id: number)`
Fetches all teams assigned to a series.

## Mutation Hooks

### `useCreateSeries()`
Creates a new series. Automatically invalidates series queries.

### `useUpdateSeries()`
Updates an existing series. Invalidates relevant queries.

### `useDeleteSeries()`
Deletes a series. Invalidates series queries.

## Usage Example

```tsx
import { 
  useSeries, 
  useCreateSeries, 
  useSeriesStandings 
} from '@/api/series';

function SeriesManager() {
  const { data: series } = useSeries();
  const { data: standings } = useSeriesStandings(1);
  const createSeries = useCreateSeries();

  const handleCreate = () => {
    createSeries.mutate({
      name: "Summer Championship",
      description: "Annual summer golf series",
      is_public: true
    });
  };

  return (
    <div>
      <h1>Series: {series?.length || 0}</h1>
      <button onClick={handleCreate}>Create Series</button>
    </div>
  );
}
```

## Related Updates

### Teams API
- Updated `Team` interface to include optional `series_id`
- Updated `useCreateTeam()` and `useUpdateTeam()` to handle series assignment
- Maintains backward compatibility

### Competitions API  
- Updated `Competition` interface to include optional `series_id`
- Added DTOs for future competition management features

## Notes
- All hooks follow TanStack Query patterns
- Automatic query invalidation on mutations
- Proper TypeScript types throughout
- Backward compatible with existing team functionality
