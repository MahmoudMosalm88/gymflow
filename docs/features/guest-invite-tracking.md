# Feature Spec: Guest Invite Tracking

> Status: Implemented in SaaS web MVP
> Priority: High — requested directly by pilot gyms
> Date: April 2026

---

## What Shipped

GymFlow now supports tracking guest passes as member-driven invites instead of loose standalone guest records.

The shipped MVP includes:
- linking a guest pass to an inviting member
- linking that invite to the member's current subscription cycle
- a branch-level invite allowance per cycle
- remaining invite balance per member
- invite history on the member page
- guest-pass conversion tracking when the guest becomes a real client
- void flow that restores invite balance only for passes created by mistake

This was built to match the new cycle-based subscription direction, so invite balances reset naturally on a new cycle instead of being manually maintained.

---

## How It Works

### Invite allowance

- Each branch has one `guest_invites_per_cycle` setting.
- Default is `1`.
- A member can only spend invites from their current active subscription cycle.

### Remaining invites

For the current cycle:

`remaining = allowance - used`

Where:
- `allowance` comes from branch settings
- `used` counts guest passes created against that cycle unless they were later voided

Unused expired passes still count as used. Only voided passes return balance.

### Conversion

If a guest becomes a member:
- the guest pass stores `converted_member_id`
- the conversion timestamp is stored
- the guest pass also gets marked as used if it was not already used

---

## Where Owners See It

### Guest Passes page

Owners can now:
- search and select an inviting member
- see that member's remaining invite balance before saving
- create invited guest passes
- void mistaken passes
- convert a guest pass into a client and keep the relationship

The table now shows:
- guest name
- inviter
- amount
- status
- conversion state

### Member page

Each member now has a `Guest Invites` card showing:
- invite allowance
- invites used
- invites remaining
- current cycle end date
- recent invited guests

---

## Data Model

Added to `guest_passes`:
- `inviter_member_id`
- `inviter_subscription_id`
- `voided_at`
- `converted_member_id`
- `converted_at`

This keeps invite history auditable without storing a fragile denormalized balance on the member row.

---

## Later Phase

These items were intentionally left out of the MVP and should be built as the next layer, not mixed into the first release:

1. Invite analytics
- top inviters
- guest-to-member conversion rate by inviter
- invite-driven revenue reporting

2. Per-plan invite entitlements
- different invite allowances by plan shape or explicit plan catalog

3. Smarter invite operations
- dedicated guest invite widget on the member list
- bulk follow-up for guests who did not convert
- conversion reminders to owners

4. Reporting surfaces
- guest invites by month
- invite usage by active cycle
- conversion funnel from guest pass to paid subscription

This later phase should build on the current cycle-linked data model, not replace it.
