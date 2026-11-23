import React, { useState } from 'react';
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
} from 'lucide-react';
import type {
  AttributesState,
  ConsoleLogEntry,
  RightBottomTab,
} from '../types/studio';

interface RightInspectorDockProps {
  attributes: AttributesState;
  onUpdateAttributes: (patch: Partial<AttributesState>) => void;
  bottomTab: RightBottomTab;
  onChangeBottomTab: (tab: RightBottomTab) => void;
  codeDocument: string;
  onChangeCodeDocument: (code: string) => void;
  logs: ConsoleLogEntry[];
  isEditingLayer: boolean;
}

export const RightInspectorDock: React.FC<RightInspectorDockProps> = ({
  attributes,
  onUpdateAttributes,
  bottomTab,
  onChangeBottomTab,
  codeDocument,
  onChangeCodeDocument,
  logs,
  isEditingLayer,
}) => {
  const [topTab, setTopTab] = useState<'Attributes Editor' | 'Material Editor'>('Attributes Editor');
  const [expandedFolder, setExpandedFolder] = useState(true);

  const codeLines = codeDocument.split('\n');

  return (
    <aside className="flex flex-col h-full bg-[#16181D] border-l border-[#232730] select-none overflow-hidden">
      {/* TOP HALF: Attributes Editor | Material Editor */}
      <div className="flex flex-col flex-1 min-h-0 border-b border-[#232730]">
        <div className="h-[28px] px-2.5 bg-[#1A1D24] border-b border-[#232730] flex items-center justify-between shrink-0">
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
          <Menu className="w-3 h-3 text-[#6B7280]" />
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
                      value={attributes.x}
                      onChange={(e) => onUpdateAttributes({ x: Number(e.target.value) || 0 })}
                      className="w-12 bg-transparent text-right text-[#D1D5DB] focus:outline-none focus:text-white"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[#8E95A2]">
                    <span>Y</span>
                    <input
                      type="number"
                      value={attributes.y}
                      onChange={(e) => onUpdateAttributes({ y: Number(e.target.value) || 0 })}
                      className="w-10 bg-transparent text-right text-[#D1D5DB] focus:outline-none focus:text-white"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[#8E95A2]">
                    <span>W</span>
                    <input
                      type="number"
                      value={attributes.w}
                      onChange={(e) => onUpdateAttributes({ w: Number(e.target.value) || 1 })}
                      className="w-12 bg-transparent text-right text-[#D1D5DB] focus:outline-none focus:text-white"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[#8E95A2]">
                    <span>H</span>
                    <input
                      type="number"
                      value={attributes.h}
                      onChange={(e) => onUpdateAttributes({ h: Number(e.target.value) || 1 })}
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
                  >
                    {attributes.fillVisible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
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
                    onUpdateAttributes({ strokeWidth: Math.max(1, attributes.strokeWidth) })
                  }
                  className="hover:text-white cursor-pointer"
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
                <span className="font-mono-code tabular-nums">{attributes.strokeOpacity}%</span>
                <span className="text-[#9CA3AF]">{attributes.strokeBlend}</span>
                <div className="flex items-center gap-1.5 text-[#8E95A2]">
                  <Eye className="w-3 h-3" />
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ strokeWidth: 0 })}
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
                <Plus className="w-3 h-3" />
              </div>
              <div className="flex items-center justify-between text-[#D1D5DB]">
                <span className="text-[#9CA3AF]">Tint</span>
                <div className="flex items-center gap-1.5 font-mono-code text-[10px]">
                  <input
                    type="color"
                    value={attributes.tintColor}
                    onChange={(e) => onUpdateAttributes({ tintColor: e.target.value })}
                    className="w-3 h-3 rounded-full bg-transparent border-0 cursor-pointer p-0"
                  />
                  <span>{attributes.tintColor.replace('#', '').toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#8E95A2]">
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ tintVisible: !attributes.tintVisible })}
                    className="cursor-pointer hover:text-white"
                  >
                    {attributes.tintVisible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>
                  <Minus className="w-3 h-3" />
                </div>
              </div>
              <div className="flex items-center justify-between text-[#D1D5DB]">
                <span className="text-[#9CA3AF]">Drop Shadow</span>
                <div className="flex items-center gap-1.5 font-mono-code text-[10px]">
                  <input
                    type="color"
                    value={attributes.shadowColor}
                    onChange={(e) => onUpdateAttributes({ shadowColor: e.target.value })}
                    className="w-3 h-3 rounded-full bg-transparent border-0 cursor-pointer p-0"
                  />
                  <span>{attributes.shadowColor.replace('#', '').toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#8E95A2]">
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ shadowVisible: !attributes.shadowVisible })}
                    className="cursor-pointer hover:text-white"
                  >
                    {attributes.shadowVisible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>
                  <Minus className="w-3 h-3" />
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
                    })
                  }
                  className="w-10 bg-transparent text-right font-mono-code tabular-nums focus:outline-none"
                />
                <div className="flex items-center gap-1.5 text-[#8E95A2]">
                  <button
                    type="button"
                    onClick={() => onUpdateAttributes({ blurVisible: !attributes.blurVisible })}
                    className="cursor-pointer hover:text-white"
                  >
                    {attributes.blurVisible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>
                  <Minus className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* TEXT */}
            <div className="p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[9.5px] uppercase tracking-wider text-[#6E7480]">
                <span>TEXT</span>
                <MoreHorizontal className="w-3.5 h-3.5" />
              </div>

              {isEditingLayer && (
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
                <span>|A| {attributes.letterSpacing}%</span>
                <span>I {attributes.paragraphSpacing}%</span>
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
        <div className="h-[28px] px-2 bg-[#1A1D24] border-b border-[#232730] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 overflow-x-auto">
            {bottomTab === 'Asset manager' && <Search className="w-3 h-3 text-[#8E95A2] shrink-0" />}
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
          <Menu className="w-3 h-3 text-[#6B7280] shrink-0" />
        </div>

        {bottomTab === 'Asset manager' && (
          <div className="flex-1 flex min-h-0">
            <div className="w-[138px] border-r border-[#232730] py-1.5 px-1.5 text-[10.5px] space-y-1 overflow-y-auto studio-scroll">
              <div className="flex items-center gap-1.5 text-[#9CA3AF]">
                <ChevronRight className="w-3 h-3" />
                <Folder className="w-3 h-3" />
                <span className="truncate">Program Files</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#262B36] text-white px-1 py-0.5 rounded-[2px]">
                <ChevronRight className="w-3 h-3" />
                <Folder className="w-3 h-3" />
                <span className="truncate">Label</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedFolder(!expandedFolder)}
                  className="flex items-center gap-1.5 text-[#9CA3AF] hover:text-white cursor-pointer"
                >
                  <ChevronDown className="w-3 h-3" />
                  <Folder className="w-3 h-3" />
                  <span>Documents</span>
                </button>
                {expandedFolder && (
                  <div className="pl-3.5 mt-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#D1D5DB]">
                      <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                      <Folder className="w-3 h-3" />
                      <span className="truncate">HMI Project</span>
                    </div>
                    <div className="pl-4 flex items-center gap-1.5 text-[#9CA3AF]">
                      <Folder className="w-3 h-3" />
                      <span>Label</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-3 flex items-start gap-4 bg-[#14161B]">
              {['Local Disc', 'Local Disc'].map((lbl, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 text-center">
                  <Folder className="w-7 h-7 text-[#9CA3AF] stroke-[1.3]" />
                  <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">{lbl}</span>
                </div>
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
            {logs.map((log) => (
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
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
