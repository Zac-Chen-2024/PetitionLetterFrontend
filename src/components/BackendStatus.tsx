'use client';

import { useState, useEffect, useCallback } from 'react';

interface BackendInfo {
  name: string;
  version: string;
  stages: string[];
}

interface HealthInfo {
  status: string;
  ocr_provider: string;
  llm_provider: string;
  llm_model: string;
}

type ConnectionStatus = 'checking' | 'connected' | 'error';

export default function BackendStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const checkBackend = useCallback(async () => {
    setStatus('checking');
    setError(null);

    try {
      // Check basic connectivity
      const infoResponse = await fetch(`${API_BASE}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!infoResponse.ok) {
        throw new Error(`HTTP ${infoResponse.status}`);
      }

      const info: BackendInfo = await infoResponse.json();
      setBackendInfo(info);

      // Check health endpoint
      try {
        const healthResponse = await fetch(`${API_BASE}/api/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (healthResponse.ok) {
          const health: HealthInfo = await healthResponse.json();
          setHealthInfo(health);
        }
      } catch {
        // Health endpoint might not exist, that's okay
      }

      setStatus('connected');
      setLastChecked(new Date());
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Connection failed');
      setLastChecked(new Date());
    }
  }, [API_BASE]);

  useEffect(() => {
    checkBackend();

    // Check every 30 seconds
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500 animate-pulse';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Disconnected';
      default:
        return 'Checking...';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed view - just the indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all ${
          status === 'error'
            ? 'bg-red-50 border border-red-200 hover:bg-red-100'
            : 'bg-white border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
        <span className={`text-sm font-medium ${status === 'error' ? 'text-red-700' : 'text-gray-700'}`}>
          Backend: {getStatusText()}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Expanded view - detailed info */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Backend Status</h3>
              <button
                onClick={checkBackend}
                disabled={status === 'checking'}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <svg
                  className={`w-4 h-4 ${status === 'checking' ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <span className="text-sm text-gray-600">
                {status === 'connected' && 'Connected to backend'}
                {status === 'error' && `Error: ${error}`}
                {status === 'checking' && 'Checking connection...'}
              </span>
            </div>

            {/* API URL */}
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 font-mono break-all">
              {API_BASE}
            </div>

            {/* Backend Info */}
            {backendInfo && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">API</span>
                  <span className="text-gray-900 font-medium">{backendInfo.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Version</span>
                  <span className="text-gray-900">{backendInfo.version}</span>
                </div>
              </div>
            )}

            {/* Health Info */}
            {healthInfo && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">OCR Provider</span>
                  <span className="text-gray-900">{healthInfo.ocr_provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">LLM Provider</span>
                  <span className="text-gray-900">{healthInfo.llm_provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">LLM Model</span>
                  <span className="text-gray-900 text-xs">{healthInfo.llm_model}</span>
                </div>
              </div>
            )}

            {/* Last Checked */}
            {lastChecked && (
              <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                Last checked: {lastChecked.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
