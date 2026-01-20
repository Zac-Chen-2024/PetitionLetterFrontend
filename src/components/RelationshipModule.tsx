'use client';

import { useState, useEffect } from 'react';
import { relationshipApi } from '@/utils/api';

// Types
type ModuleStatus = 'idle' | 'processing' | 'completed' | 'error';

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

interface RelationshipGraph {
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

// Entity type to Chinese label mapping
const ENTITY_TYPE_LABELS: Record<string, string> = {
  person: '人物',
  organization: '组织',
  company: '公司',
  date: '日期',
  location: '地点',
  position: '职位',
  event: '事件',
  document: '文档',
};

// Relation type to Chinese label mapping
const RELATION_TYPE_LABELS: Record<string, string> = {
  works_for: '任职于',
  owns: '拥有',
  subsidiary_of: '子公司',
  affiliated_with: '关联',
  employed_by: '受雇于',
  manages: '管理',
  reports_to: '汇报给',
  founded: '创立',
  located_in: '位于',
};

// Status badge component
const StatusBadge = ({ status }: { status: ModuleStatus }) => {
  const config = {
    idle: { bg: 'bg-gray-100', text: 'text-gray-600', label: '等待分析' },
    processing: { bg: 'bg-rose-100', text: 'text-rose-700', label: '分析中' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: '已完成' },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: '分析失败' },
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
const EntityCard = ({ entity }: { entity: Entity }) => {
  const typeLabel = ENTITY_TYPE_LABELS[entity.type] || entity.type;
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
              来源: {entity.documents.slice(0, 3).join(', ')}
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
}: {
  relation: Relation;
  entities: Entity[];
}) => {
  const sourceEntity = entities.find((e) => e.id === relation.source_id);
  const targetEntity = entities.find((e) => e.id === relation.target_id);
  const relationLabel = RELATION_TYPE_LABELS[relation.relation_type] || relation.relation_type;

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
const EvidenceChainCard = ({ chain }: { chain: EvidenceChain }) => {
  const [expanded, setExpanded] = useState(false);

  const strengthColors: Record<string, string> = {
    strong: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    weak: 'bg-red-100 text-red-700',
  };
  const strengthLabel: Record<string, string> = {
    strong: '强',
    medium: '中',
    weak: '弱',
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-rose-200 transition-colors">
      <div className="flex items-start gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${strengthColors[chain.strength] || 'bg-gray-100 text-gray-700'}`}>
          {strengthLabel[chain.strength] || chain.strength}
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
              {expanded ? '收起' : '展开'}
            </button>
          )}
          {chain.documents.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              证据来源: {chain.documents.join(', ')}
            </p>
          )}
          {chain.reasoning && expanded && (
            <p className="text-xs text-gray-500 mt-1 italic">
              推理: {chain.reasoning}
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
  const [status, setStatus] = useState<ModuleStatus>('idle');
  const [graph, setGraph] = useState<RelationshipGraph | null>(null);
  const [loading, setLoading] = useState(false);

  // Load existing analysis on mount
  useEffect(() => {
    if (projectId) {
      loadExistingAnalysis();
    } else {
      setGraph(null);
      setStatus('idle');
    }
  }, [projectId]);

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

  const handleStartAnalysis = async () => {
    if (!projectId) return;

    try {
      setStatus('processing');

      // Trigger analysis
      const result = await relationshipApi.analyze(projectId);

      if (result.success && result.graph) {
        setGraph(result.graph);
        setStatus('completed');
        onSuccess?.(`关系分析完成: 识别了 ${result.graph.entities.length} 个实体，${result.graph.relations.length} 条关系`);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (err) {
      console.error('Relationship analysis failed:', err);
      const errorMsg = err instanceof Error && err.message.includes('fetch')
        ? '无法连接后端服务'
        : '关系分析失败';
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
            <h3 className="text-base font-semibold text-gray-900">关系分析</h3>
            {(entityCount > 0 || relationCount > 0) && (
              <span className="text-xs text-gray-500">
                {entityCount} 实体 | {relationCount} 关系
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartAnalysis}
              disabled={!projectId || status === 'processing'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'processing' ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <PlayIcon />
                  {status === 'completed' ? '重新分析' : '开始分析'}
                </>
              )}
            </button>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!projectId ? (
          <div className="text-center py-8 text-gray-400">
            <RelationshipIcon />
            <p className="mt-2 text-sm">请先选择一个项目</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-500">加载中...</span>
          </div>
        ) : status === 'idle' ? (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-3 text-sm">点击"开始分析"提取实体关系</p>
            <p className="mt-1 text-xs">将分析文档中的人物、组织、时间等实体及其关系</p>
          </div>
        ) : status === 'error' ? (
          <div className="text-center py-8 text-red-400">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="mt-3 text-sm">分析失败，请重试</p>
          </div>
        ) : graph && (entityCount > 0 || relationCount > 0) ? (
          <div className="space-y-3">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{entityCount}</p>
                <p className="text-xs text-gray-500">实体</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{relationCount}</p>
                <p className="text-xs text-gray-500">关系</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{evidenceCount}</p>
                <p className="text-xs text-gray-500">证据链</p>
              </div>
            </div>

            {/* Entities section */}
            {entityCount > 0 && (
              <Section title="实体列表" count={entityCount} defaultExpanded={true}>
                {Object.entries(entitiesByType).map(([type, entities]) => (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      {ENTITY_TYPE_LABELS[type] || type} ({entities.length})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {entities.map((entity) => (
                        <EntityCard key={entity.id} entity={entity} />
                      ))}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {/* Relations section */}
            {relationCount > 0 && (
              <Section title="关系列表" count={relationCount}>
                <div className="space-y-2">
                  {graph.relations.map((relation, idx) => (
                    <RelationCard
                      key={idx}
                      relation={relation}
                      entities={graph.entities}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* Evidence chains section */}
            {evidenceCount > 0 && (
              <Section title="证据链" count={evidenceCount}>
                <div className="space-y-2">
                  {graph.evidence_chains.map((chain, idx) => (
                    <EvidenceChainCard key={idx} chain={chain} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">分析完成，但未识别到实体或关系</p>
          </div>
        )}
      </div>
    </div>
  );
}
