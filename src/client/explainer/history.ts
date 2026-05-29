// ============================================================================
// EXPLAINER — History seeding & navigation
// ============================================================================

export function seedHistoryIfNeeded(): void {
  if (history.state && history.state.seeded === true) return;

  const params = new URLSearchParams(window.location.search);
  const fromApp = params.get("from") === "app";

  if (fromApp) {
    history.replaceState(
      { arithmix: "explainer", seeded: true },
      "",
      "/explainer"
    );
  } else {
    history.replaceState({ arithmix: "menu" }, "", "/");
    history.pushState(
      { arithmix: "explainer", seeded: true },
      "",
      "/explainer"
    );
  }
}

export function bindPopstate(): void {
  window.addEventListener("popstate", (e) => {
    if (e.state && e.state.arithmix === "menu") {
      window.location.replace("/");
    }
  });
}
