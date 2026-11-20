import React, { useMemo, useState } from "react";
import {
  calculateBeamAnalysis,
  calculateCivilBOQ,
  calculateMEPSystem,
  calculateSurveySlope,
} from "../core/engineeringCalculators";

export const CalculatorsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"structural" | "civil" | "survey" | "mep">("structural");

  // Structural Beam inputs
  const [spanM, setSpanM] = useState(5.0);
  const [udl, setUdl] = useState(14.0);
  const [pointLoad, setPointLoad] = useState(12.0);
  const [pointPosM, setPointPosM] = useState(2.5);

  // Civil BOQ inputs
  const [builtUpM2, setBuiltUpM2] = useState(110);
  const [wallLenM, setWallLenM] = useState(72);
  const [wallHeightM, setWallHeightM] = useState(3.0);
  const [wallThickM, setWallThickM] = useState(0.23);
  const [concreteMix, setConcreteMix] = useState<"M20" | "M25">("M25");

  // Surveying inputs
  const [elevA, setElevA] = useState(100.45);
  const [elevB, setElevB] = useState(100.0);
  const [horizDist, setHorizDist] = useState(12.0);
  const [cutArea, setCutArea] = useState(1.8);
  const [fillArea, setFillArea] = useState(0.6);

  // MEP inputs
  const [roomAreaM2, setRoomAreaM2] = useState(24);
  const [targetLux, setTargetLux] = useState(250);
  const [lumens, setLumens] = useState(1800);
  const [watts, setWatts] = useState(18);
  const [occupants, setOccupants] = useState(4);

  const beam = useMemo(
    () =>
      calculateBeamAnalysis({
        spanM,
        udlKnPerM: udl,
        pointLoadKn: pointLoad,
        pointLoadPosM: pointPosM,
      }),
    [spanM, udl, pointLoad, pointPosM]
  );

  const boq = useMemo(
    () =>
      calculateCivilBOQ({
        builtUpAreaM2: builtUpM2,
        wallLengthTotalM: wallLenM,
        wallHeightM,
        wallThicknessM: wallThickM,
        concreteMix,
      }),
    [builtUpM2, wallLenM, wallHeightM, wallThickM, concreteMix]
  );

  const survey = useMemo(
    () =>
      calculateSurveySlope({
        elevAM: elevA,
        elevBM: elevB,
        horizontalDistM: horizDist,
        cutSectionAreaM2: cutArea,
        fillSectionAreaM2: fillArea,
        segmentLengthM: horizDist,
      }),
    [elevA, elevB, horizDist, cutArea, fillArea]
  );

  const mep = useMemo(
    () =>
      calculateMEPSystem({
        roomAreaM2,
        targetLux,
        luminaireLumens: lumens,
        luminaireWatts: watts,
        occupants,
      }),
    [roomAreaM2, targetLux, lumens, watts, occupants]
  );

  // Build SVG Shear & Moment Diagram paths
  const svgCharts = useMemo(() => {
    const pts = beam.diagramPoints;
    const w = 520;
    const h = 110;
    const midY = h / 2;
    const maxV = Math.max(1, beam.maxShearKn);
    const maxM = Math.max(1, beam.maxMomentKnm);

    const sfdPts = pts
      .map((p, idx) => {
        const x = (idx / (pts.length - 1)) * w;
        const y = midY - (p.shearKn / maxV) * (h * 0.4);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const bmdPts = pts
      .map((p, idx) => {
        const x = (idx / (pts.length - 1)) * w;
        const y = 16 + (p.momentKnm / maxM) * (h - 28);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return { sfdPts, bmdPts, w, h, midY };
  }, [beam]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Engineering, Civil BOQ & Surveying Calculators</h1>
          <p className="text-sm text-slate-600">
            Transparent engineering worksheets displaying explicit formulas, units, assumptions, and professional sign-off limitations.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
          {(
            [
              ["structural", "Structural Beam (SFD/BMD)"],
              ["civil", "Civil & Quantity Surveying"],
              ["survey", "Site Surveying & Grading"],
              ["mep", "MEP Systems Sizing"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                activeTab === id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "structural" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <h2 className="text-base font-bold text-slate-900">Beam Load Parameters</h2>
            <label className="block">
              <span className="text-slate-600">Clear Span L (m)</span>
              <input
                type="number"
                step={0.5}
                value={spanM}
                onChange={(e) => setSpanM(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
            <label className="block">
              <span className="text-slate-600">Distributed Load w (kN/m)</span>
              <input
                type="number"
                step={1}
                value={udl}
                onChange={(e) => setUdl(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
            <label className="block">
              <span className="text-slate-600">Point Load P (kN)</span>
              <input
                type="number"
                step={1}
                value={pointLoad}
                onChange={(e) => setPointLoad(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
            <label className="block">
              <span className="text-slate-600">Point Load Position a (m from left)</span>
              <input
                type="number"
                step={0.25}
                value={pointPosM}
                onChange={(e) => setPointPosM(Math.max(0, Math.min(spanM, Number(e.target.value))))}
                className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="text-slate-500">Reaction R_A / R_B</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {beam.reactionLeftKn} / {beam.reactionRightKn} kN
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="text-slate-500">Max Shear V_max</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{beam.maxShearKn} kN</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="text-slate-500">Max Moment M_max</p>
                <p className="font-mono font-bold text-blue-700 mt-1 tabular-nums">{beam.maxMomentKnm} kN·m</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="text-slate-500">Deflection (L/250)</p>
                <p className={`font-mono font-bold mt-1 tabular-nums ${beam.deflectionStatus === "Pass" ? "text-emerald-700" : "text-amber-700"}`}>
                  {beam.estimatedMidDeflectionMm} / {beam.allowableDeflectionMm} mm
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded p-3">
                <p className="text-xs font-semibold text-slate-800 mb-2">Shear Force Diagram (SFD, kN)</p>
                <svg viewBox={`0 0 ${svgCharts.w} ${svgCharts.h}`} className="w-full h-28 bg-slate-50 rounded">
                  <line x1="0" y1={svgCharts.midY} x2={svgCharts.w} y2={svgCharts.midY} stroke="#94a3b8" strokeDasharray="4 3" />
                  <polyline fill="none" stroke="#1d4ed8" strokeWidth="2.5" points={svgCharts.sfdPts} />
                </svg>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-xs font-semibold text-slate-800 mb-2">Bending Moment Diagram (BMD, kN·m)</p>
                <svg viewBox={`0 0 ${svgCharts.w} ${svgCharts.h}`} className="w-full h-28 bg-slate-50 rounded">
                  <line x1="0" y1="16" x2={svgCharts.w} y2="16" stroke="#94a3b8" strokeDasharray="4 3" />
                  <polyline fill="none" stroke="#b45309" strokeWidth="2.5" points={svgCharts.bmdPts} />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 border border-slate-200 rounded p-3">
              <div>
                <p className="font-semibold text-slate-900 mb-1">Engineering Assumptions</p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                  {beam.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-amber-900 mb-1">Limitations & Code Verification</p>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                  {beam.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "civil" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <h2 className="text-base font-bold text-slate-900">Building Quantity Worksheet</h2>
            <label className="block">
              <span className="text-slate-600">Built-Up Area (m²)</span>
              <input type="number" value={builtUpM2} onChange={(e) => setBuiltUpM2(Math.max(5, Number(e.target.value)))} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono" />
            </label>
            <label className="block">
              <span className="text-slate-600">Total Wall Length (m)</span>
              <input type="number" value={wallLenM} onChange={(e) => setWallLenM(Math.max(4, Number(e.target.value)))} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-slate-600">Wall Height (m)</span>
                <input type="number" step={0.1} value={wallHeightM} onChange={(e) => setWallHeightM(Math.max(2, Number(e.target.value)))} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded font-mono" />
              </label>
              <label className="block">
                <span className="text-slate-600">Avg Thick (m)</span>
                <input type="number" step={0.01} value={wallThickM} onChange={(e) => setWallThickM(Math.max(0.1, Number(e.target.value)))} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded font-mono" />
              </label>
            </div>
            <label className="block">
              <span className="text-slate-600">Concrete Grade</span>
              <select value={concreteMix} onChange={(e) => setConcreteMix(e.target.value as "M20" | "M25")} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded bg-white">
                <option value="M20">M20 (1 : 1.5 : 3 Nominal Reference)</option>
                <option value="M25">M25 (Design Mix Structural Reference)</option>
              </select>
            </label>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Estimated Material Take-Off & BOQ Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">RCC Concrete Volume</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{boq.concreteVolumeM3} m³</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Cement (50 kg bags)</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{boq.cementBags50Kg} bags</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Reinforcement Steel (BBS Est.)</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{boq.steelWeightKg} kg</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Brickwork Masonry</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{boq.brickworkM3} m³ ({boq.bricksCount} bricks)</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Plaster & Painting Area</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{boq.plasterAreaM2} m² / {boq.paintingAreaM2} m²</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Flooring Tile Area</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{boq.flooringAreaM2} m²</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
              <p className="font-semibold text-slate-900">
                Indicative Material + Finish Budget Benchmark: ₹{boq.estimatedTotalCostInr.toLocaleString("en-IN")}
              </p>
              <ul className="list-disc pl-4 text-slate-600">
                {boq.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === "survey" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <h2 className="text-base font-bold text-slate-900">Spot Level & Earthwork Inputs</h2>
            <label className="block">
              <span className="text-slate-600">Benchmark Elevation A (m)</span>
              <input type="number" step={0.05} value={elevA} onChange={(e) => setElevA(Number(e.target.value))} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono" />
            </label>
            <label className="block">
              <span className="text-slate-600">Target Point Elevation B (m)</span>
              <input type="number" step={0.05} value={elevB} onChange={(e) => setElevB(Number(e.target.value))} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono" />
            </label>
            <label className="block">
              <span className="text-slate-600">Horizontal Distance (m)</span>
              <input type="number" step={0.5} value={horizDist} onChange={(e) => setHorizDist(Math.max(0.5, Number(e.target.value)))} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-slate-600">Cut Area (m²)</span>
                <input type="number" step={0.1} value={cutArea} onChange={(e) => setCutArea(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded font-mono" />
              </label>
              <label className="block">
                <span className="text-slate-600">Fill Area (m²)</span>
                <input type="number" step={0.1} value={fillArea} onChange={(e) => setFillArea(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded font-mono" />
              </label>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Slope, Gradient & Cut/Fill Output</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Level Difference</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{survey.elevationDiffM} m</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Slope %</p>
                <p className="font-mono font-bold text-blue-700 mt-1 tabular-nums">{survey.slopePercent}%</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Gradient Ratio</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{survey.gradientRatio}</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Net Cut/Fill Vol</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{survey.cutFillVolumeM3} m³</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
              <strong>Accessibility & Drainage Assessment:</strong> {survey.accessibilityRampNote}
            </div>
          </div>
        </div>
      )}

      {activeTab === "mep" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <h2 className="text-base font-bold text-slate-900">MEP Room & Occupancy Inputs</h2>
            <label className="block">
              <span className="text-slate-600">Room Area (m²)</span>
              <input type="number" value={roomAreaM2} onChange={(e) => setRoomAreaM2(Math.max(2, Number(e.target.value)))} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono" />
            </label>
            <label className="block">
              <span className="text-slate-600">Target Illuminance (Lux)</span>
              <input type="number" step={50} value={targetLux} onChange={(e) => setTargetLux(Math.max(50, Number(e.target.value)))} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-slate-600">Fixture Lumens</span>
                <input type="number" step={100} value={lumens} onChange={(e) => setLumens(Math.max(200, Number(e.target.value)))} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded font-mono" />
              </label>
              <label className="block">
                <span className="text-slate-600">Fixture Watts</span>
                <input type="number" value={watts} onChange={(e) => setWatts(Math.max(3, Number(e.target.value)))} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded font-mono" />
              </label>
            </div>
            <label className="block">
              <span className="text-slate-600">Occupants (for Water & HVAC)</span>
              <input type="number" value={occupants} onChange={(e) => setOccupants(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded font-mono" />
            </label>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Lighting, Circuit Breaker, Water & Cooling Estimates</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Required Luminaires</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{mep.requiredLuminaires} nos</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Lighting Load & MCB</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{mep.connectedLightingLoadW} W · {mep.recommendedBreakerA}A MCB</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Daily Water & Tank</p>
                <p className="font-mono font-bold text-slate-900 mt-1 tabular-nums">{mep.dailyWaterDemandLiters} L/d · {mep.recommendedOverheadTankLiters} L Tank</p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-slate-500">Prelim. HVAC Cooling</p>
                <p className="font-mono font-bold text-blue-700 mt-1 tabular-nums">{mep.estimatedCoolingLoadTr} TR</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
              <p className="font-semibold text-slate-900 mb-1">Assumptions & Engineering Notice</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {mep.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
