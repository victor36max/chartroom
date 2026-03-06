import embed from "vega-embed";

// Expose renderVegaLite to the Playwright page context
(window as unknown as Record<string, unknown>).renderVegaLite = async (
  spec: Record<string, unknown>,
  data: Record<string, unknown>[]
) => {
  const container = document.getElementById("chart-container")!;
  container.innerHTML = "";

  // Inject data
  const fullSpec = { ...spec, data: { values: data } };

  await embed(container, fullSpec as Parameters<typeof embed>[1], {
    actions: false,
    renderer: "svg",
  });
};
