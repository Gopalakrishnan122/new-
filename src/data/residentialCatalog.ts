import type {
  DifficultyLevel,
  FurnitureItem,
  MepNode,
  OpeningSpec,
  ResidentialPlanGeometry,
  ResidentialProject,
  RoomZone,
  WallSegment,
} from "../core/types";

const RESIDENTIAL_BATCHES: {
  batchIndex: number;
  batchTitle: string;
  level: DifficultyLevel;
  titles: string[];
}[] = [
  {
    batchIndex: 1,
    batchTitle: "Beginner Residential Planning",
    level: "Beginner",
    titles: [
      "Compact 1BHK Residence",
      "Small Village House",
      "Compact Rental House",
      "Small Garden House",
      "East-Facing Starter House",
      "North-Facing Starter House",
      "Basic 2BHK Residence",
      "Narrow Plot House",
      "Budget Family House",
      "Small Independent House",
    ],
  },
  {
    batchIndex: 2,
    batchTitle: "2BHK Residential Designs",
    level: "Beginner",
    titles: [
      "Family 2BHK House",
      "Open Kitchen 2BHK",
      "Separate Kitchen 2BHK",
      "2BHK with Attached Bathrooms",
      "2BHK Courtyard House",
      "Utility-Focused 2BHK",
      "Cross-Ventilation 2BHK",
      "Vastu-Oriented 2BHK",
      "Natural Daylight 2BHK",
      "Compact Urban 2BHK",
    ],
  },
  {
    batchIndex: 3,
    batchTitle: "3BHK Residential Designs",
    level: "Intermediate",
    titles: [
      "Standard 3BHK Residence",
      "Modern 3BHK Residence",
      "Traditional 3BHK Residence",
      "Duplex-Style 3BHK",
      "3BHK with Central Courtyard",
      "3BHK with Dedicated Study",
      "3BHK with Home Office",
      "3BHK with Wet Utility",
      "3BHK with Covered Parking",
      "Energy-Efficient 3BHK",
    ],
  },
  {
    batchIndex: 4,
    batchTitle: "Site Condition Variations",
    level: "Intermediate",
    titles: [
      "Narrow and Long Plot House",
      "Square Plot Residence",
      "Corner Plot Dual-Frontage House",
      "Irregular Tapered Plot House",
      "East-Facing Plot Residence",
      "West-Facing Shaded Residence",
      "North-Facing Daylight Residence",
      "South-Facing Insulated Residence",
      "L-Shaped Courtyard House",
      "U-Shaped Pavilion House",
    ],
  },
  {
    batchIndex: 5,
    batchTitle: "Duplex & Multistorey",
    level: "Intermediate",
    titles: [
      "G+1 Family Duplex",
      "G+2 Urban Residence",
      "Duplex with Double-Height Living",
      "Duplex with Internal Staircase",
      "Duplex with Cantilevered Balcony",
      "Independent Upper-Floor Residence",
      "Dual Rental-Floor Arrangement",
      "Multigenerational G+1 House",
      "Compact Multistorey Townhouse",
      "Modern Family G+1 Duplex",
    ],
  },
  {
    batchIndex: 6,
    batchTitle: "Villas & Premium Houses",
    level: "Advanced",
    titles: [
      "Small Boutique Villa",
      "Modern Minimalist Villa",
      "Luxury Corner Villa",
      "Central Courtyard Villa",
      "Villa with Lap Swimming Pool",
      "Villa with Acoustic Home Theatre",
      "Villa with Botanical Garden",
      "Villa with Outdoor Dining Pavilion",
      "Contemporary Cantilever Villa",
      "Premium Family Estate Residence",
    ],
  },
  {
    batchIndex: 7,
    batchTitle: "Tamil Nadu & Climate-Responsive",
    level: "Advanced",
    titles: [
      "Traditional Tamil Nadu Thinnai House",
      "Chettinad-Inspired Muttram Residence",
      "Tamil Nadu Village Farmhouse",
      "Passive Cooling Lime-Plaster House",
      "Stack-Effect Naturally Ventilated House",
      "North-Light Daylight-Optimised House",
      "Rainwater Harvesting Zero-Runoff House",
      "High-Insulation Energy-Efficient Residence",
      "Low-Carbon Sustainable House",
      "Farmhouse with Shaded Outdoor Veranda",
    ],
  },
  {
    batchIndex: 8,
    batchTitle: "Special Residential Designs",
    level: "Advanced",
    titles: [
      "Urban Compact Infill Residence",
      "Elderly-Friendly Step-Free House",
      "Universal Accessible Residence",
      "Residence with Ground Studio Office",
      "High-Yield Rental Investment House",
      "Mixed-Use Retail & Residence",
      "Indoor-Outdoor Pavilion Residence",
      "Premium Contemporary Concrete House",
      "Custom Irregular-Site Residence",
      "Complete Professional Residential Package",
    ],
  },
];

type Archetype =
  | "1bhk"
  | "2bhk_standard"
  | "2bhk_courtyard"
  | "3bhk_standard"
  | "narrow_long"
  | "duplex_g1"
  | "chettinad_courtyard"
  | "villa_luxury";

function pickArchetype(batchIdx: number, itemIdx: number, title: string): Archetype {
  const lower = title.toLowerCase();
  if (lower.includes("chettinad") || lower.includes("tamil nadu") || lower.includes("muttram")) {
    return "chettinad_courtyard";
  }
  if (lower.includes("narrow") || lower.includes("infill")) return "narrow_long";
  if (lower.includes("duplex") || lower.includes("g+1") || lower.includes("g+2") || lower.includes("multistorey")) {
    return "duplex_g1";
  }
  if (lower.includes("villa") || lower.includes("theatre") || lower.includes("pool")) {
    return "villa_luxury";
  }
  if (lower.includes("courtyard") || lower.includes("l-shaped") || lower.includes("u-shaped")) {
    return "2bhk_courtyard";
  }
  if (batchIdx === 1 && itemIdx < 6) return "1bhk";
  if (batchIdx <= 2) return "2bhk_standard";
  if (batchIdx === 3 || batchIdx === 4) return "3bhk_standard";
  return itemIdx % 2 === 0 ? "3bhk_standard" : "chettinad_courtyard";
}

function buildPlanGeometry(
  archetype: Archetype,
  seed: number,
  hasStaircase: boolean,
  floors: number
): ResidentialPlanGeometry {
  // All coordinates in mm; positive X right, positive Y down (plan view)
  const deltaW = (seed % 3) * 300;
  const deltaD = ((seed + 1) % 3) * 300;

  // Compute bounding box of building inside plot with realistic setbacks
  let plotW = 9000 + deltaW;
  let plotD = 12000 + deltaD;
  let setbacks = { front: 1800, rear: 1200, left: 1000, right: 1000 };

  if (archetype === "1bhk") {
    plotW = 7500 + deltaW;
    plotD = 10500 + deltaD;
    setbacks = { front: 1500, rear: 1000, left: 900, right: 900 };
  } else if (archetype === "narrow_long") {
    plotW = 6200 + (seed % 2) * 300;
    plotD = 16500 + deltaD;
    setbacks = { front: 2000, rear: 1500, left: 600, right: 600 };
  } else if (archetype === "3bhk_standard" || archetype === "duplex_g1") {
    plotW = 10800 + deltaW;
    plotD = 14400 + deltaD;
    setbacks = { front: 2400, rear: 1500, left: 1200, right: 1200 };
  } else if (archetype === "chettinad_courtyard" || archetype === "villa_luxury") {
    plotW = 13500 + deltaW;
    plotD = 16800 + deltaD;
    setbacks = { front: 3000, rear: 1800, left: 1500, right: 1500 };
  }

  const bx1 = setbacks.left;
  const by1 = setbacks.front;
  const bx2 = plotW - setbacks.right;
  const by2 = plotD - setbacks.rear;
  const bw = bx2 - bx1;
  const bd = by2 - by1;

  const walls: WallSegment[] = [];
  const openings: OpeningSpec[] = [];
  const rooms: RoomZone[] = [];
  const furniture: FurnitureItem[] = [];
  const mepNodes: MepNode[] = [];

  // Helper to add external perimeter walls cleanly
  walls.push(
    { id: "w-ext-n", x1: bx1, y1: by1, x2: bx2, y2: by1, thicknessMm: 230, wallType: "external_230" },
    { id: "w-ext-e", x1: bx2, y1: by1, x2: bx2, y2: by2, thicknessMm: 230, wallType: "external_230" },
    { id: "w-ext-s", x1: bx2, y1: by2, x2: bx1, y2: by2, thicknessMm: 230, wallType: "external_230" },
    { id: "w-ext-w", x1: bx1, y1: by2, x2: bx1, y2: by1, thicknessMm: 230, wallType: "external_230" }
  );

  if (archetype === "1bhk") {
    const midX = Math.round(bx1 + bw * 0.54);
    const midY = Math.round(by1 + bd * 0.52);
    const bathX = Math.round(bx1 + bw * 0.65);

    // Internal walls connected cleanly to perimeter & each other
    walls.push(
      { id: "w-int-1", x1: bx1, y1: midY, x2: bx2, y2: midY, thicknessMm: 115, wallType: "internal_115" },
      { id: "w-int-2", x1: midX, y1: by1, x2: midX, y2: midY, thicknessMm: 115, wallType: "internal_115" },
      { id: "w-int-3", x1: bathX, y1: midY, x2: bathX, y2: by2, thicknessMm: 115, wallType: "internal_115" }
    );

    rooms.push(
      { id: "r-living", name: "Living & Dining", kind: "living", x: bx1, y: by1, widthMm: midX - bx1, depthMm: midY - by1, floorFinish: "Vitrified Tile" },
      { id: "r-kitchen", name: "Kitchen", kind: "kitchen", x: midX, y: by1, widthMm: bx2 - midX, depthMm: midY - by1, floorFinish: "Matte Ceramic" },
      { id: "r-bed1", name: "Bedroom 1", kind: "bedroom", x: bx1, y: midY, widthMm: bathX - bx1, depthMm: by2 - midY, floorFinish: "Laminate Wood" },
      { id: "r-bath1", name: "Bathroom", kind: "bathroom", x: bathX, y: midY, widthMm: bx2 - bathX, depthMm: by2 - midY, floorFinish: "Anti-Skid Tile" }
    );

    openings.push(
      { id: "op-md", wallId: "w-ext-n", kind: "main_door", label: "MD", offsetRatio: 0.25, widthMm: 1000, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Teak Wood", roomId: "r-living" },
      { id: "op-d1", wallId: "w-int-1", kind: "bedroom_door", label: "D1", offsetRatio: 0.35, widthMm: 900, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Engineered Wood", roomId: "r-bed1" },
      { id: "op-d2", wallId: "w-int-3", kind: "bathroom_door", label: "D2", offsetRatio: 0.3, widthMm: 750, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "WPC Waterproof", roomId: "r-bath1" },
      { id: "op-d3", wallId: "w-int-2", kind: "kitchen_door", label: "D3", offsetRatio: 0.55, widthMm: 900, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Open Arch / Flush", roomId: "r-kitchen" },
      { id: "op-w1", wallId: "w-ext-w", kind: "window", label: "W1", offsetRatio: 0.26, widthMm: 1500, heightMm: 1200, sillMm: 900, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC Casement", roomId: "r-living" },
      { id: "op-w2", wallId: "w-ext-e", kind: "window", label: "W2", offsetRatio: 0.26, widthMm: 1200, heightMm: 1050, sillMm: 1050, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC Sliding", roomId: "r-kitchen" },
      { id: "op-w3", wallId: "w-ext-s", kind: "window", label: "W3", offsetRatio: 0.65, widthMm: 1500, heightMm: 1200, sillMm: 900, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC Casement", roomId: "r-bed1" },
      { id: "op-v1", wallId: "w-ext-e", kind: "ventilator", label: "V1", offsetRatio: 0.78, widthMm: 600, heightMm: 450, sillMm: 1650, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Louvered Aluminum", roomId: "r-bath1" }
    );

    furniture.push(
      { id: "f-sofa", kind: "sofa_3", label: "3-Seat Sofa", roomId: "r-living", x: bx1 + 350, y: by1 + 1400, widthMm: 1950, depthMm: 850, rotationDeg: 0 },
      { id: "f-tv", kind: "tv_unit", label: "TV Console", roomId: "r-living", x: midX - 550, y: by1 + 1300, widthMm: 400, depthMm: 1400, rotationDeg: 0 },
      { id: "f-cnt", kind: "kitchen_counter", label: "Counter", roomId: "r-kitchen", x: midX + 200, y: by1 + 200, widthMm: bx2 - midX - 400, depthMm: 600, rotationDeg: 0 },
      { id: "f-sink", kind: "kitchen_sink", label: "Sink", roomId: "r-kitchen", x: bx2 - 900, y: by1 + 240, widthMm: 600, depthMm: 480, rotationDeg: 0 },
      { id: "f-hob", kind: "kitchen_hob", label: "Hob", roomId: "r-kitchen", x: midX + 550, y: by1 + 240, widthMm: 600, depthMm: 480, rotationDeg: 0 },
      { id: "f-fridge", kind: "fridge", label: "Fridge", roomId: "r-kitchen", x: bx2 - 800, y: midY - 850, widthMm: 650, depthMm: 650, rotationDeg: 0 },
      { id: "f-bed1", kind: "bed_double", label: "Queen Bed", roomId: "r-bed1", x: bx1 + 450, y: by2 - 2150, widthMm: 1600, depthMm: 1950, rotationDeg: 0 },
      { id: "f-ward1", kind: "wardrobe", label: "Wardrobe", roomId: "r-bed1", x: bathX - 750, y: midY + 400, widthMm: 600, depthMm: 1500, rotationDeg: 0 },
      { id: "f-wc1", kind: "wc", label: "WC", roomId: "r-bath1", x: bathX + 250, y: by2 - 800, widthMm: 450, depthMm: 650, rotationDeg: 0 },
      { id: "f-wb1", kind: "washbasin", label: "Basin", roomId: "r-bath1", x: bx2 - 650, y: midY + 350, widthMm: 500, depthMm: 420, rotationDeg: 0 },
      { id: "f-sh1", kind: "shower", label: "Shower", roomId: "r-bath1", x: bx2 - 950, y: by2 - 950, widthMm: 800, depthMm: 800, rotationDeg: 0 }
    );
  } else if (archetype === "narrow_long") {
    const y1 = Math.round(by1 + bd * 0.30);
    const y2 = Math.round(by1 + bd * 0.56);
    const y3 = Math.round(by1 + bd * 0.78);
    const passageX = Math.round(bx1 + bw * 0.28);
    const bathX = Math.round(bx1 + bw * 0.58);

    walls.push(
      { id: "w-int-1", x1: bx1, y1, x2: bx2, y2: y1, thicknessMm: 115, wallType: "internal_115" },
      { id: "w-int-2", x1: passageX, y1, x2: passageX, y2: y3, thicknessMm: 115, wallType: "internal_115" },
      { id: "w-int-3", x1: passageX, y1: y2, x2: bx2, y2, thicknessMm: 115, wallType: "internal_115" },
      { id: "w-int-4", x1: bx1, y1: y3, x2: bx2, y2: y3, thicknessMm: 115, wallType: "internal_115" },
      { id: "w-int-5", x1: bathX, y1: y2, x2: bathX, y2: y3, thicknessMm: 115, wallType: "internal_115" }
    );

    rooms.push(
      { id: "r-living", name: "Living & Dining", kind: "living", x: bx1, y: by1, widthMm: bw, depthMm: y1 - by1, floorFinish: "Vitrified Tile" },
      { id: "r-passage", name: "Corridor", kind: "passage", x: bx1, y: y1, widthMm: passageX - bx1, depthMm: y3 - y1, floorFinish: "Vitrified Tile" },
      { id: "r-kitchen", name: "Kitchen", kind: "kitchen", x: passageX, y: y1, widthMm: bx2 - passageX, depthMm: y2 - y1, floorFinish: "Matte Ceramic" },
      { id: "r-bed1", name: "Bedroom 1", kind: "bedroom", x: passageX, y: y2, widthMm: bathX - passageX, depthMm: y3 - y2, floorFinish: "Laminate Wood" },
      { id: "r-bath1", name: "Bathroom", kind: "bathroom", x: bathX, y: y2, widthMm: bx2 - bathX, depthMm: y3 - y2, floorFinish: "Anti-Skid Tile" },
      { id: "r-bed2", name: "Master Bedroom", kind: "master_bedroom", x: bx1, y: y3, widthMm: bw, depthMm: by2 - y3, floorFinish: "Laminate Wood" }
    );

    openings.push(
      { id: "op-md", wallId: "w-ext-n", kind: "main_door", label: "MD", offsetRatio: 0.25, widthMm: 1000, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Teak Wood", roomId: "r-living" },
      { id: "op-d0", wallId: "w-int-1", kind: "bedroom_door", label: "D0", offsetRatio: 0.14, widthMm: 950, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Open Corridor", roomId: "r-passage" },
      { id: "op-d1", wallId: "w-int-2", kind: "kitchen_door", label: "D1", offsetRatio: 0.22, widthMm: 900, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Engineered Wood", roomId: "r-kitchen" },
      { id: "op-d2", wallId: "w-int-2", kind: "bedroom_door", label: "D2", offsetRatio: 0.72, widthMm: 900, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Engineered Wood", roomId: "r-bed1" },
      { id: "op-d3", wallId: "w-int-5", kind: "bathroom_door", label: "D3", offsetRatio: 0.5, widthMm: 750, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "WPC Waterproof", roomId: "r-bath1" },
      { id: "op-d4", wallId: "w-int-4", kind: "bedroom_door", label: "D4", offsetRatio: 0.18, widthMm: 900, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Engineered Wood", roomId: "r-bed2" },
      { id: "op-w1", wallId: "w-ext-n", kind: "window", label: "W1", offsetRatio: 0.7, widthMm: 1800, heightMm: 1350, sillMm: 900, headMm: 2250, swingSide: 1, swingDir: 1, frameMaterial: "UPVC", roomId: "r-living" },
      { id: "op-w2", wallId: "w-ext-e", kind: "window", label: "W2", offsetRatio: 0.42, widthMm: 1200, heightMm: 1200, sillMm: 900, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC", roomId: "r-kitchen" },
      { id: "op-w4", wallId: "w-ext-w", kind: "window", label: "W4", offsetRatio: 0.68, widthMm: 1500, heightMm: 1200, sillMm: 900, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC", roomId: "r-bed1" },
      { id: "op-v1", wallId: "w-ext-e", kind: "ventilator", label: "V1", offsetRatio: 0.68, widthMm: 600, heightMm: 450, sillMm: 1650, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Louvered", roomId: "r-bath1" },
      { id: "op-w3", wallId: "w-ext-s", kind: "window", label: "W3", offsetRatio: 0.5, widthMm: 2100, heightMm: 1350, sillMm: 900, headMm: 2250, swingSide: 1, swingDir: 1, frameMaterial: "UPVC", roomId: "r-bed2" }
    );

    furniture.push(
      { id: "f-sofa", kind: "sofa_3", label: "Sofa", roomId: "r-living", x: bx1 + 350, y: by1 + 1100, widthMm: 1950, depthMm: 850, rotationDeg: 0 },
      { id: "f-din", kind: "dining_table", label: "4-Seat Dining", roomId: "r-living", x: bx2 - 1550, y: y1 - 1250, widthMm: 1250, depthMm: 850, rotationDeg: 0 },
      { id: "f-cnt", kind: "kitchen_counter", label: "Counter", roomId: "r-kitchen", x: bx2 - 800, y: y1 + 250, widthMm: 600, depthMm: y2 - y1 - 500, rotationDeg: 0 },
      { id: "f-sink", kind: "kitchen_sink", label: "Sink", roomId: "r-kitchen", x: bx2 - 760, y: y1 + 450, widthMm: 500, depthMm: 520, rotationDeg: 0 },
      { id: "f-hob", kind: "kitchen_hob", label: "Hob", roomId: "r-kitchen", x: bx2 - 760, y: y2 - 1050, widthMm: 500, depthMm: 520, rotationDeg: 0 },
      { id: "f-bed1", kind: "bed_single", label: "Single Bed", roomId: "r-bed1", x: passageX + 250, y: y2 + 300, widthMm: 1000, depthMm: 1900, rotationDeg: 0 },
      { id: "f-wc1", kind: "wc", label: "WC", roomId: "r-bath1", x: bathX + 250, y: y3 - 750, widthMm: 450, depthMm: 600, rotationDeg: 0 },
      { id: "f-wb1", kind: "washbasin", label: "Basin", roomId: "r-bath1", x: bx2 - 650, y: y2 + 300, widthMm: 480, depthMm: 400, rotationDeg: 0 },
      { id: "f-bed2", kind: "bed_double", label: "Master Bed", roomId: "r-bed2", x: bx1 + 450, y: by2 - 2100, widthMm: 1700, depthMm: 1950, rotationDeg: 0 },
      { id: "f-ward2", kind: "wardrobe", label: "Wardrobe", roomId: "r-bed2", x: bx2 - 850, y: y3 + 350, widthMm: 600, depthMm: 1650, rotationDeg: 0 }
    );
  } else {
    // Rich multi-room 2BHK / 3BHK / Courtyard / Duplex / Chettinad / Villa grid
    const col1 = Math.round(bx1 + bw * 0.48);
    const col2 = Math.round(bx1 + bw * 0.74);
    const row1 = Math.round(by1 + bd * 0.42);
    const row2 = Math.round(by1 + bd * 0.70);

    walls.push(
      { id: "w-int-r1", x1: bx1, y1: row1, x2: bx2, y2: row1, thicknessMm: 115, wallType: "internal_115" },
      { id: "w-int-r2", x1: bx1, y1: row2, x2: bx2, y2: row2, thicknessMm: 115, wallType: "internal_115" },
      { id: "w-int-c1", x1: col1, y1: by1, x2: col1, y2: by2, thicknessMm: 115, wallType: "internal_115" },
      { id: "w-int-c2", x1: col2, y1: row1, x2: col2, y2: by2, thicknessMm: 115, wallType: "internal_115" }
    );

    const centerKind =
      archetype === "2bhk_courtyard" || archetype === "chettinad_courtyard"
        ? "courtyard"
        : hasStaircase
          ? "staircase"
          : "dining";
    const centerName =
      centerKind === "courtyard"
        ? "Central Muttram / Courtyard"
        : centerKind === "staircase"
          ? "Staircase & Foyer"
          : "Dining & Utility";

    rooms.push(
      { id: "r-living", name: "Living Hall", kind: "living", x: bx1, y: by1, widthMm: col1 - bx1, depthMm: row1 - by1, floorFinish: archetype === "chettinad_courtyard" ? "Athangudi Tile" : "Vitrified Tile" },
      { id: "r-kitchen", name: "Kitchen & Dining", kind: "kitchen", x: col1, y: by1, widthMm: bx2 - col1, depthMm: row1 - by1, floorFinish: "Granite & Matte Tile" },
      { id: "r-center", name: centerName, kind: centerKind, x: bx1, y: row1, widthMm: col1 - bx1, depthMm: row2 - row1, floorFinish: centerKind === "courtyard" ? "Natural Kota Stone" : "Vitrified Tile" },
      { id: "r-bed1", name: "Bedroom 1", kind: "bedroom", x: col1, y: row1, widthMm: col2 - col1, depthMm: row2 - row1, floorFinish: "Wooden Plank Tile" },
      { id: "r-bath1", name: "Common Bathroom", kind: "bathroom", x: col2, y: row1, widthMm: bx2 - col2, depthMm: row2 - row1, floorFinish: "Anti-Skid Ceramic" },
      { id: "r-bed2", name: "Master Bedroom", kind: "master_bedroom", x: bx1, y: row2, widthMm: col1 - bx1, depthMm: by2 - row2, floorFinish: "Teak Laminate" },
      { id: "r-bed3", name: archetype.includes("2bhk") ? "Study / Sit-Out" : "Bedroom 3", kind: archetype.includes("2bhk") ? "study" : "bedroom", x: col1, y: row2, widthMm: col2 - col1, depthMm: by2 - row2, floorFinish: "Wooden Plank Tile" },
      { id: "r-bath2", name: "Master Bath", kind: "bathroom", x: col2, y: row2, widthMm: bx2 - col2, depthMm: by2 - row2, floorFinish: "Anti-Skid Ceramic" }
    );

    openings.push(
      { id: "op-md", wallId: "w-ext-n", kind: "main_door", label: "MD", offsetRatio: 0.22, widthMm: 1050, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Seasoned Teak", roomId: "r-living" },
      { id: "op-kd", wallId: "w-int-c1", kind: "kitchen_door", label: "D1", offsetRatio: 0.22, widthMm: 1000, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Open Cased Frame", roomId: "r-kitchen" },
      { id: "op-cd", wallId: "w-int-r1", kind: "double_door", label: "D2", offsetRatio: 0.24, widthMm: 1200, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Teak / Glazed", roomId: "r-center" },
      { id: "op-b1d", wallId: "w-int-c1", kind: "bedroom_door", label: "D3", offsetRatio: 0.56, widthMm: 900, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Flush Veneer", roomId: "r-bed1" },
      { id: "op-t1d", wallId: "w-int-c2", kind: "bathroom_door", label: "D4", offsetRatio: 0.25, widthMm: 750, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "WPC", roomId: "r-bath1" },
      { id: "op-b2d", wallId: "w-int-r2", kind: "bedroom_door", label: "D5", offsetRatio: 0.24, widthMm: 900, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Flush Veneer", roomId: "r-bed2" },
      { id: "op-b3d", wallId: "w-int-c1", kind: "bedroom_door", label: "D6", offsetRatio: 0.85, widthMm: 900, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Flush Veneer", roomId: "r-bed3" },
      { id: "op-t2d", wallId: "w-int-c2", kind: "bathroom_door", label: "D7", offsetRatio: 0.78, widthMm: 750, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "WPC", roomId: "r-bath2" },
      { id: "op-w1", wallId: "w-ext-w", kind: "french_window", label: "FW1", offsetRatio: 0.21, widthMm: 1800, heightMm: 2100, sillMm: 0, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Aluminum Sliding", roomId: "r-living" },
      { id: "op-w2", wallId: "w-ext-n", kind: "window", label: "W1", offsetRatio: 0.72, widthMm: 1500, heightMm: 1200, sillMm: 900, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC Casement", roomId: "r-kitchen" },
      { id: "op-w3", wallId: "w-ext-e", kind: "window", label: "W2", offsetRatio: 0.22, widthMm: 1200, heightMm: 1050, sillMm: 1050, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC Sliding", roomId: "r-kitchen" },
      { id: "op-w4", wallId: "w-ext-w", kind: "window", label: "W3", offsetRatio: 0.56, widthMm: 1500, heightMm: 1200, sillMm: 900, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC Casement", roomId: "r-center" },
      { id: "op-w5", wallId: "w-ext-w", kind: "window", label: "W4", offsetRatio: 0.85, widthMm: 1500, heightMm: 1200, sillMm: 900, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC Casement", roomId: "r-bed2" },
      { id: "op-w6", wallId: "w-ext-s", kind: "window", label: "W5", offsetRatio: 0.6, widthMm: 1500, heightMm: 1200, sillMm: 900, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "UPVC Casement", roomId: "r-bed3" },
      { id: "op-v1", wallId: "w-ext-e", kind: "ventilator", label: "V1", offsetRatio: 0.56, widthMm: 600, heightMm: 450, sillMm: 1650, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Louvered Aluminum", roomId: "r-bath1" },
      { id: "op-v2", wallId: "w-ext-e", kind: "ventilator", label: "V2", offsetRatio: 0.85, widthMm: 600, heightMm: 450, sillMm: 1650, headMm: 2100, swingSide: 1, swingDir: 1, frameMaterial: "Louvered Aluminum", roomId: "r-bath2" }
    );

    furniture.push(
      { id: "f-sofa", kind: "sofa_3", label: "Main Sofa", roomId: "r-living", x: bx1 + 380, y: by1 + 1200, widthMm: 2100, depthMm: 880, rotationDeg: 0 },
      { id: "f-tv", kind: "tv_unit", label: "TV Wall", roomId: "r-living", x: col1 - 550, y: by1 + 1100, widthMm: 400, depthMm: 1600, rotationDeg: 0 },
      { id: "f-shoe", kind: "shoe_rack", label: "Shoe Rack", roomId: "r-living", x: bx1 + 380, y: by1 + 250, widthMm: 900, depthMm: 350, rotationDeg: 0 },
      { id: "f-cnt", kind: "kitchen_counter", label: "L-Counter", roomId: "r-kitchen", x: col1 + 250, y: by1 + 200, widthMm: bx2 - col1 - 450, depthMm: 620, rotationDeg: 0 },
      { id: "f-sink", kind: "kitchen_sink", label: "Sink", roomId: "r-kitchen", x: bx2 - 900, y: by1 + 240, widthMm: 600, depthMm: 480, rotationDeg: 0 },
      { id: "f-hob", kind: "kitchen_hob", label: "4-Burner Hob", roomId: "r-kitchen", x: col1 + 600, y: by1 + 240, widthMm: 650, depthMm: 500, rotationDeg: 0 },
      { id: "f-fridge", kind: "fridge", label: "Refrig.", roomId: "r-kitchen", x: bx2 - 900, y: row1 - 850, widthMm: 700, depthMm: 700, rotationDeg: 0 },
      { id: "f-din", kind: "dining_table", label: "6-Seat Dining", roomId: "r-kitchen", x: col1 + 650, y: row1 - 1500, widthMm: 1600, depthMm: 900, rotationDeg: 0 },
      { id: "f-bed1", kind: "bed_double", label: "Bed 1", roomId: "r-bed1", x: col1 + 350, y: row1 + 350, widthMm: 1550, depthMm: 1950, rotationDeg: 0 },
      { id: "f-wc1", kind: "wc", label: "WC", roomId: "r-bath1", x: col2 + 250, y: row2 - 800, widthMm: 450, depthMm: 650, rotationDeg: 0 },
      { id: "f-wb1", kind: "washbasin", label: "Basin", roomId: "r-bath1", x: bx2 - 680, y: row1 + 280, widthMm: 500, depthMm: 420, rotationDeg: 0 },
      { id: "f-sh1", kind: "shower", label: "Shower", roomId: "r-bath1", x: bx2 - 920, y: row2 - 920, widthMm: 780, depthMm: 780, rotationDeg: 0 },
      { id: "f-bed2", kind: "bed_double", label: "King Bed", roomId: "r-bed2", x: bx1 + 450, y: row2 + 400, widthMm: 1850, depthMm: 2050, rotationDeg: 0 },
      { id: "f-ward2", kind: "wardrobe", label: "Wardrobe", roomId: "r-bed2", x: col1 - 800, y: row2 + 350, widthMm: 600, depthMm: 1700, rotationDeg: 0 },
      { id: "f-bed3", kind: archetype.includes("2bhk") ? "study_desk" : "bed_double", label: archetype.includes("2bhk") ? "Study Desk" : "Bed 3", roomId: "r-bed3", x: col1 + 350, y: row2 + 450, widthMm: 1500, depthMm: 1800, rotationDeg: 0 },
      { id: "f-wc2", kind: "wc", label: "WC", roomId: "r-bath2", x: col2 + 250, y: by2 - 800, widthMm: 450, depthMm: 650, rotationDeg: 0 },
      { id: "f-wb2", kind: "washbasin", label: "Basin", roomId: "r-bath2", x: bx2 - 680, y: row2 + 280, widthMm: 500, depthMm: 420, rotationDeg: 0 },
      { id: "f-sh2", kind: "shower", label: "Shower", roomId: "r-bath2", x: bx2 - 920, y: by2 - 920, widthMm: 780, depthMm: 780, rotationDeg: 0 }
    );

    if (hasStaircase || floors > 1) {
      furniture.push({
        id: "f-stair",
        kind: "stair_flight",
        label: "RC Dog-Leg Stair",
        roomId: "r-center",
        x: bx1 + 350,
        y: row1 + 350,
        widthMm: 2200,
        depthMm: 1900,
        rotationDeg: 0,
      });
    }

    if (setbacks.front >= 2400) {
      furniture.push({
        id: "f-car",
        kind: "car_bay",
        label: "Parking Bay",
        roomId: "r-living",
        x: bx2 - 2600,
        y: 250,
        widthMm: 2400,
        depthMm: 2000,
        rotationDeg: 0,
      });
    }
  }

  // MEP Nodes coordinated to rooms
  mepNodes.push(
    { id: "mep-db", discipline: "electrical", kind: "DB", label: "Main DB (8-Way)", x: bx1 + 350, y: by1 + 350, spec: "3-Phase 415V / 40A RCCB" },
    { id: "mep-l1", discipline: "electrical", kind: "Light", label: "CL-1", x: bx1 + bw * 0.25, y: by1 + bd * 0.2, spec: "18W LED Ceiling Panel" },
    { id: "mep-l2", discipline: "electrical", kind: "Light", label: "CL-2", x: bx1 + bw * 0.72, y: by1 + bd * 0.2, spec: "18W LED Task" },
    { id: "mep-s1", discipline: "electrical", kind: "Socket", label: "16A Power", x: bx2 - 400, y: by1 + 500, spec: "Kitchen Appliance 16A" },
    { id: "mep-p1", discipline: "plumbing", kind: "Stack", label: "Soil & Waste Stack", x: bx2 - 280, y: by2 - 400, spec: "110mm UPVC SWR" },
    { id: "mep-p2", discipline: "plumbing", kind: "Supply", label: "Cold/Hot Riser", x: bx2 - 350, y: by1 + 450, spec: "25mm CPVC" },
    { id: "mep-h1", discipline: "hvac", kind: "Split AC", label: "IDU-1 (1.5 TR)", x: bx1 + 400, y: by2 - 500, spec: "Inverter Split 1.5 TR" }
  );

  return {
    plotWidthMm: plotW,
    plotDepthMm: plotD,
    setbacksMm: setbacks,
    walls,
    openings,
    rooms,
    furniture,
    mepNodes,
    hasStaircase,
    floors,
    scaleLabel: "1:100 @ A3",
  };
}

export const RESIDENTIAL_PROJECTS: ResidentialProject[] = (() => {
  const list: ResidentialProject[] = [];
  let num = 1;
  const roadSides: ResidentialProject["roadSide"][] = ["East", "North", "South", "West", "North & East Corner"];

  for (const batch of RESIDENTIAL_BATCHES) {
    batch.titles.forEach((title, idx) => {
      const id = `HOUSE-${String(num).padStart(3, "0")}`;
      const archetype = pickArchetype(batch.batchIndex, idx, title);
      const hasStaircase =
        batch.batchIndex === 5 ||
        title.toLowerCase().includes("duplex") ||
        title.toLowerCase().includes("villa") ||
        num === 80;
      const floors = title.toLowerCase().includes("g+2") ? 3 : hasStaircase ? 2 : 1;
      const roadSide = title.toLowerCase().includes("east")
        ? "East"
        : title.toLowerCase().includes("north")
          ? "North"
          : title.toLowerCase().includes("west")
            ? "West"
            : title.toLowerCase().includes("south")
              ? "South"
              : title.toLowerCase().includes("corner")
                ? "North & East Corner"
                : roadSides[(num - 1) % roadSides.length];

      const northAngleDeg = roadSide === "North" ? 0 : roadSide === "East" ? 270 : roadSide === "South" ? 180 : 90;
      const plan = buildPlanGeometry(archetype, num, hasStaircase, floors);

      const climate =
        batch.batchIndex === 7
          ? "Warm-Humid Tropical Coastal (Tamil Nadu benchmark)"
          : "Moderate Composite Climate (Illustrative)";

      list.push({
        id,
        number: num,
        batchIndex: batch.batchIndex,
        batchTitle: batch.batchTitle,
        title,
        category: batch.batchTitle,
        level: batch.level,
        roadSide,
        northAngleDeg,
        climateAssumption: climate,
        prevailingWindDeg: batch.batchIndex === 7 ? 145 : 225,
        windDisclaimer:
          "Illustrative seasonal wind direction assumption. Local meteorological wind-rose data should be checked before final construction.",
        vastuApplicable: batch.batchIndex >= 2 || title.toLowerCase().includes("vastu"),
        brief: `Design a functionally coordinated ${title} (${id}) on a ${(plan.plotWidthMm / 1000).toFixed(1)}m × ${(plan.plotDepthMm / 1000).toFixed(1)}m plot facing ${roadSide} road with compliant setbacks, aligned 230mm/115mm wall geometry, scaled furniture, and daylight/cross-ventilation openings.`,
        siteCondition: `${roadSide} road frontage; setbacks F:${plan.setbacksMm.front}mm, R:${plan.setbacksMm.rear}mm, L:${plan.setbacksMm.left}mm, R:${plan.setbacksMm.right}mm; flat graded benchmark ±0.00m.`,
        requiredRooms: plan.rooms.map((r) => r.name),
        constraints: [
          "External walls 230mm masonry; internal partitions 115mm (editable per structural specification).",
          "All doors must cut cleanly into host walls with unobstructed 90° swing arc.",
          "Minimum 10% window-to-floor glazing ratio for habitable rooms where exterior wall permits.",
          "Coordinate kitchen work triangle (sink–hob–fridge) and separate wet/dry bathroom zones.",
        ],
        designExplanation: `This ${batch.level.toLowerCase()} layout places public living zones near the ${roadSide} approach while buffering private bedrooms toward quieter setbacks. External 230mm walls provide thermal mass and weatherproofing while 115mm internal partitions optimize usable carpet area.`,
        wallStandardNote:
          "230mm brick/block external wall and 115mm internal partition are illustrative starting standards. Final thickness depends on structural framing (RCC vs load-bearing), AAC/CSEB material selection, acoustic rating, and local building codes.",
        assessmentQuestion: {
          prompt: `In ${title} (${id}), which coordination detail is most critical before finalizing the 2D floor plan?`,
          options: [
            "Checking door swing clearances against bed/wardrobe zones and aligning wet plumbing walls",
            "Drawing windows floating on top of solid wall lines without cutting wall openings",
            "Using identical 230mm thickness for every closet shelf",
            "Treating conceptual wind arrows as verified CFD airflow measurements",
          ],
          correctIndex: 0,
          explanation:
            "Accurate architectural CAD aligns door/window openings inside real wall geometry, prevents door-to-furniture collisions, and clusters wet shafts.",
        },
        referencePlan: plan,
      });
      num++;
    });
  }

  return list;
})();

export { RESIDENTIAL_BATCHES };
