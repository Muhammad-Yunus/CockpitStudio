import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Layers, Cpu, X, Plus } from 'lucide-react';
import { TopStudioBar } from './components/TopStudioBar';
import { LeftOutlinerDock } from './components/LeftOutlinerDock';
import { ClusterHmiCanvas } from './components/ClusterHmiCanvas';
import { Viewport3D } from './components/Viewport3D';
import { BottomWorkbench } from './components/BottomWorkbench';
import { RightInspectorDock } from './components/RightInspectorDock';
import { AuthAndIngestModal } from './components/AuthAndIngestModal';
import {
  DEFAULT_ATTRIBUTES,
  DEFAULT_CLUSTER_LOGIC_NODES,
  DEFAULT_CLUSTER_LOGIC_WIRES,
  DEFAULT_CODE_DOCUMENT,
  DEFAULT_CONSOLE_LOGS,
  DEFAULT_EASING_CONFIG,
  DEFAULT_LOGIC_NODES,
  DEFAULT_LOGIC_WIRES,
  DEFAULT_PROJECT_TREE,
  DEFAULT_SCENE_TREE,
  DEFAULT_TELEMETRY_SNAPSHOT,
  DEFAULT_TRANSITION_TRACKS,
  PRIMITIVE_MENU_ITEMS,
} from './data/defaultStudioState';
import type {
  AddedLight3D,
  AttributesState,
  BottomPanelMode,
  BuiltInWidgetOverride,
  CanvasDrawTool,
  ConsoleLogEntry,
  EasingConfig,
  HmiLayer,
  LightKind3D,
  LogicNode,
  LogicWire,
  MeshTransform3D,
  MobilePane,
  ProjectNode,
  RightBottomTab,
  SceneNode,
  StudioUser,
  TelemetrySnapshot,
  TransitionTrack,
  ViewportTab,
} from './types/studio';

function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export default function App() {
  const [openViewportTabs, setOpenViewportTabs] = useState<ViewportTab[]>([
    'Root',
    'Cluster',
    'Infotainment',
  ]);
  const [activeViewportTab, setActiveViewportTab] = useState<ViewportTab>('Infotainment');
  const [bottomPanelMode, setBottomPanelMode] = useState<BottomPanelMode>('Logic Editor');
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
  const [rightBottomTab, setRightBottomTab] = useState<RightBottomTab>('Asset manager');
  const [mobilePane, setMobilePane] = useState<MobilePane>('canvas');

  const [sceneTree, setSceneTree] = useState<SceneNode[]>(DEFAULT_SCENE_TREE);
  const [projectTree, setProjectTree] = useState<ProjectNode[]>(DEFAULT_PROJECT_TREE);
  const [attributes, setAttributes] = useState<AttributesState>(DEFAULT_ATTRIBUTES);
  const [hmiLayers, setHmiLayers] = useState<HmiLayer[]>([]);
  const [widgetOverrides, setWidgetOverrides] = useState<Record<string, BuiltInWidgetOverride>>(
    {}
  );
  const [activeDrawTool, setActiveDrawTool] = useState<CanvasDrawTool>('select');

  const [logicSubTab, setLogicSubTab] = useState<'Cluster' | 'Infotainment'>('Infotainment');
  const [logicNodes, setLogicNodes] = useState<LogicNode[]>(DEFAULT_LOGIC_NODES);
  const [logicWires, setLogicWires] = useState<LogicWire[]>(DEFAULT_LOGIC_WIRES);
  const [clusterLogicNodes, setClusterLogicNodes] = useState<LogicNode[]>(
    DEFAULT_CLUSTER_LOGIC_NODES
  );
  const [clusterLogicWires, setClusterLogicWires] = useState<LogicWire[]>(
    DEFAULT_CLUSTER_LOGIC_WIRES
  );
  const [selectedLogicNodeId, setSelectedLogicNodeId] = useState<string>('node-on-key');
  const [tracks, setTracks] = useState<TransitionTrack[]>(DEFAULT_TRANSITION_TRACKS);
  const [playheadMs, setPlayheadMs] = useState<number>(500);
  const [easing, setEasing] = useState<EasingConfig>(DEFAULT_EASING_CONFIG);
  const [codeDocument, setCodeDocument] = useState<string>(DEFAULT_CODE_DOCUMENT);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>(DEFAULT_CONSOLE_LOGS);

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(DEFAULT_TELEMETRY_SNAPSHOT);
  const [addedPrimitives, setAddedPrimitives] = useState<
    Array<{ id: string; kind: (typeof PRIMITIVE_MENU_ITEMS)[number] }>
  >([]);
  const [addedLights, setAddedLights] = useState<AddedLight3D[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Auth & PostgreSQL persistence state
  const [user, setUser] = useState<StudioUser | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string>('EV Cockpit HMI');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'auth' | 'projects' | 'ingest'>('auth');

  const lastIngestKeyRef = React.useRef<string | null>(null);

  const appendLog = useCallback((level: ConsoleLogEntry['level'], message: string) => {
    setLogs((prev) => [
      { id: `log-${Date.now()}-${Math.random()}`, timestamp: formatTimestamp(), level, message },
      ...prev.slice(0, 49),
    ]);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const fetchLatestTelemetry = useCallback(async () => {
    if (!user || !activeProjectId) return;
    try {
      const res = await fetch(
        `/api/v1/telemetry/latest?projectId=${encodeURIComponent(activeProjectId)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.frame) {
        const f = data.frame;
        const ingestKey = `${f.id ?? ''}:${f.ingestedAt ?? ''}`;
        if (f.ingestedAt && lastIngestKeyRef.current !== ingestKey) {
          lastIngestKeyRef.current = ingestKey;
          appendLog(
            'ingest',
            `Ingest::Telemetry(${f.sourceSystem || 'EXTERNAL'}, ${f.vehicleId || 'BUS'}) -> speed=${
              f.speedKmh ?? '—'
            } km/h, power=${f.powerKw ?? '—'} kW`
          );
        }
        setTelemetry((prev) => ({
          ...prev,
          speedKmh: f.speedKmh ?? prev.speedKmh,
          powerKw: f.powerKw ?? prev.powerKw,
          rangeKm: f.rangeKm ?? prev.rangeKm,
          gear: (f.gear as TelemetrySnapshot['gear']) ?? prev.gear,
          readyState: f.readyState ?? prev.readyState,
          ambientTempC: f.ambientTempC ?? prev.ambientTempC,
          tripTimeLabel: f.tripTimeLabel ?? prev.tripTimeLabel,
          tripDistanceKm: f.tripDistanceKm ?? prev.tripDistanceKm,
          etaLabel: f.etaLabel ?? prev.etaLabel,
          leftBlinker: f.leftBlinker ?? prev.leftBlinker,
          rightBlinker: f.rightBlinker ?? prev.rightBlinker,
          batterySocPct: f.batterySocPct ?? prev.batterySocPct,
          sourceSystem: f.sourceSystem || prev.sourceSystem,
          vehicleId: f.vehicleId || prev.vehicleId,
          ingestedAt: f.ingestedAt || null,
          signals: f.signals || prev.signals,
        }));
      }
    } catch {
      // ignore transient poll failure
    }
  }, [user, activeProjectId, appendLog]);

  useEffect(() => {
    if (!user || !activeProjectId) return;
    fetchLatestTelemetry();
    const timer = window.setInterval(fetchLatestTelemetry, 3000);
    return () => window.clearInterval(timer);
  }, [user, activeProjectId, fetchLatestTelemetry]);

  const activeLogicNodes = logicSubTab === 'Infotainment' ? logicNodes : clusterLogicNodes;
  const activeLogicWires = logicSubTab === 'Infotainment' ? logicWires : clusterLogicWires;
  const setActiveLogicNodes = logicSubTab === 'Infotainment' ? setLogicNodes : setClusterLogicNodes;
  const setActiveLogicWires = logicSubTab === 'Infotainment' ? setLogicWires : setClusterLogicWires;

  const handleTriggerLogicStep = useCallback(() => {
    const graphNodes = logicSubTab === 'Infotainment' ? logicNodes : clusterLogicNodes;
    const graphWires = logicSubTab === 'Infotainment' ? logicWires : clusterLogicWires;

    const disabledEvents = graphNodes.filter((n) => n.nodeType === 'event' && !n.enabled);
    if (graphNodes.some((n) => n.nodeType === 'event') && disabledEvents.length === graphNodes.filter((n) => n.nodeType === 'event').length) {
      appendLog('info', `Logic::${logicSubTab} skipped (all event trigger nodes disabled).`);
      return;
    }

    const evalNodeOutput = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      const node = graphNodes.find((n) => n.id === nodeId);
      if (!node || !node.enabled) return 0;

      const incomingWires = graphWires.filter((w) => w.toNodeId === node.id);
      if (node.nodeType === 'event') {
        if (/power/i.test(node.title)) return telemetry.powerKw;
        return telemetry.speedKmh;
      }

      if (node.nodeType === 'variable') {
        if (incomingWires.length > 0 && node.id !== 'node-speed-in') {
          return evalNodeOutput(incomingWires[0].fromNodeId, new Set(visited));
        }
        if (node.id === 'node-speed-in' || /^speed/i.test(node.title)) {
          return telemetry.speedKmh;
        }
        if (/power|gauge/i.test(node.title)) {
          return telemetry.powerKw;
        }
        return typeof node.value === 'number' ? node.value : Number(node.value) || 0;
      }

      // Math / Binary node evaluation using wired input pins
      const inputPins = node.pins.filter((p) => p.direction === 'in');
      const resolvedInputs = inputPins.map((pin) => {
        const w = graphWires.find((wire) => wire.toNodeId === node.id && wire.toPinId === pin.id);
        return w ? evalNodeOutput(w.fromNodeId, new Set(visited)) : 0;
      });
      const a = resolvedInputs[0] ?? 0;
      const b = resolvedInputs[1] ?? 1;
      const titleLower = node.title.toLowerCase();
      if (titleLower.includes('substract') || titleLower.includes('subtract')) {
        return Math.max(0, a - b);
      }
      if (titleLower.includes('add')) return a + b;
      if (titleLower.includes('multiply')) return a * b;
      if (titleLower.includes('divide')) return b !== 0 ? Math.round((a / b) * 100) / 100 : a;
      if (titleLower.includes('compare') || titleLower.includes('binary')) return a > b ? 1 : 0;
      if (titleLower.includes('clamp')) return Math.max(0, Math.min(240, a - 1));
      return a;
    };

    // Identify terminal variable nodes that receive wire inputs
    const sinkVariables = graphNodes.filter(
      (n) =>
        n.nodeType === 'variable' &&
        n.enabled &&
        graphWires.some((w) => w.toNodeId === n.id)
    );

    if (sinkVariables.length === 0) {
      appendLog('info', `Logic::${logicSubTab} evaluated (0 wired target variables).`);
      return;
    }

    const updatedValues = new Map<string, number>();
    let nextSpeed = telemetry.speedKmh;
    let nextPower = telemetry.powerKw;
    const nextSignals = { ...telemetry.signals };

    sinkVariables.forEach((sink) => {
      const val = Math.round(evalNodeOutput(sink.id));
      updatedValues.set(sink.id, val);
      nextSignals[sink.title] = val;
      if (/speed/i.test(sink.title)) {
        nextSpeed = Math.max(0, Math.min(450, val));
      } else if (/power|gauge/i.test(sink.title)) {
        nextPower = Math.max(0, Math.min(1500, val));
      }
    });

    setActiveLogicNodes((prev) =>
      prev.map((n) => (updatedValues.has(n.id) ? { ...n, value: updatedValues.get(n.id)! } : n))
    );
    setTelemetry((prev) => ({
      ...prev,
      speedKmh: nextSpeed,
      powerKw: nextPower,
      signals: nextSignals,
    }));

    const summary = Array.from(updatedValues.entries())
      .map(([id, val]) => `${graphNodes.find((n) => n.id === id)?.title || id}=${val}`)
      .join(', ');
    appendLog('info', `Logic::${logicSubTab} executed -> ${summary}`);
  }, [logicSubTab, logicNodes, logicWires, clusterLogicNodes, clusterLogicWires, telemetry, setActiveLogicNodes, appendLog]);

  useEffect(() => {
    if (!isSimulating) return;
    const spanMs = Math.max(2500, ...tracks.map((t) => t.endMs));
    const interval = window.setInterval(() => {
      setPlayheadMs((prev) => (prev + 25) % spanMs);
    }, 50);
    return () => window.clearInterval(interval);
  }, [isSimulating, tracks]);

  const handleSelectViewportTab = (tab: ViewportTab) => {
    setOpenViewportTabs((prev) => (prev.includes(tab) ? prev : [...prev, tab]));
    setActiveViewportTab(tab);
    if (tab === 'Cluster') {
      setBottomPanelMode('Transition Editor');
      setRightBottomTab('Code Editor');
    } else if (tab === 'Infotainment') {
      setBottomPanelMode('Logic Editor');
      setRightBottomTab('Asset manager');
    }
  };

  const handleSelectElement = useCallback(
    (nodeId: string, name: string, type: string) => {
      const layer = hmiLayers.find((l) => l.id === nodeId);
      if (layer) {
        setAttributes((prev) => ({
          ...prev,
          selectedNodeId: layer.id,
          objectName: layer.name,
          objectType:
            layer.kind === 'frame'
              ? 'Frame'
              : layer.kind === 'text'
              ? 'Text'
              : layer.kind === 'vector'
              ? 'Vector'
              : 'Rectangle',
          opacity: layer.opacity,
          zOrder: layer.zOrder,
          x: layer.x,
          y: layer.y,
          w: layer.w,
          h: layer.h,
          angle: layer.rotation,
          cornerRadius: layer.cornerRadius,
          fillColor: layer.fillColor,
          fillOpacity: layer.fillOpacity,
          fillBlend: layer.fillBlend || 'Normal',
          fillVisible: layer.fillVisible,
          strokeColor: layer.strokeColor,
          strokeWidth: layer.strokeWidth,
          strokeOpacity: layer.strokeOpacity ?? 100,
          strokeBlend: layer.strokeBlend || 'Normal',
          strokeVisible: layer.strokeVisible ?? layer.strokeWidth > 0,
          strokeAlign: layer.strokeAlign,
          tintColor: layer.tintColor,
          tintVisible: layer.tintVisible ?? false,
          shadowColor: layer.shadowColor,
          shadowVisible: layer.shadowVisible ?? false,
          backgroundBlur: layer.backgroundBlur,
          blurVisible: layer.blurVisible ?? layer.backgroundBlur > 0,
          textContent: layer.text,
          fontFamily: layer.fontFamily,
          fontWeight: layer.fontWeight,
          fontSize: layer.fontSize,
          lineHeight: layer.lineHeight,
          letterSpacing: layer.letterSpacing,
          textAlign: layer.textAlign,
          textTransform: layer.textTransform,
        }));
        return;
      }

      const ov = widgetOverrides[nodeId];
      setAttributes((prev) => ({
        ...prev,
        selectedNodeId: nodeId,
        objectName: name,
        objectType: type,
        x: ov?.dx ?? prev.x,
        y: ov?.dy ?? prev.y,
        opacity: ov?.opacity ?? 100,
        angle: ov?.rotation ?? prev.angle,
        cornerRadius: ov?.cornerRadius ?? prev.cornerRadius,
        strokeColor: ov?.strokeColor ?? prev.strokeColor,
        strokeWidth: ov?.strokeWidth ?? prev.strokeWidth,
        strokeVisible: ov?.strokeVisible ?? true,
        fillColor: ov?.fillColor ?? prev.fillColor,
        textContent: ov?.textContent ?? prev.textContent,
      }));
    },
    [hmiLayers, widgetOverrides]
  );

  const handleCreateLayer = useCallback(
    (
      kind: HmiLayer['kind'],
      rect: { x: number; y: number; w: number; h: number },
      customName?: string,
      customText?: string
    ) => {
      const id = `layer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const count = hmiLayers.length + 1;
      const labelMap: Record<HmiLayer['kind'], string> = {
        frame: `Frame ${count}`,
        rectangle: `Panel ${count}`,
        vector: `Indicator ${count}`,
        pen: `Needle Path ${count}`,
        text: `Label ${count}`,
      };
      const layerName = customName || labelMap[kind];
      const layerText =
        customText ?? (kind === 'text' ? 'DRIVE MODE' : kind === 'frame' ? 'HMI Container' : '');

      const newLayer: HmiLayer = {
        id,
        name: layerName,
        kind,
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h,
        rotation: 0,
        cornerRadius: kind === 'rectangle' ? 8 : kind === 'frame' ? 4 : 0,
        opacity: 100,
        zOrder: 1000 + count * 10,
        fillColor: kind === 'text' ? '#E5EAF2' : kind === 'frame' ? '#1E293B' : '#24B0FF',
        fillOpacity: kind === 'frame' ? 20 : 85,
        fillBlend: 'Normal',
        fillVisible: kind !== 'frame',
        strokeColor: kind === 'frame' ? '#10B981' : '#24B0FF',
        strokeWidth: kind === 'text' ? 0 : 1,
        strokeOpacity: 100,
        strokeBlend: 'Normal',
        strokeVisible: kind !== 'text',
        strokeAlign: 'Outside',
        tintColor: '#FF24F6',
        tintVisible: false,
        shadowColor: '#F59E0B',
        shadowVisible: false,
        backgroundBlur: 0,
        blurVisible: false,
        text: layerText,
        fontFamily: 'Saira Semi Condensed',
        fontWeight: 'SemiBold',
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0,
        textAlign: 'center',
        textTransform: 'uppercase',
        visible: true,
        locked: false,
      };
      setHmiLayers((prev) => [...prev, newLayer]);
      setSceneTree((prev) => [
        ...prev,
        {
          id,
          name: newLayer.name,
          type: kind === 'text' ? 'text' : kind === 'frame' ? 'frame' : 'shape',
          visible: true,
          locked: false,
          layerId: id,
        },
      ]);
      setAttributes((prev) => ({
        ...prev,
        selectedNodeId: id,
        objectName: newLayer.name,
        objectType: kind === 'frame' ? 'Frame' : kind === 'text' ? 'Text' : 'Rectangle',
        x: newLayer.x,
        y: newLayer.y,
        w: newLayer.w,
        h: newLayer.h,
        angle: 0,
        cornerRadius: newLayer.cornerRadius,
        opacity: newLayer.opacity,
        zOrder: newLayer.zOrder,
        fillColor: newLayer.fillColor,
        fillOpacity: newLayer.fillOpacity,
        fillVisible: newLayer.fillVisible,
        strokeColor: newLayer.strokeColor,
        strokeWidth: newLayer.strokeWidth,
        strokeVisible: newLayer.strokeVisible ?? true,
        tintVisible: false,
        shadowVisible: false,
        blurVisible: false,
        textContent: newLayer.text,
        fontFamily: newLayer.fontFamily,
        fontWeight: newLayer.fontWeight,
        fontSize: newLayer.fontSize,
        backgroundBlur: newLayer.backgroundBlur,
      }));
      appendLog(
        'info',
        `Canvas::CreateElement(${kind}, ${newLayer.w}x${newLayer.h}) -> "${newLayer.name}"`
      );
    },
    [hmiLayers.length, appendLog]
  );

  const handleUpdateLayer = useCallback((layerId: string, patch: Partial<HmiLayer>) => {
    setHmiLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, ...patch } : l)));
    setAttributes((prev) => {
      if (prev.selectedNodeId !== layerId) return prev;
      return {
        ...prev,
        x: patch.x ?? prev.x,
        y: patch.y ?? prev.y,
        w: patch.w ?? prev.w,
        h: patch.h ?? prev.h,
        angle: patch.rotation ?? prev.angle,
        textContent: patch.text ?? prev.textContent,
      };
    });
  }, []);

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      setHmiLayers((prev) => prev.filter((l) => l.id !== layerId));
      setSceneTree((prev) => prev.filter((n) => n.id !== layerId));
      setAttributes((prev) =>
        prev.selectedNodeId === layerId ? { ...prev, selectedNodeId: 'minutes-label' } : prev
      );
      appendLog('info', `Canvas::DeleteLayer(${layerId})`);
    },
    [appendLog]
  );

  const handleDuplicateSelected = useCallback(() => {
    const layer = hmiLayers.find((l) => l.id === attributes.selectedNodeId);
    if (layer) {
      handleCreateLayer(
        layer.kind,
        { x: layer.x + 16, y: layer.y + 16, w: layer.w, h: layer.h },
        `${layer.name} Copy`,
        layer.text
      );
    } else {
      handleCreateLayer('rectangle', { x: 240, y: 110, w: 104, h: 52 });
    }
  }, [hmiLayers, attributes.selectedNodeId, handleCreateLayer]);

  const handleDeletePrimitive = useCallback(
    (primitiveId: string) => {
      setAddedPrimitives((prev) => prev.filter((p) => p.id !== primitiveId));
      setSceneTree((prev) => prev.filter((n) => n.id !== primitiveId));
      appendLog('info', `Scene::DeletePrimitive(${primitiveId})`);
    },
    [appendLog]
  );

  const handleDeleteSelected = useCallback(() => {
    const isLayer = hmiLayers.some((l) => l.id === attributes.selectedNodeId);
    if (isLayer) {
      handleDeleteLayer(attributes.selectedNodeId);
      return;
    }
    const isPrim = addedPrimitives.some((p) => p.id === attributes.selectedNodeId);
    if (isPrim) {
      handleDeletePrimitive(attributes.selectedNodeId);
      return;
    }
    const isLight = addedLights.some((l) => l.id === attributes.selectedNodeId);
    if (isLight) {
      setAddedLights((prev) => prev.filter((l) => l.id !== attributes.selectedNodeId));
      setSceneTree((prev) => prev.filter((n) => n.id !== attributes.selectedNodeId));
      appendLog('info', `Scene::DeleteLight(${attributes.selectedNodeId})`);
    }
  }, [
    hmiLayers,
    addedPrimitives,
    addedLights,
    attributes.selectedNodeId,
    handleDeleteLayer,
    handleDeletePrimitive,
    appendLog,
  ]);

  const handleUpdateWidgetOverride = useCallback(
    (widgetId: string, patch: Partial<BuiltInWidgetOverride>) => {
      setWidgetOverrides((prev) => {
        const current = prev[widgetId] || {
          dx: 0,
          dy: 0,
          scale: 1,
          opacity: 100,
          visible: true,
          locked: false,
        };
        return { ...prev, [widgetId]: { ...current, ...patch } };
      });
      setAttributes((prev) => {
        if (prev.selectedNodeId !== widgetId) return prev;
        return {
          ...prev,
          x: patch.dx ?? prev.x,
          y: patch.dy ?? prev.y,
        };
      });
    },
    []
  );

  const handleUpdateAttributes = useCallback((patch: Partial<AttributesState>) => {
    setAttributes((prev) => {
      const next = { ...prev, ...patch };
      const targetId = next.selectedNodeId;

      setHmiLayers((layers) => {
        const exists = layers.some((l) => l.id === targetId);
        if (!exists) return layers;
        return layers.map((l) =>
          l.id === targetId
            ? {
                ...l,
                name: next.objectName,
                opacity: next.opacity,
                zOrder: next.zOrder,
                x: next.x,
                y: next.y,
                w: Math.max(12, next.w),
                h: Math.max(12, next.h),
                rotation: next.angle,
                cornerRadius: next.cornerRadius,
                fillColor: next.fillColor,
                fillOpacity: next.fillOpacity,
                fillBlend: next.fillBlend,
                fillVisible: next.fillVisible,
                strokeColor: next.strokeColor,
                strokeWidth: next.strokeWidth,
                strokeOpacity: next.strokeOpacity,
                strokeBlend: next.strokeBlend,
                strokeVisible: next.strokeVisible,
                strokeAlign: next.strokeAlign,
                tintColor: next.tintColor,
                tintVisible: next.tintVisible,
                shadowColor: next.shadowColor,
                shadowVisible: next.shadowVisible,
                backgroundBlur: next.backgroundBlur,
                blurVisible: next.blurVisible,
                text: next.textContent,
                fontFamily: next.fontFamily,
                fontWeight: next.fontWeight,
                fontSize: next.fontSize,
                lineHeight: next.lineHeight,
                letterSpacing: next.letterSpacing,
                textAlign: next.textAlign,
                textTransform: next.textTransform,
              }
            : l
        );
      });

      if (patch.objectName !== undefined) {
        setSceneTree((tree) =>
          tree.map((n) => (n.id === targetId ? { ...n, name: next.objectName } : n))
        );
      }

      const builtInIds = ['time', 'minutes-label', 'gauge-right', 'proj-car-viz', 'trip-computer'];
      if (builtInIds.includes(targetId)) {
        setWidgetOverrides((prevOv) => {
          const curr = prevOv[targetId] || {
            dx: 0,
            dy: 0,
            scale: 1,
            opacity: 100,
            visible: true,
            locked: false,
          };
          return {
            ...prevOv,
            [targetId]: {
              ...curr,
              dx: patch.x !== undefined ? patch.x : curr.dx,
              dy: patch.y !== undefined ? patch.y : curr.dy,
              opacity: next.opacity,
              rotation: patch.angle !== undefined ? patch.angle : curr.rotation,
              cornerRadius: patch.cornerRadius !== undefined ? patch.cornerRadius : curr.cornerRadius,
              fillColor: patch.fillColor !== undefined ? patch.fillColor : curr.fillColor,
              strokeColor: patch.strokeColor !== undefined ? patch.strokeColor : curr.strokeColor,
              strokeWidth: patch.strokeWidth !== undefined ? patch.strokeWidth : curr.strokeWidth,
              strokeVisible:
                patch.strokeVisible !== undefined ? patch.strokeVisible : curr.strokeVisible,
              fontSize: patch.fontSize !== undefined ? patch.fontSize : curr.fontSize,
              fontFamily: patch.fontFamily !== undefined ? patch.fontFamily : curr.fontFamily,
              letterSpacing:
                patch.letterSpacing !== undefined ? patch.letterSpacing : curr.letterSpacing,
              textContent: patch.textContent !== undefined ? patch.textContent : curr.textContent,
            },
          };
        });
      }

      return next;
    });
  }, []);

  const handleSaveProject = useCallback(async () => {
    if (!user) {
      setModalInitialTab('auth');
      setModalOpen(true);
      return;
    }
    setIsSavingProject(true);
    try {
      const payload = {
        name: activeProjectName,
        activeTab: activeViewportTab,
        sceneGraph: {
          sceneTree,
          projectTree,
          addedPrimitives,
          addedLights,
          hmiLayers,
          widgetOverrides,
        },
        attributesState: attributes as unknown as Record<string, unknown>,
        logicGraph: {
          nodes: logicNodes,
          wires: logicWires,
          clusterNodes: clusterLogicNodes,
          clusterWires: clusterLogicWires,
        },
        transitions: { tracks, playheadMs, easing },
        codeDocument,
      };
      const url = activeProjectId ? `/api/projects/${activeProjectId}` : '/api/projects';
      const method = activeProjectId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.project) {
        setActiveProjectId(data.project.id);
        setActiveProjectName(data.project.name);
        appendLog('info', `PostgreSQL::SaveProject("${data.project.name}") -> ${data.project.id}`);
      } else {
        appendLog('error', `PostgreSQL::SaveProject failed: ${data.error || 'Unknown error'}`);
      }
    } finally {
      setIsSavingProject(false);
    }
  }, [
    user,
    activeProjectName,
    activeViewportTab,
    sceneTree,
    projectTree,
    addedPrimitives,
    addedLights,
    hmiLayers,
    widgetOverrides,
    attributes,
    logicNodes,
    logicWires,
    clusterLogicNodes,
    clusterLogicWires,
    tracks,
    playheadMs,
    easing,
    codeDocument,
    activeProjectId,
    appendLog,
  ]);

  // Global keyboard shortcuts matching Studio menu bindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
        return;
      }

      if (inInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        handleCreateLayer('frame', { x: 220, y: 90, w: 180, h: 110 });
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsSimulating((s) => !s);
      } else if (e.key === 'Escape') {
        setActiveDrawTool('select');
        setShowContextMenu(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleTriggerLogicStep();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleSaveProject,
    handleDuplicateSelected,
    handleCreateLayer,
    handleTriggerLogicStep,
    handleDeleteSelected,
  ]);

  const handleToggleNodeExpanded = (nodeId: string) => {
    const toggle = (list: SceneNode[]): SceneNode[] =>
      list.map((n) => ({
        ...n,
        expanded: n.id === nodeId ? n.expanded === false : n.expanded,
        children: n.children ? toggle(n.children) : undefined,
      }));
    setSceneTree((prev) => toggle(prev));
  };

  const handleExpandAllSceneNodes = (expanded: boolean) => {
    const walk = (list: SceneNode[]): SceneNode[] =>
      list.map((n) => ({
        ...n,
        expanded: n.children ? expanded : n.expanded,
        children: n.children ? walk(n.children) : undefined,
      }));
    setSceneTree((prev) => walk(prev));
  };

  const handleToggleNodeVisibility = (nodeId: string) => {
    let nextVisible = true;
    const toggle = (list: SceneNode[]): SceneNode[] =>
      list.map((n) => {
        if (n.id === nodeId) {
          nextVisible = n.visible === false;
          return { ...n, visible: nextVisible };
        }
        return { ...n, children: n.children ? toggle(n.children) : undefined };
      });
    setSceneTree((prev) => toggle(prev));
    setHmiLayers((prev) =>
      prev.map((l) => (l.id === nodeId ? { ...l, visible: nextVisible } : l))
    );
    setWidgetOverrides((prev) => {
      const curr = prev[nodeId] || {
        dx: 0,
        dy: 0,
        scale: 1,
        opacity: 100,
        visible: true,
        locked: false,
      };
      return { ...prev, [nodeId]: { ...curr, visible: nextVisible } };
    });
  };

  const handleToggleNodeLock = (nodeId: string) => {
    let nextLocked = false;
    const toggle = (list: SceneNode[]): SceneNode[] =>
      list.map((n) => {
        if (n.id === nodeId) {
          nextLocked = !n.locked;
          return { ...n, locked: nextLocked };
        }
        return { ...n, children: n.children ? toggle(n.children) : undefined };
      });
    setSceneTree((prev) => toggle(prev));
    setHmiLayers((prev) =>
      prev.map((l) => (l.id === nodeId ? { ...l, locked: nextLocked } : l))
    );
    setWidgetOverrides((prev) => {
      const curr = prev[nodeId] || {
        dx: 0,
        dy: 0,
        scale: 1,
        opacity: 100,
        visible: true,
        locked: false,
      };
      return { ...prev, [nodeId]: { ...curr, locked: nextLocked } };
    });
  };

  const handleSelectSceneNode = (node: SceneNode) => {
    const typeLabel =
      node.type === 'text'
        ? 'Text'
        : node.type === 'clock'
        ? 'Clock'
        : node.type === 'frame'
        ? 'Frame'
        : node.type === 'mesh'
        ? '3D Mesh'
        : 'Rectangle';
    handleSelectElement(node.id, node.name, typeLabel);
  };

  const handleSelectProjectNode = (nodeId: string) => {
    setProjectTree((prev) => prev.map((item) => ({ ...item, active: item.id === nodeId })));
    const chosen = projectTree.find((p) => p.id === nodeId);
    if (chosen?.category === 'Cluster') {
      handleSelectViewportTab('Cluster');
    } else if (chosen?.category === 'Infotainment') {
      handleSelectViewportTab('Infotainment');
    }
  };

  const handleAddPrimitive = (kind: (typeof PRIMITIVE_MENU_ITEMS)[number]) => {
    const newId = `prim-${Date.now()}`;
    setAddedPrimitives((prev) => [...prev, { id: newId, kind }]);
    setSceneTree((prev) => [
      ...prev,
      {
        id: newId,
        name: `${kind} ${addedPrimitives.length + 1}`,
        type: 'mesh',
        primitiveKind: kind,
        visible: true,
        locked: false,
      },
    ]);
    setAttributes((prev) => ({
      ...prev,
      selectedNodeId: newId,
      objectName: `${kind} ${addedPrimitives.length + 1}`,
      objectType: '3D Mesh',
    }));
    handleSelectViewportTab('Cluster');
    appendLog('info', `Scene::CreatePrimitive(${kind}) added to 3D viewport.`);
  };

  const handleAddLight = (lightKind: LightKind3D) => {
    const id = `light-${Date.now()}`;
    setAddedLights((prev) => [
      ...prev,
      {
        id,
        kind: lightKind,
        color: lightKind === 'Rim Light' ? '#38BDF8' : '#FFF4EA',
        intensity: 1.4,
      },
    ]);
    setSceneTree((prev) => [
      ...prev,
      {
        id,
        name: `${lightKind} ${addedLights.length + 1}`,
        type: 'light',
        lightKind,
        visible: true,
        locked: false,
      },
    ]);
    handleSelectViewportTab('Cluster');
    appendLog('info', `Scene::AddLight(${lightKind}) added to 3D scene.`);
  };

  const handleCreateContextElement = (itemLabel: string) => {
    if (itemLabel === 'Label' || itemLabel === 'Text') {
      handleCreateLayer('text', { x: 280, y: 120, w: 128, h: 32 });
      handleSelectViewportTab('Infotainment');
    } else if (itemLabel === 'Group' || itemLabel === 'Overlay') {
      handleCreateLayer('frame', { x: 220, y: 90, w: 180, h: 110 }, itemLabel);
      handleSelectViewportTab('Infotainment');
    } else if (itemLabel === 'Rectangle') {
      handleCreateLayer('rectangle', { x: 260, y: 110, w: 110, h: 56 });
      handleSelectViewportTab('Infotainment');
    } else if (itemLabel === 'Vector') {
      handleCreateLayer('vector', { x: 260, y: 110, w: 64, h: 64 });
      handleSelectViewportTab('Infotainment');
    } else if (itemLabel === 'Pen Path') {
      handleCreateLayer('pen', { x: 260, y: 110, w: 110, h: 60 });
      handleSelectViewportTab('Infotainment');
    } else if (itemLabel === 'Mesh') {
      handleAddPrimitive('Cube');
    } else if (itemLabel === 'Camera') {
      handleSelectViewportTab('Cluster');
      appendLog('info', 'Scene::ActivateViewportCamera() -> Perspective Rig focused.');
    } else {
      handleCreateLayer(
        'rectangle',
        { x: 250, y: 105, w: 132, h: 44 },
        itemLabel,
        itemLabel.toUpperCase()
      );
      handleSelectViewportTab('Infotainment');
    }
  };

  const handleMoveLogicNode = (nodeId: string, x: number, y: number) => {
    setActiveLogicNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n)));
  };

  const handleUpdateLogicNode = (nodeId: string, patch: Partial<LogicNode>) => {
    setActiveLogicNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)));
  };

  const handleDeleteLogicNode = (nodeId: string) => {
    setActiveLogicNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setActiveLogicWires((prev) =>
      prev.filter((w) => w.fromNodeId !== nodeId && w.toNodeId !== nodeId)
    );
  };

  const handleAddLogicNode = (kind: 'event' | 'variable' | 'math', title: string) => {
    const id = `node-${Date.now()}`;
    const newNode: LogicNode = {
      id,
      title,
      nodeType: kind,
      x: 240 + (activeLogicNodes.length % 4) * 35,
      y: 60 + (activeLogicNodes.length % 3) * 28,
      width: 170,
      value: kind === 'variable' ? 0 : undefined,
      enabled: true,
      repeatEnabled: false,
      pins:
        kind === 'event'
          ? [
              {
                id: `${id}-out`,
                label: 'Triggered',
                kind: 'event',
                direction: 'out',
                color: '#E05D56',
              },
            ]
          : kind === 'variable'
          ? [
              { id: `${id}-in`, label: 'Set', kind: 'data', direction: 'in', color: '#45B87A' },
              { id: `${id}-out`, label: 'Value', kind: 'data', direction: 'out', color: '#45B87A' },
            ]
          : [
              { id: `${id}-in1`, label: 'Input 1', kind: 'data', direction: 'in', color: '#45B87A' },
              { id: `${id}-in2`, label: 'Input 2', kind: 'data', direction: 'in', color: '#45B87A' },
              { id: `${id}-out`, label: 'Output', kind: 'data', direction: 'out', color: '#45B87A' },
            ],
    };
    setActiveLogicNodes((prev) => [...prev, newNode]);
    setSelectedLogicNodeId(id);
    appendLog('info', `Logic::AddNode("${title}")`);
  };

  const handleConnectPins = (
    fromNodeId: string,
    fromPinId: string,
    toNodeId: string,
    toPinId: string
  ) => {
    const exists = activeLogicWires.some(
      (w) =>
        w.fromNodeId === fromNodeId &&
        w.fromPinId === fromPinId &&
        w.toNodeId === toNodeId &&
        w.toPinId === toPinId
    );
    if (exists) return;
    setActiveLogicWires((prev) => [
      ...prev,
      {
        id: `wire-${Date.now()}`,
        fromNodeId,
        fromPinId,
        toNodeId,
        toPinId,
        color: '#45B87A',
      },
    ]);
    appendLog('info', `Logic::ConnectPins(${fromNodeId} -> ${toNodeId})`);
  };

  const handleDeleteWire = (wireId: string) => {
    setActiveLogicWires((prev) => prev.filter((w) => w.id !== wireId));
  };

  const handleAlignNodes = (align: 'left' | 'center' | 'right') => {
    setActiveLogicNodes((prev) =>
      prev.map((n, idx) => {
        if (align === 'left') return { ...n, x: 40 + (idx % 2) * 240 };
        if (align === 'right') return { ...n, x: 520 - (idx % 2) * 200 };
        return { ...n, x: 48 + idx * 170, y: idx % 2 === 0 ? 34 : 112 };
      })
    );
  };

  const handleAddKeyframeAtPlayhead = () => {
    setTracks((prev) => [
      ...prev,
      {
        id: `tr-kf-${Date.now()}`,
        label: 'opacity',
        group: 'Position',
        startMs: playheadMs,
        endMs: Math.min(2500, playheadMs + 600),
        color: '#24B0FF',
      },
    ]);
    appendLog('info', `Timeline::AddKeyframe(at=${playheadMs}ms)`);
  };

  const handleMeshTransformSync = useCallback((t: MeshTransform3D) => {
    setAttributes((prev) => ({
      ...prev,
      objectName: t.name,
      objectType: '3D Mesh',
      x: t.x,
      y: t.y,
      z: t.z,
      rotX: t.rotX,
      rotY: t.rotY,
      rotZ: t.rotZ,
      scaleX: t.scaleX,
      scaleY: t.scaleY,
      scaleZ: t.scaleZ,
    }));
  }, []);

  const handleExportHtml = useCallback(() => {
    const blob = new Blob([codeDocument], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cockpit-hmi'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    appendLog('info', `Export::HtmlBundle("${activeProjectName}.html") downloaded.`);
  }, [codeDocument, activeProjectName, appendLog]);

  const handleResetWorkspace = useCallback(() => {
    setSceneTree(DEFAULT_SCENE_TREE);
    setProjectTree(DEFAULT_PROJECT_TREE);
    setAttributes(DEFAULT_ATTRIBUTES);
    setHmiLayers([]);
    setWidgetOverrides({});
    setAddedPrimitives([]);
    setAddedLights([]);
    setLogicNodes(DEFAULT_LOGIC_NODES);
    setLogicWires(DEFAULT_LOGIC_WIRES);
    setClusterLogicNodes(DEFAULT_CLUSTER_LOGIC_NODES);
    setClusterLogicWires(DEFAULT_CLUSTER_LOGIC_WIRES);
    setTracks(DEFAULT_TRANSITION_TRACKS);
    setPlayheadMs(500);
    setEasing(DEFAULT_EASING_CONFIG);
    setCodeDocument(DEFAULT_CODE_DOCUMENT);
    setTelemetry(DEFAULT_TELEMETRY_SNAPSHOT);
    setIsSimulating(false);
    appendLog('info', 'Workspace::ResetDefaults() completed.');
  }, [appendLog]);

  const handleUseAssetDatabaseItem = (assetName: string) => {
    if (assetName === 'EV_Coupe_Hero.glb') {
      handleAddPrimitive('Dome');
    } else if (assetName === 'Road_Beam_Glow.glsl') {
      handleUpdateAttributes({ shadowVisible: true, shadowColor: '#E5A28E' });
      appendLog('info', `Asset::ApplyShader("${assetName}") -> Glow active.`);
    } else if (assetName === 'Gauge_Needle_Mask.png') {
      handleCreateLayer('pen', { x: 250, y: 110, w: 120, h: 60 }, 'Gauge Needle Mask');
      handleSelectViewportTab('Infotainment');
    } else if (assetName === 'SairaSemiCondensed.ttf') {
      handleUpdateAttributes({ fontFamily: 'Saira Semi Condensed' });
      appendLog('info', `Asset::ApplyFont("${assetName}") -> Saira Semi Condensed.`);
    } else {
      handleCreateLayer(
        'rectangle',
        { x: 240, y: 105, w: 140, h: 48 },
        assetName.replace(/\.[^/.]+$/, ''),
        assetName
      );
      handleSelectViewportTab('Infotainment');
    }
  };

  const handleImportAssetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['html', 'htm', 'svg', 'txt', 'json'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        if (ext === 'html' || ext === 'htm') {
          setCodeDocument(text);
          setRightBottomTab('Code Editor');
        } else if (ext === 'txt') {
          handleCreateLayer(
            'text',
            { x: 240, y: 105, w: 160, h: 36 },
            file.name,
            text.slice(0, 60) || file.name
          );
        } else {
          setCodeDocument(text);
          handleCreateLayer(
            ext === 'svg' ? 'vector' : 'rectangle',
            { x: 240, y: 105, w: 120, h: 64 },
            file.name,
            file.name
          );
        }
        appendLog('info', `Asset::ImportFile("${file.name}", ${file.size} bytes)`);
      };
      reader.readAsText(file);
    } else {
      handleCreateLayer(
        'rectangle',
        { x: 240, y: 105, w: 140, h: 52 },
        file.name,
        file.name
      );
      appendLog('info', `Asset::ImportBinary("${file.name}", ${file.size} bytes)`);
    }
  };

  const handleSaveNewProject = async (
    name: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Authentication required' };
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          activeTab: activeViewportTab,
          sceneGraph: {
            sceneTree,
            projectTree,
            addedPrimitives,
            addedLights,
            hmiLayers,
            widgetOverrides,
          },
          attributesState: attributes as unknown as Record<string, unknown>,
          logicGraph: {
            nodes: logicNodes,
            wires: logicWires,
            clusterNodes: clusterLogicNodes,
            clusterWires: clusterLogicWires,
          },
          transitions: { tracks, playheadMs, easing },
          codeDocument,
        }),
      });
      const data = await res.json();
      if (res.ok && data.project) {
        setActiveProjectId(data.project.id);
        setActiveProjectName(data.project.name);
        appendLog('info', `PostgreSQL::CreateProject("${data.project.name}") -> ${data.project.id}`);
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Failed to save project' };
    } catch {
      return { ok: false, error: 'Network error while saving project' };
    }
  };

  const handleLoadProject = async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return;
    const { project } = await res.json();
    if (!project) return;
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
    if (
      project.activeTab === 'Root' ||
      project.activeTab === 'Cluster' ||
      project.activeTab === 'Infotainment'
    ) {
      setActiveViewportTab(project.activeTab);
    }
    if (project.sceneGraph?.sceneTree) setSceneTree(project.sceneGraph.sceneTree);
    if (project.sceneGraph?.projectTree) setProjectTree(project.sceneGraph.projectTree);
    if (project.sceneGraph?.addedPrimitives) setAddedPrimitives(project.sceneGraph.addedPrimitives);
    if (project.sceneGraph?.addedLights) setAddedLights(project.sceneGraph.addedLights);
    if (project.sceneGraph?.hmiLayers) setHmiLayers(project.sceneGraph.hmiLayers);
    if (project.sceneGraph?.widgetOverrides) setWidgetOverrides(project.sceneGraph.widgetOverrides);
    if (project.attributesState) setAttributes(project.attributesState);
    if (project.logicGraph?.nodes) setLogicNodes(project.logicGraph.nodes);
    if (project.logicGraph?.wires) setLogicWires(project.logicGraph.wires);
    if (project.logicGraph?.clusterNodes) setClusterLogicNodes(project.logicGraph.clusterNodes);
    if (project.logicGraph?.clusterWires) setClusterLogicWires(project.logicGraph.clusterWires);
    if (project.transitions?.tracks) setTracks(project.transitions.tracks);
    if (project.transitions?.easing) setEasing(project.transitions.easing);
    if (typeof project.codeDocument === 'string') setCodeDocument(project.codeDocument);
    appendLog('info', `PostgreSQL::LoadProject("${project.name}")`);
  };

  const isEditingCustomLayer = hmiLayers.some((l) => l.id === attributes.selectedNodeId);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#121419] overflow-hidden">
      <TopStudioBar
        activeViewportTab={activeViewportTab}
        onSelectViewportTab={handleSelectViewportTab}
        bottomPanelMode={bottomPanelMode}
        onSelectBottomPanelMode={(mode) => {
          setBottomPanelMode(mode);
          setIsBottomCollapsed(false);
        }}
        isBottomCollapsed={isBottomCollapsed}
        onToggleBottomCollapsed={() => setIsBottomCollapsed((c) => !c)}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating((s) => !s)}
        onStopSimulation={() => {
          setIsSimulating(false);
          setPlayheadMs(500);
        }}
        onTriggerLogicStep={handleTriggerLogicStep}
        user={user}
        projectName={activeProjectName}
        isSavingProject={isSavingProject}
        onSaveProject={handleSaveProject}
        onExportHtml={handleExportHtml}
        onDuplicateSelected={handleDuplicateSelected}
        onDeleteSelected={handleDeleteSelected}
        onCreateQuickLayer={(kind) => {
          handleCreateLayer(kind, { x: 240, y: 100, w: 120, h: kind === 'text' ? 32 : 64 });
          handleSelectViewportTab('Infotainment');
        }}
        onResetWorkspace={handleResetWorkspace}
        onOpenAuthIngestModal={(initialTab = 'auth') => {
          setModalInitialTab(initialTab);
          setModalOpen(true);
        }}
        mobilePane={mobilePane}
        onSelectMobilePane={setMobilePane}
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[248px_1fr_284px] xl:grid-cols-[258px_1fr_296px]">
        <div
          className={`${
            mobilePane === 'outliner' ? 'flex' : 'hidden'
          } lg:flex flex-col min-h-0 overflow-hidden`}
        >
          <LeftOutlinerDock
            sceneTree={sceneTree}
            projectTree={projectTree}
            selectedNodeId={attributes.selectedNodeId}
            onSelectSceneNode={handleSelectSceneNode}
            onToggleNodeExpanded={handleToggleNodeExpanded}
            onToggleNodeVisibility={handleToggleNodeVisibility}
            onToggleNodeLock={handleToggleNodeLock}
            onExpandAllSceneNodes={handleExpandAllSceneNodes}
            onSelectProjectNode={handleSelectProjectNode}
            onAddPrimitive={handleAddPrimitive}
            onAddLight={handleAddLight}
            onCreateContextElement={handleCreateContextElement}
            onDuplicateSelected={handleDuplicateSelected}
            onDeleteSelected={handleDeleteSelected}
            onClearConsoleLogs={() => setLogs([])}
            logs={logs}
            showContextMenu={showContextMenu}
            onToggleContextMenu={setShowContextMenu}
          />
        </div>

        <main
          className={`${
            mobilePane === 'canvas' || mobilePane === 'logic' ? 'flex' : 'hidden'
          } lg:flex flex-col min-w-0 min-h-0 overflow-hidden`}
        >
          <div className="h-[28px] bg-[#16181D] border-b border-[#232730] flex items-center justify-between px-1 shrink-0">
            <div className="flex items-center h-full">
              {(
                [
                  { id: 'Root', icon: Layers },
                  { id: 'Cluster', icon: Cpu },
                  { id: 'Infotainment', icon: Monitor },
                ] as Array<{ id: ViewportTab; icon: React.ComponentType<{ className?: string }> }>
              )
                .filter((t) => openViewportTabs.includes(t.id))
                .map((t) => {
                  const Icon = t.icon;
                  const active = activeViewportTab === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectViewportTab(t.id)}
                      className={`h-full px-3 flex items-center gap-2 text-[11px] border-r border-[#232730] cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#1F232B] text-white border-t-2 border-t-[#24B0FF]'
                          : 'text-[#8E95A2] hover:text-white bg-[#15171C]'
                      }`}
                    >
                      <Icon className="w-3 h-3 text-[#60A5FA]" />
                      <span>{t.id}</span>
                      {openViewportTabs.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = openViewportTabs.filter((x) => x !== t.id);
                            setOpenViewportTabs(next);
                            if (activeViewportTab === t.id && next[0]) {
                              setActiveViewportTab(next[0]);
                            }
                          }}
                          className="opacity-50 hover:opacity-100 hover:text-white cursor-pointer"
                          title={`Close ${t.id} tab`}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              {openViewportTabs.length < 3 && (
                <button
                  type="button"
                  onClick={() => setOpenViewportTabs(['Root', 'Cluster', 'Infotainment'])}
                  className="px-2 h-full text-[#6B7280] hover:text-white cursor-pointer"
                  title="Restore All Viewport Tabs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 pr-2 text-[10px] text-[#6B7280] font-mono-code">
              <span>{telemetry.sourceSystem}</span>
            </div>
          </div>

          <div
            className={`${
              mobilePane === 'logic' ? 'hidden lg:flex' : 'flex'
            } flex-1 min-h-0 flex-col`}
          >
            {activeViewportTab === 'Infotainment' && (
              <ClusterHmiCanvas
                telemetry={telemetry}
                attributes={attributes}
                selectedNodeId={attributes.selectedNodeId}
                onSelectElement={handleSelectElement}
                hmiLayers={hmiLayers}
                onCreateLayer={handleCreateLayer}
                onUpdateLayer={handleUpdateLayer}
                onDeleteLayer={handleDeleteLayer}
                widgetOverrides={widgetOverrides}
                onUpdateWidgetOverride={handleUpdateWidgetOverride}
                onChangeGear={(gear) => setTelemetry((prev) => ({ ...prev, gear }))}
                activeDrawTool={activeDrawTool}
                onChangeDrawTool={setActiveDrawTool}
                isSimulating={isSimulating}
                playheadMs={playheadMs}
                tracks={tracks}
                easing={easing}
              />
            )}

            {activeViewportTab === 'Cluster' && (
              <Viewport3D
                addedPrimitives={addedPrimitives}
                addedLights={addedLights}
                onAddPrimitive={handleAddPrimitive}
                onDeleteSelectedPrimitive={handleDeletePrimitive}
                attributes={attributes}
                onSelectMesh={(name, t) => handleMeshTransformSync({ ...t, name })}
                onMeshTransformChange={handleMeshTransformSync}
              />
            )}

            {activeViewportTab === 'Root' && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0 divide-y md:divide-y-0 md:divide-x divide-[#232730]">
                <ClusterHmiCanvas
                  telemetry={telemetry}
                  attributes={attributes}
                  selectedNodeId={attributes.selectedNodeId}
                  onSelectElement={handleSelectElement}
                  hmiLayers={hmiLayers}
                  onCreateLayer={handleCreateLayer}
                  onUpdateLayer={handleUpdateLayer}
                  onDeleteLayer={handleDeleteLayer}
                  widgetOverrides={widgetOverrides}
                  onUpdateWidgetOverride={handleUpdateWidgetOverride}
                  onChangeGear={(gear) => setTelemetry((prev) => ({ ...prev, gear }))}
                  activeDrawTool={activeDrawTool}
                  onChangeDrawTool={setActiveDrawTool}
                  isSimulating={isSimulating}
                  playheadMs={playheadMs}
                  tracks={tracks}
                  easing={easing}
                />
                <Viewport3D
                  addedPrimitives={addedPrimitives}
                  addedLights={addedLights}
                  onAddPrimitive={handleAddPrimitive}
                  onDeleteSelectedPrimitive={handleDeletePrimitive}
                  attributes={attributes}
                  onSelectMesh={(name, t) => handleMeshTransformSync({ ...t, name })}
                  onMeshTransformChange={handleMeshTransformSync}
                />
              </div>
            )}
          </div>

          {!isBottomCollapsed && (
            <div
              className={`${
                mobilePane === 'logic' ? 'flex-1' : 'hidden lg:flex lg:h-[258px]'
              } min-h-0 shrink-0 flex flex-col`}
            >
              <BottomWorkbench
                mode={bottomPanelMode}
                onChangeMode={setBottomPanelMode}
                logicSubTab={logicSubTab}
                onChangeLogicSubTab={setLogicSubTab}
                nodes={activeLogicNodes}
                wires={activeLogicWires}
                selectedLogicNodeId={selectedLogicNodeId}
                onSelectLogicNode={setSelectedLogicNodeId}
                onMoveLogicNode={handleMoveLogicNode}
                onUpdateLogicNode={handleUpdateLogicNode}
                onDeleteLogicNode={handleDeleteLogicNode}
                onAddLogicNode={handleAddLogicNode}
                onConnectPins={handleConnectPins}
                onDeleteWire={handleDeleteWire}
                onClearWires={() => {
                  setActiveLogicWires([]);
                  appendLog('info', `Logic::ClearWires(${logicSubTab})`);
                }}
                onResetLogicGraph={() => {
                  if (logicSubTab === 'Infotainment') {
                    setLogicNodes(DEFAULT_LOGIC_NODES);
                    setLogicWires(DEFAULT_LOGIC_WIRES);
                  } else {
                    setClusterLogicNodes(DEFAULT_CLUSTER_LOGIC_NODES);
                    setClusterLogicWires(DEFAULT_CLUSTER_LOGIC_WIRES);
                  }
                  appendLog('info', `Logic::ResetGraph(${logicSubTab})`);
                }}
                onAlignNodes={handleAlignNodes}
                onTriggerLogicStep={handleTriggerLogicStep}
                tracks={tracks}
                onUpdateTrack={(trackId, patch) =>
                  setTracks((prev) =>
                    prev.map((t) => (t.id === trackId ? { ...t, ...patch } : t))
                  )
                }
                onDeleteTrack={(trackId) => {
                  setTracks((prev) => prev.filter((t) => t.id !== trackId));
                  appendLog('info', `Timeline::DeleteTrack(${trackId})`);
                }}
                onAddKeyframeAtPlayhead={handleAddKeyframeAtPlayhead}
                playheadMs={playheadMs}
                onChangePlayheadMs={setPlayheadMs}
                easing={easing}
                onUpdateEasing={(patch) => setEasing((prev) => ({ ...prev, ...patch }))}
                currentSpeed={telemetry.speedKmh}
                onUseAssetDatabaseItem={handleUseAssetDatabaseItem}
                onImportAssetFile={handleImportAssetFile}
              />
            </div>
          )}
        </main>

        <div
          className={`${
            mobilePane === 'inspector' ? 'flex' : 'hidden'
          } lg:flex flex-col min-h-0 overflow-hidden`}
        >
          <RightInspectorDock
            attributes={attributes}
            onUpdateAttributes={handleUpdateAttributes}
            bottomTab={rightBottomTab}
            onChangeBottomTab={setRightBottomTab}
            codeDocument={codeDocument}
            onChangeCodeDocument={setCodeDocument}
            onResetCodeDocument={() => setCodeDocument(DEFAULT_CODE_DOCUMENT)}
            onExportHtml={handleExportHtml}
            onClearConsoleLogs={() => setLogs([])}
            onDuplicateSelected={handleDuplicateSelected}
            onDeleteSelected={handleDeleteSelected}
            onInsertAssetLayer={(kind, label) => {
              handleCreateLayer(
                kind,
                { x: 240, y: 105, w: 120, h: kind === 'text' ? 32 : 52 },
                label,
                label
              );
              handleSelectViewportTab('Infotainment');
            }}
            onImportAssetFile={handleImportAssetFile}
            logs={logs}
            isEditingLayer={isEditingCustomLayer}
          />
        </div>
      </div>

      <AuthAndIngestModal
        isOpen={modalOpen}
        initialTab={modalInitialTab}
        onClose={() => setModalOpen(false)}
        user={user}
        onUserChange={(nextUser) => {
          setUser(nextUser);
          if (!nextUser) {
            setActiveProjectId(null);
            setActiveProjectName('EV Cockpit HMI');
            lastIngestKeyRef.current = null;
          }
        }}
        activeProjectId={activeProjectId}
        activeProjectName={activeProjectName}
        onSelectProject={handleLoadProject}
        onDeleteProject={(deletedId) => {
          if (activeProjectId === deletedId) {
            setActiveProjectId(null);
            setActiveProjectName('EV Cockpit HMI');
          }
          appendLog('info', `PostgreSQL::DeleteProject(${deletedId})`);
        }}
        onSaveNewProject={handleSaveNewProject}
        onRefreshTelemetry={fetchLatestTelemetry}
      />
    </div>
  );
}
