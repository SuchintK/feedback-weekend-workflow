/* Optional diagram enhancement. Prose and Mermaid source remain available offline. */
(async () => {
  const diagrams = [...document.querySelectorAll("pre.mermaid")];
  if (!diagrams.length) return;
  try {
    const { default: mermaid } =
      await import("https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.esm.min.mjs");
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      flowchart: { htmlLabels: false },
    });
    for (const [index, source] of diagrams.entries()) {
      try {
        const { svg } = await mermaid.render(
          "understanding-diagram-" + index,
          source.textContent
        );
        const output = document.createElement("div");
        output.className = "diagram-output";
        output.setAttribute("role", "img");
        output.setAttribute(
          "aria-label",
          source.closest("figure")?.querySelector("figcaption")?.textContent ||
            "Workflow diagram; source follows."
        );
        output.innerHTML = svg;
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Mermaid source";
        source.before(output, details);
        details.append(summary, source);
      } catch (error) {
        console.warn("Documentation diagram could not render:", error);
        const note = document.createElement("p");
        note.className = "meta";
        note.textContent =
          "Diagram rendering unavailable. Read the Mermaid source and explanation below.";
        source.before(note);
      }
    }
  } catch {
    // Offline reading needs no network: source and captions stay visible.
  }
})();
