# Announcement Page Interaction Validation

## Desktop preview verification

The public announcement page was verified at a 1440-pixel browser viewport. Each navigation anchor resolved to its intended section: `#platform`, `#workflow`, `#roles`, and `#resources`. Every conversion control was exercised and produced the intended route.

| Control group | Verified destination |
| --- | --- |
| Top navigation “Get started”; hero “Start a procurement request”; workflow and footer AI controls | `/app/agent` |
| Hero and final “Explore the platform”; homeowner role card | `/app/homeowner` |
| Contractor, supplier, and delivery role cards | `/app/contractor`, `/app/supplier`, `/app/logistics` |
| Platform operations control | `/app/admin` |
| Final and footer supplier controls | `/app/onboarding` |

## Mobile preview verification

The active preview browser was placed into a 390 × 844 device viewport using Chrome DevTools device emulation. The mobile menu control was opened, the responsive workflow anchor produced `#workflow`, and the mobile “Get started” action routed to `/app/agent`. The visible expanded menu state, including compact navigation links and the teal mobile conversion action, is captured in `docs/validation-assets/mobile-menu-open.png`.

## Automated checks

The announcement page passed the TypeScript check and all seven existing Vitest tests. The full Vite production build was attempted three times; it transformed all 6,282 modules but was terminated during final chunk rendering by sandbox memory limits. This does not affect the verified preview experience, but the build should be re-run in a lower-contention environment before an external distribution pipeline is required.
