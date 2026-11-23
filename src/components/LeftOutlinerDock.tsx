import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Menu,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Folder,
  Clock,
  Type,
  Box,
  Sparkles,
  Car,
  Gauge,
  LayoutTemplate,
  PanelLeft,
  MapPin,
  Music,
  Monitor,
  Plus,
  Frame,
} from 'lucide-react';
import { CONTEXT_MENU_ITEMS, PRIMITIVE_MENU_ITEMS } from '../data/defaultStudioState';
import type {
  AttributesState,
  ConsoleLogEntry,
  LeftBottomTab,
  LeftTopTab,
  ProjectNode,
  SceneNode,
} from '../types/studio';

interface LeftOutlinerDockProps {
  sceneTree: SceneNode[];
  projectTree: ProjectNode[];
  selectedNodeId: string;
  onSelectSceneNode: (node: SceneNode) => void;
  onToggleNodeExpanded: (nodeId: string) => void;
  onToggleNodeVisibility: (nodeId: string) => void;
  onToggleNodeLock: (nodeId: string) => void;
  onSelectProjectNode: (nodeId: string) => void;
  onAddPrimitive: (primitive: (typeof PRIMITIVE_MENU_ITEMS)[number]) => void;
  onCreateContextElement: (itemLabel: string) => void;
  logs: ConsoleLogEntry[];
  attributes: AttributesState;
  onUpdateAttributes: (patch: Partial<AttributesState>) => void;
  showContextMenu: boolean;
  onToggleContextMenu: (open: boolean) => void;
}

export const LeftOutlinerDock: React.FC<LeftOutlinerDockProps> = ({
  sceneTree,
  projectTree,
  selectedNodeId,
  onSelectSceneNode,
  onToggleNodeExpanded,
  onToggleNodeVisibility,
  onToggleNodeLock,
  onSelectProjectNode,
  onAddPrimitive,
  onCreateContextElement,
  logs,
  attributes,
  onUpdateAttributes,
  showContextMenu,
  onToggleContextMenu,
}) => {
  const [topTab, setTopTab] = useState<LeftTopTab>('Scene Outliner');
  const [bottomTab, setBottomTab] = useState<LeftBottomTab>('Project Outliner');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string>('Primitives');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const contextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showContextMenu) return;
    const onDown = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        onToggleContextMenu(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [showContextMenu, onToggleContextMenu]);

  const renderNodeIcon = (node: SceneNode) => {
    switch (node.type) {
      case 'text':
        return <Type className="w-3 h-3 text-[#8E95A2] shrink-0" />;
      case 'clock':
        return <Clock className="w-3 h-3 text-[#8E95A2] shrink-0" />;
      case 'blur':
        return <Sparkles className="w-3 h-3 text-[#8E95A2] shrink-0" />;
      case 'mesh':
        return <Box className="w-3 h-3 text-[#24B0FF] shrink-0" />;
      case 'frame':
        return <Frame className="w-3 h-3 text-[#10B981] shrink-0" />;
      case 'shape':
        return (
          <span className="w-3 h-3 inline-flex items-center justify-center text-[10px] text-[#8E95A2]">
            /
          </span>
        );
      case 'prefab':
      case 'instance':
        return <span className="w-2.5 h-2.5 border border-[#4B5563] rounded-[2px] shrink-0" />;
      default:
        return <Folder className="w-3 h-3 text-[#8E95A2] shrink-0" />;
    }
  };

  const renderSceneTree = (nodes: SceneNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const matches =
        !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase());
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isSelected = selectedNodeId === node.id;

      if (!matches && !hasChildren) return null;

      return (
        <div key={node.id}>
          <div
            onClick={() => onSelectSceneNode(node)}
            onContextMenu={(e) => {
              e.preventDefault();
              onToggleContextMenu(true);
            }}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            className={`group h-[23px] pr-2 flex items-center justify-between text-[11px] cursor-pointer transition-colors ${
              isSelected
                ? 'bg-[#282C37] text-white'
                : node.muted
                ? 'text-[#6E7A91] italic hover:bg-[#1E2129]'
                : 'text-[#C2C7D0] hover:bg-[#1E2129]'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleNodeExpanded(node.id);
                  }}
                  className="text-[#6B7280] hover:text-white shrink-0 cursor-pointer"
                >
                  {node.expanded !== false ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              ) : (
                <span className="w-3 shrink-0" />
              )}
              {renderNodeIcon(node)}
              <span className="truncate">{node.name}</span>
            </div>

            <div className="flex items-center gap-1.5 opacity-75 group-hover:opacity-100 shrink-0">
              {node.locked !== undefined ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleNodeLock(node.id);
                  }}
                  className="hover:text-white cursor-pointer"
                  aria-label={`Toggle ${node.name} lock`}
                >
                  {node.locked ? (
                    <Lock className="w-2.5 h-2.5 text-[#F59E0B]" />
                  ) : (
                    <Unlock className="w-2.5 h-2.5 text-[#4B5563]" />
                  )}
                </button>
              ) : null}
              {node.visible !== undefined && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleNodeVisibility(node.id);
                  }}
                  className="hover:text-white cursor-pointer"
                  aria-label={`Toggle ${node.name} visibility`}
                >
                  {node.visible ? (
                    <Eye className="w-3 h-3 text-[#8E95A2]" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-[#4B5563]" />
                  )}
                </button>
              )}
            </div>
          </div>
          {hasChildren && node.expanded !== false && renderSceneTree(node.children!, depth + 1)}
        </div>
      );
    });
  };

  const renderProjectIcon = (icon: ProjectNode['icon']) => {
    switch (icon) {
      case 'car':
        return <Car className="w-3 h-3 text-[#9CA3AF]" />;
      case 'gauge':
        return <Gauge className="w-3 h-3 text-[#9CA3AF]" />;
      case 'topbar':
        return <LayoutTemplate className="w-3 h-3 text-[#9CA3AF]" />;
      case 'sidenav':
        return <PanelLeft className="w-3 h-3 text-[#9CA3AF]" />;
      case 'map':
        return <MapPin className="w-3 h-3 text-[#9CA3AF]" />;
      case 'player':
        return <Music className="w-3 h-3 text-[#9CA3AF]" />;
      default:
        return <Monitor className="w-3 h-3 text-[#9CA3AF]" />;
    }
  };

  const categories: Array<ProjectNode['category']> = ['Unassigned', 'Cluster', 'Infotainment'];

  return (
    <aside className="flex flex-col h-full bg-[#16181D] border-r border-[#232730] select-none relative">
      {/* TOP HALF: Scene Outliner | Console */}
      <div className="flex flex-col flex-1 min-h-0 border-b border-[#232730]">
        <div className="h-[28px] px-2 bg-[#1A1D24] border-b border-[#232730] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className={`hover:text-white transition-colors cursor-pointer ${
                searchOpen ? 'text-[#24B0FF]' : 'text-[#8E95A2]'
              }`}
              title="Search Scene Outliner"
            >
              <Search className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setTopTab('Scene Outliner')}
              className={`text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                topTab === 'Scene Outliner' ? 'text-[#E5E7EB]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
              }`}
            >
              Scene Outliner
            </button>
            <button
              type="button"
              onClick={() => setTopTab('Console')}
              className={`text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                topTab === 'Console' ? 'text-[#E5E7EB]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
              }`}
            >
              Console
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleContextMenu(!showContextMenu)}
              className="text-[#8E95A2] hover:text-white cursor-pointer"
              title="Create Scene Object"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onToggleContextMenu(!showContextMenu)}
              className="text-[#6B7280] hover:text-white cursor-pointer"
              title="Outliner Menu"
            >
              <Menu className="w-3 h-3" />
            </button>
          </div>
        </div>

        {searchOpen && topTab === 'Scene Outliner' && (
          <div className="px-2 py-1 bg-[#13151A] border-b border-[#232730]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter scene hierarchy..."
              className="w-full bg-[#1C1F26] border border-[#2C313D] rounded-[2px] px-2 py-0.5 text-[11px] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#24B0FF]"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto studio-scroll py-1">
          {topTab === 'Scene Outliner' ? (
            renderSceneTree(sceneTree)
          ) : (
            <div className="p-2 space-y-2 font-mono-code text-[10px] leading-relaxed">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className={
                    entry.level === 'error'
                      ? 'text-[#E05D56]'
                      : entry.level === 'ingest'
                      ? 'text-[#24B0FF]'
                      : 'text-[#39B97A]'
                  }
                >
                  <div>
                    [{entry.timestamp}] {entry.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM HALF: Project Outliner | Material editor */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="h-[28px] px-2 bg-[#1A1D24] border-b border-[#232730] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Search className="w-3 h-3 text-[#8E95A2] shrink-0" />
            <button
              type="button"
              onClick={() => setBottomTab('Project Outliner')}
              className={`text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                bottomTab === 'Project Outliner'
                  ? 'text-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#9CA3AF]'
              }`}
            >
              Project Outliner
            </button>
            <button
              type="button"
              onClick={() => setBottomTab('Material editor')}
              className={`text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                bottomTab === 'Material editor'
                  ? 'text-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#9CA3AF]'
              }`}
            >
              Material editor
            </button>
          </div>
          <Menu className="w-3 h-3 text-[#6B7280] shrink-0" />
        </div>

        <div className="flex-1 overflow-y-auto studio-scroll py-1.5">
          {bottomTab === 'Project Outliner' ? (
            <div className="space-y-1">
              {categories.map((cat) => {
                const isCollapsed = collapsedCategories[cat];
                const items = projectTree.filter((p) => p.category === cat);
                return (
                  <div key={cat}>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
                      }
                      className="w-full px-2 h-[22px] flex items-center gap-1.5 text-[11px] text-[#E5E7EB] font-medium hover:bg-[#1E2129] cursor-pointer"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-[#6B7280]" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                      )}
                      <span className="w-3 h-3 border border-[#4B5563] rounded-[2px] inline-block" />
                      <span>{cat}</span>
                    </button>

                    {!isCollapsed && (
                      <div className="mt-0.5 space-y-0.5">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onSelectProjectNode(item.id)}
                            className={`w-full h-[22px] pl-6 pr-2.5 flex items-center justify-between text-[11px] transition-colors cursor-pointer ${
                              item.active
                                ? 'bg-[#222630] text-white'
                                : 'text-[#9CA3AF] hover:bg-[#1E2129] hover:text-[#E5E7EB]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {renderProjectIcon(item.icon)}
                              <span className="truncate">{item.name}</span>
                            </div>
                            {item.category === 'Infotainment' && (
                              <span
                                className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
                                  item.active
                                    ? 'border-[#10B981] bg-[#10B981]/25 ring-2 ring-[#10B981]/30'
                                    : 'border-[#4B5563]'
                                }`}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 space-y-3 text-[11px]">
              <div className="text-[10px] uppercase tracking-wider text-[#6E7480]">
                PBR Surface Material
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF]">Albedo Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={attributes.materialColor}
                    onChange={(e) => onUpdateAttributes({ materialColor: e.target.value })}
                    className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                  />
                  <span className="font-mono-code text-[10px] text-[#D1D5DB]">
                    {attributes.materialColor.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Metalness</span>
                  <span className="font-mono-code tabular-nums text-[#D1D5DB]">
                    {attributes.materialMetalness.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={attributes.materialMetalness}
                  onChange={(e) =>
                    onUpdateAttributes({ materialMetalness: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#24B0FF]"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Roughness</span>
                  <span className="font-mono-code tabular-nums text-[#D1D5DB]">
                    {attributes.materialRoughness.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={attributes.materialRoughness}
                  onChange={(e) =>
                    onUpdateAttributes({ materialRoughness: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#24B0FF]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cascading Context Menu */}
      {showContextMenu && (
        <div ref={contextRef} className="absolute left-[132px] top-[28px] z-50 flex items-start">
          <div className="w-[168px] bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1">
            {CONTEXT_MENU_ITEMS.map((item) => (
              <div
                key={item.label}
                onMouseEnter={() => {
                  if (item.hasSubmenu) setHoveredSubmenu(item.label);
                }}
                onClick={() => {
                  if (!item.hasSubmenu) {
                    onCreateContextElement(item.label);
                    onToggleContextMenu(false);
                  }
                }}
                className={`px-3 py-1 flex items-center justify-between text-[11px] cursor-pointer ${
                  hoveredSubmenu === item.label && item.hasSubmenu
                    ? 'bg-[#2A2E39] text-white'
                    : 'text-[#C2C7D0] hover:bg-[#252933] hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.hasSubmenu && <ChevronRight className="w-3 h-3 text-[#8E95A2]" />}
                {item.shortcut && (
                  <span className="text-[10px] text-[#6B7280] font-mono-code">
                    {item.shortcut}
                  </span>
                )}
              </div>
            ))}
          </div>

          {hoveredSubmenu === 'Primitives' && (
            <div className="ml-0.5 mt-[26px] w-[132px] bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1">
              {PRIMITIVE_MENU_ITEMS.map((prim) => (
                <button
                  key={prim}
                  type="button"
                  onClick={() => {
                    onAddPrimitive(prim);
                    onToggleContextMenu(false);
                  }}
                  className="w-full px-3 py-1 text-left text-[11px] text-[#C2C7D0] hover:bg-[#2A2E39] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Box className="w-3 h-3 text-[#8E95A2]" />
                  <span>{prim}</span>
                </button>
              ))}
            </div>
          )}

          {hoveredSubmenu === 'Vector' && (
            <div className="ml-0.5 mt-[48px] w-[132px] bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1">
              {(['Rectangle', 'Vector', 'Pen Path'] as const).map((vec) => (
                <button
                  key={vec}
                  type="button"
                  onClick={() => {
                    onCreateContextElement(vec);
                    onToggleContextMenu(false);
                  }}
                  className="w-full px-3 py-1 text-left text-[11px] text-[#C2C7D0] hover:bg-[#2A2E39] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Frame className="w-3 h-3 text-[#24B0FF]" />
                  <span>{vec}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
