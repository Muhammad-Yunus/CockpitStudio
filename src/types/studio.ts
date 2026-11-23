export type ViewportTab = 'Root' | 'Cluster' | 'Infotainment';
export type BottomPanelMode = 'Logic Editor' | 'Transition Editor' | 'Asset Database';
export type RightBottomTab = 'Asset manager' | 'Code Editor' | 'Console';
export type LeftTopTab = 'Scene Outliner' | 'Console';
export type LeftBottomTab = 'Project Outliner';
export type MobilePane = 'canvas' | 'outliner' | 'inspector' | 'logic' | 'api';
export type CanvasDrawTool = 'select' | 'frame' | 'vector' | 'rectangle' | 'pen' | 'text';
export type TransformMode3D = 'translate' | 'rotate' | 'scale' | 'off';
export type CameraPreset3D = 'perspective' | 'top' | 'front' | 'side';
export type LightingPreset3D = 'studio' | 'contrast' | 'night';
export type LightKind3D = 'Directional Light' | 'Point Light' | 'Rim Light';

export interface AddedLight3D {
  id: string;
  kind: LightKind3D;
  color: string;
  intensity: number;
}

export interface SceneNode {
  id: string;
  name: string;
  type:
    | 'text'
    | 'folder'
    | 'clock'
    | 'shape'
    | 'blur'
    | 'mask'
    | 'prefab'
    | 'instance'
    | 'mesh'
    | 'frame'
    | 'light';
  expanded?: boolean;
  locked?: boolean;
  visible?: boolean;
  muted?: boolean;
  children?: SceneNode[];
  primitiveKind?: 'Cube' | 'Cylinder' | 'Dome' | 'Plane' | 'Sphere' | 'Spring' | 'Torus';
  lightKind?: LightKind3D;
  layerId?: string;
}

export interface ProjectNode {
  id: string;
  name: string;
  category: 'Unassigned' | 'Cluster' | 'Infotainment';
  active?: boolean;
  icon: 'scene' | 'car' | 'gauge' | 'topbar' | 'sidenav' | 'map' | 'player';
}

export interface HmiLayer {
  id: string;
  name: string;
  kind: 'frame' | 'rectangle' | 'vector' | 'pen' | 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  cornerRadius: number;
  opacity: number;
  zOrder: number;
  fillColor: string;
  fillOpacity: number;
  fillBlend?: string;
  fillVisible: boolean;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity?: number;
  strokeBlend?: string;
  strokeVisible?: boolean;
  strokeAlign: 'Inside' | 'Center' | 'Outside';
  tintColor: string;
  tintVisible?: boolean;
  shadowColor: string;
  shadowVisible?: boolean;
  backgroundBlur: number;
  blurVisible?: boolean;
  text: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textTransform: 'uppercase' | 'lowercase' | 'capitalize';
  visible: boolean;
  locked: boolean;
}

export interface BuiltInWidgetOverride {
  dx: number;
  dy: number;
  scale: number;
  opacity: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeVisible?: boolean;
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number;
  cornerRadius?: number;
  rotation?: number;
  textContent?: string;
  shadowColor?: string;
  shadowVisible?: boolean;
  visible: boolean;
  locked: boolean;
}

export interface MeshTransform3D {
  name: string;
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface AttributesState {
  selectedNodeId: string;
  objectName: string;
  objectType: string;
  opacity: number;
  zOrder: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  skewX: number;
  skewY: number;
  anchorV: 'Top' | 'Center' | 'Bottom';
  anchorH: 'Left' | 'Center' | 'Right';
  angle: number;
  cornerRadius: number;
  pivotX: number;
  pivotY: number;
  pivotZ: number;
  fillColor: string;
  fillOpacity: number;
  fillBlend: string;
  fillVisible: boolean;
  strokeColor: string;
  strokeOpacity: number;
  strokeBlend: string;
  strokeAlign: 'Inside' | 'Center' | 'Outside';
  strokeWidth: number;
  strokeVisible: boolean;
  tintColor: string;
  tintVisible: boolean;
  shadowColor: string;
  shadowVisible: boolean;
  backgroundBlur: number;
  blurVisible: boolean;
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textTransform: 'uppercase' | 'lowercase' | 'capitalize';
  textContent: string;
  materialColor: string;
  materialMetalness: number;
  materialRoughness: number;
}

export interface LogicNodePin {
  id: string;
  label: string;
  kind: 'event' | 'data';
  direction: 'in' | 'out';
  color: string;
}

export interface LogicNode {
  id: string;
  title: string;
  nodeType: 'event' | 'variable' | 'math';
  x: number;
  y: number;
  width: number;
  value?: number | string | boolean;
  enabled: boolean;
  repeatEnabled: boolean;
  triggerKey?: string;
  pins: LogicNodePin[];
}

export interface LogicWire {
  id: string;
  fromNodeId: string;
  fromPinId: string;
  toNodeId: string;
  toPinId: string;
  color: string;
}

export interface TransitionTrack {
  id: string;
  label: string;
  group: string;
  startMs: number;
  endMs: number;
  color: string;
}

export interface EasingConfig {
  targetLabel: string;
  easeMode: 'Ease in' | 'Ease out' | 'Ease in out';
  curveType: 'Cubic' | 'Quadratic' | 'Spring';
  durationMs: number;
  delayMs: number;
  stiffness: number;
  damping: number;
  mass: number;
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'error' | 'ingest';
  message: string;
}

export interface TelemetrySnapshot {
  speedKmh: number;
  powerKw: number;
  rangeKm: number;
  gear: 'P' | 'R' | 'N' | 'D';
  readyState: boolean;
  ambientTempC: number;
  clockLabel: string;
  tripTimeLabel: string;
  tripDistanceKm: number;
  etaLabel: string;
  leftBlinker: boolean;
  rightBlinker: boolean;
  batterySocPct: number;
  sourceSystem: string;
  vehicleId: string;
  ingestedAt: string | null;
  signals: Record<string, string | number | boolean>;
}

export interface StudioUser {
  id: string;
  email: string;
  name: string;
  role: string;
}
