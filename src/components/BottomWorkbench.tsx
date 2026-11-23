import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Minus,
  Search,
  Menu,
  Zap,
  Box,
  Sliders,
  Binary,
  Braces,
  ChevronDown,
  ChevronRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Play,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Clock,
  FolderOpen,
  X,
  Trash2,
} from 'lucide-react';
import type {
  BottomPanelMode,
  EasingConfig,
  LogicNode,
  LogicWire,
  TransitionTrack,
} from '../types/studio';

interface BottomWorkbenchProps {
  mode: BottomPanelMode;
  onChangeMode: (mode: BottomPanelMode) => void;
  logicSubTab: 'Cluster' | 'Infotainment';
  onChangeLogicSubTab: (tab: 'Cluster' | 'Infotainment') => void;
  nodes: LogicNode[];
  wires: LogicWire[];
  selectedLogicNodeId: string;
  onSelectLogicNode: (nodeId: string) => void;
  onMoveLogicNode: (nodeId: string, x: number, y: number) => void;
  onUpdateLogicNode: (nodeId: string, patch: Partial<LogicNode>) => void;
  onDeleteLogicNode: (nodeId: string) => void;
  onAddLogicNode: (kind: 'event' | 'variable' | 'math', title: string) => void;
  onConnectPins: (fromNodeId: string, fromPinId: string, toNodeId: string, toPinId: string) => void;
  onDeleteWire: (wireId: string) => void;
  onClearWires: () => void;
  onResetLogicGraph: () => void;
  onAlignNodes: (align: 'left' | 'center' | 'right') => void;
  onTriggerLogicStep: () => void;
  tracks: TransitionTrack[];
  onUpdateTrack: (trackId: string, patch: Partial<TransitionTrack>) => void;
  onAddKeyframeAtPlayhead: () => void;
  playheadMs: number;
  onChangePlayheadMs: (ms: number) => void;
  easing: EasingConfig;
  onUpdateEasing: (patch: Partial<EasingConfig>) => void;
  currentSpeed: number;
  onUseAssetDatabaseItem: (assetName: string) => void;
}

export const BottomWorkbench: React.FC<BottomWorkbenchProps> = ({
  mode,
  onChangeMode,
  logicSubTab,
  onChangeLogicSubTab,
  nodes,
  wires,
  selectedLogicNodeId,
  onSelectLogicNode,
  onMoveLogicNode,
  onUpdateLogicNode,
  onDeleteLogicNode,
  onAddLogicNode,
  onConnectPins,
  onDeleteWire,
  onClearWires,
  onResetLogicGraph,
  onAlignNodes,
  onTriggerLogicStep,
  tracks,
  onUpdateTrack,
  onAddKeyframeAtPlayhead,
  playheadMs,
  onChangePlayheadMs,
  easing,
  onUpdateEasing,
  currentSpeed,
  onUseAssetDatabaseItem,
}) => {
  const [openSubTabs, setOpenSubTabs] = useState<Array<'Cluster' | 'Infotainment'>>([
    'Cluster',
    'Infotainment',
  ]);
  const [timelineZoom, setTimelineZoom] = useState<number>(1);
  const [timelineFps, setTimelineFps] = useState<30 | 60 | 120>(60);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [paletteSearchOpen, setPaletteSearchOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [graphSearchOpen, setGraphSearchOpen] = useState(false);
  const [graphQuery, setGraphQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [pendingSourcePin, setPendingSourcePin] = useState<{
    nodeId: string;
    pinId: string;
  } | null>(null);
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [draggingTrack, setDraggingTrack] = useState<{
    id: string;
    startClientX: number;
    origStart: number;
    origEnd: number;
    laneWidth: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        headerMenuOpen &&
        headerMenuRef.current &&
        !headerMenuRef.current.contains(e.target as Node)
      ) {
        setHeaderMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [headerMenuOpen]);

  const selectedNode = nodes.find((n) => n.id === selectedLogicNodeId) || nodes[0];

  const handleNodePointerDown = (e: React.PointerEvent, node: LogicNode) => {
    e.stopPropagation();
    onSelectLogicNode(node.id);
    setDraggingNode({
      id: node.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origX: node.x,
      origY: node.y,
    });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!draggingNode) return;
    const dx = e.clientX - draggingNode.startMouseX;
    const dy = e.clientY - draggingNode.startMouseY;
    onMoveLogicNode(
      draggingNode.id,
      Math.max(8, draggingNode.origX + dx),
      Math.max(8, draggingNode.origY + dy)
    );
  };

  const handleCanvasPointerUp = () => {
    setDraggingNode(null);
  };

  const getPinPosition = (node: LogicNode, pinId: string) => {
    const pinIndex = node.pins.findIndex((p) => p.id === pinId);
    const pin = node.pins[pinIndex];
    const x = pin?.direction === 'in' ? node.x : node.x + node.width;
    const y = node.y + 34 + Math.max(0, pinIndex) * 20;
    return { x, y };
  };

  const handlePinClick = (
    e: React.MouseEvent,
    nodeId: string,
    pinId: string,
    direction: 'in' | 'out'
  ) => {
    e.stopPropagation();
    if (direction === 'out') {
      setPendingSourcePin({ nodeId, pinId });
    } else if (direction === 'in' && pendingSourcePin) {
      if (pendingSourcePin.nodeId !== nodeId) {
        onConnectPins(pendingSourcePin.nodeId, pendingSourcePin.pinId, nodeId, pinId);
      }
      setPendingSourcePin(null);
    }
  };

  const rulerTicks = [0, 500, 1000, 1500, 2000, 2500];
  const maxMs = Math.round(2500 / timelineZoom);

  const curvePath =
    easing.curveType === 'Spring'
      ? 'M 8 40 C 30 2, 46 6, 70 26 C 92 43, 112 20, 134 25'
      : easing.easeMode === 'Ease in'
      ? 'M 8 42 C 62 42, 92 18, 134 8'
      : easing.easeMode === 'Ease out'
      ? 'M 8 42 C 36 10, 82 8, 134 8'
      : 'M 8 42 C 58 42, 82 8, 134 8';

  const paletteItems: Array<{
    label: string;
    kind: 'event' | 'variable' | 'math';
    nodeTitle: string;
    icon: 'zap' | 'pause' | 'comm' | 'math' | 'bin' | 'var';
  }> = [
    { label: 'On Scene Show', kind: 'event', nodeTitle: 'On Scene Show', icon: 'zap' },
    { label: 'On Scene Hide', kind: 'event', nodeTitle: 'On Scene Hide', icon: 'pause' },
    { label: 'On Key Press: 2', kind: 'event', nodeTitle: 'On Key Press: 2', icon: 'zap' },
    { label: 'Communication', kind: 'variable', nodeTitle: 'Communication', icon: 'comm' },
    { label: 'Math', kind: 'math', nodeTitle: 'Math Add', icon: 'math' },
    { label: 'Binary', kind: 'math', nodeTitle: 'Binary Gate', icon: 'bin' },
    { label: 'Int Variable', kind: 'variable', nodeTitle: 'Int Variable', icon: 'var' },
  ];

  const filteredPalette = paletteItems.filter(
    (item) => !paletteQuery || item.label.toLowerCase().includes(paletteQuery.toLowerCase())
  );

  return (
    <section className="flex flex-col h-full bg-[#16181D] border-t border-[#232730] select-none overflow-hidden">
      {/* Top Panel Header Tabs */}
      <div className="h-[28px] px-2.5 bg-[#1A1D24] border-b border-[#232730] flex items-center justify-between shrink-0 relative">
        <div className="flex items-center gap-4">
          {(['Logic Editor', 'Transition Editor', 'Asset Database'] as BottomPanelMode[]).map(
            (tabName) => (
              <button
                key={tabName}
                type="button"
                onClick={() => onChangeMode(tabName)}
                className={`text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  mode === tabName ? 'text-[#E5E7EB]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
                }`}
              >
                {tabName}
              </button>
            )
          )}
        </div>

        <div ref={headerMenuRef} className="flex items-center gap-2 relative">
          {pendingSourcePin && mode === 'Logic Editor' && (
            <span className="text-[10px] text-[#24B0FF]">Click an input pin to wire...</span>
          )}
          {mode === 'Logic Editor' && (
            <button
              type="button"
              onClick={onTriggerLogicStep}
              className="px-2 py-0.5 text-[10px] font-medium bg-[#1E2530] hover:bg-[#273140] text-[#45B87A] border border-[#2C3A33] rounded-[2px] cursor-pointer whitespace-nowrap"
              title="Execute active Logic Graph step"
            >
              Trigger Step (↓)
            </button>
          )}
          <button
            type="button"
            onClick={() => setHeaderMenuOpen((o) => !o)}
            className={`hover:text-white cursor-pointer ${
              headerMenuOpen ? 'text-[#24B0FF]' : 'text-[#6B7280]'
            }`}
            title="Workbench Actions"
          >
            <Menu className="w-3 h-3" />
          </button>

          {headerMenuOpen && (
            <div className="absolute right-0 bottom-full mb-1 w-48 bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1 z-50 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  onAlignNodes('center');
                  setHeaderMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
              >
                Auto-Layout Logic Nodes
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearWires();
                  setHeaderMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
              >
                Clear All Graph Wires
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetLogicGraph();
                  setHeaderMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
              >
                Reset Default Logic Graph
              </button>
              <div className="my-1 border-t border-[#262A34]" />
              <button
                type="button"
                onClick={() => {
                  onAddKeyframeAtPlayhead();
                  onChangeMode('Transition Editor');
                  setHeaderMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
              >
                Insert Keyframe at Playhead
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LOGIC EDITOR MODE */}
      {mode === 'Logic Editor' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-[24px] px-1 bg-[#14161B] border-b border-[#232730] flex items-center gap-1 shrink-0">
            {openSubTabs.map((t) => (
              <div
                key={t}
                onClick={() => onChangeLogicSubTab(t)}
                className={`h-full px-3 flex items-center gap-2 text-[10px] border-r border-[#232730] cursor-pointer ${
                  logicSubTab === t
                    ? 'bg-[#1B1F27] text-[#E5E7EB] border-b border-b-[#24B0FF]'
                    : 'text-[#6B7280] hover:text-[#9CA3AF]'
                }`}
              >
                <span>{t}</span>
                {openSubTabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextTabs = openSubTabs.filter((x) => x !== t);
                      setOpenSubTabs(nextTabs);
                      if (logicSubTab === t && nextTabs[0]) {
                        onChangeLogicSubTab(nextTabs[0]);
                      }
                    }}
                    className="opacity-60 hover:opacity-100 hover:text-white cursor-pointer"
                    title={`Close ${t} tab`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
            {openSubTabs.length < 2 && (
              <button
                type="button"
                onClick={() => setOpenSubTabs(['Cluster', 'Infotainment'])}
                className="px-2 h-full text-[#6B7280] hover:text-white cursor-pointer"
                title="Restore Closed Logic Tab"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 flex min-h-0">
            {/* Left Icon Rail */}
            <div className="hidden sm:flex w-[28px] bg-[#15171C] border-r border-[#232730] flex-col items-center py-2 gap-3 text-[#6B7280] shrink-0">
              <button
                type="button"
                onClick={() => onAddLogicNode('event', 'On Key Press')}
                className="hover:text-white cursor-pointer"
                title="Add Event Node"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onAddLogicNode('variable', 'Signal Node')}
                className="hover:text-white cursor-pointer"
                title="Add Scene Object Node"
              >
                <Box className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onAddLogicNode('math', 'Add')}
                className="hover:text-white cursor-pointer"
                title="Add Math Node"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onAddLogicNode('math', 'Compare')}
                className="hover:text-white cursor-pointer"
                title="Add Binary Node"
              >
                <Binary className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onAddLogicNode('variable', 'Int Variable')}
                className="text-[#24B0FF] hover:text-white cursor-pointer"
                title="Add Variable Node"
              >
                <Braces className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Left Node Tree Sidebar */}
            <div className="hidden md:flex w-[166px] bg-[#16181D] border-r border-[#232730] flex-col shrink-0">
              <div className="h-[24px] px-2 border-b border-[#232730] flex items-center justify-between text-[#8E95A2]">
                <button
                  type="button"
                  onClick={() => onAddLogicNode('variable', 'Custom Signal')}
                  className="hover:text-white cursor-pointer"
                  title="Insert Custom Signal Node"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteSearchOpen((s) => !s)}
                  className={`hover:text-white cursor-pointer ${
                    paletteSearchOpen ? 'text-[#24B0FF]' : ''
                  }`}
                  title="Search Node Palette"
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
              {paletteSearchOpen && (
                <div className="p-1 border-b border-[#232730] bg-[#121419]">
                  <input
                    type="text"
                    value={paletteQuery}
                    onChange={(e) => setPaletteQuery(e.target.value)}
                    placeholder="Filter palette..."
                    className="w-full px-1.5 py-0.5 text-[10px] bg-[#1A1D24] border border-[#2C313D] rounded-[2px] text-white focus:outline-none focus:border-[#24B0FF]"
                  />
                </div>
              )}
              <div className="flex-1 overflow-y-auto studio-scroll py-1.5 px-1.5 space-y-1 text-[10.5px]">
                {filteredPalette.map((item) => {
                  if (item.label === 'On Key Press: 2') {
                    return (
                      <div key={item.label} className="px-1 py-0.5 text-[#E5E7EB]">
                        <div className="flex items-center gap-1">
                          <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                          <span className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                          <span className="truncate">Left Blinker</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddLogicNode(item.kind, item.nodeTitle)}
                          className="w-full pl-4 mt-1 flex items-center gap-1.5 text-[#D1D5DB] hover:text-white cursor-pointer"
                        >
                          <Zap className="w-3 h-3 text-[#F59E0B]" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onAddLogicNode(item.kind, item.nodeTitle)}
                      className={`w-full flex items-center gap-1.5 px-1 py-0.5 hover:bg-[#1E2129] rounded-[2px] cursor-pointer ${
                        item.icon === 'var'
                          ? 'text-[#45B87A]'
                          : item.icon === 'zap'
                          ? 'text-[#D1D5DB]'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {item.icon === 'zap' && <Zap className="w-3 h-3 text-[#F59E0B]" />}
                      {item.icon === 'pause' && (
                        <span className="w-3 h-3 text-[9px] text-[#8E95A2] text-center">||</span>
                      )}
                      {item.icon === 'comm' && <span className="text-[10px]">⇄</span>}
                      {item.icon === 'math' && <span className="text-[10px]">+−</span>}
                      {item.icon === 'bin' && <Binary className="w-3 h-3" />}
                      {item.icon === 'var' && <Braces className="w-3 h-3" />}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center Node Graph Canvas */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="h-[24px] px-2 bg-[#171A20] border-b border-[#232730] flex items-center justify-between text-[#8E95A2] shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onAddLogicNode('math', 'Multiply')}
                    className="hover:text-white cursor-pointer"
                    title="Add Math Node"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlignNodes('left')}
                    className="hover:text-white cursor-pointer"
                    title="Align Nodes Left"
                  >
                    <AlignLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlignNodes('center')}
                    className="hover:text-white cursor-pointer"
                    title="Distribute Nodes Flow"
                  >
                    <AlignCenter className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlignNodes('right')}
                    className="hover:text-white cursor-pointer"
                    title="Align Nodes Right"
                  >
                    <AlignRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono-code text-[#6B7280]">
                  {graphSearchOpen && (
                    <input
                      type="text"
                      value={graphQuery}
                      onChange={(e) => {
                        const q = e.target.value;
                        setGraphQuery(q);
                        const match = nodes.find((n) =>
                          n.title.toLowerCase().includes(q.toLowerCase())
                        );
                        if (match && q.trim()) onSelectLogicNode(match.id);
                      }}
                      placeholder="Find node..."
                      className="w-24 px-1.5 py-0.5 bg-[#121419] border border-[#2C313D] rounded-[2px] text-[10px] text-white focus:outline-none focus:border-[#24B0FF]"
                    />
                  )}
                  <span>SpeedOut: {Math.round(currentSpeed)}</span>
                  <button
                    type="button"
                    onClick={() => setGraphSearchOpen((s) => !s)}
                    className={`hover:text-white cursor-pointer ${
                      graphSearchOpen ? 'text-[#24B0FF]' : ''
                    }`}
                    title="Find Node in Graph"
                  >
                    <Search className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div
                ref={canvasRef}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
                onClick={() => setPendingSourcePin(null)}
                className="relative flex-1 logic-grid-bg overflow-auto studio-scroll min-h-[160px]"
              >
                <div className="relative min-w-[780px] min-h-[210px] h-full">
                  <svg className="absolute inset-0 w-full h-full">
                    {wires.map((wire) => {
                      const fromNode = nodes.find((n) => n.id === wire.fromNodeId);
                      const toNode = nodes.find((n) => n.id === wire.toNodeId);
                      if (!fromNode || !toNode) return null;
                      const start = getPinPosition(fromNode, wire.fromPinId);
                      const end = getPinPosition(toNode, wire.toPinId);
                      const cpOffset = Math.max(40, Math.abs(end.x - start.x) * 0.45);
                      const d = `M ${start.x} ${start.y} C ${start.x + cpOffset} ${start.y}, ${
                        end.x - cpOffset
                      } ${end.y}, ${end.x} ${end.y}`;
                      return (
                        <path
                          key={wire.id}
                          d={d}
                          fill="none"
                          stroke={wire.color}
                          strokeWidth="2"
                          strokeOpacity="0.85"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWire(wire.id);
                          }}
                          className="cursor-pointer hover:stroke-[#EF4444]"
                        >
                          <title>Click wire to disconnect</title>
                        </path>
                      );
                    })}
                  </svg>

                  {nodes.map((node) => {
                    const isSelected = node.id === selectedLogicNodeId;
                    const isSearchMatch =
                      Boolean(graphQuery.trim()) &&
                      node.title.toLowerCase().includes(graphQuery.trim().toLowerCase());
                    return (
                      <div
                        key={node.id}
                        onPointerDown={(e) => handleNodePointerDown(e, node)}
                        style={{
                          left: `${node.x}px`,
                          top: `${node.y}px`,
                          width: `${node.width}px`,
                          opacity: node.enabled ? 1 : 0.5,
                        }}
                        className={`absolute rounded-[3px] bg-[#1D2028]/95 border shadow-lg cursor-grab active:cursor-grabbing ${
                          isSelected
                            ? 'border-[#24B0FF]'
                            : isSearchMatch
                            ? 'border-[#F59E0B]'
                            : 'border-[#2E3442]'
                        }`}
                      >
                        <div className="h-[22px] px-2.5 bg-[#232732] border-b border-[#2E3442] flex items-center justify-between rounded-t-[2px]">
                          <div className="flex items-center gap-1.5 truncate">
                            {node.nodeType === 'event' && (
                              <Zap className="w-3 h-3 text-[#F59E0B] shrink-0" />
                            )}
                            {node.nodeType === 'variable' && (
                              <span className="text-[10px] font-mono-code text-[#60A5FA] shrink-0">
                                (x)
                              </span>
                            )}
                            {node.nodeType === 'math' && (
                              <span className="text-[10px] font-mono-code text-[#9CA3AF] shrink-0">
                                +−
                              </span>
                            )}
                            <span className="text-[10.5px] font-medium text-[#E5E7EB] truncate">
                              {node.title}
                            </span>
                          </div>
                          {node.value !== undefined && (
                            <span className="text-[9.5px] font-mono-code text-[#9CA3AF] tabular-nums">
                              {node.id === 'node-speed-out'
                                ? Math.round(currentSpeed)
                                : String(node.value)}
                            </span>
                          )}
                        </div>

                        <div className="py-1.5 px-2 space-y-1">
                          {node.pins.map((pin) => {
                            const isPending =
                              pendingSourcePin?.nodeId === node.id &&
                              pendingSourcePin?.pinId === pin.id;
                            return (
                              <div
                                key={pin.id}
                                className={`h-[14px] flex items-center text-[10px] ${
                                  pin.direction === 'out' ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                {pin.direction === 'in' && (
                                  <button
                                    type="button"
                                    onClick={(e) => handlePinClick(e, node.id, pin.id, 'in')}
                                    className="w-2.5 h-2.5 rounded-full -ml-3.5 mr-2 border border-[#13151A] hover:scale-125 transition-transform cursor-crosshair"
                                    style={{ backgroundColor: pin.color }}
                                    title="Click to connect input pin"
                                  />
                                )}
                                <span
                                  style={{ color: pin.kind === 'event' ? '#E05D56' : '#45B87A' }}
                                >
                                  {pin.label}
                                </span>
                                {pin.direction === 'out' && (
                                  <button
                                    type="button"
                                    onClick={(e) => handlePinClick(e, node.id, pin.id, 'out')}
                                    className={`w-2.5 h-2.5 rounded-full -mr-3.5 ml-2 border border-[#13151A] hover:scale-125 transition-transform cursor-crosshair ${
                                      isPending ? 'ring-2 ring-[#24B0FF]' : ''
                                    }`}
                                    style={{ backgroundColor: pin.color }}
                                    title="Click to start wire from output pin"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Sub-panel: NODE SETTINGS */}
            <div className="hidden lg:flex w-[195px] bg-[#16181D] border-l border-[#232730] flex-col shrink-0">
              <div className="h-[24px] px-2.5 border-b border-[#232730] flex items-center justify-between text-[10px] uppercase tracking-wider text-[#6E7480]">
                <span>NODE SETTINGS</span>
                {selectedNode && nodes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteLogicNode(selectedNode.id)}
                    className="text-[#8E95A2] hover:text-[#EF4444] cursor-pointer"
                    title="Delete Selected Node"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              {selectedNode && (
                <div className="p-2.5 space-y-3 text-[10.5px] overflow-y-auto studio-scroll">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-[#6E7480]">
                      <span>NODE</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </div>
                    <input
                      type="text"
                      value={selectedNode.title}
                      onChange={(e) =>
                        onUpdateLogicNode(selectedNode.id, { title: e.target.value })
                      }
                      className="w-full bg-[#121419] border border-[#262B35] rounded-[2px] px-1.5 py-0.5 text-[#E5E7EB] focus:outline-none focus:border-[#24B0FF]"
                    />
                    {selectedNode.value !== undefined && (
                      <label className="flex items-center justify-between text-[#9CA3AF]">
                        <span>Value</span>
                        <input
                          type="number"
                          value={Number(selectedNode.value) || 0}
                          onChange={(e) =>
                            onUpdateLogicNode(selectedNode.id, {
                              value: Number(e.target.value) || 0,
                            })
                          }
                          className="w-16 bg-[#121419] border border-[#262B35] rounded-[2px] px-1.5 py-0.5 text-right font-mono-code text-white focus:outline-none focus:border-[#24B0FF]"
                        />
                      </label>
                    )}
                    <div className="flex items-center gap-2.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLogicNode(selectedNode.id, { enabled: !selectedNode.enabled })
                        }
                        className={`w-7 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                          selectedNode.enabled ? 'bg-[#10B981]' : 'bg-[#374151]'
                        }`}
                        aria-label="Toggle node enabled"
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                            selectedNode.enabled ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-[#D1D5DB]">Enabled</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#232730] space-y-2">
                    <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-[#6E7480]">
                      <span>MISCELLANEOUS</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLogicNode(selectedNode.id, {
                            repeatEnabled: !selectedNode.repeatEnabled,
                          })
                        }
                        className={`w-7 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                          selectedNode.repeatEnabled ? 'bg-[#10B981]' : 'bg-[#374151]'
                        }`}
                        aria-label="Toggle repeat enabled"
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                            selectedNode.repeatEnabled ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-[#D1D5DB]">Repeat enabled</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRANSITION EDITOR MODE */}
      {mode === 'Transition Editor' && (
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-[26px] px-2.5 bg-[#171A20] border-b border-[#232730] flex items-center justify-between text-[#8E95A2] shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setTimelineZoom((z) => Math.min(2, z + 0.25))}
                  className="hover:text-white cursor-pointer"
                  title="Zoom In Timeline"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineZoom((z) => Math.max(0.5, z - 0.25))}
                  className="hover:text-white cursor-pointer"
                  title="Zoom Out Timeline"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-3.5 bg-[#2A2E39]" />
                <button
                  type="button"
                  onClick={onAddKeyframeAtPlayhead}
                  className="text-[11px] font-mono-code text-[#24B0FF] hover:text-white cursor-pointer"
                  title="Insert Keyframe Track at Playhead"
                >
                  ◆
                </button>
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <span className="font-mono-code tabular-nums text-[#9CA3AF]">
                  {Math.round(playheadMs)}
                </span>
                <button
                  type="button"
                  onClick={() => onChangePlayheadMs(0)}
                  className="hover:text-white cursor-pointer"
                  title="Jump to Start"
                >
                  <SkipBack className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onChangePlayheadMs(Math.max(0, playheadMs - 100))}
                  className="hover:text-white cursor-pointer"
                  title="Step Back 100ms"
                >
                  <StepBack className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onChangePlayheadMs((playheadMs + 250) % maxMs)}
                  className="hover:text-[#10B981] cursor-pointer"
                  title="Advance 250ms"
                >
                  <Play className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onChangePlayheadMs(Math.min(maxMs, playheadMs + 100))}
                  className="hover:text-white cursor-pointer"
                  title="Step Forward 100ms"
                >
                  <StepForward className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onChangePlayheadMs(maxMs)}
                  className="hover:text-white cursor-pointer"
                  title="Jump to End"
                >
                  <SkipForward className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTimelineFps((f) => (f === 60 ? 120 : f === 120 ? 30 : 60))
                  }
                  className="font-mono-code tabular-nums text-[#6B7280] hover:text-white cursor-pointer"
                  title="Cycle Frame Rate (30 / 60 / 120 FPS)"
                >
                  {timelineFps}
                </button>
              </div>
            </div>

            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className="w-[140px] sm:w-[164px] bg-[#16181D] border-r border-[#232730] text-[10.5px] overflow-y-auto studio-scroll shrink-0">
                <div className="h-[20px] border-b border-[#232730]" />
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((p) => ({ ...p, Button: !p.Button }))
                  }
                  className="w-full px-2 py-1 flex items-center gap-1.5 text-[#D1D5DB] hover:bg-[#1E2129] cursor-pointer"
                >
                  {collapsedGroups.Button ? (
                    <ChevronRight className="w-3 h-3 text-[#6B7280]" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                  )}
                  <span>Button</span>
                </button>
                {!collapsedGroups.Button && (
                  <>
                    <div className="pl-4 pr-2 py-0.5 flex items-center gap-1.5 text-[#9CA3AF]">
                      <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                      <span>Transformations</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedGroups((p) => ({ ...p, Position: !p.Position }))
                      }
                      className="w-full pl-7 pr-2 py-0.5 flex items-center gap-1.5 text-[#9CA3AF] hover:bg-[#1E2129] cursor-pointer"
                    >
                      {collapsedGroups.Position ? (
                        <ChevronRight className="w-3 h-3 text-[#6B7280]" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                      )}
                      <span>Position</span>
                    </button>
                    {!collapsedGroups.Position &&
                      tracks
                        .filter((t) => t.group === 'Position')
                        .map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              onUpdateEasing({
                                targetLabel: `BUTTON > POSITION > ${t.label.toUpperCase()}`,
                              })
                            }
                            className="w-full pl-11 h-[20px] flex items-center text-[#9CA3AF] hover:bg-[#1E2129] hover:text-white cursor-pointer"
                          >
                            {t.label}
                          </button>
                        ))}
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedGroups((p) => ({ ...p, Rotation: !p.Rotation }))
                      }
                      className="w-full pl-7 pr-2 py-0.5 flex items-center gap-1.5 text-[#9CA3AF] hover:bg-[#1E2129] cursor-pointer"
                    >
                      {collapsedGroups.Rotation ? (
                        <ChevronRight className="w-3 h-3 text-[#6B7280]" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                      )}
                      <span>Rotation</span>
                    </button>
                    {!collapsedGroups.Rotation &&
                      tracks
                        .filter((t) => t.group === 'Rotation')
                        .map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              onUpdateEasing({
                                targetLabel: `BUTTON > ROTATION > ${t.label.toUpperCase()}`,
                              })
                            }
                            className="w-full pl-11 h-[20px] flex items-center text-[#9CA3AF] hover:bg-[#1E2129] hover:text-white cursor-pointer"
                          >
                            {t.label}
                          </button>
                        ))}
                  </>
                )}
              </div>

              <div
                onPointerMove={(e) => {
                  if (!draggingTrack) return;
                  const deltaMs = Math.round(
                    ((e.clientX - draggingTrack.startClientX) /
                      Math.max(120, draggingTrack.laneWidth)) *
                      (3200 / timelineZoom)
                  );
                  const span = draggingTrack.origEnd - draggingTrack.origStart;
                  const nextStart = Math.max(0, draggingTrack.origStart + deltaMs);
                  onUpdateTrack(draggingTrack.id, {
                    startMs: nextStart,
                    endMs: nextStart + span,
                  });
                }}
                onPointerUp={() => setDraggingTrack(null)}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                  onChangePlayheadMs(Math.round(ratio * maxMs));
                }}
                className="relative flex-1 bg-[#121419] overflow-hidden cursor-crosshair"
              >
                <div className="h-[20px] px-2 border-b border-[#232730] flex items-center justify-between text-[9px] font-mono-code text-[#6B7280]">
                  {rulerTicks.map((t) => (
                    <span key={t}>{Math.round(t / timelineZoom)}</span>
                  ))}
                </div>

                <div className="absolute inset-x-0 top-[20px] bottom-0 flex justify-between px-2 pointer-events-none">
                  {rulerTicks.map((t) => (
                    <div key={t} className="w-[1px] h-full bg-[#1E222B]" />
                  ))}
                </div>

                <div
                  style={{ left: `${Math.min(100, (playheadMs / maxMs) * 100)}%` }}
                  className="absolute top-0 bottom-0 w-[1.5px] bg-[#10B981] z-20 pointer-events-none"
                >
                  <div className="px-1 py-0.5 bg-[#10B981] text-[#052E16] text-[8.5px] font-mono-code font-bold rounded-[2px] -translate-x-1/2">
                    {Math.round(playheadMs)}
                  </div>
                </div>

                {!collapsedGroups.Button && (
                  <div className="pt-[64px]">
                    {!collapsedGroups.Position &&
                      tracks
                        .filter((t) => t.group === 'Position')
                        .map((track) => (
                          <div key={track.id} className="h-[20px] relative flex items-center">
                            <div className="w-full h-[1px] bg-[#1E222B]" />
                            <div
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                const lane = e.currentTarget.parentElement?.getBoundingClientRect();
                                setDraggingTrack({
                                  id: track.id,
                                  startClientX: e.clientX,
                                  origStart: track.startMs,
                                  origEnd: track.endMs,
                                  laneWidth: lane?.width || 400,
                                });
                                onUpdateEasing({
                                  targetLabel: `BUTTON > POSITION > ${track.label.toUpperCase()}`,
                                });
                              }}
                              style={{
                                left: `${(track.startMs / 3200) * timelineZoom * 100}%`,
                                width: `${((track.endMs - track.startMs) / 3200) * timelineZoom * 100}%`,
                                backgroundColor: track.color,
                              }}
                              className="absolute h-[5px] rounded-[1px] flex items-center justify-between cursor-ew-resize"
                              title={`Drag to move ${track.group} ${track.label} (${track.startMs}ms - ${track.endMs}ms)`}
                            >
                              <span
                                className="w-2 h-2 rotate-45 -ml-1"
                                style={{ backgroundColor: track.color }}
                              />
                              <span
                                className="w-2 h-2 rotate-45 -mr-1"
                                style={{ backgroundColor: track.color }}
                              />
                            </div>
                          </div>
                        ))}
                    <div className="h-[22px]" />
                    {!collapsedGroups.Rotation &&
                      tracks
                        .filter((t) => t.group === 'Rotation')
                        .map((track) => (
                          <div key={track.id} className="h-[20px] relative flex items-center">
                            <div className="w-full h-[1px] bg-[#1E222B]" />
                            <div
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                const lane = e.currentTarget.parentElement?.getBoundingClientRect();
                                setDraggingTrack({
                                  id: track.id,
                                  startClientX: e.clientX,
                                  origStart: track.startMs,
                                  origEnd: track.endMs,
                                  laneWidth: lane?.width || 400,
                                });
                                onUpdateEasing({
                                  targetLabel: `BUTTON > ROTATION > ${track.label.toUpperCase()}`,
                                });
                              }}
                              style={{
                                left: `${(track.startMs / 3200) * timelineZoom * 100}%`,
                                width: `${((track.endMs - track.startMs) / 3200) * timelineZoom * 100}%`,
                                backgroundColor: track.color,
                              }}
                              className="absolute h-[5px] rounded-[1px] flex items-center justify-between cursor-ew-resize"
                              title={`Drag to move ${track.group} ${track.label} (${track.startMs}ms - ${track.endMs}ms)`}
                            >
                              <span
                                className="w-2 h-2 rotate-45 -ml-1"
                                style={{ backgroundColor: track.color }}
                              />
                              <span
                                className="w-2 h-2 rotate-45 -mr-1"
                                style={{ backgroundColor: track.color }}
                              />
                            </div>
                          </div>
                        ))}
                  </div>
                )}
              </div>
            </div>

            <div className="h-[22px] px-2.5 bg-[#15171C] border-t border-[#232730] flex items-center justify-between text-[9.5px] text-[#6B7280] shrink-0">
              <span>Range from 0 to {maxMs}</span>
              <span className="font-mono-code">{timelineFps} FPS</span>
            </div>
          </div>

          {/* Right Easing & Spring Curve Inspector */}
          <div className="hidden md:flex w-[196px] bg-[#16181D] border-l border-[#232730] flex-col p-2.5 space-y-2.5 text-[10.5px] shrink-0 overflow-y-auto studio-scroll">
            <div className="text-[9.5px] uppercase tracking-wider text-[#6E7480]">
              {easing.targetLabel}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[#D1D5DB]">
              <select
                value={easing.easeMode}
                onChange={(e) =>
                  onUpdateEasing({ easeMode: e.target.value as EasingConfig['easeMode'] })
                }
                className="bg-[#1C1F26] border border-[#282D38] rounded-[2px] px-1.5 py-0.5 text-[10px]"
              >
                <option value="Ease in">Ease in</option>
                <option value="Ease out">Ease out</option>
                <option value="Ease in out">Ease in out</option>
              </select>
              <select
                value={easing.curveType}
                onChange={(e) =>
                  onUpdateEasing({ curveType: e.target.value as EasingConfig['curveType'] })
                }
                className="bg-[#1C1F26] border border-[#282D38] rounded-[2px] px-1.5 py-0.5 text-[10px]"
              >
                <option value="Cubic">Cubic</option>
                <option value="Quadratic">Quadratic</option>
                <option value="Spring">Spring</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[#D1D5DB] font-mono-code text-[10px]">
              <label className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#6B7280]" />
                <input
                  type="number"
                  min={0}
                  value={easing.durationMs}
                  onChange={(e) =>
                    onUpdateEasing({ durationMs: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-10 bg-transparent focus:outline-none text-[#E5E7EB]"
                />
                <span className="text-[#6B7280]">ms</span>
              </label>
              <label className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#6B7280]" />
                <input
                  type="number"
                  min={0}
                  value={easing.delayMs}
                  onChange={(e) =>
                    onUpdateEasing({ delayMs: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-10 bg-transparent focus:outline-none text-[#E5E7EB]"
                />
                <span className="text-[#6B7280]">ms</span>
              </label>
            </div>

            <div className="h-[58px] bg-[#121419] border border-[#232730] rounded-[2px] p-1">
              <svg viewBox="0 0 140 50" className="w-full h-full">
                <line x1="0" y1="25" x2="140" y2="25" stroke="#252A34" strokeDasharray="2 2" />
                <path d={curvePath} fill="none" stroke="#D1D5DB" strokeWidth="1.4" />
                <circle cx="8" cy={easing.curveType === 'Spring' ? 40 : 42} r="2.2" fill="#D1D5DB" />
                <circle
                  cx="134"
                  cy={easing.curveType === 'Spring' ? 25 : 8}
                  r="2.2"
                  fill="#D1D5DB"
                />
              </svg>
            </div>

            <div className="space-y-1.5 text-[10.5px]">
              <div className="flex items-center justify-between">
                <span className="text-[#8E95A2]">Stiffness</span>
                <input
                  type="number"
                  value={easing.stiffness}
                  onChange={(e) => onUpdateEasing({ stiffness: Number(e.target.value) || 0 })}
                  className="w-14 bg-transparent text-right font-mono-code tabular-nums text-[#E5E7EB] focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8E95A2]">Damping</span>
                <input
                  type="number"
                  value={easing.damping}
                  onChange={(e) => onUpdateEasing({ damping: Number(e.target.value) || 0 })}
                  className="w-14 bg-transparent text-right font-mono-code tabular-nums text-[#E5E7EB] focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8E95A2]">Mass</span>
                <input
                  type="number"
                  value={easing.mass}
                  onChange={(e) => onUpdateEasing({ mass: Number(e.target.value) || 1 })}
                  className="w-14 bg-transparent text-right font-mono-code tabular-nums text-[#E5E7EB] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSET DATABASE MODE */}
      {mode === 'Asset Database' && (
        <div className="flex-1 p-3 overflow-y-auto studio-scroll">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { name: 'EV_Coupe_Hero.glb', kind: '3D Mesh', size: '4.2 MB' },
              { name: 'Road_Beam_Glow.glsl', kind: 'Shader', size: '18 KB' },
              { name: 'Gauge_Needle_Mask.png', kind: 'Texture', size: '240 KB' },
              { name: 'SairaSemiCondensed.ttf', kind: 'Font', size: '112 KB' },
            ].map((asset) => (
              <button
                key={asset.name}
                type="button"
                onClick={() => onUseAssetDatabaseItem(asset.name)}
                className="p-2.5 bg-[#1B1E25] border border-[#262B35] rounded-[3px] flex items-center gap-2.5 hover:border-[#24B0FF]/80 text-left transition-colors cursor-pointer"
                title={`Click to apply or insert ${asset.name}`}
              >
                <FolderOpen className="w-4 h-4 text-[#24B0FF] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#E5E7EB] truncate">
                    {asset.name}
                  </div>
                  <div className="text-[10px] text-[#6B7280] font-mono-code">
                    {asset.kind} · {asset.size}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
