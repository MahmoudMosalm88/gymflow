# GymFlow — Cost / Profit Analysis

> Last updated: April 24, 2026
> Exchange rate used: **EGP 52 per USD** (April 2026 mid-market)
> Important: live GymFlow today sends WhatsApp through the Baileys worker, not the official Meta Cloud API. Section 1 below reflects the verified live infra shape. Sections 2+ remain planning economics for a future / optional official API path.

---

## 1. Current Infrastructure Costs (Monthly)

| Service | Spec | Monthly Cost |
|---------|------|-------------|
| Cloud SQL | `db-f1-micro`, 20 GB SSD | **~$11–15** |
| Cloud Run | scheduled floor: `minScale=1` at `08:00-00:00` Cairo, `0` overnight, `maxScale=12`, `1 vCPU / 1 GiB` | **~$9–12 projected** |
| WhatsApp worker VM | `e2-micro` spot, single active lane | **~$2–5** |
| Storage + Artifact Registry + Cloud Build + Secrets + misc GCP overhead | Current measured run-rate remainder | **~$2–5** |
| Firebase Auth | Free tier (< 50K MAU) | $0 |
| **Total live infra run-rate** | Verified April 17-24 billing shape, projected after the April 24 warm-hours cut | **~$24–28/month projected** |

This is the **current live run-rate target** for the verified April 24, 2026 infra shape after the Cloud Run warm-hours change:
- Cloud Run `gymflow-web-app` is live with `minScale=1` during `08:00-00:00` `Africa/Cairo`, and `minScale=0` overnight
- Cloud SQL `gymflow-pg` is currently `db-f1-micro`
- WhatsApp delivery is still a single `e2-micro` spot worker lane

### 1A. Current Live Capacity Policy

| Zone | Practical limit | Meaning |
|------|-----------------|---------|
| Green | **1–5 standard gyms** or **1 heavy broadcast gym** | No proactive scaling required |
| Yellow | **5–10 standard gyms** or **2 heavy broadcast gyms** | Start scale planning and monitor DB pressure + queue backlog closely |
| Red | **>10 standard gyms** or **>2 heavy broadcast gyms** | Scale Cloud SQL and the WhatsApp worker before adding more load |

Operational note:
- current worker pacing is roughly **`257 messages/hour`** and **`~6.2k/day`**
- one **`5,000` recipient blast** is roughly **`19.4 hours`** on the current single sender lane
- the first live bottlenecks are Cloud SQL, then the single worker lane, then sender-risk / block-risk

---

## 2. Official WhatsApp Business API Costs (Future / Optional Path)

This section is **not** the current live GymFlow cost structure.

Use it for:
- pricing strategy if GymFlow migrates to the official API path
- enterprise quoting where direct Meta-style message cost needs modeling
- future margin planning for a broadcast-heavy product lane

Meta shifted to **per-message pricing** as of July 2025. The category of the message determines the cost.

### Per-Message Rates (USD)

| Country | Marketing | Utility | Authentication |
|---------|-----------|---------|----------------|
| Egypt | **$0.1073** | $0.0036 | $0.0036 |
| Saudi Arabia | $0.0455 | $0.0107 | $0.0107 |
| UAE | $0.0499 | $0.0157 | $0.0157 |
| Kuwait/Rest of ME | $0.0341 | $0.0091 | $0.0091 |

**Critical insight**: Renewal reminders and welcome messages can be classified as **utility** (not marketing) if they contain no promotional angle — e.g., "Your membership expires on [date]" is utility ($0.0036), but "Renew now and get 10% off" is marketing ($0.1073). **This is a 30x cost difference in Egypt.**

### WhatsApp Cost Scales With Member Count

This is the key cost variable. A gym with 500 active members sends ~5x more messages than a gym with 100 members. Assuming a realistic mix (mostly utility, some marketing broadcasts):

| Active Members | Utility msgs/mo | Marketing msgs/mo | **WhatsApp cost/mo** |
|---------------|-----------------|-------------------|---------------------|
| ~100 | 150 | 30 | **~$4** |
| ~200 | 300 | 60 | **~$8** |
| ~350 | 500 | 100 | **~$13** |
| ~500 | 750 | 150 | **~$19** |
| ~700+ | 1,000 | 200 | **~$25** |

**Recommendation**: Frame all automated messages (welcome, renewal, freeze notifications) as **utility templates**. Reserve marketing only for actual promotions. This keeps costs at the low end of each range.

---

## 3. Unit Economics — Official API Scenario

This section models the **future / optional official API path**, not the current Baileys-based live system.

Under that future model, GymFlow still uses shared-schema multi-tenancy (all tenants in one database), and **official WhatsApp cost would scale with member count**, making gym size the real cost driver.

### Marginal Infra Cost per Tenant (Excluding WhatsApp)

| Tenants | Total Infra | Infra per Tenant |
|---------|------------|-----------------|
| 1 | ~$43/month | $43.00 |
| 5 | ~$45/month | $9.00 |
| 10 | ~$47/month | $4.70 |
| 25 | ~$52/month | $2.08 |
| 50 | ~$60/month | $1.20 |
| 100 | ~$75/month | $0.75 |

### All-In Cost per Tenant by Gym Size (at 25 tenants)

| Gym Size | Active Members | Infra share | WhatsApp | DB/Storage delta | **Total cost/tenant** |
|----------|---------------|-------------|----------|-----------------|----------------------|
| Small | ≤150 | $2.08 | $4–8 | $0.50 | **~$7** |
| Mid | 151–300 | $2.08 | $8–13 | $1.00 | **~$14** |
| Large | 301–500 | $2.08 | $13–19 | $1.50 | **~$20** |
| XL | 500+ | $2.08 | $19–25 | $2.00 | **~$27** |

### Per-Member Economics (What It Costs You vs. What You Earn)

| Gym Size | Avg Members | Cost/Tenant | **Cost/Member** | Price/Member (EGP) | **Profit/Member (EGP)** | **Markup** |
|----------|-----------|------------|-----------------|-------------------|------------------------|-----------|
| Small | ~100 | ~$7 | EGP 3.64 | EGP 15 | **EGP 11.36** | **312%** |
| Mid | ~225 | ~$14 | EGP 3.23 | EGP 15.56 | **EGP 12.33** | **382%** |
| Large | ~400 | ~$20 | EGP 2.60 | EGP 15 | **EGP 12.40** | **477%** |
| XL | ~650 | ~$27 | EGP 2.16 | EGP 15.38 | **EGP 13.22** | **612%** |

**Key takeaway**: Every member costs you EGP 2–4 to serve and brings in EGP 15. That's a **300–600% markup** per member. Bigger gyms have even better per-member economics because WhatsApp costs are sublinear (not every member gets a message every month).

---

## 4. Pricing Strategy

### The 5% Rule

GymFlow's pricing is anchored to one principle: **charge ~5% of the gym's monthly revenue**, regardless of size. This is fair, scalable, and easy to justify:

| Gym Size | Avg Members | Avg Fee/Member | Gym Revenue | 5% Target |
|----------|------------|----------------|-------------|-----------|
| Small neighborhood | 100 | EGP 300 | EGP 30,000 | **EGP 1,500** |
| Mid-size | 250 | EGP 400 | EGP 100,000 | **EGP 5,000** |
| Large/premium | 400 | EGP 450 | EGP 180,000 | **EGP 9,000** |
| Chain/XL | 650+ | EGP 500 | EGP 325,000 | **EGP 16,250** |

Member count is the closest proxy for revenue that doesn't require auditing the gym's books. More members ≈ more revenue ≈ higher ability to pay.

### Why All Features at Every Tier

GymFlow's competitive advantage is the **full stack**: Arabic-first UX + WhatsApp automation + QR check-in + multi-branch + local payment logic. Gating any of these behind an upgrade:

1. **Kills the differentiator** — a gym without WhatsApp automation is just a worse spreadsheet
2. **Creates friction** — "upgrade to unlock" feels like a bait-and-switch in Egypt
3. **Complicates sales** — one plan = one conversation = one close

The ONLY axis is member count. Everything else is included from day one: WhatsApp, QR check-in, reports, multi-branch, backup, card generation, Arabic + English, guest passes, freeze management, notifications. Staff/trainer profiles will be included when they launch.

### Recommended Pricing: Member-Count Tiers

| Active Members | Egypt (EGP/mo) | Egypt (~USD) | GCC (USD/mo) |
|---------------|----------------|-------------|--------------|
| **Up to 150** | **EGP 1,500** | ~$29 | **$79** |
| **151–300** | **EGP 3,500** | ~$67 | **$149** |
| **301–500** | **EGP 6,000** | ~$115 | **$249** |
| **500+** | **EGP 10,000** | ~$192 | **$399** |

**Annual discount**: 2 months free (17% off).

"Active members" = members with a non-expired subscription in GymFlow. This is transparent, auditable, and tracked automatically by the system.

### How These Numbers Hit the 5% Target

| Tier | Avg Members | Typical Gym Revenue | GymFlow Price | **% of Revenue** |
|------|------------|--------------------|--------------|--------------------|
| ≤150 | ~100 | EGP 30,000–45,000 | EGP 1,500 | **3.3–5.0%** |
| 151–300 | ~225 | EGP 80,000–110,000 | EGP 3,500 | **3.2–4.4%** |
| 301–500 | ~400 | EGP 160,000–200,000 | EGP 6,000 | **3.0–3.8%** |
| 500+ | ~650 | EGP 280,000–400,000 | EGP 10,000 | **2.5–3.6%** |

The tiers hit 3–5% across sizes. Smaller gyms pay closer to 5% (they get the most relative value from automating WhatsApp and check-in). Larger gyms drift toward 3% (volume leverage). A pure per-member price (e.g., EGP 15/active member/month) would hit exactly 5% everywhere, but tiers are easier to sell and understand.

### Why These Numbers vs. Competitors

- **vs. Gymivida** (EGP 3,000 / 5,000 / 9,000): GymFlow at EGP 1,500 starts 50% lower but includes everything. A 300-member gym pays EGP 3,500 (vs. Gymivida's EGP 5,000 for comparable features). GymFlow's top tier (EGP 10,000) is only 11% above Gymivida's top (EGP 9,000) but covers 500+ members with zero feature gates.
- **vs. Wellyx** ($99–$299): GCC pricing ($79–$399) brackets Wellyx's range. A 200-member GCC gym pays $149 vs. Wellyx's $199 for similar scope — 25% less with Arabic-first UX.
- **vs. PushPress** ($0–$229): GCC mid-tiers ($149–$249) compete directly with PushPress Growth ($159) and Pro ($229), with Arabic and WhatsApp as clear differentiators.

### Staff/Trainer Profiles (Coming Soon)

Staff and trainer profiles will be included at all tiers when launched. No per-seat fees — this keeps the pricing simple and the value proposition clean.

---

## 5. Break-Even Analysis

### At Current Lean Infra (~$43/month fixed)

| Scenario | Revenue/customer | Customers to break even |
|----------|-----------------|------------------------|
| All small gyms (EGP 1,500 = $29) | $29/month | **2 customers** |
| All mid gyms (EGP 3,500 = $67) | $67/month | **1 customer** |
| Mixed (weighted avg ~$70/mo) | $70/month | **1 customer** |

**GymFlow breaks even on infra with 1–2 paying Egyptian customers.**

### At Scaled Infra (50+ tenants, ~$213/month)

When Cloud SQL upsizes and WhatsApp volume grows:

| Scenario | Total cost (50 tenants) | Break-even (at avg $70/mo) |
|----------|------------------------|---------------------------|
| Egypt-only | ~$910/month* | **13 customers** |
| Egypt + GCC (70/30 mix, avg $96/mo) | ~$910/month* | **10 customers** |

*Includes $213 infra + ~$700 WhatsApp across 50 tenants (weighted by size mix).

Even at scale, break-even stays well under 15 customers.

---

## 6. Gross Margin Analysis

### Gross Margin & Markup by Gym Size (Per-Tenant View)

| Tier | Price (USD) | Cost to Serve | **Gross Margin** | **Markup (profit ÷ cost)** |
|------|-------------|--------------|-----------------|---------------------------|
| ≤150 members | $29 | ~$7 | **76%** | **314%** |
| 151–300 members | $67 | ~$14 | **79%** | **379%** |
| 301–500 members | $115 | ~$20 | **83%** | **475%** |
| 500+ members | $192 | ~$27 | **86%** | **611%** |

> **Margin vs. markup — plain English:**
> - **Margin 76%** = out of every $1 the gym pays, you keep $0.76 as profit
> - **Markup 314%** = for every $1 you spend, you earn $4.14 back (your $1 cost + $3.14 profit)
>
> Both numbers say the same thing differently. Markup is the "return on your investment" view.

Larger gyms have *better* margins because the price scales faster than the cost. This is ideal — the pricing model is self-reinforcing.

### Gross Margin & Markup by Customer Count (Portfolio View)

Assuming Egypt-only mix: 45% small, 30% mid, 15% large, 10% XL → weighted avg **~$70/month** per customer, **~$14/month** avg cost:

| Customers | MRR | Total Cost | **Gross Margin** | **Markup** |
|-----------|-----|-----------|-----------------|-----------|
| 5 | $350 | $113 | **68%** | **210%** |
| 10 | $700 | $187 | **73%** | **274%** |
| 25 | $1,750 | $402 | **77%** | **335%** |
| 50 | $3,500 | $913 | **74%** | **283%** |
| 100 | $7,000 | $1,675 | **76%** | **318%** |

Total cost includes infra (scales with tenant count) + WhatsApp (scales with member count).

**Benchmark**: Healthy SaaS targets 70–80% gross margin (200–400% markup). GymFlow hits 274% markup at 10 customers and sustains 280–335% at scale. The dip at 50 customers reflects the Cloud SQL upgrade — margins recover as revenue grows past the step.

---

## 7. Scaling Cost Projections

### When to Upsize Infrastructure

| Milestone | Trigger | Action | New monthly cost |
|-----------|---------|--------|-----------------|
| **Current live baseline** | `1–5` standard gyms or `1` heavy broadcast gym | Stay on current live shape: Cloud SQL `db-f1-micro` + Cloud Run scheduled floor (`minScale=1` business hours, `0` overnight) + single `e2-micro` spot worker | **~$24–28/month projected** |
| **First scale-up** | `>10` standard gyms, `>2` heavy broadcast gyms, or recurring queue backlog beyond `~24h` | Upgrade Cloud SQL first, then move off the single `e2-micro` worker baseline | **~$130–170/month** |
| **Second scale-up** | `~25` mixed gyms or overlapping heavy campaigns across branches | Keep custom SQL, increase worker size / redundancy, revisit Cloud Run floor if traffic justifies it | **~$160–220/month** |
| **Large scale** | `50+` mixed gyms or a true broadcast-first portfolio | Stronger DB / worker architecture; revisit official API path if broadcast becomes core GTM | **case-by-case** |

### Cost Scaling Curve (Infra Only, Excluding WhatsApp API)

This curve is still a **planning model** for the scaled / official-API future state. It is not the exact current live spend; use section 1 for the verified live run-rate.

| Customers | Cloud SQL | Cloud Run | WhatsApp VM | Storage | **Infra Total** |
|-----------|----------|-----------|------------|---------|----------------|
| 1–10 | $30 | $3 | $7 | $3 | **$43** |
| 25 | $30 | $5 | $7 | $5 | **$47** |
| 50 | $88 | $10 | $7 | $8 | **$113** |
| 100 | $88 | $20 | $14* | $15 | **$137** |
| 250 | $168 | $35 | $28* | $25 | **$256** |

*WhatsApp VM may need e2-small ($14) or e2-medium ($28) at higher tenant counts.

### WhatsApp API Costs by Portfolio Size

This is where member count matters. Assuming the size mix (45/30/15/10):

| Tenants | Avg total active members | WhatsApp API/mo | **All-in cost** |
|---------|------------------------|-----------------|----------------|
| 10 | ~2,500 | ~$140 | **$187** |
| 25 | ~6,250 | ~$355 | **$402** |
| 50 | ~12,500 | ~$700 | **$813** |
| 100 | ~25,000 | ~$1,400 | **$1,537** |

WhatsApp API becomes the dominant cost at scale, not infra. This is important for margin planning.

---

## 8. Revenue Projections (MRR)

### Egypt-Only Revenue

Customer mix: 45% ≤150, 30% ≤300, 15% ≤500, 10% 500+ → weighted avg **EGP 3,625/month (~$70/month)**

| Customers | MRR (EGP) | MRR (USD) | ARR (USD) |
|-----------|----------|----------|----------|
| 5 | 18,125 | $349 | $4,188 |
| 10 | 36,250 | $697 | $8,364 |
| 25 | 90,625 | $1,743 | $20,916 |
| 50 | 181,250 | $3,486 | $41,832 |
| 100 | 362,500 | $6,971 | $83,652 |

### Egypt + GCC Revenue (70/30 Mix)

GCC weighted avg: ~$158/month (same size distribution at GCC prices).
Blended ARPU: 0.70 × $70 + 0.30 × $158 = **~$96/month**

| Customers | MRR (USD) | ARR (USD) |
|-----------|----------|----------|
| 10 | $963 | $11,556 |
| 25 | $2,408 | $28,896 |
| 50 | $4,815 | $57,780 |
| 100 | $9,630 | $115,560 |

---

## 9. Profit Projections (Monthly)

### Egypt-Only

| Customers | MRR | Total Cost | **Net Profit** | **Margin** | **Markup** |
|-----------|-----|-----------|---------------|-----------|-----------|
| 5 | $349 | $113 | **$236** | 68% | **209%** |
| 10 | $697 | $187 | **$510** | 73% | **273%** |
| 25 | $1,743 | $402 | **$1,341** | 77% | **334%** |
| 50 | $3,486 | $913 | **$2,573** | 74% | **282%** |
| 100 | $6,971 | $1,675 | **$5,296** | 76% | **316%** |

### Egypt + GCC (70/30 Mix)

| Customers | MRR | Total Cost | **Net Profit** | **Margin** | **Markup** |
|-----------|-----|-----------|---------------|-----------|-----------|
| 10 | $963 | $187 | **$776** | 81% | **415%** |
| 25 | $2,408 | $402 | **$2,006** | 83% | **499%** |
| 50 | $4,815 | $913 | **$3,902** | 81% | **427%** |
| 100 | $9,630 | $1,675 | **$7,955** | 83% | **475%** |

---

## 10. Customer Acquisition Cost (CAC) Estimates

### Egypt

| Channel | CPL (EGP) | Lead-to-Close | Implied CAC | Notes |
|---------|----------|--------------|-------------|-------|
| WhatsApp outreach | 0 | 5–10% | EGP 0–500 | Your own time only |
| Facebook/Instagram ads | 150–300 | 8–15% | EGP 1,000–3,750 | ~$19–$72 |
| Google Ads | 300–600 | 10–18% | EGP 1,667–6,000 | ~$32–$115 |
| SEO / content (long-term) | ~0 | 3–8% | EGP 0–1,000 | Slow but lowest CAC |
| Referral / word of mouth | 0 | 15–25% | EGP 0–500 | Strongest in this niche |

**Target CAC for Egypt**: **EGP 1,500–3,000 (~$29–$58)**

### LTV:CAC Viability Check

| Tier | Monthly Revenue | Avg. Lifetime (months)* | LTV | CAC (EGP 2,000 = $38) | **LTV:CAC** |
|------|----------------|------------------------|-----|------------------------|------------|
| ≤150 ($29) | $29 | 18 | $522 | $38 | **13.7:1** |
| 151–300 ($67) | $67 | 22 | $1,474 | $38 | **38.8:1** |
| 301–500 ($115) | $115 | 24 | $2,760 | $38 | **72.6:1** |
| 500+ ($192) | $192 | 24 | $4,608 | $38 | **121.3:1** |

*Estimated based on 4–5% monthly SaaS churn for SMB vertical SaaS. Larger gyms churn less.

**All tiers clear the 3:1 minimum by a massive margin.** The larger the gym, the better the unit economics — they pay more, churn less, and cost relatively less to acquire (they're easier to find).

### CAC Payback Period

| Tier | Monthly Revenue | Gross Margin | CAC ($38) | **Payback** |
|------|----------------|-------------|----------|------------|
| ≤150 | $29 | $22 (76%) | $38 | **1.7 months** |
| 151–300 | $67 | $53 (79%) | $38 | **0.7 months** |
| 301–500 | $115 | $95 (83%) | $38 | **0.4 months** |
| 500+ | $192 | $165 (86%) | $38 | **0.2 months** |

Every tier pays back CAC in under 2 months. Mid-to-large gyms pay back in under 1 month. This gives aggressive room for paid acquisition.

---

## 11. EGP vs. USD Pricing Strategy

| Factor | EGP Pricing | USD Pricing |
|--------|------------|-------------|
| Egypt trust | High — feels local, no FX anxiety | Low — bank rejections, FX fees |
| GCC fit | Awkward — EGP is not a reference currency | Natural — GCC businesses think in USD |
| Payment methods | Instapay, Fawry, Vodafone Cash, bank transfer | Credit card, Stripe |
| Currency risk | You absorb EGP devaluation | Customer absorbs |
| Perception | "Built for us" | "Another foreign tool" |

**Recommendation**: **Dual pricing**.
- **Egypt**: Price in EGP, accept local payment methods (Instapay, bank transfer, Fawry, Vodafone Cash). Adjust prices quarterly if EGP devalues significantly.
- **GCC**: Price in USD, accept credit card / Stripe. Position alongside global competitors.

---

## 12. Competitive Price Positioning Map

```
Monthly price (USD equivalent) — for a ~200-member gym

$0 ────────── $50 ────────── $100 ────────── $200 ────────── $300+
│               │                │                │
│               │   GymFlow      │   Wellyx       │  Mindbody
│               │   $67          │   $99          │  $129+
│               │   (all features)                │
│               │                │   GymMaster    │  Zen Planner
│               │   Gymivida     │   $89-$99      │  $99-$289
│               │   $58-$96      │                │
│               │   (gated)      │   PushPress    │  Glofox
│               │                │   $159         │  quote-based
```

**GymFlow's position**: For a typical 200-member gym, GymFlow is EGP 3,500 ($67) with everything included. Gymivida starts at EGP 3,000 ($58) but gates WhatsApp and advanced features behind EGP 5,000–9,000 tiers.

The pitch: **"You get the full product. No locked features. And the price scales with your gym — bigger gym, bigger plan, same everything-included deal."**

---

## 13. Key Takeaways for Client Conversations

1. **"One price based on your gym size. Everything included."** No feature tiers. No "upgrade to unlock WhatsApp." Your member count determines the price, and you get the full system from day one.

2. **"We charge ~5% of what your gym makes."** If your gym has 200 members paying EGP 400/month, your revenue is ~EGP 80,000. GymFlow costs EGP 3,500 — about 4.4%. If it retains even 10 members who would have churned, it pays for itself 10x over.

3. **"Less than Gymivida, with more features."** A 200-member gym pays EGP 3,500 for the full GymFlow system vs. EGP 5,000+ for comparable Gymivida features. And GymFlow includes WhatsApp automation at every level.

4. **"EGP 1,500/month = less than 5 memberships."** For a small gym charging EGP 300/member, GymFlow costs less than losing 5 members. WhatsApp renewal reminders alone can save more than that.

5. **"Multi-branch? Same price per gym."** Chains don't pay extra for branch management. A 3-branch operation with 400 total members pays the 301–500 tier — one simple price.

6. **"Staff profiles included."** When trainer/staff features launch, they'll be included at all tiers. No per-seat fees.

7. **Break-even is 1–2 customers.** The business is profitable from the first paying gym.

8. **GCC is the high-margin play.** A 200-member GCC gym pays $149/month vs. $67 in Egypt — 2.2x the revenue, same product, same infra cost.

9. **WhatsApp automation adds real value at near-zero cost** — if templates are structured as utility messages (~$4–8/month per gym vs. $20–40 if sent as marketing).

---

## 14. Financial Milestones

| Milestone | Customers | MRR (USD) | ARR (USD) | What it means |
|-----------|-----------|----------|----------|---------------|
| **Infra break-even** | 1–2 | $70 | $840 | GymFlow pays for itself |
| **Founder income** | 6 | $420 | $5,040 | Covers basic living expenses (Egypt) |
| **Full-time viable** | 12 | $840 | $10,080 | Sustainable one-person business |
| **First hire** | 20 | $1,400 | $16,800 | Can afford part-time support |
| **Serious business** | 50 | $3,500 | $42,000 | Strong foundation, Cloud SQL upgrade |
| **Growth stage** | 100 | $7,000 | $84,000 | Multiple hires, GCC push |
| **Scale** | 250 | $17,500+ | $210,000 | Regional player, team of 5+ |

---

## 15. Future Pricing Refinement: Per-Member Model

The tier model above approximates the 5% rule. For a more precise approach, GymFlow could eventually move to **per-active-member pricing**:

**EGP 15 per active member per month** (minimum EGP 1,500)

| Active Members | Monthly Price | vs. Tier Price |
|---------------|--------------|---------------|
| 100 | EGP 1,500 (floor) | Same |
| 200 | EGP 3,000 | EGP 500 less |
| 300 | EGP 4,500 | EGP 1,000 more |
| 500 | EGP 7,500 | EGP 1,500 more |
| 700 | EGP 10,500 | EGP 500 more |

At EGP 15/member with average fees of EGP 300–500, this captures exactly **3–5%** of gym revenue at every size. The tradeoff: simpler and fairer, but some gym owners dislike "being charged more for growing." Tiers avoid this perception.

**Recommendation**: Launch with tiers (section 4). Consider per-member pricing after 50+ customers, once you have real data on gym size distribution.

---

*Sources: Meta WhatsApp Business API pricing (March 2026), GCP pricing calculator, Latka SaaS database, First Page Sage CAC report, Egyptian SMB SaaS benchmarks (23HubLab, BlueWeave), Rentechdigital gym census data, competitive analysis docs.*
