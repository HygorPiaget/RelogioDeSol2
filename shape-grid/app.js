/* Fortaleza Shadow Painter (static GitHub Pages version)
   Port of the original Dash/Python app logic:
   - NOAA-style solar azimuth/elevation
   - alpha/beta model
   - Abar(q,p) heatmap + Abar=0.5 curve
   - click on curve -> frame plot
*/

"use strict";

function shadeClipPath(qSel, pSel, ta, tb) {
  const q = Number(qSel);
  const p = Number(pSel);
  const u = 1 - p;

  const n = 300;

  // Light segment 0->q
  const xi1 = [];
  const etaL = [];
  let ky1 = 0;

  for (let i = 0; i < n; i++) {
    const xi = (q * i) / (n - 1);
    let eta = ta * (q - xi) + 0.5 * (1 + p);
    eta = clamp(eta, 0, 1);
    xi1.push(xi);
    etaL.push(eta);

    if (Math.abs(1.0 - eta) < 1e-12) {
      ky1 = i;
    }
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

  const L0 = [xi1[ky1], etaL[ky1]];
  const Ln = [xi1[n - 1], etaL[n - 1]];

  const S0 = [xi2[0], etaS[0]];
  const Sn = [xi2[n-1], etaS[n-1]];


  // Left shape
  const Lclip = [];

  if (L0[1] > 0.9999999) {
    Lclip.push("0% calc(100% - 100%)");
  }

  Lclip.push(`${(L0[0] * 100).toFixed(3)}% ${(100 - L0[1] * 100).toFixed(3)}%`);
  Lclip.push(`${(Ln[0] * 100).toFixed(3)}% ${(100 - Ln[1] * 100).toFixed(3)}%`);
  Lclip.push(`${(S0[0] * 100).toFixed(3)}% ${(100 - S0[1] * 100).toFixed(3)}%`);
  Lclip.push(`${(Sn[0] * 100).toFixed(3)}% ${(100 - Sn[1] * 100).toFixed(3)}%`);

  if (Sn[1] > 1e-12) {
    Lclip.push("100% calc(100% - 0%)");
  }

  Lclip.push("0% calc(100% - 0%)");

  // Right shape
  const Rclip = [];

  Rclip.push(`${(L0[0] * 100).toFixed(3)}% ${(100 - L0[1] * 100).toFixed(3)}%`);
  Rclip.push(`${(Ln[0] * 100).toFixed(3)}% ${(100 - Ln[1] * 100).toFixed(3)}%`);
  Rclip.push(`${(S0[0] * 100).toFixed(3)}% ${(100 - S0[1] * 100).toFixed(3)}%`);
  Rclip.push(`${(Sn[0] * 100).toFixed(3)}% ${(100 - Sn[1] * 100).toFixed(3)}%`);

  if (Sn[0] < 1) {
    Rclip.push("100% calc(100% - 0%)");
  }

  Rclip.push("100% calc(100% - 100%)");

  if (L0[0] < 1e-12) {
    Rclip.push("0% calc(100% - 100%)");
  }

  return Lclip.join(",");
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

const elColorL = document.getElementById("l_color");
const elColorS = document.getElementById("s_color");

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

      const clipPath = shadeClipPath(qSel, pSel, ta, tb);

      const elShape = document.createElement("div");
      elShape.classList.add("plot-shape");
      elShape.style.clipPath = `polygon(${clipPath})`;
      elShape.style.backgroundColor = elColorS.value;
      elGridPlot.style.backgroundColor = elColorL.value;

      if (hh > 11) {
        elShape.style.transform = "scaleX(-1)";
        // elShape.style.backgroundColor = elColorL.value;
        // elGridPlot.style.backgroundColor = elColorS.value;
      }
      elGridPlot.appendChild(elShape);
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
