# OathFi News Module Spec

## Scope

The news module is a market-intelligence input layer. It supports research, risk scoring, audit references, and paper-only decision context. It must not present synthetic content as live reporting or expose placeholder links in a formal demo.

## Layout Rules

- News panels must render complete cards in Command Center and Market Monitor.
- Parent grid and flex containers must use `min-height: 0` where nested scrolling is required.
- The app workspace must reserve the workflow stepper row separately from the scrollable page row.
- News lists must be scrollable inside constrained panels, with bottom padding so the last card is not hidden by panel edges or the bottom status bar.
- Bottom status UI must not overlay or obscure news cards.

## Data Model

Each normalized news item must support:

```ts
titleZh: string;
summaryZh: string;
titleEn: string;
summaryEn: string;
titleOriginal: string;
summaryOriginal: string;
sourceUrl?: string;
sourceDomain?: string;
urlVerified: boolean;
```

Compatibility fields `title` and `summary` may remain for non-UI consumers, but UI rendering must use locale-aware selection:

- Chinese UI: prefer `titleZh` and `summaryZh`.
- English UI: prefer `titleEn` and `summaryEn`.
- If a localized field is unavailable, fall back to original fields, then the other locale.

Mock news must include real Chinese title and summary content. Chinese UI must not display English body copy for mock items.

## Source Authenticity

- Mock or synthetic news must not show an original-source link.
- Live news must include a real `sourceUrl`, a derived or provided `sourceDomain`, and `urlVerified: true`.
- The frontend must display source type, source domain, and URL verification status for every news card.
- Formal demos must not contain links whose URL includes `example.com`, `fake`, `mock`, or `placeholder`.
- If a live item lacks a verified HTTPS URL, the item must be treated as unverified and no source link may be rendered.

## UI Requirements

- `NewsItemCard` must render localized title and summary text.
- `NewsItemCard` must show `sourceStatus`, `sourceDomain` or a synthetic-source fallback, and URL verification state.
- The original-source action may render only when `sourceUrl` exists and `urlVerified` is true.
- Audit news references must use the same locale-aware text selection as the main feed.

## Acceptance

- News cards are fully visible in Market Monitor and Command Center.
- The news area scrolls normally when content exceeds its available height.
- Chinese mode displays Chinese mock titles and summaries.
- Mock/synthetic items show no original-source link.
- No formal-demo source URL contains `example.com`, `fake`, `mock`, or `placeholder`.
