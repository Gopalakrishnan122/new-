export interface CurriculumLesson {
  id: string;
  track: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  summary: string;
  keyConcepts: string[];
  practicalRule: string;
  legalVsRecommendation: string;
}

export interface SoftwareTrack {
  id: string;
  name: string;
  focus: string;
  levelPath: string;
  shortcuts: { key: string; command: string; usage: string }[];
  workflowSteps: string[];
  assignment: string;
  disclaimer: string;
}

export interface InterviewQuestion {
  id: string;
  discipline: "Architecture" | "Landscape" | "Civil & Structural" | "MEP" | "Industrial Design" | "BIM & PM";
  question: string;
  strongAnswer: string;
  keyTerms: string[];
}

export const ACADEMY_LESSONS: CurriculumLesson[] = [
  {
    id: "LES-SURV-01",
    track: "Site Surveying & Site Analysis",
    title: "Boundary, Contour & Benchmark Surveying",
    level: "Beginner",
    summary:
      "Learn how to measure irregular site boundaries using triangulation, record Reduced Levels (RL) from a fixed Temporary Benchmark (TBM), and interpolate contour lines.",
    keyConcepts: [
      "Diagonal checks verify site corner angles beyond simple perimeter lengths.",
      "Spot levels on a 3m–5m grid reveal natural drainage paths and cut/fill zones.",
      "Record existing trees (girth/canopy), road invert levels, electric poles, and adjacent building heights.",
    ],
    practicalRule: "Slope (%) = (Elevation Difference / Horizontal Distance) × 100.",
    legalVsRecommendation:
      "Boundary dimensions must match registered revenue/title survey records; grid interval selection (3m vs 5m) is a field engineering recommendation.",
  },
  {
    id: "LES-DOC-01",
    track: "Architectural Documentation",
    title: "Complete 18-Sheet Working Drawing Set",
    level: "Intermediate",
    summary:
      "Understand how a professional residential package flows from Site Plan and Dimensioned Floor Plan to Wall Layout, Door/Window Schedules, RCP, Elevations, Sections, and Waterproofing Details.",
    keyConcepts: [
      "Always dimension structural wall centerlines/faces independently of furniture annotations.",
      "Reflected Ceiling Plans (RCP) coordinate beam drops, ceiling fans, recessed luminaires, and AC grilles.",
      "Sunken slab (150–200mm) and brick-bat coba / crystalline waterproofing details prevent toilet leakage.",
    ],
    practicalRule: "Every floor plan opening tag (D1, W2, V1) must cross-reference identically to the Door & Window Schedule.",
    legalVsRecommendation:
      "Minimum habitable room area, ceiling height, and setback compliance are statutory; tile layout patterns and furniture styling are design choices.",
  },
  {
    id: "LES-ACC-01",
    track: "Accessibility, Fire Safety & Building Performance",
    title: "Universal Design, Fire Egress & Envelope Comfort",
    level: "Intermediate",
    summary:
      "Design step-free accessible entrances, 1:12 ramps, 1500mm wheelchair turning circles, clear fire escape corridors, and insulated roof/wall assemblies.",
    keyConcepts: [
      "Accessible doorway clear opening >= 900mm; ramp gradient max 1:12 with 1500mm level landings.",
      "Fire exit routes must remain unobstructed, well-lit, and separated from high-hazard storage.",
      "Thermal comfort depends on roof solar reflectance (SRI), wall mass/insulation, and shaded glazing.",
    ],
    practicalRule: "Maintain a minimum 1500 × 1500 mm unobstructed turning circle inside accessible bathrooms.",
    legalVsRecommendation:
      "Mandatory fire exit widths, travel distances, and accessible ramp limits come from statutory building codes (e.g. NBC/local bye-laws); acoustic wall ratings above baseline are performance recommendations.",
  },
  {
    id: "LES-CIV-01",
    track: "Civil & Quantity Surveying",
    title: "Soil Bearing, Concrete Mix, BBS & BOQ Estimation",
    level: "Intermediate",
    summary:
      "Interpret geotechnical Safe Bearing Capacity (SBC), select isolated vs raft footings, compute Bar Bending Schedules (BBS), and prepare itemized Bills of Quantities (BOQ).",
    keyConcepts: [
      "SBC determines footing area: Area = Total Axial Load / Safe Bearing Capacity.",
      "Concrete M20/M25 batching, water-cement ratio control, and 7–14 day moist curing prevent shrinkage cracks.",
      "Unit weight of steel bar (kg/m) = d² / 162 (where d is bar diameter in mm).",
    ],
    practicalRule: "Always deduct door/window opening areas from gross masonry and plaster quantities.",
    legalVsRecommendation:
      "Structural concrete grade and cover depth are code-governed engineering specs; BOQ cost rates vary by local tender market conditions.",
  },
  {
    id: "LES-STR-01",
    track: "Structural Engineering",
    title: "Load Paths, SFD/BMD & RC Member Detailing",
    level: "Advanced",
    summary:
      "Trace Dead Load + Live Load from slab -> secondary beam -> main beam -> column -> footing -> soil, and interpret Shear Force Diagrams (SFD) and Bending Moment Diagrams (BMD).",
    keyConcepts: [
      "Simply supported UDL max moment M = wL² / 8 at midspan; max shear V = wL / 2 at supports.",
      "Tension steel sits at the bottom of midspan beams and top over continuous supports (hogging zones).",
      "Finite Element Analysis (FEA) discretizes complex shells/frames but requires hand-check equilibrium validation.",
    ],
    practicalRule: "Never rely on software output without verifying total vertical reactions equal applied loads (ΣFy = 0).",
    legalVsRecommendation:
      "Load combinations (e.g. 1.5 DL + 1.5 LL) and ductile seismic detailing are statutory; all final construction structural drawings must be approved by a licensed structural engineer.",
  },
  {
    id: "LES-MEP-01",
    track: "Advanced MEP Systems",
    title: "Electrical SLD, Plumbing Sizing, HVAC & Clash Coordination",
    level: "Advanced",
    summary:
      "Coordinate Distribution Board (DB) Single-Line Diagrams, earthing pits, dual water/sewerage slopes, stormwater harvesting, HVAC cooling loads, and fire alarms.",
    keyConcepts: [
      "Separate lighting (6A/10A MCB), power sockets (16A), and HVAC/geyser circuits with 30mA RCCB protection.",
      "Soil pipes (110mm) require continuous 1:40 to 1:60 fall without sharp 90° horizontal bends.",
      "Clash coordination checks beam soffits against HVAC ducts and plumbing sleeves before casting.",
    ],
    practicalRule: "Keep electrical conduits and DB boxes separated from wet plumbing risers.",
    legalVsRecommendation:
      "Earthing resistance, RCCB trip sensitivity, and fire suppression mandates are statutory safety rules; luminaire color temperature (3000K vs 4000K) is design intent.",
  },
  {
    id: "LES-LAND-01",
    track: "Landscape & Site Engineering",
    title: "Topographic Grading, Cut/Fill, Bioswales & Irrigation",
    level: "Intermediate",
    summary:
      "Interpolate contours around structures, balance cut and fill earthwork, size retaining walls with weep holes, and group hydro-zoned native plantings.",
    keyConcepts: [
      "Contour lines V-point uphill in valleys/swales and downhill on ridges.",
      "Positive grading away from foundations (min 2% for first 3m) prevents structural dampness.",
      "Hydro-zoning prevents over-watering drought-tolerant natives alongside high-water turf.",
    ],
    practicalRule: "Place weep holes + geotextile filter fabric behind every retaining wall to relieve hydrostatic pressure.",
    legalVsRecommendation:
      "Stormwater zero-runoff retention mandates depend on municipal rules; plant aesthetics and pergola finishes are design choices.",
  },
  {
    id: "LES-BIM-01",
    track: "BIM & Project Coordination",
    title: "Levels, Grids, LOD 100–400 & Clash Detection",
    level: "Advanced",
    summary:
      "Coordinate shared project origin (0,0,0), structural grids, linked Arch/Struct/MEP models, automated schedules, and revision cloud tracking.",
    keyConcepts: [
      "Shared coordinates keep Architectural, Structural, and MEP models aligned across teams.",
      "Clash matrix classifies Hard Clashes (beam vs pipe), Soft Clashes (maintenance clearance), and Workflow Clashes.",
      "Revision clouds, delta triangles, and Revision Registers maintain full auditability on site.",
    ],
    practicalRule: "Never model MEP pipes inside structural columns or primary shear zones without engineer sign-off.",
    legalVsRecommendation:
      "ISO 19650 naming conventions and LOD milestones are project BIM Execution Plan standards.",
  },
  {
    id: "LES-PM-01",
    track: "Professional Project Management",
    title: "Client Briefs, Site Visit Reports, Tenders & Handover",
    level: "Intermediate",
    summary:
      "Manage the full project lifecycle from client brief capture and site visit punch-lists to GFC (Good For Construction) drawing registers, tender BOQs, QA checklists, and as-built handover.",
    keyConcepts: [
      "Every site drawing issue must log Sheet ID, Revision (R0, R1, R2), Date, and Purpose (Tender / GFC).",
      "Site visit reports photograph rebar spacing, cover blocks, slump tests, and waterproof ponding tests.",
      "Handover dossier bundles As-Built Arch/MEP drawings, warranties, and maintenance schedules.",
    ],
    practicalRule: "Supersede older revisions clearly so site contractors never build from obsolete sheets.",
    legalVsRecommendation:
      "Statutory completion certificates require municipal inspection; internal QA punch-lists follow studio practice.",
  },
];

export const SOFTWARE_TRACKS: SoftwareTrack[] = [
  {
    id: "SW-AUTOCAD",
    name: "AutoCAD 2D/3D",
    focus: "Precision 2D construction documentation, layers, blocks, XREFs & plotting",
    levelPath: "Basic 2D -> Dynamic Blocks, XREF Coordination, Sheet Sets & Annotative Scaling",
    shortcuts: [
      { key: "PL / L", command: "PLINE / LINE", usage: "Closed wall boundaries & rooms" },
      { key: "O", command: "OFFSET", usage: "230mm / 115mm parallel wall thickness" },
      { key: "TR", command: "TRIM", usage: "Cut clean door & window wall openings" },
      { key: "B / I", command: "BLOCK / INSERT", usage: "Reusable doors, furniture & fixtures" },
      { key: "DIM", command: "DIMLINEAR", usage: "Consistent chain & overall dimensions" },
    ],
    workflowSteps: [
      "Set UNITS to millimeters (mm) and configure standard AIA/studio layers (A-WALL, A-DOOR, A-WIND, A-FURN, A-DIMS).",
      "Draft structural grid -> external/internal walls -> trim openings -> insert swing blocks -> place annotative dimensions.",
      "Publish multi-sheet A3/A1 PDF sets via Paper Space viewports at exact 1:100 / 1:50 scales.",
    ],
    assignment: "Draft HOUSE-007 (Basic 2BHK) with separate layers for walls, openings, furniture, and dimensions.",
    disclaimer: "Educational workflow guide only; this web academy does not remotely control local AutoCAD desktop installations.",
  },
  {
    id: "SW-SKETCHUP",
    name: "SketchUp Pro",
    focus: "Rapid architectural massing, sun/shadow studies & LayOut presentations",
    levelPath: "Basic Extrude -> Component Hierarchy, Tags, Section Cuts & LayOut Sheets",
    shortcuts: [
      { key: "P", command: "Push/Pull", usage: "Extrude floor plan walls to 3000mm" },
      { key: "G", command: "Make Component", usage: "Reusable windows, mullions & columns" },
      { key: "T", command: "Tape Measure", usage: "Precision guidelines & scale calibration" },
      { key: "M", command: "Move + Ctrl", usage: "Array staircase treads & pergola rafters" },
    ],
    workflowSteps: [
      "Import clean 2D CAD floor plan -> group base footprint -> draw closed wall faces -> Push/Pull to sill, lintel, and slab heights.",
      "Organize roof, walls, glazing, furniture, and site terrain onto strict Tags (never leave loose geometry ungrouped).",
      "Configure geo-located Shadow studies for solstice/equinox and export scaled plans via LayOut.",
    ],
    assignment: "Build a 3D courtyard massing model matching HOUSE-025 with grouped roof overhang and section plane.",
    disclaimer: "Educational workflow guide only; no external SketchUp desktop automation is claimed.",
  },
  {
    id: "SW-FUSION",
    name: "Autodesk Fusion 360",
    focus: "Parametric CAD, assemblies, sheet metal, CAM & 3D printing export",
    levelPath: "Sketches & Constraints -> Parametric Features, Joint Assemblies, Sheet Metal & Drawings",
    shortcuts: [
      { key: "S", command: "Shortcut Toolbox", usage: "Context-aware feature search" },
      { key: "E", command: "Extrude", usage: "Solid boss/cut creation" },
      { key: "J", command: "Joint", usage: "Revolute, slider & rigid mechanical joints" },
      { key: "F", command: "Fillet", usage: "Edge rounding & moldable draft transitions" },
    ],
    workflowSteps: [
      "Define User Parameters (wall_t = 2.2mm, shaft_d = 20mm) before sketching fully constrained black profiles.",
      "Build multi-component assemblies using Joints rather than manual Move commands.",
      "Validate interference, draft angles, and export 2D manufacturing drawings + STEP/STL files.",
    ],
    assignment: "Model ID-003 Planetary Gear Carrier using parametric Pitch Diameter equations.",
    disclaimer: "Educational guide only; no external Fusion 360 automation is claimed.",
  },
  {
    id: "SW-SOLIDWORKS",
    name: "SolidWorks",
    focus: "Industrial mechanical engineering, GD&T drawings, sheet metal & FEA basics",
    levelPath: "Part Modeling -> Mate Assemblies, Configurations, Weldments, SimulationXpress",
    shortcuts: [
      { key: "Ctrl+7", command: "Isometric View", usage: "Standard 3D inspection angle" },
      { key: "D", command: "Confirm/Breadcrumbs", usage: "Quick access to mates & dimensions" },
      { key: "Space", command: "Orientation Cube", usage: "Switch orthographic faces rapidly" },
    ],
    workflowSteps: [
      "Establish Design Intent with symmetric planes (Front/Top/Right) and equation-driven sketch dimensions.",
      "Assemble sub-assemblies with Concentric, Coincident, and Distance mates; run Interference Detection.",
      "Create Exploded Views and associative BOM balloons on ISO/ASME drawing templates.",
    ],
    assignment: "Create an exploded BOM drawing for ID-004 Bearing & Shaft Housing.",
    disclaimer: "Educational guide only; no external SolidWorks connection is claimed.",
  },
  {
    id: "SW-REVIT",
    name: "Autodesk Revit (BIM)",
    focus: "Parametric Building Information Modeling, schedules & multi-discipline coordination",
    levelPath: "Levels & Grids -> Families, Curtain Walls, MEP Systems, Clash & Sheet Sets",
    shortcuts: [
      { key: "WA", command: "Wall", usage: "Place layered wall assemblies" },
      { key: "DR / WN", command: "Door / Window", usage: "Host openings inside walls automatically" },
      { key: "DI", command: "Aligned Dimension", usage: "Parametric equality & lock constraints" },
      { key: "VV", command: "Visibility/Graphics", usage: "Control discipline sheet overrides" },
    ],
    workflowSteps: [
      "Establish Project Base Point, Levels (Plinth, Lintel, Slab, Parapet), and Structural Grids first.",
      "Use compound Wall Types (plaster + 230mm brick + plaster) and hosted Door/Window Families for instant schedules.",
      "Link Structural & MEP Revit models via shared coordinates and run Interference Check.",
    ],
    assignment: "Generate a coordinated Door & Window Schedule + Floor Plan sheet set for HOUSE-041.",
    disclaimer: "Educational guide only; no external Revit connection is claimed.",
  },
  {
    id: "SW-RHINO",
    name: "Rhino 3D + Grasshopper",
    focus: "NURBS freeform surfaces, organic landscape topography & parametric louvers",
    levelPath: "Curves & Lofts -> Surface Continuity (G1/G2), Terrain Meshes & Parametric Patterns",
    shortcuts: [
      { key: "F10", command: "PointsOn", usage: "Edit NURBS control points" },
      { key: "OSnap", command: "End / Mid / Perp", usage: "Exact geometric snapping" },
      { key: "Make2D", command: "Make2D", usage: "Project clean vector elevations from 3D" },
    ],
    workflowSteps: [
      "Build clean degree-3 curves before generating Loft, Sweep2, or NetworkSrf surfaces.",
      "Check zebra stripes & naked edges before exporting watertight polysurfaces for fabrication.",
    ],
    assignment: "Model a curved parametric sun-shading pergola canopy for LAND-051.",
    disclaimer: "Educational guide only; no external Rhino connection is claimed.",
  },
  {
    id: "SW-RENDER",
    name: "Rendering & Visualisation",
    focus: "PBR materials, natural daylight balance, camera composition & post-production",
    levelPath: "Camera Framing -> Sun/HDRI Lighting, Roughness Maps & Atmospheric Depth",
    shortcuts: [
      { key: "2-Point", command: "Two-Point Perspective", usage: "Keep vertical architectural edges parallel" },
      { key: "Rule 1/3", command: "Composition Grid", usage: "Balance sky, building mass & foreground planting" },
    ],
    workflowSteps: [
      "Enable 2-Point Perspective so vertical columns never converge awkwardly.",
      "Pair warm low-angle sun (3500K–4500K) with cool sky bounce and calibrated PBR roughness variation.",
    ],
    assignment: "Use the built-in Studio Image Generator (AI Tutor panel) to test architectural lighting moods.",
    disclaimer: "Educational workflow guide only.",
  },
];

export const STANDARDS_REFERENCES = [
  {
    id: "STD-WALL",
    title: "Wall Construction & Thickness Standards",
    category: "Architecture",
    statutoryVsDesign: "Structural & Fire Rated Rules = Code / Brick vs AAC Selection = Design Choice",
    items: [
      { name: "230mm External Masonry Wall", spec: "Load-bearing or weather-resistant exterior envelope; pair with damp-proof course (DPC) at plinth." },
      { name: "115mm Internal Partition Wall", spec: "Half-brick partition with horizontal reinforcement bands every 4–5 courses for stability." },
      { name: "100–150mm AAC / Lightweight Partition", spec: "Reduces frame dead load; requires flexible mesh at RCC column-to-block joints." },
    ],
  },
  {
    id: "STD-ACC",
    title: "Accessibility & Fire Escape Benchmarks",
    category: "Life Safety",
    statutoryVsDesign: "Statutory Building Code Requirements (Verify Local Municipal Bye-Laws)",
    items: [
      { name: "Accessible Entrance Ramp", spec: "Max 1:12 slope; min 1200mm clear width; 1500mm landings at top, bottom & every 9m." },
      { name: "Accessible Bathroom", spec: "Outward-opening or sliding 900mm door; min 1500mm wheelchair turning diameter; grab bars." },
      { name: "Residential Staircase Safety", spec: "Riser <= 175mm, Tread >= 250–275mm, min width 900–1000mm, handrail height 900mm." },
      { name: "Fire Egress Clearances", spec: "Unobstructed escape corridor, smoke-vented staircase enclosure, illuminated exit signage in multistorey blocks." },
    ],
  },
  {
    id: "STD-BIM",
    title: "BIM LOD & Project Coordination Protocol",
    category: "BIM & PM",
    statutoryVsDesign: "Industry Project Execution Standard (ISO 19650 / LOD Forum)",
    items: [
      { name: "LOD 100 – Concept Massing", spec: "Overall volume, site setbacks, solar envelope." },
      { name: "LOD 200 – Schematic Design", spec: "Approximate wall thicknesses, generic doors/windows, room areas." },
      { name: "LOD 300 – Construction Docs", spec: "Exact wall assemblies, structural beams/columns, MEP duct/pipe routing." },
      { name: "Clash Matrix Priority", spec: "1. Structural vs MEP Pipes -> 2. Ducts vs Ceiling Soffit -> 3. Door Swings vs Furniture." },
    ],
  },
];

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "IQ-01",
    discipline: "Architecture",
    question: "How do you coordinate a toilet layout so it neither leaks into lower floors nor creates dead circulation space?",
    strongAnswer:
      "Cluster bathrooms back-to-back or vertically stacked around an accessible plumbing shaft, depress the structural slab (sunken slab 150–200mm) with tested brick-bat/membrane waterproofing, separate the dry zone (washbasin/WC) from the wet shower zone with a 15–20mm floor drop and 1:60 slope to floor trap, and verify the door opens cleanly without hitting the WC knee clearance.",
    keyTerms: ["Sunken Slab", "Plumbing Shaft", "Wet/Dry Zoning", "1:60 Slope", "Door Clearance"],
  },
  {
    id: "IQ-02",
    discipline: "Architecture",
    question: "Why is a visual wind arrow on a floor plan NOT enough to prove thermal comfort?",
    strongAnswer:
      "Wind arrows represent conceptual cross-ventilation potential based on assumed wind direction, not measured air-change rates or CFD simulations. Real comfort also depends on seasonal wind shifts, surrounding building wakes, roof insulation/solar heat gain, window effective openable area (sliding vs casement), and night-purge thermal mass behavior.",
    keyTerms: ["Conceptual Airflow", "CFD", "Effective Openable Area", "Seasonal Wind Rose", "Solar Heat Gain"],
  },
  {
    id: "IQ-03",
    discipline: "Landscape",
    question: "What critical engineering checks happen before placing trees and pavers over an underground basement podium or near a house?",
    strongAnswer:
      "Check structural slab live-load capacity for saturated soil depth, specify root barriers and drainage cells above waterproofing membranes, keep deep-rooted canopy trees >=1.5–3m from foundation footings, slope hardscape >=1.5% away from building walls, and hydro-zone irrigation so excess water doesn't pool against foundations.",
    keyTerms: ["Hydro-Zoning", "Root Barrier", "Drainage Cell", "1.5% Positive Slope", "Foundation Setback"],
  },
  {
    id: "IQ-04",
    discipline: "Civil & Structural",
    question: "Where do tension cracks try to form in a simply supported vs continuous RC beam, and how does reinforcement respond?",
    strongAnswer:
      "In a simply supported beam under gravity loads, positive bending moment creates bottom-fiber tension at midspan, so main longitudinal rebar is placed at the bottom; near supports shear dominates, requiring closer stirrup spacing. In continuous beams over columns, negative (hogging) moment creates tension at the top face, requiring top reinforcement over supports.",
    keyTerms: ["Sagging vs Hogging", "Bending Moment Diagram", "Shear Stirrups", "Development Length", "Cover"],
  },
  {
    id: "IQ-05",
    discipline: "MEP",
    question: "What is a Hard Clash vs a Soft Clash in BIM MEP coordination?",
    strongAnswer:
      "A Hard Clash occurs when two physical components occupy the same 3D space (e.g., a 150mm chilled-water pipe intersecting an RC beam). A Soft Clash occurs when an element violates required maintenance, access, or code clearance (e.g., an electrical DB door blocked by a ductwork drop or insufficient ceiling plenum height).",
    keyTerms: ["Hard Clash", "Soft Clash", "Plenum Space", "Maintenance Clearance", "Shared Coordinates"],
  },
  {
    id: "IQ-06",
    discipline: "Industrial Design",
    question: "How do rib thickness and draft angles affect an injection-molded ABS enclosure?",
    strongAnswer:
      "If internal ribs exceed ~50–60% of the nominal wall thickness, the thicker junction cools slower and shrinks unevenly, causing visible sink marks on the exterior Class-A surface. Adequate draft angles (1°–2° smooth, higher for textured surfaces) allow part ejection without drag marks or core-sticking.",
    keyTerms: ["Sink Marks", "50–60% Rib Rule", "Draft Angle", "Uniform Wall", "Parting Line"],
  },
];
