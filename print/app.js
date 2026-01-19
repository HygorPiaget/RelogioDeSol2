/* Fortaleza Shadow Painter (static GitHub Pages version)
   Based on original functionality, with the following changes to frameFigure():
   - no legend on frame graph
   - connected q values on frame graph
*/

"use strict";

// ----------------------------
// Frame plot (two rays inside 1x1)
// ----------------------------
function frameFigure(q, p, ta, tb) {
  const u = 1 - p;

  const n = 300;

  // Light segment 0->q
  const xi1 = [];
  const etaL = [];
  for (let i = 0; i < n; i++) {
    const xi = (q * i) / (n - 1);
    let eta = ta * (q - xi) + 0.5 * (1 + p);
    eta = clamp(eta, 0, 1);
    xi1.push(xi);
    etaL.push(eta);
  }

  // Shadow segment q->xiMax
  let xiMax = 1.0;
  if (u < 2 * tb * (1 - q)) {
    xiMax = Math.min(1.0, q + u / (2 * (tb + EPS)));
  }

  const xi2 = [];
  const etaS = [];
  for (let i = 0; i < n; i++) {
    const xi = q + (xiMax - q) * (i / (n - 1));
    let eta = tb * (q - xi) + 0.5 * (1 - p);
    eta = clamp(eta, 0, 1);
    xi2.push(xi);
    etaS.push(eta);
  }

  const data = [
    // frame border
    { x: [0, 1, 1, 0, 0], y: [0, 0, 1, 1, 0], mode: "lines", name: "Quadro", line: { width: 3 } },
    // light ray
    { x: xi1, y: etaL, mode: "lines", name: "Luz (alpha)" },
    // shadow ray
    { x: xi2, y: etaS, mode: "lines", name: "Sombra (beta)" },
    // reference points at x=q
    { x: [q, q], y: [0.5 * (1 + p), 0.5 * (1 - p)], mode: "markers", name: "Junção em q" },
    // poste at x=q
    { x: [q, q], y: [0.5 * (1 + p), 0.5 * (1 - p)], mode: "lines", name: "Poste" }
  ];

  const abar = abarValue(q, p, ta, tb);

  const layout = {
    title: `Raios no quadro (q=${q.toFixed(3)}, p=${p.toFixed(3)}, Ā=${abar.toFixed(3)})`,
    xaxis: { range: [0, 1], xtitle: "x (normalizado)", constrain: "domain" },
    yaxis: { range: [0, 1], xtitle: "y (normalizado)", constrain: "domain", scaleanchor: "x", scaleratio: 1 },
    margin: { l: 40, r: 40, t: 60, b: 60 },
    showlegend: false,
  };

  return { data, layout };
}

// Defaults: today in Fortaleza (fixed -3) -> just set browser local date as a good default
setDefaultDate();

// initial render: also sets the new frameFigure() function in pq click handler
renderMain();
