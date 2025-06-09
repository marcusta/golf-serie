# Participant Assignment - Quick Start Guide

## Getting Started

This guide will walk you through using the Participant Assignment interface to organize golf competition participants into tee times.

## Prerequisites

Before you can assign participants, you need:

1. ✅ **Teams selected** for the competition
2. ✅ **Participant types defined** (e.g., "Singel 1", "Singel 2", "Bästboll 1")
3. ✅ **Tee times created** for the competition day

## Step-by-Step Process

### Step 1: Generate All Participants

1. Click the **"Generate All Participants"** button
2. This creates all combinations of your selected teams × participant types
3. Example: 4 teams × 3 types = 12 participants total

### Step 2: Assign Participants to Tee Times

You have two ways to assign participants:

#### Method A: Drag and Drop
1. **Drag** a participant from the left panel (Available Participants)
2. **Drop** it onto a tee time in the right panel
3. The participant moves from "available" to "assigned"

#### Method B: Click to Assign
1. Click **"+ Add participant"** button in any tee time
2. Select a participant from the popup dialog
3. Click **"Assign"** to confirm

### Step 3: Manage Assignments

- **Remove assignment**: Click the **×** button next to any assigned participant
- **View progress**: Check the statistics at the top (Total, Assigned, Remaining)
- **Track status**: See which participants are assigned in the left panel

## Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Statistics: 12 Total | 8 Assigned | 4 Remaining         │
├─────────────────┬───────────────────────────────────────────┤
│ 📋 Available    │ 🕐 Tee Times with Assignments             │
│ Participants    │                                           │
│                 │ 🕐 13:00 (2 participants)                 │
│ Linköping 1     │   ✓ Linköping 1 - Singel 1  [×]          │
│   □ Singel 1    │   ✓ N&S GK 1 - Singel 1     [×]          │
│   □ Singel 2    │   [+ Add participant]                     │
│   ☑ Bästboll 1  │                                           │
│                 │ 🕐 13:10 (1 participant)                  │
│ N&S GK 1        │   ✓ Linköping 1 - Bästboll 1 [×]         │
│   □ Singel 1    │   [+ Add participant]                     │
│   □ Singel 2    │                                           │
│   □ Bästboll 1  │ 🕐 13:20 (0 participants)                 │
│                 │   [+ Add participant]                     │
└─────────────────┴───────────────────────────────────────────┘
```

## Tips & Best Practices

### Efficient Assignment
- **Start with popular types**: Assign common participant types first
- **Balance tee times**: Try to distribute participants evenly across tee times
- **Use drag and drop**: Faster for multiple assignments

### Visual Cues
- **Green checkmark** = Participant is assigned
- **Empty checkbox** = Participant available to assign
- **Green background** = Assigned participant in tee time
- **Blue highlight** = Valid drop zone during drag

### Error Prevention
- You cannot assign the same participant twice
- Already assigned participants are grayed out and cannot be dragged
- The system prevents invalid assignments automatically

## Common Workflows

### Scenario 1: Quick Assignment
```
1. Generate participants → 2. Drag and drop all → 3. Done!
```

### Scenario 2: Careful Planning
```
1. Generate participants → 2. Use click-to-assign → 3. Review statistics → 4. Adjust as needed
```

### Scenario 3: Partial Assignment
```
1. Generate participants → 2. Assign some now → 3. Come back later → 4. Continue from where you left off
```

## Troubleshooting

**Q: I can't drag a participant**
- ✅ Check if it's already assigned (look for green checkmark)

**Q: The drop didn't work**
- ✅ Make sure you're dropping in the tee time area (watch for blue highlight)

**Q: Participants didn't generate**
- ✅ Ensure you have teams selected and participant types defined

**Q: Assignment failed**
- ✅ Check your internet connection and try again

## Keyboard Shortcuts

- **Tab**: Navigate between interactive elements
- **Enter**: Activate buttons and selections
- **Escape**: Close dialogs and cancel operations

## Mobile Usage

On mobile devices:
- Drag and drop works with touch gestures
- Use the "Add participant" buttons for easier assignment
- Panels stack vertically for better viewing

## Next Steps

After assigning all participants:
1. Review the final assignments
2. Save/export if needed
3. Proceed with your golf competition setup

## Need Help?

- Check the statistics dashboard for progress
- Use the demo component to practice
- Refer to the full documentation for technical details

---

*This interface is designed to be intuitive - if something feels natural to try, it probably works!* 