# Wajenzi.AI Release Validation

## Keyboard and focus review

The public page, workspace selector, sidebar navigation, account menu, dashboard action controls, upload triggers, estimator inputs, onboarding controls, and procurement chat composer are implemented with native buttons, inputs, labels, selects, or textareas. The global design system preserves visible focus outlines through the shared `outline-ring/50` base rule. A keyboard-tab review on the live preview confirmed focusable navigation controls, account controls, call-to-action buttons, the geocoding input, and the Google Maps keyboard controls. The responsive review was completed at desktop and mobile viewports, and no visible content overlap or route dead-end was observed in the inspected landing, homeowner, logistics, agent, finance-and-risk, supplier-onboarding, and support flows.

## Maps proxy verification

The sandbox screenshot renderer operates from a loopback origin and receives a 403 response from the platform maps proxy, so the logistics screen shows a documented operational fallback route panel in that renderer. When the same proxy request is sent with the actual project preview origin and referrer, it returns HTTP 200. A browser review on that preview origin then confirmed that the interactive Google Maps canvas loaded with tiles, route context, site-location input, and native map controls. This confirms that the supplied frontend maps configuration is present and the proxy is origin-sensitive rather than unavailable for the project preview.

The logistics workspace retains the full live-map implementation for route directions, geocoding, site lookup, and driver markers. The fallback remains intentionally available as a graceful contingency when the map script cannot load.

## Automated checks

| Check | Result |
| --- | --- |
| TypeScript | Passed with `pnpm check` |
| Unit and contract tests | Passed: 3 files, 7 tests |
| Production build | Passed with `pnpm build` |
| Database migrations | Applied: marketplace schema and persisted workflow actions |
