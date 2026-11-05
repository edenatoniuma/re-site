# Metic Studio homepage archive

Source: https://metic.studio/en

This is a local archival copy of the publicly served English homepage, including its
original HTML, compiled application bundles, typefaces and images. It is not a new
React implementation. Original branding, copy and attribution remain intact.

The gallery serves `src/data/metic.html` at `/demos/metic/`. Assets are scoped to this
directory. `local.js` omits analytics/prefetch requests and opens homepage subpage
links on the original site. The image loader uses downloaded source images because
this static archive has no Next.js image optimization server. Local exploration
state is namespaced separately from the original site's storage keys.

Refresh from the project root with `node scripts/capture-metic.mjs`.
The original site's assets remain the work of their respective authors.
