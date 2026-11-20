import React, { useEffect, useMemo, useState } from "react";
import { LANDSCAPE_BATCHES, LANDSCAPE_PROJECTS } from "../data/landscapeCatalog";
import { PLANT_DATABASE } from "../data/materialsAndPlants";
import type {
  LandscapePlanGeometry,
  LandscapeProject,
  LandscapeSheetId,
  PracticeAttempt,
} from "../core/types";
import { validateLandscapePlan } from "../core/geometryValidation";
import { CadCanvas2D } from "./CadCanvas2D";
import { ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle, Trees, Box } from "lucide-react";

interface LandscapeStudioProps {
  completedIds: string[];
  attempts: PracticeAttempt[];
  initialProjectId?: string | null;
  onClearInitialProject?: () => void;
  onSaveAttempt: (attempt: PracticeAttempt, markCompleted: boolean) => void;
  onOpen3D: () => void;
  onAskTutor: (context: string) => void;
}

const LANDSCAPE_SHEETS: { id: LandscapeSheetId; label: string }[] = [
  { id: "master_plan", label: "01. Landscape Master Plan" },
  { id: "hardscape", label: "02. Hardscape & Pathways" },
  { id: "softscape", label: "03. Softscape & Lawn" },
  { id: "planting", label: "04. Botanical Planting Plan" },
  { id: "furniture", label: "05. Outdoor Furniture Plan" },
  { id: "irrigation", label: "06. Irrigation Zoning Plan" },
  { id: "drainage", label: "07. Stormwater & Drainage" },
  { id: "sections_elevations", label: "08. Grading & Spot Levels" },
];

export const LandscapeStudio: React.FC<LandscapeStudioProps> = ({
  completedIds,
  attempts,
  initialProjectId,
  onClearInitialProject,
  onSaveAttempt,
  onOpen3D,
  onAskTutor,
}) => {
  const [selectedBatch, setSelectedBatch] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeProject, setActiveProject] = useState<LandscapeProject | null>(null);
  const [stage, setStage] = useState<"practice" | "reference" | "review">("practice");
  const [sheet, setSheet] = useState<LandscapeSheetId>("master_plan");
  const [referenceUnlocked, setReferenceUnlocked] = useState<boolean>(false);
  const [draftPlan, setDraftPlan] = useState<LandscapePlanGeometry | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    return LANDSCAPE_PROJECTS.filter((p) => {
      if (selectedBatch !== 0 && p.batchIndex !== selectedBatch) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedBatch, searchQuery]);

  function openProject(project: LandscapeProject) {
    const existing = attempts
      .filter((a) => a.projectId === project.id && a.studio === "landscape" && a.landscapePlan)
      .slice(-1)[0];

    setActiveProject(project);
    setDraftPlan(
      existing?.landscapePlan
        ? structuredClone(existing.landscapePlan)
        : {
            siteWidthMm: project.referencePlan.siteWidthMm,
            siteDepthMm: project.referencePlan.siteDepthMm,
            buildingFootprint: { x: 0, y: 0, widthMm: 0, depthMm: 0, entranceX: 0, entranceY: 0 },
            polygons: [],
            pathways: [],
            plants: [],
            utilities: [],
            furniture: [],
            spotLevels: [],
            scaleLabel: project.referencePlan.scaleLabel,
          }
    );
    setStage("practice");
    setSheet("master_plan");
    setReferenceUnlocked(false);
    setQuizAnswer(null);
    setSaveFeedback(null);
  }

  useEffect(() => {
    if (!initialProjectId) return;
    const found = LANDSCAPE_PROJECTS.find((p) => p.id === initialProjectId);
    if (found) {
      openProject(found);
    }
    onClearInitialProject?.();
  }, [initialProjectId]);

  function handleSavePractice(asCompleteAttempt = false) {
    if (!activeProject || !draftPlan) return;
    const validation = validateLandscapePlan(draftPlan, activeProject);
    const quizPassed = quizAnswer === activeProject.assessmentQuestion.correctIndex;
    const canComplete = asCompleteAttempt && validation.overallReady && quizPassed;

    const attempt: PracticeAttempt = {
      id: `ATT-${Date.now()}`,
      projectId: activeProject.id,
      studio: "landscape",
      timestamp: new Date().toISOString(),
      revisionNote: canComplete ? "Validated Landscape Master Plan" : "Landscape Practice Draft",
      landscapePlan: structuredClone(draftPlan),
      checksPassed: validation.passCount,
      checksTotal: validation.totalApplicable,
      validated: canComplete,
    };
    onSaveAttempt(attempt, canComplete);
    setSaveFeedback(
      canComplete
        ? `${activeProject.id} passed all ${validation.passCount}/${validation.totalApplicable} landscape checks and assessment!`
        : `Draft saved (${validation.passCount}/${validation.totalApplicable} checks passing). Complete all checks and assessment to finish ${activeProject.id}.`
    );
  }

  if (!activeProject || !draftPlan) {
    return (
      <div className="space-y-6">
        {/* Independent Landscape Studio Header */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-medium text-emerald-700">Independent Studio · 80 Unique Projects (LAND-001 to LAND-080)</p>
            <h1 className="text-2xl font-bold text-slate-900 text-balance">Landscape Architecture Studio</h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Master outdoor site planning, closed planting polygons, native botanical spacing, hardscape grading, bioswales, irrigation zoning, and stormwater drainage across 80 independent landscape briefs.
            </p>
            <div className="flex flex-wrap gap-6 pt-2 text-sm">
              <div>
                <span className="font-mono font-bold text-slate-900 tabular-nums">{completedIds.length} / 80</span>
                <span className="text-slate-500 ml-1.5">Completed</span>
              </div>
              <div>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {attempts.filter((a) => a.studio === "landscape").length}
                </span>
                <span className="text-slate-500 ml-1.5">Practice Revisions</span>
              </div>
              <div>
                <span className="font-mono font-bold text-slate-900 tabular-nums">{PLANT_DATABASE.length}</span>
                <span className="text-slate-500 ml-1.5">Linked Botanical Species</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 min-h-[160px]">
            <img
              src="/src/assets/images/studio_landscape_masterplan_1795154348320.jpg"
              alt="Architectural site model of terraced garden and bioswale landscape"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Batch Filter & Search */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedBatch(0)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${
                  selectedBatch === 0 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                All 80 Projects
              </button>
              {LANDSCAPE_BATCHES.map((b) => (
                <button
                  key={b.batchIndex}
                  type="button"
                  onClick={() => setSelectedBatch(b.batchIndex)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${
                    selectedBatch === b.batchIndex
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {String((b.batchIndex - 1) * 10 + 1).padStart(2, "0")}–{String(b.batchIndex * 10).padStart(2, "0")} {b.batchTitle}
                </button>
              ))}
            </div>
            <input
              type="search"
              aria-label="Search landscape projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search LAND-031, bioswale, courtyard..."
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md w-full sm:w-64"
            />
          </div>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="landscape-project-grid">
          {filteredProjects.map((proj) => {
            const isDone = completedIds.includes(proj.id);
            const attemptCount = attempts.filter((a) => a.projectId === proj.id).length;
            return (
              <div
                key={proj.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-emerald-500 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono font-semibold text-emerald-800">{proj.id}</span>
                    <span>
                      {proj.level} · {proj.northAngleDeg}°N
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base leading-snug">{proj.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{proj.brief}</p>
                  <p className="text-xs font-mono text-slate-500 tabular-nums">
                    Site {(proj.referencePlan.siteWidthMm / 1000).toFixed(1)}m × {(proj.referencePlan.siteDepthMm / 1000).toFixed(1)}m · {proj.referencePlan.plants.length} plants
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium flex items-center gap-1 ${isDone ? "text-emerald-700" : "text-slate-500"}`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    {isDone ? "Validated" : attemptCount > 0 ? `${attemptCount} draft(s)` : "Not started"}
                  </span>
                  <button
                    type="button"
                    onClick={() => openProject(proj)}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-800 text-white rounded-md hover:bg-emerald-900 whitespace-nowrap shrink-0"
                  >
                    Open Studio
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const validation = validateLandscapePlan(draftPlan, activeProject);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveProject(null)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All 80 Landscapes
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-emerald-700">{activeProject.id}</span>
              <span>·</span>
              <span>{activeProject.batchTitle}</span>
              <span>·</span>
              <span>{activeProject.level}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{activeProject.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setStage("practice")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              stage === "practice" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Stage A: Practice
          </button>
          <button
            type="button"
            onClick={() => setStage("reference")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              stage === "reference" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Stage B: Master Plan
          </button>
          <button
            type="button"
            onClick={() => setStage("review")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              stage === "review" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Stage C: Review
          </button>
        </div>
      </div>

      {/* Brief & Site Metadata */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        <div className="lg:col-span-2 space-y-1.5">
          <h3 className="font-semibold text-slate-900 text-sm">Landscape Brief & Grading Condition</h3>
          <p className="text-slate-700 leading-relaxed">{activeProject.brief}</p>
          <p className="text-slate-500">{activeProject.siteCondition}</p>
        </div>
        <div className="space-y-1.5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Site Dimensions</span>
            <span className="font-mono font-medium text-slate-900">
              {(activeProject.referencePlan.siteWidthMm / 1000).toFixed(1)}m × {(activeProject.referencePlan.siteDepthMm / 1000).toFixed(1)}m
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Climate Zone</span>
            <span className="font-medium text-slate-900">{activeProject.climateZone}</span>
          </div>
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAskTutor(`Landscape Project ${activeProject.id} (${activeProject.title}): ${activeProject.brief}`)}
              className="px-2.5 py-1 text-xs font-medium border border-emerald-300 bg-emerald-50 text-emerald-800 rounded hover:bg-emerald-100"
            >
              Ask Teaching Assistant
            </button>
            <button
              type="button"
              onClick={onOpen3D}
              className="px-2.5 py-1 text-xs font-medium border border-slate-300 bg-white text-slate-700 rounded hover:bg-slate-50 flex items-center gap-1"
            >
              <Box className="w-3.5 h-3.5" />
              3D Landscape View
            </button>
          </div>
        </div>
      </div>

      {stage === "practice" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium text-slate-800">
                Freehand 2D Landscape CAD · Draw footprint, zones, paths, species, utilities & spot levels yourself
              </span>
              <button
                type="button"
                onClick={() =>
                  setDraftPlan({
                    ...draftPlan,
                    buildingFootprint: { x: 0, y: 0, widthMm: 0, depthMm: 0, entranceX: 0, entranceY: 0 },
                    polygons: [],
                    pathways: [],
                    plants: [],
                    utilities: [],
                    furniture: [],
                    spotLevels: [],
                  })
                }
                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                Clear Canvas
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-600 tabular-nums">
                Live Check: {validation.passCount}/{validation.totalApplicable} passing
              </span>
              <button
                type="button"
                onClick={() => handleSavePractice(false)}
                className="px-3 py-1.5 rounded bg-emerald-800 text-white font-medium hover:bg-emerald-900"
              >
                Save Landscape Draft
              </button>
            </div>
          </div>

          {saveFeedback && (
            <div className="px-4 py-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              {saveFeedback}
            </div>
          )}

          <CadCanvas2D
            mode="landscape"
            plan={draftPlan}
            sheet="master_plan"
            projectId={activeProject.id}
            projectTitle={`${activeProject.title} (Practice Canvas)`}
            northAngleDeg={activeProject.northAngleDeg}
            editable={true}
            onChangePlan={setDraftPlan}
          />
        </div>
      )}

      {stage === "reference" && (
        <div className="space-y-4">
          {!referenceUnlocked ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
              <Trees className="w-8 h-8 text-emerald-700 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-900">Completed Landscape Master Plan Package</h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Practice placing paths, closed planting beds, trees, and irrigation lines in Stage A before revealing the completed 8-layer master plan and schedules.
              </p>
              <button
                type="button"
                onClick={() => setReferenceUnlocked(true)}
                className="px-5 py-2.5 text-sm font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
              >
                Reveal Completed Master Plan & Schedules
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                <p className="px-2 py-1 text-xs font-semibold text-slate-500">Landscape Sheet Layers</p>
                {LANDSCAPE_SHEETS.map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() => setSheet(sh.id)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                      sheet === sh.id ? "bg-emerald-700 text-white font-medium" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>

              <div className="xl:col-span-3 space-y-4">
                <CadCanvas2D
                  mode="landscape"
                  plan={activeProject.referencePlan}
                  sheet={sheet}
                  projectId={activeProject.id}
                  projectTitle={`${activeProject.title} (Reference Master Plan)`}
                  northAngleDeg={activeProject.northAngleDeg}
                  editable={false}
                />

                {/* Connected Plant Schedule & Material Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Plant Schedule (Linked to Botanical DB)</h4>
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-1.5 pr-2">ID</th>
                          <th className="py-1.5 pr-2">Botanical Name</th>
                          <th className="py-1.5 pr-2">Common Name</th>
                          <th className="py-1.5">Min Spacing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeProject.referencePlan.plants.map((pl) => (
                          <tr key={pl.id}>
                            <td className="py-1.5 pr-2 font-mono font-semibold text-emerald-800">{pl.id}</td>
                            <td className="py-1.5 pr-2 italic">{pl.botanicalName}</td>
                            <td className="py-1.5 pr-2">{pl.commonName}</td>
                            <td className="py-1.5 font-mono">{pl.spacingMinMm} mm</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Hardscape & Engineering Material Schedule</h4>
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-1.5 pr-2">Zone / Line</th>
                          <th className="py-1.5">Specification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeProject.referencePlan.pathways.map((p) => (
                          <tr key={p.id}>
                            <td className="py-1.5 pr-2 font-medium text-slate-900">{p.label}</td>
                            <td className="py-1.5 text-slate-600">{p.material} ({p.widthMm}mm wide)</td>
                          </tr>
                        ))}
                        {activeProject.referencePlan.utilities.map((u) => (
                          <tr key={u.id}>
                            <td className="py-1.5 pr-2 font-medium text-slate-900">{u.label}</td>
                            <td className="py-1.5 text-slate-600">{u.spec}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Landscape Technical Validation</h3>
                <p className="text-xs text-slate-500">Checks site alignment, path connectivity, planting polygons, plant IDs, irrigation & drainage.</p>
              </div>
              <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                {validation.passCount} / {validation.totalApplicable} Passed
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {validation.checks.map((chk) => (
                <div key={chk.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {chk.category} — {chk.label}
                    </p>
                    <p className="text-slate-600 mt-0.5">{chk.detail}</p>
                  </div>
                  <span
                    className={`flex items-center gap-1 font-medium whitespace-nowrap shrink-0 ${
                      chk.status === "Pass"
                        ? "text-emerald-700"
                        : chk.status === "Needs attention"
                          ? "text-amber-700"
                          : "text-slate-500"
                    }`}
                  >
                    {chk.status === "Pass" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : chk.status === "Needs attention" ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <HelpCircle className="w-4 h-4" />
                    )}
                    {chk.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
              <h4 className="font-semibold text-slate-900 text-sm">Design Explanation</h4>
              <p className="text-slate-700 leading-relaxed">{activeProject.designExplanation}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
              <h4 className="font-semibold text-slate-900 text-sm">Final Landscape Assessment</h4>
              <p className="text-slate-800 font-medium">{activeProject.assessmentQuestion.prompt}</p>
              <div className="space-y-2">
                {activeProject.assessmentQuestion.options.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer ${
                      quizAnswer === idx ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`land-quiz-${activeProject.id}`}
                      checked={quizAnswer === idx}
                      onChange={() => setQuizAnswer(idx)}
                      className="mt-0.5"
                    />
                    <span className="text-slate-800">{opt}</span>
                  </label>
                ))}
              </div>
              {quizAnswer !== null && (
                <p
                  className={`p-2 rounded border ${
                    quizAnswer === activeProject.assessmentQuestion.correctIndex
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  {quizAnswer === activeProject.assessmentQuestion.correctIndex
                    ? `Correct: ${activeProject.assessmentQuestion.explanation}`
                    : "Review positive drainage & foundation setbacks and try again."}
                </p>
              )}
              <button
                type="button"
                onClick={() => handleSavePractice(true)}
                className="w-full py-2 px-4 rounded-md bg-emerald-700 text-white font-medium hover:bg-emerald-800"
              >
                Validate & Complete {activeProject.id}
              </button>
              {saveFeedback && <p className="text-xs text-slate-700">{saveFeedback}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
