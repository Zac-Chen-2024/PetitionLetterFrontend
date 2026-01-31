// i18n Type Definitions

export type Locale = 'zh' | 'en';

export interface Translations {
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    confirm: string;
    cancel: string;
    save: string;
    delete: string;
    refresh: string;
    close: string;
    copy: string;
    expand: string;
    collapse: string;
    start: string;
    retry: string;
    generate: string;
    download: string;
    clear: string;
    noData: string;
  };

  // Project management
  project: {
    newProject: string;
    deleteProject: string;
    renameProject: string;
    selectProject: string;
    noProjects: string;
    createFirst: string;
    projectCreated: string;
    projectDeleted: string;
    projectRenamed: string;
    loadFailed: string;
    createFailed: string;
    deleteFailed: string;
    renameFailed: string;
    deleteConfirm: string;
    documents: string;
    clickToRename: string;
  };

  // Backend status
  backend: {
    connected: string;
    disconnected: string;
    checking: string;
    modelsLoading: string;
    modelLoaded: string;
    modelLoading: string;
    modelError: string;
    modelWaiting: string;
    cannotConnect: string;
  };

  // Upload module
  upload: {
    title: string;
    dragHere: string;
    supportedFormats: string;
    currentTarget: string;
    uploadButton: string;
    files: string;
    noFiles: string;
    dragOrClick: string;
    status: {
      idle: string;
      uploading: string;
      completed: string;
    };
    success: string;
    failed: string;
  };

  // OCR module
  ocr: {
    title: string;
    completed: string;
    startAll: string;
    start: string;
    fileList: string;
    noFiles: string;
    page: string;
    status: {
      idle: string;
      processing: string;
      completed: string;
    };
    pending: string;
    queued: string;
    processing: string;
    failed: string;
    result: string;
    resultPreview: string;
    selectCompleted: string;
    ocrComplete: string;
    ocrFailed: string;
    batchFailed: string;
    timeout: string;
  };

  // Highlight module
  highlight: {
    title: string;
    completed: string;
    analyzeAll: string;
    analyze: string;
    fileList: string;
    noFiles: string;
    completeOcrFirst: string;
    highlightList: string;
    noHighlights: string;
    showAfterAnalysis: string;
    important: string;
    status: {
      idle: string;
      processing: string;
      completed: string;
    };
    pending: string;
    pdfPreview: string;
    analysisComplete: string;
    analysisFailed: string;
    batchFailed: string;
    timeout: string;
    highlightArea: string;
    noTextContent: string;
    currentPage: string;
    highlightAreas: string;
  };

  // L1 Analysis module
  l1Analysis: {
    title: string;
    quotes: string;
    startAnalysis: string;
    reanalyze: string;
    analyzing: string;
    selectProject: string;
    clickToStart: string;
    autoExtract: string;
    analysisFailed: string;
    retryMessage: string;
    noQuotes: string;
    noRelatedQuotes: string;
    relevance: string;
    progress: string;
    documents: string;
    currentlyAnalyzing: string;
    foundQuotes: string;
    docsFailed: string;
    status: {
      idle: string;
      processing: string;
      completed: string;
      error: string;
    };
  };

  // Relationship module
  relationship: {
    title: string;
    entities: string;
    relations: string;
    evidenceChains: string;
    startAnalysis: string;
    reanalyze: string;
    analyzing: string;
    selectProject: string;
    clickToStart: string;
    analyzeEntities: string;
    analysisFailed: string;
    retryMessage: string;
    noEntitiesOrRelations: string;
    entityList: string;
    relationList: string;
    source: string;
    evidenceSource: string;
    reasoning: string;
    strength: {
      strong: string;
      medium: string;
      weak: string;
    };
    entityTypes: {
      person: string;
      organization: string;
      company: string;
      date: string;
      location: string;
      position: string;
      event: string;
      document: string;
    };
    relationTypes: {
      works_for: string;
      owns: string;
      subsidiary_of: string;
      affiliated_with: string;
      employed_by: string;
      manages: string;
      reports_to: string;
      founded: string;
      located_in: string;
    };
    status: {
      idle: string;
      processing: string;
      completed: string;
      error: string;
    };
    viewMode: {
      list: string;
      graph: string;
    };
    graph: {
      type: string;
      sourceDocuments: string;
      evidence: string;
      noDescription: string;
    };
    graphTabs: {
      all: string;
      qualifying_relationship: string;
      qualifying_employment: string;
      qualifying_capacity: string;
      doing_business: string;
    };
    graphLayers: {
      others: string;
    };
    relationDetails: string;
  };

  // Writing module
  writing: {
    title: string;
    subtitle: string;
    generate: string;
    save: string;
    dialogPosition: string;
    selectionEdit: string;
    bottom: string;
    rightPanel: string;
    floatingBubble: string;
    sidePanel: string;
    modelsLoading: string;
    contentUpdated: string;
    paragraphGenerated: string;
    contentSaved: string;
    applyFailed: string;
    generateFailed: string;
    saveFailed: string;
  };

  // PDF Viewer
  pdfViewer: {
    zoomIn: string;
    zoomOut: string;
    download: string;
    downloadPage: string;
    selectFile: string;
    loadFailed: string;
    imageFailed: string;
    highImportance: string;
    mediumImportance: string;
    lowImportance: string;
    reason: string;
  };
}

export const DEFAULT_LOCALE: Locale = 'zh';
export const STORAGE_KEY = 'petition-letter-lang';
