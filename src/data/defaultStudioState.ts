import type {
  AttributesState,
  ConsoleLogEntry,
  EasingConfig,
  LogicNode,
  LogicWire,
  ProjectNode,
  SceneNode,
  TelemetrySnapshot,
  TransitionTrack,
} from '../types/studio';

export const DEFAULT_SCENE_TREE: SceneNode[] = [
  { id: 'tell-tales', name: 'Tell-Tales', type: 'text', visible: true },
  { id: 'trip-computer', name: 'Trip Computer', type: 'folder', visible: true },
  {
    id: 'time',
    name: 'Time',
    type: 'clock',
    expanded: true,
    locked: true,
    visible: true,
    children: [
      { id: 'part-prefab', name: 'Part of prefab', type: 'prefab', muted: true },
      { id: 'part-instance', name: 'Part of instance', type: 'instance', muted: true },
    ],
  },
  {
    id: 'gauge-right',
    name: 'Gauge Right',
    type: 'folder',
    expanded: true,
    visible: true,
    children: [
      {
        id: 'needle',
        name: 'Needle',
        type: 'folder',
        expanded: true,
        children: [
          { id: 'needle-shape', name: 'Needle Shape', type: 'shape', visible: true },
          { id: 'needle-blur', name: 'Needle blur', type: 'blur', visible: true },
          { id: 'needle-mask', name: 'Needle mask', type: 'mask', visible: true },
        ],
      },
    ],
  },
  {
    id: 'gauge-left',
    name: 'Gauge Left',
    type: 'folder',
    expanded: true,
    visible: true,
    children: [
      {
        id: 'clock-left',
        name: 'Clock',
        type: 'clock',
        expanded: true,
        children: [
          {
            id: 'clock-label-1',
            name: 'Label',
            type: 'folder',
            expanded: true,
            children: [
              {
                id: 'minutes',
                name: 'Minutes',
                type: 'folder',
                expanded: true,
                children: [{ id: 'minutes-label', name: 'Label', type: 'text', visible: true }],
              },
              { id: 'clock-shadow', name: 'Shadow', type: 'shape', visible: true },
            ],
          },
        ],
      },
    ],
  },
];

export const DEFAULT_PROJECT_TREE: ProjectNode[] = [
  { id: 'proj-some-scene', name: 'Some scene', category: 'Unassigned', icon: 'scene' },
  { id: 'proj-car-viz', name: 'Car viz', category: 'Cluster', icon: 'car' },
  { id: 'proj-gauges', name: 'Gauges', category: 'Cluster', icon: 'gauge' },
  { id: 'proj-top-bar', name: 'Top bar', category: 'Infotainment', icon: 'topbar' },
  { id: 'proj-side-nav', name: 'Side Nav', category: 'Infotainment', icon: 'sidenav', active: true },
  { id: 'proj-map', name: 'Map', category: 'Infotainment', icon: 'map' },
  { id: 'proj-player', name: 'Player', category: 'Infotainment', icon: 'player' },
];

export const DEFAULT_ATTRIBUTES: AttributesState = {
  selectedNodeId: 'minutes-label',
  objectName: 'Rectangle',
  objectType: 'Rectangle',
  opacity: 100,
  zOrder: 1000,
  x: 45678,
  y: 34,
  z: 134,
  w: 47,
  h: 56,
  rotX: 47,
  rotY: 56,
  rotZ: 45678,
  scaleX: 23,
  scaleY: 67,
  scaleZ: 23,
  skewX: 45,
  skewY: 87,
  anchorV: 'Bottom',
  anchorH: 'Right',
  angle: 23,
  cornerRadius: 67,
  pivotX: 100,
  pivotY: 100,
  pivotZ: 100,
  fillColor: '#C2CDE4',
  fillOpacity: 100,
  fillBlend: 'Normal',
  fillVisible: true,
  strokeColor: '#24B0FF',
  strokeOpacity: 100,
  strokeBlend: 'Normal',
  strokeAlign: 'Outside',
  strokeWidth: 2,
  strokeVisible: true,
  tintColor: '#FF24F6',
  tintVisible: true,
  shadowColor: '#F59E0B',
  shadowVisible: true,
  backgroundBlur: 80,
  blurVisible: true,
  fontFamily: 'Saira Semi Condensed',
  fontWeight: 'Regular',
  fontSize: 11,
  lineHeight: 20,
  letterSpacing: 0,
  paragraphSpacing: 0,
  textAlign: 'left',
  textTransform: 'uppercase',
  textContent: 'READY',
  materialColor: '#D91414',
  materialMetalness: 0.25,
  materialRoughness: 0.32,
};

export const DEFAULT_LOGIC_NODES: LogicNode[] = [
  {
    id: 'node-on-key',
    title: 'On Key press - Down',
    nodeType: 'event',
    x: 48,
    y: 44,
    width: 196,
    enabled: true,
    repeatEnabled: true,
    triggerKey: 'ArrowDown',
    pins: [
      { id: 'out-alt', label: 'Is Alt', kind: 'event', direction: 'out', color: '#E05D56' },
      { id: 'out-ctrl', label: 'Is Control', kind: 'event', direction: 'out', color: '#E05D56' },
      { id: 'out-shift', label: 'Is Shift', kind: 'event', direction: 'out', color: '#E05D56' },
      { id: 'out-rej', label: 'Is Rejected', kind: 'event', direction: 'out', color: '#E05D56' },
    ],
  },
  {
    id: 'node-speed-in',
    title: 'Speed value',
    nodeType: 'variable',
    x: 84,
    y: 26,
    width: 162,
    value: 81,
    enabled: true,
    repeatEnabled: false,
    pins: [{ id: 'out-val', label: 'Input', kind: 'data', direction: 'out', color: '#45B87A' }],
  },
  {
    id: 'node-step-in',
    title: 'Increment step',
    nodeType: 'variable',
    x: 84,
    y: 112,
    width: 162,
    value: 1,
    enabled: true,
    repeatEnabled: false,
    pins: [{ id: 'out-step', label: 'Input', kind: 'data', direction: 'out', color: '#45B87A' }],
  },
  {
    id: 'node-substract',
    title: 'Substract',
    nodeType: 'math',
    x: 344,
    y: 48,
    width: 186,
    enabled: true,
    repeatEnabled: false,
    pins: [
      { id: 'in-1', label: 'Input 1', kind: 'data', direction: 'in', color: '#45B87A' },
      { id: 'in-2', label: 'Input 2', kind: 'data', direction: 'in', color: '#45B87A' },
      { id: 'out-res', label: 'Output', kind: 'data', direction: 'out', color: '#45B87A' },
    ],
  },
  {
    id: 'node-speed-out',
    title: 'Speed value',
    nodeType: 'variable',
    x: 590,
    y: 78,
    width: 168,
    value: 81,
    enabled: true,
    repeatEnabled: false,
    pins: [
      { id: 'in-val', label: 'Value', kind: 'data', direction: 'in', color: '#45B87A' },
      { id: 'out-val2', label: 'Val...', kind: 'data', direction: 'out', color: '#45B87A' },
    ],
  },
];

export const DEFAULT_LOGIC_WIRES: LogicWire[] = [
  {
    id: 'wire-1',
    fromNodeId: 'node-speed-in',
    fromPinId: 'out-val',
    toNodeId: 'node-substract',
    toPinId: 'in-1',
    color: '#45B87A',
  },
  {
    id: 'wire-2',
    fromNodeId: 'node-step-in',
    fromPinId: 'out-step',
    toNodeId: 'node-substract',
    toPinId: 'in-2',
    color: '#45B87A',
  },
  {
    id: 'wire-3',
    fromNodeId: 'node-substract',
    fromPinId: 'out-res',
    toNodeId: 'node-speed-out',
    toPinId: 'in-val',
    color: '#45B87A',
  },
];

export const DEFAULT_TRANSITION_TRACKS: TransitionTrack[] = [
  { id: 'tr-pos-x', label: 'x', group: 'Position', startMs: 20, endMs: 1200, color: '#D49A9A' },
  { id: 'tr-pos-y', label: 'y', group: 'Position', startMs: 420, endMs: 1200, color: '#A87466' },
  { id: 'tr-pos-z', label: 'z', group: 'Position', startMs: 920, endMs: 1220, color: '#4C9F95' },
  { id: 'tr-rot-x', label: 'x', group: 'Rotation', startMs: 700, endMs: 2800, color: '#4DA674' },
  { id: 'tr-rot-y', label: 'y', group: 'Rotation', startMs: 2600, endMs: 3200, color: '#6E7BC4' },
];

export const DEFAULT_EASING_CONFIG: EasingConfig = {
  targetLabel: 'BUTTON > POSITION > X',
  easeMode: 'Ease in',
  curveType: 'Cubic',
  durationMs: 300,
  delayMs: 100,
  stiffness: 230,
  damping: 132,
  mass: 3,
};

export const DEFAULT_CODE_DOCUMENT = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CockpitStudio</title>
  <meta name="description" content="CockpitStudio HMI">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div>CockpitStudio - HTML boilerplate</div>
</body>
</html>`;

export const DEFAULT_CONSOLE_LOGS: ConsoleLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026.11.22 19:10:51.349',
    level: 'info',
    message: 'Module::LoadProject() - Logic: 0.000819875s',
  },
  {
    id: 'log-2',
    timestamp: '2026.11.22 19:10:51.350',
    level: 'info',
    message: 'Runtime::BindTelemetryChannel() - Ready for HMI design & external API ingest.',
  },
];

export const DEFAULT_TELEMETRY_SNAPSHOT: TelemetrySnapshot = {
  speedKmh: 81,
  powerKw: 28,
  rangeKm: 461,
  gear: 'D',
  readyState: true,
  ambientTempC: 24,
  clockLabel: '11:24',
  tripTimeLabel: '9:12',
  tripDistanceKm: 20,
  etaLabel: '1h 20min',
  leftBlinker: false,
  rightBlinker: false,
  batterySocPct: 84,
  sourceSystem: 'Studio Blueprint',
  vehicleId: 'EV-CLUSTER-REF',
  ingestedAt: null,
  signals: {
    'Speed value': 81,
    'Increment step': 1,
  },
};

export const PRIMITIVE_MENU_ITEMS = [
  'Cube',
  'Cylinder',
  'Dome',
  'Plane',
  'Sphere',
  'Spring',
  'Torus',
] as const;

export const LIGHT_MENU_ITEMS = [
  'Directional Light',
  'Point Light',
  'Rim Light',
] as const;

export const DEFAULT_CLUSTER_LOGIC_NODES: LogicNode[] = [
  {
    id: 'cnode-telemetry',
    title: 'On Telemetry Frame',
    nodeType: 'event',
    x: 42,
    y: 44,
    width: 184,
    enabled: true,
    repeatEnabled: true,
    pins: [
      { id: 'c-out-speed', label: 'Speed Bus', kind: 'data', direction: 'out', color: '#45B87A' },
      { id: 'c-out-pwr', label: 'Power kW', kind: 'data', direction: 'out', color: '#45B87A' },
    ],
  },
  {
    id: 'cnode-clamp',
    title: 'Clamp Gauge Sweep',
    nodeType: 'math',
    x: 310,
    y: 52,
    width: 184,
    enabled: true,
    repeatEnabled: false,
    pins: [
      { id: 'c-in-1', label: 'Input 1', kind: 'data', direction: 'in', color: '#45B87A' },
      { id: 'c-out-angle', label: 'Needle Angle', kind: 'data', direction: 'out', color: '#45B87A' },
    ],
  },
  {
    id: 'cnode-gauge-out',
    title: 'Gauge Right Needle',
    nodeType: 'variable',
    x: 564,
    y: 62,
    width: 176,
    value: 28,
    enabled: true,
    repeatEnabled: false,
    pins: [{ id: 'c-in-val', label: 'Value', kind: 'data', direction: 'in', color: '#45B87A' }],
  },
];

export const DEFAULT_CLUSTER_LOGIC_WIRES: LogicWire[] = [
  {
    id: 'cwire-1',
    fromNodeId: 'cnode-telemetry',
    fromPinId: 'c-out-pwr',
    toNodeId: 'cnode-clamp',
    toPinId: 'c-in-1',
    color: '#45B87A',
  },
  {
    id: 'cwire-2',
    fromNodeId: 'cnode-clamp',
    fromPinId: 'c-out-angle',
    toNodeId: 'cnode-gauge-out',
    toPinId: 'c-in-val',
    color: '#45B87A',
  },
];

export const CONTEXT_MENU_ITEMS = [
  { label: 'Light', hasSubmenu: true },
  { label: 'Primitives', hasSubmenu: true },
  { label: 'Vector', hasSubmenu: true },
  { label: 'Audio', hasSubmenu: false },
  { label: 'Camera', hasSubmenu: false },
  { label: 'Group', shortcut: 'Ctrl+G' },
  { label: 'Image Sequence', shortcut: 'Ctrl+G' },
  { label: 'Label', hasSubmenu: false },
  { label: 'List', hasSubmenu: false },
  { label: 'Lottie Sprite', hasSubmenu: false },
  { label: 'Mesh', hasSubmenu: false },
  { label: 'Overlay', hasSubmenu: false },
  { label: 'Sprite', hasSubmenu: false },
  { label: 'Text', hasSubmenu: false },
  { label: 'Video', hasSubmenu: false },
  { label: 'Web Sprite', hasSubmenu: false },
];
