# Day Rating

A point-based daily rating app that tracks your activities and generates statistics over time.

## Features

### Sets
- Create, rename, and delete activity sets
- Each set contains activities with hardcoded point rewards
- Activities support an optional bonus (extra points for more specific conditions)
- Drag-and-drop to reorder activities within a set
- Toggle sets as **Global** (visible to all users) or **Private** (owner only)

### Activity Checking
- Select a set to view its activities
- Click activities to check them (crossed out, points highlighted)
- Bonuses appear as sub-items only when their parent activity is checked
- Optional text note on each submission
- Submit records the day's score to history

### Dashboard
- **Daily Progress Ring**: circular indicator showing today's completion percentage
- **Weekly Overview**: bar chart of current week's daily scores
- **Achievements**: unlockable badges for milestones (streaks, score records, totals)
- **Streaks**: current streak, longest streak, and today's status

### Multi-User Support
- User selector in header to switch between users
- Each user has private sets, submissions, and rivals
- Global sets visible to all users
- Global leaderboard showing all users

### Statistics
- **Activity Heatmap**: GitHub-style contribution graph (16 weeks)
- **Activity Days**: bar chart showing which of the last 30 days had submissions
- **Development Chart**: hide/show line graph with 7d/30d/all-time toggle
- **Set Cards**: all sets listed, sorted by submission count
- **Set Detail Page**:
  - Summary stats: average, min, max, median points
  - Development line chart (rolling avg/min/max/med across submissions)
  - Points per submission bar chart
  - Daily usage graph (shown when submissions > 2)
  - Full submission history with notes

### Leaderboard
- Rankings by points (Today/7d/30d/all-time), with progress bars and streak display
- Rival system: create rivals with personality traits and anomaly chances
- Rivals auto-generate daily scores based on their personality
- Click a rival to see a side-by-side comparison (per-set breakdown, activity gaps, win/loss/tie record)
- **Points Over Time** chart: hide/show line graph with one line per user and each rival

### Set Locking
- Lock (deactivate) sets in Settings to hide them from the set selection menu
- Locked sets still appear in Settings and Statistics

### Backup
- Export all data to a JSON file
- Import from a JSON file to restore

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Recharts (charts)
- date-fns (date utilities)
- Express 5 (API server)
- Data persisted in `data.json` via REST API

## Running

```bash
npm run dev      # Vite + Express dev servers
npm run start    # Build and run production server on port 3001
```

## Data

All data is stored in `data.json` at the project root. Export/import available in Settings.

# Psychology

Its a point rewarding day rating virtual competition with analysis and insights and versatility.
You define your own set of activities with possible extensions and complete them for a point reward.

so its fun and person feels like consistency is necessary - its a competition against algorythms,
giving you a feeling of actually falling behind and forcing you to focus more

and because every activity has precisely crafted reward,
you feel like missing out on it will give you disadvantage against others
and that its necessary to do it even if you dont want to
