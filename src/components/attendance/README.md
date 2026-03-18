# Attendance Module Components

This directory contains a refactored and improved attendance module with better UI design and modular architecture.

## 📁 File Structure

```
src/components/attendance/
├── types.ts                      # TypeScript type definitions
├── utils.ts                      # Utility functions and helpers
├── UIComponents.tsx              # Reusable UI components
├── CalendarGrid.tsx              # Calendar grid component
├── HeaderBar.tsx                 # Header with navigation and user selection
├── ShiftSettingsPanel.tsx        # Shift configuration panel
├── Drawer.tsx                    # Modal drawer component
├── DayDetailsDrawerContent.tsx   # Content for day details drawer
├── index.ts                      # Export barrel
└── README.md                     # This file
```

## 🎨 UI Improvements

### Enhanced Design Elements
- **Modern gradient backgrounds** with subtle animations
- **Improved color scheme** with better contrast and accessibility
- **Enhanced hover states** and micro-interactions
- **Better visual hierarchy** with proper spacing and typography
- **Responsive design** that works on all screen sizes

### Component Enhancements
- **Status Pills** with icons and better color coding
- **Stat Cards** with gradients and hover effects
- **Progress Bars** with smooth animations
- **Calendar Grid** with improved day cells and better visual feedback
- **Drawer** with backdrop blur and smooth transitions

## 🚀 Features

### Core Functionality
- **Multi-user view** - Switch between individual users and all users
- **Calendar navigation** - Month navigation with today button
- **Attendance tracking** - Present, absent, late, holiday, week-off status
- **Real-time updates** - Settings changes reflect immediately
- **Day details** - Detailed view for any calendar day

### Configuration
- **Shift settings** - Configure work hours and grace periods
- **Week off days** - Select multiple week-off days
- **Holiday management** - Support for holidays
- **Late calculation** - Automatic late detection with grace period

## 📦 Usage

### Import the main module
```tsx
import AttendanceModule from '../pages/AttendanceModule';
```

### Import individual components
```tsx
import { 
  CalendarGrid, 
  HeaderBar, 
  ShiftSettingsPanel,
  StatusPill,
  StatCard 
} from '../components/attendance';
```

### Import types
```tsx
import type { 
  User, 
  InPunch, 
  Holiday, 
  Status, 
  DayAgg 
} from '../components/attendance';
```

## 🎯 Key Components

### CalendarGrid
- Displays monthly calendar with attendance data
- Supports both single-user and all-users views
- Interactive day cells with hover effects
- Color-coded status indicators

### HeaderBar
- User selection dropdown
- Month navigation controls
- Shift information display
- Current time indicator

### ShiftSettingsPanel
- Shift name configuration
- Working hours settings
- Grace period configuration
- Week-off day selector
- Rules preview

### StatusPill
- Color-coded status indicators
- Icons for different status types
- Hover effects and transitions

## 🔧 Customization

### Colors
The component uses a zinc-based color scheme that can be easily customized by modifying the Tailwind classes in the components.

### Data Sources
Currently uses mock data, but can be easily connected to:
- REST APIs
- GraphQL endpoints
- Real-time WebSocket connections

### Styling
Built with Tailwind CSS for easy customization:
- Modify spacing, colors, and typography
- Add custom animations and transitions
- Implement dark mode support

## 📱 Responsive Design

- **Mobile**: Single column layout with optimized touch targets
- **Tablet**: Two-column layout with better spacing
- **Desktop**: Full multi-column layout with optimal use of screen space

## 🔄 Migration from Original

The new module provides:
1. **Better organization** - Separated concerns into logical files
2. **Improved UI** - Modern design with better UX
3. **Type safety** - Comprehensive TypeScript types
4. **Reusability** - Modular components for easy reuse
5. **Maintainability** - Clear separation of logic and presentation
6. **Performance** - Optimized re-renders and memoization

To migrate from the original `AttenenceModule.tsx`:
1. Replace imports with the new modular imports
2. Update any custom styling to match the new design
3. Test all functionality to ensure compatibility
4. Update any API integrations to use the new data structures
