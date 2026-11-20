import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import type { ResidentialProject } from "../core/types";

export type SceneMode3D = "residential" | "landscape" | "mechanical";
export type FinishPreset = "aluminum" | "brass" | "polymer";

interface Workspace3DProps {
  initialMode?: SceneMode3D;
  residentialProject?: ResidentialProject;
}

const _vec3 = new THREE.Vector3();

export const Workspace3D: React.FC<Workspace3DProps> = ({
  initialMode = "residential",
  residentialProject,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [sceneMode, setSceneMode] = useState<SceneMode3D>(initialMode);
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [sunHour, setSunHour] = useState<number>(10);
  const [finishPreset, setFinishPreset] = useState<FinishPreset>("aluminum");
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const stateRef = useRef({
    sceneMode,
    explodeFactor,
    sunHour,
    finishPreset,
  });
  stateRef.current = { sceneMode, explodeFactor, sunHour, finishPreset };

  const rebuildSceneRef = useRef<(() => void) | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement("canvas").getContext("webgl2");
      if (!probe) return true;
      const ext = probe.getExtension("WEBGL_debug_renderer_info");
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension("WEBGL_lose_context")?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglError("WebGL context could not be initialized in this browser environment.");
      return;
    }

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const handleContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglError("3D graphics context paused. Reload or reset camera to restore.");
    };
    const handleContextRestored = () => {
      setWebglError(null);
      requestRenderRef.current?.();
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored);

    const scene = new THREE.Scene();
    const bgHex = 0xeff3f8;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.012);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 180);
    camera.position.set(13, 10, 14);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 4;
    controls.maxDistance = 45;
    controls.target.set(0, 1.2, 0);

    // 3-Point Studio & Daylight Rig
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x78716c, 0.72);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.55);
    keyLight.position.set(14, 18, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.left = -14;
    keyLight.shadow.camera.right = 14;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbfdbfe, 0.45);
    rimLight.position.set(-10, 8, -12);
    scene.add(rimLight);

    // Ground Grid & Base Plane
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.92, metalness: 0.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(32, 32, 0x94a3b8, 0xcbd5e1);
    grid.position.y = 0.015;
    scene.add(grid);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const disposables: { dispose: () => void }[] = [];
    const explodeTargets: { obj: THREE.Object3D; baseY: number; offsetY: number }[] = [];

    function clearModel() {
      explodeTargets.length = 0;
      while (modelGroup.children.length > 0) {
        modelGroup.remove(modelGroup.children[0]);
      }
      while (disposables.length > 0) {
        disposables.pop()?.dispose();
      }
    }

    function buildResidentialScene() {
      clearModel();
      const scale = 0.001; // mm -> meters
      const plan = residentialProject?.referencePlan;
      const plotW = (plan?.plotWidthMm ?? 10000) * scale;
      const plotD = (plan?.plotDepthMm ?? 13000) * scale;
      const cx = plotW / 2;
      const cz = plotD / 2;

      // Plinth + Site Pad
      const sitePadGeo = new THREE.BoxGeometry(plotW, 0.16, plotD);
      const sitePadMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85, metalness: 0.02 });
      const sitePad = new THREE.Mesh(sitePadGeo, sitePadMat);
      sitePad.position.set(0, 0.08, 0);
      sitePad.receiveShadow = true;
      modelGroup.add(sitePad);
      disposables.push(sitePadGeo, sitePadMat);

      const wallMatExt = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.78, metalness: 0.02 });
      const wallMatInt = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72, metalness: 0.02 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.55, metalness: 0.05 });
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x7dd3fc,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: isSoftwareGl ? 0.45 : 0.6,
      });
      disposables.push(wallMatExt, wallMatInt, woodMat, glassMat);

      const walls = plan?.walls ?? [];
      for (const w of walls) {
        const dx = (w.x2 - w.x1) * scale;
        const dz = (w.y2 - w.y1) * scale;
        const len = Math.hypot(dx, dz);
        if (len < 0.05) continue;
        const thick = w.thicknessMm * scale;
        const wallH = 3.0;
        const geo = new THREE.BoxGeometry(len, wallH, thick);
        const mesh = new THREE.Mesh(geo, w.thicknessMm >= 200 ? wallMatExt : wallMatInt);
        mesh.position.set(((w.x1 + w.x2) / 2) * scale - cx, 0.16 + wallH / 2, ((w.y1 + w.y2) / 2) * scale - cz);
        mesh.rotation.y = -Math.atan2(dz, dx);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        modelGroup.add(mesh);
        disposables.push(geo);
      }

      // Doors & Windows visual frames
      for (const op of plan?.openings ?? []) {
        const host = walls.find((w) => w.id === op.wallId);
        if (!host) continue;
        const ox = (host.x1 + (host.x2 - host.x1) * op.offsetRatio) * scale - cx;
        const oz = (host.y1 + (host.y2 - host.y1) * op.offsetRatio) * scale - cz;
        const angle = -Math.atan2(host.y2 - host.y1, host.x2 - host.x1);
        const isDoor = op.kind.includes("door");
        const opH = op.heightMm * scale;
        const opW = op.widthMm * scale;
        const sill = op.sillMm * scale;
        const geo = new THREE.BoxGeometry(opW, opH, host.thicknessMm * scale + 0.04);
        const mesh = new THREE.Mesh(geo, isDoor ? woodMat : glassMat);
        mesh.position.set(ox, 0.16 + sill + opH / 2, oz);
        mesh.rotation.y = angle;
        modelGroup.add(mesh);
        disposables.push(geo);
      }

      // Roof Slab + Parapet (Explodable)
      const roofGroup = new THREE.Group();
      const bMinX = (plan?.setbacksMm.left ?? 1200) * scale - cx;
      const bMaxX = (plan?.plotWidthMm ?? 10000) * scale - (plan?.setbacksMm.right ?? 1200) * scale - cx;
      const bMinZ = (plan?.setbacksMm.front ?? 1800) * scale - cz;
      const bMaxZ = (plan?.plotDepthMm ?? 13000) * scale - (plan?.setbacksMm.rear ?? 1200) * scale - cz;
      const rw = Math.max(4, bMaxX - bMinX + 0.9);
      const rd = Math.max(4, bMaxZ - bMinZ + 0.9);

      const slabGeo = new THREE.BoxGeometry(rw, 0.16, rd);
      const slabMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65, metalness: 0.08 });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set((bMinX + bMaxX) / 2, 3.24, (bMinZ + bMaxZ) / 2);
      slab.castShadow = true;
      roofGroup.add(slab);

      const parapetGeo = new THREE.BoxGeometry(rw - 0.5, 0.45, rd - 0.5);
      const parapetMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.72, metalness: 0.05 });
      const parapet = new THREE.Mesh(parapetGeo, parapetMat);
      parapet.position.set((bMinX + bMaxX) / 2, 3.55, (bMinZ + bMaxZ) / 2);
      roofGroup.add(parapet);

      modelGroup.add(roofGroup);
      explodeTargets.push({ obj: roofGroup, baseY: 0, offsetY: 3.4 });
      disposables.push(slabGeo, slabMat, parapetGeo, parapetMat);
    }

    function buildLandscapeScene() {
      clearModel();
      // Terraced site base + limestone patio + water basin + pergola + composite trees
      const baseGeo = new THREE.BoxGeometry(14, 0.25, 16);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.9, metalness: 0 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(0, 0.125, 0);
      base.receiveShadow = true;
      modelGroup.add(base);

      const patioGeo = new THREE.BoxGeometry(6.5, 0.12, 4.5);
      const patioMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.65, metalness: 0.02 });
      const patio = new THREE.Mesh(patioGeo, patioMat);
      patio.position.set(-1.5, 0.31, -2);
      patio.receiveShadow = true;
      modelGroup.add(patio);

      const waterGeo = new THREE.BoxGeometry(3.4, 0.1, 3.2);
      const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x0ea5e9, roughness: 0.08, metalness: 0.15, clearcoat: 1 });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.set(3.5, 0.3, -1.8);
      modelGroup.add(water);

      // Composite Timber Pergola
      const pergolaGroup = new THREE.Group();
      const timberMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6, metalness: 0.04 });
      const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.7, 12);
      const rafterGeo = new THREE.BoxGeometry(5.6, 0.12, 0.08);
      [
        [-4.2, -3.8],
        [1.2, -3.8],
        [-4.2, -0.2],
        [1.2, -0.2],
      ].forEach(([px, pz]) => {
        const post = new THREE.Mesh(postGeo, timberMat);
        post.position.set(px, 1.65, pz);
        post.castShadow = true;
        pergolaGroup.add(post);
      });
      for (let i = 0; i < 8; i++) {
        const rafter = new THREE.Mesh(rafterGeo, timberMat);
        rafter.position.set(-1.5, 3.05, -3.7 + i * 0.5);
        rafter.castShadow = true;
        pergolaGroup.add(rafter);
      }
      modelGroup.add(pergolaGroup);
      explodeTargets.push({ obj: pergolaGroup, baseY: 0, offsetY: 2.0 });

      // Composite Trees (Trunk + 3 foliage tiers)
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.88 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
      const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 2.1, 10);
      const crownGeo = new THREE.DodecahedronGeometry(1.1, 1);
      [
        [4.5, 3.8],
        [-4.6, 4.2],
        [4.8, -5.2],
      ].forEach(([tx, tz], idx) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.2;
        trunk.castShadow = true;
        tree.add(trunk);

        const c1 = new THREE.Mesh(crownGeo, leafMat);
        c1.position.set(0, 2.7, 0);
        c1.scale.set(1.1, 0.85, 1.1);
        c1.castShadow = true;
        tree.add(c1);

        const c2 = new THREE.Mesh(crownGeo, leafMat);
        c2.position.set(0.55, 2.3, 0.35);
        c2.scale.set(0.7, 0.65, 0.7);
        tree.add(c2);

        tree.position.set(tx, 0, tz);
        tree.rotation.y = idx * 1.1;
        modelGroup.add(tree);
      });

      disposables.push(baseGeo, baseMat, patioGeo, patioMat, waterGeo, waterMat, timberMat, postGeo, rafterGeo, trunkMat, leafMat, trunkGeo, crownGeo);
    }

    function buildMechanicalScene() {
      clearModel();
      const finish = stateRef.current.finishPreset;
      const bodyColor = finish === "aluminum" ? 0xcbd5e1 : finish === "brass" ? 0xd97706 : 0x334155;
      const metalness = finish === "polymer" ? 0.08 : 0.88;
      const roughness = finish === "polymer" ? 0.55 : 0.22;

      const housingMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness, roughness });
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.92, roughness: 0.18 });
      const darkBoltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.32 });

      // 1. Lower Housing Ring
      const baseGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.8, 32);
      const baseMesh = new THREE.Mesh(baseGeo, housingMat);
      baseMesh.position.y = 0.5;
      baseMesh.castShadow = true;
      modelGroup.add(baseMesh);

      // 2. Sun Gear + Teeth Group
      const sunGroup = new THREE.Group();
      const sunBodyGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.7, 24);
      const sunBody = new THREE.Mesh(sunBodyGeo, steelMat);
      sunGroup.add(sunBody);
      const toothGeo = new THREE.BoxGeometry(0.18, 0.68, 0.24);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const tooth = new THREE.Mesh(toothGeo, steelMat);
        tooth.position.set(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0);
        tooth.rotation.y = -a;
        sunGroup.add(tooth);
      }
      sunGroup.position.y = 1.25;
      modelGroup.add(sunGroup);
      explodeTargets.push({ obj: sunGroup, baseY: 1.25, offsetY: 1.6 });

      // 3. 3 Planet Gears
      const planetGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.66, 20);
      for (let p = 0; p < 3; p++) {
        const a = (p / 3) * Math.PI * 2;
        const planet = new THREE.Mesh(planetGeo, housingMat);
        planet.position.set(Math.cos(a) * 1.85, 1.25, Math.sin(a) * 1.85);
        planet.castShadow = true;
        modelGroup.add(planet);
        explodeTargets.push({ obj: planet, baseY: 1.25, offsetY: 2.3 });
      }

      // 4. Input Output Shaft
      const shaftGeo = new THREE.CylinderGeometry(0.36, 0.36, 4.2, 20);
      const shaft = new THREE.Mesh(shaftGeo, steelMat);
      shaft.position.y = 2.1;
      modelGroup.add(shaft);
      explodeTargets.push({ obj: shaft, baseY: 2.1, offsetY: 2.9 });

      // 5. Top Cover Plate + 6 M6 Fasteners
      const coverGroup = new THREE.Group();
      const coverGeo = new THREE.CylinderGeometry(3.15, 3.15, 0.35, 32);
      const cover = new THREE.Mesh(coverGeo, housingMat);
      coverGroup.add(cover);
      const boltGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 6);
      for (let b = 0; b < 6; b++) {
        const a = (b / 6) * Math.PI * 2;
        const bolt = new THREE.Mesh(boltGeo, darkBoltMat);
        bolt.position.set(Math.cos(a) * 2.65, 0.25, Math.sin(a) * 2.65);
        coverGroup.add(bolt);
      }
      coverGroup.position.y = 1.95;
      modelGroup.add(coverGroup);
      explodeTargets.push({ obj: coverGroup, baseY: 1.95, offsetY: 3.6 });

      disposables.push(housingMat, steelMat, darkBoltMat, baseGeo, sunBodyGeo, toothGeo, planetGeo, shaftGeo, coverGeo, boltGeo);
    }

    function rebuildCurrentScene() {
      const m = stateRef.current.sceneMode;
      if (m === "residential") buildResidentialScene();
      else if (m === "landscape") buildLandscapeScene();
      else buildMechanicalScene();
    }
    rebuildSceneRef.current = rebuildCurrentScene;
    rebuildCurrentScene();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function applyDynamicParams() {
      const exp = stateRef.current.explodeFactor / 100;
      for (const item of explodeTargets) {
        item.obj.position.y = item.baseY + item.offsetY * exp;
      }
      // Sun position from sunHour (6..18)
      const h = stateRef.current.sunHour;
      const sunAngle = ((h - 6) / 12) * Math.PI;
      _vec3.set(Math.cos(sunAngle) * 18, Math.max(4, Math.sin(sunAngle) * 20), 10);
      keyLight.position.copy(_vec3);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        applyDynamicParams();
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }
    requestRenderRef.current = requestRender;

    resetCameraRef.current = () => {
      camera.position.set(13, 10, 14);
      controls.target.set(0, 1.2, 0);
      controls.update();
      requestRender();
    };

    controls.addEventListener("change", requestRender);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener("resize", handleResize);

    requestRender();

    return () => {
      window.removeEventListener("resize", handleResize);
      controls.removeEventListener("change", requestRender);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      clearModel();
      groundGeo.dispose();
      groundMat.dispose();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    rebuildSceneRef.current?.();
    requestRenderRef.current?.();
  }, [sceneMode, finishPreset, residentialProject?.id]);

  useEffect(() => {
    requestRenderRef.current?.();
  }, [explodeFactor, sunHour]);

  return (
    <div className="relative w-full h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-slate-100" data-testid="workspace-3d-root">
      {/* Top-Left Minimal Spec Header */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 shadow-xs pointer-events-none">
        <span className="font-semibold">
          {sceneMode === "residential"
            ? residentialProject
              ? `${residentialProject.id} · ${residentialProject.title}`
              : "Residential Architectural Massing"
            : sceneMode === "landscape"
              ? "Landscape Terraced Site & Pergola"
              : "ID-003 Planetary Gear & Shaft Assembly"}
        </span>
        <span className="mx-2 text-slate-400">·</span>
        <span className="font-mono text-slate-500">Orbit: Drag · Zoom: Scroll</span>
      </div>

      {/* Isolated WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md border border-slate-200 rounded-lg bg-white p-5">
            <p className="font-semibold text-slate-900 mb-1">3D Viewport Unavailable</p>
            <p className="text-sm text-slate-600">{webglError}</p>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (No backdrop-blur over WebGL) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-4 z-10 w-[min(920px,94%)] transition-transform duration-200"
        style={{ transform: dockCollapsed ? "translate(-50%, calc(100% - 34px))" : "translate(-50%, 0)" }}
      >
        <div className="flex justify-center mb-1">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="px-3 py-1 text-xs font-medium bg-white border border-slate-300 rounded-t-md text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            {dockCollapsed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {dockCollapsed ? "Show 3D Controls" : "Hide Controls"}
          </button>
        </div>

        <div className="bg-white/95 border border-slate-200 rounded-lg p-3 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
            {(
              [
                ["residential", "Residential 3D"],
                ["landscape", "Landscape 3D"],
                ["mechanical", "Mechanical 3D"],
              ] as [SceneMode3D, string][]
            ).map(([mId, mLabel]) => (
              <button
                key={mId}
                type="button"
                onClick={() => setSceneMode(mId)}
                className={`px-3 py-1.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
                  sceneMode === mId ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {mLabel}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="whitespace-nowrap">Explode: {explodeFactor}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={explodeFactor}
              onChange={(e) => setExplodeFactor(Number(e.target.value))}
              className="w-28 accent-blue-700"
            />
          </label>

          {sceneMode !== "mechanical" ? (
            <label className="flex items-center gap-2 text-slate-700 font-medium">
              <span className="whitespace-nowrap">Sun: {sunHour}:00</span>
              <input
                type="range"
                min={6}
                max={18}
                step={1}
                value={sunHour}
                onChange={(e) => setSunHour(Number(e.target.value))}
                className="w-24 accent-amber-600"
              />
            </label>
          ) : (
            <div className="flex items-center gap-1">
              {(["aluminum", "brass", "polymer"] as FinishPreset[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFinishPreset(f)}
                  className={`px-2.5 py-1 rounded border capitalize ${
                    finishPreset === f
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => resetCameraRef.current?.()}
            className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset View
          </button>
        </div>
      </div>
    </div>
  );
};
