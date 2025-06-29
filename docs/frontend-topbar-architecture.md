# Frontend Topbar Architecture

## Overview

This document describes the unified topbar architecture implemented in the golf series frontend application. The architecture provides consistent navigation and header behavior across all player views while maintaining flexibility for per-view customization.

## Architecture Components

### Core Components

#### 1. PlayerPageLayout
**Location**: `src/components/layout/PlayerPageLayout.tsx`

The main layout wrapper that provides consistent page structure for all player views.

**Props**:
```typescript
interface PlayerPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  headerContent?: React.ReactNode;
  className?: string;
  seriesId?: number;
  seriesName?: string;
  showHamburgerMenu?: boolean;
  customActions?: React.ReactNode;
}
```

**Key Features**:
- Automatically includes CommonHeader with enhanced functionality
- Provides consistent page background and layout structure
- Passes navigation context to child components

#### 2. CommonHeader (Enhanced)
**Location**: `src/components/navigation/CommonHeader.tsx`

Enhanced header component that automatically includes hamburger menu and provides consistent topbar behavior.

**Props**:
```typescript
interface CommonHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  seriesId?: number;
  seriesName?: string;
  showHamburgerMenu?: boolean;
  customActions?: React.ReactNode;
}
```

**Key Features**:
- Automatically includes HamburgerMenu by default (`showHamburgerMenu: true`)
- TapScore logo integration
- Series link with trophy icon when seriesId is provided
- Flexible custom actions support
- Consistent styling with fairway background and light text

#### 3. HamburgerMenu (Enhanced)
**Location**: `src/components/navigation/HamburgerMenu.tsx`

Context-aware navigation menu with improved contrast and accessibility.

**Key Features**:
- **Improved Contrast**: Uses `text-scorecard` (light) icons instead of `text-gray-900` (dark)
- **Context Detection**: Automatically detects series/competition context from URL parameters
- **Smart Navigation**: Provides contextual links based on current page context
- **Two-Section Structure**:
  - **Contextual Links**: Series-specific navigation (View Overview, View Standings)
  - **General Links**: Global navigation (All Competitions, All Series, Home)

## Implementation Pattern

### Standard Usage Pattern

All player views should follow this consistent pattern:

```tsx
export default function MyPlayerView() {
  // Component logic here
  
  return (
    <PlayerPageLayout 
      title="Page Title"
      seriesId={seriesId}           // When available
      seriesName={seriesName}       // When available
      onBackClick={customHandler}   // When needed
      customActions={<Actions />}   // When needed
    >
      {/* Page content here */}
    </PlayerPageLayout>
  );
}
```

### Props Guidelines

#### Required Props
- `title`: Descriptive page title (e.g., "All Competitions", "Team Standings")

#### Context Props (when available)
- `seriesId`: Numeric series ID for context-aware navigation
- `seriesName`: Series name for display and navigation context

#### Navigation Props (when needed)
- `onBackClick`: Custom back navigation handler
- `showBackButton`: Control back button visibility (default: true)

#### Customization Props (when needed)
- `customActions`: Additional header actions/buttons
- `showHamburgerMenu`: Control hamburger menu visibility (default: true)
- `className`: Additional CSS classes for layout customization

## File Implementation Status

### ✅ Correctly Implemented Views

All player views have been successfully converted to use the unified architecture:

1. **Competitions.tsx** - Main competitions listing
2. **Series.tsx** - Golf series overview
3. **SeriesCompetitions.tsx** - Series-specific competitions
4. **SeriesDetail.tsx** - Individual series details
5. **SeriesDocumentDetail.tsx** - Series document viewer
6. **SeriesDocuments.tsx** - Series documents listing
7. **SeriesStandings.tsx** - Team standings for series
8. **CompetitionDetail.tsx** - Competition details and tabs
9. **CompetitionRound.tsx** - Live competition interface
10. **TeeTimeDetail.tsx** - Score entry interface

### Design Exceptions

- **Landing.tsx**: Intentionally uses custom hero layout without topbar
- **Admin views**: Use separate AdminLayout with different navigation patterns

## Benefits Achieved

### 1. Consistency
- **Unified UX**: All player views have identical navigation behavior
- **Visual Consistency**: Same header styling, logo placement, and navigation patterns
- **Predictable Interface**: Users always know where to find navigation options

### 2. Accessibility
- **Improved Contrast**: Light hamburger icons on dark backgrounds meet accessibility standards
- **Consistent Focus States**: Uniform focus indicators across all navigation elements
- **Screen Reader Support**: Proper ARIA labels and semantic structure

### 3. Maintainability
- **Single Source of Truth**: Navigation changes only need to be made in CommonHeader
- **DRY Principle**: Eliminates code duplication across views
- **Easy Updates**: New navigation features automatically available everywhere

### 4. Context Awareness
- **Smart Navigation**: HamburgerMenu automatically provides relevant links based on current context
- **Series Integration**: Automatic series context detection and navigation
- **Breadcrumb Logic**: Clear navigation hierarchy through series → competitions → details

## Technical Details

### Color System Integration

The architecture uses the custom golf-themed color palette:

```css
/* Header background */
background-color: var(--fairway); /* #1b4332 - dark green */

/* Light text and icons */
color: var(--scorecard); /* #f8f9fa - off-white */

/* Interactive elements */
hover:background-color: var(--turf); /* #2d6a4f - medium green */
```

### Responsive Design

- **Mobile-first**: All navigation elements work well on mobile devices
- **Touch-friendly**: Appropriately sized touch targets for mobile interaction
- **Adaptive Layout**: Header adjusts gracefully across different screen sizes

### Performance Considerations

- **Lazy Context Loading**: HamburgerMenu only loads series/competition data when needed
- **Minimal Re-renders**: Efficient props structure minimizes unnecessary updates
- **Optimized Bundle**: Shared components reduce overall bundle size

## Migration Guide

### Converting Legacy Views

To convert a view from direct CommonHeader usage to PlayerPageLayout:

1. **Update Import**:
   ```tsx
   // Before
   import { CommonHeader } from "../../components/navigation/CommonHeader";
   
   // After
   import { PlayerPageLayout } from "../../components/layout/PlayerPageLayout";
   ```

2. **Replace Wrapper Structure**:
   ```tsx
   // Before
   <div className="min-h-screen bg-scorecard">
     <CommonHeader title="Page Title" />
     {/* content */}
   </div>
   
   // After
   <PlayerPageLayout title="Page Title">
     {/* content */}
   </PlayerPageLayout>
   ```

3. **Move Props**:
   - Move `title` from CommonHeader to PlayerPageLayout
   - Add `seriesId` and `seriesName` when available
   - Convert custom header content to `customActions`

4. **Remove Explicit HamburgerMenu**:
   ```tsx
   // Before (in CommonHeader children)
   <HamburgerMenu />
   
   // After (automatic - remove this)
   // HamburgerMenu is now included automatically
   ```

## Future Enhancements

### Planned Improvements
1. **Breadcrumb Integration**: Automatic breadcrumb generation based on navigation context
2. **Search Integration**: Global search functionality in the header
3. **Notification Center**: Header-based notification system
4. **Theme Switching**: Support for light/dark theme toggle

### Extension Points
- **Custom Header Sections**: Support for view-specific header content
- **Dynamic Titles**: Real-time title updates based on data loading
- **Progress Indicators**: Header-based loading and progress states

## Troubleshooting

### Common Issues

1. **Missing Context**: If HamburgerMenu doesn't show series-specific links, ensure `seriesId` and `seriesName` are passed to PlayerPageLayout

2. **Layout Issues**: If page layout is broken, check that only one PlayerPageLayout is used per page

3. **Navigation Conflicts**: If back button doesn't work correctly, verify `onBackClick` handler or remove it to use default browser back

### Debug Tips

- Use React DevTools to inspect PlayerPageLayout props
- Check browser console for navigation-related errors
- Verify URL parameters are correctly parsed for context detection

## Related Documentation

- [Component Architecture Overview](./component-architecture.md)
- [Navigation Patterns](./navigation-patterns.md)
- [Design System](./design-system.md)
- [Mobile Responsiveness](./mobile-responsiveness.md)