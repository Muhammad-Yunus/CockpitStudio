import React, { useState, useRef, useEffect } from 'react';
import {
  Minus,
  Square,
  X,
  MonitorSmartphone,
  Play,
  Square as StopIcon,
  Clapperboard,
  SlidersHorizontal,
  Database,
  UserCheck,
  KeyRound,
  Save,
} from 'lucide-react';
import type {
  BottomPanelMode,
  MobilePane,
  StudioUser,
  ViewportTab,
} from '../types/studio';

interface TopStudioBarProps {
  activeViewportTab: ViewportTab;
  onSelectViewportTab: (tab: ViewportTab) => void;
  bottomPanelMode: BottomPanelMode;
  onSelectBottomPanelMode: (mode: BottomPanelMode) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onStopSimulation: () => void;
  onTriggerLogicStep: () => void;
  user: StudioUser | null;
  projectName: string;
  isSavingProject: boolean;
  onSaveProject: () => void;
  onOpenAuthIngestModal: (initialTab?: 'auth' | 'projects' | 'ingest') => void;
  isFramedWindow: boolean;
  onToggleFramedWindow: () => void;
  mobilePane: MobilePane;
  onSelectMobilePane: (pane: MobilePane) => void;
}

export const TopStudioBar: React.FC<TopStudioBarProps> = ({
  activeViewportTab,
  onSelectViewportTab,
  bottomPanelMode,
  onSelectBottomPanelMode,
  isSimulating,
  onToggleSimulation,
  onStopSimulation,
  onTriggerLogicStep,
  user,
  projectName,
  isSavingProject,
  onSaveProject,
  onOpenAuthIngestModal,
  isFramedWindow,
  onToggleFramedWindow,
  mobilePane,
  onSelectMobilePane,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menus: Record<
    string,
    Array<{ label: string; shortcut?: string; action: () => void; divider?: boolean }>
  > = {
    File: [
      {
        label: 'Save Project to PostgreSQL',
        shortcut: 'Ctrl+S',
        action: () => onSaveProject(),
      },
      {
        label: 'Projects & Cloud Workspace',
        action: () => onOpenAuthIngestModal('projects'),
      },
      {
        label: 'Account & Session',
        action: () => onOpenAuthIngestModal('auth'),
        divider: true,
      },
    ],
    Edit: [
      {
        label: 'Trigger Logic Step (ArrowDown)',
        shortcut: '↓',
        action: () => onTriggerLogicStep(),
      },
      {
        label: 'Switch to Logic Editor',
        action: () => onSelectBottomPanelMode('Logic Editor'),
      },
      {
        label: 'Switch to Transition Editor',
        action: () => onSelectBottomPanelMode('Transition Editor'),
      },
    ],
    View: [
      {
        label: 'Cluster HMI Canvas (Infotainment)',
        action: () => onSelectViewportTab('Infotainment'),
      },
      {
        label: '3D Spatial Viewport (Cluster)',
        action: () => onSelectViewportTab('Cluster'),
      },
      {
        label: 'Root Composition Overview',
        action: () => onSelectViewportTab('Root'),
      },
      {
        label: isFramedWindow ? 'Expand Fullscreen IDE' : 'Framed Studio Backdrop',
        action: () => onToggleFramedWindow(),
        divider: true,
      },
    ],
    Project: [
      {
        label: 'External Telemetry Ingest API',
        action: () => onOpenAuthIngestModal('ingest'),
      },
      {
        label: 'Manage API Keys (cs_live_*)',
        action: () => onOpenAuthIngestModal('ingest'),
      },
      {
        label: 'Asset Database',
        action: () => onSelectBottomPanelMode('Asset Database'),
      },
    ],
    Simulation: [
      {
        label: isSimulating ? 'Pause Simulation' : 'Start Simulation',
        shortcut: 'Space',
        action: () => onToggleSimulation(),
      },
      {
        label: 'Stop & Reset Playhead',
        action: () => onStopSimulation(),
      },
      {
        label: 'Execute Node Graph Step',
        action: () => onTriggerLogicStep(),
      },
    ],
    Help: [
      {
        label: 'Zod Ingest Schema & Docs',
        action: () => onOpenAuthIngestModal('ingest'),
      },
    ],
  };

  return (
    <header className="select-none bg-[#121419] border-b border-[#232730]">
      {/* Window Title Bar */}
      <div className="h-[28px] px-3 flex items-center justify-between border-b border-[#1D2028]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] font-medium tracking-tight text-[#D1D5DB] whitespace-nowrap">
            CockpitStudio
          </span>
          <span className="hidden sm:inline text-[10px] text-[#6B7280] truncate">
            {projectName}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSaveProject}
            disabled={isSavingProject}
            className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium text-[#9CA3AF] hover:text-white bg-[#1B1E25] hover:bg-[#242833] border border-[#282D38] rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Save workspace to PostgreSQL"
          >
            <Save className="w-3 h-3 text-[#24B0FF]" />
            <span>{isSavingProject ? 'Saving...' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAuthIngestModal('ingest')}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium text-[#D1D5DB] hover:text-white bg-[#1B1E25] hover:bg-[#242833] border border-[#282D38] rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3 h-3 text-[#10B981]" />
            <span>Ingest API</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAuthIngestModal('auth')}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium text-[#D1D5DB] hover:text-white bg-[#1B1E25] hover:bg-[#242833] border border-[#282D38] rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {user ? (
              <UserCheck className="w-3 h-3 text-[#10B981]" />
            ) : (
              <KeyRound className="w-3 h-3 text-[#9CA3AF]" />
            )}
            <span className="max-w-[96px] truncate">{user ? user.name : 'Sign In'}</span>
          </button>

          <div className="hidden md:flex items-center gap-2.5 ml-2 text-[#6B7280]">
            <button
              type="button"
              onClick={onToggleFramedWindow}
              className="hover:text-[#D1D5DB] transition-colors cursor-pointer"
              title="Minimize / Frame view"
              aria-label="Minimize window frame"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onToggleFramedWindow}
              className="hover:text-[#D1D5DB] transition-colors cursor-pointer"
              title="Toggle fullscreen frame"
              aria-label="Maximize window frame"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={onStopSimulation}
              className="hover:text-[#EF4444] transition-colors cursor-pointer"
              title="Reset simulation"
              aria-label="Reset simulation"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Menu Bar & Transport Controls */}
      <div
        ref={menuRef}
        className="h-[28px] px-2 flex items-center justify-between bg-[#15171C] relative"
      >
        {/* Left Menu Items */}
        <nav className="flex items-center gap-0.5 text-[11px] text-[#B5BAC4]" aria-label="Studio Menu">
          {Object.keys(menus).map((menuName) => (
            <div key={menuName} className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === menuName ? null : menuName)}
                className={`px-2 py-0.5 rounded-[2px] transition-colors whitespace-nowrap cursor-pointer ${
                  openMenu === menuName
                    ? 'bg-[#262B36] text-white'
                    : 'hover:bg-[#1F232C] hover:text-white'
                }`}
              >
                {menuName}
              </button>
              {openMenu === menuName && (
                <div className="absolute left-0 top-full mt-0.5 w-60 bg-[#1B1E25] border border-[#2C313D] rounded-[3px] shadow-2xl py-1 z-50">
                  {menus[menuName].map((item) => (
                    <React.Fragment key={item.label}>
                      {item.divider && <div className="my-1 border-t border-[#262A34]" />}
                      <button
                        type="button"
                        onClick={() => {
                          item.action();
                          setOpenMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-[#D1D5DB] hover:bg-[#262B36] hover:text-white flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <span className="truncate">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-[10px] text-[#6B7280] font-mono-code">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Center 5-Icon Playback / Preview Bar (exact match to screenshots 2 & 3) */}
        <div className="hidden sm:flex items-center gap-3 text-[#8E95A2]">
          <button
            type="button"
            onClick={() =>
              onSelectViewportTab(activeViewportTab === 'Infotainment' ? 'Cluster' : 'Infotainment')
            }
            className={`p-1 rounded-[2px] hover:text-white transition-colors cursor-pointer ${
              activeViewportTab === 'Infotainment' ? 'text-[#D1D5DB]' : ''
            }`}
            title="Switch HMI Display / 3D Scene"
          >
            <MonitorSmartphone className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTriggerLogicStep}
            className="p-1 rounded-[2px] hover:text-white transition-colors cursor-pointer"
            title="Step Logic Node Graph"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleSimulation}
            className={`p-1 rounded-[2px] transition-colors cursor-pointer ${
              isSimulating ? 'text-[#10B981]' : 'hover:text-white'
            }`}
            title={isSimulating ? 'Pause Simulation' : 'Play Simulation'}
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onStopSimulation}
            className="p-1 rounded-[2px] hover:text-white transition-colors cursor-pointer"
            title="Stop Simulation"
          >
            <StopIcon className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() =>
              onSelectBottomPanelMode(
                bottomPanelMode === 'Transition Editor' ? 'Logic Editor' : 'Transition Editor'
              )
            }
            className={`p-1 rounded-[2px] hover:text-white transition-colors cursor-pointer ${
              bottomPanelMode === 'Transition Editor' ? 'text-[#24B0FF]' : ''
            }`}
            title="Toggle Transition / Logic Editor"
          >
            <Clapperboard className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Quick Mode Indicator */}
        <div className="hidden lg:flex items-center gap-2 text-[10px] text-[#6B7280] pr-1">
          <button
            type="button"
            onClick={() =>
              onSelectBottomPanelMode(
                bottomPanelMode === 'Logic Editor' ? 'Transition Editor' : 'Logic Editor'
              )
            }
            className="hover:text-[#D1D5DB] transition-colors whitespace-nowrap cursor-pointer"
          >
            {bottomPanelMode}
          </button>
        </div>
      </div>

      {/* Responsive Mobile / Tablet Pane Switcher (< 1024px) */}
      <div className="flex lg:hidden items-center gap-1 px-2 py-1.5 bg-[#121419] border-t border-[#222630] overflow-x-auto">
        {(
          [
            { id: 'canvas', label: 'Viewport' },
            { id: 'outliner', label: 'Outliners' },
            { id: 'inspector', label: 'Attributes' },
            { id: 'logic', label: 'Logic & Timeline' },
            { id: 'api', label: 'Ingest API' },
          ] as Array<{ id: MobilePane; label: string }>
        ).map((pane) => (
          <button
            key={pane.id}
            type="button"
            onClick={() => {
              if (pane.id === 'api') {
                onOpenAuthIngestModal('ingest');
              } else {
                onSelectMobilePane(pane.id);
              }
            }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-[3px] whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              mobilePane === pane.id
                ? 'bg-[#262B36] text-white border border-[#343B49]'
                : 'text-[#8E95A2] hover:text-white bg-[#181B22]'
            }`}
          >
            {pane.label}
          </button>
        ))}
      </div>
    </header>
  );
};
