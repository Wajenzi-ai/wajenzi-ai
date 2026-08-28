# Construction Backdrop Visual QA

## Desktop public page

The 1280 × 720 public-page review confirms that the dark construction image remains **subordinate to the interface**. Tower-crane and machinery silhouettes are faintly legible in the right and center background, while the white headline, teal emphasis, CTA labels, navigation, and agent-preview content remain visually distinct against the charcoal overlay. The image reinforces construction context without competing with the hero message.

## Mobile public page

The 390 × 844 review confirms that the construction backdrop remains visible as a low-contrast site layer behind the compact hero. The crane and machinery forms are intentionally subtle; the dark left-to-right protection layer keeps the headline, supporting copy, buttons, and checklist readable. The mobile navigation continues to retain its opaque dark panel, preserving control contrast.

## Dashboard separation

The Homeowner workspace review confirms that dashboards remain on the existing light operational canvas with the navy-and-amber side navigation. The public-page backdrop is scoped to the `Home` experience and does not bleed into role workspaces, preserving a deliberate distinction between the public construction narrative and data-oriented dashboard tasks.

## Higher-visibility crane refinement

The final 1280 × 720 review confirms that the tower cranes, crane booms, and site machinery are now clearly recognizable in the upper-right and mid-right hero background. The left-side dark protection gradient keeps the headline and supporting copy crisp, while the opaque agent preview preserves its own contrast and legibility. The primary teal CTA and secondary dark CTA remain visually distinct from the image.

The final 390 × 844 mobile review confirms that the crane boom and tower silhouette are intentionally more apparent behind the hero without overtaking the compact layout. The white headline, muted supporting text, teal primary CTA, secondary CTA, checklist, and top navigation remain readable with clear separation from the charcoal-and-teal construction image.

## Conversational hero refinement

The desktop review confirms that the new project-prompt bar has a clear conversational input area, attachment affordance, submit action, suggested starting prompts, and the requested **Start project** and **Find suppliers** controls directly beneath it. The crane backdrop remains visible behind the right-side agent preview without reducing the prompt, button, or headline contrast.

The 390 × 844 mobile review confirms that the prompt bar, suggestions, and the two full-width action controls stack cleanly in the hero. The input, send affordance, **Start project**, and **Find Suppliers** remain distinct against the machinery background.

Destination handoff was also confirmed with separate browser flows. A typed homeowner brief appears in a **New project brief** card after Start project opens the Homeowner workspace, including an explicit AI-procurement continuation action. A distinct supplier-sourcing brief appears in the Marketplace as **Project brief ready for sourcing**, with a **Use with AI** action. The shared storage helper is covered by automated tests to ensure the brief is trimmed, retained for both destination flows, and cleared only on explicit dismissal.

The final desktop and 390 × 844 mobile reviews confirm the exact **Find Suppliers** label and the responsive stacked action layout. The same event handlers are used at both breakpoints; route checks verify the project and supplier destinations, while the mobile review confirms their full-width controls remain visibly reachable. A final send-arrow browser check confirms that a newly typed brief is displayed as the AI Procurement **Current project** context, taking precedence over an older marketplace shortlist.

An independent Chromium mobile-browser interaction check then exercised both actions at **390 × 844**. It entered unique project briefs, selected **Start project** and **Find Suppliers**, confirmed the `/app/homeowner` and `/marketplace` route transitions, and asserted that each destination rendered its carried brief. This closes the mobile action verification beyond the responsive screenshot review.

## Footer directory and stronger construction treatment

The final desktop review confirms that the crane boom, tower, machinery, and active-site forms are markedly more visible behind the hero, while the left-side prompt, headline, navigation, and primary actions maintain clear charcoal-and-teal contrast. The Wajenzi.AI wordmark now uses a restrained small-caps treatment for both the header and public footer.

The footer has been expanded into a responsive directory covering material categories, construction services, role-specific workspaces, and platform destinations. The 390 × 844 review confirms that this directory stacks into readable groups without horizontal overflow. Representative **Roofing systems** and **AI procurement** footer links were click-checked to confirm marketplace and AI Procurement routing.

The footer category directory now loads the full supplier-published marketplace taxonomy, with every category opening a matching filtered Marketplace view through its category query parameter. A real Chromium 390 × 844 interaction regression verified both a live **roofing** category route and the **AI procurement** service destination in addition to the existing conversational-hero actions.

## Manufacturer discovery and contractor take-off refinement

The public page now presents the supplied Wajenzi Stores wordmark in an internal marketplace-source card and a horizontally scrollable manufacturer-discovery carousel. The retained MRM and Crown Paints external cards were browser-verified against their official sites. The carousel explicitly avoids claiming verified commercial partnerships or supplier availability.

The dense capability grid was reduced to three primary operating-system pillars. A new contractor take-off section uses a white-line architectural-plan overlay with minimal dark fill, preserving the visible construction background while explaining the BOQ or plan upload, review, and estimation path. The public footer background was reduced to a translucent layer so the underlying construction image remains present beneath the directory.

Desktop and 390 × 844 mobile reviews confirm readability of the carousel, transparent plan overlay, contractor actions, and footer directory. The retained MRM and Crown Paints cards were directly click-tested from the final public carousel and opened their official manufacturer pages. The mobile Chromium regression confirms that the Wajenzi Stores asset renders and its internal marketplace action routes correctly; **Upload BOQ or plan** opens AI Procurement with the contractor take-off context; and representative live category plus AI service links continue to route correctly.

## Homepage copy refresh

The supplied Wajenzi.AI copy was applied without changing the approved public layout, imagery, component hierarchy, or routes. Desktop and 390 × 844 mobile reviews confirm that the revised hero, six project-prompt suggestions, construction-intelligence explanation, role messaging, final CTA, and footer strapline remain readable within the existing charcoal, teal, and crane-background treatment. The revised **Start a Project** hero control was click-tested and continues to open the existing Homeowner workspace.

The final copy pass preserves the full Plan, Source, Compare, Procure, Deliver, and Manage sequence, the five supplied trust proof points, and an explicit **Architects & professionals** role card inside the existing design components. Fresh prompt checks confirm that the hero send action loads the entered brief in AI Procurement and that Find Suppliers carries the same new brief into Marketplace. The expanded real 390 × 844 interaction regression confirms the revised hero, contractor project-start, final Start a Project CTA, category, and AI service actions retain their existing routes.

## Official logo and hero-badge refinement

The visual-editor target was confirmed as the hero’s construction-intelligence badge. Its markup has been directly removed from the homepage—rather than merely hidden—without changing the hero prompt, headline, actions, agent preview, or backdrop. The supplied Wajenzi logo was background-removed, tightly cropped, uploaded as a durable public asset, and used by the shared public wordmark component in both the header and footer.

Desktop and 390 × 844 mobile reviews confirm that the transparent logo remains clear on the dark public background and that the hero now begins directly with its headline. Type checking passed after the branding update.
