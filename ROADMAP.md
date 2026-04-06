# P2P FarmVille - Development Roadmap

## Current State Audit

### What We Have (~7.8k LOC, 28 modules)
- **Crops**: 60 types across level tiers, 4-stage growth, withering
- **Trees**: 15 types with fruit harvesting
- **Animals**: 10 types, feed/collect product cycle
- **Buildings**: 9 types including crafting + storage
- **Decorations**: 20 types
- **Vehicles**: 3 types (speed multiplier)
- **Market**: 6-tab shop (seeds, trees, animals, buildings, decor, vehicles)
- **Placement**: Ghost preview, grid snapping, ESC to cancel
- **Inventory**: Grid-based with sell
- **Crafting**: Building-based recipe queue
- **Mastery**: Harvest tracking per crop, 3 star tiers
- **Collections**: Random drops, set completion
- **Achievements**: Multi-category + ribbon tiers
- **Expansion**: Tier-based grid size growth
- **Energy**: Usage + regen system
- **XP/Level**: 50 levels with thresholds
- **Day/Night**: Cycle with visual changes
- **Weather**: System with visual effects
- **Particles**: Ambient effects
- **Audio**: Sound system
- **Save/Load**: localStorage persistence

### P2P Backend (fully ported to Electrobun)
- Corestore + Hyperswarm + Protomux
- 7 Protomux channels: farm-sync, world-announce, chat, trade, gift, coop, help
- Typed RPC bridge (bun <-> webview)
- Neighbor discovery + farm state sync
- Chat (global, private, emotes, system)
- Trade (offer/accept/reject/cancel)
- Gifts (daily limit of 5)
- Co-op missions (create/contribute/complete)
- Help requests (request/respond)

### What's Missing for FarmVille Parity

## Phase 1: Game Feel (UI + Core Loop Polish)

### 1.1 UI Overhaul
The current UI is functional but bare. Needs the "juice" that makes farming addictive.

- **Satisfying harvest feedback**: Crop pops upward, sparkle particles, coin icon float-up, subtle screen shake
- **Progress indicators**: Floating icons over growing crops, mini-map with color-coded readiness
- **Better toolbar**: Visual tool icons (not text buttons), radial tool wheel, quick-access number keys
- **Market redesign**: Card-based items with preview, filtered by level, star ratings for unlockable items
- **Inventory overhaul**: Grid layout with item count badges, drag-to-sell, category tabs
- **Toast/notification stack**: Animated notifications that slide in, stack, auto-dismiss
- **Loading/splash screen**: Farm logo with loading tips
- **Settings panel**: Sound volume, notification preferences, graphics quality

### 1.2 Quest System
The #1 retention driver per Hay Day data.

**Daily Quests** (3 per day from pool of 20+):
- Easy: "Water 10 crops" (reward: 50 coins + 10 XP)
- Medium: "Harvest 5 pumpkins" (reward: 150 coins + 30 XP)
- Hard: "Earn 2000 coins from sales" (reward: 500 coins + 75 XP)
- Streak bonus: Day 1 = 1x, Day 7 = 2x rewards

**Story Quests** (20-30 chain quests):
- Multi-step: "Clear field" -> "Plant 10 parsnips" -> "Talk to merchant" -> "Deliver harvest"
- Unlock new areas, systems, NPCs

**Milestone Quests** (long-term):
- "Complete 100 harvests", "Earn 50,000 coins", "Unlock expansion tier 3"
- Exclusive cosmetic rewards

### 1.3 Tutorial/Onboarding
- Hay Day approach: NO forced tutorial. Guided discovery.
- Scarecrow NPC teaches through doing, not reading
- First 3 sessions: crops grow 50% faster, no withering
- System unlock progression: Day 1 = farming, Day 3 = animals, Day 5 = trading

## Phase 2: Game Depth

### 2.1 Crop Quality System
- 4 tiers: Normal (1x) -> Silver (1.25x) -> Gold (1.5x) -> Legendary (2x)
- Quality determined by: water timing, soil health, fertilizer used
- Visual: Different glow/sparkle per tier
- High-quality crops needed for premium recipes and quests

### 2.2 Fertilizer System
- Craft from animal products or buy from market
- Apply before planting: reduces grow time by 25-50%
- Quality fertilizer increases quality tier chance

### 2.3 Seasonal Cycle (28-day seasons)
- Spring/Summer/Fall/Winter with visual overhaul
- Crops have ideal seasons (3x growth) vs tolerant (1x)
- Weather impacts: rain = auto-water, drought = extra cost, storm = damage risk
- Season change: new crop variety, festivals, NPC events

### 2.4 Enhanced Animal System
- Happiness meter (0-100): affects product quality
- Interaction types: Feed, Pet, Brush, Play
- Affection milestones: 250 = follows player, 500 = bonus items, 750 = tricks, 1000 = rare products
- Breeding (mid-game): genetic traits, rarity tiers

### 2.5 Dual Currency
- **Coins**: Gameplay currency (seeds, animals, buildings)
- **Stars**: Slow-earned (achievements, daily login, quests). Used for: cosmetics, rare breeds, instant actions. Never required for core progression.

## Phase 3: Social/P2P Features

### 3.1 Neighbor Visit Actions
- Water their crops (saves them energy)
- Feed their animals (maintains happiness)
- Harvest "help request" crops (both players benefit)
- Rate their farm (social feedback)
- Leave gifts in mailbox

### 3.2 Player Marketplace
- Hay Day roadside shop model
- Players set prices, others browse and buy
- Price suggestion system from recent market history
- 5-8% tax as currency sink
- "Wishlist": Post items you need, others fill for bonus XP

### 3.3 Competitive Elements
- Weekly farm rankings (multiple categories: income, aesthetics, harvests)
- Seasonal competitions: "Most pumpkins this month"
- Farm rating system: 1-5 stars (variety, tidiness, productivity)

### 3.4 Farm Rating & Aesthetics
- 5-star rating visible to visitors
- Decorations near crops = small quality bonus
- "Photo mode" for sharing farm screenshots

## Phase 4: Polish & Live Ops

### 4.1 Audio Overhaul
- Seasonal ambient soundscapes (spring birds, summer cicadas, fall rustling, winter wind)
- Distinct action sounds per crop type
- Season-themed background music
- Festival day special tracks

### 4.2 Seasonal Events
- Monthly themed events with exclusive rewards
- Community goals: "All players contribute 10,000 pumpkins"
- Festival decorations and mini-games

### 4.3 Farm Customization
- Terrain painting (grass types, path materials)
- Fence/gate/path placement
- Music boxes that change ambient tracks in area
- Custom lighting

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Satisfying harvest feedback (particles, sound, animation) | 2d | Critical |
| P0 | Daily quest system | 3d | Critical |
| P0 | Better toolbar with icons | 1d | High |
| P1 | Crop quality tiers | 2d | High |
| P1 | Tutorial/scarecrow guide | 2d | High |
| P1 | Toast notification system | 1d | High |
| P1 | Farm visit actions | 3d | High |
| P2 | Seasonal cycle | 5d | High |
| P2 | Fertilizer system | 2d | Medium |
| P2 | Dual currency | 3d | Medium |
| P2 | Player marketplace | 5d | Medium |
| P3 | Animal breeding | 4d | Medium |
| P3 | Farm rating system | 3d | Medium |
| P3 | Weather effects on gameplay | 3d | Medium |
| P4 | Audio overhaul | 5d | Medium |
| P4 | Seasonal events | 5d | Low |

## Technical Notes

- P2P backend is fully ported to Electrobun (src/bun/p2p.ts)
- RPC bridge is typed (src/shared/rpc-types.ts)
- All social channels working: chat, trade, gift, coop, help
- Workers/main.js retained for Bare compatibility but Electrobun uses in-process P2P
- Storage path: ~/Library/Application Support/p2p-farmville (macOS)
- World topic: p2p-farmville-world-v1
