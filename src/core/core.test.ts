import test from "node:test";
import assert from "node:assert/strict";
import { RESIDENTIAL_PROJECTS } from "../data/residentialCatalog";
import { LANDSCAPE_PROJECTS } from "../data/landscapeCatalog";
import { validateLandscapePlan, validateResidentialPlan } from "./geometryValidation";
import {
  calculateBeamAnalysis,
  calculateCivilBOQ,
  calculateMEPSystem,
  calculateSurveySlope,
} from "./engineeringCalculators";
import { analyzeSunlight, analyzeVastuGrid, analyzeVentilation } from "./sunWindVastu";

test("exact 80 residential and 80 landscape unique projects exist", () => {
  assert.equal(RESIDENTIAL_PROJECTS.length, 80);
  assert.equal(LANDSCAPE_PROJECTS.length, 80);

  const resIds = new Set(RESIDENTIAL_PROJECTS.map((p) => p.id));
  const landIds = new Set(LANDSCAPE_PROJECTS.map((p) => p.id));
  assert.equal(resIds.size, 80);
  assert.equal(landIds.size, 80);

  assert.equal(RESIDENTIAL_PROJECTS[0].id, "HOUSE-001");
  assert.equal(RESIDENTIAL_PROJECTS[79].id, "HOUSE-080");
  assert.equal(LANDSCAPE_PROJECTS[0].id, "LAND-001");
  assert.equal(LANDSCAPE_PROJECTS[79].id, "LAND-080");
});

test("all 80 residential reference drawings pass geometry and room coordination checks", () => {
  for (const project of RESIDENTIAL_PROJECTS) {
    const res = validateResidentialPlan(project.referencePlan, project);
    assert.equal(
      res.overallReady,
      true,
      `Expected ${project.id} (${project.title}) to pass all checks, failed: ${res.checks
        .filter((c) => c.status !== "Pass" && c.status !== "Not applicable")
        .map((c) => `${c.label}: ${c.detail}`)
        .join("; ")}`
    );
  }
});

test("all 80 landscape reference drawings pass site, planting, and drainage checks", () => {
  for (const project of LANDSCAPE_PROJECTS) {
    const res = validateLandscapePlan(project.referencePlan, project);
    assert.equal(
      res.overallReady,
      true,
      `Expected ${project.id} (${project.title}) to pass all checks, failed: ${res.checks
        .filter((c) => c.status !== "Pass" && c.status !== "Not applicable")
        .map((c) => `${c.label}: ${c.detail}`)
        .join("; ")}`
    );
  }
});

test("incomplete residential draft fails validation until required elements are drawn", () => {
  const base = RESIDENTIAL_PROJECTS[0];
  const emptyPlan = {
    ...base.referencePlan,
    walls: [],
    openings: [],
    rooms: [],
    furniture: [],
  };
  const res = validateResidentialPlan(emptyPlan, base);
  assert.equal(res.overallReady, false);
  assert.ok(res.passCount < res.totalApplicable);
});

test("beam structural statics satisfies equilibrium and UDL max moment formula wL^2/8", () => {
  const beam = calculateBeamAnalysis({
    spanM: 6,
    udlKnPerM: 10,
    pointLoadKn: 0,
    pointLoadPosM: 3,
  });
  assert.equal(beam.reactionLeftKn, 30);
  assert.equal(beam.reactionRightKn, 30);
  assert.equal(beam.maxShearKn, 30);
  assert.equal(beam.maxMomentKnm, 45); // 10 * 36 / 8 = 45 kNm
  assert.ok(beam.assumptions.length >= 2);
  assert.ok(beam.limitations.length >= 2);
});

test("civil BOQ, survey slope, and MEP calculators return valid bounded values", () => {
  const boq = calculateCivilBOQ({
    builtUpAreaM2: 100,
    wallLengthTotalM: 60,
    wallHeightM: 3,
    wallThicknessM: 0.23,
    concreteMix: "M25",
  });
  assert.equal(boq.concreteVolumeM3, 23);
  assert.ok(boq.bricksCount > 10000);

  const slope = calculateSurveySlope({
    elevAM: 10.5,
    elevBM: 10.0,
    horizontalDistM: 10,
  });
  assert.equal(slope.slopePercent, 5);
  assert.equal(slope.gradientRatio, "1 : 20");

  const mep = calculateMEPSystem({
    roomAreaM2: 24,
    targetLux: 250,
    luminaireLumens: 1800,
    luminaireWatts: 18,
    occupants: 4,
  });
  assert.equal(mep.dailyWaterDemandLiters, 540);
  assert.ok(mep.requiredLuminaires >= 4);
});

test("sunlight, ventilation, and vastu analyzers execute cleanly on residential plans", () => {
  const house25 = RESIDENTIAL_PROJECTS[24];
  const sun = analyzeSunlight(house25.referencePlan, house25.northAngleDeg, "evening", "summer", 600);
  assert.ok(sun.windowAssessments.length >= 4);

  const wind = analyzeVentilation(house25.referencePlan, house25.prevailingWindDeg, "daytime");
  assert.ok(wind.disclaimer.includes("not a Computational Fluid Dynamics"));

  const vastu = analyzeVastuGrid(house25.referencePlan);
  assert.ok(vastu.findings.length >= 4);
  assert.ok(vastu.disclaimer.includes("strictly separate"));
});
