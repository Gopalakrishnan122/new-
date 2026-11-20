import React, { useEffect, useMemo, useState } from "react";
import { RESIDENTIAL_BATCHES, RESIDENTIAL_PROJECTS } from "../data/residentialCatalog";
import type {
  ArchitecturalSheetId,
  PracticeAttempt,
  ResidentialPlanGeometry,
  ResidentialProject,
} from "../core/types";
import { validateResidentialPlan } from "../core/geometryValidation";
import { analyzeSunlight, analyzeVastuGrid, analyzeVentilation, SunSeason, SunTimeSlot, WindMode } from "../core/sunWindVastu";
import { ERGONOMIC_STANDARDS } from "../data/materialsAndPlants";
import { CadCanvas2D } from "./CadCanvas2D";
import { CheckCircle2, AlertTriangle, HelpCircle, ArrowLeft, Layers, Sun, Wind, Compass, Box } from "lucide-react";

interface ResidentialStudioProps {
  completedIds: string[];
  attempts: PracticeAttempt[];
  initialProjectId?: string | null;
  onClearInitialProject?: () => void;
  onSaveAttempt: (attempt: PracticeAttempt, markCompleted: boolean) => void;
  onOpen3D: (project: ResidentialProject) => void;
  onAskTutor: (context: string) => void;
}

const SHEET_LIST: { id: ArchitecturalSheetId; label: string }[] = [
  { id: "site_plan", label: "01. Site Plan" },
  { id: "floor_plan", label: "02. Dimensioned Floor Plan" },
  { id: "wall_layout", label: "03. Wall & Thickness Plan" },
  { id: "door_window", label: "04. Door & Window Layout" },
  { id: "furniture", label: "05. Furniture Layout" },
  { id: "kitchen_bath", label: "06. Kitchen & Bath Fixtures" },
  { id: "staircase", label: "07. Staircase Drawing" },
  { id: "electrical", label: "08. Electrical Layout" },
  { id: "plumbing", label: "09. Plumbing Layout" },
  { id: "floor_finish", label: "10. Floor Finish Plan" },
  { id: "elevations", label: "11. Elevations" },
  { id: "sections", label: "12. Sections" },
  { id: "construction_details", label: "13. Construction Details" },
  { id: "sun_shadow", label: "14. Sunlight & Shadow" },
  { id: "ventilation", label: "15. Natural Ventilation" },
  { id: "vastu", label: "16. Vastu Analysis" },
  { id: "presentation_3d", label: "17. 3D Presentation" },
];

export const ResidentialStudio: React.FC<ResidentialStudioProps> = ({
  completedIds,
  attempts,
  initialProjectId,
  onClearInitialProject,
  onSaveAttempt,
  onOpen3D,
  onAskTutor,
}) => {
  const [selectedBatch, setSelectedBatch] = useState<number>(0); // 0 = All 80
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeProject, setActiveProject] = useState<ResidentialProject | null>(null);
  const [stage, setStage] = useState<"practice" | "reference" | "review">("practice");
  const [sheet, setSheet] = useState<ArchitecturalSheetId>("floor_plan");
  const [referenceUnlocked, setReferenceUnlocked] = useState<boolean>(false);

  // Practice canvas editable state
  const [draftPlan, setDraftPlan] = useState<ResidentialPlanGeometry | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Environmental overlay controls
  const [sunSlot, setSunSlot] = useState<SunTimeSlot>("morning");
  const [sunSeason, setSunSeason] = useState<SunSeason>("summer");
  const [overhangMm, setOverhangMm] = useState<number>(600);
  const [windMode, setWindMode] = useState<WindMode>("daytime");

  const filteredProjects = useMemo(() => {
    return RESIDENTIAL_PROJECTS.filter((p) => {
      if (selectedBatch !== 0 && p.batchIndex !== selectedBatch) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedBatch, searchQuery]);

  function openProject(project: ResidentialProject) {
    const existing = attempts
      .filter((a) => a.projectId === project.id && a.studio === "residential" && a.residentialPlan)
      .slice(-1)[0];

    setActiveProject(project);
    setDraftPlan(
      existing?.residentialPlan
        ? structuredClone(existing.residentialPlan)
        : {
            plotWidthMm: project.referencePlan.plotWidthMm,
            plotDepthMm: project.referencePlan.plotDepthMm,
            setbacksMm: { ...project.referencePlan.setbacksMm },
            walls: [],
            openings: [],
            rooms: [],
            furniture: [],
            mepNodes: [],
            hasStaircase: project.referencePlan.hasStaircase,
            floors: project.referencePlan.floors,
            scaleLabel: project.referencePlan.scaleLabel,
          }
    );
    setStage("practice");
    setSheet("floor_plan");
    setReferenceUnlocked(false);
    setQuizAnswer(null);
    setSaveFeedback(null);
  }

  useEffect(() => {
    if (!initialProjectId) return;
    const found = RESIDENTIAL_PROJECTS.find((p) => p.id === initialProjectId);
    if (found) {
      openProject(found);
    }
    onClearInitialProject?.();
  }, [initialProjectId]);

  function handleSavePractice(asCompleteAttempt = false) {
    if (!activeProject || !draftPlan) return;
    const validation = validateResidentialPlan(draftPlan, activeProject);
    const quizPassed = quizAnswer === activeProject.assessmentQuestion.correctIndex;
    const canComplete = asCompleteAttempt && validation.overallReady && quizPassed;

    const attempt: PracticeAttempt = {
      id: `ATT-${Date.now()}`,
      projectId: activeProject.id,
      studio: "residential",
      timestamp: new Date().toISOString(),
      revisionNote: canComplete ? "Validated & Assessed Revision" : "Practice Draft Revision",
      residentialPlan: structuredClone(draftPlan),
      checksPassed: validation.passCount,
      checksTotal: validation.totalApplicable,
      validated: canComplete,
    };
    onSaveAttempt(attempt, canComplete);
    setSaveFeedback(
      canComplete
        ? `${activeProject.id} passed all ${validation.passCount}/${validation.totalApplicable} technical checks and assessment!`
        : `Draft saved (${validation.passCount}/${validation.totalApplicable} checks passing). Complete all checks and the assessment to mark ${activeProject.id} finished.`
    );
  }

  if (!activeProject || !draftPlan) {
    return (
      <div className="space-y-6">
        {/* Studio Header */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-medium text-blue-700">Independent Studio · 80 Unique Projects (HOUSE-001 to HOUSE-080)</p>
            <h1 className="text-2xl font-bold text-slate-900 text-balance">Residential Architecture Studio</h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Practice architectural planning from compact 1BHK homes to Chettinad courtyard residences and G+2 duplexes. Every project includes a blank CAD practice canvas, 17 editable reference sheets, solar/airflow/Vastu checks, and automated wall-opening geometry validation.
            </p>
            <div className="flex flex-wrap gap-6 pt-2 text-sm">
              <div>
                <span className="font-mono font-bold text-slate-900 tabular-nums">{completedIds.length} / 80</span>
                <span className="text-slate-500 ml-1.5">Completed</span>
              </div>
              <div>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {attempts.filter((a) => a.studio === "residential").length}
                </span>
                <span className="text-slate-500 ml-1.5">Practice Revisions</span>
              </div>
              <div>
                <span className="font-mono font-bold text-slate-900 tabular-nums">17</span>
                <span className="text-slate-500 ml-1.5">Sheets per Project</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 min-h-[160px]">
            <img
              src="/src/assets/images/studio_residential_courtyard_1795154348993.jpg"
              alt="Contemporary Tamil Nadu courtyard residence architecture"
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
              {RESIDENTIAL_BATCHES.map((b) => (
                <button
                  key={b.batchIndex}
                  type="button"
                  onClick={() => setSelectedBatch(b.batchIndex)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${
                    selectedBatch === b.batchIndex
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {String((b.batchIndex - 1) * 10 + 1).padStart(2, "0")}–{String(b.batchIndex * 10).padStart(2, "0")} {b.batchTitle}
                </button>
              ))}
            </div>
            <input
              type="search"
              aria-label="Search residential projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search HOUSE-025, courtyard, duplex..."
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md w-full sm:w-64"
            />
          </div>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="residential-project-grid">
          {filteredProjects.map((proj) => {
            const isDone = completedIds.includes(proj.id);
            const attemptCount = attempts.filter((a) => a.projectId === proj.id).length;
            return (
              <div
                key={proj.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-blue-400 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-800">{proj.id}</span>
                    <span>
                      {proj.level} · {proj.roadSide}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base leading-snug">{proj.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{proj.brief}</p>
                  <p className="text-xs font-mono text-slate-500 tabular-nums">
                    Plot {(proj.referencePlan.plotWidthMm / 1000).toFixed(1)}m × {(proj.referencePlan.plotDepthMm / 1000).toFixed(1)}m · {proj.referencePlan.rooms.length} zones
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
                    className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
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

  // Active Project Workspace
  const currentPlanForView = stage === "reference" ? activeProject.referencePlan : draftPlan;
  const validation = validateResidentialPlan(draftPlan, activeProject);
  const refSun =
    sheet === "sun_shadow"
      ? analyzeSunlight(currentPlanForView, activeProject.northAngleDeg, sunSlot, sunSeason, overhangMm)
      : null;
  const refWind =
    sheet === "ventilation"
      ? analyzeVentilation(currentPlanForView, activeProject.prevailingWindDeg, windMode)
      : null;
  const refVastu = sheet === "vastu" ? analyzeVastuGrid(currentPlanForView) : null;

  return (
    <div className="space-y-5">
      {/* Project Header Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveProject(null)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All 80 Houses
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-blue-700">{activeProject.id}</span>
              <span>·</span>
              <span>{activeProject.batchTitle}</span>
              <span>·</span>
              <span>{activeProject.level}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{activeProject.title}</h2>
          </div>
        </div>

        {/* 3 Learning Stage Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setStage("practice")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              stage === "practice" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Stage A: Practice Drawing
          </button>
          <button
            type="button"
            onClick={() => setStage("reference")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              stage === "reference" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Stage B: Reference Drawing
          </button>
          <button
            type="button"
            onClick={() => setStage("review")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              stage === "review" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Stage C: Design Review
          </button>
        </div>
      </div>

      {/* Design Brief & Site Conditions */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        <div className="lg:col-span-2 space-y-1.5">
          <h3 className="font-semibold text-slate-900 text-sm">Design Brief & Site Conditions</h3>
          <p className="text-slate-700 leading-relaxed">{activeProject.brief}</p>
          <p className="text-slate-500">{activeProject.siteCondition}</p>
          <p className="text-slate-500 italic">{activeProject.wallStandardNote}</p>
        </div>
        <div className="space-y-1.5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Plot Dimensions</span>
            <span className="font-mono font-medium text-slate-900">
              {(activeProject.referencePlan.plotWidthMm / 1000).toFixed(1)}m × {(activeProject.referencePlan.plotDepthMm / 1000).toFixed(1)}m
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Road Approach</span>
            <span className="font-medium text-slate-900">{activeProject.roadSide}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Required Zones</span>
            <span className="font-mono font-medium text-slate-900">{activeProject.requiredRooms.length}</span>
          </div>
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAskTutor(`Project ${activeProject.id} (${activeProject.title}): ${activeProject.brief}`)}
              className="px-2.5 py-1 text-xs font-medium border border-blue-300 bg-blue-50 text-blue-800 rounded hover:bg-blue-100"
            >
              Ask Teaching Assistant
            </button>
            <button
              type="button"
              onClick={() => onOpen3D(activeProject)}
              className="px-2.5 py-1 text-xs font-medium border border-slate-300 bg-white text-slate-700 rounded hover:bg-slate-50 flex items-center gap-1"
            >
              <Box className="w-3.5 h-3.5" />
              View 3D Massing
            </button>
          </div>
        </div>
      </div>

      {/* STAGE A: PRACTICE DRAWING */}
      {stage === "practice" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium text-slate-800">
                Freehand 2D CAD Editor · Draft all walls, rooms, doors, windows, furniture & MEP yourself
              </span>
              <button
                type="button"
                onClick={() =>
                  setDraftPlan({
                    ...draftPlan,
                    walls: [],
                    openings: [],
                    rooms: [],
                    furniture: [],
                    mepNodes: [],
                  })
                }
                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
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
                className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium hover:bg-slate-800"
              >
                Save Practice Revision
              </button>
            </div>
          </div>

          {saveFeedback && (
            <div className="px-4 py-2.5 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-900">
              {saveFeedback}
            </div>
          )}

          <CadCanvas2D
            mode="residential"
            plan={draftPlan}
            sheet="floor_plan"
            projectId={activeProject.id}
            projectTitle={`${activeProject.title} (Practice Canvas)`}
            northAngleDeg={activeProject.northAngleDeg}
            prevailingWindDeg={activeProject.prevailingWindDeg}
            editable={true}
            onChangePlan={setDraftPlan}
          />
        </div>
      )}

      {/* STAGE B: COMPLETED REFERENCE DRAWING (17 Sheets + Sun/Wind/Vastu + Schedules) */}
      {stage === "reference" && (
        <div className="space-y-4">
          {!referenceUnlocked ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
              <Layers className="w-8 h-8 text-blue-700 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-900">Reference Drawing Package Ready</h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                To build independent drafting intuition, try drawing your layout in Stage A first. When ready, reveal all 17 coordinated reference sheets, door/window schedules, and environmental overlays.
              </p>
              <button
                type="button"
                onClick={() => setReferenceUnlocked(true)}
                className="px-5 py-2.5 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800"
              >
                Reveal Completed Reference Drawing (17 Sheets)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              {/* 17-Sheet Selector */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 max-h-[600px] overflow-y-auto">
                <p className="px-2 py-1 text-xs font-semibold text-slate-500">17 Required Drawing Sheets</p>
                {SHEET_LIST.map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() => {
                      if (sh.id === "presentation_3d") {
                        onOpen3D(activeProject);
                      } else {
                        setSheet(sh.id);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                      sheet === sh.id
                        ? "bg-blue-700 text-white font-medium"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>

              {/* Reference Sheet Canvas + Environmental/Schedule Details */}
              <div className="xl:col-span-3 space-y-4">
                {sheet === "sun_shadow" && (
                  <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-4 text-xs">
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-600" />
                      Solar Controls:
                    </span>
                    <div className="flex gap-1">
                      {(["morning", "noon", "evening"] as SunTimeSlot[]).map((sl) => (
                        <button
                          key={sl}
                          type="button"
                          onClick={() => setSunSlot(sl)}
                          className={`px-2.5 py-1 rounded border capitalize ${
                            sunSlot === sl ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-300"
                          }`}
                        >
                          {sl}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {(["summer", "winter"] as SunSeason[]).map((se) => (
                        <button
                          key={se}
                          type="button"
                          onClick={() => setSunSeason(se)}
                          className={`px-2.5 py-1 rounded border capitalize ${
                            sunSeason === se ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"
                          }`}
                        >
                          {se}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-slate-700">
                      Overhang: {overhangMm} mm
                      <input
                        type="range"
                        min={0}
                        max={1200}
                        step={150}
                        value={overhangMm}
                        onChange={(e) => setOverhangMm(Number(e.target.value))}
                        className="w-24"
                      />
                    </label>
                  </div>
                )}

                {sheet === "ventilation" && (
                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Wind className="w-4 h-4 text-sky-600" />
                        Natural Ventilation Mode ({activeProject.climateAssumption})
                      </span>
                      <div className="flex gap-1">
                        {(["daytime", "nighttime"] as WindMode[]).map((wm) => (
                          <button
                            key={wm}
                            type="button"
                            onClick={() => setWindMode(wm)}
                            className={`px-3 py-1 rounded border capitalize ${
                              windMode === wm ? "bg-sky-700 text-white border-sky-700" : "bg-white text-slate-700 border-slate-300"
                            }`}
                          >
                            {wm} Mode
                          </button>
                        ))}
                      </div>
                    </div>
                    {refWind && (
                      <div className="text-slate-600 space-y-1">
                        <p className="font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                          {refWind.disclaimer}
                        </p>
                        <ul className="list-disc pl-5">
                          {refWind.notes.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {sheet === "vastu" && refVastu && (
                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Compass className="w-4 h-4 text-violet-700" />
                      9-Zone Vastu Directional Grid Assessment
                    </div>
                    <p className="text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded">
                      {refVastu.disclaimer}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {refVastu.findings.map((vf, i) => (
                        <div key={i} className="border border-slate-200 rounded p-2 flex justify-between items-start gap-2">
                          <div>
                            <p className="font-medium text-slate-900">
                              {vf.roomName} ({vf.direction})
                            </p>
                            <p className="text-slate-600">{vf.note}</p>
                          </div>
                          <span className="font-mono text-[11px] text-slate-700 whitespace-nowrap">{vf.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {refSun && (
                  <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex flex-wrap justify-between gap-2">
                    <span>
                      <strong>{refSun.sunDirectionLabel}</strong> · Azimuth {refSun.azimuthDeg}° · Altitude {refSun.altitudeDeg}° · Overhang Shade Factor {(refSun.overhangShadingFactor * 100).toFixed(0)}%
                    </span>
                    <span className="text-slate-600">{refSun.guidance}</span>
                  </div>
                )}

                <CadCanvas2D
                  mode="residential"
                  plan={activeProject.referencePlan}
                  sheet={sheet}
                  projectId={activeProject.id}
                  projectTitle={`${activeProject.title} (Reference Solution)`}
                  northAngleDeg={activeProject.northAngleDeg}
                  prevailingWindDeg={activeProject.prevailingWindDeg}
                  editable={false}
                  sunSlot={sunSlot}
                  sunSeason={sunSeason}
                  overhangMm={overhangMm}
                  windMode={windMode}
                />

                {/* Door & Window Schedule + Furniture Standards */}
                {sheet === "door_window" && (
                  <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Door & Window Schedule (Reference Specs)</h4>
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2 pr-3">Mark</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3">Width × Height (mm)</th>
                          <th className="py-2 pr-3">Sill / Head (mm)</th>
                          <th className="py-2">Frame / Material</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {activeProject.referencePlan.openings.map((op) => (
                          <tr key={op.id}>
                            <td className="py-1.5 pr-3 font-semibold text-slate-900">{op.label}</td>
                            <td className="py-1.5 pr-3 font-sans">{op.kind.replace(/_/g, " ")}</td>
                            <td className="py-1.5 pr-3">{op.widthMm} × {op.heightMm}</td>
                            <td className="py-1.5 pr-3">{op.sillMm} / {op.headMm}</td>
                            <td className="py-1.5 font-sans">{op.frameMaterial}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {sheet === "furniture" && (
                  <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Ergonomic Furniture & Clearance Guide</h4>
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2 pr-3">Item</th>
                          <th className="py-2 pr-3">Standard Size</th>
                          <th className="py-2">Clearance Guidance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ERGONOMIC_STANDARDS.map((e) => (
                          <tr key={e.item}>
                            <td className="py-1.5 pr-3 font-medium text-slate-900">{e.item}</td>
                            <td className="py-1.5 pr-3 font-mono">{e.dimensionsMm}</td>
                            <td className="py-1.5 text-slate-600">{e.clearanceNote}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE C: DESIGN REVIEW & ASSESSMENT */}
      {stage === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Automated Architectural Validation Checklist</h3>
                <p className="text-xs text-slate-500">Evaluates your Stage A practice drawing geometry, openings, and room clearances.</p>
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

          {/* Design Explanation + Final Assessment */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
              <h4 className="font-semibold text-slate-900 text-sm">Design Explanation</h4>
              <p className="text-slate-700 leading-relaxed">{activeProject.designExplanation}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
              <h4 className="font-semibold text-slate-900 text-sm">Final Project Assessment</h4>
              <p className="text-slate-800 font-medium">{activeProject.assessmentQuestion.prompt}</p>
              <div className="space-y-2">
                {activeProject.assessmentQuestion.options.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer ${
                      quizAnswer === idx ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`quiz-${activeProject.id}`}
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
                    : "Review room & wall coordination principles and try again."}
                </p>
              )}

              <button
                type="button"
                onClick={() => handleSavePractice(true)}
                className="w-full py-2 px-4 rounded-md bg-blue-700 text-white font-medium hover:bg-blue-800"
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
