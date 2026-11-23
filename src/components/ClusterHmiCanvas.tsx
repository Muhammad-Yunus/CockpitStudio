import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Bluetooth,
  Signal,
  AlertTriangle,
  Leaf,
  Square,
  Triangle,
  PenTool,
  Magnet,
  Grid,
  Frame,
  MousePointer2,
  Type,
  Trash2,
} from 'lucide-react';
import type {
  AttributesState,
  BuiltInWidgetOverride,
  CanvasDrawTool,
  EasingConfig,
  HmiLayer,
  TelemetrySnapshot,
  TransitionTrack,
} from '../types/studio';

interface ClusterHmiCanvasProps {
  telemetry: TelemetrySnapshot;
  attributes: AttributesState;
  selectedNodeId: string;
  onSelectElement: (nodeId: string, name: string, type: string) => void;
  hmiLayers: HmiLayer[];
  onCreateLayer: (
    kind: HmiLayer['kind'],
    rect: { x: number; y: number; w: number; h: number }
  ) => void;
  onUpdateLayer: (layerId: string, patch: Partial<HmiLayer>) => void;
  onDeleteLayer: (layerId: string) => void;
  widgetOverrides: Record<string, BuiltInWidgetOverride>;
  onUpdateWidgetOverride: (widgetId: string, patch: Partial<BuiltInWidgetOverride>) => void;
  onChangeGear: (gear: TelemetrySnapshot['gear']) => void;
  activeDrawTool: CanvasDrawTool;
  onChangeDrawTool: (tool: CanvasDrawTool) => void;
  isSimulating: boolean;
  playheadMs: number;
  tracks: TransitionTrack[];
  easing: EasingConfig;
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

export const ClusterHmiCanvas: React.FC<ClusterHmiCanvasProps> = ({
  telemetry,
  attributes,
  selectedNodeId,
  onSelectElement,
  hmiLayers,
  onCreateLayer,
  onUpdateLayer,
  onDeleteLayer,
  widgetOverrides,
  onUpdateWidgetOverride,
  onChangeGear,
  activeDrawTool,
  onChangeDrawTool,
  isSimulating,
  playheadMs,
  tracks,
  easing,
}) => {
  const carMountRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const [showGuides, setShowGuides] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const simRef = useRef(isSimulating);
  const speedRef = useRef(telemetry.speedKmh);
  const startSimLoopRef = useRef<() => void>(() => {});

  // Interactive drag / resize / draw state
  const [dragState, setDragState] = useState<
    | {
        mode: 'move-layer';
        layerId: string;
        startX: number;
        startY: number;
        origX: number;
        origY: number;
      }
    | {
        mode: 'resize-layer';
        layerId: string;
        corner: 'nw' | 'ne' | 'sw' | 'se';
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        origW: number;
        origH: number;
      }
    | {
        mode: 'move-widget';
        widgetId: string;
        startX: number;
        startY: number;
        origDx: number;
        origDy: number;
      }
    | {
        mode: 'draw';
        startX: number;
        startY: number;
        currX: number;
        currY: number;
      }
    | null
  >(null);

  useEffect(() => {
    simRef.current = isSimulating;
    if (isSimulating) {
      startSimLoopRef.current();
    }
  }, [isSimulating]);

  useEffect(() => {
    speedRef.current = telemetry.speedKmh;
  }, [telemetry.speedKmh]);

  // Real Three.js 3D EV Car Visualization (composite multi-part THREE.Group)
  useEffect(() => {
    const container = carMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || 240, container.clientHeight || 160);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      34,
      (container.clientWidth || 240) / (container.clientHeight || 160),
      0.1,
      50
    );
    camera.position.set(0, 1.45, 3.85);
    camera.lookAt(0, 0.28, -0.5);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.2);
    keyLight.position.set(2.5, 4.5, 3.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.4);
    rimLight.position.set(-3, 2, -4);
    scene.add(rimLight);

    const fillLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.9);
    scene.add(fillLight);

    const carGroup = new THREE.Group();

    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: 0xe8edf5,
      metalness: 0.35,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0b1018,
      metalness: 0.75,
      roughness: 0.12,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x14171f,
      metalness: 0.1,
      roughness: 0.85,
    });
    const tailLightMat = new THREE.MeshStandardMaterial({
      color: 0xff2b2b,
      emissive: 0xef4444,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-0.68, 0.14);
    bodyShape.lineTo(0.68, 0.14);
    bodyShape.quadraticCurveTo(0.73, 0.35, 0.65, 0.56);
    bodyShape.lineTo(-0.65, 0.56);
    bodyShape.quadraticCurveTo(-0.73, 0.35, -0.68, 0.14);

    const lowerBodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 2.05,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 4,
    });
    lowerBodyGeo.center();
    const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyPaintMat);
    lowerBody.position.y = 0.36;
    carGroup.add(lowerBody);

    const cabinGeo = new THREE.BoxGeometry(1.06, 0.34, 1.24, 4, 2, 4);
    const pos = cabinGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > 0) {
        pos.setX(i, pos.getX(i) * 0.82);
        pos.setZ(i, z * 0.82);
      }
    }
    cabinGeo.computeVertexNormals();
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.69, -0.04);
    carGroup.add(cabin);

    const rearDeckGeo = new THREE.BoxGeometry(1.24, 0.12, 0.42);
    const rearDeck = new THREE.Mesh(rearDeckGeo, bodyPaintMat);
    rearDeck.position.set(0, 0.57, 0.82);
    carGroup.add(rearDeck);

    const tailBarGeo = new THREE.BoxGeometry(1.16, 0.045, 0.05);
    const tailBar = new THREE.Mesh(tailBarGeo, tailLightMat);
    tailBar.position.set(0, 0.49, 1.07);
    carGroup.add(tailBar);

    const mirrorGeo = new THREE.BoxGeometry(0.14, 0.06, 0.09);
    const mirrorL = new THREE.Mesh(mirrorGeo, bodyPaintMat);
    mirrorL.position.set(-0.75, 0.56, -0.32);
    const mirrorR = new THREE.Mesh(mirrorGeo, bodyPaintMat);
    mirrorR.position.set(0.75, 0.56, -0.32);
    carGroup.add(mirrorL, mirrorR);

    const wheelGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.15, 20);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelCoords: Array<[number, number, number]> = [
      [-0.66, 0.21, 0.65],
      [0.66, 0.21, 0.65],
      [-0.66, 0.21, -0.65],
      [0.66, 0.21, -0.65],
    ];
    wheelCoords.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, wy, wz);
      carGroup.add(wheel);
    });

    const shadowGeo = new THREE.PlaneGeometry(2.1, 2.8);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x05070a,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.y = 0.01;
    carGroup.add(shadowPlane);

    scene.add(carGroup);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

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

    const renderStatic = () => {
      if (disposed) return;
      renderer.render(scene, camera);
    };

    const tick = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();
      if (simRef.current) {
        const speedFactor = Math.max(0.2, speedRef.current / 80);
        carGroup.position.y = Math.sin(elapsed * 3.5 * speedFactor) * 0.012;
        carGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.04;
      } else {
        carGroup.position.y = 0;
        carGroup.rotation.y = 0;
      }
      renderer.render(scene, camera);
      if (simRef.current) {
        if (isSoftwareGl) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
      }
    };
    startSimLoopRef.current = tick;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    renderStatic();
    if (simRef.current) {
      tick();
    }

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 240;
      const h = container.clientHeight || 160;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderStatic();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      startSimLoopRef.current = () => {};
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      envTexture.dispose();
      lowerBodyGeo.dispose();
      cabinGeo.dispose();
      rearDeckGeo.dispose();
      tailBarGeo.dispose();
      mirrorGeo.dispose();
      wheelGeo.dispose();
      shadowGeo.dispose();
      bodyPaintMat.dispose();
      glassMat.dispose();
      tireMat.dispose();
      tailLightMat.dispose();
      shadowMat.dispose();
      renderer.dispose();
    };
  }, []);

  const snapVal = (v: number) => (snapEnabled ? Math.round(v / 8) * 8 : Math.round(v));

  const getLocalCoords = (clientX: number, clientY: number) => {
    const rect = artboardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleArtboardPointerDown = (e: React.PointerEvent) => {
    if (activeDrawTool === 'select') return;
    e.stopPropagation();
    const pt = getLocalCoords(e.clientX, e.clientY);
    setDragState({
      mode: 'draw',
      startX: pt.x,
      startY: pt.y,
      currX: pt.x,
      currY: pt.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    if (dragState.mode === 'draw') {
      const pt = getLocalCoords(e.clientX, e.clientY);
      setDragState({ ...dragState, currX: pt.x, currY: pt.y });
      return;
    }

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (dragState.mode === 'move-layer') {
      onUpdateLayer(dragState.layerId, {
        x: snapVal(dragState.origX + dx),
        y: snapVal(dragState.origY + dy),
      });
    } else if (dragState.mode === 'move-widget') {
      onUpdateWidgetOverride(dragState.widgetId, {
        dx: snapVal(dragState.origDx + dx),
        dy: snapVal(dragState.origDy + dy),
      });
    } else if (dragState.mode === 'resize-layer') {
      let { origX, origY, origW, origH } = dragState;
      if (dragState.corner.includes('e')) origW = Math.max(24, snapVal(origW + dx));
      if (dragState.corner.includes('s')) origH = Math.max(20, snapVal(origH + dy));
      if (dragState.corner.includes('w')) {
        const nextW = Math.max(24, snapVal(origW - dx));
        origX = snapVal(origX + (origW - nextW));
        origW = nextW;
      }
      if (dragState.corner.includes('n')) {
        const nextH = Math.max(20, snapVal(origH - dy));
        origY = snapVal(origY + (origH - nextH));
        origH = nextH;
      }
      onUpdateLayer(dragState.layerId, { x: origX, y: origY, w: origW, h: origH });
    }
  };

  const handlePointerUp = () => {
    if (!dragState) return;
    if (dragState.mode === 'draw' && activeDrawTool !== 'select') {
      const rawW = Math.abs(dragState.currX - dragState.startX);
      const rawH = Math.abs(dragState.currY - dragState.startY);
      const x = snapVal(Math.min(dragState.startX, dragState.currX));
      const y = snapVal(Math.min(dragState.startY, dragState.currY));
      const w = rawW > 14 ? snapVal(rawW) : activeDrawTool === 'text' ? 120 : 96;
      const h = rawH > 14 ? snapVal(rawH) : activeDrawTool === 'text' ? 32 : 56;
      const kind: HmiLayer['kind'] =
        activeDrawTool === 'frame'
          ? 'frame'
          : activeDrawTool === 'vector'
          ? 'vector'
          : activeDrawTool === 'pen'
          ? 'pen'
          : activeDrawTool === 'text'
          ? 'text'
          : 'rectangle';
      onCreateLayer(kind, { x, y, w, h });
      onChangeDrawTool('select');
    }
    setDragState(null);
  };

  const startWidgetDrag = (e: React.PointerEvent, widgetId: string, name: string, type: string) => {
    if (activeDrawTool !== 'select') return;
    e.stopPropagation();
    onSelectElement(widgetId, name, type);
    const ov = widgetOverrides[widgetId];
    if (ov?.locked) return;
    setDragState({
      mode: 'move-widget',
      widgetId,
      startX: e.clientX,
      startY: e.clientY,
      origDx: ov?.dx ?? 0,
      origDy: ov?.dy ?? 0,
    });
  };

  const topTicks = [
    0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600,
    1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500,
  ];
  const leftTicks = [
    0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700,
  ];

  const gears: Array<'P' | 'R' | 'N' | 'D'> = ['P', 'R', 'N', 'D'];

  const timeOv = widgetOverrides['time'];
  const speedOv = widgetOverrides['minutes-label'];
  const gaugeOv = widgetOverrides['gauge-right'];
  const carOv = widgetOverrides['proj-car-viz'];
  const tripOv = widgetOverrides['trip-computer'];

  const gaugeRingStroke =
    gaugeOv?.strokeColor ||
    (selectedNodeId === 'gauge-right' || selectedNodeId === 'needle-shape'
      ? attributes.strokeColor
      : '#2DD4BF');

  const selectedLayer = hmiLayers.find((l) => l.id === selectedNodeId);

  // Evaluate real Transition Editor tracks & easing curve at playheadMs
  const applyEaseCurve = (u: number): number => {
    const t = Math.min(1, Math.max(0, u));
    if (easing.curveType === 'Spring') {
      const dampingRatio = Math.max(0.15, easing.damping / Math.max(1, 2 * Math.sqrt(Math.max(1, easing.stiffness) * Math.max(0.5, easing.mass))));
      const freq = Math.sqrt(Math.max(1, easing.stiffness) / Math.max(0.5, easing.mass)) * 0.6;
      return 1 - Math.exp(-dampingRatio * 6 * t) * Math.cos(freq * t);
    }
    const power = easing.curveType === 'Quadratic' ? 2 : 3;
    if (easing.easeMode === 'Ease in') return Math.pow(t, power);
    if (easing.easeMode === 'Ease out') return 1 - Math.pow(1 - t, power);
    return t < 0.5
      ? Math.pow(2, power - 1) * Math.pow(t, power)
      : 1 - Math.pow(-2 * t + 2, power) / 2;
  };

  const evalTrackOffset = (groupName: string, labelName: string, amplitude: number): number => {
    const tr = tracks.find(
      (item) => item.group === groupName && item.label.toLowerCase() === labelName.toLowerCase()
    );
    if (!tr || tr.endMs <= tr.startMs) return 0;
    const effectivePlayhead = Math.max(0, playheadMs - easing.delayMs);
    if (effectivePlayhead <= tr.startMs) return 0;
    const progress = Math.min(1, (effectivePlayhead - tr.startMs) / (tr.endMs - tr.startMs));
    return Math.sin(applyEaseCurve(progress) * Math.PI) * amplitude;
  };

  const timelineActive = isSimulating || playheadMs !== 500;
  const simSlideX = timelineActive ? evalTrackOffset('Position', 'x', 14) : 0;
  const simSlideY = timelineActive ? evalTrackOffset('Position', 'y', 8) : 0;
  const simRotDeg = timelineActive ? evalTrackOffset('Rotation', 'x', 6) : 0;

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative flex-1 bg-[#141519] overflow-hidden flex flex-col select-none"
    >
      {/* Top Pixel Ruler */}
      <div className="h-[18px] pl-[18px] bg-[#16181D] border-b border-[#252830] flex items-end justify-between text-[8px] font-mono-code text-[#6B7280] overflow-hidden shrink-0">
        {topTicks.map((tick) => (
          <div key={tick} className="flex flex-col items-start min-w-[28px] relative">
            <span className="pl-0.5 leading-none mb-0.5">{tick}</span>
            <div className="w-[1px] h-[4px] bg-[#374151]" />
          </div>
        ))}
      </div>

      <div className="relative flex-1 flex min-h-0">
        {/* Left Vertical Pixel Ruler */}
        <div className="w-[18px] bg-[#16181D] border-r border-[#252830] flex flex-col justify-between py-1 text-[8px] font-mono-code text-[#6B7280] overflow-hidden shrink-0">
          {leftTicks.map((tick) => (
            <div
              key={tick}
              className="flex items-center justify-end pr-0.5 leading-none"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {tick}
            </div>
          ))}
        </div>

        {/* Main Canvas Area */}
        <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          {showGuides && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-[24%] w-[1px] bg-[#10B981]/35" />
              <div className="pointer-events-none absolute inset-y-0 left-[30.5%] w-[1px] bg-[#EF4444]/40" />
              <div className="pointer-events-none absolute inset-x-0 top-[21%] h-[1px] bg-[#EF4444]/35" />
              <div className="pointer-events-none absolute inset-x-0 top-[24.5%] h-[1px] bg-[#10B981]/30" />
            </>
          )}

          {/* Active Drawing Tool Hint */}
          {activeDrawTool !== 'select' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-2.5 py-1 bg-[#1B1E25] border border-[#24B0FF]/60 rounded-[3px] text-[10.5px] text-[#E5E7EB]">
              Click or drag on the HMI canvas to place a <span className="text-[#24B0FF] font-medium capitalize">{activeDrawTool}</span> element
            </div>
          )}

          {/* Automotive Instrument Cluster HMI Artboard */}
          <div
            ref={artboardRef}
            onPointerDown={handleArtboardPointerDown}
            className={`relative w-full max-w-[780px] aspect-[2.38/1] rounded-[2px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.75)] border border-[#2B3342]/70 ${
              activeDrawTool !== 'select' ? 'cursor-crosshair' : ''
            }`}
            style={{
              background:
                'linear-gradient(180deg, #10151E 0%, #151B26 42%, #1C2330 78%, #161B25 100%)',
            }}
          >
            {/* Optional fine snap grid inside artboard when guides enabled */}
            {showGuides && activeDrawTool !== 'select' && (
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
            )}

            {/* Dark Sculpted Mountain Horizon Silhouette */}
            <svg
              viewBox="0 0 800 180"
              preserveAspectRatio="none"
              className="absolute top-0 inset-x-0 w-full h-[52%] opacity-65 pointer-events-none"
            >
              <defs>
                <linearGradient id="horizonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0E131B" />
                  <stop offset="100%" stopColor="#1B2230" />
                </linearGradient>
              </defs>
              <path
                d="M0,45 Q90,10 180,35 T380,48 T590,26 T800,42 L800,180 L0,180 Z"
                fill="url(#horizonGrad)"
              />
              <path
                d="M0,78 Q120,40 240,68 T520,62 T800,72 L800,180 L0,180 Z"
                fill="#181F2C"
                opacity="0.7"
              />
            </svg>

            {/* Glowing Coral-Amber Road Beam */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[86%]"
              style={{
                background:
                  'radial-gradient(ellipse 36% 78% at 50% 62%, rgba(225, 146, 126, 0.42) 0%, rgba(190, 118, 102, 0.16) 44%, transparent 78%)',
              }}
            />

            {/* Road Corridor Perspective SVG */}
            <svg
              viewBox="0 0 800 340"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 w-full h-full"
            >
              <defs>
                <linearGradient id="roadBeam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E5A28E" stopOpacity="0.12" />
                  <stop offset="45%" stopColor="#D78E7D" stopOpacity="0.48" />
                  <stop offset="100%" stopColor="#19202C" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <polygon points="390,34 410,34 486,315 314,315" fill="url(#roadBeam)" />
              <line x1="390" y1="34" x2="314" y2="315" stroke="#E5A28E" strokeOpacity="0.35" strokeWidth="1" />
              <line x1="410" y1="34" x2="486" y2="315" stroke="#E5A28E" strokeOpacity="0.35" strokeWidth="1" />
              {Array.from({ length: 7 }).map((_, row) => {
                const y = 178 + row * 18;
                const spread = 50 + row * 28;
                return Array.from({ length: 13 }).map((__, col) => {
                  const x = 400 + (col - 6) * (spread / 4.5);
                  return (
                    <circle
                      key={`${row}-${col}`}
                      cx={x}
                      cy={y}
                      r={0.9}
                      fill="#94A3B8"
                      opacity={0.22 - row * 0.02}
                    />
                  );
                });
              })}
            </svg>

            {/* Cluster Top Status Bar */}
            <div className="relative z-10 px-5 sm:px-8 pt-3 flex items-center justify-between text-[10px] sm:text-[11px] text-[#9CA3AF]">
              {timeOv?.visible !== false && (
                <div
                  onPointerDown={(e) => startWidgetDrag(e, 'time', 'Time', 'Clock')}
                  style={{
                    transform: `translate(${timeOv?.dx ?? 0}px, ${timeOv?.dy ?? 0}px) rotate(${
                      timeOv?.rotation ?? 0
                    }deg)`,
                    opacity: (timeOv?.opacity ?? 100) / 100,
                  }}
                  className={`flex items-center gap-3 cursor-move hover:text-white transition-colors ${
                    selectedNodeId === 'time' ? 'ring-1 ring-[#24B0FF] px-1 rounded-[2px]' : ''
                  }`}
                >
                  <span className="font-mono-code tabular-nums">{telemetry.clockLabel}</span>
                  <span className="font-mono-code tabular-nums">{telemetry.ambientTempC}°C</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-[#9CA3AF] ml-auto">
                {telemetry.leftBlinker && (
                  <span className="text-[#10B981] font-bold text-[11px]" title="Left Blinker Active">
                    ◀
                  </span>
                )}
                <Bluetooth className="w-3 h-3 text-[#60A5FA]" />
                <Signal className="w-3 h-3" />
                <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                {telemetry.rightBlinker && (
                  <span className="text-[#10B981] font-bold text-[11px]" title="Right Blinker Active">
                    ▶
                  </span>
                )}
              </div>
            </div>

            {/* Main 3-Column Instrument Cluster Content */}
            <div className="relative z-10 h-[calc(100%-64px)] px-6 sm:px-14 flex items-center justify-between">
              {/* LEFT: Gear & Speedometer */}
              {speedOv?.visible !== false ? (
                <div
                  onPointerDown={(e) =>
                    startWidgetDrag(e, 'minutes-label', 'Speedometer', 'Text')
                  }
                  style={{
                    transform: `translate(${speedOv?.dx ?? 0}px, ${speedOv?.dy ?? 0}px) rotate(${
                      speedOv?.rotation ?? 0
                    }deg)`,
                    opacity: (speedOv?.opacity ?? 100) / 100,
                    fontFamily: speedOv?.fontFamily,
                  }}
                  className={`flex flex-col items-start cursor-move p-1.5 rounded-[2px] ${
                    selectedNodeId === 'minutes-label' || selectedNodeId === 'gauge-left'
                      ? 'ring-1 ring-[#24B0FF]/80'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-[11px] font-medium tracking-wider mb-3">
                    {gears.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => onChangeGear(g)}
                        className={`cursor-pointer transition-colors ${
                          telemetry.gear === g
                            ? 'text-white font-semibold'
                            : 'text-[#5C6678] hover:text-[#9CA3AF]'
                        }`}
                        title={`Set Gear ${g}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      color: speedOv?.fillColor || '#E5EAF2',
                      fontSize: speedOv?.fontSize ? `${Math.max(24, speedOv.fontSize * 3.5)}px` : undefined,
                      letterSpacing: speedOv?.letterSpacing ? `${speedOv.letterSpacing * 0.4}px` : undefined,
                    }}
                    className="font-display text-[36px] sm:text-[50px] leading-none font-normal tabular-nums tracking-tight"
                  >
                    {Math.round(telemetry.speedKmh)}
                  </div>
                  <div className="text-[10px] text-[#7D8799] mt-0.5 mb-3">km/h</div>

                  <div
                    className={`px-2 py-0.5 text-[8px] font-semibold tracking-widest rounded-[2px] border ${
                      telemetry.readyState
                        ? 'text-[#34D399] border-[#10B981]/50 bg-[#10B981]/10'
                        : 'text-[#9CA3AF] border-[#4B5563]/50 bg-[#1F2937]/30'
                    }`}
                  >
                    {speedOv?.textContent || 'READY'}
                  </div>
                </div>
              ) : (
                <div />
              )}

              {/* CENTER: Real Three.js 3D EV Car Visualization */}
              {carOv?.visible !== false ? (
                <div
                  onPointerDown={(e) => startWidgetDrag(e, 'proj-car-viz', 'Car viz', '3D Mesh')}
                  style={{
                    transform: `translate(${carOv?.dx ?? 0}px, ${carOv?.dy ?? 0}px)`,
                    opacity: (carOv?.opacity ?? 100) / 100,
                  }}
                  className={`relative w-[170px] sm:w-[235px] h-[120px] sm:h-[165px] mt-10 cursor-move flex items-center justify-center ${
                    selectedNodeId === 'proj-car-viz' ? 'ring-1 ring-[#24B0FF]/80 rounded-[3px]' : ''
                  }`}
                  title="3D EV Vehicle Visualization (Three.js) — Drag to reposition"
                >
                  <div ref={carMountRef} className="w-full h-full pointer-events-none" />
                </div>
              ) : (
                <div />
              )}

              {/* RIGHT: Range & Power Gauge (28 kW) */}
              {gaugeOv?.visible !== false ? (
                <div
                  onPointerDown={(e) => startWidgetDrag(e, 'gauge-right', 'Gauge Right', 'Gauge')}
                  style={{
                    transform: `translate(${gaugeOv?.dx ?? 0}px, ${gaugeOv?.dy ?? 0}px) rotate(${
                      gaugeOv?.rotation ?? 0
                    }deg)`,
                    opacity: (gaugeOv?.opacity ?? 100) / 100,
                  }}
                  className={`flex flex-col items-center cursor-move p-1.5 rounded-[2px] ${
                    selectedNodeId === 'gauge-right' || selectedNodeId === 'needle-shape'
                      ? 'ring-1 ring-[#24B0FF]/80'
                      : ''
                  }`}
                >
                  <div className="text-[11px] sm:text-[12px] text-[#D1D8E3] tabular-nums mb-3 font-medium">
                    {Math.round(telemetry.rangeKm)}{' '}
                    <span className="text-[10px] text-[#7D8799] font-normal">km</span>
                  </div>

                  <div className="relative w-[62px] h-[62px] sm:w-[74px] sm:h-[74px] flex flex-col items-center justify-center">
                    <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
                      <rect
                        x="6"
                        y="6"
                        width="68"
                        height="68"
                        rx={gaugeOv?.cornerRadius !== undefined ? Math.min(34, gaugeOv.cornerRadius / 3) : 14}
                        fill="rgba(16, 22, 32, 0.55)"
                        stroke="#253042"
                        strokeWidth="2.5"
                      />
                      <rect
                        x="6"
                        y="6"
                        width="68"
                        height="68"
                        rx={gaugeOv?.cornerRadius !== undefined ? Math.min(34, gaugeOv.cornerRadius / 3) : 14}
                        fill="none"
                        stroke={gaugeRingStroke}
                        strokeOpacity={gaugeOv?.strokeVisible === false ? 0 : 1}
                        strokeWidth={gaugeOv?.strokeWidth ?? 2.5}
                        strokeDasharray="240"
                        strokeDashoffset={Math.max(
                          30,
                          240 - Math.min(210, Math.abs(telemetry.powerKw) * 2.2)
                        )}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="relative z-10 font-display text-[24px] sm:text-[28px] leading-none text-[#E5EAF2] tabular-nums">
                      {Math.round(telemetry.powerKw)}
                    </span>
                    <span className="relative z-10 text-[9px] text-[#7D8799] mt-0.5">kW</span>
                  </div>

                  <Leaf className="w-3.5 h-3.5 text-[#10B981] mt-3" />
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Bottom Trip Computer Bar */}
            {tripOv?.visible !== false && (
              <div
                onPointerDown={(e) =>
                  startWidgetDrag(e, 'trip-computer', 'Trip Computer', 'Group')
                }
                style={{
                  transform: `translate(${tripOv?.dx ?? 0}px, ${tripOv?.dy ?? 0}px)`,
                  opacity: (tripOv?.opacity ?? 100) / 100,
                }}
                className={`relative z-10 mx-auto w-[48%] border-t border-[#2E3748]/70 pt-1.5 pb-2 flex items-center justify-center gap-5 sm:gap-7 text-[10px] sm:text-[11px] text-[#B8C2D1] tabular-nums cursor-move hover:text-white ${
                  selectedNodeId === 'trip-computer' ? 'ring-1 ring-[#24B0FF]/80 rounded-[2px]' : ''
                }`}
              >
                <span>{telemetry.tripTimeLabel}</span>
                <span>
                  {telemetry.tripDistanceKm}
                  <span className="text-[9px] text-[#7D8799] ml-0.5">km</span>
                </span>
                <span>{telemetry.etaLabel}</span>
              </div>
            )}

            {/* USER-CREATED / EDITABLE HMI DESIGN LAYERS */}
            {hmiLayers.map((layer) => {
              if (!layer.visible) return null;
              const isSelected = selectedNodeId === layer.id;
              const showStroke = layer.strokeVisible !== false && layer.strokeWidth > 0;
              const shadowGlow =
                layer.shadowVisible && layer.shadowColor
                  ? `0 6px 18px ${layer.shadowColor}55`
                  : undefined;
              const selectionRing = isSelected ? '0 0 0 1px #24B0FF' : undefined;
              const combinedShadow = [selectionRing, shadowGlow].filter(Boolean).join(', ') || undefined;

              return (
                <div
                  key={layer.id}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!layer.locked) setEditingLayerId(layer.id);
                  }}
                  onPointerDown={(e) => {
                    if (activeDrawTool !== 'select' || editingLayerId === layer.id) return;
                    e.stopPropagation();
                    onSelectElement(layer.id, layer.name, layer.kind);
                    if (layer.locked) return;
                    setDragState({
                      mode: 'move-layer',
                      layerId: layer.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: layer.x,
                      origY: layer.y,
                    });
                  }}
                  style={{
                    left: `${layer.x + (isSelected ? simSlideX : 0)}px`,
                    top: `${layer.y + (isSelected ? simSlideY : 0)}px`,
                    width: `${layer.w}px`,
                    height: `${layer.h}px`,
                    zIndex: 20 + Math.min(20, Math.round(layer.zOrder / 100)),
                    opacity: layer.opacity / 100,
                    transform: `rotate(${layer.rotation + (isSelected ? simRotDeg : 0)}deg)`,
                    borderRadius:
                      layer.kind === 'vector' || layer.kind === 'pen'
                        ? undefined
                        : `${layer.cornerRadius}px`,
                    backgroundColor:
                      layer.kind === 'rectangle' || layer.kind === 'frame'
                        ? layer.fillVisible
                          ? layer.fillColor
                          : 'transparent'
                        : 'transparent',
                    mixBlendMode:
                      layer.fillBlend === 'Multiply'
                        ? 'multiply'
                        : layer.fillBlend === 'Screen'
                        ? 'screen'
                        : undefined,
                    border:
                      (layer.kind === 'rectangle' || layer.kind === 'frame') && showStroke
                        ? `${layer.strokeWidth}px ${
                            layer.kind === 'frame' ? 'dashed' : 'solid'
                          } ${layer.strokeColor}`
                        : undefined,
                    backdropFilter:
                      layer.blurVisible !== false && layer.backgroundBlur > 0
                        ? `blur(${Math.min(24, layer.backgroundBlur / 10)}px)`
                        : undefined,
                    boxShadow: combinedShadow,
                  }}
                  className={`absolute flex items-center justify-center ${
                    layer.locked ? 'cursor-not-allowed' : 'cursor-move'
                  }`}
                >
                  {layer.tintVisible && (
                    <div
                      style={{
                        backgroundColor: layer.tintColor,
                        borderRadius: `${layer.cornerRadius}px`,
                      }}
                      className="pointer-events-none absolute inset-0 opacity-15"
                    />
                  )}

                  {layer.kind === 'vector' && (
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                      <polygon
                        points="50,6 94,92 6,92"
                        fill={layer.fillVisible ? layer.fillColor : 'none'}
                        fillOpacity={layer.fillOpacity / 100}
                        stroke={showStroke ? layer.strokeColor : 'none'}
                        strokeWidth={Math.max(1, layer.strokeWidth * 1.5)}
                      />
                    </svg>
                  )}

                  {layer.kind === 'pen' && (
                    <svg viewBox="0 0 120 60" preserveAspectRatio="none" className="w-full h-full">
                      <path
                        d="M 6 50 Q 45 6, 114 14"
                        fill="none"
                        stroke={showStroke ? layer.strokeColor : '#24B0FF'}
                        strokeWidth={Math.max(2, layer.strokeWidth * 1.5)}
                        strokeLinecap="round"
                      />
                      <circle cx="6" cy="50" r="3" fill="#10B981" />
                      <circle cx="114" cy="14" r="3" fill="#24B0FF" />
                    </svg>
                  )}

                  {(layer.kind === 'text' || layer.kind === 'rectangle' || layer.kind === 'frame') &&
                    (editingLayerId === layer.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={layer.text}
                        onChange={(e) => onUpdateLayer(layer.id, { text: e.target.value })}
                        onBlur={() => setEditingLayerId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') setEditingLayerId(null);
                        }}
                        className="w-full px-2 bg-[#121419]/90 text-white text-center text-[11px] border border-[#24B0FF] rounded-[2px] focus:outline-none"
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: layer.fontFamily,
                          fontSize: `${layer.fontSize}px`,
                          lineHeight: `${layer.lineHeight}px`,
                          letterSpacing: `${layer.letterSpacing * 0.3}px`,
                          fontWeight:
                            layer.fontWeight === 'Bold'
                              ? 700
                              : layer.fontWeight === 'SemiBold'
                              ? 600
                              : 400,
                          textAlign: layer.textAlign,
                          textTransform: layer.textTransform,
                          color:
                            layer.kind === 'text'
                              ? layer.fillColor
                              : layer.kind === 'frame'
                              ? '#9CA3AF'
                              : '#0F172A',
                        }}
                        className="px-2 w-full truncate pointer-events-none select-none"
                      >
                        {layer.text}
                      </span>
                    ))}

                  {/* Resize Handles on Selected Layer */}
                  {isSelected && !layer.locked && (
                    <>
                      {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                        <div
                          key={corner}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setDragState({
                              mode: 'resize-layer',
                              layerId: layer.id,
                              corner,
                              startX: e.clientX,
                              startY: e.clientY,
                              origX: layer.x,
                              origY: layer.y,
                              origW: layer.w,
                              origH: layer.h,
                            });
                          }}
                          className={`absolute w-2.5 h-2.5 bg-white border border-[#24B0FF] rounded-[1px] ${
                            corner === 'nw'
                              ? '-top-1.5 -left-1.5 cursor-nwse-resize'
                              : corner === 'ne'
                              ? '-top-1.5 -right-1.5 cursor-nesw-resize'
                              : corner === 'sw'
                              ? '-bottom-1.5 -left-1.5 cursor-nesw-resize'
                              : '-bottom-1.5 -right-1.5 cursor-nwse-resize'
                          }`}
                        />
                      ))}
                    </>
                  )}
                </div>
              );
            })}

            {/* Live Drawing Marquee Preview */}
            {dragState?.mode === 'draw' && (
              <div
                style={{
                  left: `${Math.min(dragState.startX, dragState.currX)}px`,
                  top: `${Math.min(dragState.startY, dragState.currY)}px`,
                  width: `${Math.max(12, Math.abs(dragState.currX - dragState.startX))}px`,
                  height: `${Math.max(12, Math.abs(dragState.currY - dragState.startY))}px`,
                }}
                className="absolute z-40 border border-dashed border-[#24B0FF] bg-[#24B0FF]/15 pointer-events-none"
              />
            )}
          </div>

          {/* Floating Canvas Tool Dock (matching Screenshot 3 + interactive Select/Text/Delete) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1A1D24]/95 border border-[#2C313D] rounded-[4px] px-2 py-1.5 flex items-center gap-1 shadow-xl z-30">
            <button
              type="button"
              onClick={() => onChangeDrawTool('select')}
              className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                activeDrawTool === 'select'
                  ? 'bg-[#2A2E39] text-white'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
              title="Select & Move Tool"
            >
              <MousePointer2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDrawTool('frame')}
              className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                activeDrawTool === 'frame'
                  ? 'bg-[#2A2E39] text-[#24B0FF]'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
              title="Draw HMI Frame Container"
            >
              <Frame className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDrawTool('vector')}
              className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                activeDrawTool === 'vector'
                  ? 'bg-[#2A2E39] text-[#24B0FF]'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
              title="Draw Vector Indicator"
            >
              <Triangle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDrawTool('rectangle')}
              className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                activeDrawTool === 'rectangle'
                  ? 'bg-[#2A2E39] text-[#24B0FF]'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
              title="Draw Rectangle / Widget"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDrawTool('pen')}
              className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                activeDrawTool === 'pen'
                  ? 'bg-[#2A2E39] text-[#24B0FF]'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
              title="Draw Bezier Needle / Path"
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDrawTool('text')}
              className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                activeDrawTool === 'text'
                  ? 'bg-[#2A2E39] text-[#24B0FF]'
                  : 'text-[#8E95A2] hover:text-white'
              }`}
              title="Add HMI Text Label"
            >
              <Type className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-[#2C313D] mx-0.5" />
            <button
              type="button"
              onClick={() => setSnapEnabled(!snapEnabled)}
              className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                snapEnabled ? 'text-[#24B0FF]' : 'text-[#6B7280] hover:text-white'
              }`}
              title="Toggle 8px Grid Snapping"
            >
              <Magnet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowGuides(!showGuides)}
              className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                showGuides ? 'text-[#10B981]' : 'text-[#6B7280] hover:text-white'
              }`}
              title="Toggle Alignment Guides"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            {selectedLayer && (
              <>
                <div className="w-[1px] h-4 bg-[#2C313D] mx-0.5" />
                <button
                  type="button"
                  onClick={() => onDeleteLayer(selectedLayer.id)}
                  className="p-1.5 rounded-[3px] text-[#EF4444] hover:bg-[#2A2E39] cursor-pointer"
                  title="Delete Selected HMI Layer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
