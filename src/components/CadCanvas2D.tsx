import React, { useMemo, useRef, useState } from "react";
import {
  ArchitecturalSheetId,
  FurnitureKind,
  LandscapeFurniture,
  LandscapePlanGeometry,
  LandscapePolygon,
  LandscapeSheetId,
  OpeningKind,
  ResidentialPlanGeometry,
  RoomKind,
  WallType,
} from "../core/types";
import { computeOpeningCenter } from "../core/geometryValidation";
import {
  analyzeSunlight,
  analyzeVastuGrid,
  analyzeVentilation,
  SunSeason,
  SunTimeSlot,
  WindMode,
} from "../core/sunWindVastu";
import { PLANT_DATABASE } from "../data/materialsAndPlants";

export type CadTool =
  | "select"
  | "draw_wall_ext"
  | "draw_wall_int"
  | "add_door"
  | "add_window"
  | "add_room"
  | "add_furniture"
  | "add_mep"
  | "land_path"
  | "land_bed"
  | "land_tree"
  | "land_shrub"
  | "land_furniture"
  | "land_irrigation"
  | "land_drainage"
  | "land_spot_level";

interface ResidentialCadProps {
  mode: "residential";
  plan: ResidentialPlanGeometry;
  sheet: ArchitecturalSheetId;
  projectTitle: string;
  projectId: string;
  northAngleDeg: number;
  prevailingWindDeg: number;
  editable?: boolean;
  onChangePlan?: (next: ResidentialPlanGeometry) => void;
  sunSlot?: SunTimeSlot;
  sunSeason?: SunSeason;
  overhangMm?: number;
  windMode?: WindMode;
}

interface LandscapeCadProps {
  mode: "landscape";
  plan: LandscapePlanGeometry;
  sheet: LandscapeSheetId;
  projectTitle: string;
  projectId: string;
  northAngleDeg: number;
  editable?: boolean;
  onChangePlan?: (next: LandscapePlanGeometry) => void;
}

type CadCanvas2DProps = ResidentialCadProps | LandscapeCadProps;

const SNAP_MM = 250;
function snap(val: number): number {
  return Math.round(val / SNAP_MM) * SNAP_MM;
}

type DragState =
  | {
      entityType: "room" | "res_furniture" | "mep" | "land_poly" | "land_plant" | "land_furniture" | "land_spot";
      id: string;
      startMouse: { x: number; y: number };
      lastMouse: { x: number; y: number };
    }
  | null;

export const CadCanvas2D: React.FC<CadCanvas2DProps> = (props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tool, setTool] = useState<CadTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState<{ x: number; y: number } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [zoom, setZoom] = useState<number>(1);

  // Undo history stack (stores previous plans for active studio mode)
  const [undoStackRes, setUndoStackRes] = useState<ResidentialPlanGeometry[]>([]);
  const [undoStackLand, setUndoStackLand] = useState<LandscapePlanGeometry[]>([]);

  // Residential tool parameters
  const [roomKindToPlace, setRoomKindToPlace] = useState<RoomKind>("bedroom");
  const [furnitureKindToPlace, setFurnitureKindToPlace] = useState<FurnitureKind>("bed_double");
  const [doorKindToPlace, setDoorKindToPlace] = useState<OpeningKind>("bedroom_door");
  const [mepKindToPlace, setMepKindToPlace] = useState<"electrical" | "plumbing">("electrical");

  // Landscape tool parameters
  const [landLayerToPlace, setLandLayerToPlace] = useState<LandscapePolygon["layer"]>("planting_bed");
  const [selectedPlantId, setSelectedPlantId] = useState<string>(PLANT_DATABASE[0].id);
  const [landFurnitureKind, setLandFurnitureKind] = useState<LandscapeFurniture["kind"]>("bench");
  const [spotElevationInput, setSpotElevationInput] = useState<number>(300);

  const widthMm = props.mode === "residential" ? props.plan.plotWidthMm : props.plan.siteWidthMm;
  const depthMm = props.mode === "residential" ? props.plan.plotDepthMm : props.plan.siteDepthMm;
  const pad = 1200;

  const viewBox = useMemo(() => {
    const vw = (widthMm + pad * 2) / zoom;
    const vh = (depthMm + pad * 2) / zoom;
    const vx = -pad + (widthMm + pad * 2 - vw) / 2;
    const vy = -pad + (depthMm + pad * 2 - vh) / 2;
    return `${vx} ${vy} ${vw} ${vh}`;
  }, [widthMm, depthMm, zoom]);

  function commitResPlan(next: ResidentialPlanGeometry, pushUndo = true) {
    if (props.mode !== "residential" || !props.onChangePlan) return;
    if (pushUndo) {
      setUndoStackRes((s) => [...s.slice(-19), structuredClone(props.plan)]);
    }
    props.onChangePlan(next);
  }

  function commitLandPlan(next: LandscapePlanGeometry, pushUndo = true) {
    if (props.mode !== "landscape" || !props.onChangePlan) return;
    if (pushUndo) {
      setUndoStackLand((s) => [...s.slice(-19), structuredClone(props.plan)]);
    }
    props.onChangePlan(next);
  }

  function handleUndo() {
    if (!props.editable) return;
    if (props.mode === "residential" && props.onChangePlan && undoStackRes.length > 0) {
      const prev = undoStackRes[undoStackRes.length - 1];
      setUndoStackRes((s) => s.slice(0, -1));
      props.onChangePlan(prev);
      setSelectedId(null);
    } else if (props.mode === "landscape" && props.onChangePlan && undoStackLand.length > 0) {
      const prev = undoStackLand[undoStackLand.length - 1];
      setUndoStackLand((s) => s.slice(0, -1));
      props.onChangePlan(prev);
      setSelectedId(null);
    }
  }

  function clientToMm(e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const parts = viewBox.split(" ").map(Number);
    const [vx, vy, vw, vh] = parts;
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    return {
      x: snap(vx + rx * vw),
      y: snap(vy + ry * vh),
    };
  }

  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!props.editable) return;
    const pt = clientToMm(e);
    setCursorMm(pt);

    if (!dragState) return;
    const dx = pt.x - dragState.lastMouse.x;
    const dy = pt.y - dragState.lastMouse.y;
    if (dx === 0 && dy === 0) return;

    if (props.mode === "residential" && props.onChangePlan) {
      const plan = props.plan;
      if (dragState.entityType === "room") {
        props.onChangePlan({
          ...plan,
          rooms: plan.rooms.map((r) => (r.id === dragState.id ? { ...r, x: r.x + dx, y: r.y + dy } : r)),
        });
      } else if (dragState.entityType === "res_furniture") {
        props.onChangePlan({
          ...plan,
          furniture: plan.furniture.map((f) => (f.id === dragState.id ? { ...f, x: f.x + dx, y: f.y + dy } : f)),
        });
      } else if (dragState.entityType === "mep") {
        props.onChangePlan({
          ...plan,
          mepNodes: plan.mepNodes.map((n) => (n.id === dragState.id ? { ...n, x: n.x + dx, y: n.y + dy } : n)),
        });
      }
    } else if (props.mode === "landscape" && props.onChangePlan) {
      const plan = props.plan;
      if (dragState.entityType === "land_poly") {
        const updatedPolys = plan.polygons.map((g) =>
          g.id === dragState.id ? { ...g, points: g.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) } : g
        );
        const movedPoly = updatedPolys.find((g) => g.id === dragState.id);
        let nextFootprint = plan.buildingFootprint;
        if (movedPoly?.layer === "footprint" && movedPoly.points.length >= 2) {
          const minX = Math.min(...movedPoly.points.map((p) => p.x));
          const maxX = Math.max(...movedPoly.points.map((p) => p.x));
          const minY = Math.min(...movedPoly.points.map((p) => p.y));
          const maxY = Math.max(...movedPoly.points.map((p) => p.y));
          nextFootprint = {
            x: minX,
            y: minY,
            widthMm: maxX - minX,
            depthMm: maxY - minY,
            entranceX: (minX + maxX) / 2,
            entranceY: maxY,
          };
        }
        props.onChangePlan({ ...plan, polygons: updatedPolys, buildingFootprint: nextFootprint });
      } else if (dragState.entityType === "land_plant") {
        props.onChangePlan({
          ...plan,
          plants: plan.plants.map((pl) => (pl.id === dragState.id ? { ...pl, x: pl.x + dx, y: pl.y + dy } : pl)),
        });
      } else if (dragState.entityType === "land_furniture") {
        props.onChangePlan({
          ...plan,
          furniture: plan.furniture.map((f) => (f.id === dragState.id ? { ...f, x: f.x + dx, y: f.y + dy } : f)),
        });
      } else if (dragState.entityType === "land_spot") {
        props.onChangePlan({
          ...plan,
          spotLevels: plan.spotLevels.map((sl) => (sl.id === dragState.id ? { ...sl, x: sl.x + dx, y: sl.y + dy } : sl)),
        });
      }
    }

    setDragState({ ...dragState, lastMouse: pt });
  }

  function handleSvgMouseUp() {
    if (dragState) {
      setDragState(null);
    }
  }

  function startEntityDrag(
    ev: React.MouseEvent,
    entityType: NonNullable<DragState>["entityType"],
    id: string
  ) {
    if (!props.editable || tool !== "select") return;
    ev.stopPropagation();
    setSelectedId(id);
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const parts = viewBox.split(" ").map(Number);
    const [vx, vy, vw, vh] = parts;
    const pt = {
      x: snap(vx + ((ev.clientX - rect.left) / rect.width) * vw),
      y: snap(vy + ((ev.clientY - rect.top) / rect.height) * vh),
    };
    if (props.mode === "residential") {
      setUndoStackRes((s) => [...s.slice(-19), structuredClone(props.plan)]);
    } else {
      setUndoStackLand((s) => [...s.slice(-19), structuredClone(props.plan)]);
    }
    setDragState({ entityType, id, startMouse: pt, lastMouse: pt });
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!props.editable) return;
    const pt = clientToMm(e);

    if (tool === "select") {
      setSelectedId(null);
      return;
    }

    if (props.mode === "residential" && props.onChangePlan) {
      const plan = props.plan;

      // 2-click Wall drawing
      if (tool === "draw_wall_ext" || tool === "draw_wall_int") {
        if (!draftStart) {
          setDraftStart(pt);
        } else {
          if (Math.hypot(pt.x - draftStart.x, pt.y - draftStart.y) >= 400) {
            const wallType: WallType = tool === "draw_wall_ext" ? "external_230" : "internal_115";
            const newWall = {
              id: `w-u-${Date.now()}`,
              x1: draftStart.x,
              y1: draftStart.y,
              x2: pt.x,
              y2: pt.y,
              thicknessMm: wallType === "external_230" ? 230 : 115,
              wallType,
            };
            commitResPlan({ ...plan, walls: [...plan.walls, newWall] });
            setSelectedId(newWall.id);
          }
          setDraftStart(null);
        }
        return;
      }

      // Snap Door or Window into host wall
      if (tool === "add_door" || tool === "add_window") {
        let bestWall = plan.walls[0];
        let bestDist = Infinity;
        let bestRatio = 0.5;
        for (const w of plan.walls) {
          const dx = w.x2 - w.x1;
          const dy = w.y2 - w.y1;
          const len2 = dx * dx + dy * dy;
          if (len2 < 1) continue;
          const t = Math.max(0.12, Math.min(0.88, ((pt.x - w.x1) * dx + (pt.y - w.y1) * dy) / len2));
          const px = w.x1 + t * dx;
          const py = w.y1 + t * dy;
          const d = Math.hypot(pt.x - px, pt.y - py);
          if (d < bestDist) {
            bestDist = d;
            bestWall = w;
            bestRatio = t;
          }
        }
        if (bestWall && bestDist <= 900) {
          const isDoor = tool === "add_door";
          const kind: OpeningKind = isDoor ? doorKindToPlace : "window";
          const defaultWidth =
            kind === "main_door" ? 1050 : kind === "bathroom_door" ? 750 : kind === "sliding_door" ? 1800 : isDoor ? 900 : 1200;
          const newOpening = {
            id: `op-u-${Date.now()}`,
            wallId: bestWall.id,
            kind,
            label: isDoor ? `D${plan.openings.length + 1}` : `W${plan.openings.length + 1}`,
            offsetRatio: Number(bestRatio.toFixed(2)),
            widthMm: defaultWidth,
            heightMm: isDoor ? 2100 : 1200,
            sillMm: isDoor ? 0 : 900,
            headMm: 2100,
            swingSide: 1 as const,
            swingDir: 1 as const,
            frameMaterial: isDoor ? "Engineered Wood" : "UPVC Casement",
          };
          commitResPlan({ ...plan, openings: [...plan.openings, newOpening] });
          setSelectedId(newOpening.id);
        }
        return;
      }

      // 2-click Custom Room Rectangle (user defines exact width and depth!)
      if (tool === "add_room") {
        if (!draftStart) {
          setDraftStart(pt);
        } else {
          const rx = Math.min(draftStart.x, pt.x);
          const ry = Math.min(draftStart.y, pt.y);
          const rw = Math.abs(pt.x - draftStart.x);
          const rd = Math.abs(pt.y - draftStart.y);
          if (rw >= 1000 && rd >= 1000) {
            const labelMap: Record<RoomKind, string> = {
              living: "Living Room",
              kitchen: "Kitchen",
              dining: "Dining",
              bedroom: "Bedroom",
              master_bedroom: "Master Bedroom",
              bathroom: "Bathroom",
              utility: "Utility",
              courtyard: "Courtyard",
              veranda: "Veranda",
              study: "Study",
              parking: "Parking",
              staircase: "Staircase",
              passage: "Passage",
              home_theatre: "Home Theatre",
              pooja: "Pooja",
            };
            const newRoom = {
              id: `r-u-${Date.now()}`,
              name: labelMap[roomKindToPlace],
              kind: roomKindToPlace,
              x: rx,
              y: ry,
              widthMm: rw,
              depthMm: rd,
              floorFinish: roomKindToPlace === "bathroom" ? "Anti-Skid Ceramic" : "Vitrified Tile",
            };
            commitResPlan({
              ...plan,
              rooms: [...plan.rooms, newRoom],
              hasStaircase: plan.hasStaircase || roomKindToPlace === "staircase",
            });
            setSelectedId(newRoom.id);
          }
          setDraftStart(null);
        }
        return;
      }

      // Place Furniture Symbol
      if (tool === "add_furniture") {
        const sizeMap: Record<FurnitureKind, [number, number, string]> = {
          bed_double: [1600, 1950, "Double Bed"],
          bed_single: [1000, 1900, "Single Bed"],
          wardrobe: [600, 1500, "Wardrobe"],
          sofa_3: [1950, 850, "3-Seat Sofa"],
          dining_table: [1400, 900, "Dining Table"],
          kitchen_counter: [2200, 600, "Kitchen Counter"],
          kitchen_sink: [600, 480, "Sink"],
          kitchen_hob: [600, 480, "Hob"],
          fridge: [650, 650, "Fridge"],
          wc: [450, 650, "WC"],
          washbasin: [500, 420, "Washbasin"],
          shower: [800, 800, "Shower"],
          study_desk: [1200, 650, "Study Desk"],
          tv_unit: [400, 1400, "TV Unit"],
          shoe_rack: [900, 350, "Shoe Rack"],
          stair_flight: [2100, 1800, "Staircase"],
          car_bay: [2400, 4500, "Parking Bay"],
        };
        const [fw, fd, flabel] = sizeMap[furnitureKindToPlace];
        const containingRoom = plan.rooms.find(
          (r) => pt.x >= r.x && pt.x <= r.x + r.widthMm && pt.y >= r.y && pt.y <= r.y + r.depthMm
        );
        const newItem = {
          id: `f-u-${Date.now()}`,
          kind: furnitureKindToPlace,
          label: flabel,
          roomId: containingRoom?.id ?? plan.rooms[0]?.id ?? "r-generic",
          x: snap(pt.x - fw / 2),
          y: snap(pt.y - fd / 2),
          widthMm: fw,
          depthMm: fd,
          rotationDeg: 0,
        };
        commitResPlan({
          ...plan,
          furniture: [...plan.furniture, newItem],
          hasStaircase: plan.hasStaircase || furnitureKindToPlace === "stair_flight",
        });
        setSelectedId(newItem.id);
        return;
      }

      // Place MEP Node
      if (tool === "add_mep") {
        const isElec = mepKindToPlace === "electrical";
        const newNode = {
          id: `mep-u-${Date.now()}`,
          discipline: mepKindToPlace,
          kind: isElec ? "switchboard" : "floor_trap",
          label: isElec ? `SB-${plan.mepNodes.length + 1}` : `FT-${plan.mepNodes.length + 1}`,
          x: pt.x,
          y: pt.y,
          spec: isElec ? "6A/16A Modular Point" : "110mm Nahani Trap / Supply",
        };
        commitResPlan({ ...plan, mepNodes: [...plan.mepNodes, newNode] });
        setSelectedId(newNode.id);
        return;
      }
    }

    if (props.mode === "landscape" && props.onChangePlan) {
      const plan = props.plan;

      // Place chosen Plant Species from PLANT_DATABASE
      if (tool === "land_tree" || tool === "land_shrub") {
        const species = PLANT_DATABASE.find((p) => p.id === selectedPlantId) ?? PLANT_DATABASE[0];
        const cat =
          species.type === "Tree"
            ? "tree"
            : species.type === "Shrub"
              ? "shrub"
              : species.type === "Aquatic"
                ? "aquatic"
                : "groundcover";
        const prefix = cat === "tree" ? "T" : cat === "shrub" ? "SH" : cat === "aquatic" ? "AQ" : "GC";
        const newPlant = {
          id: `${prefix}-${plan.plants.length + 1}`,
          plantDbId: species.id,
          botanicalName: species.botanicalName,
          commonName: species.commonName,
          category: cat as "tree" | "shrub" | "groundcover" | "aquatic",
          x: pt.x,
          y: pt.y,
          canopyRadiusMm: Math.max(300, Math.round(species.matureSpreadMm / 2)),
          spacingMinMm: Math.max(500, Math.round(species.matureSpreadMm * 0.85)),
        };
        commitLandPlan({ ...plan, plants: [...plan.plants, newPlant] });
        setSelectedId(newPlant.id);
        return;
      }

      // 2-click Custom Landscape Zone Rectangle (Footprint, Hardscape, Lawn, Planting Bed, Water, Pergola)
      if (tool === "land_bed") {
        if (!draftStart) {
          setDraftStart(pt);
        } else {
          const x1 = Math.min(draftStart.x, pt.x);
          const y1 = Math.min(draftStart.y, pt.y);
          const x2 = Math.max(draftStart.x, pt.x);
          const y2 = Math.max(draftStart.y, pt.y);
          if (x2 - x1 >= 500 && y2 - y1 >= 500) {
            const labelMap: Record<LandscapePolygon["layer"], string> = {
              footprint: "Building Footprint",
              hardscape: "Paved Patio / Deck",
              lawn: "Lawn Turf",
              planting_bed: "Planting Bed",
              water: "Water / Bioswale",
              pergola: "Timber Pergola",
            };
            const newPoly: LandscapePolygon = {
              id: `poly-u-${Date.now()}`,
              layer: landLayerToPlace,
              label: labelMap[landLayerToPlace],
              materialOrPlantId: landLayerToPlace === "hardscape" ? "MAT-KOTA" : "PL-ZOY",
              points: [
                { x: x1, y: y1 },
                { x: x2, y: y1 },
                { x: x2, y: y2 },
                { x: x1, y: y2 },
              ],
            };
            const nextFootprint =
              landLayerToPlace === "footprint"
                ? {
                    x: x1,
                    y: y1,
                    widthMm: x2 - x1,
                    depthMm: y2 - y1,
                    entranceX: (x1 + x2) / 2,
                    entranceY: y2,
                  }
                : plan.buildingFootprint;
            commitLandPlan({
              ...plan,
              polygons: [...plan.polygons, newPoly],
              buildingFootprint: nextFootprint,
            });
            setSelectedId(newPoly.id);
          }
          setDraftStart(null);
        }
        return;
      }

      // 2-click Pathway
      if (tool === "land_path") {
        if (!draftStart) {
          setDraftStart(pt);
        } else {
          if (Math.hypot(pt.x - draftStart.x, pt.y - draftStart.y) >= 400) {
            const newPath = {
              id: `path-u-${Date.now()}`,
              label: "Garden Pathway",
              widthMm: 1000,
              material: "Kota Limestone Paver",
              connects: ["Zone A", "Zone B"] as [string, string],
              points: [draftStart, pt],
            };
            commitLandPlan({ ...plan, pathways: [...plan.pathways, newPath] });
            setSelectedId(newPath.id);
          }
          setDraftStart(null);
        }
        return;
      }

      // Landscape Furniture
      if (tool === "land_furniture") {
        const specMap: Record<LandscapeFurniture["kind"], [number, number, string]> = {
          bench: [1500, 500, "Garden Bench"],
          outdoor_table: [1400, 900, "Outdoor Dining"],
          pergola_seat: [1800, 600, "Pergola Seat"],
          planter_box: [1200, 500, "Planter Box"],
          bollard_light: [300, 300, "Bollard Light"],
        };
        const [fw, fd, flabel] = specMap[landFurnitureKind];
        const newItem: LandscapeFurniture = {
          id: `lf-u-${Date.now()}`,
          kind: landFurnitureKind,
          label: flabel,
          x: snap(pt.x - fw / 2),
          y: snap(pt.y - fd / 2),
          widthMm: fw,
          depthMm: fd,
          rotationDeg: 0,
        };
        commitLandPlan({ ...plan, furniture: [...plan.furniture, newItem] });
        setSelectedId(newItem.id);
        return;
      }

      // 2-click Irrigation / Drainage Line
      if (tool === "land_irrigation" || tool === "land_drainage") {
        if (!draftStart) {
          setDraftStart(pt);
        } else {
          if (Math.hypot(pt.x - draftStart.x, pt.y - draftStart.y) >= 400) {
            const isIrr = tool === "land_irrigation";
            const newUtil = {
              id: `ut-u-${Date.now()}`,
              layer: (isIrr ? "irrigation" : "drainage") as "irrigation" | "drainage",
              label: isIrr ? "Drip Lateral" : "Surface Drain (1.5%)",
              spec: isIrr ? "16mm Inline Drip" : "150mm Catch Pipe",
              points: [draftStart, pt],
            };
            commitLandPlan({ ...plan, utilities: [...plan.utilities, newUtil] });
            setSelectedId(newUtil.id);
          }
          setDraftStart(null);
        }
        return;
      }

      // Place Elevation Spot Level
      if (tool === "land_spot_level") {
        const newSpot = {
          id: `SL-${plan.spotLevels.length + 1}`,
          x: pt.x,
          y: pt.y,
          elevationMm: spotElevationInput,
        };
        commitLandPlan({ ...plan, spotLevels: [...plan.spotLevels, newSpot] });
        setSelectedId(newSpot.id);
        return;
      }
    }
  }

  function deleteSelected() {
    if (!props.editable || !selectedId || !props.onChangePlan) return;
    if (props.mode === "residential") {
      const p = props.plan;
      commitResPlan({
        ...p,
        walls: p.walls.filter((w) => w.id !== selectedId),
        openings: p.openings.filter((o) => o.id !== selectedId && o.wallId !== selectedId),
        rooms: p.rooms.filter((r) => r.id !== selectedId),
        furniture: p.furniture.filter((f) => f.id !== selectedId),
        mepNodes: p.mepNodes.filter((n) => n.id !== selectedId),
      });
    } else {
      const p = props.plan;
      commitLandPlan({
        ...p,
        polygons: p.polygons.filter((g) => g.id !== selectedId),
        pathways: p.pathways.filter((w) => w.id !== selectedId),
        plants: p.plants.filter((pl) => pl.id !== selectedId),
        furniture: p.furniture.filter((f) => f.id !== selectedId),
        utilities: p.utilities.filter((u) => u.id !== selectedId),
        spotLevels: p.spotLevels.filter((sl) => sl.id !== selectedId),
      });
    }
    setSelectedId(null);
  }

  // Compute residential overlays
  const sunResult = useMemo(() => {
    if (props.mode !== "residential" || props.sheet !== "sun_shadow") return null;
    return analyzeSunlight(
      props.plan,
      props.northAngleDeg,
      props.sunSlot ?? "morning",
      props.sunSeason ?? "summer",
      props.overhangMm ?? 600
    );
  }, [props]);

  const windResult = useMemo(() => {
    if (props.mode !== "residential" || props.sheet !== "ventilation") return null;
    return analyzeVentilation(props.plan, props.prevailingWindDeg, props.windMode ?? "daytime");
  }, [props]);

  const vastuResult = useMemo(() => {
    if (props.mode !== "residential" || props.sheet !== "vastu") return null;
    return analyzeVastuGrid(props.plan);
  }, [props]);

  // Render Elevation or Section View if selected in Residential Mode
  if (props.mode === "residential" && (props.sheet === "elevations" || props.sheet === "sections" || props.sheet === "construction_details")) {
    return (
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800">
            {props.projectId} · {props.sheet === "elevations" ? "Front & Side Architectural Elevation" : props.sheet === "sections" ? "Cross Section AA (Foundation to Parapet)" : "Wall & Waterproofing Construction Detail (1:10)"}
          </span>
          <span className="font-mono text-slate-500">Scale 1:50 / 1:10 · Units: mm</span>
        </div>
        <div className="p-4 cad-grid-bg">
          {props.sheet === "elevations" && (
            <svg viewBox="0 0 1100 420" className="w-full h-[360px]" data-testid="cad-elevation-svg">
              <line x1="40" y1="340" x2="1060" y2="340" stroke="#0f172a" strokeWidth="2.5" />
              <text x="50" y="362" fontSize="12" fill="#475569" fontFamily="JetBrains Mono">NGL ±0.00m</text>
              <rect x="140" y="310" width="820" height="30" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />
              <text x="50" y="328" fontSize="11" fill="#334155" fontFamily="JetBrains Mono">+450 Plinth</text>
              <rect x="150" y="130" width="800" height="180" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <rect x="130" y="116" width="840" height="16" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="150" y="76" width="800" height="40" fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.5" />
              <text x="460" y="100" fontSize="11" fill="#334155" fontFamily="JetBrains Mono">Parapet +3900mm</text>

              {props.plan.openings.slice(0, 5).map((op, idx) => {
                const ox = 200 + idx * 145;
                const isDoor = op.kind.includes("door");
                const h = isDoor ? 126 : op.kind === "ventilator" ? 36 : 72;
                const y = 310 - (isDoor ? 126 : op.sillMm === 0 ? 126 : 54 + h);
                return (
                  <g key={op.id}>
                    <rect x={ox - 10} y={y - 10} width={96} height={8} fill="#64748b" stroke="#0f172a" strokeWidth="1" />
                    <rect
                      x={ox}
                      y={y}
                      width={76}
                      height={h}
                      fill={isDoor ? "#d97706" : "#bae6fd"}
                      fillOpacity={isDoor ? 0.25 : 0.65}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                    <line x1={ox + 38} y1={y} x2={ox + 38} y2={y + h} stroke="#0f172a" strokeWidth="1" />
                    <text x={ox + 26} y={y + h + 16} fontSize="11" fill="#0f172a" fontFamily="JetBrains Mono">{op.label}</text>
                  </g>
                );
              })}

              <line x1="1010" y1="76" x2="1010" y2="340" stroke="#1d4ed8" strokeWidth="1.2" />
              <text x="1020" y="132" fontSize="11" fill="#1d4ed8" fontFamily="JetBrains Mono">+3450 Slab</text>
              <text x="1020" y="188" fontSize="11" fill="#1d4ed8" fontFamily="JetBrains Mono">+2550 Lintel</text>
              <text x="1020" y="262" fontSize="11" fill="#1d4ed8" fontFamily="JetBrains Mono">+1350 Sill</text>
            </svg>
          )}
          {props.sheet === "sections" && (
            <svg viewBox="0 0 1100 440" className="w-full h-[380px]" data-testid="cad-section-svg">
              <rect x="170" y="360" width="160" height="22" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="180" y="330" width="140" height="30" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="750" y="360" width="160" height="22" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="760" y="330" width="140" height="30" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="60" y1="300" x2="1040" y2="300" stroke="#0f172a" strokeWidth="2" />
              <rect x="235" y="265" width="610" height="35" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="235" y="95" width="24" height="235" fill="#dc2626" fillOpacity="0.25" stroke="#0f172a" strokeWidth="2" />
              <rect x="821" y="95" width="24" height="235" fill="#dc2626" fillOpacity="0.25" stroke="#0f172a" strokeWidth="2" />
              <rect x="520" y="107" width="14" height="158" fill="#ea580c" fillOpacity="0.25" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="210" y="95" width="660" height="14" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
              <rect x="235" y="55" width="24" height="40" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="821" y="55" width="24" height="40" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />
              <text x="350" y="82" fontSize="12" fill="#0f172a" fontFamily="JetBrains Mono">125mm RCC Roof Slab + Brick-Bat Weathering</text>
              <text x="350" y="190" fontSize="12" fill="#334155" fontFamily="JetBrains Mono">Clear Floor-to-Ceiling Height: 3000 mm</text>
              <text x="350" y="286" fontSize="12" fill="#0f172a" fontFamily="JetBrains Mono">Plinth Beam + 100mm PCC + Compacted Moorum</text>
              <text x="350" y="350" fontSize="11" fill="#475569" fontFamily="JetBrains Mono">Isolated RCC Footing (Verify SBC via Geotech Report)</text>
            </svg>
          )}
          {props.sheet === "construction_details" && (
            <svg viewBox="0 0 1100 420" className="w-full h-[360px]" data-testid="cad-detail-svg">
              <rect x="80" y="60" width="430" height="300" fill="#f8fafc" stroke="#cbd5e1" />
              <text x="100" y="88" fontSize="13" fontWeight="600" fill="#0f172a">Detail A: Sunken Toilet Waterproofing</text>
              <rect x="120" y="220" width="350" height="20" fill="#64748b" stroke="#0f172a" />
              <rect x="120" y="130" width="24" height="90" fill="#94a3b8" stroke="#0f172a" />
              <rect x="144" y="185" width="300" height="35" fill="#fef3c7" stroke="#b45309" strokeDasharray="4 2" />
              <rect x="144" y="165" width="300" height="20" fill="#bae6fd" stroke="#0284c7" />
              <text x="156" y="206" fontSize="11" fill="#92400e" fontFamily="JetBrains Mono">Brick-Bat Coba + 2-Coat Membrane (200mm Sunken)</text>
              <text x="156" y="179" fontSize="11" fill="#0369a1" fontFamily="JetBrains Mono">Anti-Skid Ceramic Tile @ 1:60 Slope to Trap</text>
              <rect x="570" y="60" width="450" height="300" fill="#f8fafc" stroke="#cbd5e1" />
              <text x="590" y="88" fontSize="13" fontWeight="600" fill="#0f172a">Detail B: 230mm Wall DPC & Lintel Chajja</text>
              <rect x="640" y="120" width="55" height="190" fill="#fecaca" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="640" y="165" width="140" height="20" fill="#94a3b8" stroke="#0f172a" />
              <rect x="635" y="295" width="65" height="10" fill="#0f172a" />
              <text x="715" y="179" fontSize="11" fill="#0f172a" fontFamily="JetBrains Mono">600mm RCC Chajja + Drip Mould</text>
              <text x="715" y="304" fontSize="11" fill="#0f172a" fontFamily="JetBrains Mono">40mm DPC @ Plinth Level</text>
            </svg>
          )}
        </div>
      </div>
    );
  }

  // Selected entity lookups for property editing
  const selectedWall =
    props.mode === "residential" ? props.plan.walls.find((w) => w.id === selectedId) : undefined;
  const selectedOpening =
    props.mode === "residential" ? props.plan.openings.find((o) => o.id === selectedId) : undefined;
  const selectedRoom =
    props.mode === "residential" ? props.plan.rooms.find((r) => r.id === selectedId) : undefined;
  const selectedResFurniture =
    props.mode === "residential" ? props.plan.furniture.find((f) => f.id === selectedId) : undefined;

  const selectedLandPoly =
    props.mode === "landscape" ? props.plan.polygons.find((g) => g.id === selectedId) : undefined;
  const selectedLandPath =
    props.mode === "landscape" ? props.plan.pathways.find((p) => p.id === selectedId) : undefined;
  const selectedLandPlant =
    props.mode === "landscape" ? props.plan.plants.find((pl) => pl.id === selectedId) : undefined;
  const selectedLandFurn =
    props.mode === "landscape" ? props.plan.furniture.find((f) => f.id === selectedId) : undefined;
  const selectedLandSpot =
    props.mode === "landscape" ? props.plan.spotLevels.find((sl) => sl.id === selectedId) : undefined;

  const canUndo = props.mode === "residential" ? undoStackRes.length > 0 : undoStackLand.length > 0;

  const twoClickToolHint =
    tool === "draw_wall_ext" || tool === "draw_wall_int"
      ? draftStart
        ? "Click endpoint to complete wall segment"
        : "Click start point to draw wall"
      : tool === "add_room"
        ? draftStart
          ? "Click opposite corner to size room"
          : "Click first corner of custom room"
        : tool === "land_bed"
          ? draftStart
            ? "Click opposite corner to size zone"
            : "Click first corner of custom zone"
          : tool === "land_path" || tool === "land_irrigation" || tool === "land_drainage"
            ? draftStart
              ? "Click endpoint to finish line"
              : "Click start point on site"
            : tool === "add_door" || tool === "add_window"
              ? "Click directly on a wall to cut opening"
              : tool === "select"
                ? "Click to edit · Drag rooms, plants, furniture, or spot levels to reposition"
                : "Click anywhere on the grid to place";

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* CAD Toolbar */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono font-semibold text-slate-900 mr-2">
            {props.projectId} · {props.sheet.replace(/_/g, " ").toUpperCase()}
          </span>

          {props.editable && props.mode === "residential" && (
            <>
              {(
                [
                  ["select", "Select / Move"],
                  ["draw_wall_ext", "Draw Ext Wall 230"],
                  ["draw_wall_int", "Draw Int Wall 115"],
                  ["add_door", "Cut Door"],
                  ["add_window", "Cut Window"],
                  ["add_room", "Draw Room"],
                  ["add_furniture", "Place Furniture"],
                  ["add_mep", "Place MEP"],
                ] as [CadTool, string][]
              ).map(([tId, tLabel]) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => {
                    setTool(tId);
                    setDraftStart(null);
                  }}
                  className={`px-2.5 py-1 rounded border font-medium transition-colors whitespace-nowrap shrink-0 ${
                    tool === tId
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {tLabel}
                </button>
              ))}
              {tool === "add_door" && (
                <select
                  aria-label="Door type"
                  value={doorKindToPlace}
                  onChange={(e) => setDoorKindToPlace(e.target.value as OpeningKind)}
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                >
                  <option value="main_door">Main Door (1050mm)</option>
                  <option value="bedroom_door">Room Door (900mm)</option>
                  <option value="bathroom_door">Bath Door (750mm)</option>
                  <option value="sliding_door">Sliding Door (1800mm)</option>
                </select>
              )}
              {tool === "add_room" && (
                <select
                  aria-label="Room type to draw"
                  value={roomKindToPlace}
                  onChange={(e) => setRoomKindToPlace(e.target.value as RoomKind)}
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                >
                  <option value="living">Living Room</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="dining">Dining</option>
                  <option value="bedroom">Bedroom</option>
                  <option value="master_bedroom">Master Bedroom</option>
                  <option value="bathroom">Bathroom</option>
                  <option value="courtyard">Courtyard</option>
                  <option value="veranda">Veranda</option>
                  <option value="study">Study</option>
                  <option value="utility">Utility</option>
                  <option value="staircase">Staircase</option>
                  <option value="parking">Parking</option>
                </select>
              )}
              {tool === "add_furniture" && (
                <select
                  aria-label="Furniture symbol to place"
                  value={furnitureKindToPlace}
                  onChange={(e) => setFurnitureKindToPlace(e.target.value as FurnitureKind)}
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                >
                  <option value="bed_double">Double Bed</option>
                  <option value="bed_single">Single Bed</option>
                  <option value="wardrobe">Wardrobe</option>
                  <option value="sofa_3">3-Seat Sofa</option>
                  <option value="dining_table">Dining Table</option>
                  <option value="kitchen_counter">Kitchen Counter</option>
                  <option value="kitchen_sink">Kitchen Sink</option>
                  <option value="kitchen_hob">Kitchen Hob</option>
                  <option value="fridge">Fridge</option>
                  <option value="wc">WC</option>
                  <option value="washbasin">Washbasin</option>
                  <option value="shower">Shower</option>
                  <option value="study_desk">Study Desk</option>
                  <option value="stair_flight">Staircase Flight</option>
                  <option value="car_bay">Car Parking Bay</option>
                </select>
              )}
              {tool === "add_mep" && (
                <select
                  aria-label="MEP discipline"
                  value={mepKindToPlace}
                  onChange={(e) => setMepKindToPlace(e.target.value as "electrical" | "plumbing")}
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                >
                  <option value="electrical">Electrical Point</option>
                  <option value="plumbing">Plumbing Trap/Line</option>
                </select>
              )}
            </>
          )}

          {props.editable && props.mode === "landscape" && (
            <>
              {(
                [
                  ["select", "Select / Move"],
                  ["land_bed", "Draw Zone"],
                  ["land_path", "Draw Path"],
                  ["land_tree", "Place Plant"],
                  ["land_furniture", "Place Furniture"],
                  ["land_irrigation", "Irrigation Line"],
                  ["land_drainage", "Drainage Line"],
                  ["land_spot_level", "Spot Level"],
                ] as [CadTool, string][]
              ).map(([tId, tLabel]) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => {
                    setTool(tId);
                    setDraftStart(null);
                  }}
                  className={`px-2.5 py-1 rounded border font-medium transition-colors whitespace-nowrap shrink-0 ${
                    tool === tId
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {tLabel}
                </button>
              ))}
              {tool === "land_bed" && (
                <select
                  aria-label="Landscape zone type"
                  value={landLayerToPlace}
                  onChange={(e) => setLandLayerToPlace(e.target.value as LandscapePolygon["layer"])}
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                >
                  <option value="footprint">Building Footprint</option>
                  <option value="hardscape">Hardscape / Patio</option>
                  <option value="lawn">Lawn Turf</option>
                  <option value="planting_bed">Planting Bed</option>
                  <option value="water">Water / Bioswale</option>
                  <option value="pergola">Timber Pergola</option>
                </select>
              )}
              {(tool === "land_tree" || tool === "land_shrub") && (
                <select
                  aria-label="Botanical species"
                  value={selectedPlantId}
                  onChange={(e) => setSelectedPlantId(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                >
                  {PLANT_DATABASE.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.commonName} ({pl.type}, {(pl.matureSpreadMm / 1000).toFixed(1)}m)
                    </option>
                  ))}
                </select>
              )}
              {tool === "land_furniture" && (
                <select
                  aria-label="Outdoor furniture type"
                  value={landFurnitureKind}
                  onChange={(e) => setLandFurnitureKind(e.target.value as LandscapeFurniture["kind"])}
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                >
                  <option value="bench">Garden Bench</option>
                  <option value="outdoor_table">Outdoor Dining Table</option>
                  <option value="pergola_seat">Pergola Seat</option>
                  <option value="planter_box">Planter Box</option>
                  <option value="bollard_light">Bollard Light</option>
                </select>
              )}
              {tool === "land_spot_level" && (
                <label className="flex items-center gap-1 text-slate-700">
                  <span>Elev (mm)</span>
                  <input
                    type="number"
                    step={50}
                    value={spotElevationInput}
                    onChange={(e) => setSpotElevationInput(Number(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded border border-slate-300 bg-white font-mono"
                  />
                </label>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {props.editable && (
            <button
              type="button"
              disabled={!canUndo}
              onClick={handleUndo}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              Undo
            </button>
          )}
          {selectedId && props.editable && (
            <button
              type="button"
              onClick={deleteSelected}
              className="px-2.5 py-1 rounded border border-red-300 bg-red-50 text-red-700 font-medium hover:bg-red-100 whitespace-nowrap shrink-0"
            >
              Delete Selected
            </button>
          )}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            aria-label="Zoom out CAD canvas"
          >
            −
          </button>
          <span className="font-mono text-slate-600 tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            aria-label="Zoom in CAD canvas"
          >
            +
          </button>
        </div>
      </div>

      {/* Tool Instruction Strip (Editable Mode) */}
      {props.editable && (
        <div className="px-4 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-700">
          <span>{twoClickToolHint}</span>
          {draftStart && (
            <button
              type="button"
              onClick={() => setDraftStart(null)}
              className="text-blue-700 font-medium hover:underline"
            >
              Cancel active point
            </button>
          )}
        </div>
      )}

      {/* Main 2D CAD SVG Viewport */}
      <div className="relative cad-grid-bg">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          onClick={handleSvgClick}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          className={`w-full h-[460px] select-none ${props.editable && tool !== "select" ? "cursor-crosshair" : "cursor-default"}`}
          data-testid={props.mode === "residential" ? "residential-cad-svg" : "landscape-cad-svg"}
        >
          <defs>
            <pattern id="hatch-ext-wall" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="120" stroke="#475569" strokeWidth="22" />
            </pattern>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284c7" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
            </marker>
          </defs>

          {/* Plot / Site Boundary */}
          <rect
            x={0}
            y={0}
            width={widthMm}
            height={depthMm}
            fill="#ffffff"
            fillOpacity={0.88}
            stroke="#0f172a"
            strokeWidth={45}
            strokeDasharray="240 120"
          />

          {/* Overall Plot Dimensions */}
          <g>
            <line x1={0} y1={-550} x2={widthMm} y2={-550} stroke="#334155" strokeWidth={22} />
            <line x1={0} y1={-680} x2={0} y2={-420} stroke="#334155" strokeWidth={22} />
            <line x1={widthMm} y1={-680} x2={widthMm} y2={-420} stroke="#334155" strokeWidth={22} />
            <text x={widthMm / 2} y={-650} textAnchor="middle" fontSize={260} fontFamily="JetBrains Mono" fill="#0f172a">
              {`${(widthMm / 1000).toFixed(2)} m (${widthMm} mm)`}
            </text>

            <line x1={-550} y1={0} x2={-550} y2={depthMm} stroke="#334155" strokeWidth={22} />
            <line x1={-680} y1={0} x2={-420} y2={0} stroke="#334155" strokeWidth={22} />
            <line x1={-680} y1={depthMm} x2={-420} y2={depthMm} stroke="#334155" strokeWidth={22} />
            <text
              x={-720}
              y={depthMm / 2}
              textAnchor="middle"
              transform={`rotate(-90, -720, ${depthMm / 2})`}
              fontSize={260}
              fontFamily="JetBrains Mono"
              fill="#0f172a"
            >
              {`${(depthMm / 1000).toFixed(2)} m (${depthMm} mm)`}
            </text>
          </g>

          {/* RESIDENTIAL RENDERING */}
          {props.mode === "residential" && (
            <>
              {/* Faint dashed setback guideline only (never pre-drawn walls) */}
              <rect
                x={props.plan.setbacksMm.left}
                y={props.plan.setbacksMm.front}
                width={props.plan.plotWidthMm - props.plan.setbacksMm.left - props.plan.setbacksMm.right}
                height={props.plan.plotDepthMm - props.plan.setbacksMm.front - props.plan.setbacksMm.rear}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={16}
                strokeDasharray="120 90"
              />

              {/* Room zones */}
              {props.plan.rooms.map((room) => {
                const isFloorSheet = props.sheet === "floor_finish";
                const fillColor =
                  room.kind === "courtyard"
                    ? "#ecfdf5"
                    : room.kind === "bathroom"
                      ? "#f0f9ff"
                      : isFloorSheet
                        ? "#fefce8"
                        : "#f8fafc";
                return (
                  <g
                    key={room.id}
                    onMouseDown={(ev) => startEntityDrag(ev, "room", room.id)}
                    onClick={(ev) => {
                      if (props.editable && tool === "select") {
                        ev.stopPropagation();
                        setSelectedId(room.id);
                      }
                    }}
                    className={props.editable && tool === "select" ? "cursor-move" : undefined}
                  >
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.widthMm}
                      height={room.depthMm}
                      fill={fillColor}
                      stroke={selectedId === room.id ? "#1d4ed8" : "#cbd5e1"}
                      strokeWidth={selectedId === room.id ? 35 : 14}
                    />
                    <text
                      x={room.x + room.widthMm / 2}
                      y={room.y + room.depthMm / 2 - 120}
                      textAnchor="middle"
                      fontSize={230}
                      fontWeight="700"
                      fontFamily="Plus Jakarta Sans"
                      fill="#0f172a"
                    >
                      {room.name}
                    </text>
                    <text
                      x={room.x + room.widthMm / 2}
                      y={room.y + room.depthMm / 2 + 160}
                      textAnchor="middle"
                      fontSize={190}
                      fontFamily="JetBrains Mono"
                      fill="#475569"
                    >
                      {`${(room.widthMm / 1000).toFixed(2)}×${(room.depthMm / 1000).toFixed(2)}m`}
                    </text>
                    {isFloorSheet && (
                      <text
                        x={room.x + room.widthMm / 2}
                        y={room.y + room.depthMm / 2 + 410}
                        textAnchor="middle"
                        fontSize={165}
                        fontFamily="DM Sans"
                        fill="#b45309"
                      >
                        {room.floorFinish}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Furniture Layer */}
              {props.sheet !== "wall_layout" &&
                props.sheet !== "site_plan" &&
                props.plan.furniture.map((f) => {
                  const isKitchenBathOnly = props.sheet === "kitchen_bath";
                  const isKbItem =
                    f.kind.startsWith("kitchen") ||
                    f.kind === "fridge" ||
                    f.kind === "wc" ||
                    f.kind === "washbasin" ||
                    f.kind === "shower";
                  if (isKitchenBathOnly && !isKbItem) return null;
                  const isStairOnly = props.sheet === "staircase";
                  if (isStairOnly && f.kind !== "stair_flight") return null;

                  return (
                    <g
                      key={f.id}
                      onMouseDown={(ev) => startEntityDrag(ev, "res_furniture", f.id)}
                      onClick={(ev) => {
                        if (props.editable && tool === "select") {
                          ev.stopPropagation();
                          setSelectedId(f.id);
                        }
                      }}
                      className={props.editable && tool === "select" ? "cursor-move" : undefined}
                    >
                      <rect
                        x={f.x}
                        y={f.y}
                        width={f.widthMm}
                        height={f.depthMm}
                        fill={f.kind === "wc" || f.kind === "washbasin" || f.kind === "shower" ? "#e0f2fe" : "#f1f5f9"}
                        stroke={selectedId === f.id ? "#1d4ed8" : "#475569"}
                        strokeWidth={selectedId === f.id ? 36 : 22}
                        rx={f.kind === "wc" || f.kind === "washbasin" ? 90 : 0}
                      />
                      {f.kind.startsWith("bed") && (
                        <>
                          <rect x={f.x + 120} y={f.y + 100} width={f.widthMm * 0.36} height={320} fill="#ffffff" stroke="#64748b" strokeWidth={16} />
                          <rect x={f.x + f.widthMm * 0.54} y={f.y + 100} width={f.widthMm * 0.36} height={320} fill="#ffffff" stroke="#64748b" strokeWidth={16} />
                          <line x1={f.x} y1={f.y + 620} x2={f.x + f.widthMm} y2={f.y + 620} stroke="#64748b" strokeWidth={16} />
                        </>
                      )}
                      {f.kind === "wardrobe" && (
                        <line x1={f.x} y1={f.y} x2={f.x + f.widthMm} y2={f.y + f.depthMm} stroke="#64748b" strokeWidth={16} />
                      )}
                      {f.kind === "stair_flight" && (
                        <>
                          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                            <line
                              key={step}
                              x1={f.x + (f.widthMm / 8) * step}
                              y1={f.y}
                              x2={f.x + (f.widthMm / 8) * step}
                              y2={f.y + f.depthMm}
                              stroke="#334155"
                              strokeWidth={18}
                            />
                          ))}
                          <line
                            x1={f.x + 200}
                            y1={f.y + f.depthMm / 2}
                            x2={f.x + f.widthMm - 200}
                            y2={f.y + f.depthMm / 2}
                            stroke="#1d4ed8"
                            strokeWidth={26}
                            markerEnd="url(#arrow-blue)"
                          />
                        </>
                      )}
                      {f.kind === "kitchen_hob" && (
                        <>
                          <circle cx={f.x + f.widthMm * 0.3} cy={f.y + f.depthMm * 0.35} r={85} fill="none" stroke="#0f172a" strokeWidth={18} />
                          <circle cx={f.x + f.widthMm * 0.7} cy={f.y + f.depthMm * 0.35} r={85} fill="none" stroke="#0f172a" strokeWidth={18} />
                          <circle cx={f.x + f.widthMm * 0.3} cy={f.y + f.depthMm * 0.7} r={70} fill="none" stroke="#0f172a" strokeWidth={18} />
                          <circle cx={f.x + f.widthMm * 0.7} cy={f.y + f.depthMm * 0.7} r={70} fill="none" stroke="#0f172a" strokeWidth={18} />
                        </>
                      )}
                      <text
                        x={f.x + f.widthMm / 2}
                        y={f.y + f.depthMm / 2 + 50}
                        textAnchor="middle"
                        fontSize={140}
                        fontFamily="DM Sans"
                        fill="#334155"
                      >
                        {f.label}
                      </text>
                    </g>
                  );
                })}

              {/* WALLS with REAL CUT OPENINGS */}
              {props.plan.walls.map((w) => {
                const wallOpenings = props.plan.openings
                  .filter((o) => o.wallId === w.id)
                  .sort((a, b) => a.offsetRatio - b.offsetRatio);

                const dx = w.x2 - w.x1;
                const dy = w.y2 - w.y1;
                const len = Math.hypot(dx, dy);
                if (len < 1) return null;

                const runs: { t0: number; t1: number }[] = [];
                let cursorT = 0;
                for (const op of wallOpenings) {
                  const halfT = Math.min(0.45, op.widthMm / 2 / len);
                  const startT = Math.max(0, op.offsetRatio - halfT);
                  const endT = Math.min(1, op.offsetRatio + halfT);
                  if (startT > cursorT) runs.push({ t0: cursorT, t1: startT });
                  cursorT = Math.max(cursorT, endT);
                }
                if (cursorT < 1) runs.push({ t0: cursorT, t1: 1 });

                const isExt = w.thicknessMm >= 200;
                return (
                  <g
                    key={w.id}
                    onClick={(ev) => {
                      if (props.editable && tool === "select") {
                        ev.stopPropagation();
                        setSelectedId(w.id);
                      }
                    }}
                  >
                    {runs.map((r, rIdx) => (
                      <line
                        key={`${w.id}-run-${rIdx}`}
                        x1={w.x1 + dx * r.t0}
                        y1={w.y1 + dy * r.t0}
                        x2={w.x1 + dx * r.t1}
                        y2={w.y1 + dy * r.t1}
                        stroke={selectedId === w.id ? "#1d4ed8" : isExt ? "#0f172a" : "#334155"}
                        strokeWidth={w.thicknessMm}
                        strokeLinecap="square"
                      />
                    ))}
                  </g>
                );
              })}

              {/* DOORS & WINDOWS */}
              {props.plan.openings.map((op) => {
                const wall = props.plan.walls.find((w) => w.id === op.wallId);
                if (!wall) return null;
                const { x, y, angleRad } = computeOpeningCenter(wall, op.offsetRatio);
                const angleDeg = (angleRad * 180) / Math.PI;
                const isDoor = op.kind.includes("door");
                const hw = op.widthMm / 2;

                return (
                  <g
                    key={op.id}
                    transform={`translate(${x}, ${y}) rotate(${angleDeg})`}
                    onClick={(ev) => {
                      if (props.editable && tool === "select") {
                        ev.stopPropagation();
                        setSelectedId(op.id);
                      }
                    }}
                  >
                    <rect
                      x={-hw}
                      y={-wall.thicknessMm / 2 - 8}
                      width={op.widthMm}
                      height={wall.thicknessMm + 16}
                      fill="#ffffff"
                    />
                    {isDoor ? (
                      <>
                        <rect x={-hw} y={-wall.thicknessMm / 2} width={55} height={wall.thicknessMm} fill="#0f172a" />
                        <rect x={hw - 55} y={-wall.thicknessMm / 2} width={55} height={wall.thicknessMm} fill="#0f172a" />
                        <line
                          x1={-hw}
                          y1={0}
                          x2={-hw}
                          y2={op.swingSide * op.widthMm}
                          stroke={selectedId === op.id ? "#1d4ed8" : "#92400e"}
                          strokeWidth={45}
                        />
                        <path
                          d={`M ${hw} 0 A ${op.widthMm} ${op.widthMm} 0 0 ${op.swingSide > 0 ? 1 : 0} ${-hw} ${op.swingSide * op.widthMm}`}
                          fill="none"
                          stroke={selectedId === op.id ? "#1d4ed8" : "#b45309"}
                          strokeWidth={18}
                          strokeDasharray="60 45"
                        />
                      </>
                    ) : (
                      <>
                        <rect
                          x={-hw}
                          y={-wall.thicknessMm / 2 + 20}
                          width={op.widthMm}
                          height={wall.thicknessMm - 40}
                          fill="#e0f2fe"
                          stroke={selectedId === op.id ? "#1d4ed8" : "#0369a1"}
                          strokeWidth={26}
                        />
                        <line x1={-hw} y1={0} x2={hw} y2={0} stroke="#0369a1" strokeWidth={24} />
                      </>
                    )}
                    <text
                      x={0}
                      y={-wall.thicknessMm / 2 - 90}
                      textAnchor="middle"
                      fontSize={165}
                      fontWeight="600"
                      fontFamily="JetBrains Mono"
                      fill={isDoor ? "#92400e" : "#0369a1"}
                    >
                      {op.label}
                    </text>
                  </g>
                );
              })}

              {/* MEP Sheet Nodes (shown in electrical/plumbing sheets or when editable) */}
              {(props.editable || props.sheet === "electrical" || props.sheet === "plumbing") &&
                props.plan.mepNodes
                  .filter((n) => props.editable || n.discipline === props.sheet)
                  .map((node) => (
                    <g
                      key={node.id}
                      onMouseDown={(ev) => startEntityDrag(ev, "mep", node.id)}
                      onClick={(ev) => {
                        if (props.editable && tool === "select") {
                          ev.stopPropagation();
                          setSelectedId(node.id);
                        }
                      }}
                      className={props.editable && tool === "select" ? "cursor-move" : undefined}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={190}
                        fill={node.discipline === "electrical" ? "#fef3c7" : "#dbeafe"}
                        stroke={selectedId === node.id ? "#1d4ed8" : node.discipline === "electrical" ? "#d97706" : "#1d4ed8"}
                        strokeWidth={32}
                      />
                      <text x={node.x} y={node.y + 320} textAnchor="middle" fontSize={155} fontFamily="JetBrains Mono" fill="#0f172a">
                        {node.label}
                      </text>
                    </g>
                  ))}

              {/* Sunlight & Shadow Overlay */}
              {sunResult && (
                <g>
                  {sunResult.windowAssessments.map((wa) => {
                    const op = props.plan.openings.find((o) => o.id === wa.openingId);
                    const wall = op && props.plan.walls.find((w) => w.id === op.wallId);
                    if (!op || !wall) return null;
                    const { x, y } = computeOpeningCenter(wall, op.offsetRatio);
                    const rad = ((sunResult.azimuthDeg - 90) * Math.PI) / 180;
                    const dx = -Math.cos(rad) * wa.penetrationMm;
                    const dy = -Math.sin(rad) * wa.penetrationMm;
                    const color =
                      wa.sunExposure === "Direct Glare Risk"
                        ? "#dc2626"
                        : wa.sunExposure === "Filtered Daylight"
                          ? "#d97706"
                          : "#0284c7";
                    return (
                      <g key={wa.openingId}>
                        <line
                          x1={x}
                          y1={y}
                          x2={x + dx}
                          y2={y + dy}
                          stroke={color}
                          strokeWidth={45}
                          strokeOpacity={0.75}
                          markerEnd="url(#arrow-amber)"
                        />
                        <text x={x + dx} y={y + dy - 100} fontSize={155} fontFamily="JetBrains Mono" fill={color}>
                          {`${wa.label}: ${wa.sunExposure}`}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Natural Ventilation Airflow Overlay */}
              {windResult && (
                <g>
                  {windResult.inletWindows.map((inlet, idx) => {
                    const outlet = windResult.outletWindows[idx % Math.max(1, windResult.outletWindows.length)];
                    if (!outlet) return null;
                    return (
                      <g key={inlet.id}>
                        <line
                          x1={inlet.x}
                          y1={inlet.y}
                          x2={outlet.x}
                          y2={outlet.y}
                          stroke="#0284c7"
                          strokeWidth={55}
                          strokeDasharray="160 90"
                          markerEnd="url(#arrow-blue)"
                        />
                        <circle cx={inlet.x} cy={inlet.y} r={160} fill="#0ea5e9" fillOpacity={0.35} stroke="#0284c7" strokeWidth={28} />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Vastu 9-Zone Grid Overlay */}
              {vastuResult && (
                <g>
                  {[0, 1, 2].map((r) =>
                    [0, 1, 2].map((c) => {
                      const labels = [
                        ["NW", "N", "NE"],
                        ["W", "Center", "E"],
                        ["SW", "S", "SE"],
                      ];
                      const gx = (props.plan.plotWidthMm / 3) * c;
                      const gy = (props.plan.plotDepthMm / 3) * r;
                      const gw = props.plan.plotWidthMm / 3;
                      const gh = props.plan.plotDepthMm / 3;
                      return (
                        <g key={`${r}-${c}`}>
                          <rect x={gx} y={gy} width={gw} height={gh} fill="none" stroke="#7c3aed" strokeWidth={24} strokeDasharray="100 80" />
                          <text x={gx + 160} y={gy + 280} fontSize={220} fontWeight="700" fontFamily="JetBrains Mono" fill="#6d28d9">
                            {labels[r][c]}
                          </text>
                        </g>
                      );
                    })
                  )}
                </g>
              )}
            </>
          )}

          {/* LANDSCAPE RENDERING */}
          {props.mode === "landscape" && (
            <>
              {props.plan.polygons.map((poly) => {
                if (props.sheet === "hardscape" && poly.layer !== "hardscape" && poly.layer !== "footprint" && poly.layer !== "pergola") {
                  return null;
                }
                if (props.sheet === "softscape" && poly.layer !== "lawn" && poly.layer !== "planting_bed" && poly.layer !== "footprint") {
                  return null;
                }
                const pts = poly.points.map((p) => `${p.x},${p.y}`).join(" ");
                const fillMap: Record<typeof poly.layer, string> = {
                  footprint: "#e2e8f0",
                  hardscape: "#f5f5f4",
                  lawn: "#dcfce7",
                  planting_bed: "#bbf7d0",
                  water: "#bae6fd",
                  pergola: "#fef3c7",
                };
                const strokeMap: Record<typeof poly.layer, string> = {
                  footprint: "#0f172a",
                  hardscape: "#78716c",
                  lawn: "#16a34a",
                  planting_bed: "#15803d",
                  water: "#0284c7",
                  pergola: "#b45309",
                };
                const cx = poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
                const cy = poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;

                return (
                  <g
                    key={poly.id}
                    onMouseDown={(ev) => startEntityDrag(ev, "land_poly", poly.id)}
                    onClick={(ev) => {
                      if (props.editable && tool === "select") {
                        ev.stopPropagation();
                        setSelectedId(poly.id);
                      }
                    }}
                    className={props.editable && tool === "select" ? "cursor-move" : undefined}
                  >
                    <polygon
                      points={pts}
                      fill={fillMap[poly.layer]}
                      fillOpacity={poly.layer === "pergola" ? 0.35 : 0.85}
                      stroke={selectedId === poly.id ? "#1d4ed8" : strokeMap[poly.layer]}
                      strokeWidth={poly.layer === "footprint" ? 50 : 28}
                      strokeDasharray={poly.layer === "pergola" ? "140 80" : undefined}
                    />
                    <text x={cx} y={cy} textAnchor="middle" fontSize={210} fontWeight="600" fill="#0f172a" fontFamily="Plus Jakarta Sans">
                      {poly.label}
                    </text>
                  </g>
                );
              })}

              {props.sheet !== "softscape" &&
                props.plan.pathways.map((pathObj) => {
                  const d = pathObj.points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                  return (
                    <g
                      key={pathObj.id}
                      onClick={(ev) => {
                        if (props.editable && tool === "select") {
                          ev.stopPropagation();
                          setSelectedId(pathObj.id);
                        }
                      }}
                    >
                      <path
                        d={d}
                        fill="none"
                        stroke={selectedId === pathObj.id ? "#1d4ed8" : "#d6d3d1"}
                        strokeWidth={pathObj.widthMm}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path d={d} fill="none" stroke="#57534e" strokeWidth={24} strokeDasharray="100 80" />
                    </g>
                  );
                })}

              {props.sheet !== "hardscape" &&
                props.plan.plants.map((pl) => (
                  <g
                    key={pl.id}
                    onMouseDown={(ev) => startEntityDrag(ev, "land_plant", pl.id)}
                    onClick={(ev) => {
                      if (props.editable && tool === "select") {
                        ev.stopPropagation();
                        setSelectedId(pl.id);
                      }
                    }}
                    className={props.editable && tool === "select" ? "cursor-move" : undefined}
                  >
                    <circle
                      cx={pl.x}
                      cy={pl.y}
                      r={pl.canopyRadiusMm}
                      fill={pl.category === "tree" ? "#22c55e" : "#4ade80"}
                      fillOpacity={0.28}
                      stroke={selectedId === pl.id ? "#1d4ed8" : "#15803d"}
                      strokeWidth={28}
                    />
                    <circle cx={pl.x} cy={pl.y} r={140} fill="#14532d" />
                    <text x={pl.x} y={pl.y - pl.canopyRadiusMm - 90} textAnchor="middle" fontSize={185} fontWeight="700" fontFamily="JetBrains Mono" fill="#14532d">
                      {`${pl.id} (${pl.commonName})`}
                    </text>
                  </g>
                ))}

              {props.plan.furniture.map((f) => (
                <g
                  key={f.id}
                  onMouseDown={(ev) => startEntityDrag(ev, "land_furniture", f.id)}
                  onClick={(ev) => {
                    if (props.editable && tool === "select") {
                      ev.stopPropagation();
                      setSelectedId(f.id);
                    }
                  }}
                  className={props.editable && tool === "select" ? "cursor-move" : undefined}
                >
                  <rect
                    x={f.x}
                    y={f.y}
                    width={f.widthMm}
                    height={f.depthMm}
                    fill="#fef3c7"
                    stroke={selectedId === f.id ? "#1d4ed8" : "#92400e"}
                    strokeWidth={24}
                  />
                  <text x={f.x + f.widthMm / 2} y={f.y + f.depthMm / 2 + 50} textAnchor="middle" fontSize={145} fill="#78350f">
                    {f.label}
                  </text>
                </g>
              ))}

              {props.plan.utilities.map((u) => {
                if (props.sheet === "irrigation" && u.layer !== "irrigation") return null;
                if (props.sheet === "drainage" && u.layer !== "drainage") return null;
                const d = u.points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                const stroke = u.layer === "irrigation" ? "#0284c7" : u.layer === "drainage" ? "#0f766e" : "#eab308";
                return (
                  <g
                    key={u.id}
                    onClick={(ev) => {
                      if (props.editable && tool === "select") {
                        ev.stopPropagation();
                        setSelectedId(u.id);
                      }
                    }}
                  >
                    <path
                      d={d}
                      fill="none"
                      stroke={selectedId === u.id ? "#1d4ed8" : stroke}
                      strokeWidth={55}
                      strokeDasharray="140 70"
                      markerEnd="url(#arrow-blue)"
                    />
                    <text x={u.points[0].x} y={u.points[0].y - 120} fontSize={170} fontFamily="JetBrains Mono" fill={stroke}>
                      {u.label}
                    </text>
                  </g>
                );
              })}

              {props.plan.spotLevels.map((sl) => (
                <g
                  key={sl.id}
                  onMouseDown={(ev) => startEntityDrag(ev, "land_spot", sl.id)}
                  onClick={(ev) => {
                    if (props.editable && tool === "select") {
                      ev.stopPropagation();
                      setSelectedId(sl.id);
                    }
                  }}
                  className={props.editable && tool === "select" ? "cursor-move" : undefined}
                >
                  <circle
                    cx={sl.x}
                    cy={sl.y}
                    r={110}
                    fill="#ffffff"
                    stroke={selectedId === sl.id ? "#1d4ed8" : "#0f172a"}
                    strokeWidth={24}
                  />
                  <line x1={sl.x - 160} y1={sl.y} x2={sl.x + 160} y2={sl.y} stroke="#0f172a" strokeWidth={18} />
                  <text x={sl.x + 180} y={sl.y + 60} fontSize={170} fontFamily="JetBrains Mono" fill="#0f172a">
                    {`+${(sl.elevationMm / 1000).toFixed(2)}m`}
                  </text>
                </g>
              ))}
            </>
          )}

          {/* Live Draft Rubberband Preview (Walls/Lines OR 2-Click Custom Rectangles) */}
          {draftStart && cursorMm && (tool === "add_room" || tool === "land_bed") && (
            <g>
              <rect
                x={Math.min(draftStart.x, cursorMm.x)}
                y={Math.min(draftStart.y, cursorMm.y)}
                width={Math.abs(cursorMm.x - draftStart.x)}
                height={Math.abs(cursorMm.y - draftStart.y)}
                fill={tool === "add_room" ? "#3b82f6" : "#10b981"}
                fillOpacity={0.14}
                stroke={tool === "add_room" ? "#1d4ed8" : "#047857"}
                strokeWidth={35}
                strokeDasharray="120 70"
              />
              <text
                x={(draftStart.x + cursorMm.x) / 2}
                y={(draftStart.y + cursorMm.y) / 2}
                textAnchor="middle"
                fontSize={220}
                fontWeight="700"
                fontFamily="JetBrains Mono"
                fill={tool === "add_room" ? "#1d4ed8" : "#047857"}
              >
                {`${Math.abs(cursorMm.x - draftStart.x)} × ${Math.abs(cursorMm.y - draftStart.y)} mm`}
              </text>
            </g>
          )}

          {draftStart && cursorMm && tool !== "add_room" && tool !== "land_bed" && (
            <g>
              <line
                x1={draftStart.x}
                y1={draftStart.y}
                x2={cursorMm.x}
                y2={cursorMm.y}
                stroke="#1d4ed8"
                strokeWidth={120}
                strokeOpacity={0.55}
                strokeDasharray="150 90"
              />
              <text
                x={(draftStart.x + cursorMm.x) / 2}
                y={(draftStart.y + cursorMm.y) / 2 - 180}
                textAnchor="middle"
                fontSize={210}
                fontWeight="700"
                fontFamily="JetBrains Mono"
                fill="#1d4ed8"
              >
                {`${Math.round(Math.hypot(cursorMm.x - draftStart.x, cursorMm.y - draftStart.y))} mm`}
              </text>
            </g>
          )}

          {/* North Arrow */}
          <g transform={`translate(${widthMm + 600}, 450) rotate(${props.northAngleDeg})`}>
            <circle cx={0} cy={0} r={340} fill="#ffffff" stroke="#0f172a" strokeWidth={24} />
            <polygon points="0,-280 -130,180 0,80 130,180" fill="#0f172a" />
            <text x={0} y={-380} textAnchor="middle" fontSize={220} fontWeight="700" fontFamily="JetBrains Mono" fill="#0f172a">
              N
            </text>
          </g>
        </svg>

        {/* Selected Property Editor Bar — Placed below SVG so canvas position never jumps */}
        {props.editable &&
          props.mode === "residential" &&
          (selectedWall || selectedOpening || selectedRoom || selectedResFurniture) &&
          props.onChangePlan && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex flex-wrap items-center gap-4 text-xs">
              {selectedWall && (
                <>
                  <span className="font-semibold text-blue-950">Selected Wall:</span>
                  <label className="flex items-center gap-1.5 text-slate-700">
                    Thickness (mm)
                    <select
                      value={selectedWall.thicknessMm}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        commitResPlan({
                          ...props.plan,
                          walls: props.plan.walls.map((w) =>
                            w.id === selectedWall.id
                              ? { ...w, thicknessMm: t, wallType: t >= 200 ? "external_230" : t >= 110 ? "internal_115" : "lightweight_75" }
                              : w
                          ),
                        });
                      }}
                      className="px-2 py-1 border border-blue-300 rounded bg-white font-mono"
                    >
                      <option value={230}>230 mm (External Masonry)</option>
                      <option value={150}>150 mm (AAC Block)</option>
                      <option value={115}>115 mm (Internal Brick)</option>
                      <option value={75}>75 mm (Lightweight Partition)</option>
                    </select>
                  </label>
                </>
              )}
              {selectedOpening && (
                <>
                  <span className="font-semibold text-blue-950">Selected Opening ({selectedOpening.label}):</span>
                  <label className="flex items-center gap-1 text-slate-700">
                    Width mm
                    <input
                      type="number"
                      step={50}
                      value={selectedOpening.widthMm}
                      onChange={(e) => {
                        const val = Math.max(450, Number(e.target.value));
                        commitResPlan({
                          ...props.plan,
                          openings: props.plan.openings.map((o) =>
                            o.id === selectedOpening.id ? { ...o, widthMm: val } : o
                          ),
                        });
                      }}
                      className="w-20 px-2 py-1 border border-blue-300 rounded bg-white font-mono"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-slate-700">
                    Sill mm
                    <input
                      type="number"
                      step={50}
                      value={selectedOpening.sillMm}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        commitResPlan({
                          ...props.plan,
                          openings: props.plan.openings.map((o) =>
                            o.id === selectedOpening.id ? { ...o, sillMm: val } : o
                          ),
                        });
                      }}
                      className="w-20 px-2 py-1 border border-blue-300 rounded bg-white font-mono"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      commitResPlan({
                        ...props.plan,
                        openings: props.plan.openings.map((o) =>
                          o.id === selectedOpening.id ? { ...o, swingSide: o.swingSide === 1 ? -1 : 1 } : o
                        ),
                      });
                    }}
                    className="px-2.5 py-1 rounded border border-blue-300 bg-white text-blue-900 font-medium hover:bg-blue-100"
                  >
                    Flip Swing Side
                  </button>
                </>
              )}
              {selectedRoom && (
                <>
                  <span className="font-semibold text-blue-950">Selected Room:</span>
                  <input
                    type="text"
                    aria-label="Room name"
                    value={selectedRoom.name}
                    onChange={(e) =>
                      commitResPlan({
                        ...props.plan,
                        rooms: props.plan.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, name: e.target.value } : r)),
                      })
                    }
                    className="px-2 py-1 border border-blue-300 rounded bg-white"
                  />
                  <label className="flex items-center gap-1 text-slate-700">
                    Width mm
                    <input
                      type="number"
                      step={250}
                      min={1000}
                      value={selectedRoom.widthMm}
                      onChange={(e) =>
                        commitResPlan({
                          ...props.plan,
                          rooms: props.plan.rooms.map((r) =>
                            r.id === selectedRoom.id ? { ...r, widthMm: Math.max(1000, Number(e.target.value)) } : r
                          ),
                        })
                      }
                      className="w-20 px-2 py-1 border border-blue-300 rounded bg-white font-mono"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-slate-700">
                    Depth mm
                    <input
                      type="number"
                      step={250}
                      min={1000}
                      value={selectedRoom.depthMm}
                      onChange={(e) =>
                        commitResPlan({
                          ...props.plan,
                          rooms: props.plan.rooms.map((r) =>
                            r.id === selectedRoom.id ? { ...r, depthMm: Math.max(1000, Number(e.target.value)) } : r
                          ),
                        })
                      }
                      className="w-20 px-2 py-1 border border-blue-300 rounded bg-white font-mono"
                    />
                  </label>
                </>
              )}
              {selectedResFurniture && (
                <>
                  <span className="font-semibold text-blue-950">Selected Furniture ({selectedResFurniture.label}):</span>
                  <button
                    type="button"
                    onClick={() =>
                      commitResPlan({
                        ...props.plan,
                        furniture: props.plan.furniture.map((f) =>
                          f.id === selectedResFurniture.id
                            ? { ...f, widthMm: f.depthMm, depthMm: f.widthMm, rotationDeg: (f.rotationDeg + 90) % 360 }
                            : f
                        ),
                      })
                    }
                    className="px-2.5 py-1 rounded border border-blue-300 bg-white text-blue-900 font-medium hover:bg-blue-100"
                  >
                    Rotate 90°
                  </button>
                </>
              )}
            </div>
          )}

        {props.editable &&
          props.mode === "landscape" &&
          (selectedLandPoly || selectedLandPath || selectedLandPlant || selectedLandFurn || selectedLandSpot) &&
          props.onChangePlan && (
            <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 flex flex-wrap items-center gap-4 text-xs">
              {selectedLandPoly && (
                <>
                  <span className="font-semibold text-emerald-950">Selected Zone:</span>
                  <input
                    type="text"
                    aria-label="Zone label"
                    value={selectedLandPoly.label}
                    onChange={(e) =>
                      commitLandPlan({
                        ...props.plan,
                        polygons: props.plan.polygons.map((g) =>
                          g.id === selectedLandPoly.id ? { ...g, label: e.target.value } : g
                        ),
                      })
                    }
                    className="px-2 py-1 border border-emerald-300 rounded bg-white"
                  />
                  <select
                    aria-label="Zone layer"
                    value={selectedLandPoly.layer}
                    onChange={(e) =>
                      commitLandPlan({
                        ...props.plan,
                        polygons: props.plan.polygons.map((g) =>
                          g.id === selectedLandPoly.id
                            ? { ...g, layer: e.target.value as LandscapePolygon["layer"] }
                            : g
                        ),
                      })
                    }
                    className="px-2 py-1 border border-emerald-300 rounded bg-white"
                  >
                    <option value="footprint">Building Footprint</option>
                    <option value="hardscape">Hardscape / Patio</option>
                    <option value="lawn">Lawn Turf</option>
                    <option value="planting_bed">Planting Bed</option>
                    <option value="water">Water / Bioswale</option>
                    <option value="pergola">Timber Pergola</option>
                  </select>
                </>
              )}
              {selectedLandPath && (
                <>
                  <span className="font-semibold text-emerald-950">Selected Pathway:</span>
                  <label className="flex items-center gap-1 text-slate-700">
                    Width mm
                    <input
                      type="number"
                      step={50}
                      min={600}
                      value={selectedLandPath.widthMm}
                      onChange={(e) =>
                        commitLandPlan({
                          ...props.plan,
                          pathways: props.plan.pathways.map((p) =>
                            p.id === selectedLandPath.id ? { ...p, widthMm: Math.max(600, Number(e.target.value)) } : p
                          ),
                        })
                      }
                      className="w-20 px-2 py-1 border border-emerald-300 rounded bg-white font-mono"
                    />
                  </label>
                </>
              )}
              {selectedLandPlant && (
                <span className="font-semibold text-emerald-950">
                  Selected Plant: {selectedLandPlant.id} · {selectedLandPlant.botanicalName} ({selectedLandPlant.commonName})
                </span>
              )}
              {selectedLandFurn && (
                <>
                  <span className="font-semibold text-emerald-950">Selected Fixture ({selectedLandFurn.label}):</span>
                  <button
                    type="button"
                    onClick={() =>
                      commitLandPlan({
                        ...props.plan,
                        furniture: props.plan.furniture.map((f) =>
                          f.id === selectedLandFurn.id
                            ? { ...f, widthMm: f.depthMm, depthMm: f.widthMm, rotationDeg: (f.rotationDeg + 90) % 360 }
                            : f
                        ),
                      })
                    }
                    className="px-2.5 py-1 rounded border border-emerald-300 bg-white text-emerald-900 font-medium hover:bg-emerald-100"
                  >
                    Rotate 90°
                  </button>
                </>
              )}
              {selectedLandSpot && (
                <>
                  <span className="font-semibold text-emerald-950">Selected Spot Level ({selectedLandSpot.id}):</span>
                  <label className="flex items-center gap-1 text-slate-700">
                    Elevation (mm)
                    <input
                      type="number"
                      step={50}
                      value={selectedLandSpot.elevationMm}
                      onChange={(e) =>
                        commitLandPlan({
                          ...props.plan,
                          spotLevels: props.plan.spotLevels.map((sl) =>
                            sl.id === selectedLandSpot.id ? { ...sl, elevationMm: Number(e.target.value) || 0 } : sl
                          ),
                        })
                      }
                      className="w-24 px-2 py-1 border border-emerald-300 rounded bg-white font-mono"
                    />
                  </label>
                </>
              )}
            </div>
          )}

        {/* Bottom Title Block & Coordinate Readout */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900">{props.projectTitle}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Scale {props.plan.scaleLabel}</span>
            <span aria-hidden="true">·</span>
            <span>North {props.northAngleDeg}°</span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums">
            {cursorMm && <span>X: {cursorMm.x}mm · Y: {cursorMm.y}mm</span>}
            <span>Grid Snap: 250mm</span>
          </div>
        </div>
      </div>
    </div>
  );
};
