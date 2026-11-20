import type { OpeningSpec, ResidentialPlanGeometry, RoomZone } from "./types";

export type SunTimeSlot = "morning" | "noon" | "evening";
export type SunSeason = "summer" | "winter";

export interface SunAnalysisResult {
  azimuthDeg: number; // 0 = North, 90 = East, 180 = South, 270 = West
  altitudeDeg: number;
  sunDirectionLabel: string;
  overhangShadingFactor: number; // 0..1 fraction shaded
  windowAssessments: {
    openingId: string;
    label: string;
    facingDeg: number;
    sunExposure: "Direct Glare Risk" | "Filtered Daylight" | "Indirect / Shaded";
    penetrationMm: number;
  }[];
  guidance: string;
}

export function analyzeSunlight(
  plan: ResidentialPlanGeometry,
  northAngleDeg: number,
  slot: SunTimeSlot,
  season: SunSeason,
  overhangMm: number
): SunAnalysisResult {
  // Illustrative low-latitude / tropical-subtropical sun geometry (approx 13°N e.g., Chennai/South India benchmark)
  const baseAzimuth = slot === "morning" ? 95 : slot === "noon" ? (season === "summer" ? 35 : 175) : 265;
  const baseAltitude = slot === "morning" ? 28 : slot === "noon" ? (season === "summer" ? 78 : 54) : 24;

  const azimuthDeg = (baseAzimuth + northAngleDeg) % 360;
  const altitudeDeg = baseAltitude;
  const tanAlt = Math.tan((altitudeDeg * Math.PI) / 180);
  const overhangDepth = Math.max(0, overhangMm);

  const wallMap = new Map(plan.walls.map((w) => [w.id, w]));
  const windows = plan.openings.filter((o) => o.kind.includes("window") || o.kind === "ventilator");

  const shadedRatio = Math.min(1, overhangDepth / Math.max(300, 1200 / Math.max(0.3, tanAlt)));

  const windowAssessments = windows.map((wObj: OpeningSpec) => {
    const wall = wallMap.get(wObj.wallId);
    let facingDeg = 0;
    if (wall) {
      const dx = wall.x2 - wall.x1;
      const dy = wall.y2 - wall.y1;
      // Normal angle in screen coords -> map to compass
      const wallAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      facingDeg = ((wallAngleDeg + 90 + northAngleDeg) % 360 + 360) % 360;
    }

    const angleDiff = Math.abs(((facingDeg - azimuthDeg + 540) % 360) - 180);
    let sunExposure: "Direct Glare Risk" | "Filtered Daylight" | "Indirect / Shaded" = "Indirect / Shaded";
    let penetrationMm = 600;

    if (angleDiff < 55) {
      const effectiveHeight = Math.max(200, wObj.heightMm - overhangDepth * tanAlt);
      penetrationMm = Math.round(effectiveHeight / Math.max(0.35, tanAlt));
      sunExposure = shadedRatio >= 0.6 ? "Filtered Daylight" : "Direct Glare Risk";
    } else if (angleDiff < 95) {
      sunExposure = "Filtered Daylight";
      penetrationMm = 900;
    }

    return {
      openingId: wObj.id,
      label: wObj.label,
      facingDeg: Math.round(facingDeg),
      sunExposure,
      penetrationMm: Math.min(4500, Math.max(300, penetrationMm)),
    };
  });

  const sunDirectionLabel =
    slot === "morning"
      ? "East-Southeast Morning Sun"
      : slot === "noon"
        ? season === "summer"
          ? "High Overhead Summer Sun"
          : "Southern Winter Noon Sun"
        : "Low West-Southwest Evening Sun";

  const guidance =
    slot === "evening"
      ? "Low western sun causes strong thermal heat gain and glare. Deep overhangs (600–900mm), vertical louvers, or shaded verandas help protect west openings."
      : slot === "morning"
        ? "Morning eastern daylight is gentle and beneficial for kitchens, living areas, and courtyards."
        : "High midday sun is effectively blocked by a 600mm horizontal chajja/overhang while retaining diffuse sky daylight.";

  return {
    azimuthDeg: Math.round(azimuthDeg),
    altitudeDeg,
    sunDirectionLabel,
    overhangShadingFactor: Number(shadedRatio.toFixed(2)),
    windowAssessments,
    guidance,
  };
}

export type WindMode = "daytime" | "nighttime";

export interface VentilationResult {
  mode: WindMode;
  windAngleDeg: number;
  inletWindows: { id: string; label: string; x: number; y: number }[];
  outletWindows: { id: string; label: string; x: number; y: number }[];
  crossVentRooms: string[];
  disclaimer: string;
  notes: string[];
}

export function analyzeVentilation(
  plan: ResidentialPlanGeometry,
  prevailingWindDeg: number,
  mode: WindMode
): VentilationResult {
  const wallMap = new Map(plan.walls.map((w) => [w.id, w]));
  const windows = plan.openings.filter((o) => o.kind.includes("window") || o.kind === "ventilator");

  const windRad = ((prevailingWindDeg - 90) * Math.PI) / 180;
  const wx = Math.cos(windRad);
  const wy = Math.sin(windRad);

  const cxPlot = plan.plotWidthMm / 2;
  const cyPlot = plan.plotDepthMm / 2;

  const inletWindows: { id: string; label: string; x: number; y: number }[] = [];
  const outletWindows: { id: string; label: string; x: number; y: number }[] = [];

  for (const win of windows) {
    const wall = wallMap.get(win.wallId);
    if (!wall) continue;
    const x = wall.x1 + (wall.x2 - wall.x1) * win.offsetRatio;
    const y = wall.y1 + (wall.y2 - wall.y1) * win.offsetRatio;
    const dot = (x - cxPlot) * wx + (y - cyPlot) * wy;
    if (dot < 0) {
      inletWindows.push({ id: win.id, label: win.label, x, y });
    } else {
      outletWindows.push({ id: win.id, label: win.label, x, y });
    }
  }

  const crossVentRooms = plan.rooms
    .filter((r) => {
      const roomWindows = windows.filter((w) => w.roomId === r.id);
      return roomWindows.length >= 2;
    })
    .map((r) => r.name);

  const notes =
    mode === "daytime"
      ? [
          `Illustrative prevailing wind direction assumed at ${prevailingWindDeg}° (varies seasonally between SW monsoon and NE monsoon).`,
          `${inletWindows.length} windward inlet openings and ${outletWindows.length} leeward outlet openings identified.`,
          crossVentRooms.length > 0
            ? `Rooms with multi-wall openings supporting cross-ventilation: ${crossVentRooms.join(", ")}.`
            : "Single-sided rooms rely on doorway transoms or courtyard stack effect for airflow.",
        ]
      : [
          "Nighttime Night-Purge Mode: Assumes cooler night outdoor air flushes daytime thermal mass heat.",
          "Low-level casement/louvered inlets combined with high-level ventilators or courtyard roofs create conceptual stack buoyancy.",
          "Security grilles, insect mesh, and rain-deflecting louvers are required for safe overnight opening.",
        ];

  return {
    mode,
    windAngleDeg: prevailingWindDeg,
    inletWindows,
    outletWindows,
    crossVentRooms,
    disclaimer:
      "Conceptual airflow illustration only — not a Computational Fluid Dynamics (CFD) simulation. Seasonal wind shifts require local meteorological data.",
    notes,
  };
}

export interface VastuZoneFinding {
  roomName: string;
  roomKind: string;
  direction: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "Center";
  status: "Aligned" | "Alternative Recommended" | "Neutral";
  note: string;
}

export function analyzeVastuGrid(plan: ResidentialPlanGeometry): {
  findings: VastuZoneFinding[];
  disclaimer: string;
} {
  const minX = Math.min(...plan.rooms.map((r) => r.x), 0);
  const maxX = Math.max(...plan.rooms.map((r) => r.x + r.widthMm), plan.plotWidthMm);
  const minY = Math.min(...plan.rooms.map((r) => r.y), 0);
  const maxY = Math.max(...plan.rooms.map((r) => r.y + r.depthMm), plan.plotDepthMm);
  const spanX = Math.max(1000, maxX - minX);
  const spanY = Math.max(1000, maxY - minY);

  const gridMap: ("NW" | "N" | "NE" | "W" | "Center" | "E" | "SW" | "S" | "SE")[][] = [
    ["NW", "N", "NE"],
    ["W", "Center", "E"],
    ["SW", "S", "SE"],
  ];

  const findings: VastuZoneFinding[] = plan.rooms.map((r: RoomZone) => {
    const cx = r.x + r.widthMm / 2;
    const cy = r.y + r.depthMm / 2;
    const col = Math.min(2, Math.max(0, Math.floor(((cx - minX) / spanX) * 3)));
    const row = Math.min(2, Math.max(0, Math.floor(((cy - minY) / spanY) * 3)));
    const direction = gridMap[row][col];

    let status: VastuZoneFinding["status"] = "Neutral";
    let note = `Located in ${direction} sector.`;

    if (r.kind === "kitchen") {
      if (direction === "SE" || direction === "NW") {
        status = "Aligned";
        note = `Kitchen in ${direction} (Agni / Vayu zone) aligns with classical Vastu preference.`;
      } else {
        status = "Alternative Recommended";
        note = `Kitchen is in ${direction}; classical Vastu prefers SE (Agni) or NW. Can be swapped if plumbing permits.`;
      }
    } else if (r.kind === "master_bedroom") {
      if (direction === "SW" || direction === "S" || direction === "W") {
        status = "Aligned";
        note = `Master bedroom in ${direction} aligns with classical Vastu stability zone.`;
      } else {
        status = "Alternative Recommended";
        note = `Master bedroom in ${direction}; classical Vastu typically recommends SW.`;
      }
    } else if (r.kind === "living" || r.kind === "veranda") {
      if (direction === "N" || direction === "NE" || direction === "E") {
        status = "Aligned";
        note = `Living/veranda in ${direction} receives gentle morning daylight and aligns with Vastu.`;
      }
    } else if (r.kind === "bathroom") {
      if (direction === "NW" || direction === "W" || direction === "S") {
        status = "Aligned";
        note = `Bathroom in ${direction} avoids the NE zone.`;
      } else if (direction === "NE") {
        status = "Alternative Recommended";
        note = `Bathroom in NE; Vastu prefers relocating wet rooms to NW or W.`;
      }
    } else if (r.kind === "courtyard") {
      if (direction === "Center") {
        status = "Aligned";
        note = "Open Brahmasthan courtyard supports daylight, stack ventilation, and traditional planning.";
      }
    }

    return {
      roomName: r.name,
      roomKind: r.kind,
      direction,
      status,
      note,
    };
  });

  return {
    findings,
    disclaimer:
      "Traditional Vastu Shastra guidance is cultural/contextual and strictly separate from statutory building regulations, structural engineering, or scientific daylight/ventilation metrics.",
  };
}
