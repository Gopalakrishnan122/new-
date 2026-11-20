import React, { useState } from "react";
import {
  ACADEMY_LESSONS,
  INTERVIEW_QUESTIONS,
  SOFTWARE_TRACKS,
  STANDARDS_REFERENCES,
} from "../data/academyCurriculum";
import { ERGONOMIC_STANDARDS, MATERIALS_LIBRARY, PLANT_DATABASE } from "../data/materialsAndPlants";
import type { PracticeAttempt } from "../core/types";
import { CheckCircle2, Printer } from "lucide-react";

export const AcademyView: React.FC<{
  completedLessons: string[];
  onToggleLesson: (id: string) => void;
  onAskTutor: (ctx: string) => void;
}> = ({ completedLessons, onToggleLesson, onAskTutor }) => {
  const [tab, setTab] = useState<"curriculum" | "software">("curriculum");
  const [selectedSoftware, setSelectedSoftware] = useState(SOFTWARE_TRACKS[0]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academy Curriculum & Software Tracks</h1>
          <p className="text-sm text-slate-600">
            Systematic training from beginner CAD to professional Architecture, Civil/Structural, MEP, BIM, Landscape, and Project Management.
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTab("curriculum")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              tab === "curriculum" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
            }`}
          >
            Engineering & Design Courses
          </button>
          <button
            type="button"
            onClick={() => setTab("software")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              tab === "software" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
            }`}
          >
            7 Software Learning Tracks
          </button>
        </div>
      </div>

      {tab === "curriculum" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACADEMY_LESSONS.map((les) => {
            const done = completedLessons.includes(les.id);
            return (
              <div key={les.id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-blue-700">{les.track}</span>
                    <span>{les.level}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{les.title}</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">{les.summary}</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                    {les.keyConcepts.map((kc, i) => (
                      <li key={i}>{kc}</li>
                    ))}
                  </ul>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800">
                    <strong>Practical Rule:</strong> {les.practicalRule}
                  </div>
                  <p className="text-[11px] text-slate-500">{les.legalVsRecommendation}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onAskTutor(`Teach me ${les.title} (${les.track}) step by step.`)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50"
                  >
                    Ask Tutor
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleLesson(les.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 ${
                      done ? "bg-emerald-700 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {done ? "Completed" : "Mark Lesson Done"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
            <p className="px-2 py-1 text-xs font-semibold text-slate-500">CAD / BIM / 3D Software</p>
            {SOFTWARE_TRACKS.map((sw) => (
              <button
                key={sw.id}
                type="button"
                onClick={() => setSelectedSoftware(sw)}
                className={`w-full text-left px-3 py-2 text-xs rounded-md ${
                  selectedSoftware.id === sw.id ? "bg-blue-700 text-white font-medium" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {sw.name}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <p className="text-xs text-blue-700 font-medium">{selectedSoftware.levelPath}</p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{selectedSoftware.name}</h2>
              <p className="text-sm text-slate-600 mt-1">{selectedSoftware.focus}</p>
            </div>

            <div className="overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Essential Keyboard Shortcuts</h3>
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-1.5 pr-3">Shortcut</th>
                    <th className="py-1.5 pr-3">Command</th>
                    <th className="py-1.5">Real-World Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSoftware.shortcuts.map((sc) => (
                    <tr key={sc.key}>
                      <td className="py-1.5 pr-3 font-mono font-semibold text-slate-900">{sc.key}</td>
                      <td className="py-1.5 pr-3 font-mono text-blue-800">{sc.command}</td>
                      <td className="py-1.5 text-slate-600">{sc.usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-xs">
              <h3 className="text-sm font-semibold text-slate-900">Production Workflow Steps</h3>
              <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                {selectedSoftware.workflowSteps.map((st, idx) => (
                  <li key={idx}>{st}</li>
                ))}
              </ol>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-950">
              <strong>Studio Assignment:</strong> {selectedSoftware.assignment}
            </div>
            <p className="text-[11px] text-slate-500">{selectedSoftware.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const MaterialsLibraryView: React.FC = () => {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"materials" | "plants" | "ergonomics">("materials");

  const mats = MATERIALS_LIBRARY.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );
  const plants = PLANT_DATABASE.filter(
    (p) =>
      p.commonName.toLowerCase().includes(search.toLowerCase()) ||
      p.botanicalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Materials, Botanical Plants & Ergonomics Library</h1>
          <p className="text-sm text-slate-600">Reference database linked directly to landscape planting schedules and architectural specs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(
              [
                ["materials", "Building & Industrial Materials"],
                ["plants", "Botanical Plant Database"],
                ["ergonomics", "Furniture Ergonomics"],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setView(k)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                  view === k ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <input
            type="search"
            aria-label="Filter library"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter material or species..."
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md"
          />
        </div>
      </div>

      {view === "materials" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mats.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span className="font-mono font-semibold">{m.id}</span>
                <span>{m.category}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{m.name}</h3>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-slate-700">
                <div>Density: {m.densityOrUnit}</div>
                <div>Size: {m.typicalThicknessOrSize}</div>
              </div>
              <p className="text-slate-600"><strong>Finish:</strong> {m.finish}</p>
              <p className="text-slate-600"><strong>Use:</strong> {m.application}</p>
              <p className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">
                {m.sustainabilityNote}
              </p>
            </div>
          ))}
        </div>
      )}

      {view === "plants" && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Botanical Name</th>
                <th className="py-2 pr-3">Common Name</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Spread / Height (mm)</th>
                <th className="py-2 pr-3">Sun & Water</th>
                <th className="py-2">Soil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plants.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-3 font-mono font-semibold text-emerald-800">{p.id}</td>
                  <td className="py-2 pr-3 italic font-medium">{p.botanicalName}</td>
                  <td className="py-2 pr-3">{p.commonName}</td>
                  <td className="py-2 pr-3">{p.type}</td>
                  <td className="py-2 pr-3 font-mono">{p.matureSpreadMm} / {p.matureHeightMm}</td>
                  <td className="py-2 pr-3">{p.sunlight} · {p.waterDemand}</td>
                  <td className="py-2 text-slate-600">{p.soilPreference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "ergonomics" && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-3">Fixture / Furniture</th>
                <th className="py-2 pr-3">Standard Envelope</th>
                <th className="py-2">Minimum Circulation & Clearance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ERGONOMIC_STANDARDS.map((e) => (
                <tr key={e.item}>
                  <td className="py-2 pr-3 font-semibold text-slate-900">{e.item}</td>
                  <td className="py-2 pr-3 font-mono">{e.dimensionsMm}</td>
                  <td className="py-2 text-slate-600">{e.clearanceNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const StandardsReferencesView: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h1 className="text-2xl font-bold text-slate-900">Standards, Codes, BIM & Project Management References</h1>
        <p className="text-sm text-slate-600">
          Statutory life-safety and accessibility regulations are explicitly separated from design preferences. Always confirm applicable municipal bye-laws.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STANDARDS_REFERENCES.map((std) => (
          <div key={std.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <span className="font-mono text-blue-700 font-semibold">{std.category}</span>
            <h2 className="text-base font-bold text-slate-900">{std.title}</h2>
            <p className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium">{std.statutoryVsDesign}</p>
            <div className="space-y-2">
              {std.items.map((it) => (
                <div key={it.name} className="border-t border-slate-100 pt-2">
                  <p className="font-semibold text-slate-900">{it.name}</p>
                  <p className="text-slate-600 mt-0.5">{it.spec}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ExercisesAssessmentsView: React.FC = () => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const questions = [
    {
      q: "Which wall thickness differentiation correctly separates load-bearing/external enclosure from non-load-bearing internal partitions in typical brick masonry?",
      opts: ["230mm external masonry / 115mm internal partition", "50mm external / 300mm internal", "Identical 75mm hollow frame everywhere", "No wall thickness needed on 2D CAD"],
      ans: 0,
      exp: "External walls (230mm) carry weatherproofing, thermal mass, and perimeter loads, whereas 115mm internal partitions save carpet area.",
    },
    {
      q: "In BIM MEP coordination, what is a Hard Clash?",
      opts: [
        "Two physical elements occupying the same 3D space (e.g., 150mm pipe intersecting an RC beam)",
        "A client requesting a different paint color",
        "Using 1:100 scale instead of 1:50",
        "Choosing native drought-tolerant plants",
      ],
      ans: 0,
      exp: "Hard Clashes represent geometric intersections between disciplines that must be resolved before GFC issue.",
    },
    {
      q: "What is the maximum recommended slope for an accessible entrance ramp?",
      opts: ["1:12 (approx 8.33%) with level landings", "1:4 (25%)", "1:2 (50%)", "0% vertical step"],
      ans: 0,
      exp: "1:12 is the maximum accessible ramp gradient with 1500mm level landings and handrails.",
    },
  ];

  const score = questions.reduce((acc, q, i) => (selectedAnswers[i] === q.ans ? acc + 1 : acc), 0);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exercises & Multi-Discipline Assessments</h1>
          <p className="text-sm text-slate-600">Test your mastery across Architectural Geometry, BIM Clash Coordination, and Universal Design.</p>
        </div>
        <div className="font-mono text-lg font-bold text-blue-700 tabular-nums">
          Score: {score} / {questions.length}
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <p className="text-sm font-semibold text-slate-900">Q{idx + 1}. {item.q}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {item.opts.map((opt, oIdx) => (
                <label
                  key={oIdx}
                  className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer ${
                    selectedAnswers[idx] === oIdx ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`exam-q-${idx}`}
                    checked={selectedAnswers[idx] === oIdx}
                    onChange={() => setSelectedAnswers((prev) => ({ ...prev, [idx]: oIdx }))}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {selectedAnswers[idx] !== undefined && (
              <p className={`p-2 rounded border ${selectedAnswers[idx] === item.ans ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
                {selectedAnswers[idx] === item.ans ? `Correct — ${item.exp}` : `Needs review — ${item.exp}`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const MyProjectsRegisterView: React.FC<{
  attempts: PracticeAttempt[];
  completedRes: string[];
  completedLand: string[];
}> = ({ attempts, completedRes, completedLand }) => {
  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h1 className="text-2xl font-bold text-slate-900">My Projects & Drawing Revision Register</h1>
        <p className="text-sm text-slate-600">
          Every saved practice drawing attempt across Residential and Landscape studios is logged below for revision tracking.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="py-2 pr-3">Revision ID</th>
              <th className="py-2 pr-3">Project ID</th>
              <th className="py-2 pr-3">Studio</th>
              <th className="py-2 pr-3">Checks</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Saved At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {attempts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No practice revisions saved yet. Open any project in Residential Architecture or Landscape Architecture to save your first draft.
                </td>
              </tr>
            ) : (
              attempts.slice().reverse().map((att) => (
                <tr key={att.id}>
                  <td className="py-2 pr-3 font-mono text-slate-700">{att.id}</td>
                  <td className="py-2 pr-3 font-mono font-semibold text-slate-900">{att.projectId}</td>
                  <td className="py-2 pr-3 capitalize">{att.studio}</td>
                  <td className="py-2 pr-3 font-mono tabular-nums">{att.checksPassed}/{att.checksTotal}</td>
                  <td className="py-2 pr-3 font-medium">
                    {att.validated || completedRes.includes(att.projectId) || completedLand.includes(att.projectId)
                      ? "Validated"
                      : "Draft in Review"}
                  </td>
                  <td className="py-2 font-mono text-slate-500">{new Date(att.timestamp).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PortfolioView: React.FC<{
  completedRes: string[];
  completedLand: string[];
  completedDesign: string[];
  completedLessons: string[];
}> = ({ completedRes, completedLand, completedDesign, completedLessons }) => {
  const milestones = [
    { label: "1. Complete a Residential Design Project", done: completedRes.length >= 1 },
    { label: "2. Complete a Landscape Master Plan", done: completedLand.length >= 1 },
    { label: "3. Coordinated Arch & MEP Package (Study MEP Lesson)", done: completedLessons.includes("LES-MEP-01") },
    { label: "4. Construction Documentation & BOQ Study", done: completedLessons.includes("LES-DOC-01") && completedLessons.includes("LES-CIV-01") },
    { label: "5. Complete a Product Design Module", done: completedDesign.length >= 1 },
    { label: "6. Mechanical Assembly & Tolerance Module", done: completedDesign.includes("ID-003") || completedDesign.includes("ID-004") },
    { label: "7. BIM Coordination & Handover Readiness", done: completedLessons.includes("LES-BIM-01") },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Professional Portfolio & 7-Milestone Pathway</h1>
          <p className="text-sm text-slate-600">Curated summary of your verified architectural, landscape, MEP, and industrial design milestones.</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 flex items-center gap-1.5 no-print"
        >
          <Printer className="w-4 h-4" />
          Print / Save Portfolio PDF
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-900">Final Professional Completion Pathway</h2>
        <div className="divide-y divide-slate-100">
          {milestones.map((m) => (
            <div key={m.label} className="py-2.5 flex items-center justify-between text-sm">
              <span className="text-slate-800">{m.label}</span>
              <span className={`text-xs font-medium ${m.done ? "text-emerald-700" : "text-slate-400"}`}>
                {m.done ? "Verified Complete" : "In Progress"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const InterviewPrepView: React.FC = () => {
  const [discipline, setDiscipline] = useState<string>("All");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const filtered = INTERVIEW_QUESTIONS.filter((q) => discipline === "All" || q.discipline === discipline);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Technical Interview Preparation</h1>
          <p className="text-sm text-slate-600">Practice real studio & engineering interview questions across all disciplines.</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
          {["All", "Architecture", "Landscape", "Civil & Structural", "MEP", "Industrial Design"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDiscipline(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                discipline === d ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((q) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-mono font-semibold text-blue-700">{q.id} · {q.discipline}</span>
              <span>Key terms: {q.keyTerms.join(" · ")}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">{q.question}</h2>
            {revealed[q.id] ? (
              <p className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 leading-relaxed">{q.strongAnswer}</p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white font-medium text-slate-800 hover:bg-slate-50"
              >
                Reveal Model Interview Answer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
