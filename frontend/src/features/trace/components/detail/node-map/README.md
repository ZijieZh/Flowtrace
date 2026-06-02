# Node Map Components

## Data Structure

```
.agent/
├── agent.json              # Tools with active: true/false
│   └── tools: { "google": { name: "Google", active: true } }
└── .runs/{tool_id}/        # Execution history
    └── 001.json            # { status, started_at, completed_at }
```

## How to Determine States

### Current Step
**= Step owning the tool with the latest `started_at` timestamp**

```
.runs/
├── google/001.json     → started_at: "2024-01-01 10:00"
├── linkedin/001.json   → started_at: "2024-01-01 10:05"  ← LATEST
└── indeed/001.json     → started_at: "2024-01-01 09:00"

linkedin belongs to step "s2" → step "s2" is CURRENT
```

### Step Status Logic

| Status | Condition |
|--------|-----------|
| `waiting_for_input` | Current step + NO tool has `active: true` |
| `ready` | Current step + at least one tool has `active: true` |
| `running` | Current step + WebSocket shows live execution |
| `paused` | Current step + execution paused (needs user review) |
| `completed` | Not current + has runs with `status: "completed"` |
| `error` | Not current + has runs with `status: "error"` |
| `default` | Not current + no runs yet |

## JobCard Structure

```
Default (not current):
┌──────────────────────┬─────┐
│ [▶] Title overflow...│ [📁]│← if hasOutputs
│ Description...       │     │
│ ─────────────────────│     │
│ 🔧 Tools   📄 Instr  │     │  ← collapsed
└──────────────────────┴─────┘

Current (with badge):
┌─────────────────────────────────────────┐
│  ✓ Completed   ← Badge (only if current)│
│  ┌──────────────────────┬─────┐         │
│  │ [▶] Title overflow...│ [📁]│         │
│  │ Description...       │     │         │
│  │ ─────────────────────│     │         │
│  │ 🔧 Tools   📄 Instr  │     │         │
│  └──────────────────────┴─────┘         │
└─────────────────────────────────────────┘

Current + Paused (auto-expand):
┌─────────────────────────────────────────┐
│  ⏸ Paused      ← Badge                  │
│  ┌──────────────────────┬─────┐         │
│  │ [⏸] Title...         │ [📁]│         │
│  │ Description...       │     │         │
│  │ ─────────────────────│     │         │
│  │ 🔧 Tools   📄 Instr  │     │         │
│  │ ┌──────────────────┐ │     │         │
│  │ │ ✓ Google      🗑  │ │     │ ← active: true
│  │ │ ✓ LinkedIn       │ │     │ ← active: true
│  │ │ □ Glassdoor      │ │     │ ← active: false
│  │ │ □ Indeed         │ │     │ ← active: false
│  │ │ 🔍 Explore more  │ │     │ ← triggers chat
│  │ └──────────────────┘ │     │         │
│  └──────────────────────┴─────┘         │
└─────────────────────────────────────────┘
```

## Rules

| Element | Behavior |
|---------|----------|
| Status badge | **Only on current step** (latest run timestamp) |
| Auto-expand | **Only when paused** (current + paused) |
| Long title | **Overflow ellipsis** (no wrap) |
| Outputs button | Show when `hasOutputs=true` |
| Outputs hover | "Step Files" tooltip |
| Tool checkbox | Interactive, saves to `active` in agent.json |
| "Explore more" | Triggers chat quote for step |

## Status Badge Colors

| Status | Badge BG | Badge Text | Card Border | Icon BG |
|--------|----------|------------|-------------|---------|
| `default` | - | - | slate-300 | transparent |
| `waiting_for_input` | amber-200 | yellow-800 | amber-300 | amber-100 |
| `ready` | blue-100 | blue-800 | blue-300 | blue-100 |
| `running` | blue-100 | blue-800 | blue-300 | blue-100 |
| `paused` | yellow-200 | yellow-800 | amber-300 | amber-100 |
| `completed` | emerald-100 | emerald-800 | emerald-500 | transparent |
| `error` | red-100 | red-800 | red-300 | red-100 |

## Layout Constants

| Element | Value |
|---------|-------|
| Card width | 210px |
| Card min height | 112px |
| Card padding | 12px |
| Card border radius | 8px |
| Badge height | 26px |
| Badge border radius | 12px (pill) |
| Badge to card gap | 4px |
| Outputs column width | 30px |
| Arrow width | 60px |
| Group gap | 74px |

## Arrow Logic

| From → To | Arrow Type |
|-----------|------------|
| Same row | Horizontal → |
| Different row | L-shaped ↓←↓ |

## Figma Node Variants

### 1. Default Card (1583-41407)
- No badge
- Card: bg slate-100, border slate-300
- Icon: Bot icon, no background, 24x24 container with 4px padding
- Tools section: collapsed (just labels)

### 2. Running (1583-72491)
- Badge: "Running" - bg blue-100, text blue-800
- Card: bg white, border blue-300
- Icon: Play icon, bg blue-100, border blue-200, 24x24 with 6px padding
- Tools section: collapsed

### 3. Completed + Outputs (1583-72525)
- Badge: "Completed" - bg emerald-100, text emerald-800
- Card: bg white, border emerald-500
- Icon: Bot icon, no background
- Outputs button: bg emerald-100, border emerald-500, icon emerald-700
- Tools section: collapsed

### 4. Paused + Auto-Expand (1583-72569)
- Badge: "Paused" - bg yellow-200, text yellow-800
- Card: bg white, border amber-300
- Icon: Pause icon, bg amber-100, border amber-200
- Tools section: **expanded**
  - Methods label: bg slate-200 (highlighted)
  - Tool items: 8px gap between items
  - Checked: bg emerald-700, white checkmark, 12x12, rounded-[2px]
  - Unchecked: border slate-400, 12x12, rounded-[2px]
  - Trash icon: opacity-0 default, shows on hover
  - "Add Method" → "Explore more": text blue-600, plus icon 16x16

### 5. Waiting for User Input (1583-72638)
- Badge: "Waiting for User Input" - bg amber-200, text yellow-800
- Card: bg white, border amber-300
- Icon: Clock icon, bg amber-100, border amber-200
- Tools section: **expanded**, all unchecked
- Annotation: "once user add or select method → changes to ready to run"

### 6. Ready to Run (1583-72687)
- Badge: "Ready To Run" - bg blue-100, text blue-800
- Card: bg white, border blue-300
- Icon: Play icon, bg blue-100, border blue-200
- Tools section: **expanded**, some checked

## Tool Item Structure

```
┌─────────────────────────────────────┐
│ [□/✓] Tool Name              [🗑]   │
│  12px  10px text slate-900   12px  │
│        gap-8px               hover │
└─────────────────────────────────────┘

Checkbox:
- Unchecked: 12x12, border slate-400, rounded-[2px], transparent bg
- Checked: 12x12, bg emerald-700, rounded-[2px], white checkmark 8x8

"Explore more methods" button:
- Plus icon: 16x16, stroke blue-600
- Text: 10px, text blue-600
- gap-6px between icon and text
```
