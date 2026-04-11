# Future GymFlow Reports

> Status: Legacy backlog notes
> Source of truth for reporting priorities: `docs/features/reports-optimization-roadmap.md`

This document is no longer the implementation source of truth.

Use it only for:
- low-priority backlog ideas not yet promoted into the main roadmap
- rough idea capture before a report is formally scoped

If a report exists in both this file and the main roadmap, the main roadmap wins.

## Excluded Reports for Future Consideration

### 0. Income by Plan Type

*   **Description:** Break down income by plan type or plan duration so gym owners can see which subscription shapes generate the most revenue. Examples: 1-month, 3-month, 6-month, 12-month, session-limited plans, and PT-linked plan buckets if added later.
*   **Value:** Helps owners understand what actually sells, which plans drive the most money, and whether shorter or longer plans are performing better.
*   **Data Sources:** Canonical income/payment events, `subscriptions.plan_months`, future plan metadata if explicit plan types are added.
*   **Complexity:** Moderate. Must stay aligned with the cycle-based renewal model so renewed cycles are counted correctly and not double-counted.

### 1. Churn Prediction/Risk Assessment

*   **Description:** This report would identify members exhibiting patterns that suggest they are likely to cancel their membership soon. Such patterns could include declining attendance, upcoming subscription expiry without recent activity, or consistently low session usage relative to their plan.
*   **Value:** Allows gym owners to proactively engage with at-risk members, offering incentives, support, or personalized outreach to improve retention rates.
*   **Data Sources:** `logs` (attendance frequency), `subscriptions` (end_date, renewal patterns), `quotas` (sessions_used vs. sessions_cap), `settings` (warning thresholds).
*   **Complexity:** Requires robust data analysis to define churn indicators and potentially machine learning models for predictive accuracy.

### 2. Member Lifetime Value (LTV) Insights

*   **Description:** This report would calculate and visualize the estimated total revenue a member is expected to generate over the entire duration of their relationship with the gym. It could also segment members by LTV to identify high-value customer groups.
*   **Value:** Helps gym owners understand the long-term profitability of their customer base, optimize marketing spend (e.g., knowing how much can be spent to acquire a customer), and tailor retention strategies for different segments.
*   **Data Sources:** `subscriptions` (price_paid, plan_months, member_id, created_at), `guest_passes` (price_paid if linked to a member).
*   **Complexity:** Accurate LTV calculation often requires historical data and sometimes predictive modeling for future value.

### 3. WhatsApp Message Delivery & Engagement

*   **Description:** This report would track the performance of automated WhatsApp messages sent via GymFlow. It would detail delivery rates, read receipts (if WhatsApp API allows), response rates, and potentially link message campaigns to user actions (e.g., renewal after a reminder).
*   **Value:** Provides insights into the effectiveness of communication strategies, helps optimize message content and timing, and identifies any technical issues with the WhatsApp integration.
*   **Data Sources:** `message_queue` (status, sent_at, last_error), potentially external WhatsApp API logs (if available and integrated).
*   **Complexity:** Relies heavily on the capabilities and detailed logging of the WhatsApp API integration, which might require additional development to capture granular engagement data.
