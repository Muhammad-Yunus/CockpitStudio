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
  Sun,
} from 'lucide-react';
import {
  CONTEXT_MENU_ITEMS,
  LIGHT_MENU_ITEMS,
  PRIMITIVE_MENU_ITEMS,
} from '../data/defaultStudioState';
import type {
  ConsoleLogEntry,
  LeftTopTab,
  LightKind3D,
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
  onExpandAllSceneNodes: (expanded: boolean) => void;
  onSelectProjectNode: (nodeId: string) => void;
  onAddPrimitive: (primitive: (typeof PRIMITIVE_MENU_ITEMS)[number]) => void;
  onAddLight: (lightKind: LightKind3D) => void;
  onCreateContextElement: (itemLabel: string) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onClearConsoleLogs: () => void;
  logs: ConsoleLogEntry[];
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
  onExpandAllSceneNodes,
  onSelectProjectNode,
  onAddPrimitive,
  onAddLight,
  onCreateContextElement,
  onDuplicateSelected,
  onDeleteSelected,
  onClearConsoleLogs,
  logs,
  showContextMenu,
  onToggleContextMenu,
}) => {
  const [topTab, setTopTab] = useState<LeftTopTab>('Scene Outliner');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(false);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string>('Primitives');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const contextRef = useRef<HTMLDivElement>(null);
  const topMenuRef = useRef<HTMLDivElement>(null);
  const bottomMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (showContextMenu && contextRef.current && !contextRef.current.contains(e.target as Node)) {
        onToggleContextMenu(false);
      }
      if (topMenuOpen && topMenuRef.current && !topMenuRef.current.contains(e.target as Node)) {
        setTopMenuOpen(false);
      }
      if (
        bottomMenuOpen &&
        bottomMenuRef.current &&
        !bottomMenuRef.current.contains(e.target as Node)
      ) {
        setBottomMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [showContextMenu, topMenuOpen, bottomMenuOpen, onToggleContextMenu]);

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
      case 'light':
        return <Sun className="w-3 h-3 text-[#F59E0B] shrink-0" />;
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
        <div className="h-[28px] px-2 bg-[#1A1D24] border-b border-[#232730] flex items-center justify-between shrink-0 relative">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                setTopTab('Scene Outliner');
                setSearchOpen(!searchOpen);
              }}
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

          <div ref={topMenuRef} className="flex items-center gap-1.5 relative">
            <button
              type="button"
              onClick={() => onToggleContextMenu(!showContextMenu)}
              className="text-[#8E95A2] hover:text-white cursor-pointer"
              title="Create Scene Object / Element"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTopMenuOpen((o) => !o)}
              className={`hover:text-white cursor-pointer ${
                topMenuOpen ? 'text-[#24B0FF]' : 'text-[#6B7280]'
              }`}
              title="Scene Outliner & Console Actions"
            >
              <Menu className="w-3 h-3" />
            </button>

            {topMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1 z-50 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    onExpandAllSceneNodes(true);
                    setTopMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Expand All Nodes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExpandAllSceneNodes(false);
                    setTopMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Collapse All Nodes
                </button>
                <div className="my-1 border-t border-[#262A34]" />
                <button
                  type="button"
                  onClick={() => {
                    onDuplicateSelected();
                    setTopMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Duplicate Selected
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSelected();
                    setTopMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#EF4444] hover:bg-[#262B36] cursor-pointer"
                >
                  Delete Selected
                </button>
                <div className="my-1 border-t border-[#262A34]" />
                <button
                  type="button"
                  onClick={() => {
                    onClearConsoleLogs();
                    setTopMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Clear Console Output
                </button>
              </div>
            )}
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
              {logs.length === 0 ? (
                <div className="text-[#6B7280]">Console buffer cleared.</div>
              ) : (
                logs.map((entry) => (
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
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM HALF: Project Outliner */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="h-[28px] px-2 bg-[#1A1D24] border-b border-[#232730] flex items-center justify-between shrink-0 relative">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setProjectSearchOpen((s) => !s)}
              className={`hover:text-white transition-colors cursor-pointer shrink-0 ${
                projectSearchOpen ? 'text-[#24B0FF]' : 'text-[#8E95A2]'
              }`}
              title="Search Project Screens"
            >
              <Search className="w-3 h-3" />
            </button>
            <span className="text-[11px] font-medium whitespace-nowrap text-[#E5E7EB]">
              Project Outliner
            </span>
          </div>
          <div ref={bottomMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setBottomMenuOpen((o) => !o)}
              className={`hover:text-white cursor-pointer shrink-0 ${
                bottomMenuOpen ? 'text-[#24B0FF]' : 'text-[#6B7280]'
              }`}
              title="Project Outliner Options"
            >
              <Menu className="w-3 h-3" />
            </button>
            {bottomMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1 z-50 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setCollapsedCategories({});
                    setBottomMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Expand All Categories
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollapsedCategories({
                      Unassigned: true,
                      Cluster: true,
                      Infotainment: true,
                    });
                    setBottomMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Collapse All Categories
                </button>
              </div>
            )}
          </div>
        </div>

        {projectSearchOpen && (
          <div className="px-2 py-1 bg-[#13151A] border-b border-[#232730]">
            <input
              type="text"
              value={projectSearchQuery}
              onChange={(e) => setProjectSearchQuery(e.target.value)}
              placeholder="Filter screens..."
              className="w-full bg-[#1C1F26] border border-[#2C313D] rounded-[2px] px-2 py-0.5 text-[11px] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#24B0FF]"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto studio-scroll py-1.5">
          <div className="space-y-1">
            {categories.map((cat) => {
              const isCollapsed = collapsedCategories[cat];
              const items = projectTree.filter(
                (p) =>
                  p.category === cat &&
                  (!projectSearchQuery ||
                    p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()))
              );
              if (projectSearchQuery && items.length === 0) return null;
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

          {hoveredSubmenu === 'Light' && (
            <div className="ml-0.5 mt-[2px] w-[144px] bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1">
              {LIGHT_MENU_ITEMS.map((light) => (
                <button
                  key={light}
                  type="button"
                  onClick={() => {
                    onAddLight(light);
                    onToggleContextMenu(false);
                  }}
                  className="w-full px-3 py-1 text-left text-[11px] text-[#C2C7D0] hover:bg-[#2A2E39] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Sun className="w-3 h-3 text-[#F59E0B]" />
                  <span>{light}</span>
                </button>
              ))}
            </div>
          )}

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
