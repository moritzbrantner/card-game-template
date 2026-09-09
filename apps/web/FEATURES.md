# Features

This document tracks user-facing capabilities that the application template guarantees.

## Application foundation

- **Status:** done
- **Summary:** The template provides localized routing, authentication, profile management, admin controls, and typed service boundaries.
- **Acceptance criteria:**
  - [x] Public and authenticated routes are separated explicitly.
  - [x] Locale-aware navigation is part of the application shell.
  - [x] Authentication and profile flows share one session boundary.
  - [x] Admin-only routes enforce their authorization boundary server-side.

## Card-game showcase

- **Status:** done
- **Summary:** Shared game contracts, rules, sessions, bots, persistence, and multiplayer integration are demonstrated through playable card games without coupling the platform to one ruleset.
- **Acceptance criteria:**
  - [x] UNO-style, Phase 10-style, Texas Hold'em, and Arcane Duel remain independent game implementations.
  - [x] Shared packages own generic game/session contracts rather than game-specific rules.
  - [x] Browser examples can exercise the game foundation without becoming the source of domain truth.

## Example routes

- **Status:** done
- **Summary:** Example routes demonstrate forms, storytelling, communication, uploads, and mock REST data under an explicit `/examples/*` namespace.
- **Acceptance criteria:**
  - [x] Example pages are clearly separated from the core app surface.
  - [x] Example REST data is served from `/api/examples/*`.
  - [x] Home and navigation entry points label these routes as examples.

### Card interaction controls

- **Status:** in progress
- **Summary:** Shared card-game presentation primitives expose accessible card selection, legal-action drag/drop, and engine-driven controls for drawing, moving, flipping, discarding, and game-specific actions without taking ownership of game legality. Phase 10 can now discard an unambiguous legal hand card through the same registered move by button, keyboard, or desktop drag/drop, while UNO retains its prompt-aware direct-play path.
- **Acceptance criteria:**
  - [x] Selectable cards support pointer, Enter, and Space activation with pressed-state semantics.
  - [x] Disabled selectable cards remain visible and focusable without activating.
  - [x] A reusable touch-sized toolbar can expose draw, move, flip, discard, and custom actions.
  - [x] The controls remain callback-driven so game engines stay authoritative for legal moves.
  - [x] Phase 10 card-specific legal moves are triggered from contextual hand-card controls instead of duplicated generic buttons.
  - [x] UNO direct card play remains click/keyboard/drag driven while draw/pass actions live inside the play surface.
  - [x] Phase 10 supports unambiguous legal discard drag/drop while retaining equivalent button and keyboard controls.
  - [x] Ambiguous card-to-target mappings fail closed instead of choosing a move implicitly.
  - [ ] Make the visible draw/discard pile representations themselves direct controls across both showcases.
  - [ ] Add touch-first pointer dragging so the shared drop path works consistently on mobile without removing keyboard/button controls.
