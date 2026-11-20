export interface BeamDiagramPoint {
  xM: number;
  shearKn: number;
  momentKnm: number;
}

export interface BeamAnalysisResult {
  reactionLeftKn: number;
  reactionRightKn: number;
  maxShearKn: number;
  maxMomentKnm: number;
  estimatedMidDeflectionMm: number;
  allowableDeflectionMm: number;
  deflectionStatus: "Pass" | "Needs attention";
  diagramPoints: BeamDiagramPoint[];
  assumptions: string[];
  limitations: string[];
}

export function calculateBeamAnalysis(params: {
  spanM: number;
  udlKnPerM: number;
  pointLoadKn: number;
  pointLoadPosM: number;
  inertiaCm4?: number;
  elasticModulusGpa?: number;
}): BeamAnalysisResult {
  const L = Math.max(0.5, params.spanM);
  const w = Math.max(0, params.udlKnPerM);
  const P = Math.max(0, params.pointLoadKn);
  const a = Math.max(0, Math.min(L, params.pointLoadPosM));
  const b = L - a;

  // Simply supported beam statics:
  // R_B = (w * L^2 / 2 + P * a) / L
  const reactionRightKn = (w * L * L) / 2 / L + (P * a) / L;
  const reactionLeftKn = w * L + P - reactionRightKn;

  const steps = 24;
  const diagramPoints: BeamDiagramPoint[] = [];
  let maxShearKn = 0;
  let maxMomentKnm = 0;

  for (let i = 0; i <= steps; i++) {
    const x = (L * i) / steps;
    const shear = reactionLeftKn - w * x - (x >= a ? P : 0);
    const moment = reactionLeftKn * x - (w * x * x) / 2 - (x >= a ? P * (x - a) : 0);
    if (Math.abs(shear) > maxShearKn) maxShearKn = Math.abs(shear);
    if (Math.abs(moment) > maxMomentKnm) maxMomentKnm = Math.abs(moment);
    diagramPoints.push({
      xM: Number(x.toFixed(3)),
      shearKn: Number(shear.toFixed(2)),
      momentKnm: Number(moment.toFixed(2)),
    });
  }

  // Approximate uncracked elastic midspan deflection (mm)
  // Using default 230x450mm RC section I ≈ 174,656 cm^4, E_c ≈ 25 GPa
  const I_m4 = ((params.inertiaCm4 ?? 174656) * 1e-8);
  const E_kpa = (params.elasticModulusGpa ?? 25) * 1e6;
  const deltaUdlM = (5 * w * Math.pow(L, 4)) / (384 * E_kpa * I_m4);
  // Point load approximate midspan contribution
  const minAB = Math.min(a, b);
  const deltaPointM = (P * minAB * (3 * L * L - 4 * minAB * minAB)) / (48 * E_kpa * I_m4);
  const estimatedMidDeflectionMm = Number(((deltaUdlM + deltaPointM) * 1000).toFixed(2));
  const allowableDeflectionMm = Number(((L * 1000) / 250).toFixed(2));

  return {
    reactionLeftKn: Number(reactionLeftKn.toFixed(2)),
    reactionRightKn: Number(reactionRightKn.toFixed(2)),
    maxShearKn: Number(maxShearKn.toFixed(2)),
    maxMomentKnm: Number(maxMomentKnm.toFixed(2)),
    estimatedMidDeflectionMm,
    allowableDeflectionMm,
    deflectionStatus: estimatedMidDeflectionMm <= allowableDeflectionMm ? "Pass" : "Needs attention",
    diagramPoints,
    assumptions: [
      "Simply supported beam idealization (pin + roller supports, zero end fixity).",
      `Uniformly distributed load w = ${w} kN/m plus point load P = ${P} kN at x = ${a} m.`,
      `Gross elastic stiffness assumed (E = ${params.elasticModulusGpa ?? 25} GPa, I = ${params.inertiaCm4 ?? 174656} cm^4).`,
    ],
    limitations: [
      "Preliminary educational calculation only. Does not include load factors (1.5x DL/LL), cracked-section stiffness, shear stirrup detailing, or torsion.",
      "Construction-ready structural drawings require design and sign-off by a licensed structural engineer.",
    ],
  };
}

export interface CivilBOQResult {
  concreteVolumeM3: number;
  cementBags50Kg: number;
  sandM3: number;
  aggregateM3: number;
  brickworkM3: number;
  bricksCount: number;
  plasterAreaM2: number;
  flooringAreaM2: number;
  paintingAreaM2: number;
  steelWeightKg: number;
  estimatedTotalCostInr: number;
  assumptions: string[];
}

export function calculateCivilBOQ(params: {
  builtUpAreaM2: number;
  wallLengthTotalM: number;
  wallHeightM: number;
  wallThicknessM: number;
  concreteMix: "M20" | "M25";
  steelKgPerM2?: number;
}): CivilBOQResult {
  const area = Math.max(1, params.builtUpAreaM2);
  const wallLen = Math.max(1, params.wallLengthTotalM);
  const wallH = Math.max(2, params.wallHeightM);
  const wallT = Math.max(0.1, params.wallThicknessM);

  // Concrete: slab (~0.13m) + beams/columns allowance (~0.10m equivalent) => 0.23 m3 per m2 built-up
  const concreteVolumeM3 = Number((area * 0.23).toFixed(2));
  // Dry volume factor 1.54; M20 (1:1.5:3) -> ~8 bags/m3, M25 (1:1:2) -> ~11 bags/m3
  const bagsPerM3 = params.concreteMix === "M25" ? 11.0 : 8.0;
  const cementBags50Kg = Math.ceil(concreteVolumeM3 * bagsPerM3);
  const sandM3 = Number((concreteVolumeM3 * 0.44).toFixed(2));
  const aggregateM3 = Number((concreteVolumeM3 * 0.88).toFixed(2));

  // Deduct 18% for doors/windows
  const grossWallVol = wallLen * wallH * wallT;
  const brickworkM3 = Number((grossWallVol * 0.82).toFixed(2));
  // ~500 standard modular bricks (190x90x90 + mortar) per m3
  const bricksCount = Math.ceil(brickworkM3 * 500);

  // Two sides plaster minus openings
  const plasterAreaM2 = Number((wallLen * wallH * 2 * 0.82).toFixed(2));
  const flooringAreaM2 = Number((area * 0.88).toFixed(2));
  const paintingAreaM2 = Number((plasterAreaM2 + area * 0.88).toFixed(2));
  const steelWeightKg = Math.ceil(area * (params.steelKgPerM2 ?? 42));

  // Illustrative material + labor benchmark rates
  const cost =
    concreteVolumeM3 * 6500 +
    brickworkM3 * 5800 +
    plasterAreaM2 * 280 +
    flooringAreaM2 * 1150 +
    paintingAreaM2 * 140 +
    steelWeightKg * 78;

  return {
    concreteVolumeM3,
    cementBags50Kg,
    sandM3,
    aggregateM3,
    brickworkM3,
    bricksCount,
    plasterAreaM2,
    flooringAreaM2,
    paintingAreaM2,
    steelWeightKg,
    estimatedTotalCostInr: Math.round(cost),
    assumptions: [
      `Built-up area ${area} m²; concrete allowance 0.23 m³/m² (${params.concreteMix} nominal/design mix reference).`,
      "18% wall opening deduction applied for doors and windows; 500 modular bricks/m³ masonry factor.",
      "Rates are illustrative educational benchmarks only; always verify current local market BOQ tender rates.",
    ],
  };
}

export interface SurveySlopeResult {
  elevationDiffM: number;
  slopePercent: number;
  gradientRatio: string;
  angleDeg: number;
  cutFillVolumeM3: number;
  accessibilityRampNote: string;
}

export function calculateSurveySlope(params: {
  elevAM: number;
  elevBM: number;
  horizontalDistM: number;
  cutSectionAreaM2?: number;
  fillSectionAreaM2?: number;
  segmentLengthM?: number;
}): SurveySlopeResult {
  const distM = Math.max(0.1, params.horizontalDistM);
  const diff = params.elevBM - params.elevAM;
  const absDiff = Math.abs(diff);
  const slopePercent = Number(((absDiff / distM) * 100).toFixed(2));
  const ratioN = absDiff > 0.0001 ? Math.round(distM / absDiff) : 999;
  const gradientRatio = absDiff < 0.0001 ? "Level (0%)" : `1 : ${ratioN}`;
  const angleDeg = Number(((Math.atan(absDiff / distM) * 180) / Math.PI).toFixed(2));

  const cut = params.cutSectionAreaM2 ?? 0;
  const fill = params.fillSectionAreaM2 ?? 0;
  const segL = params.segmentLengthM ?? distM;
  const cutFillVolumeM3 = Number((((cut - fill) / 2) * segL).toFixed(2));

  let accessibilityRampNote = "Steeper than 1:12; requires stepped stair + guardrail or regrading for accessible route.";
  if (slopePercent <= 2) {
    accessibilityRampNote = "Suitable for positive surface drainage (1%–2%) and level accessible walkways.";
  } else if (slopePercent <= 5) {
    accessibilityRampNote = "Walkway slope (<= 1:20); accessible without ramp handrails in many jurisdictions.";
  } else if (slopePercent <= 8.33) {
    accessibilityRampNote = "Accessible ramp range (1:12 max); provide landings every 9m and dual handrails.";
  }

  return {
    elevationDiffM: Number(diff.toFixed(3)),
    slopePercent,
    gradientRatio,
    angleDeg,
    cutFillVolumeM3,
    accessibilityRampNote,
  };
}

export interface MepCalcResult {
  requiredLuminaires: number;
  connectedLightingLoadW: number;
  recommendedBreakerA: number;
  dailyWaterDemandLiters: number;
  recommendedOverheadTankLiters: number;
  estimatedCoolingLoadTr: number;
  assumptions: string[];
}

export function calculateMEPSystem(params: {
  roomAreaM2: number;
  targetLux: number;
  luminaireLumens: number;
  luminaireWatts: number;
  occupants: number;
}): MepCalcResult {
  const area = Math.max(1, params.roomAreaM2);
  const lux = Math.max(50, params.targetLux);
  const lm = Math.max(200, params.luminaireLumens);
  // Lumen method: N = (E * A) / (F * UF * MF), UF=0.65, MF=0.8
  const requiredLuminaires = Math.max(1, Math.ceil((lux * area) / (lm * 0.65 * 0.8)));
  const connectedLightingLoadW = requiredLuminaires * params.luminaireWatts;
  // 230V single phase lighting circuit with 1.25 safety factor
  const designCurrent = (connectedLightingLoadW / 230) * 1.25;
  const recommendedBreakerA = designCurrent <= 6 ? 6 : designCurrent <= 10 ? 10 : designCurrent <= 16 ? 16 : 20;

  // Water demand: 135 L/person/day residential benchmark
  const dailyWaterDemandLiters = Math.max(1, params.occupants) * 135;
  const recommendedOverheadTankLiters = Math.ceil((dailyWaterDemandLiters * 1.5) / 500) * 500;

  // Preliminary cooling estimate ~ 1 TR per 12–14 m2 residential conditioned space
  const estimatedCoolingLoadTr = Number((area / 13 + params.occupants * 0.08).toFixed(2));

  return {
    requiredLuminaires,
    connectedLightingLoadW,
    recommendedBreakerA,
    dailyWaterDemandLiters,
    recommendedOverheadTankLiters,
    estimatedCoolingLoadTr,
    assumptions: [
      "Lumen method uses Utilization Factor UF = 0.65 and Maintenance Factor MF = 0.80.",
      "Domestic water benchmark assumed at 135 L/person/day with 1.5x overhead tank reserve.",
      "Cooling load is a preliminary rule-of-thumb; verify with full envelope U-value and solar heat gain calculation.",
    ],
  };
}
