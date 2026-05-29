/* ============================================================
   ARITHMIX Explainer — History seeding & navigation
   ============================================================ */

/* History seeding — runs synchronously before any other explainer code so
   the first browser Back from /explainer is guaranteed to land on a /
   entry in menu state. Idempotent: a `seeded` marker on history.state
   prevents re-seeding across refresh, bfcache restore, or repeat visits. */
(function seedHistoryIfNeeded() {
  if (history.state && history.state.seeded === true) return;

  const params = new URLSearchParams(window.location.search);
  const fromApp = params.get("from") === "app";

  if (fromApp) {
    // In-app push from game.js — a menu entry already sits behind us.
    // Strip the query and mark this entry seeded.
    history.replaceState(
      { arithmix: "explainer", seeded: true },
      "",
      "/explainer"
    );
  } else {
    // Direct load (typed URL, bookmark, external link). Synthesize a menu
    // entry behind us by replacing the current entry with `/` then pushing
    // `/explainer` back on top. URL ends back at /explainer; history has
    // [{/,menu}, {/explainer,seeded}].
    history.replaceState({ arithmix: "menu" }, "", "/");
    history.pushState(
      { arithmix: "explainer", seeded: true },
      "",
      "/explainer"
    );
  }
})();

/* Companion to the seeding IIFE above. In the direct-load branch the
   synthesized menu entry is same-document with /explainer, so a browser/
   in-app Back fires popstate but does NOT load game.html — the user stays
   visually on the explainer. Force a real load of `/` when popstate lands
   on the seeded menu state so the first Back from /explainer actually
   reaches the menu.

   In the in-app branch the menu entry belongs to a different document
   (game.html) so popstate doesn't fire on this document — the handler is
   inert there, which is what we want. */
window.addEventListener("popstate", (e) => {
  if (e.state && e.state.arithmix === "menu") {
    window.location.replace("/");
  }
});
