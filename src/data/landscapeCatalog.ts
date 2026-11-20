import type {
  DifficultyLevel,
  LandscapePlanGeometry,
  LandscapePlantInstance,
  LandscapeProject,
} from "../core/types";

const LANDSCAPE_BATCHES: {
  batchIndex: number;
  batchTitle: string;
  level: DifficultyLevel;
  titles: string[];
}[] = [
  {
    batchIndex: 1,
    batchTitle: "Beginner Gardens",
    level: "Beginner",
    titles: [
      "Front Entry Garden",
      "Backyard Lawn & Patio Garden",
      "Formal Entrance Court Garden",
      "Narrow Side-Yard Garden",
      "Open Lawn Family Garden",
      "Seasonal Pollinator Flower Garden",
      "Compact Interior Courtyard Garden",
      "Modular Roof Terrace Garden",
      "Linear Balcony Herb Garden",
      "Stepping-Stone Garden Pathway",
    ],
  },
  {
    batchIndex: 2,
    batchTitle: "Modern Residential Landscapes",
    level: "Beginner",
    titles: [
      "Minimalist Limestone Front Yard",
      "Modern Villa Poolside Deck",
      "Linear Gravel & Grass Forecourt",
      "Timber Pergola Outdoor Lounge",
      "Contemporary Corner Plot Buffer",
      "Low-Maintenance Xeriscape Yard",
      "Suburban Driveway & Planter Strip",
      "Evening Accent-Lit Patio Garden",
      "Raised Masonry Planter Backyard",
      "Indoor-Outdoor Sliding Deck Garden",
    ],
  },
  {
    batchIndex: 3,
    batchTitle: "Courtyard & Terrace Landscapes",
    level: "Intermediate",
    titles: [
      "Central Muttram Planted Courtyard",
      "Shaded Fern & Moss Lightwell",
      "Multi-Tiered Balcony Planter System",
      "Intensive Green Roof Terrace",
      "Extensive Sedum Roof Deck",
      "Pergola Dining Sky-Terrace",
      "Vertical Trellis Privacy Screen Garden",
      "Zen Pebble & Bamboo Courtyard",
      "Double-Height Atrium Planting Plan",
      "Ventilated Terrace Kitchen Garden",
    ],
  },
  {
    batchIndex: 4,
    batchTitle: "Water & Rain-Harvesting Gardens",
    level: "Intermediate",
    titles: [
      "Bioswale Stormwater Retention Garden",
      "Permeable Paver Rain-Capture Court",
      "Lotus & Aquatic Reflecting Basin",
      "Stepped Cascade Water Channel",
      "Percolation Trench Recharge Yard",
      "Greywater Reed-Bed Biofilter",
      "Monsoon Overflow Detention Pond",
      "Pebble Swale & Check-Dam Border",
      "Subsurface Cistern Roof-Drainage Garden",
      "Riparian Edge Native Buffer",
    ],
  },
  {
    batchIndex: 5,
    batchTitle: "Eco & Native Planting",
    level: "Intermediate",
    titles: [
      "Tamil Nadu Native Canopy Grove",
      "Butterfly & Bird Habitat Meadow",
      "Drought-Tolerant Coastal Scrub Garden",
      "Edible Agroforestry Homestead",
      "Medicinal & Aromatic Herb Parterre",
      "Miyawaki Dense Micro-Forest Plot",
      "Shade-Tree Thermal Cooling Belt",
      "Windbreak Perimeter Shelterbelt",
      "Soil-Restoring Cover Crop Plot",
      "Zero-Turf Native Groundcover Yard",
    ],
  },
  {
    batchIndex: 6,
    batchTitle: "Commercial & Campus Plazas",
    level: "Advanced",
    titles: [
      "Corporate Entry Drop-Off Plaza",
      "University Pedestrian Spine & Seating",
      "Hospital Healing Sensory Garden",
      "Tech Park Amphitheatre Lawn",
      "Retail Promenade Streetscape",
      "Accessible Sloped Ramp Plaza",
      "Biophilic Office Courtyard",
      "Transit-Oriented Shaded Walkway",
      "Museum Sculpture Forecourt",
      "School Outdoor Learning Commons",
    ],
  },
  {
    batchIndex: 7,
    batchTitle: "Resort & Hospitality Landscapes",
    level: "Advanced",
    titles: [
      "Boutique Resort Arrival Pavilion",
      "Spa Reflection & Fragrant Walk",
      "Lagoon-Edge Cabana Landscape",
      "Tropical Palm & Frangipani Grove",
      "Hillside Contoured Villa Terrace",
      "Outdoor Banquet & Firepit Lawn",
      "Coastal Dune-Stabilized Resort",
      "Heritage Haveli Restored Charbagh",
      "Eco-Lodge Trail & Boardwalk",
      "Infinity Deck & Retaining Terrace",
    ],
  },
  {
    batchIndex: 8,
    batchTitle: "Civic Parks & Masterplans",
    level: "Advanced",
    titles: [
      "Neighborhood Pocket Park",
      "Accessible Children's Play Park",
      "Senior-Friendly Walking Loop Park",
      "Urban Stormwater Sponge Park",
      "Linear Greenway Cycle Corridor",
      "Community Orchard & Allotment Masterplan",
      "Botanical Arboretum Zoning Plan",
      "Riverfront Promenade & Embankment",
      "Campus Masterplan Grading & Drainage",
      "Complete Civic Landscape Package",
    ],
  },
];

const SAMPLE_PLANTS: Omit<LandscapePlantInstance, "id" | "x" | "y">[] = [
  { plantDbId: "PL-01", botanicalName: "Azadirachta indica", commonName: "Neem Tree", category: "tree", canopyRadiusMm: 2200, spacingMinMm: 4500 },
  { plantDbId: "PL-02", botanicalName: "Plumeria alba", commonName: "White Frangipani", category: "tree", canopyRadiusMm: 1600, spacingMinMm: 3200 },
  { plantDbId: "PL-03", botanicalName: "Mimusops elengi", commonName: "Magizham / Spanish Cherry", category: "tree", canopyRadiusMm: 2000, spacingMinMm: 4000 },
  { plantDbId: "PL-04", botanicalName: "Murraya paniculata", commonName: "Orange Jessamine", category: "shrub", canopyRadiusMm: 750, spacingMinMm: 1200 },
  { plantDbId: "PL-05", botanicalName: "Ixora coccinea", commonName: "Jungle Flame Ixora", category: "shrub", canopyRadiusMm: 650, spacingMinMm: 950 },
  { plantDbId: "PL-06", botanicalName: "Vetiveria zizanioides", commonName: "Vetiver Grass", category: "groundcover", canopyRadiusMm: 450, spacingMinMm: 650 },
  { plantDbId: "PL-07", botanicalName: "Nymphaea nouchali", commonName: "Blue Water Lily", category: "aquatic", canopyRadiusMm: 550, spacingMinMm: 900 },
];

function buildLandscapePlan(seed: number, batchIdx: number, title: string): LandscapePlanGeometry {
  const isLarge = batchIdx >= 6;
  const siteW = isLarge ? 24000 + (seed % 3) * 2000 : 12000 + (seed % 4) * 1200;
  const siteD = isLarge ? 20000 + (seed % 3) * 1500 : 14000 + (seed % 3) * 1000;

  const fpW = Math.round(siteW * 0.44);
  const fpD = Math.round(siteD * 0.36);
  const fpX = Math.round(siteW * 0.12);
  const fpY = Math.round(siteD * 0.14);
  const entranceX = fpX + Math.round(fpW * 0.5);
  const entranceY = fpY + fpD;

  const lower = title.toLowerCase();
  const hasWater = lower.includes("water") || lower.includes("pool") || lower.includes("pond") || lower.includes("bioswale") || lower.includes("lotus") || batchIdx === 4 || batchIdx === 7;
  const hasPergola = lower.includes("pergola") || lower.includes("terrace") || lower.includes("pavilion") || batchIdx >= 3;

  const patioX = fpX;
  const patioY = entranceY;
  const patioW = Math.round(fpW * 0.72);
  const patioD = Math.round(siteD * 0.16);

  const polygons: LandscapePlanGeometry["polygons"] = [
    {
      id: "poly-footprint",
      layer: "footprint",
      label: "Building Footprint",
      materialOrPlantId: "MAT-CONC",
      points: [
        { x: fpX, y: fpY },
        { x: fpX + fpW, y: fpY },
        { x: fpX + fpW, y: fpY + fpD },
        { x: fpX, y: fpY + fpD },
      ],
    },
    {
      id: "poly-patio",
      layer: "hardscape",
      label: "Entry & Patio Deck",
      materialOrPlantId: "MAT-KOTA",
      points: [
        { x: patioX, y: patioY },
        { x: patioX + patioW, y: patioY },
        { x: patioX + patioW, y: patioY + patioD },
        { x: patioX, y: patioY + patioD },
      ],
    },
    {
      id: "poly-lawn",
      layer: "lawn",
      label: "Central Turf / Groundcover",
      materialOrPlantId: "PL-ZOY",
      points: [
        { x: Math.round(siteW * 0.18), y: Math.round(siteD * 0.62) },
        { x: Math.round(siteW * 0.72), y: Math.round(siteD * 0.62) },
        { x: Math.round(siteW * 0.72), y: Math.round(siteD * 0.88) },
        { x: Math.round(siteW * 0.18), y: Math.round(siteD * 0.88) },
      ],
    },
    {
      id: "poly-bed-e",
      layer: "planting_bed",
      label: "East Shrub & Canopy Bed",
      materialOrPlantId: "PL-04",
      points: [
        { x: Math.round(siteW * 0.76), y: Math.round(siteD * 0.18) },
        { x: Math.round(siteW * 0.94), y: Math.round(siteD * 0.18) },
        { x: Math.round(siteW * 0.94), y: Math.round(siteD * 0.86) },
        { x: Math.round(siteW * 0.76), y: Math.round(siteD * 0.86) },
      ],
    },
    {
      id: "poly-bed-w",
      layer: "planting_bed",
      label: "West Buffer Bed",
      materialOrPlantId: "PL-05",
      points: [
        { x: Math.round(siteW * 0.04), y: Math.round(siteD * 0.56) },
        { x: Math.round(siteW * 0.14), y: Math.round(siteD * 0.56) },
        { x: Math.round(siteW * 0.14), y: Math.round(siteD * 0.92) },
        { x: Math.round(siteW * 0.04), y: Math.round(siteD * 0.92) },
      ],
    },
  ];

  if (hasWater) {
    polygons.push({
      id: "poly-water",
      layer: "water",
      label: lower.includes("bioswale") ? "Bioswale Retention Basin" : "Reflecting Water Basin",
      materialOrPlantId: "MAT-BASALT",
      points: [
        { x: Math.round(siteW * 0.58), y: Math.round(siteD * 0.42) },
        { x: Math.round(siteW * 0.74), y: Math.round(siteD * 0.42) },
        { x: Math.round(siteW * 0.74), y: Math.round(siteD * 0.58) },
        { x: Math.round(siteW * 0.58), y: Math.round(siteD * 0.58) },
      ],
    });
  }

  if (hasPergola) {
    polygons.push({
      id: "poly-pergola",
      layer: "pergola",
      label: "Timber Pergola Trellis",
      materialOrPlantId: "MAT-TIMBER",
      points: [
        { x: patioX + 300, y: patioY + 300 },
        { x: patioX + patioW - 300, y: patioY + 300 },
        { x: patioX + patioW - 300, y: patioY + patioD - 300 },
        { x: patioX + 300, y: patioY + patioD - 300 },
      ],
    });
  }

  const pathways: LandscapePlanGeometry["pathways"] = [
    {
      id: "path-main",
      label: "Main Entry Walkway",
      widthMm: 1200,
      material: "Flamed Granite Paver",
      connects: ["Site Gate", "Building Entrance"],
      points: [
        { x: Math.round(siteW * 0.5), y: siteD },
        { x: Math.round(siteW * 0.5), y: Math.round(siteD * 0.74) },
        { x: entranceX, y: patioY + patioD },
        { x: entranceX, y: entranceY },
      ],
    },
    {
      id: "path-garden",
      label: "Garden Loop Path",
      widthMm: 950,
      material: "Permeable Interlock",
      connects: ["Patio Deck", "East Seating"],
      points: [
        { x: patioX + patioW, y: patioY + Math.round(patioD * 0.5) },
        { x: Math.round(siteW * 0.74), y: patioY + Math.round(patioD * 0.5) },
        { x: Math.round(siteW * 0.74), y: Math.round(siteD * 0.82) },
      ],
    },
  ];

  const t1 = SAMPLE_PLANTS[seed % 3];
  const t2 = SAMPLE_PLANTS[(seed + 1) % 3];
  const sh1 = SAMPLE_PLANTS[3];
  const sh2 = SAMPLE_PLANTS[4];
  const gc = SAMPLE_PLANTS[5];

  const plants: LandscapePlantInstance[] = [
    { id: "T-01", ...t1, x: Math.round(siteW * 0.85), y: Math.round(siteD * 0.28) },
    { id: "T-02", ...t2, x: Math.round(siteW * 0.85), y: Math.round(siteD * 0.72) },
    { id: "SH-01", ...sh1, x: Math.round(siteW * 0.84), y: Math.round(siteD * 0.50) },
    { id: "SH-02", ...sh2, x: Math.round(siteW * 0.09), y: Math.round(siteD * 0.66) },
    { id: "GC-01", ...gc, x: Math.round(siteW * 0.09), y: Math.round(siteD * 0.82) },
  ];

  const utilities: LandscapePlanGeometry["utilities"] = [
    {
      id: "irr-main",
      layer: "irrigation",
      label: "Drip & Rotor Zone 1",
      spec: "25mm HDPE Main + Inline Drip 4 LPH",
      points: [
        { x: Math.round(siteW * 0.12), y: Math.round(siteD * 0.94) },
        { x: Math.round(siteW * 0.85), y: Math.round(siteD * 0.94) },
        { x: Math.round(siteW * 0.85), y: Math.round(siteD * 0.24) },
      ],
    },
    {
      id: "drn-swale",
      layer: "drainage",
      label: "1.5% Stormwater Catch Drain",
      spec: "150mm Perforated Pipe -> Recharge Pit",
      points: [
        { x: Math.round(siteW * 0.18), y: Math.round(siteD * 0.60) },
        { x: Math.round(siteW * 0.66), y: Math.round(siteD * 0.60) },
        { x: Math.round(siteW * 0.66), y: Math.round(siteD * 0.92) },
      ],
    },
    {
      id: "lgt-path",
      layer: "lighting",
      label: "12V Path Bollard Circuit",
      spec: "3000K Warm Low-Glare Bollards",
      points: [
        { x: Math.round(siteW * 0.5) - 700, y: siteD - 600 },
        { x: Math.round(siteW * 0.5) - 700, y: Math.round(siteD * 0.72) },
      ],
    },
  ];

  const furniture: LandscapePlanGeometry["furniture"] = [
    { id: "lf-1", kind: "outdoor_table", label: "Garden Table", x: patioX + 900, y: patioY + 450, widthMm: 1400, depthMm: 800, rotationDeg: 0 },
    { id: "lf-2", kind: "bench", label: "Stone Bench", x: Math.round(siteW * 0.65), y: Math.round(siteD * 0.83), widthMm: 1500, depthMm: 500, rotationDeg: 0 },
    { id: "lf-3", kind: "bollard_light", label: "Bollard L1", x: Math.round(siteW * 0.5) - 750, y: Math.round(siteD * 0.82), widthMm: 220, depthMm: 220, rotationDeg: 0 },
  ];

  const spotLevels: LandscapePlanGeometry["spotLevels"] = [
    { id: "SL-01", x: fpX + 400, y: fpY + 400, elevationMm: 450 },
    { id: "SL-02", x: patioX + 400, y: patioY + 400, elevationMm: 300 },
    { id: "SL-03", x: Math.round(siteW * 0.45), y: Math.round(siteD * 0.75), elevationMm: 150 },
    { id: "SL-04", x: Math.round(siteW * 0.5), y: siteD - 300, elevationMm: 0 },
  ];

  return {
    siteWidthMm: siteW,
    siteDepthMm: siteD,
    buildingFootprint: { x: fpX, y: fpY, widthMm: fpW, depthMm: fpD, entranceX, entranceY },
    polygons,
    pathways,
    plants,
    utilities,
    furniture,
    spotLevels,
    scaleLabel: isLarge ? "1:200 @ A3" : "1:100 @ A3",
  };
}

export const LANDSCAPE_PROJECTS: LandscapeProject[] = (() => {
  const list: LandscapeProject[] = [];
  let num = 1;

  for (const batch of LANDSCAPE_BATCHES) {
    batch.titles.forEach((title) => {
      const id = `LAND-${String(num).padStart(3, "0")}`;
      const plan = buildLandscapePlan(num, batch.batchIndex, title);
      list.push({
        id,
        number: num,
        batchIndex: batch.batchIndex,
        batchTitle: batch.batchTitle,
        title,
        category: batch.batchTitle,
        level: batch.level,
        northAngleDeg: (num % 4) * 90,
        climateZone: batch.batchIndex === 5 ? "Tropical Semi-Arid (Tamil Nadu Native)" : "Tropical Warm-Humid",
        brief: `Develop an independent 2D landscape master plan for ${title} (${id}) on a ${(plan.siteWidthMm / 1000).toFixed(1)}m × ${(plan.siteDepthMm / 1000).toFixed(1)}m site. Coordinate hardscape pathways with the building entrance, define closed planting bed polygons, link plant IDs to spacing rules, and grade spot levels for positive 1.5% stormwater drainage.`,
        siteCondition: `Building plinth at +450mm draining smoothly to road edge ±0.00m; permeable paving and bioswale recharge integration.`,
        requiredElements: [
          "Aligned site boundary and building footprint",
          "Connected hardscape pathway >=950mm wide",
          "Closed softscape lawn and planting bed polygons",
          "Botanical plant symbols with IDs and spacing clearances",
          "Separate irrigation and stormwater drainage layers",
        ],
        constraints: [
          "Maintain minimum 1500mm clearance between canopy tree trunks and foundation walls.",
          "Slope hardscape away from building plinth at minimum 1.5% (1:67) toward catch basins.",
          "Group hydro-zones (low vs moderate water plants) onto separate drip irrigation loops.",
        ],
        designExplanation: `The ${title} master plan separates pedestrian circulation from vegetated infiltration beds, anchors seating beneath shade canopy trees, and directs surface runoff via spot levels toward the recharge zone.`,
        assessmentQuestion: {
          prompt: `When grading hardscape adjacent to the building footprint in ${title} (${id}), which slope direction is mandatory?`,
          options: [
            "Slope positively away from the building plinth (1.5%–2%) toward surface drains or bioswales",
            "Slope hardscape inward toward the building entrance walls",
            "Keep all outdoor paving strictly 0.0% dead-level without drains",
            "Place deep-rooted large trees within 500mm of the foundation footing",
          ],
          correctIndex: 0,
          explanation:
            "Positive drainage away from building foundations prevents dampness and waterlogging while feeding rainwater into planted swales.",
        },
        referencePlan: plan,
      });
      num++;
    });
  }

  return list;
})();

export { LANDSCAPE_BATCHES };
