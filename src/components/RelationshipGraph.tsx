'use client';

import { useMemo, useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

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

interface RelationshipGraphProps {
  entities: Entity[];
  relations: Relation[];
}

// Tab types for section filtering
type GraphTab = 'all' | 'relationship' | 'employment' | 'capacity' | 'business';

// Tab configuration
const GRAPH_TABS: { key: GraphTab; labelKey: keyof NonNullable<ReturnType<typeof useLanguage>['t']['relationship']['graphTabs']> }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'relationship', labelKey: 'qualifying_relationship' },
  { key: 'employment', labelKey: 'qualifying_employment' },
  { key: 'capacity', labelKey: 'qualifying_capacity' },
  { key: 'business', labelKey: 'doing_business' },
];

// Relation types for each tab
const RELATION_TYPES_BY_TAB: Record<GraphTab, string[]> = {
  all: [],
  relationship: ['subsidiary_of', 'owns', 'affiliated_with'],
  employment: ['employed_by', 'works_for'],
  capacity: ['manages', 'reports_to'],
  business: ['located_in', 'founded'],
};

// Entity types for each tab (used when no relations match)
const ENTITY_TYPES_BY_TAB: Record<GraphTab, string[]> = {
  all: [],
  relationship: ['company', 'organization'],
  employment: ['person', 'company', 'organization'],
  capacity: ['person', 'position'],
  business: ['company', 'organization', 'location'],
};

// Filter entities and relations by tab
const filterByTab = (
  tab: GraphTab,
  entities: Entity[],
  relations: Relation[]
): { entities: Entity[]; relations: Relation[] } => {
  if (tab === 'all') {
    return { entities, relations };
  }

  const relevantRelationTypes = RELATION_TYPES_BY_TAB[tab];
  const relevantEntityTypes = ENTITY_TYPES_BY_TAB[tab];

  // Filter relations by type
  const filteredRelations = relations.filter(r =>
    relevantRelationTypes.includes(r.relation_type)
  );

  // Get entity IDs from filtered relations
  const entityIdsFromRelations = new Set<string>();
  filteredRelations.forEach(r => {
    entityIdsFromRelations.add(r.source_id);
    entityIdsFromRelations.add(r.target_id);
  });

  // If we have relations, only include entities involved in those relations
  // Otherwise, filter by entity type
  const filteredEntities = filteredRelations.length > 0
    ? entities.filter(e => entityIdsFromRelations.has(e.id))
    : entities.filter(e => relevantEntityTypes.includes(e.type));

  return { entities: filteredEntities, relations: filteredRelations };
};

// 实体类型颜色（边框色）
const getEntityBorderColor = (type: string): string => {
  const colors: Record<string, string> = {
    person: 'border-blue-400',
    organization: 'border-purple-400',
    company: 'border-green-400',
    location: 'border-orange-400',
    position: 'border-pink-400',
    date: 'border-cyan-400',
    event: 'border-indigo-400',
    document: 'border-amber-400',
  };
  return colors[type] || 'border-gray-300';
};

// 实体类型背景色
const getEntityBgColor = (type: string): string => {
  const colors: Record<string, string> = {
    person: 'bg-blue-50',
    organization: 'bg-purple-50',
    company: 'bg-green-50',
    location: 'bg-orange-50',
    position: 'bg-pink-50',
    date: 'bg-cyan-50',
    event: 'bg-indigo-50',
    document: 'bg-amber-50',
  };
  return colors[type] || 'bg-gray-50';
};

// 实体类型标签
const getEntityTypeLabel = (type: string, t: ReturnType<typeof useLanguage>['t']): string => {
  const labels: Record<string, string> = {
    person: t.relationship.entityTypes.person,
    organization: t.relationship.entityTypes.organization,
    company: t.relationship.entityTypes.company,
    location: t.relationship.entityTypes.location,
    position: t.relationship.entityTypes.position,
  };
  return labels[type] || type;
};

// 关系类型标签
const getRelationLabel = (type: string, t: ReturnType<typeof useLanguage>['t']): string => {
  const labels: Record<string, string> = {
    works_for: t.relationship.relationTypes.works_for,
    employed_by: t.relationship.relationTypes.employed_by,
    owns: t.relationship.relationTypes.owns,
    subsidiary_of: t.relationship.relationTypes.subsidiary_of,
    affiliated_with: t.relationship.relationTypes.affiliated_with,
    manages: t.relationship.relationTypes.manages,
    reports_to: t.relationship.relationTypes.reports_to,
    founded: t.relationship.relationTypes.founded,
    located_in: t.relationship.relationTypes.located_in,
  };
  return labels[type] || type;
};

// 层级标题
const getLayerLabel = (layer: 'companies' | 'persons' | 'others', t: ReturnType<typeof useLanguage>['t']): string => {
  const labels: Record<string, string> = {
    companies: t.relationship.entityTypes.company,
    persons: t.relationship.entityTypes.person,
    others: t.relationship.graphLayers?.others || 'Other',
  };
  return labels[layer] || layer;
};

// 实体节点组件
interface EntityNodeProps {
  entity: Entity;
  t: ReturnType<typeof useLanguage>['t'];
}

const EntityNode = forwardRef<HTMLDivElement, EntityNodeProps>(({ entity, t }, ref) => {
  const borderColor = getEntityBorderColor(entity.type);
  const bgColor = getEntityBgColor(entity.type);
  const typeLabel = getEntityTypeLabel(entity.type, t);

  return (
    <div
      ref={ref}
      className={`relative px-4 py-3 rounded-lg border-2 ${borderColor} ${bgColor} min-w-[120px] max-w-[180px] z-10`}
    >
      <span className="absolute -top-2.5 left-3 px-2 text-xs bg-white text-gray-500 whitespace-nowrap">
        {typeLabel}
      </span>
      <p className="text-sm font-medium text-gray-800 text-center truncate">
        {entity.name}
      </p>
    </div>
  );
});

EntityNode.displayName = 'EntityNode';

// 层级区块组件
interface LayerSectionProps {
  title: string;
  children: React.ReactNode;
}

const LayerSection = ({ title, children }: LayerSectionProps) => (
  <div className="relative py-6">
    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-white px-1 z-20"
         style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg) translateY(50%)' }}>
      {title}
    </div>
    <div className="flex justify-center gap-8 flex-wrap pl-6">
      {children}
    </div>
  </div>
);

// 关系详情徽章
interface RelationBadgeProps {
  relation: Relation;
  entities: Entity[];
  t: ReturnType<typeof useLanguage>['t'];
}

const RelationBadge = ({ relation, entities, t }: RelationBadgeProps) => {
  const source = entities.find(e => e.id === relation.source_id);
  const target = entities.find(e => e.id === relation.target_id);
  if (!source || !target) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
      <span className="font-medium">{source.name}</span>
      <span className="text-rose-500">→</span>
      <span className="text-rose-600">{getRelationLabel(relation.relation_type, t)}</span>
      <span className="text-rose-500">→</span>
      <span className="font-medium">{target.name}</span>
    </span>
  );
};

// 智能计算连接路径
interface ConnectionResult {
  path: string;
  labelX: number;
  labelY: number;
}

const getSmartConnectionPath = (
  fromRect: DOMRect,
  toRect: DOMRect,
  containerRect: DOMRect,
  index: number,
  totalSameDirection: number
): ConnectionResult => {
  // 计算节点中心点相对于容器的位置
  const fromCenterX = fromRect.left + fromRect.width / 2 - containerRect.left;
  const fromCenterY = fromRect.top + fromRect.height / 2 - containerRect.top;
  const toСenterX = toRect.left + toRect.width / 2 - containerRect.left;
  const toCenterY = toRect.top + toRect.height / 2 - containerRect.top;

  // 判断相对位置
  const verticalDiff = toCenterY - fromCenterY;
  const horizontalDiff = toСenterX - fromCenterX;
  const isBelow = verticalDiff > 20; // target 在 source 下方
  const isAbove = verticalDiff < -20; // target 在 source 上方
  const isSameRow = !isBelow && !isAbove; // 同一行

  let fromX: number, fromY: number, toX: number, toY: number;
  let path: string;
  let labelX: number, labelY: number;

  // 为多条同方向的线添加偏移
  const offset = totalSameDirection > 1 ? (index - (totalSameDirection - 1) / 2) * 15 : 0;

  if (isSameRow) {
    // 同一行：从侧面连接，使用弧形
    const isRight = horizontalDiff > 0;
    if (isRight) {
      fromX = fromRect.right - containerRect.left;
      toX = toRect.left - containerRect.left;
    } else {
      fromX = fromRect.left - containerRect.left;
      toX = toRect.right - containerRect.left;
    }
    fromY = fromCenterY + offset;
    toY = toCenterY + offset;

    // 水平连线，轻微弯曲避开
    const midX = (fromX + toX) / 2;
    const curveOffset = Math.abs(horizontalDiff) * 0.1 + 20;
    path = `M ${fromX} ${fromY} Q ${midX} ${fromY - curveOffset}, ${toX} ${toY}`;
    labelX = midX;
    labelY = fromY - curveOffset / 2;
  } else if (isBelow) {
    // target 在下方：从 source 底部到 target 顶部
    fromX = fromCenterX + offset;
    fromY = fromRect.bottom - containerRect.top;
    toX = toСenterX + offset;
    toY = toRect.top - containerRect.top;

    // 使用贝塞尔曲线，控制点在中间偏外
    const midY = (fromY + toY) / 2;
    const curveOffsetX = horizontalDiff * 0.3;
    path = `M ${fromX} ${fromY} C ${fromX + curveOffsetX * 0.5} ${midY}, ${toX - curveOffsetX * 0.5} ${midY}, ${toX} ${toY}`;
    labelX = (fromX + toX) / 2;
    labelY = midY;
  } else {
    // target 在上方：从 source 顶部到 target 底部
    fromX = fromCenterX + offset;
    fromY = fromRect.top - containerRect.top;
    toX = toСenterX + offset;
    toY = toRect.bottom - containerRect.top;

    const midY = (fromY + toY) / 2;
    const curveOffsetX = horizontalDiff * 0.3;
    path = `M ${fromX} ${fromY} C ${fromX + curveOffsetX * 0.5} ${midY}, ${toX - curveOffsetX * 0.5} ${midY}, ${toX} ${toY}`;
    labelX = (fromX + toX) / 2;
    labelY = midY;
  }

  return { path, labelX, labelY };
};

export default function RelationshipGraph({ entities, relations }: RelationshipGraphProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<GraphTab>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [, forceUpdate] = useState({});

  // Filter data based on active tab
  const { entities: filteredEntities, relations: filteredRelations } = useMemo(
    () => filterByTab(activeTab, entities, relations),
    [activeTab, entities, relations]
  );

  // 按类型分层
  const layers = useMemo(() => ({
    companies: filteredEntities.filter(e => ['company', 'organization'].includes(e.type)),
    persons: filteredEntities.filter(e => e.type === 'person'),
    others: filteredEntities.filter(e => !['company', 'organization', 'person'].includes(e.type)),
  }), [filteredEntities]);

  // 注册节点ref
  const registerNode = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      nodeRefs.current.set(id, element);
    } else {
      nodeRefs.current.delete(id);
    }
  }, []);

  // Get tab label from translations
  const getTabLabel = (labelKey: string): string => {
    const graphTabs = t.relationship.graphTabs;
    if (graphTabs && typeof graphTabs === 'object' && labelKey in graphTabs) {
      return (graphTabs as Record<string, string>)[labelKey];
    }
    const fallbacks: Record<string, string> = {
      all: 'Overview',
      qualifying_relationship: 'Corporate',
      qualifying_employment: 'Employment',
      qualifying_capacity: 'Capacity',
      doing_business: 'Operations',
    };
    return fallbacks[labelKey] || labelKey;
  };

  // 布局完成后更新连线
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
        forceUpdate({});
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [filteredEntities, filteredRelations, activeTab]);

  // 监听窗口变化
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
        forceUpdate({});
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 计算同方向连线的索引（用于偏移）
  const relationIndexMap = useMemo(() => {
    const pairCount = new Map<string, number>();
    const pairIndex = new Map<number, number>();

    filteredRelations.forEach((rel, idx) => {
      const pairKey = [rel.source_id, rel.target_id].sort().join('-');
      const count = pairCount.get(pairKey) || 0;
      pairIndex.set(idx, count);
      pairCount.set(pairKey, count + 1);
    });

    return { pairCount, pairIndex };
  }, [filteredRelations]);

  if (entities.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-gray-400">
        <p className="text-sm">{t.relationship.noEntitiesOrRelations}</p>
      </div>
    );
  }

  const hasAnyEntities = layers.companies.length > 0 || layers.persons.length > 0 || layers.others.length > 0;

  return (
    <div className="bg-white border border-gray-100 rounded-lg">
      {/* Tab navigation */}
      <div className="border-b border-gray-100 px-4 pt-4">
        <div className="flex flex-wrap gap-1">
          {GRAPH_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-rose-50 text-rose-700 border-b-2 border-rose-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {getTabLabel(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Graph content - 三层布局 */}
      <div ref={containerRef} className="relative p-6 min-h-[400px]">
        {!hasAnyEntities ? (
          <div className="h-[200px] flex items-center justify-center text-gray-400">
            <p className="text-sm">{t.relationship.noEntitiesOrRelations}</p>
          </div>
        ) : (
          <>
            {/* SVG 连线层 - 放在节点下面 */}
            {containerRect && (
              <svg
                className="absolute inset-0 pointer-events-none z-0"
                style={{ overflow: 'visible', width: '100%', height: '100%' }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
                  </marker>
                </defs>

                {filteredRelations.map((rel, idx) => {
                  const sourceNode = nodeRefs.current.get(rel.source_id);
                  const targetNode = nodeRefs.current.get(rel.target_id);

                  if (!sourceNode || !targetNode || !containerRef.current) return null;

                  const fromRect = sourceNode.getBoundingClientRect();
                  const toRect = targetNode.getBoundingClientRect();
                  const currentContainerRect = containerRef.current.getBoundingClientRect();

                  const pairKey = [rel.source_id, rel.target_id].sort().join('-');
                  const totalSame = relationIndexMap.pairCount.get(pairKey) || 1;
                  const myIndex = relationIndexMap.pairIndex.get(idx) || 0;

                  const { path, labelX, labelY } = getSmartConnectionPath(
                    fromRect,
                    toRect,
                    currentContainerRect,
                    myIndex,
                    totalSame
                  );

                  const label = getRelationLabel(rel.relation_type, t);
                  const labelWidth = Math.max(label.length * 8 + 12, 60);

                  return (
                    <g key={idx}>
                      {/* 连线 */}
                      <path
                        d={path}
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                        fill="none"
                        markerEnd="url(#arrowhead)"
                      />
                      {/* 标签背景 */}
                      <rect
                        x={labelX - labelWidth / 2}
                        y={labelY - 9}
                        width={labelWidth}
                        height="18"
                        fill="white"
                        rx="3"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                      {/* 标签文字 */}
                      <text
                        x={labelX}
                        y={labelY + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#be123c"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* 三层布局 */}
            <div className="space-y-4 relative z-10">
              {/* 公司层 */}
              {layers.companies.length > 0 && (
                <LayerSection title={getLayerLabel('companies', t)}>
                  {layers.companies.map(entity => (
                    <EntityNode
                      key={entity.id}
                      entity={entity}
                      t={t}
                      ref={(el) => registerNode(entity.id, el)}
                    />
                  ))}
                </LayerSection>
              )}

              {/* 人物层 */}
              {layers.persons.length > 0 && (
                <LayerSection title={getLayerLabel('persons', t)}>
                  {layers.persons.map(entity => (
                    <EntityNode
                      key={entity.id}
                      entity={entity}
                      t={t}
                      ref={(el) => registerNode(entity.id, el)}
                    />
                  ))}
                </LayerSection>
              )}

              {/* 其他层 */}
              {layers.others.length > 0 && (
                <LayerSection title={getLayerLabel('others', t)}>
                  {layers.others.map(entity => (
                    <EntityNode
                      key={entity.id}
                      entity={entity}
                      t={t}
                      ref={(el) => registerNode(entity.id, el)}
                    />
                  ))}
                </LayerSection>
              )}
            </div>

            {/* 底部关系详情列表 */}
            {filteredRelations.length > 0 && (
              <div className="mt-8 pt-4 border-t border-gray-100 relative z-10">
                <p className="text-xs text-gray-500 mb-2">
                  {t.relationship.relationDetails || 'Relation Details'}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredRelations.map((rel, idx) => (
                    <RelationBadge key={idx} relation={rel} entities={entities} t={t} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
