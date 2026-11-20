export type NavSection =
  | "dashboard"
  | "academy"
  | "residential"
  | "landscape"
  | "design_studio"
  | "drawing_workspace"
  | "workspace_3d"
  | "materials"
  | "standards"
  | "calculators"
  | "exercises"
  | "my_projects"
  | "portfolio"
  | "interview"
  | "profile";

export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

export type CheckStatus = "Pass" | "Needs attention" | "Not applicable" | "Not verified";

export interface ValidationCheckItem {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export type WallType = "external_230" | "internal_115" | "lightweight_75" | "compound_150";

export interface WallSegment {
  id: string;
  x1: number; // mm in building/plot coords
  y1: number;
  x2: number;
  y2: number;
  thicknessMm: number;
  wallType: WallType;
}

export type OpeningKind =
  | "main_door"
  | "bedroom_door"
  | "bathroom_door"
  | "kitchen_door"
  | "sliding_door"
  | "double_door"
  | "window"
  | "sliding_window"
  | "french_window"
  | "ventilator";

export interface OpeningSpec {
  id: string;
  wallId: string;
  kind: OpeningKind;
  label: string; // e.g., MD, D1, D2, W1, V1
  offsetRatio: number; // 0..1 along wall centerline
  widthMm: number;
  heightMm: number;
  sillMm: number;
  headMm: number;
  swingSide: 1 | -1; // +1 or -1 perpendicular normal
  swingDir: 1 | -1; // hinge side
  frameMaterial: string;
  roomId?: string;
}

export type RoomKind =
  | "living"
  | "kitchen"
  | "dining"
  | "bedroom"
  | "master_bedroom"
  | "bathroom"
  | "utility"
  | "courtyard"
  | "veranda"
  | "study"
  | "parking"
  | "staircase"
  | "passage"
  | "home_theatre"
  | "pooja";

export interface RoomZone {
  id: string;
  name: string;
  kind: RoomKind;
  x: number; // mm
  y: number;
  widthMm: number;
  depthMm: number;
  floorFinish: string;
}

export type FurnitureKind =
  | "bed_double"
  | "bed_single"
  | "wardrobe"
  | "sofa_3"
  | "dining_table"
  | "kitchen_counter"
  | "kitchen_sink"
  | "kitchen_hob"
  | "fridge"
  | "wc"
  | "washbasin"
  | "shower"
  | "study_desk"
  | "tv_unit"
  | "shoe_rack"
  | "stair_flight"
  | "car_bay";

export interface FurnitureItem {
  id: string;
  kind: FurnitureKind;
  label: string;
  roomId: string;
  x: number; // mm center or top-left
  y: number;
  widthMm: number;
  depthMm: number;
  rotationDeg: number;
}

export interface MepNode {
  id: string;
  discipline: "electrical" | "plumbing" | "hvac";
  kind: string;
  label: string;
  x: number;
  y: number;
  spec: string;
}

export type ArchitecturalSheetId =
  | "site_plan"
  | "floor_plan"
  | "wall_layout"
  | "door_window"
  | "furniture"
  | "kitchen_bath"
  | "staircase"
  | "electrical"
  | "plumbing"
  | "floor_finish"
  | "elevations"
  | "sections"
  | "construction_details"
  | "sun_shadow"
  | "ventilation"
  | "vastu"
  | "presentation_3d";

export interface ResidentialPlanGeometry {
  plotWidthMm: number;
  plotDepthMm: number;
  setbacksMm: {
    front: number;
    rear: number;
    left: number;
    right: number;
  };
  walls: WallSegment[];
  openings: OpeningSpec[];
  rooms: RoomZone[];
  furniture: FurnitureItem[];
  mepNodes: MepNode[];
  hasStaircase: boolean;
  floors: number;
  scaleLabel: string;
}

export interface ResidentialProject {
  id: string; // HOUSE-001 .. HOUSE-080
  number: number;
  batchIndex: number; // 1..8
  batchTitle: string;
  title: string;
  category: string;
  level: DifficultyLevel;
  roadSide: "East" | "North" | "South" | "West" | "North & East Corner";
  northAngleDeg: number;
  climateAssumption: string;
  prevailingWindDeg: number;
  windDisclaimer: string;
  vastuApplicable: boolean;
  brief: string;
  siteCondition: string;
  requiredRooms: string[];
  constraints: string[];
  designExplanation: string;
  wallStandardNote: string;
  assessmentQuestion: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  referencePlan: ResidentialPlanGeometry;
}

export type LandscapeSheetId =
  | "master_plan"
  | "hardscape"
  | "softscape"
  | "planting"
  | "furniture"
  | "irrigation"
  | "drainage"
  | "sections_elevations";

export interface LandscapePolygon {
  id: string;
  layer: "hardscape" | "lawn" | "planting_bed" | "water" | "footprint" | "pergola";
  label: string;
  materialOrPlantId: string;
  points: { x: number; y: number }[]; // mm
  elevationMm?: number;
}

export interface LandscapePathway {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  widthMm: number;
  material: string;
  connects: [string, string];
}

export interface LandscapePlantInstance {
  id: string; // e.g. T-01, SH-02
  plantDbId: string;
  botanicalName: string;
  commonName: string;
  category: "tree" | "shrub" | "groundcover" | "aquatic";
  x: number;
  y: number;
  canopyRadiusMm: number;
  spacingMinMm: number;
}

export interface LandscapeUtilityLine {
  id: string;
  layer: "irrigation" | "drainage" | "lighting";
  label: string;
  points: { x: number; y: number }[];
  spec: string;
}

export interface LandscapeFurniture {
  id: string;
  kind: "bench" | "outdoor_table" | "pergola_seat" | "planter_box" | "bollard_light";
  label: string;
  x: number;
  y: number;
  widthMm: number;
  depthMm: number;
  rotationDeg: number;
}

export interface LandscapeSpotLevel {
  id: string;
  x: number;
  y: number;
  elevationMm: number;
}

export interface LandscapePlanGeometry {
  siteWidthMm: number;
  siteDepthMm: number;
  buildingFootprint: { x: number; y: number; widthMm: number; depthMm: number; entranceX: number; entranceY: number };
  polygons: LandscapePolygon[];
  pathways: LandscapePathway[];
  plants: LandscapePlantInstance[];
  utilities: LandscapeUtilityLine[];
  furniture: LandscapeFurniture[];
  spotLevels: LandscapeSpotLevel[];
  scaleLabel: string;
}

export interface LandscapeProject {
  id: string; // LAND-001 .. LAND-080
  number: number;
  batchIndex: number; // 1..8
  batchTitle: string;
  title: string;
  category: string;
  level: DifficultyLevel;
  northAngleDeg: number;
  climateZone: string;
  brief: string;
  siteCondition: string;
  requiredElements: string[];
  constraints: string[];
  designExplanation: string;
  assessmentQuestion: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  referencePlan: LandscapePlanGeometry;
}

export interface PracticeAttempt {
  id: string;
  projectId: string;
  studio: "residential" | "landscape";
  timestamp: string;
  revisionNote: string;
  residentialPlan?: ResidentialPlanGeometry;
  landscapePlan?: LandscapePlanGeometry;
  checksPassed: number;
  checksTotal: number;
  validated: boolean;
}

export interface PlantSpecies {
  id: string;
  botanicalName: string;
  commonName: string;
  type: "Tree" | "Shrub" | "Groundcover" | "Climber" | "Aquatic";
  nativeRegion: string;
  matureSpreadMm: number;
  matureHeightMm: number;
  sunlight: "Full Sun" | "Partial Shade" | "Shade";
  waterDemand: "Low" | "Moderate" | "High";
  soilPreference: string;
}

export interface MaterialSpec {
  id: string;
  name: string;
  category: "Masonry & Concrete" | "Timber & Joinery" | "Flooring & Cladding" | "Landscape Hardscape" | "Industrial Polymers & Metals";
  densityOrUnit: string;
  typicalThicknessOrSize: string;
  finish: string;
  sustainabilityNote: string;
  application: string;
}

export interface IndustrialDesignExercise {
  id: string;
  title: string;
  domain:
    | "Product Sketching & Perspective"
    | "Ergonomics & Anthropometry"
    | "Mechanisms, Gears & Linkages"
    | "Bearings, Shafts & Fasteners"
    | "Sheet-Metal & Plastic Injection"
    | "Tolerances, Fits & DFM/DFA"
    | "3D Printing & Prototyping"
    | "Exploded Assembly";
  level: DifficultyLevel;
  brief: string;
  keyPrinciples: string[];
  parameters: { label: string; value: string; unit: string }[];
  dfmChecklist: string[];
  exerciseTask: string;
}
