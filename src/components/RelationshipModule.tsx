'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { relationshipApi, RelationshipProgressResponse, DeduplicationSuggestion, DeduplicationAction, RelationshipSnapshot } from '@/utils/api';
import { useSSE } from '@/hooks/useSSE';
import { useLanguage } from '@/i18n/LanguageContext';
import DeduplicationModal from './DeduplicationModal';

// Dynamically import RelationshipGraph to avoid SSR issues
const RelationshipGraph = dynamic(() => import('./RelationshipGraph'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

// Types
type ModuleStatus = 'idle' | 'processing' | 'completed' | 'error';
type ViewMode = 'list' | 'graph';

interface Entity {
  id: string;
  type: string;
  name: string;
  documents: string[];
  attributes: Record<string, unknown>;
}

interface Relation {
  source_id: string;
  target_id: string;
  relation_type: string;
  evidence: string[];
  description: string;
}

interface EvidenceChain {
  claim: string;
  documents: string[];
  strength: string;
  reasoning: string;
}

interface RelationshipGraphData {
  entities: Entity[];
  relations: Relation[];
  evidence_chains: EvidenceChain[];
}

interface RelationshipModuleProps {
  projectId: string | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

// Icons
const RelationshipIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ListIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const GraphIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const DeduplicateIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Helper to get entity type label
const getEntityTypeLabel = (type: string, t: ReturnType<typeof useLanguage>['t']): string => {
  const labels: Record<string, string> = {
    person: t.relationship.entityTypes.person,
    organization: t.relationship.entityTypes.organization,
    company: t.relationship.entityTypes.company,
    date: t.relationship.entityTypes.date,
    location: t.relationship.entityTypes.location,
    position: t.relationship.entityTypes.position,
    event: t.relationship.entityTypes.event,
    document: t.relationship.entityTypes.document,
  };
  return labels[type] || type;
};

// Helper to get relation type label
const getRelationTypeLabel = (type: string, t: ReturnType<typeof useLanguage>['t']): string => {
  const labels: Record<string, string> = {
    works_for: t.relationship.relationTypes.works_for,
    owns: t.relationship.relationTypes.owns,
    subsidiary_of: t.relationship.relationTypes.subsidiary_of,
    affiliated_with: t.relationship.relationTypes.affiliated_with,
    employed_by: t.relationship.relationTypes.employed_by,
    manages: t.relationship.relationTypes.manages,
    reports_to: t.relationship.relationTypes.reports_to,
    founded: t.relationship.relationTypes.founded,
    located_in: t.relationship.relationTypes.located_in,
  };
  return labels[type] || type;
};

// Status badge component
const StatusBadge = ({ status, t }: { status: ModuleStatus; t: ReturnType<typeof useLanguage>['t'] }) => {
  const config = {
    idle: { bg: 'bg-gray-100', text: 'text-gray-600', label: t.relationship.status.idle },
    processing: { bg: 'bg-rose-100', text: 'text-rose-700', label: t.relationship.status.processing },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: t.relationship.status.completed },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: t.relationship.status.error },
  };
  const { bg, text, label } = config[status];
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      {label}
    </span>
  );
};

// Entity type color mapping
const getEntityTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    person: 'bg-blue-100 text-blue-700',
    organization: 'bg-purple-100 text-purple-700',
    company: 'bg-green-100 text-green-700',
    date: 'bg-yellow-100 text-yellow-700',
    location: 'bg-orange-100 text-orange-700',
    position: 'bg-pink-100 text-pink-700',
    event: 'bg-cyan-100 text-cyan-700',
    document: 'bg-gray-100 text-gray-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
};

// Entity card component
const EntityCard = ({ entity, t }: { entity: Entity; t: ReturnType<typeof useLanguage>['t'] }) => {
  const typeLabel = getEntityTypeLabel(entity.type, t);
  const typeColor = getEntityTypeColor(entity.type);

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-rose-200 transition-colors">
      <div className="flex items-start gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${typeColor}`}>
          {typeLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{entity.name}</p>
          {entity.documents.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {t.relationship.source}: {entity.documents.slice(0, 3).join(', ')}
              {entity.documents.length > 3 && ` +${entity.documents.length - 3}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Relation card component
const RelationCard = ({
  relation,
  entities,
  t,
}: {
  relation: Relation;
  entities: Entity[];
  t: ReturnType<typeof useLanguage>['t'];
}) => {
  const sourceEntity = entities.find((e) => e.id === relation.source_id);
  const targetEntity = entities.find((e) => e.id === relation.target_id);
  const relationLabel = getRelationTypeLabel(relation.relation_type, t);

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-rose-200 transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-1 text-xs font-medium rounded bg-rose-50 text-rose-700 border border-rose-200">
          {sourceEntity?.name || relation.source_id}
        </span>
        <span className="text-xs text-gray-500">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </span>
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
          {relationLabel}
        </span>
        <span className="text-xs text-gray-500">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </span>
        <span className="px-2 py-1 text-xs font-medium rounded bg-rose-50 text-rose-700 border border-rose-200">
          {targetEntity?.name || relation.target_id}
        </span>
      </div>
      {relation.description && (
        <p className="text-xs text-gray-500 mt-2">{relation.description}</p>
      )}
    </div>
  );
};

// Evidence chain card component
const EvidenceChainCard = ({ chain, t }: { chain: EvidenceChain; t: ReturnType<typeof useLanguage>['t'] }) => {
  const [expanded, setExpanded] = useState(false);

  const strengthColors: Record<string, string> = {
    strong: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    weak: 'bg-red-100 text-red-700',
  };

  const getStrengthLabel = (strength: string): string => {
    const labels: Record<string, string> = {
      strong: t.relationship.strength.strong,
      medium: t.relationship.strength.medium,
      weak: t.relationship.strength.weak,
    };
    return labels[strength] || strength;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-rose-200 transition-colors">
      <div className="flex items-start gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${strengthColors[chain.strength] || 'bg-gray-100 text-gray-700'}`}>
          {getStrengthLabel(chain.strength)}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-gray-700 ${expanded ? '' : 'line-clamp-2'}`}>
            {chain.claim}
          </p>
          {chain.claim.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-rose-600 hover:text-rose-800 mt-1"
            >
              {expanded ? t.common.collapse : t.common.expand}
            </button>
          )}
          {chain.documents.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {t.relationship.evidenceSource}: {chain.documents.join(', ')}
            </p>
          )}
          {chain.reasoning && expanded && (
            <p className="text-xs text-gray-500 mt-1 italic">
              {t.relationship.reasoning}: {chain.reasoning}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Section component
const Section = ({
  title,
  count,
  children,
  defaultExpanded = false,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 text-xs font-medium rounded bg-rose-100 text-rose-700">
            {count}
          </span>
          <p className="text-sm font-medium text-gray-900">{title}</p>
        </div>
        {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>
      {expanded && (
        <div className="p-4 space-y-3 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

export default function RelationshipModule({
  projectId,
  onSuccess,
  onError,
}: RelationshipModuleProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ModuleStatus>('idle');
  const [graph, setGraph] = useState<RelationshipGraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');

  // Deduplication state
  const [dedupModalOpen, setDedupModalOpen] = useState(false);
  const [dedupSuggestions, setDedupSuggestions] = useState<DeduplicationSuggestion[]>([]);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [dedupApplying, setDedupApplying] = useState(false);

  // Snapshot state
  const [snapshots, setSnapshots] = useState<RelationshipSnapshot[]>([]);
  const [currentSnap, setCurrentSnap] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // SSE URL for progress monitoring
  const sseUrl = projectId ? relationshipApi.getStreamUrl(projectId) : null;

  // SSE handlers
  const handleSSEProgress = useCallback((data: RelationshipProgressResponse) => {
    if (data.status === 'processing') {
      setStatus('processing');
    }
  }, []);

  const handleSSEComplete = useCallback((data: RelationshipProgressResponse) => {
    if (data.status === 'completed' && data.result) {
      setGraph(data.result);
      setStatus('completed');
      onSuccess?.(`${t.relationship.status.completed}: ${data.result.entities?.length || 0} ${t.relationship.entities}, ${data.result.relations?.length || 0} ${t.relationship.relations}`);
    } else if (data.status === 'failed') {
      setStatus('error');
      onError?.(data.error || t.relationship.analysisFailed);
    }
  }, [onSuccess, onError, t]);

  const handleSSEError = useCallback(() => {
    // SSE connection error - might reconnect automatically
    console.warn('Relationship SSE connection error');
  }, []);

  // SSE hook
  const { connect, disconnect } = useSSE<RelationshipProgressResponse>({
    url: sseUrl,
    onMessage: handleSSEProgress,
    onComplete: handleSSEComplete,
    onError: handleSSEError,
    autoConnect: false,
  });

  // Load existing analysis on mount
  useEffect(() => {
    if (projectId) {
      loadExistingAnalysis();
      loadSnapshots();
    } else {
      setGraph(null);
      setStatus('idle');
      setSnapshots([]);
    }

    return () => {
      disconnect();
    };
  }, [projectId, disconnect]);

  const loadExistingAnalysis = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const result = await relationshipApi.getLatest(projectId);

      if (result.data && (result.data.entities.length > 0 || result.data.relations.length > 0)) {
        setGraph(result.data);
        setStatus('completed');
      } else {
        setGraph(null);
        setStatus('idle');
      }
    } catch (err) {
      console.error('Failed to load existing relationship analysis:', err);
      // Not an error - just no existing analysis
      setGraph(null);
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = async () => {
    if (!projectId) return;

    try {
      const result = await relationshipApi.listSnapshots(projectId);
      setSnapshots(result.snapshots || []);
      setCurrentSnap(result.current_snap);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    }
  };

  // Deduplication handlers
  const handleDeduplicate = async () => {
    if (!projectId) return;

    try {
      setDedupLoading(true);
      const result = await relationshipApi.deduplicate(projectId);
      setDedupSuggestions(result.suggestions || []);
      setDedupModalOpen(true);
    } catch (err) {
      console.error('Deduplication analysis failed:', err);
      onError?.(t.relationship.dedup?.analysisFailed || 'Deduplication analysis failed');
    } finally {
      setDedupLoading(false);
    }
  };

  const handleApplyDedup = async (actions: DeduplicationAction[]) => {
    if (!projectId) return;

    try {
      setDedupApplying(true);
      const result = await relationshipApi.applyDedup(projectId, actions);
      setDedupModalOpen(false);
      onSuccess?.(
        t.relationship.dedup?.applied
          ?.replace('{merged}', String(result.merged_count))
          ?.replace('{deleted}', String(result.deleted_count)) ||
        `Applied: ${result.merged_count} merged, ${result.deleted_count} deleted`
      );
      // Reload data
      await loadExistingAnalysis();
      await loadSnapshots();
    } catch (err) {
      console.error('Failed to apply deduplication:', err);
      onError?.(t.relationship.dedup?.applyFailed || 'Failed to apply deduplication');
    } finally {
      setDedupApplying(false);
    }
  };

  // Rollback handler
  const handleRollback = async (snapshotId: string) => {
    if (!projectId) return;

    try {
      const result = await relationshipApi.rollback(projectId, snapshotId);
      onSuccess?.(t.relationship.snapshot?.rolledBack?.replace('{label}', result.label) || `Rolled back to: ${result.label}`);
      setHistoryOpen(false);
      await loadExistingAnalysis();
      await loadSnapshots();
    } catch (err) {
      console.error('Rollback failed:', err);
      onError?.(t.relationship.snapshot?.rollbackFailed || 'Rollback failed');
    }
  };

  // Entity editing handlers
  const handleDeleteEntity = async (entityId: string) => {
    if (!projectId) return;

    try {
      await relationshipApi.deleteEntity(projectId, entityId);
      onSuccess?.(t.relationship.edit?.entityDeleted || 'Entity deleted');
      await loadExistingAnalysis();
    } catch (err) {
      console.error('Delete entity failed:', err);
      onError?.(t.relationship.edit?.deleteFailed || 'Delete failed');
    }
  };

  const handleRenameEntity = async (entityId: string, newName: string) => {
    if (!projectId) return;

    try {
      await relationshipApi.updateEntity(projectId, entityId, { name: newName });
      onSuccess?.(t.relationship.edit?.entityRenamed || 'Entity renamed');
      await loadExistingAnalysis();
    } catch (err) {
      console.error('Rename entity failed:', err);
      onError?.(t.relationship.edit?.renameFailed || 'Rename failed');
    }
  };

  const handleDeleteRelation = async (fromEntity: string, toEntity: string, relationType: string) => {
    if (!projectId) return;

    try {
      await relationshipApi.deleteRelation(projectId, fromEntity, toEntity, relationType);
      onSuccess?.(t.relationship.edit?.relationDeleted || 'Relation deleted');
      await loadExistingAnalysis();
    } catch (err) {
      console.error('Delete relation failed:', err);
      onError?.(t.relationship.edit?.deleteFailed || 'Delete failed');
    }
  };

  const handleStartAnalysis = async () => {
    if (!projectId) return;

    try {
      setStatus('processing');

      // Trigger analysis (now returns immediately)
      const result = await relationshipApi.analyze(projectId);

      if (result.success) {
        // Connect to SSE for progress updates
        connect();
      } else {
        throw new Error('Failed to start analysis');
      }
    } catch (err) {
      console.error('Relationship analysis failed:', err);
      const errorMsg = err instanceof Error && err.message.includes('fetch')
        ? t.backend.cannotConnect
        : t.relationship.analysisFailed;
      onError?.(errorMsg);
      setStatus('error');
    }
  };

  // Get counts
  const entityCount = graph?.entities.length || 0;
  const relationCount = graph?.relations.length || 0;
  const evidenceCount = graph?.evidence_chains.length || 0;

  // Group entities by type
  const entitiesByType = graph?.entities.reduce((acc, entity) => {
    const type = entity.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(entity);
    return acc;
  }, {} as Record<string, Entity[]>) || {};

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600">
              <RelationshipIcon />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{t.relationship.title}</h3>
            {(entityCount > 0 || relationCount > 0) && (
              <span className="text-xs text-gray-500">
                {entityCount} {t.relationship.entities} | {relationCount} {t.relationship.relations}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle - only show when data exists */}
            {status === 'completed' && (entityCount > 0 || relationCount > 0) && (
              <>
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title={t.relationship.viewMode.list}
                  >
                    <ListIcon />
                    <span className="hidden sm:inline">{t.relationship.viewMode.list}</span>
                  </button>
                  <button
                    onClick={() => setViewMode('graph')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'graph'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title={t.relationship.viewMode.graph}
                  >
                    <GraphIcon />
                    <span className="hidden sm:inline">{t.relationship.viewMode.graph}</span>
                  </button>
                </div>

                {/* Deduplication button */}
                <button
                  onClick={handleDeduplicate}
                  disabled={dedupLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={t.relationship.dedup?.title || 'Deduplicate'}
                >
                  {dedupLoading ? (
                    <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <DeduplicateIcon />
                  )}
                  <span className="hidden sm:inline">{t.relationship.dedup?.button || 'Deduplicate'}</span>
                </button>

                {/* History dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setHistoryOpen(!historyOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    title={t.relationship.snapshot?.history || 'History'}
                  >
                    <HistoryIcon />
                    <span className="hidden sm:inline">{t.relationship.snapshot?.history || 'History'}</span>
                    {snapshots.length > 0 && (
                      <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                        {snapshots.length}
                      </span>
                    )}
                  </button>

                  {/* History dropdown menu */}
                  {historyOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-500">
                          {t.relationship.snapshot?.versions || 'Versions'}
                        </p>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {snapshots.length === 0 ? (
                          <p className="px-3 py-4 text-sm text-gray-400 text-center">
                            {t.relationship.snapshot?.noSnapshots || 'No snapshots'}
                          </p>
                        ) : (
                          snapshots.map((snap) => (
                            <button
                              key={snap.id}
                              onClick={() => handleRollback(snap.id)}
                              disabled={snap.id === currentSnap}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                                snap.id === currentSnap ? 'bg-rose-50' : ''
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-800">{snap.label}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(snap.created_at).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {snap.stats.entity_count} {t.relationship.entities}, {snap.stats.relation_count} {t.relationship.relations}
                                </p>
                              </div>
                              {snap.id === currentSnap && (
                                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
                                  {t.relationship.snapshot?.current || 'Current'}
                                </span>
                              )}
                              {snap.is_original && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  {t.relationship.snapshot?.original || 'Original'}
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            <button
              onClick={handleStartAnalysis}
              disabled={!projectId || status === 'processing'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'processing' ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.relationship.analyzing}
                </>
              ) : (
                <>
                  <PlayIcon />
                  {status === 'completed' ? t.relationship.reanalyze : t.relationship.startAnalysis}
                </>
              )}
            </button>
            <StatusBadge status={status} t={t} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!projectId ? (
          <div className="text-center py-8 text-gray-400">
            <RelationshipIcon />
            <p className="mt-2 text-sm">{t.relationship.selectProject}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-500">{t.common.loading}</span>
          </div>
        ) : status === 'idle' ? (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-3 text-sm">{t.relationship.clickToStart}</p>
            <p className="mt-1 text-xs">{t.relationship.analyzeEntities}</p>
          </div>
        ) : status === 'error' ? (
          <div className="text-center py-8 text-red-400">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="mt-3 text-sm">{t.relationship.retryMessage}</p>
          </div>
        ) : graph && (entityCount > 0 || relationCount > 0) ? (
          <div className="space-y-3">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{entityCount}</p>
                <p className="text-xs text-gray-500">{t.relationship.entities}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{relationCount}</p>
                <p className="text-xs text-gray-500">{t.relationship.relations}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{evidenceCount}</p>
                <p className="text-xs text-gray-500">{t.relationship.evidenceChains}</p>
              </div>
            </div>

            {/* Graph view */}
            {viewMode === 'graph' ? (
              <RelationshipGraph
                entities={graph.entities}
                relations={graph.relations}
                onDeleteEntity={handleDeleteEntity}
                onRenameEntity={handleRenameEntity}
                onDeleteRelation={handleDeleteRelation}
              />
            ) : (
              <>
                {/* Entities section */}
                {entityCount > 0 && (
                  <Section title={t.relationship.entityList} count={entityCount} defaultExpanded={true}>
                    {Object.entries(entitiesByType).map(([type, entities]) => (
                      <div key={type} className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          {getEntityTypeLabel(type, t)} ({entities.length})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {entities.map((entity) => (
                            <EntityCard key={entity.id} entity={entity} t={t} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </Section>
                )}

                {/* Relations section */}
                {relationCount > 0 && (
                  <Section title={t.relationship.relationList} count={relationCount}>
                    <div className="space-y-2">
                      {graph.relations.map((relation, idx) => (
                        <RelationCard
                          key={idx}
                          relation={relation}
                          entities={graph.entities}
                          t={t}
                        />
                      ))}
                    </div>
                  </Section>
                )}

                {/* Evidence chains section */}
                {evidenceCount > 0 && (
                  <Section title={t.relationship.evidenceChains} count={evidenceCount}>
                    <div className="space-y-2">
                      {graph.evidence_chains.map((chain, idx) => (
                        <EvidenceChainCard key={idx} chain={chain} t={t} />
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">{t.relationship.noEntitiesOrRelations}</p>
          </div>
        )}
      </div>

      {/* Deduplication Modal */}
      <DeduplicationModal
        isOpen={dedupModalOpen}
        onClose={() => setDedupModalOpen(false)}
        suggestions={dedupSuggestions}
        onApply={handleApplyDedup}
        isApplying={dedupApplying}
      />

      {/* Click outside to close history dropdown */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}
