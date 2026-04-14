# Onboarding Revamp — Research Findings

**Date**: 2026-04-13
**Research gaps covered**: 5/5

---

## Gap 1: Multi-Step Wizard Progress Indicators

### Winner: Labeled Linear Stepper (Option B — confirmed by user)
A 100-participant qualitative study (hugo.limited) tested 4 patterns head-to-head. **Numbered circles with step labels** won by a wide margin. Radial progress indicators looked good in design reviews but performed worst with actual users. Dots-only were weakest.

### Horizontal vs. Vertical
| Format | Best for |
|---|---|
| Horizontal numbered circles | 3–5 short-label steps, wide desktop |
| Vertical left sidebar | 5–7+ steps, long labels, SaaS setup flows |
| "Step X of Y" text only | Mobile fallback |

> **Note for GymFlow**: GymFlow has 6 steps. Research recommends vertical sidebar for 6+ steps. User selected horizontal (Option B). Flag this: horizontal will work but may crowd on tablet. Mobile must collapse to text.

### Three-State Model (all design systems agree)
- **Completed**: Filled accent circle + ✓ checkmark icon; connector line fills with accent color
- **Current**: Accent-bordered circle (outline only) + `aria-current="step"` + bold label
- **Upcoming**: Muted border circle + muted label text

### Key Finding: Don't Show Progress on Step 1
A/B test data shows showing "Step 1 of 7" on the opening screen **reduced conversion by ~133%** vs. hiding it. Reason: inflates perceived effort before user is committed. Show from Step 2 onward.

### Accessibility Requirements
- Wrap in `<ol>` (ordered list, not div)
- `aria-current="step"` on active item
- `aria-label` per step: "Step 2 of 6: Upload — completed"
- `role="navigation"` on container
- Color + icon + text all convey state (never color alone)

### GymFlow Brutalist Adaptation
- No border-radius — square or slightly chamfered markers
- Completed: filled `bg-destructive` + white checkmark
- Current: `border-destructive` 2px border + `text-foreground` bold label
- Upcoming: `border-[#3a3a3a]` + `text-[#8a8578]` muted
- Connector: 2px vertical/horizontal line, fills red on complete
- Mobile: collapse to `"Step X of Y"` with Space Grotesk

---

## Gap 2: Gym SaaS Import/Migration UX Patterns

### The Spectrum
| Product | Approach |
|---|---|
| Mindbody | White-glove; human specialist; ~30 day rollout |
| Glofox | Dedicated migration manager; 4–6 weeks; owner maps to their template |
| PushPress | Hybrid; "Ride Along Checklist" in-app; owner exports, system imports |
| TeamUp | Fully managed; "white-glove data service" included |
| **Gymdesk** | **Fully self-serve wizard** (closest to GymFlow) |

### Gymdesk (Best Self-Serve Analogue)
Steps: Settings → Import → Upload CSV → Row count preview → Column mapping → Import options (date format, status, duplicate handling) → Submit

- Provider-specific auto-mapping (if user selects "Mindbody export" it pre-maps fields)
- Duplicate detection: skip / merge / leave — user's choice
- Date format selector (MM/DD vs DD/MM)
- Optional welcome email toggle
- "Migration Center" hub consolidates all import types (members, memberships, payments, attendance)
- 20MB limit; larger imports go through support

### Minimum Required Fields (industry consensus)
First name, Last name, Phone, Email (used as dedup key), Status, Join Date. Everything else optional.

### Key Gaps in GymFlow's Current Import vs. Industry Standard
1. **No date format picker** — critical for Egyptian/MENA market (DD/MM vs MM/DD confusion is the #1 silent import failure)
2. **No welcome email toggle** — gym owners want to control when members are notified
3. **Execute button doesn't show actual count** — should be "Import 247 members" not "Import valid rows"
4. **No import history** — ability to revisit past import summaries from Settings
5. **No dry-run mode toggle** — Gymdesk lets you validate without committing
6. **Scope-setting missing** — no clear "what we can / can't import" section at the top

---

## Gap 3: Bulk Action Confirmation Patterns

### Risk Tier Model (Smashing Magazine / Nielsen Norman / Primer)
| Risk | Pattern |
|---|---|
| Low (reversible) | Undo toast — no dialog at all |
| Medium | Simple modal with red confirm button, Cancel as default focus |
| High + irreversible | Modal with count + explicit consequence + "type to confirm" input |

### For Imports Specifically: It's a COMMIT STEP, Not a Dialog
The best practice (AppMaster, CSVBox, Vitaly Friedman) is **not a popup dialog** — it's a formal commit step at the end of the preview flow:
- Show final counts in the commit step
- Commit button is ONLY enabled after dry-run succeeds
- One explicit irreversibility statement in context
- Label button: "Import 247 members" (action + count, not "Confirm")

### What the Commit Step Must Answer
- How many records will be created / updated / skipped?
- What field was used for deduplication?
- Are any existing records being changed?
- Is this reversible? (If not: once, clearly, with recovery path)

### Real Product Examples
- **Linear**: Lists specific issue names inside dialog body — user verifies exact records before confirming
- **Stripe**: Explains consequences (feature access end date, billing impact) — focuses on consequences not just the action
- **Resend** (Smashing Mag best-practice example): Title = action, body names specific object in bold + red "cannot be undone" badge, red CTA "Delete API Key"

### Anti-Patterns
- "Are you sure?" — users say yes instinctively
- "OK" / "Yes" / "No" — ambiguous button labels
- Pre-focusing the destructive button
- Using confirmations for routine reversible actions (creates dialog blindness)
- Saying "This action is irreversible" as a standalone warning without a recovery path

---

## Gap 4: Import Success State Design

### Industry Standard (from Dromo, Relaticle, ClickUp/Flatfile)
The success screen is widely under-designed. Users who see vague success ("Done!") immediately test the system with fake data because they don't trust the import worked.

### What a High-Quality Success State Shows
1. **Outcome numbers in full**: Created / Updated / Skipped / Failed
2. **Clear path to the data**: "View your 244 members" CTA (not generic "Open dashboard")
3. **Failed row recovery**: "3 rows had errors — download the error report to fix and re-upload" (show even if 0 failures)
4. **Timestamp**: "Imported April 13, 2026 at 3:42 PM"
5. **Secondary CTA**: "Import another file" or "Back to settings"

### Celebration vs. Calm Confidence
- **Low-stakes (reversible) imports**: mild celebration (confetti, checkmark animation)
- **High-stakes (irreversible, livelihood data)**: **calm confidence** — a celebration feels tone-deaf when the user just went through anxiety about their data
- **For GymFlow**: Use calm confidence. Green checkmark + summary card. Reserve the celebratory micro-moment for the CTA copy: "Your gym is ready — meet your members."

### The "First Value Moment" Frame
The FVM for a gym import is "the first time they see their real member data inside GymFlow." The success screen marks arrival: "Your gym is ready. 244 members are waiting." Not "Import complete."

---

## Gap 5: Anxiety-Reducing Microcopy Patterns

### Three Psychological Mechanisms (Atticus Li / Kumlin Research)
1. **Cognitive fluency**: Simple words signal safety — "Match your columns" > "Configure field associations"
2. **Specific loss framing** (informational, not manipulative): "Without mapping Phone, we can't check for duplicates" — tells them WHY
3. **Perceived autonomy**: "You'll review before anything is saved" is more powerful than any warning

### The Core User Fear: "Will this mess up what I already have?"
Three sub-anxieties, each needs its own microcopy answer:
- **Data loss**: "Your existing members are safe. We'll only add what's new in your file."
- **Data corruption**: "You'll see a full preview before anything is saved."
- **Irreversibility**: Don't say "irreversible" — say the recovery path: "You can edit or remove any member individually after import."

### Specific Copy Patterns

**Near upload button:**
- ✓ "Your existing members are safe — we'll only add what's new in your file"
- ✓ "You'll review before anything is saved"
- ✗ "Upload your CSV file" (no reassurance)

**Processing states (name actual operations):**
- "Reading 247 rows..." → "Checking for duplicate phone numbers..." → "Adding members..."
- Never: "Please wait" or endless spinner with no copy

**Error messages (lead with success):**
- ✓ "244 of 247 members imported. 3 rows had formatting issues — download the error report."
- ✗ "Import failed. 3 rows had errors."

**Irreversibility:**
- ✓ "You can edit or remove any member individually after import."
- ✗ "This action is irreversible and cannot be undone."

**Execute button label:**
- ✓ "Import 247 members" (action + count)
- ✗ "Import valid rows" (technical, no emotional grounding)

**Success copy:**
- ✓ "Your gym is ready. 244 members are waiting."
- ✗ "Import complete."

### Button Label → Value-Moment Focused
| Old | New |
|---|---|
| "Import valid rows" | "Import 247 members" |
| "Open dashboard" | "Meet your members" |
| "Run preview" | "Preview before importing" |
| "Done" | "Your gym is ready" |
