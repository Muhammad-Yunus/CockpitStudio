import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Triangle,
  Settings,
  Sun,
  Box,
  Camera,
  Magnet,
  Hash,
  MapPin,
  Link2,
} from 'lucide-react';
import { PRIMITIVE_MENU_ITEMS } from '../data/defaultStudioState';
import type {
  AttributesState,
  CameraPreset3D,
  LightingPreset3D,
  MeshTransform3D,
  TransformMode3D,
} from '../types/studio';

interface Viewport3DProps {
  addedPrimitives: Array<{ id: string; kind: (typeof PRIMITIVE_MENU_ITEMS)[number] }>;
  onAddPrimitive: (kind: (typeof PRIMITIVE_MENU_ITEMS)[number]) => void;
  attributes: AttributesState;
  onSelectMesh: (name: string, transform: MeshTransform3D) => void;
  onMeshTransformChange: (transform: MeshTransform3D) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  addedPrimitives,
  onAddPrimitive,
  attributes,
  onSelectMesh,
  onMeshTransformChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showPrimitivesPopup, setShowPrimitivesPopup] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [snapActive, setSnapActive] = useState(false);
  const [transformMode, setTransformMode] = useState<TransformMode3D>('translate');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset3D>('perspective');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset3D>('studio');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const selectedMeshRef = useRef<THREE.Object3D | null>(null);
  const redSurfaceMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const onSelectMeshRef = useRef(onSelectMesh);
  const onMeshTransformRef = useRef(onMeshTransformChange);

  useEffect(() => {
    onSelectMeshRef.current = onSelectMesh;
    onMeshTransformRef.current = onMeshTransformChange;
  }, [onSelectMesh, onMeshTransformChange]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 420);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181a1f);
    scene.fog = new THREE.Fog(0x181a1f, 14, 34);
    sceneRef.current = scene;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 640) / (container.clientHeight || 420),
      0.1,
      100
    );
    camera.position.set(4.1, 3.2, 5.2);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 1.0, 0);
    orbitRef.current = controls;

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setSize(0.75);
    const gizmoHelper = transformControls.getHelper();
    scene.add(gizmoHelper);
    transformRef.current = transformControls;

    // Lights
    const keyLight = new THREE.DirectionalLight(0xfff4ea, 2.0);
    keyLight.position.set(5, 8, 6);
    keyLightRef.current = keyLight;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xc7d2fe, 0x181a1f, 0.8);
    hemiLightRef.current = hemiLight;
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    rimLight.position.set(-5, 3, -5);
    rimLightRef.current = rimLight;
    scene.add(rimLight);

    // Perspective grid + Red X & Blue Z axes
    const grid = new THREE.GridHelper(16, 24, 0x2f3542, 0x252a34);
    gridRef.current = grid;
    scene.add(grid);

    const axes = new THREE.AxesHelper(2.5);
    axes.visible = false;
    axesRef.current = axes;
    scene.add(axes);

    const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, 0.005, 0),
      new THREE.Vector3(8, 0.005, 0),
    ]);
    const xAxis = new THREE.Line(xAxisGeo, new THREE.LineBasicMaterial({ color: 0xb91c1c }));
    scene.add(xAxis);

    const zAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.005, -8),
      new THREE.Vector3(0, 0.005, 8),
    ]);
    const zAxis = new THREE.Line(zAxisGeo, new THREE.LineBasicMaterial({ color: 0x0284c7 }));
    scene.add(zAxis);

    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.8, 2.8, 0.01));
    const cyanFrame = new THREE.LineSegments(
      frameGeo,
      new THREE.LineBasicMaterial({ color: 0x14b8a6 })
    );
    cyanFrame.position.set(0, 1.4, -0.35);
    cyanFrame.rotation.y = -0.22;
    scene.add(cyanFrame);

    const heroGroup = new THREE.Group();

    const redShape = new THREE.Shape();
    redShape.absarc(0, 0, 1.75, 0, Math.PI * 0.65, false);
    redShape.lineTo(0, 0);
    const redGeo = new THREE.ExtrudeGeometry(redShape, {
      depth: 0.04,
      bevelEnabled: false,
      curveSegments: 48,
    });
    const redMat = new THREE.MeshPhysicalMaterial({
      color: 0xd91414,
      roughness: 0.32,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    redSurfaceMatRef.current = redMat;
    const redMesh = new THREE.Mesh(redGeo, redMat);
    redMesh.name = 'Dome Red Arc';
    redMesh.position.set(-0.35, 0.1, 0.45);
    redMesh.rotation.y = 0.45;
    redMesh.rotation.x = -0.18;

    const grayShape = new THREE.Shape();
    grayShape.absarc(0, 0, 1.75, 0, Math.PI * 0.62, false);
    grayShape.lineTo(0, 0);
    const grayGeo = new THREE.ExtrudeGeometry(grayShape, {
      depth: 0.04,
      bevelEnabled: false,
      curveSegments: 48,
    });
    const grayMat = new THREE.MeshPhysicalMaterial({
      color: 0x9fa3ab,
      roughness: 0.42,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const grayMesh = new THREE.Mesh(grayGeo, grayMat);
    grayMesh.name = 'Dome Gray Arc';
    grayMesh.position.set(0.35, 0.72, -0.45);
    grayMesh.rotation.y = -0.35;
    grayMesh.rotation.x = 0.08;

    heroGroup.add(redMesh, grayMesh);
    scene.add(heroGroup);

    const dynamicGroup = new THREE.Group();
    dynamicGroupRef.current = dynamicGroup;
    scene.add(dynamicGroup);

    const extractTransform = (obj: THREE.Object3D): MeshTransform3D => ({
      name: obj.name || '3D Primitive',
      x: Math.round(obj.position.x * 100) / 100,
      y: Math.round(obj.position.y * 100) / 100,
      z: Math.round(obj.position.z * 100) / 100,
      rotX: Math.round(THREE.MathUtils.radToDeg(obj.rotation.x)),
      rotY: Math.round(THREE.MathUtils.radToDeg(obj.rotation.y)),
      rotZ: Math.round(THREE.MathUtils.radToDeg(obj.rotation.z)),
      scaleX: Math.round(obj.scale.x * 100),
      scaleY: Math.round(obj.scale.y * 100),
      scaleZ: Math.round(obj.scale.z * 100),
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      if (transformControls.dragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([heroGroup, dynamicGroup], true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        selectedMeshRef.current = hitObj;
        transformControls.attach(hitObj);
        onSelectMeshRef.current(hitObj.name || '3D Primitive', extractTransform(hitObj));
        requestRender();
      } else {
        selectedMeshRef.current = null;
        transformControls.detach();
        requestRender();
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onTransformDragging = (event: { value: unknown }) => {
      controls.enabled = !event.value;
    };
    const onTransformChange = () => {
      if (selectedMeshRef.current) {
        onMeshTransformRef.current(extractTransform(selectedMeshRef.current));
      }
      requestRender();
    };
    transformControls.addEventListener('dragging-changed', onTransformDragging);
    transformControls.addEventListener('change', onTransformChange);

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }
    requestRenderRef.current = requestRender;

    controls.addEventListener('change', requestRender);
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    const resizeObserver = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      transformControls.removeEventListener('dragging-changed', onTransformDragging);
      transformControls.removeEventListener('change', onTransformChange);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      transformControls.dispose();
      controls.dispose();
      envTex.dispose();
      xAxisGeo.dispose();
      zAxisGeo.dispose();
      frameGeo.dispose();
      redGeo.dispose();
      grayGeo.dispose();
      redMat.dispose();
      grayMat.dispose();
      renderer.dispose();
    };
  }, []);

  // Sync Material Editor changes
  useEffect(() => {
    if (redSurfaceMatRef.current) {
      redSurfaceMatRef.current.color.set(attributes.materialColor);
      redSurfaceMatRef.current.metalness = attributes.materialMetalness;
      redSurfaceMatRef.current.roughness = attributes.materialRoughness;
      requestRenderRef.current();
    }
  }, [attributes.materialColor, attributes.materialMetalness, attributes.materialRoughness]);

  // Sync Grid, Axes, TransformControls mode & Snap
  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showGrid;
    if (axesRef.current) axesRef.current.visible = showAxes;
    if (transformRef.current) {
      if (transformMode === 'off') {
        transformRef.current.detach();
      } else {
        transformRef.current.setMode(transformMode);
        if (selectedMeshRef.current) {
          transformRef.current.attach(selectedMeshRef.current);
        }
      }
      transformRef.current.setTranslationSnap(snapActive ? 0.25 : null);
      transformRef.current.setRotationSnap(snapActive ? THREE.MathUtils.degToRad(15) : null);
    }
    requestRenderRef.current();
  }, [showGrid, showAxes, transformMode, snapActive]);

  // Sync Lighting Preset
  useEffect(() => {
    const scene = sceneRef.current;
    const key = keyLightRef.current;
    const rim = rimLightRef.current;
    const hemi = hemiLightRef.current;
    if (!scene || !key || !rim || !hemi) return;

    if (lightingPreset === 'studio') {
      scene.background = new THREE.Color(0x181a1f);
      key.intensity = 2.0;
      rim.intensity = 1.0;
      hemi.intensity = 0.8;
    } else if (lightingPreset === 'contrast') {
      scene.background = new THREE.Color(0x101216);
      key.intensity = 3.1;
      rim.intensity = 2.0;
      hemi.intensity = 0.35;
    } else {
      scene.background = new THREE.Color(0x0b0e14);
      key.intensity = 1.1;
      rim.intensity = 2.4;
      hemi.intensity = 0.45;
    }
    requestRenderRef.current();
  }, [lightingPreset]);

  // Render dynamically added primitives and auto-attach TransformControls to newest primitive
  useEffect(() => {
    const group = dynamicGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      child.geometry?.dispose();
      if (child.material instanceof THREE.Material) child.material.dispose();
      group.remove(child);
    }

    let lastMesh: THREE.Mesh | null = null;
    addedPrimitives.forEach((item, index) => {
      let geo: THREE.BufferGeometry;
      switch (item.kind) {
        case 'Cube':
          geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
          break;
        case 'Cylinder':
          geo = new THREE.CylinderGeometry(0.38, 0.38, 0.9, 28);
          break;
        case 'Dome':
          geo = new THREE.SphereGeometry(0.5, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2);
          break;
        case 'Plane':
          geo = new THREE.PlaneGeometry(1.1, 1.1);
          break;
        case 'Sphere':
          geo = new THREE.SphereGeometry(0.45, 28, 28);
          break;
        case 'Spring':
          geo = new THREE.TorusKnotGeometry(0.32, 0.08, 64, 12, 2, 3);
          break;
        case 'Torus':
        default:
          geo = new THREE.TorusGeometry(0.38, 0.14, 16, 40);
          break;
      }

      const mat = new THREE.MeshStandardMaterial({
        color: 0x24b0ff,
        metalness: 0.35,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `${item.kind} ${index + 1}`;
      const angle = index * 0.9;
      mesh.position.set(Math.cos(angle) * 1.9, 0.65, Math.sin(angle) * 1.6);
      group.add(mesh);
      lastMesh = mesh;
    });

    if (lastMesh && transformRef.current && transformMode !== 'off') {
      selectedMeshRef.current = lastMesh;
      transformRef.current.attach(lastMesh);
    }
    requestRenderRef.current();
  }, [addedPrimitives, transformMode]);

  const cycleCameraPreset = () => {
    const order: CameraPreset3D[] = ['perspective', 'top', 'front', 'side'];
    const next = order[(order.indexOf(cameraPreset) + 1) % order.length];
    setCameraPreset(next);
    const cam = cameraRef.current;
    const ctrl = orbitRef.current;
    if (!cam || !ctrl) return;
    ctrl.target.set(0, 1.0, 0);
    if (next === 'perspective') cam.position.set(4.1, 3.2, 5.2);
    else if (next === 'top') cam.position.set(0, 7.5, 0.01);
    else if (next === 'front') cam.position.set(0, 1.4, 6.4);
    else cam.position.set(6.4, 1.6, 0);
    ctrl.update();
    requestRenderRef.current();
  };

  const cycleLightingPreset = () => {
    const order: LightingPreset3D[] = ['studio', 'contrast', 'night'];
    setLightingPreset(order[(order.indexOf(lightingPreset) + 1) % order.length]);
  };

  const cycleTransformMode = () => {
    const order: TransformMode3D[] = ['translate', 'rotate', 'scale', 'off'];
    setTransformMode(order[(order.indexOf(transformMode) + 1) % order.length]);
  };

  const resetOrbitCenter = () => {
    if (orbitRef.current && cameraRef.current) {
      orbitRef.current.target.set(0, 1.0, 0);
      cameraRef.current.position.set(4.1, 3.2, 5.2);
      orbitRef.current.update();
      requestRenderRef.current();
    }
  };

  return (
    <div className="relative flex-1 bg-[#181A1F] overflow-hidden select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Subtle Mode Telemetry Readout (Top-Left) */}
      <div className="absolute top-2.5 left-3 z-10 flex items-center gap-3 text-[10px] font-mono-code text-[#8E95A2] pointer-events-none">
        <span>Cam: {cameraPreset}</span>
        <span>Light: {lightingPreset}</span>
        <span>Gizmo: {transformMode}</span>
      </div>

      {/* Floating Primitives Popup */}
      {showPrimitivesPopup && (
        <div className="absolute bottom-[54px] left-[36%] z-20 w-[132px] bg-[#1C1F26]/95 border border-[#2C313D] rounded-[3px] shadow-2xl py-1">
          {PRIMITIVE_MENU_ITEMS.map((prim) => (
            <button
              key={prim}
              type="button"
              onClick={() => onAddPrimitive(prim)}
              className="w-full px-3 py-1.5 text-left text-[11px] text-[#C2C7D0] hover:bg-[#2A2E39] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Box className="w-3 h-3 text-[#8E95A2]" />
              <span>{prim}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom 9-Icon Floating Viewport Dock (ALL 9 buttons wired) */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 bg-[#1B1E25]/95 border border-[#2C313D] rounded-[4px] px-2.5 py-1.5 flex items-center gap-2 shadow-xl">
        <button
          type="button"
          onClick={() => setShowPrimitivesPopup((v) => !v)}
          className={`p-1 rounded-[2px] cursor-pointer transition-colors ${
            showPrimitivesPopup ? 'text-white bg-[#282C37]' : 'text-[#8E95A2] hover:text-white'
          }`}
          title="Primitives Creator"
        >
          <Triangle className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setShowGrid((g) => !g)}
          className={`p-1 rounded-[2px] cursor-pointer transition-colors ${
            showGrid ? 'text-[#24B0FF]' : 'text-[#8E95A2] hover:text-white'
          }`}
          title="Toggle 3D Viewport Grid"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={cycleLightingPreset}
          className="p-1 rounded-[2px] text-[#F59E0B] hover:text-white cursor-pointer"
          title={`Cycle Lighting (${lightingPreset})`}
        >
          <Sun className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onAddPrimitive('Cube')}
          className="p-1 rounded-[2px] text-[#8E95A2] hover:text-white cursor-pointer"
          title="Quick Add Cube"
        >
          <Box className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={cycleCameraPreset}
          className="p-1 rounded-[2px] text-[#8E95A2] hover:text-white cursor-pointer"
          title={`Cycle Camera Preset (${cameraPreset})`}
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-4 bg-[#2C313D]" />
        <button
          type="button"
          onClick={() => setSnapActive((s) => !s)}
          className={`p-1 rounded-[2px] cursor-pointer ${
            snapActive ? 'text-[#10B981]' : 'text-[#8E95A2] hover:text-white'
          }`}
          title="Toggle 0.25u / 15° Transform Snap"
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setShowAxes((a) => !a)}
          className={`p-1 rounded-[2px] cursor-pointer ${
            showAxes ? 'text-[#24B0FF]' : 'text-[#8E95A2] hover:text-white'
          }`}
          title="Toggle 3D Origin Axes Helper"
        >
          <Hash className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={resetOrbitCenter}
          className="p-1 rounded-[2px] text-[#8E95A2] hover:text-white cursor-pointer"
          title="Reset Camera & Center Origin"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={cycleTransformMode}
          className={`p-1 rounded-[2px] cursor-pointer ${
            transformMode !== 'off' ? 'text-[#10B981]' : 'text-[#8E95A2] hover:text-white'
          }`}
          title={`Cycle Gizmo Mode (${transformMode})`}
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
