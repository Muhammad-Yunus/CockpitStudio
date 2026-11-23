import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Layers, Cpu, X } from 'lucide-react';
import { TopStudioBar } from './components/TopStudioBar';
import { LeftOutlinerDock } from './components/LeftOutlinerDock';
import { ClusterHmiCanvas } from './components/ClusterHmiCanvas';
import { Viewport3D } from './components/Viewport3D';
import { BottomWorkbench } from './components/BottomWorkbench';
import { RightInspectorDock } from './components/RightInspectorDock';
import { AuthAndIngestModal } from './components/AuthAndIngestModal';
import {
  DEFAULT_ATTRIBUTES,
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
  AttributesState,
  BottomPanelMode,
  BuiltInWidgetOverride,
  CanvasDrawTool,
  ConsoleLogEntry,
  EasingConfig,
  HmiLayer,
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
  const [isFramedWindow, setIsFramedWindow] = useState(true);
  const [activeViewportTab, setActiveViewportTab] = useState<ViewportTab>('Infotainment');
  const [bottomPanelMode, setBottomPanelMode] = useState<BottomPanelMode>('Logic Editor');
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

  const [logicNodes, setLogicNodes] = useState<LogicNode[]>(DEFAULT_LOGIC_NODES);
  const [logicWires, setLogicWires] = useState<LogicWire[]>(DEFAULT_LOGIC_WIRES);
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
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Auth & PostgreSQL persistence state
  const [user, setUser] = useState<StudioUser | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string>('EV Cockpit HMI');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'auth' | 'projects' | 'ingest'>('auth');

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
  }, [user, activeProjectId]);

  useEffect(() => {
    if (!user || !activeProjectId) return;
    fetchLatestTelemetry();
    const timer = window.setInterval(fetchLatestTelemetry, 3000);
    return () => window.clearInterval(timer);
  }, [user, activeProjectId, fetchLatestTelemetry]);

  // Execute Logic Editor step
  const handleTriggerLogicStep = useCallback(() => {
    const keyNode = logicNodes.find((n) => n.id === 'node-on-key');
    if (keyNode && !keyNode.enabled) {
      appendLog('info', 'Logic::OnKeyPressDown skipped (node disabled).');
      return;
    }
    const stepNode = logicNodes.find((n) => n.id === 'node-step-in');
    const step = typeof stepNode?.value === 'number' ? stepNode.value : 1;

    setTelemetry((prev) => ({
      ...prev,
      speedKmh: Math.max(0, prev.speedKmh - step),
    }));
    appendLog('info', `Logic::Substract executed -> Speed value decremented by ${step} km/h.`);
  }, [logicNodes, appendLog]);

  useEffect(() => {
    if (!isSimulating) return;
    const interval = window.setInterval(() => {
      setPlayheadMs((prev) => (prev + 25) % 2500);
    }, 50);
    return () => window.clearInterval(interval);
  }, [isSimulating]);

  const handleSelectViewportTab = (tab: ViewportTab) => {
    setActiveViewportTab(tab);
    if (tab === 'Cluster') {
      setBottomPanelMode('Transition Editor');
      setRightBottomTab('Code Editor');
    } else if (tab === 'Infotainment') {
      setBottomPanelMode('Logic Editor');
      setRightBottomTab('Asset manager');
    }
  };

  // Select any node or HMI layer and load its properties into Attributes Editor
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
          fillVisible: layer.fillVisible,
          strokeColor: layer.strokeColor,
          strokeWidth: layer.strokeWidth,
          strokeAlign: layer.strokeAlign,
          tintColor: layer.tintColor,
          shadowColor: layer.shadowColor,
          backgroundBlur: layer.backgroundBlur,
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
        fillColor: ov?.fillColor ?? prev.fillColor,
      }));
    },
    [hmiLayers, widgetOverrides]
  );

  // Create new HMI Layer on Cluster Canvas & add to Scene Outliner
  const handleCreateLayer = useCallback(
    (kind: HmiLayer['kind'], rect: { x: number; y: number; w: number; h: number }) => {
      const id = `layer-${Date.now()}`;
      const count = hmiLayers.length + 1;
      const labelMap: Record<HmiLayer['kind'], string> = {
        frame: `Frame ${count}`,
        rectangle: `Panel ${count}`,
        vector: `Indicator ${count}`,
        pen: `Needle Path ${count}`,
        text: `Label ${count}`,
      };
      const newLayer: HmiLayer = {
        id,
        name: labelMap[kind],
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
        fillVisible: kind !== 'frame',
        strokeColor: kind === 'frame' ? '#10B981' : '#24B0FF',
        strokeWidth: kind === 'text' ? 0 : 1,
        strokeAlign: 'Outside',
        tintColor: '#FF24F6',
        shadowColor: '#F59E0B',
        backgroundBlur: 0,
        text: kind === 'text' ? 'DRIVE MODE' : kind === 'frame' ? 'HMI Container' : '',
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
          type:
            kind === 'text'
              ? 'text'
              : kind === 'frame'
              ? 'frame'
              : 'shape',
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
        textContent: newLayer.text,
        fontFamily: newLayer.fontFamily,
        fontWeight: newLayer.fontWeight,
        fontSize: newLayer.fontSize,
        backgroundBlur: newLayer.backgroundBlur,
      }));
      appendLog('info', `Canvas::CreateElement(${kind}, ${newLayer.w}x${newLayer.h}) -> "${newLayer.name}"`);
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

  // Update Attributes Editor -> propagate changes directly to selected HmiLayer or BuiltInWidgetOverride
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
                fillVisible: next.fillVisible,
                strokeColor: next.strokeColor,
                strokeWidth: next.strokeWidth,
                strokeAlign: next.strokeAlign,
                tintColor: next.tintColor,
                shadowColor: next.shadowColor,
                backgroundBlur: next.backgroundBlur,
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

      // Also sync Scene Outliner name if renamed
      if (patch.objectName !== undefined) {
        setSceneTree((tree) =>
          tree.map((n) => (n.id === targetId ? { ...n, name: next.objectName } : n))
        );
      }

      // If built-in widget, apply relevant visual overrides
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
              fontSize: patch.fontSize !== undefined ? patch.fontSize : curr.fontSize,
              fontFamily: patch.fontFamily !== undefined ? patch.fontFamily : curr.fontFamily,
            },
          };
        });
      }

      return next;
    });
  }, []);

  // Keyboard listener (ArrowDown logic step + Delete selected HMI layer)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleTriggerLogicStep();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const isCustomLayer = hmiLayers.some((l) => l.id === attributes.selectedNodeId);
        if (isCustomLayer) {
          e.preventDefault();
          handleDeleteLayer(attributes.selectedNodeId);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTriggerLogicStep, hmiLayers, attributes.selectedNodeId, handleDeleteLayer]);

  const handleToggleNodeExpanded = (nodeId: string) => {
    const toggle = (list: SceneNode[]): SceneNode[] =>
      list.map((n) => ({
        ...n,
        expanded: n.id === nodeId ? n.expanded === false : n.expanded,
        children: n.children ? toggle(n.children) : undefined,
      }));
    setSceneTree((prev) => toggle(prev));
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
        ? node.primitiveKind || '3D Mesh'
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
    setActiveViewportTab('Cluster');
    appendLog('info', `Scene::CreatePrimitive(${kind}) added to 3D viewport.`);
  };

  const handleCreateContextElement = (itemLabel: string) => {
    if (itemLabel === 'Label' || itemLabel === 'Text') {
      handleCreateLayer('text', { x: 280, y: 120, w: 128, h: 32 });
      setActiveViewportTab('Infotainment');
    } else if (itemLabel === 'Group' || itemLabel === 'Overlay') {
      handleCreateLayer('frame', { x: 220, y: 90, w: 180, h: 110 });
      setActiveViewportTab('Infotainment');
    } else if (itemLabel === 'Rectangle') {
      handleCreateLayer('rectangle', { x: 260, y: 110, w: 110, h: 56 });
      setActiveViewportTab('Infotainment');
    } else if (itemLabel === 'Vector') {
      handleCreateLayer('vector', { x: 260, y: 110, w: 64, h: 64 });
      setActiveViewportTab('Infotainment');
    } else if (itemLabel === 'Pen Path') {
      handleCreateLayer('pen', { x: 260, y: 110, w: 110, h: 60 });
      setActiveViewportTab('Infotainment');
    } else if (itemLabel === 'Mesh') {
      handleAddPrimitive('Cube');
    } else {
      appendLog('info', `Scene::InsertComponent("${itemLabel}")`);
    }
  };

  const handleMoveLogicNode = (nodeId: string, x: number, y: number) => {
    setLogicNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n)));
  };

  const handleUpdateLogicNode = (nodeId: string, patch: Partial<LogicNode>) => {
    setLogicNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)));
  };

  const handleDeleteLogicNode = (nodeId: string) => {
    setLogicNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setLogicWires((prev) =>
      prev.filter((w) => w.fromNodeId !== nodeId && w.toNodeId !== nodeId)
    );
  };

  const handleAddLogicNode = (kind: 'event' | 'variable' | 'math', title: string) => {
    const id = `node-${Date.now()}`;
    const newNode: LogicNode = {
      id,
      title,
      nodeType: kind,
      x: 240 + (logicNodes.length % 4) * 35,
      y: 60 + (logicNodes.length % 3) * 28,
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
              { id: `${id}-out`, label: 'Output', kind: 'data', direction: 'out', color: '#45B87A' },
            ],
    };
    setLogicNodes((prev) => [...prev, newNode]);
    setSelectedLogicNodeId(id);
    appendLog('info', `Logic::AddNode("${title}")`);
  };

  const handleConnectPins = (
    fromNodeId: string,
    fromPinId: string,
    toNodeId: string,
    toPinId: string
  ) => {
    const exists = logicWires.some(
      (w) =>
        w.fromNodeId === fromNodeId &&
        w.fromPinId === fromPinId &&
        w.toNodeId === toNodeId &&
        w.toPinId === toPinId
    );
    if (exists) return;
    setLogicWires((prev) => [
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
    setLogicWires((prev) => prev.filter((w) => w.id !== wireId));
  };

  const handleAlignNodes = (align: 'left' | 'center' | 'right') => {
    setLogicNodes((prev) =>
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

  const buildProjectPayload = (nameOverride?: string) => ({
    name: nameOverride || activeProjectName,
    activeTab: activeViewportTab,
    sceneGraph: { sceneTree, projectTree, addedPrimitives, hmiLayers, widgetOverrides },
    attributesState: attributes as unknown as Record<string, unknown>,
    logicGraph: { nodes: logicNodes, wires: logicWires },
    transitions: { tracks, playheadMs, easing },
    codeDocument,
  });

  const handleSaveProject = async () => {
    if (!user) {
      setModalInitialTab('auth');
      setModalOpen(true);
      return;
    }
    setIsSavingProject(true);
    try {
      const payload = buildProjectPayload();
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
  };

  const handleSaveNewProject = async (name: string) => {
    if (!user) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildProjectPayload(name)),
    });
    const data = await res.json();
    if (res.ok && data.project) {
      setActiveProjectId(data.project.id);
      setActiveProjectName(data.project.name);
      appendLog('info', `PostgreSQL::CreateProject("${data.project.name}") -> ${data.project.id}`);
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
    if (project.sceneGraph?.hmiLayers) setHmiLayers(project.sceneGraph.hmiLayers);
    if (project.sceneGraph?.widgetOverrides) setWidgetOverrides(project.sceneGraph.widgetOverrides);
    if (project.attributesState) setAttributes(project.attributesState);
    if (project.logicGraph?.nodes) setLogicNodes(project.logicGraph.nodes);
    if (project.logicGraph?.wires) setLogicWires(project.logicGraph.wires);
    if (project.transitions?.tracks) setTracks(project.transitions.tracks);
    if (project.transitions?.easing) setEasing(project.transitions.easing);
    if (typeof project.codeDocument === 'string') setCodeDocument(project.codeDocument);
    appendLog('info', `PostgreSQL::LoadProject("${project.name}")`);
  };

  const isEditingCustomLayer = hmiLayers.some((l) => l.id === attributes.selectedNodeId);

  return (
    <div
      className={`min-h-screen w-full studio-backdrop flex items-center justify-center ${
        isFramedWindow ? 'p-0 lg:p-5 xl:p-7' : 'p-0'
      }`}
    >
      <div
        className={`w-full flex flex-col bg-[#121419] overflow-hidden ${
          isFramedWindow
            ? 'h-screen lg:h-[calc(100vh-2.5rem)] xl:h-[calc(100vh-3.5rem)] lg:max-w-[1540px] lg:rounded-[6px] lg:border lg:border-[#2C313D] lg:shadow-[0_32px_90px_rgba(0,0,0,0.85)]'
            : 'h-screen'
        }`}
      >
        <TopStudioBar
          activeViewportTab={activeViewportTab}
          onSelectViewportTab={handleSelectViewportTab}
          bottomPanelMode={bottomPanelMode}
          onSelectBottomPanelMode={setBottomPanelMode}
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
          onOpenAuthIngestModal={(initialTab = 'auth') => {
            setModalInitialTab(initialTab);
            setModalOpen(true);
          }}
          isFramedWindow={isFramedWindow}
          onToggleFramedWindow={() => setIsFramedWindow((v) => !v)}
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
              onSelectProjectNode={handleSelectProjectNode}
              onAddPrimitive={handleAddPrimitive}
              onCreateContextElement={handleCreateContextElement}
              logs={logs}
              attributes={attributes}
              onUpdateAttributes={handleUpdateAttributes}
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
                ).map((t) => {
                  const Icon = t.icon;
                  const active = activeViewportTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectViewportTab(t.id)}
                      className={`h-full px-3 flex items-center gap-2 text-[11px] border-r border-[#232730] cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#1F232B] text-white border-t-2 border-t-[#24B0FF]'
                          : 'text-[#8E95A2] hover:text-white bg-[#15171C]'
                      }`}
                    >
                      <Icon className="w-3 h-3 text-[#60A5FA]" />
                      <span>{t.id}</span>
                      <X className="w-2.5 h-2.5 opacity-50" />
                    </button>
                  );
                })}
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
                  activeDrawTool={activeDrawTool}
                  onChangeDrawTool={setActiveDrawTool}
                  isSimulating={isSimulating}
                  playheadMs={playheadMs}
                />
              )}

              {activeViewportTab === 'Cluster' && (
                <Viewport3D
                  addedPrimitives={addedPrimitives}
                  onAddPrimitive={handleAddPrimitive}
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
                    activeDrawTool={activeDrawTool}
                    onChangeDrawTool={setActiveDrawTool}
                    isSimulating={isSimulating}
                    playheadMs={playheadMs}
                  />
                  <Viewport3D
                    addedPrimitives={addedPrimitives}
                    onAddPrimitive={handleAddPrimitive}
                    attributes={attributes}
                    onSelectMesh={(name, t) => handleMeshTransformSync({ ...t, name })}
                    onMeshTransformChange={handleMeshTransformSync}
                  />
                </div>
              )}
            </div>

            <div
              className={`${
                mobilePane === 'logic' ? 'flex-1' : 'hidden lg:flex lg:h-[258px]'
              } min-h-0 shrink-0 flex flex-col`}
            >
              <BottomWorkbench
                mode={bottomPanelMode}
                onChangeMode={setBottomPanelMode}
                nodes={logicNodes}
                wires={logicWires}
                selectedLogicNodeId={selectedLogicNodeId}
                onSelectLogicNode={setSelectedLogicNodeId}
                onMoveLogicNode={handleMoveLogicNode}
                onUpdateLogicNode={handleUpdateLogicNode}
                onDeleteLogicNode={handleDeleteLogicNode}
                onAddLogicNode={handleAddLogicNode}
                onConnectPins={handleConnectPins}
                onDeleteWire={handleDeleteWire}
                onAlignNodes={handleAlignNodes}
                onTriggerLogicStep={handleTriggerLogicStep}
                tracks={tracks}
                onAddKeyframeAtPlayhead={handleAddKeyframeAtPlayhead}
                playheadMs={playheadMs}
                onChangePlayheadMs={setPlayheadMs}
                easing={easing}
                onUpdateEasing={(patch) => setEasing((prev) => ({ ...prev, ...patch }))}
                currentSpeed={telemetry.speedKmh}
              />
            </div>
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
              logs={logs}
              isEditingLayer={isEditingCustomLayer}
            />
          </div>
        </div>
      </div>

      <AuthAndIngestModal
        isOpen={modalOpen}
        initialTab={modalInitialTab}
        onClose={() => setModalOpen(false)}
        user={user}
        onUserChange={setUser}
        activeProjectId={activeProjectId}
        activeProjectName={activeProjectName}
        onSelectProject={handleLoadProject}
        onSaveNewProject={handleSaveNewProject}
        onRefreshTelemetry={fetchLatestTelemetry}
      />
    </div>
  );
}
