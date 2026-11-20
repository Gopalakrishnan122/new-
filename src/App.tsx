import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Box,
  Calculator,
  ClipboardCheck,
  Compass,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  Home,
  Layers,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PenTool,
  RotateCcw,
  Ruler,
  Trees,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import type {
  LandscapePlanGeometry,
  LandscapeSheetId,
  NavSection,
  PracticeAttempt,
  ResidentialPlanGeometry,
  ResidentialProject,
  ArchitecturalSheetId,
} from "./core/types";
import { RESIDENTIAL_PROJECTS, RESIDENTIAL_BATCHES } from "./data/residentialCatalog";
import { LANDSCAPE_PROJECTS, LANDSCAPE_BATCHES } from "./data/landscapeCatalog";
import { ACADEMY_LESSONS } from "./data/academyCurriculum";
import { INDUSTRIAL_EXERCISES } from "./data/materialsAndPlants";
import { ResidentialStudio } from "./components/ResidentialStudio";
import { LandscapeStudio } from "./components/LandscapeStudio";
import { DesignStudio } from "./components/DesignStudio";
import { CalculatorsPanel } from "./components/CalculatorsPanel";
import { Workspace3D, type SceneMode3D } from "./components/Workspace3D";
import { CadCanvas2D } from "./components/CadCanvas2D";
import {
  AcademyView,
  ExercisesAssessmentsView,
  InterviewPrepView,
  MaterialsLibraryView,
  MyProjectsRegisterView,
  PortfolioView,
  StandardsReferencesView,
} from "./components/AcademyAndReferences";
import { TeachingAssistantDrawer } from "./components/TeachingAssistantDrawer";

interface LearnerState {
  completedResidentialIds: string[];
  completedLandscapeIds: string[];
  completedDesignIds: string[];
  completedLessons: string[];
  attempts: PracticeAttempt[];
  standaloneResPlan: ResidentialPlanGeometry;
  standaloneLandPlan: LandscapePlanGeometry;
}

const STORAGE_KEY = "arch_landscape_design_academy_v1";

function createStarterResPlan(plotWidthMm = 10000, plotDepthMm = 13000): ResidentialPlanGeometry {
  return {
    plotWidthMm,
    plotDepthMm,
    setbacksMm: { front: 1800, rear: 1200, left: 1200, right: 1200 },
    walls: [],
    openings: [],
    rooms: [],
    furniture: [],
    mepNodes: [],
    hasStaircase: false,
    floors: 1,
    scaleLabel: "1:100 @ A3",
  };
}

function createStarterLandPlan(siteWidthMm = 12000, siteDepthMm = 15000): LandscapePlanGeometry {
  return {
    siteWidthMm,
    siteDepthMm,
    buildingFootprint: {
      x: 0,
      y: 0,
      widthMm: 0,
      depthMm: 0,
      entranceX: 0,
      entranceY: 0,
    },
    polygons: [],
    pathways: [],
    plants: [],
    utilities: [],
    furniture: [],
    spotLevels: [],
    scaleLabel: "1:100 @ A3",
  };
}

function createDefaultState(): LearnerState {
  return {
    completedResidentialIds: [],
    completedLandscapeIds: [],
    completedDesignIds: [],
    completedLessons: [],
    attempts: [],
    standaloneResPlan: createStarterResPlan(),
    standaloneLandPlan: createStarterLandPlan(),
  };
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "academy", label: "Academy", icon: GraduationCap },
  { id: "residential", label: "Residential Architecture", icon: Home },
  { id: "landscape", label: "Landscape Architecture", icon: Trees },
  { id: "design_studio", label: "Design Studio", icon: Wrench },
  { id: "drawing_workspace", label: "Drawing Workspace", icon: PenTool },
  { id: "workspace_3d", label: "3D Workspace", icon: Box },
  { id: "materials", label: "Materials Library", icon: Layers },
  { id: "standards", label: "Standards and References", icon: BookOpen },
  { id: "calculators", label: "Calculators", icon: Calculator },
  { id: "exercises", label: "Exercises and Assessments", icon: ClipboardCheck },
  { id: "my_projects", label: "My Projects", icon: FolderKanban },
  { id: "portfolio", label: "Portfolio", icon: Compass },
  { id: "interview", label: "Interview Preparation", icon: HelpCircle },
  { id: "profile", label: "Profile and Progress", icon: UserCheck },
];

const SHOWCASE_LINKS: {
  id: string;
  studio: "residential" | "landscape";
  level: string;
  title: string;
}[] = [
  { id: "HOUSE-001", studio: "residential", level: "Beginner", title: "Compact 1BHK Residence" },
  { id: "HOUSE-025", studio: "residential", level: "Intermediate", title: "3BHK with Courtyard" },
  { id: "HOUSE-062", studio: "residential", level: "Advanced", title: "Chettinad-Inspired Residence" },
  { id: "LAND-001", studio: "landscape", level: "Beginner", title: "Front Entry Garden" },
  { id: "LAND-035", studio: "landscape", level: "Intermediate", title: "Urban Courtyard Pocket" },
  { id: "LAND-068", studio: "landscape", level: "Advanced", title: "Bioswale Stormwater Garden" },
];

export default function App() {
  const [section, setSection] = useState<NavSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [state, setState] = useState<LearnerState>(() => {
    const def = createDefaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LearnerState>;
        const resHasOnlyOldStarter =
          parsed.standaloneResPlan &&
          parsed.standaloneResPlan.walls.length <= 4 &&
          parsed.standaloneResPlan.walls.every((w) => ["sw-n", "sw-e", "sw-s", "sw-w"].includes(w.id)) &&
          parsed.standaloneResPlan.rooms.length === 0 &&
          parsed.standaloneResPlan.openings.length === 0;
        const landHasOnlyOldStarter =
          parsed.standaloneLandPlan &&
          parsed.standaloneLandPlan.polygons.length <= 1 &&
          parsed.standaloneLandPlan.polygons.every((p) => p.id === "lp-fp") &&
          parsed.standaloneLandPlan.plants.length === 0 &&
          parsed.standaloneLandPlan.pathways.length === 0;
        return {
          completedResidentialIds: parsed.completedResidentialIds ?? def.completedResidentialIds,
          completedLandscapeIds: parsed.completedLandscapeIds ?? def.completedLandscapeIds,
          completedDesignIds: parsed.completedDesignIds ?? def.completedDesignIds,
          completedLessons: parsed.completedLessons ?? def.completedLessons,
          attempts: parsed.attempts ?? def.attempts,
          standaloneResPlan: resHasOnlyOldStarter ? def.standaloneResPlan : (parsed.standaloneResPlan ?? def.standaloneResPlan),
          standaloneLandPlan: landHasOnlyOldStarter ? def.standaloneLandPlan : (parsed.standaloneLandPlan ?? def.standaloneLandPlan),
        };
      }
    } catch {
      // Ignore storage error and use clean initial state
    }
    return def;
  });

  // 3D Workspace active context
  const [scene3dMode, setScene3dMode] = useState<SceneMode3D>("residential");
  const [selectedHouse3d, setSelectedHouse3d] = useState<ResidentialProject>(RESIDENTIAL_PROJECTS[0]);

  // Isolated Drawing Workspace mode
  const [drawingBoardMode, setDrawingBoardMode] = useState<"residential" | "landscape">("residential");
  const [drawingResSheet, setDrawingResSheet] = useState<ArchitecturalSheetId>("floor_plan");
  const [drawingLandSheet, setDrawingLandSheet] = useState<LandscapeSheetId>("master_plan");

  // Teaching Assistant Drawer
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorContext, setTutorContext] = useState<string>("");
  const [requestedResProjectId, setRequestedResProjectId] = useState<string | null>(null);
  const [requestedLandProjectId, setRequestedLandProjectId] = useState<string | null>(null);

  // Hydrate from server persistence if available
  useEffect(() => {
    let active = true;
    fetch("/api/workspace/state")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || data.empty) return;
        setState((prev) => ({
          completedResidentialIds:
            Array.isArray(data.completedResidentialIds) && data.completedResidentialIds.length >= prev.completedResidentialIds.length
              ? data.completedResidentialIds
              : prev.completedResidentialIds,
          completedLandscapeIds:
            Array.isArray(data.completedLandscapeIds) && data.completedLandscapeIds.length >= prev.completedLandscapeIds.length
              ? data.completedLandscapeIds
              : prev.completedLandscapeIds,
          completedDesignIds:
            Array.isArray(data.completedDesignIds) && data.completedDesignIds.length >= prev.completedDesignIds.length
              ? data.completedDesignIds
              : prev.completedDesignIds,
          completedLessons:
            Array.isArray(data.completedLessons) && data.completedLessons.length >= prev.completedLessons.length
              ? data.completedLessons
              : prev.completedLessons,
          attempts:
            Array.isArray(data.attempts) && data.attempts.length >= prev.attempts.length
              ? data.attempts
              : prev.attempts,
          standaloneResPlan:
            data.standaloneResPlan &&
            data.standaloneResPlan.walls?.every((w: { id: string }) => ["sw-n", "sw-e", "sw-s", "sw-w"].includes(w.id)) &&
            (data.standaloneResPlan.rooms?.length ?? 0) === 0
              ? prev.standaloneResPlan
              : (data.standaloneResPlan ?? prev.standaloneResPlan),
          standaloneLandPlan:
            data.standaloneLandPlan &&
            data.standaloneLandPlan.polygons?.every((p: { id: string }) => p.id === "lp-fp") &&
            (data.standaloneLandPlan.plants?.length ?? 0) === 0
              ? prev.standaloneLandPlan
              : (data.standaloneLandPlan ?? prev.standaloneLandPlan),
        }));
      })
      .catch(() => {
        // Offline / fallback to localStorage
      });
    return () => {
      active = false;
    };
  }, []);

  // Persist to localStorage & server
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
    const timer = window.setTimeout(() => {
      fetch("/api/workspace/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      }).catch(() => {
        // Non-blocking server backup
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [state]);

  function openTutorWithContext(ctx: string) {
    setTutorContext(ctx);
    setTutorOpen(true);
  }

  function handleSaveResidentialAttempt(attempt: PracticeAttempt, markCompleted: boolean) {
    setState((prev) => {
      const completedResidentialIds =
        markCompleted && !prev.completedResidentialIds.includes(attempt.projectId)
          ? [...prev.completedResidentialIds, attempt.projectId]
          : prev.completedResidentialIds;
      return {
        ...prev,
        attempts: [...prev.attempts, attempt],
        completedResidentialIds,
      };
    });
  }

  function handleSaveLandscapeAttempt(attempt: PracticeAttempt, markCompleted: boolean) {
    setState((prev) => {
      const completedLandscapeIds =
        markCompleted && !prev.completedLandscapeIds.includes(attempt.projectId)
          ? [...prev.completedLandscapeIds, attempt.projectId]
          : prev.completedLandscapeIds;
      return {
        ...prev,
        attempts: [...prev.attempts, attempt],
        completedLandscapeIds,
      };
    });
  }

  function handleToggleDesignComplete(id: string) {
    setState((prev) => ({
      ...prev,
      completedDesignIds: prev.completedDesignIds.includes(id)
        ? prev.completedDesignIds.filter((item) => item !== id)
        : [...prev.completedDesignIds, id],
    }));
  }

  function handleToggleLesson(id: string) {
    setState((prev) => ({
      ...prev,
      completedLessons: prev.completedLessons.includes(id)
        ? prev.completedLessons.filter((item) => item !== id)
        : [...prev.completedLessons, id],
    }));
  }

  function handleOpenResidential3D(project: ResidentialProject) {
    setSelectedHouse3d(project);
    setScene3dMode("residential");
    setSection("workspace_3d");
  }

  function handleResetProgress() {
    const clean = createDefaultState();
    setState(clean);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore
    }
    fetch("/api/workspace/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clean),
    }).catch(() => {});
  }

  function navigateTo(target: NavSection) {
    setSection(target);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const awaitingValidationCount = useMemo(() => {
    const resPending = 80 - state.completedResidentialIds.length;
    const landPending = 80 - state.completedLandscapeIds.length;
    return resPending + landPending;
  }, [state.completedResidentialIds.length, state.completedLandscapeIds.length]);

  const topStudioLinks: { id: NavSection; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "residential", label: "Residential" },
    { id: "landscape", label: "Landscape" },
    { id: "design_studio", label: "Design Studio" },
    { id: "academy", label: "Academy" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900 flex flex-col">
      {/* Strictly 3-zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-3 sm:gap-8 no-print">
        {/* Zone 1: Brand Wordmark + Mobile Sidebar Toggle */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
            aria-label="Open Studio Navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigateTo("dashboard")}
            className="flex items-center gap-2 text-left min-w-0"
          >
            <Ruler className="w-5 h-5 text-blue-700 shrink-0" />
            <span className="font-bold text-sm lg:text-base tracking-tight text-slate-900 truncate whitespace-nowrap">
              Architecture + Landscape + Design Academy
            </span>
          </button>
        </div>

        {/* Zone 2: Primary Studio Links (Desktop) */}
        <nav className="hidden xl:flex items-center gap-6">
          {topStudioLinks.map((lnk) => (
            <button
              key={lnk.id}
              type="button"
              onClick={() => navigateTo(lnk.id)}
              className={`text-sm font-medium whitespace-nowrap shrink-0 pb-0.5 transition-colors ${
                section === lnk.id
                  ? "text-blue-700 border-b-2 border-blue-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lnk.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Single Primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => openTutorWithContext(`Active Workspace: ${section}`)}
            className="px-3.5 py-1.5 rounded-md bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Teaching Assistant
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Desktop Persistent 15-Item Studio Sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 py-4 px-3 no-print">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Studio Navigation
          </p>
          <nav className="space-y-0.5 flex-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-left transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-800 font-semibold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-700" : "text-slate-400"}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-4 pt-3 border-t border-slate-200 px-3 space-y-1 text-[11px] text-slate-500">
            <div className="flex justify-between tabular-nums">
              <span>Residential</span>
              <span className="font-mono font-semibold text-slate-800">{state.completedResidentialIds.length}/80</span>
            </div>
            <div className="flex justify-between tabular-nums">
              <span>Landscape</span>
              <span className="font-mono font-semibold text-slate-800">{state.completedLandscapeIds.length}/80</span>
            </div>
            <div className="flex justify-between tabular-nums">
              <span>Product Design</span>
              <span className="font-mono font-semibold text-slate-800">
                {state.completedDesignIds.length}/{INDUSTRIAL_EXERCISES.length}
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative w-72 max-w-[85vw] bg-white h-full overflow-y-auto p-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <span className="font-bold text-sm text-slate-900">Studio Navigation</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                  aria-label="Close Navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-left ${
                        active ? "bg-blue-50 text-blue-800 font-semibold" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Studio Canvas */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
          {section === "dashboard" && (
            <div className="space-y-6">
              {/* Hero Split */}
              <section className="bg-white border border-slate-200 rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
                <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold tracking-wide uppercase text-blue-700">
                      Beginner AutoCAD & SketchUp to Working Designer
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
                      Three Independent Studios for Architecture, Landscape, and Product Design
                    </h1>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                      Practice real 2D architectural drafting with cut door/window wall geometry, develop coordinated botanical landscape master plans, solve structural SFD/BMD and MEP engineering problems, and inspect parametric 3D models.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigateTo("residential")}
                      className="px-4 py-2 text-xs font-semibold bg-blue-700 text-white rounded-md hover:bg-blue-800"
                    >
                      Enter Residential Studio (80 Projects)
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo("landscape")}
                      className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
                    >
                      Enter Landscape Studio (80 Projects)
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo("design_studio")}
                      className="px-4 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-md hover:bg-slate-50"
                    >
                      Open Product Design Studio
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 min-h-[220px] bg-slate-100 border-t lg:border-t-0 lg:border-l border-slate-200">
                  <img
                    src="/src/assets/images/hero_architectural_studio_1795154349525.jpg"
                    alt="Architectural drafting workstation with scaled floor plan, wooden scale ruler, and site study model"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </section>

              {/* 4-Card Studio Completion Tracker */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-1">
                  <p className="text-xs font-medium text-slate-500">Residential Architecture</p>
                  <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {state.completedResidentialIds.length} / 80
                  </p>
                  <p className="text-xs text-slate-600 tabular-nums">
                    Total Residential: 80 · 17 Drawing Sheets each
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-1">
                  <p className="text-xs font-medium text-slate-500">Landscape Architecture</p>
                  <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {state.completedLandscapeIds.length} / 80
                  </p>
                  <p className="text-xs text-slate-600 tabular-nums">
                    Total Landscape: 80 · 8 Landscape Layers each
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-1">
                  <p className="text-xs font-medium text-slate-500">Reference Drawings Ready</p>
                  <p className="text-2xl font-bold font-mono text-blue-700 tabular-nums">160</p>
                  <p className="text-xs text-slate-600 tabular-nums">
                    {awaitingValidationCount} Awaiting Learner Validation
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-1">
                  <p className="text-xs font-medium text-slate-500">Practice Revisions & Lessons</p>
                  <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                    {state.attempts.length} Saves
                  </p>
                  <p className="text-xs text-slate-600 tabular-nums">
                    {state.completedLessons.length} / {ACADEMY_LESSONS.length} Lessons · {state.completedDesignIds.length} /{" "}
                    {INDUSTRIAL_EXERCISES.length} Product Modules
                  </p>
                </div>
              </section>

              {/* Three Strictly Separated Studios */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="h-44 bg-slate-100 border-b border-slate-200">
                      <img
                        src="/src/assets/images/studio_residential_courtyard_1795154348993.jpg"
                        alt="Warm-humid residential courtyard house architectural cross-section and plan study"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <p className="text-xs font-mono text-blue-700 font-semibold">HOUSE-001 to HOUSE-080</p>
                      <h2 className="text-lg font-bold text-slate-900">Residential Architecture Studio</h2>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        80 residential briefs in 8 progressive batches. Draft Stage A floor plans on an interactive 2D grid, inspect 17 Stage B reference sheets (sunlight, airflow, Vastu, MEP, elevations), and run automated geometric validation.
                      </p>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <button
                      type="button"
                      onClick={() => navigateTo("residential")}
                      className="w-full py-2 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800"
                    >
                      Open Residential Studio
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="h-44 bg-slate-100 border-b border-slate-200">
                      <img
                        src="/src/assets/images/studio_landscape_masterplan_1795154348320.jpg"
                        alt="Landscape architecture master plan showing botanical canopy trees, limestone paving, and bioswale grading"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <p className="text-xs font-mono text-emerald-700 font-semibold">LAND-001 to LAND-080</p>
                      <h2 className="text-lg font-bold text-slate-900">Landscape Architecture Studio</h2>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        80 dedicated site and planting briefs. Coordinate permeable hardscape paths, closed lawn & planting polygons, botanical plant spacing, drip irrigation hydro-zones, and 1.5% stormwater drainage grading.
                      </p>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <button
                      type="button"
                      onClick={() => navigateTo("landscape")}
                      className="w-full py-2 text-xs font-semibold bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
                    >
                      Open Landscape Studio
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="h-44 bg-slate-100 border-b border-slate-200">
                      <img
                        src="/src/assets/images/studio_industrial_prototype_1795154348451.jpg"
                        alt="Machined aluminum planetary gear assembly and vernier caliper on technical drafting sheet"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <p className="text-xs font-mono text-amber-700 font-semibold">ID-001 to ID-009 · Engineering Labs</p>
                      <h2 className="text-lg font-bold text-slate-900">Professional Design Studio</h2>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Industrial sketching, anthropometry, planetary gear ratio and sheet-metal K-factor labs, injection-molding rib DFM checks, ISO fits, and exploded 3D mechanical assembly inspection.
                      </p>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <button
                      type="button"
                      onClick={() => navigateTo("design_studio")}
                      className="w-full py-2 text-xs font-semibold bg-amber-700 text-white rounded-md hover:bg-amber-800"
                    >
                      Open Product Design Studio
                    </button>
                  </div>
                </div>
              </section>

              {/* 6 Showcase Quick-Links + Engineering Tools */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Curated Beginner-to-Advanced Studio Samples</h2>
                      <p className="text-xs text-slate-500">
                        Jump to representative residential and landscape briefs across all skill levels.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SHOWCASE_LINKS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.studio === "residential") {
                            setRequestedResProjectId(item.id);
                          } else {
                            setRequestedLandProjectId(item.id);
                          }
                          navigateTo(item.studio);
                        }}
                        className="text-left p-3 rounded-md border border-slate-200 hover:border-blue-500 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className={item.studio === "residential" ? "text-blue-700 font-semibold" : "text-emerald-700 font-semibold"}>
                            {item.id}
                          </span>
                          <span className="text-slate-500">{item.level}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 mt-1">{item.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 capitalize">{item.studio} studio</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-slate-900">Engineering & 3D Tools</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Calculate beam SFD/BMD reactions, masonry & concrete BOQs, surveying cut/fill volumes, luminaire spacing, or inspect interactive 3D assemblies.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => navigateTo("calculators")}
                      className="w-full px-3 py-2 text-xs font-medium text-left border border-slate-200 rounded-md hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Structural, Civil BOQ, Survey & MEP Calculators</span>
                      <Calculator className="w-4 h-4 text-blue-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo("workspace_3d")}
                      className="w-full px-3 py-2 text-xs font-medium text-left border border-slate-200 rounded-md hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>3D Spatial & Mechanical Assembly Viewer</span>
                      <Box className="w-4 h-4 text-blue-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo("academy")}
                      className="w-full px-3 py-2 text-xs font-medium text-left border border-slate-200 rounded-md hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>7 Software Tracks & BIM Coordination</span>
                      <GraduationCap className="w-4 h-4 text-blue-700" />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {section === "academy" && (
            <AcademyView
              completedLessons={state.completedLessons}
              onToggleLesson={handleToggleLesson}
              onAskTutor={openTutorWithContext}
            />
          )}

          {section === "residential" && (
            <ResidentialStudio
              completedIds={state.completedResidentialIds}
              attempts={state.attempts}
              initialProjectId={requestedResProjectId}
              onClearInitialProject={() => setRequestedResProjectId(null)}
              onSaveAttempt={handleSaveResidentialAttempt}
              onOpen3D={handleOpenResidential3D}
              onAskTutor={openTutorWithContext}
            />
          )}

          {section === "landscape" && (
            <LandscapeStudio
              completedIds={state.completedLandscapeIds}
              attempts={state.attempts}
              initialProjectId={requestedLandProjectId}
              onClearInitialProject={() => setRequestedLandProjectId(null)}
              onSaveAttempt={handleSaveLandscapeAttempt}
              onOpen3D={() => {
                setScene3dMode("landscape");
                navigateTo("workspace_3d");
              }}
              onAskTutor={openTutorWithContext}
            />
          )}

          {section === "design_studio" && (
            <DesignStudio
              completedDesignIds={state.completedDesignIds}
              onToggleComplete={handleToggleDesignComplete}
              onOpenMechanical3D={() => {
                setScene3dMode("mechanical");
                navigateTo("workspace_3d");
              }}
              onAskTutor={openTutorWithContext}
            />
          )}

          {section === "drawing_workspace" && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Standalone 2D Drawing Workspace</h1>
                  <p className="text-sm text-slate-600">
                    Isolated CAD practice boards. Architectural floor plans and landscape master plans remain strictly separated.
                  </p>
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDrawingBoardMode("residential")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                      drawingBoardMode === "residential" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Residential Board (Isolated)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawingBoardMode("landscape")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                      drawingBoardMode === "landscape" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Landscape Board (Isolated)
                  </button>
                </div>
              </div>

              {drawingBoardMode === "residential" ? (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1.5">
                        <span className="text-slate-600">Plot Width (mm)</span>
                        <input
                          type="number"
                          min={5000}
                          max={30000}
                          step={500}
                          value={state.standaloneResPlan.plotWidthMm}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              standaloneResPlan: {
                                ...prev.standaloneResPlan,
                                plotWidthMm: Math.max(5000, Number(e.target.value) || 10000),
                              },
                            }))
                          }
                          className="w-24 px-2 py-1 border border-slate-300 rounded font-mono"
                        />
                      </label>
                      <label className="flex items-center gap-1.5">
                        <span className="text-slate-600">Plot Depth (mm)</span>
                        <input
                          type="number"
                          min={6000}
                          max={35000}
                          step={500}
                          value={state.standaloneResPlan.plotDepthMm}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              standaloneResPlan: {
                                ...prev.standaloneResPlan,
                                plotDepthMm: Math.max(6000, Number(e.target.value) || 13000),
                              },
                            }))
                          }
                          className="w-24 px-2 py-1 border border-slate-300 rounded font-mono"
                        />
                      </label>
                      <select
                        value={drawingResSheet}
                        onChange={(e) => setDrawingResSheet(e.target.value as ArchitecturalSheetId)}
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white"
                      >
                        <option value="floor_plan">Sheet: Dimensioned Floor Plan</option>
                        <option value="wall_layout">Sheet: Wall & Thickness</option>
                        <option value="door_window">Sheet: Door & Window Layout</option>
                        <option value="furniture">Sheet: Furniture Layout</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          standaloneResPlan: createStarterResPlan(
                            prev.standaloneResPlan.plotWidthMm,
                            prev.standaloneResPlan.plotDepthMm
                          ),
                        }))
                      }
                      className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 font-medium"
                    >
                      Clear Drawing Board
                    </button>
                  </div>

                  <CadCanvas2D
                    mode="residential"
                    plan={state.standaloneResPlan}
                    sheet={drawingResSheet}
                    projectTitle="Custom Residential Sandbox"
                    projectId="SANDBOX-RES"
                    northAngleDeg={0}
                    prevailingWindDeg={225}
                    editable={true}
                    onChangePlan={(next) =>
                      setState((prev) => ({
                        ...prev,
                        standaloneResPlan: next,
                      }))
                    }
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1.5">
                        <span className="text-slate-600">Site Width (mm)</span>
                        <input
                          type="number"
                          min={6000}
                          max={40000}
                          step={500}
                          value={state.standaloneLandPlan.siteWidthMm}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              standaloneLandPlan: {
                                ...prev.standaloneLandPlan,
                                siteWidthMm: Math.max(6000, Number(e.target.value) || 12000),
                              },
                            }))
                          }
                          className="w-24 px-2 py-1 border border-slate-300 rounded font-mono"
                        />
                      </label>
                      <label className="flex items-center gap-1.5">
                        <span className="text-slate-600">Site Depth (mm)</span>
                        <input
                          type="number"
                          min={6000}
                          max={40000}
                          step={500}
                          value={state.standaloneLandPlan.siteDepthMm}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              standaloneLandPlan: {
                                ...prev.standaloneLandPlan,
                                siteDepthMm: Math.max(6000, Number(e.target.value) || 15000),
                              },
                            }))
                          }
                          className="w-24 px-2 py-1 border border-slate-300 rounded font-mono"
                        />
                      </label>
                      <select
                        value={drawingLandSheet}
                        onChange={(e) => setDrawingLandSheet(e.target.value as LandscapeSheetId)}
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white"
                      >
                        <option value="master_plan">Layer: Landscape Master Plan</option>
                        <option value="hardscape">Layer: Hardscape & Paths</option>
                        <option value="planting">Layer: Botanical Planting</option>
                        <option value="irrigation">Layer: Irrigation Zones</option>
                        <option value="drainage">Layer: Stormwater Drainage</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          standaloneLandPlan: createStarterLandPlan(
                            prev.standaloneLandPlan.siteWidthMm,
                            prev.standaloneLandPlan.siteDepthMm
                          ),
                        }))
                      }
                      className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 font-medium"
                    >
                      Clear Drawing Board
                    </button>
                  </div>

                  <CadCanvas2D
                    mode="landscape"
                    plan={state.standaloneLandPlan}
                    sheet={drawingLandSheet}
                    projectTitle="Custom Landscape Sandbox"
                    projectId="SANDBOX-LAND"
                    northAngleDeg={0}
                    editable={true}
                    onChangePlan={(next) =>
                      setState((prev) => ({
                        ...prev,
                        standaloneLandPlan: next,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          )}

          {section === "workspace_3d" && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Interactive 3D Workspace</h1>
                  <p className="text-sm text-slate-600">
                    Inspect residential 3D massing from all 80 projects, landscape courtyard grading, or mechanical exploded assemblies.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <select
                    aria-label="Select 3D Scene Mode"
                    value={scene3dMode}
                    onChange={(e) => setScene3dMode(e.target.value as SceneMode3D)}
                    className="px-3 py-1.5 border border-slate-300 rounded-md bg-white font-medium"
                  >
                    <option value="residential">Residential Architecture Massing</option>
                    <option value="landscape">Landscape Courtyard & Terrace</option>
                    <option value="mechanical">Mechanical Planetary Gear Assembly</option>
                  </select>

                  {scene3dMode === "residential" && (
                    <select
                      aria-label="Select Residential House for 3D"
                      value={selectedHouse3d.id}
                      onChange={(e) => {
                        const found = RESIDENTIAL_PROJECTS.find((p) => p.id === e.target.value);
                        if (found) setSelectedHouse3d(found);
                      }}
                      className="px-3 py-1.5 border border-slate-300 rounded-md bg-white font-mono"
                    >
                      {RESIDENTIAL_PROJECTS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} · {p.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <Workspace3D
                key={`${scene3dMode}-${selectedHouse3d.id}`}
                initialMode={scene3dMode}
                residentialProject={selectedHouse3d}
              />
            </div>
          )}

          {section === "materials" && <MaterialsLibraryView />}
          {section === "standards" && <StandardsReferencesView />}
          {section === "calculators" && <CalculatorsPanel />}
          {section === "exercises" && <ExercisesAssessmentsView />}
          {section === "my_projects" && (
            <MyProjectsRegisterView
              attempts={state.attempts}
              completedRes={state.completedResidentialIds}
              completedLand={state.completedLandscapeIds}
            />
          )}
          {section === "portfolio" && (
            <PortfolioView
              completedRes={state.completedResidentialIds}
              completedLand={state.completedLandscapeIds}
              completedDesign={state.completedDesignIds}
              completedLessons={state.completedLessons}
            />
          )}
          {section === "interview" && <InterviewPrepView />}

          {section === "profile" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Learner Profile & Batch Mastery Progress</h1>
                  <p className="text-sm text-slate-600">
                    Track completion across all 8 Residential batches (80 projects), 8 Landscape batches (80 projects), Academy modules, and Product Design exercises.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetProgress}
                  className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-700 rounded-md hover:bg-red-50 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Saved Progress
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                  <h2 className="text-base font-bold text-slate-900">Residential Architecture Batches (8 × 10)</h2>
                  <div className="space-y-2.5 text-xs">
                    {RESIDENTIAL_BATCHES.map((batch) => {
                      const batchIds = RESIDENTIAL_PROJECTS.filter((p) => p.batchIndex === batch.batchIndex).map(
                        (p) => p.id
                      );
                      const done = batchIds.filter((id) => state.completedResidentialIds.includes(id)).length;
                      return (
                        <div key={batch.batchIndex} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-800">
                              Batch {batch.batchIndex}: {batch.batchTitle}
                            </span>
                            <span className="font-mono text-slate-600 tabular-nums">{done} / 10</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-700 transition-all"
                              style={{ width: `${(done / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                  <h2 className="text-base font-bold text-slate-900">Landscape Architecture Batches (8 × 10)</h2>
                  <div className="space-y-2.5 text-xs">
                    {LANDSCAPE_BATCHES.map((batch) => {
                      const batchIds = LANDSCAPE_PROJECTS.filter((p) => p.batchIndex === batch.batchIndex).map(
                        (p) => p.id
                      );
                      const done = batchIds.filter((id) => state.completedLandscapeIds.includes(id)).length;
                      return (
                        <div key={batch.batchIndex} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-800">
                              Batch {batch.batchIndex}: {batch.batchTitle}
                            </span>
                            <span className="font-mono text-slate-600 tabular-nums">{done} / 10</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-700 transition-all"
                              style={{ width: `${(done / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Gemini Teaching Assistant Drawer */}
      <TeachingAssistantDrawer
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        initialContext={tutorContext}
      />
    </div>
  );
}
