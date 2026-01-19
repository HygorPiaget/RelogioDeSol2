/* Fortaleza Shadow Painter (static GitHub Pages version)
   Port of the original Dash/Python app logic:
   - NOAA-style solar azimuth/elevation
   - alpha/beta model
   - Abar(q,p) heatmap + Abar=0.5 curve
   - click on curve -> frame plot
*/

"use strict";

// ----------------------------
// Fixed location: Fortaleza
// ----------------------------
const LAT_DEG = -3.731862;
const LON_DEG = -38.526669;
const TZ_OFFSET_HOURS = -3.0;

// Matplotlib-like OrRd colorscale (light orange -> dark red)
const ORRD = [
  [0.0, "#fff7ec"],
  [0.125, "#fee8c8"],
  [0.25, "#fdd49e"],
  [0.375, "#fdbb84"],
  [0.5, "#fc8d59"],
  [0.625, "#ef6548"],
  [0.75, "#d7301f"],
  [0.875, "#b30000"],
  [1.0, "#7f0000"]
];

// Ā isolines to draw on top of the heatmap
const LEVELS = [0.25, 0.5, 0.75];
 // Fortaleza (UTC-3)
const D_OBS = 3.0;            // observer distance to pole (m)
const EYE_H = 1.5;            // eye height (m)
// Abar level

const EPS = 1e-15;
const deg2rad = (d) => d * Math.PI / 180.0;
const rad2deg = (r) => r * 180.0 / Math.PI;

function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }

// ----------------------------
// Julian day (UTC Date -> float)
// ----------------------------
function julianDayUTC(dtUtc) {
  // dtUtc is a Date, interpreted in UTC via getUTC* getters.
  let year = dtUtc.getUTCFullYear();
  let month = dtUtc.getUTCMonth() + 1;
  const day = dtUtc.getUTCDate();
  const hour =
    dtUtc.getUTCHours() +
    dtUtc.getUTCMinutes() / 60 +
    dtUtc.getUTCSeconds() / 3600 +
    dtUtc.getUTCMilliseconds() / 3.6e6;

  if (month <= 2) { year -= 1; month += 12; }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);

  const JD0 = Math.floor(365.25 * (year + 4716))
            + Math.floor(30.6001 * (month + 1))
            + day + B - 1524.5;

  return JD0 + hour / 24.0;
}

// ----------------------------
// Solar azimuth/elevation (NOAA-style)
// Returns azimuth_deg (0=N,90=E,180=S,270=W) and elevation_deg
// ----------------------------
function solarAzElNoaa(localY, localM, localD, localHH, localMM, localSS, latDeg, lonDeg, tzOffsetHours) {
  // Build a UTC Date corresponding to the provided local time with fixed tz offset.
  // UTC = local - tzOffsetHours (since tzOffsetHours is negative for UTC-3, this adds 3h).
  const utcHour = localHH - tzOffsetHours;
  const dtUtc = new Date(Date.UTC(localY, localM - 1, localD, utcHour, localMM, localSS || 0, 0));

  const jd = julianDayUTC(dtUtc);
  const T = (jd - 2451545.0) / 36525.0;

  const L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360.0;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  const Mrad = deg2rad(M);
  const C =
    Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mrad) * 0.000289;

  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambdaApp = trueLong - 0.00569 - 0.00478 * Math.sin(deg2rad(omega));

  const eps0 = 23.0 + (26.0 + (21.448 - T * (46.815 + T * (0.00059 - 0.001813 * T))) / 60.0) / 60.0;
  const eps = eps0 + 0.00256 * Math.cos(deg2rad(omega));

  const epsRad = deg2rad(eps);
  const lamRad = deg2rad(lambdaApp);
  const decl = Math.asin(Math.sin(epsRad) * Math.sin(lamRad));

  const y = Math.pow(Math.tan(epsRad / 2.0), 2);
  const L0rad = deg2rad(L0);
  const eqTime = 4.0 * rad2deg(
    y * Math.sin(2 * L0rad) -
    2 * e * Math.sin(Mrad) +
    4 * e * y * Math.sin(Mrad) * Math.cos(2 * L0rad) -
    0.5 * y * y * Math.sin(4 * L0rad) -
    1.25 * e * e * Math.sin(2 * Mrad)
  );

  const minutes = localHH * 60.0 + localMM + (localSS || 0) / 60.0;
  const timeOffset = eqTime + 4.0 * lonDeg - 60.0 * tzOffsetHours;
  const tst = (minutes + timeOffset) % 1440.0;

  let ha = tst / 4.0 - 180.0;
  if (ha < -180.0) ha += 360.0;

  const latRad = deg2rad(latDeg);
  const haRad = deg2rad(ha);

  let cosZenith = Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(haRad);
  cosZenith = clamp(cosZenith, -1.0, 1.0);
  const zenith = Math.acos(cosZenith);
  const elevation = 90.0 - rad2deg(zenith);

  const az = (rad2deg(Math.atan2(
    Math.sin(haRad),
    Math.cos(haRad) * Math.sin(latRad) - Math.tan(decl) * Math.cos(latRad)
  )) + 180.0) % 360.0;

  return { azimuth_deg: az, elevation_deg: elevation };
}

// ----------------------------
// alpha/beta model (same as Python)
// ----------------------------
function computeAlphaBeta(localY, localM, localD, localHH, localMM, hPole) {
  const { azimuth_deg: Adeg, elevation_deg: Edeg } =
    solarAzElNoaa(localY, localM, localD, localHH, localMM, 0, LAT_DEG, LON_DEG, TZ_OFFSET_HOURS);

  if (Edeg <= 0) {
    return {
      azimuth_deg: Adeg, elevation_deg: Edeg,
      alpha_rad: NaN, beta_rad: NaN, alpha_deg: NaN, beta_deg: NaN,
      shadow_length_m: NaN, rho_m: NaN
    };
  }

  const A = deg2rad(Adeg);
  const E = deg2rad(Edeg);

  const x_east = Math.cos(E) * Math.sin(A);
  const z_up = Math.sin(E);

  const alpha = Math.atan2(z_up, Math.abs(x_east) + EPS);

  const s = hPole / Math.tan(E);

  const x_tip = -s * Math.sin(A);
  const y_tip = -s * Math.cos(A);

  const rho = Math.sqrt(x_tip * x_tip + Math.pow(y_tip - D_OBS, 2));
  //const beta = Math.atan2(EYE_H, rho + EPS);
  const beta = Math.atan( Math.abs(EYE_H * Math.cos(A)) / Math.abs(D_OBS * Math.sin(A)));

  return {
    azimuth_deg: Adeg, elevation_deg: Edeg,
    alpha_rad: alpha, beta_rad: beta,
    alpha_deg: rad2deg(alpha), beta_deg: rad2deg(beta),
    shadow_length_m: s, rho_m: rho
  };
}

// ----------------------------
// Abar(q,p) and curve Abar=level
// ----------------------------
function abarValue(q, p, ta, tb) {
  const u = 1.0 - p;

  // Light
  const L_sem = 0.5 * q * (ta * q + 2.0 - u);
  const L_com = q - (u * u) / (8.0 * (ta + EPS));
  const L = (u >= 2.0 * ta * q) ? L_sem : L_com;

  // Shadow
  const S_ate = 0.5 * (1.0 - q) * (u - tb * (1.0 - q));
  const S_zero = (u * u) / (8.0 * (tb + EPS));
  const S = (u >= 2.0 * tb * (1.0 - q)) ? S_ate : S_zero;

  return L + S;
}

function abarGrid(qVals, pVals, ta, tb) {
  // z is array-of-arrays: rows correspond to p (y), cols correspond to q (x)
  const z = new Array(pVals.length);
  for (let i = 0; i < pVals.length; i++) {
    const p = pVals[i];
    const row = new Array(qVals.length);
    for (let j = 0; j < qVals.length; j++) {
      row[j] = abarValue(qVals[j], p, ta, tb);
    }
    z[i] = row;
  }
  return z;
}

function curvePointsAbarHalf(ta, tb, level, n) {
  const ptsQ = [];
  const ptsP = [];
  const epsHalf = 2e-4;

  for (let i = 0; i < n; i++) {
    const q = 1e-4 + (1 - 2e-4) * (i / (n - 1));
    const uL = 2 * ta * q;
    const uS = 2 * tb * (1 - q);

    // Case I (avoid q~0.5)
    if (Math.abs(q - 0.5) > epsHalf) {
      const den = (1 - 2 * q);
      const uI = (2 * level - ta * q * q - 2 * q + tb * Math.pow(1 - q, 2)) / den;
      if (uI >= 0 && uI <= 1 && uI >= 2 * ta * q && uI >= 2 * tb * (1 - q)) {
        ptsQ.push(q);
        ptsP.push(1 - uI);
      }
    }

    // Case II
    let rad2 = tb * ((tb - ta) * q * q - 2 * q + 2 * level);
    if (rad2 < 0) rad2 = 0;
    const root2 = Math.sqrt(rad2);
    for (const sgn of [+1, -1]) {
      const u2 = 2 * tb * q + sgn * 2 * root2;
      if (rad2 >= 0 && u2 >= 0 && u2 <= 1 && u2 >= uL && u2 < uS) {
        ptsQ.push(q);
        ptsP.push(1 - u2);
      }
    }

    // Case III
    let rad3 = ta * ((ta - tb) * Math.pow(1 - q, 2) + 2 * q - 2 * level);
    if (rad3 < 0) rad3 = 0;
    const root3 = Math.sqrt(rad3);
    for (const sgn of [+1, -1]) {
      const u3 = 2 * ta * (1 - q) + sgn * 2 * root3;
      if (rad3 >= 0 && u3 >= 0 && u3 <= 1 && u3 < uL && u3 >= uS) {
        ptsQ.push(q);
        ptsP.push(1 - u3);
      }
    }

    // Case IV
    if (Math.abs(ta - tb) > 1e-12) {
      const rad4 = 8 * (level - q) * ta * tb / (ta - tb);
      if (rad4 > 0) {
        const u4 = Math.sqrt(rad4);
        if (u4 >= 0 && u4 <= 1 && u4 < uL && u4 < uS) {
          ptsQ.push(q);
          ptsP.push(1 - u4);
        }
      }
    }
  }

  return { q: ptsQ, p: ptsP };
}

// ----------------------------
// Frame plot (two rays inside 1x1)
// ----------------------------
function frameFigure(qSel, pSel, ta, tb) {
  const q = Number(qSel);
  const p = Number(pSel);
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
    { x: [q, q], y: [0.5 * (1 + p), 0.5 * (1 - p)], mode: "markers", name: "Junção em q" }
  ];

  const abar = abarValue(q, p, ta, tb);
  const layout = {
    title: `Raios no quadro (q=${q.toFixed(3)}, p=${p.toFixed(3)}, Ā=${abar.toFixed(3)})`,
    xaxis: { range: [0, 1], title: "x (normalizado)", constrain: "domain" },
    yaxis: { range: [0, 1], title: "y (normalizado)", scaleanchor: "x", scaleratio: 1 },
    margin: { l: 40, r: 10, t: 40, b: 40 }
  };

  return { data, layout };
}

// ----------------------------
// UI wiring
// ----------------------------
const elDate = document.getElementById("date");
const elTime = document.getElementById("time");
const elHPole = document.getElementById("h_pole");
const elBtn  = document.getElementById("btn");
const elAngles = document.getElementById("angles");
const elPQ = document.getElementById("pq");
const elFrame = document.getElementById("frame");

// Defaults: today in Fortaleza (fixed -3) -> just set browser local date as a good default

function findLabelPosFromGrid(qVals, pVals, z, lvl, qTarget, pTarget) {
  // Pick a representative point ON the contour by looking for grid cells where (z-lvl) changes sign.
  // This is robust and consistent with the contouring of the same grid.
  const nq = qVals.length;
  const np = pVals.length;

  let best = null;
  let bestScore = 1e99;
  let foundCrossing = false;

  const qMin = 0.05, qMax = 0.95;
  const pMin = 0.05, pMax = 0.95;

  for (let i = 0; i < np - 1; i++) {
    const p0 = pVals[i], p1 = pVals[i + 1];
    for (let j = 0; j < nq - 1; j++) {
      const q0 = qVals[j], q1 = qVals[j + 1];

      const f00 = z[i][j] - lvl;
      const f01 = z[i][j + 1] - lvl;
      const f10 = z[i + 1][j] - lvl;
      const f11 = z[i + 1][j + 1] - lvl;

      const minf = Math.min(f00, f01, f10, f11);
      const maxf = Math.max(f00, f01, f10, f11);

      // No sign change => contour does not cross this cell
      if (minf > 0 || maxf < 0) continue;

      foundCrossing = true;
      const qc = 0.5 * (q0 + q1);
      const pc = 0.5 * (p0 + p1);

      // Keep labels inside plot area
      if (qc < qMin || qc > qMax || pc < pMin || pc > pMax) continue;

      const dq = qc - qTarget;
      const dp = pc - pTarget;

      // Score: close to target position, with mild bias for higher p (labels nearer the top)
      let score = dq * dq + dp * dp + 0.02 * (1.0 - pc);

      if (score < bestScore) {
        bestScore = score;
        best = { q: qc, p: pc };
      }
    }
  }

  // If the contour isn't present on the grid, return null (don't label).
  if (!foundCrossing) return null;

  // If crossings exist but all candidates were clipped by bounds, fall back to the best crossing cell center
  // without the bounds constraint.
  if (!best) {
    for (let i = 0; i < np - 1; i++) {
      const p0 = pVals[i], p1 = pVals[i + 1];
      for (let j = 0; j < nq - 1; j++) {
        const q0 = qVals[j], q1 = qVals[j + 1];
        const f00 = z[i][j] - lvl;
        const f01 = z[i][j + 1] - lvl;
        const f10 = z[i + 1][j] - lvl;
        const f11 = z[i + 1][j + 1] - lvl;
        const minf = Math.min(f00, f01, f10, f11);
        const maxf = Math.max(f00, f01, f10, f11);
        if (minf > 0 || maxf < 0) continue;

        const qc = 0.5 * (q0 + q1);
        const pc = 0.5 * (p0 + p1);
        const dq = qc - qTarget;
        const dp = pc - pTarget;
        const score = dq * dq + dp * dp + 0.02 * (1.0 - pc);
        if (score < bestScore) {
          bestScore = score;
          best = { q: qc, p: pc };
        }
      }
    }
  }

  return best;
}


function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  elDate.value = `${yyyy}-${mm}-${dd}`;
}

setDefaultDate();

let lastTaTb = null;

function renderMain() {
  const [y, m, d] = elDate.value.split("-").map(Number);
  const [hh, mm] = elTime.value.split(":").map(Number);
  const hPole = Number(elHPole.value);

  const out = computeAlphaBeta(y, m, d, hh, mm, hPole);

  if (!isFinite(out.alpha_rad) || !isFinite(out.beta_rad)) {
    elAngles.textContent = `Az=${out.azimuth_deg.toFixed(2)}°, El=${out.elevation_deg.toFixed(2)}° (Sol abaixo do horizonte)`;
    Plotly.newPlot(elPQ, [], { title: "Sol abaixo do horizonte — escolha outro horário." });
    Plotly.newPlot(elFrame, [], { title: "(Clique em qualquer ponto do heatmap ou nas curvas para escolher um ponto)" });
    lastTaTb = null;
    return;
  }

  const ta = Math.tan(out.alpha_rad);
  const tb = Math.tan(out.beta_rad);
  lastTaTb = { ta, tb };

  elAngles.textContent =
    `Az=${out.azimuth_deg.toFixed(2)}°, El=${out.elevation_deg.toFixed(2)}° | ` +
    `α=${out.alpha_deg.toFixed(2)}° (tan=${ta.toFixed(3)}) | ` +
    `β=${out.beta_deg.toFixed(2)}° (tan=${tb.toFixed(3)}) | ` +
    `sombra≈${out.shadow_length_m.toFixed(2)} m`;

  // Grid for heatmap
  const nq = 180, np = 180;
  const qVals = Array.from({ length: nq }, (_, i) => 0.001 + (0.998 * i) / (nq - 1));
  const pVals = Array.from({ length: np }, (_, i) => 0.001 + (0.998 * i) / (np - 1));
  const z = abarGrid(qVals, pVals, ta, tb);

  // Isolines (Ā levels) computed directly from the grid via Plotly contouring.
// This avoids spurious "extra branches" that can appear when trying to use
// closed-form formulas outside their valid range.
  const data = [
    {
      type: "heatmap",
      x: qVals,
      y: pVals,
      z: z,
      zmin: 0,
      zmax: 1,
      colorscale: ORRD,
      colorbar: { title: "Ā" },
      hovertemplate: "q=%{x:.3f}<br>p=%{y:.3f}<br>Ā=%{z:.3f}<extra></extra>"
    }
  ];

  // One contour trace per level so we get clean segments and a legend entry.
  for (const lvl of LEVELS) {
    const isMid = Math.abs(lvl - 0.5) < 1e-12;
    data.push({
      type: "contour",
      x: qVals,
      y: pVals,
      z: z,
      autocontour: false,
      contours: { start: lvl, end: lvl, size: 1, coloring: "none", showlines: true },
      line: { color: "black", width: isMid ? 3 : 2 },
      showscale: false,
      showlegend: false,
      name: `Ā=${lvl.toFixed(2)}`,
      hoverinfo: "skip"
    });
  }


  // Labels directly over the curves (avoid legend overlapping the colorbar)
  const labelTargets = [
    { lvl: 0.25, qT: 0.20, pT: 0.85 },
    { lvl: 0.50, qT: 0.50, pT: 0.85 },
    { lvl: 0.75, qT: 0.80, pT: 0.85 }
  ];

  const annotations = [];
  for (const t of labelTargets) {
    const pos = findLabelPosFromGrid(qVals, pVals, z, t.lvl, t.qT, t.pT);
    if (!pos) continue;
    annotations.push({
      x: pos.q,
      y: pos.p,
      xref: "x",
      yref: "y",
      text: `Ā=${t.lvl.toFixed(2)}`,
      showarrow: false,
      font: { size: 12, color: "black" },
      bgcolor: "rgba(255,255,255,0.75)",
      bordercolor: "rgba(0,0,0,0.25)",
      borderwidth: 1,
      borderpad: 2
    });
  }


const layout = {
    title: "Plano (q,p) com Ā(q,p) e curvas Ā=0.25, 0.50, 0.75",
    showlegend: false,
    annotations: annotations,
    xaxis: { title: "q", range: [0, 1], constrain: "domain" },
    yaxis: { title: "p", range: [0, 1], scaleanchor: "x", scaleratio: 1 },
    margin: { l: 50, r: 15, t: 50, b: 50 }
  };

  Plotly.newPlot(elPQ, data, layout, { responsive: true });

  // Default frame plot (empty instruction)
  Plotly.newPlot(elFrame, [], {
    title: "(Clique em qualquer ponto do heatmap ou nas curvas para escolher um ponto)",
    xaxis: { range: [0, 1] },
    yaxis: { range: [0, 1], scaleanchor: "x", scaleratio: 1 },
    margin: { l: 40, r: 10, t: 40, b: 40 }
  }, { responsive: true });

  // Click handler
  elPQ.on("plotly_click", (ev) => {
    if (!lastTaTb || !ev || !ev.points || ev.points.length === 0) return;
    const pt = ev.points[0];
    // Respond to clicks on ANY trace (heatmap or isolines)
    const qSel = Number(pt.x);
    const pSel = Number(pt.y);
    if (!isFinite(qSel) || !isFinite(pSel)) return;
    const { data: fData, layout: fLayout } = frameFigure(qSel, pSel, lastTaTb.ta, lastTaTb.tb);
    Plotly.newPlot(elFrame, fData, fLayout, { responsive: true });
  });
}

elBtn.addEventListener("click", renderMain);

// initial render
renderMain();
