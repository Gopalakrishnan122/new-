import React, { useState } from "react";
import { INDUSTRIAL_EXERCISES } from "../data/materialsAndPlants";
import type { IndustrialDesignExercise } from "../core/types";
import { Box, CheckCircle2, Cog, Wrench } from "lucide-react";

interface DesignStudioProps {
  completedDesignIds: string[];
  onToggleComplete: (id: string) => void;
  onOpenMechanical3D: () => void;
  onAskTutor: (context: string) => void;
}

export const DesignStudio: React.FC<DesignStudioProps> = ({
  completedDesignIds,
  onToggleComplete,
  onOpenMechanical3D,
  onAskTutor,
}) => {
  const [activeExercise, setActiveExercise] = useState<IndustrialDesignExercise>(INDUSTRIAL_EXERCISES[0]);
  // Interactive Mechanical & DFM Mini-Lab state
  const [gearModuleMm, setGearModuleMm] = useState<number>(1.5);
  const [sunTeeth, setSunTeeth] = useState<number>(18);
  const [planetTeeth, setPlanetTeeth] = useState<number>(18);

  const [sheetThickMm, setSheetThickMm] = useState<number>(1.5);
  const [bendRadiusMm, setBendRadiusMm] = useState<number>(1.5);
  const [kFactor, setKFactor] = useState<number>(0.4);
  const [bendAngleDeg, setBendAngleDeg] = useState<number>(90);

  const [wallThickMm, setWallThickMm] = useState<number>(2.4);
  const [ribThickMm, setRibThickMm] = useState<number>(1.3);

  const ringTeeth = sunTeeth + 2 * planetTeeth;
  const sunPitchDia = (gearModuleMm * sunTeeth).toFixed(1);
  const carrierRatio = (1 + ringTeeth / sunTeeth).toFixed(2);
  const bendAllowance = (((Math.PI / 180) * bendAngleDeg) * (bendRadiusMm + kFactor * sheetThickMm)).toFixed(2);
  const ribRatioPct = Math.round((ribThickMm / Math.max(0.5, wallThickMm)) * 100);
  const ribOk = ribRatioPct <= 60;

  return (
    <div className="space-y-6">
      {/* Independent Industrial & Product Design Studio Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs font-medium text-amber-700">Independent Studio · Industrial & Product Design</p>
          <h1 className="text-2xl font-bold text-slate-900 text-balance">Professional Design & Engineering Studio</h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Dedicated workspace for product sketching, anthropometry, gears and linkages, bearings and shafts, sheet-metal flat patterns, injection-molded plastic DFM, ISO tolerances, 3D printing tolerances, and exploded BOM assemblies.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={onOpenMechanical3D}
              className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Box className="w-4 h-4" />
              Inspect 3D Planetary Gear Assembly
            </button>
            <span className="text-xs font-mono text-slate-600 tabular-nums">
              {completedDesignIds.length} / {INDUSTRIAL_EXERCISES.length} Product Modules Completed
            </span>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 min-h-[160px]">
          <img
            src="/src/assets/images/studio_industrial_prototype_1795154348451.jpg"
            alt="CNC machined aluminum planetary gear assembly and calipers on exploded drafting sheet"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Exercise Modules + Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
          <p className="px-2 py-1 text-xs font-semibold text-slate-500">Product & Mechanical Curriculum</p>
          {INDUSTRIAL_EXERCISES.map((ex) => {
            const done = completedDesignIds.includes(ex.id);
            const active = activeExercise.id === ex.id;
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => setActiveExercise(ex)}
                className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-800 border-transparent hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-mono ${active ? "text-amber-300" : "text-slate-500"}`}>{ex.id}</span>
                  <span>{done ? "Completed" : ex.level}</span>
                </div>
                <p className="text-sm font-semibold mt-0.5 leading-snug">{ex.title}</p>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs text-amber-700 font-medium">{activeExercise.domain} · {activeExercise.level}</p>
                <h2 className="text-xl font-bold text-slate-900">{activeExercise.id}: {activeExercise.title}</h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onAskTutor(`Industrial Design ${activeExercise.id}: ${activeExercise.title}. ${activeExercise.brief}`)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Ask Tutor
                </button>
                <button
                  type="button"
                  onClick={() => onToggleComplete(activeExercise.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 ${
                    completedDesignIds.includes(activeExercise.id)
                      ? "bg-emerald-700 text-white"
                      : "bg-blue-700 text-white hover:bg-blue-800"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedDesignIds.includes(activeExercise.id) ? "Completed" : "Mark Exercise Complete"}
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">{activeExercise.brief}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeExercise.parameters.map((p) => (
                <div key={p.label} className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <p className="text-xs text-slate-500">{p.label}</p>
                  <p className="text-base font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                    {p.value} <span className="text-xs font-normal text-slate-500">{p.unit}</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <h3 className="font-semibold text-slate-900 text-sm">Engineering Principles</h3>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {activeExercise.keyPrinciples.map((kp, idx) => (
                    <li key={idx}>{kp}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-slate-900 text-sm">DFM / DFA Verification Checklist</h3>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {activeExercise.dfmChecklist.map((dc, idx) => (
                    <li key={idx}>{dc}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800">
              <strong>Practical Task:</strong> {activeExercise.exerciseTask}
            </div>
          </div>

          {/* Interactive Product & Mechanical Parameter Workbench */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Wrench className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Interactive Mechanical, Sheet-Metal & Plastic DFM Workbench</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Gear Train Sizing */}
              <div className="border border-slate-200 rounded-md p-3 space-y-2.5">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Cog className="w-3.5 h-3.5" /> Planetary Gear Ratio
                </p>
                <label className="block">
                  <span className="text-slate-600">Module (mm)</span>
                  <input
                    type="number"
                    step={0.5}
                    min={0.5}
                    value={gearModuleMm}
                    onChange={(e) => setGearModuleMm(Math.max(0.5, Number(e.target.value)))}
                    className="mt-1 w-full px-2 py-1 border border-slate-300 rounded font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">Sun Teeth (Z_S)</span>
                  <input
                    type="number"
                    min={12}
                    value={sunTeeth}
                    onChange={(e) => setSunTeeth(Math.max(12, Number(e.target.value)))}
                    className="mt-1 w-full px-2 py-1 border border-slate-300 rounded font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">Planet Teeth (Z_P)</span>
                  <input
                    type="number"
                    min={10}
                    value={planetTeeth}
                    onChange={(e) => setPlanetTeeth(Math.max(10, Number(e.target.value)))}
                    className="mt-1 w-full px-2 py-1 border border-slate-300 rounded font-mono"
                  />
                </label>
                <div className="pt-2 border-t border-slate-100 font-mono space-y-1 text-slate-800">
                  <div>Ring Teeth Z_R: {ringTeeth}</div>
                  <div>Sun Pitch Ø: {sunPitchDia} mm</div>
                  <div>Reduction Ratio: {carrierRatio} : 1</div>
                </div>
              </div>

              {/* Sheet Metal Bend Allowance */}
              <div className="border border-slate-200 rounded-md p-3 space-y-2.5">
                <p className="font-semibold text-slate-900">Sheet-Metal Bend Allowance</p>
                <label className="block">
                  <span className="text-slate-600">Thickness t (mm)</span>
                  <input
                    type="number"
                    step={0.1}
                    value={sheetThickMm}
                    onChange={(e) => setSheetThickMm(Math.max(0.5, Number(e.target.value)))}
                    className="mt-1 w-full px-2 py-1 border border-slate-300 rounded font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">Inside Radius R (mm)</span>
                  <input
                    type="number"
                    step={0.1}
                    value={bendRadiusMm}
                    onChange={(e) => setBendRadiusMm(Math.max(0.2, Number(e.target.value)))}
                    className="mt-1 w-full px-2 py-1 border border-slate-300 rounded font-mono"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-slate-600">K-Factor</span>
                    <input
                      type="number"
                      step={0.02}
                      value={kFactor}
                      onChange={(e) => setKFactor(Math.max(0.2, Math.min(0.5, Number(e.target.value))))}
                      className="mt-1 w-full px-2 py-1 border border-slate-300 rounded font-mono"
                    />
                  </label>
                  <label className="block">
                    <span className="text-slate-600">Angle (°)</span>
                    <input
                      type="number"
                      value={bendAngleDeg}
                      onChange={(e) => setBendAngleDeg(Math.max(10, Math.min(180, Number(e.target.value))))}
                      className="mt-1 w-full px-2 py-1 border border-slate-300 rounded font-mono"
                    />
                  </label>
                </div>
                <div className="pt-2 border-t border-slate-100 font-mono text-slate-800">
                  <div>Bend Allowance BA: {bendAllowance} mm</div>
                </div>
              </div>

              {/* Plastic Injection Rib Check */}
              <div className="border border-slate-200 rounded-md p-3 space-y-2.5">
                <p className="font-semibold text-slate-900">Plastic Injection Rib DFM</p>
                <label className="block">
                  <span className="text-slate-600">Nominal Wall T (mm)</span>
                  <input
                    type="number"
                    step={0.1}
                    value={wallThickMm}
                    onChange={(e) => setWallThickMm(Math.max(0.8, Number(e.target.value)))}
                    className="mt-1 w-full px-2 py-1 border border-slate-300 rounded font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">Rib Base Thickness (mm)</span>
                  <input
                    type="number"
                    step={0.1}
                    value={ribThickMm}
                    onChange={(e) => setRibThickMm(Math.max(0.4, Number(e.target.value)))}
                    className="mt-1 w-full px-2 py-1 border border-slate-300 rounded font-mono"
                  />
                </label>
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="font-mono text-slate-800">Rib / Wall Ratio: {ribRatioPct}% (Target &lt;= 60%)</div>
                  <div className={`font-medium ${ribOk ? "text-emerald-700" : "text-amber-700"}`}>
                    {ribOk ? "Pass — Low sink mark risk" : "Needs attention — Reduce rib to <= 60% T"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
