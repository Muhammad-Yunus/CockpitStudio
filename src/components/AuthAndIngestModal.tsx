import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  KeyRound,
  Database,
  FolderGit2,
  Copy,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import type { StudioUser } from '../types/studio';

export interface SavedProjectMeta {
  id: string;
  name: string;
  activeTab: string;
  updatedAt: string;
}

interface ApiKeyMeta {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface IngestLogRow {
  id: string;
  sourceSystem: string;
  status: string;
  recordCount: number;
  errorMessage: string | null;
  createdAt: string;
}

interface TelemetryRow {
  id: string;
  sourceSystem: string;
  vehicleId: string;
  speedKmh: number | null;
  powerKw: number | null;
  rangeKm: number | null;
  gear: string | null;
  ingestedAt: string;
}

interface AuthAndIngestModalProps {
  isOpen: boolean;
  initialTab: 'auth' | 'projects' | 'ingest';
  onClose: () => void;
  user: StudioUser | null;
  onUserChange: (user: StudioUser | null) => void;
  activeProjectId: string | null;
  activeProjectName: string;
  onSelectProject: (projectId: string) => void;
  onSaveNewProject: (name: string) => Promise<void>;
  onRefreshTelemetry: () => void;
}

export const AuthAndIngestModal: React.FC<AuthAndIngestModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  user,
  onUserChange,
  activeProjectId,
  activeProjectName,
  onSelectProject,
  onSaveNewProject,
  onRefreshTelemetry,
}) => {
  const [tab, setTab] = useState<'auth' | 'projects' | 'ingest'>(initialTab);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [projects, setProjects] = useState<SavedProjectMeta[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState(activeProjectName);

  const [apiKeys, setApiKeys] = useState<ApiKeyMeta[]>([]);
  const [newKeyName, setNewKeyName] = useState('CAN-Bus Gateway');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [ingestLogs, setIngestLogs] = useState<IngestLogRow[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryRow[]>([]);
  const [loadingIngest, setLoadingIngest] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const loadProjectsAndKeys = useCallback(async () => {
    if (!user) return;
    try {
      const [projRes, keyRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/auth/keys'),
      ]);
      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
      }
      if (keyRes.ok) {
        const kData = await keyRes.json();
        setApiKeys(kData.keys || []);
      }
    } catch {
      // ignore transient network errors
    }
  }, [user]);

  const loadIngestData = useCallback(async () => {
    if (!user || !activeProjectId) return;
    setLoadingIngest(true);
    try {
      const [logRes, histRes] = await Promise.all([
        fetch(`/api/v1/ingest/logs?projectId=${encodeURIComponent(activeProjectId)}`),
        fetch(`/api/v1/telemetry/history?projectId=${encodeURIComponent(activeProjectId)}&limit=15`),
      ]);
      if (logRes.ok) {
        const lData = await logRes.json();
        setIngestLogs(lData.logs || []);
      }
      if (histRes.ok) {
        const hData = await histRes.json();
        setTelemetryHistory(hData.frames || []);
      }
    } finally {
      setLoadingIngest(false);
    }
  }, [user, activeProjectId]);

  useEffect(() => {
    if (isOpen && user) {
      loadProjectsAndKeys();
      loadIngestData();
    }
  }, [isOpen, user, loadProjectsAndKeys, loadIngestData]);

  if (!isOpen) return null;

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login' ? { email, password } : { name, email, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }
      onUserChange(data.user);
      setTab('projects');
    } catch {
      setAuthError('Network error while contacting authentication server');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    onUserChange(null);
    setProjects([]);
    setApiKeys([]);
    setIngestLogs([]);
    setTelemetryHistory([]);
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const res = await fetch('/api/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newKeyName.trim(),
        scopes: ['ingest:write', 'telemetry:read', 'signals:write'],
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setRevealedKey(data.plainTextKey);
      setNewKeyName('');
      await loadProjectsAndKeys();
    }
  };

  const handleRevokeKey = async (id: string) => {
    const res = await fetch(`/api/auth/keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadProjectsAndKeys();
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-host';
  const curlSnippet = `curl -X POST "${originUrl}/api/v1/ingest/telemetry" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${revealedKey || 'cs_live_YOUR_API_KEY'}" \\
  -d '{
    "projectId": "${activeProjectId || 'CREATE_OR_SAVE_PROJECT_FIRST'}",
    "sourceSystem": "CAN_GATEWAY_01",
    "vehicleId": "VIN-EV-2026-001",
    "speedKmh": 94,
    "powerKw": 34,
    "rangeKm": 448,
    "gear": "D",
    "readyState": true,
    "ambientTempC": 23,
    "signals": { "Speed value": 94, "Left Blinker": false }
  }'`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-[820px] max-h-[88vh] bg-[#16181D] border border-[#2C313D] rounded-[4px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-[40px] px-4 bg-[#1A1D24] border-b border-[#252A34] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[12px] font-semibold text-white">
              CockpitStudio Cloud & External Ingest
            </span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'auth', label: 'Account', icon: KeyRound },
                  { id: 'projects', label: 'PostgreSQL Projects', icon: FolderGit2 },
                  { id: 'ingest', label: 'External Ingest API', icon: Database },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-[3px] flex items-center gap-1.5 cursor-pointer transition-colors ${
                      tab === item.id
                        ? 'bg-[#262B36] text-white'
                        : 'text-[#8E95A2] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8E95A2] hover:text-white cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-5 text-[12px]">
          {tab === 'auth' && (
            <div className="max-w-[420px] mx-auto space-y-4">
              {user ? (
                <div className="p-4 bg-[#1B1E25] border border-[#282D38] rounded-[4px] space-y-3">
                  <div className="flex items-center gap-2 text-[#10B981] font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authenticated Session Active</span>
                  </div>
                  <div className="space-y-1 text-[11.5px] text-[#D1D5DB]">
                    <div>Name: {user.name}</div>
                    <div>Email: {user.email}</div>
                    <div>Role: {user.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#262B36] hover:bg-[#323846] text-[#E5E7EB] text-[11px] rounded-[3px] cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-[#232730] pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError(null);
                      }}
                      className={`px-3 py-1 text-[11px] font-medium rounded-[3px] cursor-pointer ${
                        authMode === 'login' ? 'bg-[#262B36] text-white' : 'text-[#8E95A2]'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setAuthError(null);
                      }}
                      className={`px-3 py-1 text-[11px] font-medium rounded-[3px] cursor-pointer ${
                        authMode === 'register' ? 'bg-[#262B36] text-white' : 'text-[#8E95A2]'
                      }`}
                    >
                      Create Engineer Account
                    </button>
                  </div>

                  {authError && (
                    <div className="p-2.5 bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#FCA5A5] text-[11px] rounded-[3px]">
                      {authError}
                    </div>
                  )}

                  {authMode === 'register' && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#9CA3AF]">Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="HMI Engineer"
                        className="w-full px-3 py-2 bg-[#121419] border border-[#2C313D] rounded-[3px] text-white focus:outline-none focus:border-[#24B0FF]"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#9CA3AF]">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@cockpitstudio.dev"
                      className="w-full px-3 py-2 bg-[#121419] border border-[#2C313D] rounded-[3px] text-white focus:outline-none focus:border-[#24B0FF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#9CA3AF]">
                      Password {authMode === 'register' && '(min 8 characters)'}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={authMode === 'register' ? 8 : 1}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-[#121419] border border-[#2C313D] rounded-[3px] text-white focus:outline-none focus:border-[#24B0FF]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2 bg-[#24B0FF] hover:bg-[#1A9BE6] text-[#08121B] font-semibold rounded-[3px] cursor-pointer transition-colors"
                  >
                    {authLoading
                      ? 'Authenticating...'
                      : authMode === 'login'
                      ? 'Sign In to PostgreSQL Workspace'
                      : 'Register & Start Workspace'}
                  </button>
                </form>
              )}
            </div>
          )}

          {tab === 'projects' && (
            <div className="space-y-4">
              {!user ? (
                <div className="p-4 bg-[#1B1E25] border border-[#282D38] rounded-[4px] flex items-center justify-between">
                  <span className="text-[#9CA3AF]">
                    Sign in to persist CockpitStudio projects in PostgreSQL and obtain a project UUID.
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab('auth')}
                    className="px-3 py-1.5 bg-[#24B0FF] text-[#08121B] font-semibold rounded-[3px] cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="Project name..."
                      className="flex-1 min-w-[200px] px-3 py-1.5 bg-[#121419] border border-[#2C313D] rounded-[3px] text-white focus:outline-none focus:border-[#24B0FF]"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await onSaveNewProject(newProjectTitle || 'EV Cockpit HMI v1');
                        await loadProjectsAndKeys();
                      }}
                      className="px-3 py-1.5 bg-[#10B981] hover:bg-[#0EA572] text-[#052E16] font-semibold rounded-[3px] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Current Canvas as New Project</span>
                    </button>
                  </div>

                  <div className="border border-[#262B35] rounded-[3px] divide-y divide-[#232730]">
                    {projects.length === 0 ? (
                      <div className="p-4 text-[#6B7280] text-center">
                        No projects saved in PostgreSQL yet. Save your current studio workspace above to get a Project UUID for external telemetry ingest.
                      </div>
                    ) : (
                      projects.map((proj) => (
                        <div
                          key={proj.id}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-[#1B1E25]"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate">{proj.name}</div>
                            <div className="text-[10.5px] font-mono-code text-[#6B7280] truncate">
                              UUID: {proj.id}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopy(proj.id, proj.id)}
                              className="px-2 py-1 bg-[#222630] hover:bg-[#2C313D] text-[#D1D5DB] rounded-[2px] text-[10.5px] flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === proj.id ? (
                                <Check className="w-3 h-3 text-[#10B981]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Copy UUID</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectProject(proj.id);
                                onClose();
                              }}
                              className={`px-2.5 py-1 rounded-[2px] text-[10.5px] font-medium cursor-pointer ${
                                activeProjectId === proj.id
                                  ? 'bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40'
                                  : 'bg-[#24B0FF] text-[#08121B]'
                              }`}
                            >
                              {activeProjectId === proj.id ? 'Active' : 'Load'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'ingest' && (
            <div className="space-y-4">
              {!user && (
                <div className="p-3 bg-[#1B1E25] border border-[#282D38] rounded-[3px] flex items-center justify-between">
                  <span className="text-[#9CA3AF]">
                    Sign in and save a project to generate machine-to-machine API keys (`cs_live_*`).
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab('auth')}
                    className="px-3 py-1 bg-[#24B0FF] text-[#08121B] font-semibold rounded-[3px] cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* API Key Generator */}
              {user && (
                <div className="p-3.5 bg-[#1B1E25] border border-[#262B35] rounded-[3px] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">External System API Keys</span>
                    <span className="text-[10.5px] text-[#6B7280] font-mono-code">
                      Drizzle + PostgreSQL SHA-256
                    </span>
                  </div>

                  <form onSubmit={handleCreateApiKey} className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="External system label (e.g. CAN_GATEWAY_01)"
                      className="flex-1 px-2.5 py-1.5 bg-[#121419] border border-[#2C313D] rounded-[3px] text-[11px] text-white focus:outline-none focus:border-[#24B0FF]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#24B0FF] text-[#08121B] font-semibold text-[11px] rounded-[3px] cursor-pointer whitespace-nowrap"
                    >
                      Generate Key
                    </button>
                  </form>

                  {revealedKey && (
                    <div className="p-2.5 bg-[#10B981]/10 border border-[#10B981]/40 rounded-[3px] space-y-1">
                      <div className="text-[10.5px] text-[#34D399] font-medium">
                        Copy this API key now — it is hashed in PostgreSQL and never shown again:
                      </div>
                      <div className="flex items-center justify-between gap-2 font-mono-code text-[11px] text-white">
                        <span className="truncate">{revealedKey}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('revealed', revealedKey)}
                          className="px-2 py-0.5 bg-[#10B981] text-[#052E16] rounded-[2px] font-sans font-semibold text-[10px] cursor-pointer shrink-0"
                        >
                          {copiedId === 'revealed' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  {apiKeys.length > 0 && (
                    <div className="divide-y divide-[#252A34] border-t border-[#252A34] pt-1">
                      {apiKeys.map((k) => (
                        <div
                          key={k.id}
                          className="py-1.5 flex items-center justify-between text-[11px]"
                        >
                          <div>
                            <span className="text-[#E5E7EB] font-medium">{k.name}</span>
                            <span className="ml-2 font-mono-code text-[#6B7280]">
                              {k.keyPrefix}...
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-[#EF4444] hover:text-[#FCA5A5] cursor-pointer"
                            title="Revoke API Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Zod-Validated External Ingest API Contract */}
              <div className="p-3.5 bg-[#121419] border border-[#262B35] rounded-[3px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    Zod-Validated External Ingest Endpoint
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('curl', curlSnippet)}
                    className="px-2 py-1 bg-[#222630] hover:bg-[#2C313D] text-[#D1D5DB] rounded-[2px] text-[10.5px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'curl' ? (
                      <Check className="w-3 h-3 text-[#10B981]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy cURL</span>
                  </button>
                </div>

                <div className="text-[10.5px] text-[#9CA3AF] space-y-1">
                  <div>
                    <span className="font-mono-code text-[#10B981]">POST /api/v1/ingest/telemetry</span> — Single vehicle telemetry frame
                  </div>
                  <div>
                    <span className="font-mono-code text-[#10B981]">POST /api/v1/ingest/batch</span> — Batch up to 500 frames atomically
                  </div>
                  <div>
                    <span className="font-mono-code text-[#10B981]">POST /api/v1/ingest/signals</span> — Named Logic Editor signal bindings
                  </div>
                </div>

                <pre className="p-2.5 bg-[#0D0F13] border border-[#222630] rounded-[2px] overflow-x-auto font-mono-code text-[10px] text-[#93C5FD] leading-relaxed">
                  {curlSnippet}
                </pre>
              </div>

              {/* Real PostgreSQL Stream History & Audit Logs */}
              {user && activeProjectId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      Ingested Telemetry Stream ({telemetryHistory.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        loadIngestData();
                        onRefreshTelemetry();
                      }}
                      className="px-2 py-1 bg-[#222630] hover:bg-[#2C313D] text-[#D1D5DB] rounded-[2px] text-[10.5px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingIngest ? 'animate-spin' : ''}`} />
                      <span>Refresh from DB</span>
                    </button>
                  </div>

                  <div className="border border-[#262B35] rounded-[3px] overflow-x-auto">
                    <table className="w-full text-left text-[10.5px] font-mono-code">
                      <thead className="bg-[#1B1E25] text-[#8E95A2] border-b border-[#262B35]">
                        <tr>
                          <th className="px-2.5 py-1.5">Source</th>
                          <th className="px-2.5 py-1.5">Vehicle</th>
                          <th className="px-2.5 py-1.5 text-right">Speed</th>
                          <th className="px-2.5 py-1.5 text-right">Power</th>
                          <th className="px-2.5 py-1.5 text-right">Gear</th>
                          <th className="px-2.5 py-1.5 text-right">Ingested At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222630] text-[#D1D5DB]">
                        {telemetryHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-center font-sans text-[#6B7280]">
                              No external telemetry ingested for this project yet. Send a POST request from your external system to /api/v1/ingest/telemetry.
                            </td>
                          </tr>
                        ) : (
                          telemetryHistory.map((row) => (
                            <tr key={row.id} className="hover:bg-[#1B1E25]">
                              <td className="px-2.5 py-1.5">{row.sourceSystem}</td>
                              <td className="px-2.5 py-1.5">{row.vehicleId}</td>
                              <td className="px-2.5 py-1.5 text-right tabular-nums">
                                {row.speedKmh ?? '—'} km/h
                              </td>
                              <td className="px-2.5 py-1.5 text-right tabular-nums">
                                {row.powerKw ?? '—'} kW
                              </td>
                              <td className="px-2.5 py-1.5 text-right">{row.gear ?? '—'}</td>
                              <td className="px-2.5 py-1.5 text-right text-[#6B7280]">
                                {new Date(row.ingestedAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {ingestLogs.length > 0 && (
                    <div className="border border-[#262B35] rounded-[3px] p-2.5 bg-[#121419] space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-[#6E7480]">
                        Zod Validation Audit Log
                      </div>
                      {ingestLogs.slice(0, 6).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between text-[10px] font-mono-code"
                        >
                          <span
                            className={
                              log.status === 'accepted' ? 'text-[#10B981]' : 'text-[#EF4444]'
                            }
                          >
                            [{log.status.toUpperCase()}] {log.sourceSystem} ({log.recordCount} rec)
                          </span>
                          <span className="text-[#6B7280]">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
