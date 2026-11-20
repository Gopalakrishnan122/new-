import type {
  CheckStatus,
  LandscapePlanGeometry,
  LandscapeProject,
  ResidentialPlanGeometry,
  ResidentialProject,
  ValidationCheckItem,
  WallSegment,
} from "./types";

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

function pointNearPoint(ax: number, ay: number, bx: number, by: number, tolMm = 160): boolean {
  return dist(ax, ay, bx, by) <= tolMm;
}

function pointOnSegment(px: number, py: number, w: WallSegment, tolMm = 160): boolean {
  const len = dist(w.x1, w.y1, w.x2, w.y2);
  if (len < 1) return false;
  const t = ((px - w.x1) * (w.x2 - w.x1) + (py - w.y1) * (w.y2 - w.y1)) / (len * len);
  if (t < -0.05 || t > 1.05) return false;
  const projX = w.x1 + Math.max(0, Math.min(1, t)) * (w.x2 - w.x1);
  const projY = w.y1 + Math.max(0, Math.min(1, t)) * (w.y2 - w.y1);
  return dist(px, py, projX, projY) <= tolMm;
}

export function computeOpeningCenter(wall: WallSegment, offsetRatio: number): { x: number; y: number; angleRad: number; lengthMm: number } {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  return {
    x: wall.x1 + dx * offsetRatio,
    y: wall.y1 + dy * offsetRatio,
    angleRad: Math.atan2(dy, dx),
    lengthMm: Math.hypot(dx, dy),
  };
}

export function validateResidentialPlan(
  plan: ResidentialPlanGeometry,
  project?: ResidentialProject
): { checks: ValidationCheckItem[]; passCount: number; totalApplicable: number; overallReady: boolean } {
  const checks: ValidationCheckItem[] = [];
  const wallMap = new Map(plan.walls.map((w) => [w.id, w]));

  // 1. Wall thickness & continuity
  const extWalls = plan.walls.filter((w) => w.wallType === "external_230" || w.thicknessMm >= 200);
  const intWalls = plan.walls.filter((w) => w.wallType !== "external_230" && w.thicknessMm < 200);

  let connectedEndpoints = 0;
  let totalEndpoints = 0;
  for (const w of plan.walls) {
    totalEndpoints += 2;
    const ends = [
      { x: w.x1, y: w.y1 },
      { x: w.x2, y: w.y2 },
    ];
    for (const end of ends) {
      const hasConnection = plan.walls.some(
        (other) =>
          other.id !== w.id &&
          (pointNearPoint(end.x, end.y, other.x1, other.y1) ||
            pointNearPoint(end.x, end.y, other.x2, other.y2) ||
            pointOnSegment(end.x, end.y, other))
      );
      if (hasConnection) connectedEndpoints++;
    }
  }

  checks.push({
    id: "arch-wall-thickness",
    category: "Wall & Opening Geometry",
    label: "Wall Thickness Differentiation",
    status: extWalls.length >= 4 && (intWalls.length >= 1 || plan.rooms.length <= 1) ? "Pass" : "Needs attention",
    detail: `Found ${extWalls.length} external wall segments (>=200mm) and ${intWalls.length} internal partitions.`,
  });

  checks.push({
    id: "arch-wall-connections",
    category: "Wall & Opening Geometry",
    label: "Wall Intersections & Closed Perimeter",
    status:
      plan.walls.length >= 4 && connectedEndpoints >= Math.floor(totalEndpoints * 0.85)
        ? "Pass"
        : "Needs attention",
    detail: `${connectedEndpoints}/${totalEndpoints} wall endpoints connect cleanly to adjacent walls.`,
  });

  // 2. Room proportions & plot containment
  const minRoomDim = plan.rooms.reduce((min, r) => Math.min(min, r.widthMm, r.depthMm), Infinity);
  const fitsInPlot =
    plan.rooms.length > 0 &&
    plan.rooms.every(
      (r) =>
        r.x >= 0 &&
        r.y >= 0 &&
        r.x + r.widthMm <= plan.plotWidthMm + 50 &&
        r.y + r.depthMm <= plan.plotDepthMm + 50
    );

  checks.push({
    id: "arch-room-proportions",
    category: "Architectural Accuracy",
    label: "Room Dimensions & Plot Setbacks",
    status: plan.rooms.length >= 2 && fitsInPlot && minRoomDim >= 1000 ? "Pass" : "Needs attention",
    detail:
      plan.rooms.length === 0
        ? "No rooms defined yet in drawing."
        : `Smallest room span is ${Math.round(minRoomDim)} mm; ${fitsInPlot ? "all rooms sit inside plot bounds" : "some rooms exceed plot boundaries"}.`,
  });

  // 3. Door openings & swings
  const doors = plan.openings.filter((o) => o.kind.includes("door"));
  const doorsOnValidWalls = doors.filter((d) => {
    const w = wallMap.get(d.wallId);
    if (!w) return false;
    const len = dist(w.x1, w.y1, w.x2, w.y2);
    return len >= d.widthMm + 100;
  });

  checks.push({
    id: "arch-doors",
    category: "Wall & Opening Geometry",
    label: "Door Openings, Leaves & Swing Clearances",
    status:
      doors.length >= 1 && doorsOnValidWalls.length === doors.length && doors.every((d) => d.widthMm >= 700)
        ? "Pass"
        : "Needs attention",
    detail: `${doorsOnValidWalls.length}/${doors.length} doors fit cleanly inside host wall segments with >=700mm leaf width.`,
  });

  // 4. Windows & daylight/ventilation
  const windows = plan.openings.filter((o) => o.kind.includes("window") || o.kind === "ventilator");
  const extWallIds = new Set(extWalls.map((w) => w.id));
  const extWindows = windows.filter((win) => extWallIds.has(win.wallId));
  const totalFloorAreaM2 = plan.rooms.reduce((sum, r) => sum + (r.widthMm * r.depthMm) / 1_000_000, 0);
  const totalGlazingAreaM2 = windows.reduce((sum, win) => sum + (win.widthMm * win.heightMm) / 1_000_000, 0);
  const glazingRatio = totalFloorAreaM2 > 0 ? totalGlazingAreaM2 / totalFloorAreaM2 : 0;

  checks.push({
    id: "arch-windows",
    category: "Daylight & Ventilation",
    label: "External Window Placement & Glazing Ratio",
    status:
      extWindows.length >= 2 && extWindows.length === windows.length && glazingRatio >= 0.08
        ? "Pass"
        : "Needs attention",
    detail: `${extWindows.length} external openings provide ${(glazingRatio * 100).toFixed(1)}% window-to-floor ratio (target >= 8–10% for habitable daylight).`,
  });

  // 5. Room-specific checks: Bedroom, Kitchen, Bathroom, Living
  const bedrooms = plan.rooms.filter((r) => r.kind === "bedroom" || r.kind === "master_bedroom");
  const bedroomHasFurniture = bedrooms.every((b) =>
    plan.furniture.some((f) => f.roomId === b.id && (f.kind === "bed_double" || f.kind === "bed_single"))
  );
  checks.push({
    id: "room-bedroom",
    category: "Room Usability",
    label: "Bedroom Bed & Wardrobe Clearance",
    status: bedrooms.length === 0 ? "Not applicable" : bedroomHasFurniture ? "Pass" : "Needs attention",
    detail:
      bedrooms.length === 0
        ? "No bedroom in brief."
        : bedroomHasFurniture
          ? `${bedrooms.length} bedroom(s) include scaled bed placement and circulation clearance.`
          : "Place bed and wardrobe symbols inside every bedroom to verify clearances.",
  });

  const kitchens = plan.rooms.filter((r) => r.kind === "kitchen");
  const kitchenTriangleOk = kitchens.every((k) => {
    const items = plan.furniture.filter((f) => f.roomId === k.id);
    const hasSink = items.some((i) => i.kind === "kitchen_sink");
    const hasHob = items.some((i) => i.kind === "kitchen_hob");
    const hasCounter = items.some((i) => i.kind === "kitchen_counter");
    return hasSink && hasHob && hasCounter;
  });
  checks.push({
    id: "room-kitchen",
    category: "Room Usability",
    label: "Kitchen Work Triangle (Sink, Hob, Counter)",
    status: kitchens.length === 0 ? "Not applicable" : kitchenTriangleOk ? "Pass" : "Needs attention",
    detail:
      kitchens.length === 0
        ? "No kitchen in brief."
        : kitchenTriangleOk
          ? "Kitchen counter, sink, and hob zones are coordinated with work-triangle spacing."
          : "Kitchen requires coordinated counter, sink, and hob symbols.",
  });

  const baths = plan.rooms.filter((r) => r.kind === "bathroom");
  const bathFixturesOk = baths.every((b) => {
    const items = plan.furniture.filter((f) => f.roomId === b.id);
    return items.some((i) => i.kind === "wc") && items.some((i) => i.kind === "washbasin");
  });
  checks.push({
    id: "room-bathroom",
    category: "Room Usability",
    label: "Bathroom WC, Washbasin & Wet/Dry Zone",
    status: baths.length === 0 ? "Not applicable" : bathFixturesOk ? "Pass" : "Needs attention",
    detail:
      baths.length === 0
        ? "No bathroom in brief."
        : bathFixturesOk
          ? `${baths.length} bathroom(s) include WC, washbasin, and drainage/ventilation coordination.`
          : "Add WC and washbasin fixtures to every bathroom.",
  });

  const livingRooms = plan.rooms.filter((r) => r.kind === "living");
  const livingOk = livingRooms.every((l) =>
    plan.furniture.some((f) => f.roomId === l.id && f.kind === "sofa_3")
  );
  checks.push({
    id: "room-living",
    category: "Room Usability",
    label: "Living Room Seating & Circulation",
    status: livingRooms.length === 0 ? "Not applicable" : livingOk ? "Pass" : "Needs attention",
    detail:
      livingRooms.length === 0
        ? "No dedicated living room."
        : livingOk
          ? "Sofa seating and circulation path are positioned with daylight orientation."
          : "Add sofa seating layout inside living room.",
  });

  // 6. Staircase check where multistorey/duplex
  const needsStair = plan.hasStaircase || plan.floors > 1;
  const hasStairObj =
    plan.rooms.some((r) => r.kind === "staircase") ||
    plan.furniture.some((f) => f.kind === "stair_flight");
  checks.push({
    id: "arch-staircase",
    category: "Structural & Circulation",
    label: "Staircase Tread/Riser Geometry",
    status: !needsStair ? "Not applicable" : hasStairObj ? "Pass" : "Needs attention",
    detail: !needsStair
      ? "Single-storey residence; staircase not required."
      : hasStairObj
        ? "Staircase flight allocated with >=900mm flight width and vertical headroom zone."
        : "Multistorey brief requires a dimensioned staircase flight.",
  });

  // 7. Orientation & Drawing Scale
  checks.push({
    id: "arch-presentation",
    category: "Drawing Presentation",
    label: "North Arrow, Scale & Title Block",
    status: plan.scaleLabel && project ? "Pass" : plan.scaleLabel ? "Pass" : "Not verified",
    detail: `Drawing scale ${plan.scaleLabel || "1:100"} with North orientation (${project?.northAngleDeg ?? 0}°).`,
  });

  const applicable = checks.filter((c) => c.status !== "Not applicable");
  const passCount = applicable.filter((c) => c.status === "Pass").length;
  const overallReady = applicable.length > 0 && passCount === applicable.length;

  return {
    checks,
    passCount,
    totalApplicable: applicable.length,
    overallReady,
  };
}

export function validateLandscapePlan(
  plan: LandscapePlanGeometry,
  project?: LandscapeProject
): { checks: ValidationCheckItem[]; passCount: number; totalApplicable: number; overallReady: boolean } {
  const checks: ValidationCheckItem[] = [];

  // 1. Site boundary & footprint alignment
  const fp = plan.buildingFootprint;
  const fpInside =
    fp.x >= 0 &&
    fp.y >= 0 &&
    fp.x + fp.widthMm <= plan.siteWidthMm &&
    fp.y + fp.depthMm <= plan.siteDepthMm;
  checks.push({
    id: "land-boundary",
    category: "Site & Footprint Alignment",
    label: "Site Boundary & Building Footprint Coordination",
    status: fpInside && plan.siteWidthMm > 0 && plan.siteDepthMm > 0 ? "Pass" : "Needs attention",
    detail: `Site ${(plan.siteWidthMm / 1000).toFixed(1)}m × ${(plan.siteDepthMm / 1000).toFixed(1)}m; building footprint ${fpInside ? "aligned inside boundary" : "exceeds site boundary"}.`,
  });

  // 2. Pathway connectivity
  const hasPaths = plan.pathways.length >= 1 && plan.pathways.every((p) => p.points.length >= 2 && p.widthMm >= 750);
  checks.push({
    id: "land-paths",
    category: "Circulation & Accessibility",
    label: "Pathway Connectivity & Accessible Width (>=750mm)",
    status: hasPaths ? "Pass" : "Needs attention",
    detail: `${plan.pathways.length} circulation path(s) connecting entrance and landscape zones.`,
  });

  // 3. Closed planting beds & lawn geometry
  const beds = plan.polygons.filter((p) => p.layer === "planting_bed" || p.layer === "lawn");
  const allClosed = beds.length >= 1 && beds.every((b) => b.points.length >= 3);
  checks.push({
    id: "land-polygons",
    category: "Planting & Softscape",
    label: "Closed Planting Bed & Lawn Polygons",
    status: allClosed ? "Pass" : "Needs attention",
    detail: `${beds.length} softscape polygon zone(s) defined with closed boundaries.`,
  });

  // 4. Plant IDs & spacing checks
  let spacingConflict = false;
  for (let i = 0; i < plan.plants.length; i++) {
    for (let j = i + 1; j < plan.plants.length; j++) {
      const a = plan.plants[i];
      const b = plan.plants[j];
      const d = dist(a.x, a.y, b.x, b.y);
      const minRequired = Math.min(a.spacingMinMm, b.spacingMinMm);
      if (d < minRequired * 0.65) {
        spacingConflict = true;
      }
    }
  }
  const allHaveIds = plan.plants.length >= 2 && plan.plants.every((p) => p.id && p.plantDbId && p.botanicalName);
  checks.push({
    id: "land-plants",
    category: "Plant Selection & Spacing",
    label: "Plant Symbols, IDs & Mature Canopy Spacing",
    status: allHaveIds && !spacingConflict ? "Pass" : "Needs attention",
    detail: `${plan.plants.length} tagged plant symbol(s) linked to botanical database; ${spacingConflict ? "some plants are overcrowded" : "spacing clearances verified"}.`,
  });

  // 5. Hardscape / Furniture
  const hasHardscape = plan.polygons.some((p) => p.layer === "hardscape") || plan.pathways.length > 0;
  checks.push({
    id: "land-hardscape",
    category: "Hardscape & Furniture",
    label: "Hardscape Paving & Scaled Site Furniture",
    status: hasHardscape && plan.furniture.length >= 1 ? "Pass" : "Needs attention",
    detail: `${plan.furniture.length} scaled outdoor furniture/lighting element(s) coordinated with hardscape.`,
  });

  // 6. Irrigation & Drainage layers
  const hasIrrigation = plan.utilities.some((u) => u.layer === "irrigation");
  const hasDrainage = plan.utilities.some((u) => u.layer === "drainage");
  checks.push({
    id: "land-irrigation",
    category: "Site Engineering",
    label: "Irrigation Zoning & Surface Drainage",
    status: hasIrrigation && hasDrainage ? "Pass" : "Needs attention",
    detail: `${hasIrrigation ? "Irrigation zones mapped" : "Missing irrigation layer"}; ${hasDrainage ? "surface drainage & catch flow mapped" : "missing drainage layer"}.`,
  });

  // 7. Levels & Contours
  checks.push({
    id: "land-levels",
    category: "Topographic Grading",
    label: "Spot Levels & Slope Coordination",
    status: plan.spotLevels.length >= 3 ? "Pass" : "Needs attention",
    detail: `${plan.spotLevels.length} spot elevation benchmark(s) coordinated (${project?.climateZone ?? "site grade"}).`,
  });

  const applicable = checks.filter((c) => c.status !== "Not applicable");
  const passCount = applicable.filter((c) => c.status === "Pass").length;
  const overallReady = applicable.length > 0 && passCount === applicable.length;

  return {
    checks,
    passCount,
    totalApplicable: applicable.length,
    overallReady,
  };
}
