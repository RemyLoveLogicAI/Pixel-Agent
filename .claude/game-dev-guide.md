# Pixel-Agent — Game/Visualization Layer Guide

The agents table includes `deskX`, `deskY`, and `spriteKey` fields, indicating a pixel-art office visualization where agents occupy desks in a 2D grid.

---

## Architecture Recommendation

**Platform**: Web browser (HTML5 Canvas or WebGL)
**Dimension**: 2D isometric or top-down pixel art
**Framework options** (ranked):
1. **PixiJS** — Best for sprite-based rendering, handles hundreds of agents efficiently
2. **Phaser 3** — Full game framework if interaction complexity grows
3. **Raw Canvas API** — Simplest if visualization is view-only

## Game Loop Pattern

```
INPUT  → Click agent desk, hover for status tooltip
UPDATE → Poll SSE stream for agent state changes (idle → thinking → executing)
RENDER → Update sprite animations based on status
```

**No physics needed** — agents sit at fixed desk positions. Use event-driven updates, not a continuous game loop.

## Sprite System

| Agent Status | Sprite Animation |
|-------------|-----------------|
| `idle` | Static sitting pose |
| `thinking` | Thought bubble / typing animation |
| `executing` | Active work animation, tool particles |
| `waiting_approval` | Raised hand / question mark |
| `error` | Red exclamation, shake |
| `circuit_open` | Grayed out / sleeping |
| `terminated` | Empty desk / ghost outline |

### Sprite Key Convention
`spriteKey` should map to a sprite sheet coordinate or named animation set:
- `"engineer-01"`, `"analyst-02"`, `"manager-03"` etc.
- Each key resolves to a row in the sprite sheet

## Desk Grid Layout

```
deskX, deskY → pixel position via:
  screenX = offsetX + deskX * tileWidth
  screenY = offsetY + deskY * tileHeight
```

- **Tile size**: 32×32 or 64×64 pixels
- **Isometric projection** (optional): `screenX = (deskX - deskY) * halfTile`, `screenY = (deskX + deskY) * quarterTile`

## Performance Budget (targeting 60 FPS)

| System | Budget |
|--------|--------|
| SSE event processing | 1ms |
| State diffing | 1ms |
| Sprite updates | 3ms |
| Rendering (PixiJS) | 5ms |
| UI overlay (React) | 4ms |
| Buffer | 2.67ms |

## Key Patterns

- **Object Pooling**: Pre-allocate sprite objects for max agent count. Reuse on agent creation/termination.
- **Observer/Events**: SSE `broadcastEvent` → update sprite state. Don't poll.
- **State Machine**: Each agent sprite has its own FSM matching the 7 agent statuses.

## Anti-Patterns to Avoid

| Don't | Do |
|-------|-----|
| Re-render all sprites every frame | Dirty flag per agent, only update changed |
| Create DOM elements per agent | Use Canvas/WebGL sprites |
| Animate via CSS | Use sprite sheet frame animation |
| Load all sprites upfront | Lazy-load sprite sheets by spriteKey |
