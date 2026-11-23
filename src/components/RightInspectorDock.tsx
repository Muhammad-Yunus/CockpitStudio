import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Plus,
  Minus,
  Eye,
  EyeOff,
  MoreHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  ChevronRight,
  Folder,
  Search,
  FileCode2,
  Box,
} from 'lucide-react';
import type {
  AttributesState,
  ConsoleLogEntry,
  HmiLayer,
  RightBottomTab,
} from '../types/studio';

interface RightInspectorDockProps {
  attributes: AttributesState;
  onUpdateAttributes: (patch: Partial<AttributesState>) => void;
  bottomTab: RightBottomTab;
  onChangeBottomTab: (tab: RightBottomTab) => void;
  codeDocument: string;
  onChangeCodeDocument: (code: string) => void;
  onResetCodeDocument: () => void;
  onExportHtml: () => void;
  onClearConsoleLogs: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onInsertAssetLayer: (kind: HmiLayer['kind'], label: string) => void;
  onImportAssetFile: (file: File) => void;
  logs: ConsoleLogEntry[];
  isEditingLayer: boolean;
}

const ASSET_FOLDER_FILES: Record<
  string,
  Array<{ name: string; kind: HmiLayer['kind']; label: string }>
> = {
  'Program Files': [
    { name: 'Speedo_Widget.hmi', kind: 'rectangle', label: 'Speedo Panel' },
    { name: 'Cluster_Frame.hmi', kind: 'frame', label: 'Cluster Frame' },
  ],
  Label: [
    { name: 'Gear_Indicator.txt', kind: 'text', label: 'DRIVE MODE' },
    { name: 'Alert_Badge.vec', kind: 'vector', label: 'Alert Marker' },
  ],
  Documents: [
    { name: 'Needle_Curve.svg', kind: 'pen', label: 'Needle Path' },
    { name: 'Battery_Bar.hmi', kind: 'rectangle', label: 'SOC Bar' },
  ],
  'HMI Project': [
    { name: 'Nav_Overlay.hmi', kind: 'frame', label: 'Nav Container' },
    { name: 'Media_Title.txt', kind: 'text', label: 'Now Playing' },
  ],
  'Local Disc': [
    { name: 'EV_Status_Box.hmi', kind: 'rectangle', label: 'EV Status' },
    { name: 'Range_Readout.txt', kind: 'text', label: '461 km' },
  ],
};

export const RightInspectorDock: React.FC<RightInspectorDockProps> = ({
  attributes,
  onUpdateAttributes,
  bottomTab,
  onChangeBottomTab,
  codeDocument,
  onChangeCodeDocument,
  onResetCodeDocument,
  onExportHtml,
  onClearConsoleLogs,
  onDuplicateSelected,
  onDeleteSelected,
  onInsertAssetLayer,
  onImportAssetFile,
  logs,
  isEditingLayer,
}) => {
  const [topTab, setTopTab] = useState<'Attributes Editor' | 'Material Editor'>('Attributes Editor');
  const [expandedFolder, setExpandedFolder] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>('Label');
  const [assetSearchOpen, setAssetSearchOpen] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [importedFiles, setImportedFiles] = useState<
    Array<{ name: string; kind: HmiLayer['kind']; label: string }>
  >([]);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(false);
  const [textMenuOpen, setTextMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const topMenuRef = useRef<HTMLDivElement>(null);
  const bottomMenuRef = useRef<HTMLDivElement>(null);
  const textMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
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
      if (textMenuOpen && textMenuRef.current && !textMenuRef.current.contains(e.target as Node)) {
        setTextMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [topMenuOpen, bottomMenuOpen, textMenuOpen]);

  const codeLines = codeDocument.split('\n');
  const baseAssets =
    selectedFolder === 'Local Disc' && importedFiles.length > 0
      ? [...importedFiles, ...ASSET_FOLDER_FILES['Local Disc']]
      : ASSET_FOLDER_FILES[selectedFolder] || ASSET_FOLDER_FILES.Label;
  const currentAssets = baseAssets.filter(
    (item) =>
      !assetSearchQuery || item.name.toLowerCase().includes(assetSearchQuery.toLowerCase())
  );

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(codeDocument).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  return (
    <aside className="flex flex-col h-full bg-[#16181D] border-l border-[#232730] select-none overflow-hidden">
      {/* TOP HALF: Attributes Editor | Material Editor */}
      <div className="flex flex-col flex-1 min-h-0 border-b border-[#232730]">
        <div className="h-[28px] px-2.5 bg-[#1A1D24] border-b border-[#232730] flex items-center justify-between shrink-0 relative">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTopTab('Attributes Editor')}
              className={`text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                topTab === 'Attributes Editor'
                  ? 'text-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#9CA3AF]'
              }`}
            >
              Attributes Editor
            </button>
            <button
              type="button"
              onClick={() => setTopTab('Material Editor')}
              className={`text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                topTab === 'Material Editor'
                  ? 'text-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#9CA3AF]'
              }`}
            >
              Material Editor
            </button>
          </div>
          <div ref={topMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setTopMenuOpen((o) => !o)}
              className={`hover:text-white cursor-pointer ${
                topMenuOpen ? 'text-[#24B0FF]' : 'text-[#6B7280]'
              }`}
              title="Inspector Actions"
            >
              <Menu className="w-3 h-3" />
            </button>
            {topMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1 z-50 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    onDuplicateSelected();
                    setTopMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Duplicate Selected Layer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateAttributes({ x: 0, y: 0, angle: 0, opacity: 100 });
                    setTopMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Reset Transform
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateAttributes({
                      fillVisible: true,
                      fillOpacity: 100,
                      strokeVisible: true,
                      strokeWidth: 1,
                      tintVisible: false,
                      shadowVisible: false,
                      blurVisible: false,
                      backgroundBlur: 0,
                    });
                    setTopMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Reset Styles & Effects
                </button>
                <div className="my-1 border-t border-[#262A34]" />
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
              </div>
            )}
          </div>
        </div>

        {topTab === 'Attributes Editor' ? (
          <div className="flex-1 overflow-y-auto studio-scroll divide-y divide-[#222630] text-[10.5px]">
            {/* OBJECT */}
            <div className="p-2.5 space-y-2">
              <div className="text-[9.5px] uppercase tracking-wider text-[#6E7480]">OBJECT</div>
              <input
                type="text"
                value={attributes.objectName}
                onChange={(e) => onUpdateAttributes({ objectName: e.target.value })}
                placeholder="Object name"
                className="w-full bg-transparent text-[#C2C7D0] focus:text-white text-[11px] focus:outline-none border-b border-transparent focus:border-[#24B0FF] pb-0.5"
              />
              <div className="flex items-center justify-between gap-2 text-[#D1D5DB]">
                <select
                  value={attributes.objectType}
                  onChange={(e) => onUpdateAttributes({ objectType: e.target.value })}
                  className="bg-transparent text-[#D1D5DB] focus:outline-none cursor-pointer text-[10.5px]"
                >
                  <option value="Rectangle" className="bg-[#1B1E25]">Rectangle</option>
                  <option value="Frame" className="bg-[#1B1E25]">Frame</option>
                  <option value="Text" className="bg-[#1B1E25]">Text</option>
                  <option value="Vector" className="bg-[#1B1E25]">Vector</option>
                  <option value="Gauge" className="bg-[#1B1E25]">Gauge</option>
                  <option value="Clock" className="bg-[#1B1E25]">Clock</option>
                  <option value="3D Mesh" className="bg-[#1B1E25]">3D Mesh</option>
                </select>
                <div className="flex items-center gap-2 font-mono-code tabular-nums">
                  <label className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={attributes.opacity}
                      onChange={(e) =>
                        onUpdateAttributes({
                          opacity: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      className="w-8 bg-transparent text-right text-[#D1D5DB] focus:outline-none focus:text-white"
                    />
                    <span className="text-[#6B7280]">%</span>
                  </label>
                  <input
                    type="number"
                    value={attributes.zOrder}
                    onChange={(e) =>
                      onUpdateAttributes({ zOrder: Number(e.target.value) || 0 })
                    }
                    className="w-10 bg-transparent text-right text-[#D1D5DB] focus:outline-none focus:text-white"
                    title="Z-Order"
                  />
                </div>
              </div>
            </div>

            {/* TRANSFORMATIONS */}
            <div className="p-2.5 space-y-2">
              <div className="text-[9.5px] uppercase tracking-wider text-[#6E7480]">
                TRANSFORMATIONS
              </div>
              <div className="flex items-start gap-2.5">
                {/* Interactive 2D Constraint Pin Box */}
                <div
                  className="w-[62px] h-[34px] bg-[#121419] border border-[#282D38] rounded-[2px] relative flex items-center justify-center shrink-0"
                  title="Click pins to cycle alignment anchor"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAttributes({
                        anchorV:
                          attributes.anchorV === 'Top'
                            ? 'Center'
                            : attributes.anchorV === 'Center'
                            ? 'Bottom'
                            : 'Top',
                      })
                    }
                    className="absolute inset-y-0.5 w-3 flex items-center justify-center cursor-pointer"
                    aria-label="Cycle vertical anchor"
                  >
                    <span
                      className={`w-[1px] h-full ${
                        attributes.anchorV === 'Bottom' ? 'bg-[#24B0FF]' : 'bg-[#4B5563]'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAttributes({
                        anchorH:
                          attributes.anchorH === 'Left'
                            ? 'Center'
                            : attributes.anchorH === 'Center'
                            ? 'Right'
                            : 'Left',
                      })
                    }
                    className="absolute inset-x-0.5 h-3 flex items-center justify-center cursor-pointer"
                    aria-label="Cycle horizontal anchor"
                  >
                    <span
                      className={`h-[1px] w-full ${
                        attributes.anchorH === 'Right' ? 'bg-[#24B0FF]' : 'bg-[#4B5563]'
                      }`}
                    />
                  </button>
                  <div className="w-4 h-4 border border-[#3B4252] pointer-events-none" />
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 flex-1 font-mono-code tabular-nums">
                  <label className="flex items-center justify-between text-[#8E95A2]">
                    <span>X</span>
                    <input
                      type="number"
                      step={attributes.objectType === '3D Mesh' ? 0.1 : 1}
                      value={attributes.x}
                      onChange={(e) => onUpdateAttributes({ x: Number(e.target.value) || 0 })}
                      className="w-12 bg-transparent text-right text-[#D1D5DB] focus:outline-none focus:text-white"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[#8E95A2]">
                    <span>Y</span>
                    <input
                      type="number"
                      step={attributes.objectType === '3D Mesh' ? 0.1 : 1}
                      value={attributes.y}
                      onChange={(e) => onUpdateAttributes({ y: Number(e.target.value) || 0 })}
                      className="w-10 bg-transparent text-right text-[#D1D5DB] focus:outline-none focus:text-white"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[#8E95A2]">
                    <span>{attributes.objectType === '3D Mesh' ? 'Z' : 'W'}</span>
                    <input
                      type="number"
                      step={attributes.objectType === '3D Mesh' ? 0.1 : 1}
                      value={attributes.objectType === '3D Mesh' ? attributes.z : attributes.w}
                      onChange={(e) =>
                        attributes.objectType === '3D Mesh'
                          ? onUpdateAttributes({ z: Number(e.target.value) || 0 })
                          : onUpdateAttributes({ w: Number(e.target.value) || 1 })
                      }
                      className="w-12 bg-transparent text-right text-[#D1D5DB] focus:outline-none focus:text-white"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[#8E95A2]">
                    <span>{attributes.objectType === '3D Mesh' ? 'RY' : 'H'}</span>
                    <input
                      type="number"
                      value={attributes.objectType === '3D Mesh' ? attributes.rotY : attributes.h}
                      onChange={(e) =>
                        attributes.objectType === '3D Mesh'
                          ? onUpdateAttributes({ rotY: Number(e.target.value) || 0 })
                          : onUpdateAttributes({ h: Number(e.target.value) || 1 })
                      }
                      className="w-10 bg-transparent text-right text-[#D1D5DB] focus:outline-none focus:text-white"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 text-[10px] text-[#D1D5DB] pt-0.5 items-center">
                <select
                  value={attributes.anchorV}
                  onChange={(e) =>
                    onUpdateAttributes({
                      anchorV: e.target.value as AttributesState['anchorV'],
                    })
                  }
                  className="bg-transparent text-[#D1D5DB] focus:outline-none cursor-pointer"
                >
                  <option value="Top" className="bg-[#1B1E25]">Top</option>
                  <option value="Center" className="bg-[#1B1E25]">Center</option>
                  <option value="Bottom" className="bg-[#1B1E25]">Bottom</option>
                </select>
                <select
                  value={attributes.anchorH}
                  onChange={(e) =>
                    onUpdateAttributes({
                      anchorH: e.target.value as AttributesState['anchorH'],
                    })
                  }
                  className="bg-transparent text-[#D1D5DB] focus:outline-none cursor-pointer"
                >
                  <option value="Left" className="bg-[#1B1E25]">Left</option>
                  <option value="Center" className="bg-[#1B1E25]">Center</option>
                  <option value="Right" className="bg-[#1B1E25]">Right</option>
                </select>
                <label className="flex items-center justify-end gap-0.5 font-mono-code tabular-nums">
                  <span className="text-[#6B7280]">∠</span>
                  <input
                    type="number"
                    value={attributes.angle}
                    onChange={(e) =>
                      onUpdateAttributes({ angle: Number(e.target.value) || 0 })
                    }
                    className="w-8 bg-transparent text-right focus:outline-none focus:text-white"
                  />
                </label>
                <label className="flex items-center justify-end gap-0.5 font-mono-code tabular-nums">
                  <span className="text-[#6B7280]">⌒</span>
                  <input
                    type="number"
                    min={0}
                    value={attributes.cornerRadius}
                    onChange={(e) =>
                      onUpdateAttributes({
                        cornerRadius: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-8 bg-transparent text-right focus:outline-none focus:text-white"
                  />
                </label>
              </div>
            </div>

            {/* ROTATION PIVOT */}
            <div className="p-2.5 space-y-1.5">
              <div className="text-[9.5px] uppercase tracking-wider text-[#6E7480]">
                ROTATION PIVOT
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono-code tabular-nums">
                <label className="flex items-center gap-1.5 text-[#8E95A2]">
                  <span>X</span>
                  <input
                    type="number"
                    value={attributes.pivotX}
                    onChange={(e) => onUpdateAttributes({ pivotX: Number(e.target.value) || 0 })}
                    className="w-10 bg-transparent text-[#D1D5DB] focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[#8E95A2]">
                  <span>Y</span>
                  <input
                    type="number"
                    value={attributes.pivotY}
                    onChange={(e) => onUpdateAttributes({ pivotY: Number(e.target.value) || 0 })}
                    className="w-10 bg-transparent text-[#D1D5DB] focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[#8E95A2]">
                  <span>Z</span>
                  <input
                    type="number"
                    value={attributes.pivotZ}
                    onChange={(e) => onUpdateAttributes({ pivotZ: Number(e.target.value) || 0 })}
                    className="w-10 bg-transparent text-[#D1D5DB] focus:outline-none"
                  />
                </label>
              </div>
            </div>

            {/* FILL */}
            <div className="p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[9.5px] uppercase tracking-wider text-[#6E7480]">
                <span>FILL</span>
                <button
                  type="button"
                  onClick={() => onUpdateAttributes({ fillVisible: true, fillOpacity: 100 })}
                  className="hover:text-white cursor-pointer"
                  title="Enable Fill"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-[#D1D5DB]">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={attributes.fillColor}
                    onChange={(e) => onUpdateAttributes({ fillColor: e.target.value })}
                    className="w-3.5 h-3.5 rounded-full bg-transparent border-0 cursor-pointer p-0"
                  />
                  <span className="font-mono-code text-[10px]">
                    {attributes.fillColor.replace('#', '').toUpperCase()}
                  </span>
                </div>
                <label className="flex items-center font-mono-code tabular-nums">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={attributes.fillOpacity}
                    onChange={(e) =>
                      onUpdateAttributes({
                        fillOpacity: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-8 bg-transparent text-right focus:outline-none"
                  />
                  <span className="text-[#6B7280]">%</span>
                </label>
                <select
                  value={attributes.fillBlend}
                  onChange={(e) => onUpdateAttributes({ fillBlend: e.target.value })}
                  className="bg-transparent text-[#9CA3AF] focus:outline-none cursor-pointer text-[10px]"
                >
                  <option value="Normal" className="bg-[#1B1E25]">Normal</option>
                  <option value="Multiply" className="bg-[#1B1E25]">Multiply</option>
                  <option value="Screen" className="bg-[#1B1E25]">Screen</option>
                </select>
                <div className="flex items-center gap-1.5 text-[#8E95A2]">
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ fillVisible: !attributes.fillVisible })}
                    className="cursor-pointer hover:text-white"
                    title="Toggle Fill Visibility"
                  >
                    {attributes.fillVisible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-[#4B5563]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ fillVisible: false })}
                    className="cursor-pointer hover:text-white"
                    title="Hide Fill"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* STROKE */}
            <div className="p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[9.5px] uppercase tracking-wider text-[#6E7480]">
                <span>STROKE</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAttributes({
                      strokeVisible: true,
                      strokeWidth: Math.max(1, attributes.strokeWidth),
                    })
                  }
                  className="hover:text-white cursor-pointer"
                  title="Enable Stroke"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-[#D1D5DB]">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={attributes.strokeColor}
                    onChange={(e) => onUpdateAttributes({ strokeColor: e.target.value })}
                    className="w-3.5 h-3.5 rounded-full bg-transparent border-0 cursor-pointer p-0"
                  />
                  <span className="font-mono-code text-[10px]">
                    {attributes.strokeColor.replace('#', '').toUpperCase()}
                  </span>
                </div>
                <label className="flex items-center font-mono-code tabular-nums">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={attributes.strokeOpacity}
                    onChange={(e) =>
                      onUpdateAttributes({
                        strokeOpacity: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-8 bg-transparent text-right focus:outline-none"
                  />
                  <span className="text-[#6B7280]">%</span>
                </label>
                <select
                  value={attributes.strokeBlend}
                  onChange={(e) => onUpdateAttributes({ strokeBlend: e.target.value })}
                  className="bg-transparent text-[#9CA3AF] focus:outline-none cursor-pointer text-[10px]"
                >
                  <option value="Normal" className="bg-[#1B1E25]">Normal</option>
                  <option value="Multiply" className="bg-[#1B1E25]">Multiply</option>
                  <option value="Screen" className="bg-[#1B1E25]">Screen</option>
                </select>
                <div className="flex items-center gap-1.5 text-[#8E95A2]">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAttributes({ strokeVisible: !attributes.strokeVisible })
                    }
                    className="cursor-pointer hover:text-white"
                    title="Toggle Stroke Visibility"
                  >
                    {attributes.strokeVisible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-[#4B5563]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ strokeVisible: false, strokeWidth: 0 })}
                    className="cursor-pointer hover:text-white"
                    title="Clear Stroke"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[#9CA3AF]">
                <div className="flex items-center gap-4">
                  <select
                    value={attributes.strokeAlign}
                    onChange={(e) =>
                      onUpdateAttributes({
                        strokeAlign: e.target.value as AttributesState['strokeAlign'],
                      })
                    }
                    className="bg-transparent text-[#D1D5DB] focus:outline-none cursor-pointer text-[10px]"
                  >
                    <option value="Inside" className="bg-[#1B1E25]">Inside</option>
                    <option value="Center" className="bg-[#1B1E25]">Center</option>
                    <option value="Outside" className="bg-[#1B1E25]">Outside</option>
                  </select>
                  <label className="flex items-center gap-1 font-mono-code tabular-nums text-[#D1D5DB]">
                    <span className="text-[#6B7280]">≡</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={attributes.strokeWidth}
                      onChange={(e) =>
                        onUpdateAttributes({
                          strokeWidth: Math.max(0, Number(e.target.value) || 0),
                          strokeVisible: (Number(e.target.value) || 0) > 0,
                        })
                      }
                      className="w-8 bg-transparent focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* EFFECTS */}
            <div className="p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[9.5px] uppercase tracking-wider text-[#6E7480]">
                <span>EFFECTS</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAttributes({
                      tintVisible: true,
                      shadowVisible: true,
                      blurVisible: true,
                      backgroundBlur: Math.max(20, attributes.backgroundBlur),
                    })
                  }
                  className="hover:text-white cursor-pointer"
                  title="Enable All Effects"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[#D1D5DB]">
                <span className="text-[#9CA3AF]">Tint</span>
                <div className="flex items-center gap-1.5 font-mono-code text-[10px]">
                  <input
                    type="color"
                    value={attributes.tintColor}
                    onChange={(e) =>
                      onUpdateAttributes({ tintColor: e.target.value, tintVisible: true })
                    }
                    className="w-3 h-3 rounded-full bg-transparent border-0 cursor-pointer p-0"
                  />
                  <span>{attributes.tintColor.replace('#', '').toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#8E95A2]">
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ tintVisible: !attributes.tintVisible })}
                    className="cursor-pointer hover:text-white"
                    title="Toggle Tint"
                  >
                    {attributes.tintVisible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-[#4B5563]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ tintVisible: false })}
                    className="cursor-pointer hover:text-white"
                    title="Disable Tint"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[#D1D5DB]">
                <span className="text-[#9CA3AF]">Drop Shadow</span>
                <div className="flex items-center gap-1.5 font-mono-code text-[10px]">
                  <input
                    type="color"
                    value={attributes.shadowColor}
                    onChange={(e) =>
                      onUpdateAttributes({ shadowColor: e.target.value, shadowVisible: true })
                    }
                    className="w-3 h-3 rounded-full bg-transparent border-0 cursor-pointer p-0"
                  />
                  <span>{attributes.shadowColor.replace('#', '').toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#8E95A2]">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAttributes({ shadowVisible: !attributes.shadowVisible })
                    }
                    className="cursor-pointer hover:text-white"
                    title="Toggle Drop Shadow"
                  >
                    {attributes.shadowVisible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-[#4B5563]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ shadowVisible: false })}
                    className="cursor-pointer hover:text-white"
                    title="Disable Drop Shadow"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[#D1D5DB]">
                <span className="text-[#9CA3AF]">Background blur</span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={attributes.backgroundBlur}
                  onChange={(e) =>
                    onUpdateAttributes({
                      backgroundBlur: Math.max(0, Number(e.target.value) || 0),
                      blurVisible: (Number(e.target.value) || 0) > 0,
                    })
                  }
                  className="w-10 bg-transparent text-right font-mono-code tabular-nums focus:outline-none"
                />
                <div className="flex items-center gap-1.5 text-[#8E95A2]">
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ blurVisible: !attributes.blurVisible })}
                    className="cursor-pointer hover:text-white"
                    title="Toggle Background Blur"
                  >
                    {attributes.blurVisible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-[#4B5563]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ blurVisible: false, backgroundBlur: 0 })}
                    className="cursor-pointer hover:text-white"
                    title="Remove Background Blur"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* TEXT */}
            <div className="p-2.5 space-y-2 relative">
              <div className="flex items-center justify-between text-[9.5px] uppercase tracking-wider text-[#6E7480]">
                <span>TEXT</span>
                <div ref={textMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setTextMenuOpen((o) => !o)}
                    className="hover:text-white cursor-pointer"
                    title="Typography Presets"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  {textMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1 z-50 text-[11px] normal-case tracking-normal">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateAttributes({
                            fontFamily: 'Saira Semi Condensed',
                            fontWeight: 'SemiBold',
                            fontSize: 18,
                            textTransform: 'uppercase',
                          });
                          setTextMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                      >
                        Preset: Cluster Readout
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateAttributes({
                            fontFamily: 'JetBrains Mono',
                            fontWeight: 'Regular',
                            fontSize: 11,
                            letterSpacing: 4,
                          });
                          setTextMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                      >
                        Preset: Telemetry Mono
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateAttributes({
                            fontFamily: 'Saira Semi Condensed',
                            fontWeight: 'Regular',
                            fontSize: 11,
                            lineHeight: 20,
                            letterSpacing: 0,
                            paragraphSpacing: 0,
                          });
                          setTextMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                      >
                        Reset Typography
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {(isEditingLayer || attributes.selectedNodeId === 'minutes-label') && (
                <input
                  type="text"
                  value={attributes.textContent}
                  onChange={(e) => onUpdateAttributes({ textContent: e.target.value })}
                  placeholder="Layer text content..."
                  className="w-full px-2 py-1 bg-[#121419] border border-[#282D38] rounded-[2px] text-[10.5px] text-white focus:outline-none focus:border-[#24B0FF]"
                />
              )}

              <div className="flex items-center justify-between gap-2 text-[#D1D5DB]">
                <select
                  value={attributes.fontFamily}
                  onChange={(e) => onUpdateAttributes({ fontFamily: e.target.value })}
                  className="bg-transparent text-[#D1D5DB] focus:outline-none cursor-pointer truncate max-w-[140px]"
                >
                  <option value="Saira Semi Condensed" className="bg-[#1B1E25]">
                    Saira Semi Condensed
                  </option>
                  <option value="Plus Jakarta Sans" className="bg-[#1B1E25]">
                    Plus Jakarta Sans
                  </option>
                  <option value="JetBrains Mono" className="bg-[#1B1E25]">
                    JetBrains Mono
                  </option>
                </select>
                <select
                  value={attributes.fontWeight}
                  onChange={(e) => onUpdateAttributes({ fontWeight: e.target.value })}
                  className="bg-transparent text-[#D1D5DB] focus:outline-none cursor-pointer"
                >
                  <option value="Regular" className="bg-[#1B1E25]">Regular</option>
                  <option value="SemiBold" className="bg-[#1B1E25]">SemiBold</option>
                  <option value="Bold" className="bg-[#1B1E25]">Bold</option>
                </select>
              </div>
              <div className="grid grid-cols-4 gap-1 font-mono-code tabular-nums text-[#D1D5DB]">
                <label className="flex items-center gap-0.5">
                  <span className="text-[#6B7280]">AA</span>
                  <input
                    type="number"
                    min={8}
                    max={96}
                    value={attributes.fontSize}
                    onChange={(e) =>
                      onUpdateAttributes({ fontSize: Math.max(8, Number(e.target.value) || 11) })
                    }
                    className="w-7 bg-transparent focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-0.5">
                  <span className="text-[#6B7280]">A</span>
                  <input
                    type="number"
                    min={8}
                    max={120}
                    value={attributes.lineHeight}
                    onChange={(e) =>
                      onUpdateAttributes({
                        lineHeight: Math.max(8, Number(e.target.value) || 20),
                      })
                    }
                    className="w-7 bg-transparent focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-0.5" title="Letter Spacing %">
                  <span className="text-[#6B7280]">|A|</span>
                  <input
                    type="number"
                    min={-10}
                    max={50}
                    value={attributes.letterSpacing}
                    onChange={(e) =>
                      onUpdateAttributes({ letterSpacing: Number(e.target.value) || 0 })
                    }
                    className="w-6 bg-transparent text-right focus:outline-none"
                  />
                  <span className="text-[#6B7280]">%</span>
                </label>
                <label className="flex items-center gap-0.5" title="Paragraph Spacing %">
                  <span className="text-[#6B7280]">I</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={attributes.paragraphSpacing}
                    onChange={(e) =>
                      onUpdateAttributes({
                        paragraphSpacing: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-6 bg-transparent text-right focus:outline-none"
                  />
                  <span className="text-[#6B7280]">%</span>
                </label>
              </div>
              <div className="flex items-center justify-between text-[#8E95A2] pt-0.5">
                <div className="flex items-center gap-2">
                  {(
                    [
                      { id: 'left', icon: AlignLeft },
                      { id: 'center', icon: AlignCenter },
                      { id: 'right', icon: AlignRight },
                      { id: 'justify', icon: AlignJustify },
                    ] as const
                  ).map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onUpdateAttributes({ textAlign: a.id })}
                        className={`cursor-pointer hover:text-white ${
                          attributes.textAlign === a.id ? 'text-white' : ''
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-medium">
                  {(
                    [
                      { id: 'uppercase', label: 'AG' },
                      { id: 'lowercase', label: 'ag' },
                      { id: 'capitalize', label: 'Ag' },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onUpdateAttributes({ textTransform: c.id })}
                      className={`cursor-pointer hover:text-white ${
                        attributes.textTransform === c.id ? 'text-white' : 'text-[#8E95A2]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-3 space-y-3 text-[11px] overflow-y-auto studio-scroll">
            <div className="text-[10px] uppercase tracking-wider text-[#6E7480]">
              3D Viewport PBR Material
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#9CA3AF]">Surface Color</span>
              <input
                type="color"
                value={attributes.materialColor}
                onChange={(e) => onUpdateAttributes({ materialColor: e.target.value })}
                className="w-6 h-5 bg-transparent border-0 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Metalness</span>
                <span className="font-mono-code tabular-nums">
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
                <span className="font-mono-code tabular-nums">
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

      {/* BOTTOM HALF: Asset manager | Code Editor | Console */}
      <div className="flex flex-col h-[215px] shrink-0">
        <div className="h-[28px] px-2 bg-[#1A1D24] border-b border-[#232730] flex items-center justify-between shrink-0 relative">
          <div className="flex items-center gap-2.5 overflow-x-auto">
            {bottomTab === 'Asset manager' && (
              <button
                type="button"
                onClick={() => setAssetSearchOpen((s) => !s)}
                className={`hover:text-white cursor-pointer shrink-0 ${
                  assetSearchOpen ? 'text-[#24B0FF]' : 'text-[#8E95A2]'
                }`}
                title="Search Assets"
              >
                <Search className="w-3 h-3" />
              </button>
            )}
            {(['Asset manager', 'Code Editor', 'Console'] as RightBottomTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onChangeBottomTab(tab)}
                className={`text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                  bottomTab === tab ? 'text-[#E5E7EB]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div ref={bottomMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setBottomMenuOpen((o) => !o)}
              className={`hover:text-white cursor-pointer shrink-0 ${
                bottomMenuOpen ? 'text-[#24B0FF]' : 'text-[#6B7280]'
              }`}
              title="Asset / Code / Console Actions"
            >
              <Menu className="w-3 h-3" />
            </button>
            {bottomMenuOpen && (
              <div className="absolute right-0 bottom-full mb-1 w-48 bg-[#1C1F26] border border-[#2C313D] rounded-[3px] shadow-2xl py-1 z-50 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    handleCopyCode();
                    setBottomMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  {copiedCode ? 'Copied HTML!' : 'Copy HTML Code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExportHtml();
                    setBottomMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Export HTML Bundle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetCodeDocument();
                    setBottomMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Reset HTML Boilerplate
                </button>
                <div className="my-1 border-t border-[#262A34]" />
                <button
                  type="button"
                  onClick={() => {
                    onClearConsoleLogs();
                    setBottomMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#D1D5DB] hover:bg-[#262B36] hover:text-white cursor-pointer"
                >
                  Clear Console Logs
                </button>
              </div>
            )}
          </div>
        </div>

        {assetSearchOpen && bottomTab === 'Asset manager' && (
          <div className="px-2 py-1 bg-[#13151A] border-b border-[#232730]">
            <input
              type="text"
              value={assetSearchQuery}
              onChange={(e) => setAssetSearchQuery(e.target.value)}
              placeholder="Filter assets in folder..."
              className="w-full bg-[#1C1F26] border border-[#2C313D] rounded-[2px] px-2 py-0.5 text-[10.5px] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#24B0FF]"
            />
          </div>
        )}

        {bottomTab === 'Asset manager' && (
          <div className="flex-1 flex min-h-0">
            <div className="w-[138px] border-r border-[#232730] py-1.5 px-1.5 text-[10.5px] space-y-1 overflow-y-auto studio-scroll">
              <button
                type="button"
                onClick={() => setSelectedFolder('Program Files')}
                className={`w-full flex items-center gap-1.5 px-1 py-0.5 rounded-[2px] cursor-pointer ${
                  selectedFolder === 'Program Files'
                    ? 'bg-[#262B36] text-white'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <ChevronRight className="w-3 h-3" />
                <Folder className="w-3 h-3" />
                <span className="truncate">Program Files</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFolder('Label')}
                className={`w-full flex items-center gap-1.5 px-1 py-0.5 rounded-[2px] cursor-pointer ${
                  selectedFolder === 'Label'
                    ? 'bg-[#262B36] text-white'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <ChevronRight className="w-3 h-3" />
                <Folder className="w-3 h-3" />
                <span className="truncate">Label</span>
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedFolder(!expandedFolder);
                    setSelectedFolder('Documents');
                  }}
                  className={`w-full flex items-center gap-1.5 px-1 py-0.5 rounded-[2px] cursor-pointer ${
                    selectedFolder === 'Documents'
                      ? 'bg-[#262B36] text-white'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {expandedFolder ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <Folder className="w-3 h-3" />
                  <span>Documents</span>
                </button>
                {expandedFolder && (
                  <div className="pl-3.5 mt-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedFolder('HMI Project')}
                      className={`w-full flex items-center gap-1.5 px-1 py-0.5 rounded-[2px] cursor-pointer ${
                        selectedFolder === 'HMI Project'
                          ? 'bg-[#262B36] text-white'
                          : 'text-[#D1D5DB] hover:text-white'
                      }`}
                    >
                      <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                      <Folder className="w-3 h-3" />
                      <span className="truncate">HMI Project</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFolder('Label')}
                      className="w-full pl-4 flex items-center gap-1.5 text-[#9CA3AF] hover:text-white cursor-pointer"
                    >
                      <Folder className="w-3 h-3" />
                      <span>Label</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-2.5 flex flex-wrap content-start gap-3 bg-[#14161B] overflow-y-auto studio-scroll">
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.svg,.txt,.json,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const kind: HmiLayer['kind'] = file.name.endsWith('.svg')
                    ? 'vector'
                    : file.name.endsWith('.txt')
                    ? 'text'
                    : 'rectangle';
                  setImportedFiles((prev) => [
                    { name: file.name, kind, label: file.name.replace(/\.[^/.]+$/, '') },
                    ...prev.filter((p) => p.name !== file.name),
                  ]);
                  setSelectedFolder('Local Disc');
                  onImportAssetFile(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              {selectedFolder === 'Label' && !assetSearchQuery && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedFolder('Local Disc')}
                    className="flex flex-col items-center gap-1 text-center cursor-pointer group"
                    title="Open Local Disc assets"
                  >
                    <Folder className="w-7 h-7 text-[#9CA3AF] group-hover:text-[#24B0FF] stroke-[1.3]" />
                    <span className="text-[10px] text-[#9CA3AF] group-hover:text-white whitespace-nowrap">
                      Local Disc
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-center cursor-pointer group"
                    title="Import local asset file (.html, .svg, .txt, .json, .png)"
                  >
                    <div className="w-7 h-7 rounded-[3px] border border-dashed border-[#4B5563] group-hover:border-[#24B0FF] flex items-center justify-center">
                      <Plus className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#24B0FF]" />
                    </div>
                    <span className="text-[10px] text-[#9CA3AF] group-hover:text-white whitespace-nowrap">
                      Import File
                    </span>
                  </button>
                </>
              )}
              {currentAssets.map((asset) => (
                <button
                  key={asset.name}
                  type="button"
                  onClick={() => onInsertAssetLayer(asset.kind, asset.label)}
                  className="flex flex-col items-center gap-1 text-center max-w-[66px] cursor-pointer group"
                  title={`Click to insert ${asset.name} onto HMI Canvas`}
                >
                  {asset.kind === 'text' ? (
                    <FileCode2 className="w-6 h-6 text-[#60A5FA] group-hover:text-white stroke-[1.4]" />
                  ) : (
                    <Box className="w-6 h-6 text-[#10B981] group-hover:text-white stroke-[1.4]" />
                  )}
                  <span className="text-[9.5px] text-[#9CA3AF] group-hover:text-white truncate w-full">
                    {asset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {bottomTab === 'Code Editor' && (
          <div className="flex-1 flex bg-[#14161B] overflow-auto studio-scroll font-mono-code text-[10px] leading-[15px]">
            <div className="py-2 px-2 text-right text-[#4B5563] select-none border-r border-[#20242D]">
              {codeLines.map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>
            <textarea
              value={codeDocument}
              onChange={(e) => onChangeCodeDocument(e.target.value)}
              spellCheck={false}
              className="flex-1 p-2 bg-transparent text-[#93C5FD] focus:outline-none resize-none whitespace-pre"
            />
          </div>
        )}

        {bottomTab === 'Console' && (
          <div className="flex-1 p-2 bg-[#14161B] overflow-y-auto studio-scroll font-mono-code text-[10px] space-y-1.5">
            {logs.length === 0 ? (
              <div className="text-[#6B7280]">Console buffer cleared.</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={
                    log.level === 'error'
                      ? 'text-[#E05D56]'
                      : log.level === 'ingest'
                      ? 'text-[#24B0FF]'
                      : 'text-[#39B97A]'
                  }
                >
                  [{log.timestamp}] {log.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
