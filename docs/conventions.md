# Conventions & working principles

Standing rules for all work on this project. Read before designing or writing UI.

## Collaboration model
- The user drives design. Claude proposes **structure**, not aesthetics.
- Ask questions about general frontend structure and foundational components —
  not visual/design choices. The user designs and builds up step by step.
- Build the minimum that is asked. Do not add decorative or speculative UI.

## Aesthetic constraints (hard rules)
Avoid the usual AI/template tells. Do **not** introduce, unless explicitly asked:
- emojis in the UI
- gradients
- drop shadows
- vibrant / saturated colors
- corner radius used heavily or decoratively (keep it minimal/intentional)
- random or unjustified design choices (every choice must be deliberate and asked-for)

## Copy / tone
- No sassy, sarcastic, or "clever" wording.
- No overexplaining. No filler. No excessive labelling.
- Plain, active, sentence case. A label labels; nothing does double duty.

## Current baseline (until the user designs further)
- Light grey app background.
- White (`#ffffff`) main app column, centered, mobile-width.
- PWA-installable (manifest + service worker).
