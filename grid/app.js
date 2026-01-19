/* Fortaleza Shadow Painter (static GitHub Pages version)
   Port of the original Dash/Python app logic:
   - NOAA-style solar azimuth/elevation
   - alpha/beta model
   - Abar(q,p) heatmap + Abar=0.5 curve
   - click on curve -> frame plot
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
    { x: [q, q], y: [0.5 * (1 + p), 0.5 * (1 - p)], mode: "lines", name: "Poste" },
  ];

  const abar = abarValue(q, p, ta, tb);
  const layout = {
    xtitle: `Raios no quadro (q=${q.toFixed(3)}, p=${p.toFixed(3)}, Ā=${abar.toFixed(3)})`,
    xaxis: { range: [0, 1], visible: false, xtitle: "x (normalizado)", constrain: "domain" },
    yaxis: { range: [0, 1], visible: false, xtitle: "y (normalizado)", constrain: "domain", scaleanchor: "x", scaleratio: 1 },
    margin: { l: 0, r: 0, t: 0, b: 0 },
    showlegend: false,
  };

  return { data, layout };
}

const elGrid = document.getElementById("grid-container");

const elMonthMin = document.getElementById("month-min");
const elMonthMax = document.getElementById("month-max");
const elMonthStep = document.getElementById("month-step");

const elHourMin = document.getElementById("hour-min");
const elHourMax = document.getElementById("hour-max");
const elHourStep = document.getElementById("hour-step");

const elPselMin = document.getElementById("psel-min");
const elPselMax = document.getElementById("psel-max");

const elAbar = document.getElementById("a_bar");

// NOTE: this can be improved with binary search on ordered arrays
function findClosestIdx(vals, val) {
  let minIdx = 0;
  let minDiff = Math.abs(vals[0] - val);

  for (let i = 0; i < vals.length; i++) {
    let diff = Math.abs(vals[i] - val);
    if (diff < minDiff) {
      minIdx = i;
      minDiff = diff;
    }
  }
  return minIdx;
}

const [HHMIN, HHMAX] = [6, 17];
const [MMIN, MMAX] = [1, 12];
const [STEPMIN, STEPMAX] = [1, 12];
const [PMIN, PMAX] = [0.0, 1.0];
const MONTHS = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "sep", "out", "nov", "dez"];

function renderGrid() {
  const [y, d, mm] = [2026, 1, 0];

  const hPole = Number(elHPole.value);
  const abar = clamp(Number(elAbar.value), 0.0, 1.0);

  const pSelMin = clamp(Number(elPselMin.value), PMIN, PMAX);
  const pSelMax = clamp(Number(elPselMax.value), PMIN, PMAX);
  const pSelRange = pSelMax - pSelMin;

  const hhMin = clamp(Number(elHourMin.value), HHMIN, HHMAX);
  const hhMax = clamp(Number(elHourMax.value), HHMIN, HHMAX);
  const hhStep = clamp(Number(elHourStep.value), STEPMIN, STEPMAX);

  const mMin = clamp(Number(elMonthMin.value), MMIN, MMAX);
  const mMax = clamp(Number(elMonthMax.value), MMIN, MMAX);
  const mStep = clamp(Number(elMonthStep.value), STEPMIN, STEPMAX);

  const mCnt = parseInt((hhMax - hhMin + 1) / hhStep);

  elGrid.innerHTML = "";
  const elGridRow = document.createElement("div");
  elGridRow.classList.add("grid-row");
  elGrid.appendChild(elGridRow);
  for (let hh = hhMin; hh <= hhMax; hh += hhStep) {
    const elColumnLabel = document.createElement("div");
    elColumnLabel.classList.add("grid-column-label");
    elColumnLabel.style.width = `${100 / mCnt}%`;
    elGridRow.appendChild(elColumnLabel);
    elColumnLabel.innerHTML = `000${hh}:00`.slice(-5);
  }

  for (let m = mMin; m <= mMax; m+=mStep) {
    const elGridRow = document.createElement("div");
    elGridRow.classList.add("grid-row");
    elGrid.appendChild(elGridRow);

    const elRowLabel = document.createElement("div");
    elRowLabel.classList.add("grid-row-label");
    elGridRow.appendChild(elRowLabel);
    elRowLabel.innerHTML = `${MONTHS[m]}`;

    for (let hh = hhMin; hh <= hhMax; hh += hhStep) {
      const hh01 = (hh - hhMin) / (hhMax - hhMin);
      const pSel = hh01 * pSelRange + pSelMin;

      const elGridPlot = document.createElement("div");
      elGridPlot.classList.add("grid-plot");
      elGridPlot.style.width = `${100 / mCnt}%`;
      elGridRow.appendChild(elGridPlot);

      const out = computeAlphaBeta(y, m, d, hh, mm, hPole);
      if (!isFinite(out.alpha_rad) || !isFinite(out.beta_rad)) continue;

      const ta = Math.tan(out.alpha_rad);
      const tb = Math.tan(out.beta_rad);

      const nq = 180;
      const qVals = Array.from({ length: nq }, (_, i) => 0.001 + (0.998 * i) / (nq - 1));
      const zp = abarGrid(qVals, [pSel], ta, tb)[0];
      const qIdx = findClosestIdx(zp, abar);
      const qSel = qVals[qIdx];

      const { data: fData, layout: fLayout } = frameFigure(qSel, pSel, ta, tb);
      Plotly.newPlot(elGridPlot, fData, fLayout, { responsive: true });
    }
  }
}

elBtn.removeEventListener("click", renderMain);
elBtn.addEventListener("click", renderGrid);

function unrenderMain() {
  elPQ.remove();
  elFrame.remove();
  elAngles.remove();
  return;
}

// initial render
setTimeout(unrenderMain, 1);
setTimeout(renderGrid, 5);
