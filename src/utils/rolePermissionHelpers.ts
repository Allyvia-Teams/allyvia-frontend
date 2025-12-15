import type { UIPermissionNode } from './permissionNodeAdapter';
import type { Permission } from 'types/role';
import { uiTreeToPermissionsFormat } from './permissionNodeAdapter';

export type DraftAccess = {
  view: boolean;
  manage: boolean;
};

export type DraftMap = Record<string, DraftAccess>;
export type ActionMap = Record<string, boolean>;

export interface Index {
  parent: Record<string, string | null>;
  children: Record<string, string[]>;
  kind: Record<string, 'module' | 'page' | 'tab' | 'action'>;
  capabilities: Record<string, { supportsView: boolean; supportsManage: boolean }>;
}

export interface DraftState {
  draft: DraftMap;
  actions: ActionMap;
  index: Index;
}

const ensureChildren = (children: Index['children'], key: string) => {
  if (!children[key]) children[key] = [];
};

const traverse = (node: UIPermissionNode, parent: string | null, acc: { draft: DraftMap; actions: ActionMap; index: Index }) => {
  const { draft, actions, index } = acc;
  index.parent[node.key] = parent;
  index.kind[node.key] = node.capabilities?.isTab ? 'tab' : node.level;
  index.capabilities[node.key] = {
    supportsView: node.capabilities.supportsView,
    supportsManage: node.capabilities.supportsManage
  };
  ensureChildren(index.children, node.key);
  if (parent) {
    ensureChildren(index.children, parent);
    if (!index.children[parent].includes(node.key)) {
      index.children[parent].push(node.key);
    }
  }

  if (node.level === 'action') {
    actions[node.key] = !!node.access.manage;
  } else {
    draft[node.key] = {
      view: !!node.access.view,
      manage: !!node.access.manage
    };
  }

  node.children?.forEach((child) => traverse(child, node.key, acc));
};

export function buildDraftState(tree: UIPermissionNode[]): DraftState {
  const draft: DraftMap = {};
  const actions: ActionMap = {};
  const index: Index = { parent: {}, children: {}, kind: {}, capabilities: {} };
  tree.forEach((node) => traverse(node, null, { draft, actions, index }));
  return { draft, actions, index };
}

export function zeroDraftState(tree: UIPermissionNode[]): DraftState {
  const state = buildDraftState(tree);
  Object.keys(state.draft).forEach((key) => {
    state.draft[key] = { view: false, manage: false };
  });
  Object.keys(state.actions).forEach((key) => {
    state.actions[key] = false;
  });
  return state;
}

export function cloneDraftState(state: DraftState): DraftState {
  const draft: DraftMap = {};
  Object.entries(state.draft).forEach(([key, value]) => {
    draft[key] = { ...value };
  });
  const actions: ActionMap = { ...state.actions };
  return { draft, actions, index: state.index };
}

const bubbleViewUp = (state: DraftState, key: string) => {
  let parentKey = state.index.parent[key];
  while (parentKey) {
    if (state.index.kind[parentKey] !== 'action' && state.index.capabilities[parentKey]?.supportsView) {
      if (!state.draft[parentKey]) {
        state.draft[parentKey] = { view: true, manage: false };
      } else {
        state.draft[parentKey].view = true;
      }
    }
    parentKey = state.index.parent[parentKey];
  }
};

const visitDescendants = (state: DraftState, key: string, visitor: (childKey: string) => void) => {
  (state.index.children[key] || []).forEach((child) => {
    visitor(child);
    visitDescendants(state, child, visitor);
  });
};

const setViewInternal = (state: DraftState, key: string, enabled: boolean) => {
  const kind = state.index.kind[key];
  if (!kind) return;

  if (kind === 'action') {
    state.actions[key] = enabled;
    if (enabled) bubbleViewUp(state, key);
    return;
  }

  if (!state.index.capabilities[key]?.supportsView) {
    return;
  }

  if (!state.draft[key]) state.draft[key] = { view: false, manage: false };
  state.draft[key].view = enabled;

  if (enabled) {
    bubbleViewUp(state, key);
  } else {
    if (state.index.capabilities[key].supportsManage) {
      state.draft[key].manage = false;
    }
    visitDescendants(state, key, (childKey) => {
      const childKind = state.index.kind[childKey];
      if (childKind === 'action') {
        state.actions[childKey] = false;
      } else {
        if (!state.draft[childKey]) state.draft[childKey] = { view: false, manage: false };
        state.draft[childKey].view = false;
        if (state.index.capabilities[childKey]?.supportsManage) {
          state.draft[childKey].manage = false;
        }
      }
    });
  }
};

const setManageInternal = (state: DraftState, key: string, enabled: boolean) => {
  const kind = state.index.kind[key];
  if (!kind) return;

  if (kind === 'action') {
    state.actions[key] = enabled;
    if (enabled) bubbleViewUp(state, key);
    return;
  }

  if (!state.index.capabilities[key]?.supportsManage) {
    return;
  }

  if (!state.draft[key]) state.draft[key] = { view: false, manage: false };
  state.draft[key].manage = enabled;
  if (enabled) {
    state.draft[key].view = true;
    bubbleViewUp(state, key);

    visitDescendants(state, key, (childKey) => {
      const childKind = state.index.kind[childKey];
      if (childKind === 'action') {
        state.actions[childKey] = true;
      } else {
        if (!state.draft[childKey]) state.draft[childKey] = { view: false, manage: false };
        if (state.index.capabilities[childKey]?.supportsView) {
          state.draft[childKey].view = true;
        }
        if (state.index.capabilities[childKey]?.supportsManage) {
          state.draft[childKey].manage = true;
        }
      }
    });
  } else {
    visitDescendants(state, key, (childKey) => {
      const childKind = state.index.kind[childKey];
      if (childKind === 'action') {
        state.actions[childKey] = false;
      } else if (state.index.capabilities[childKey]?.supportsManage) {
        if (!state.draft[childKey]) state.draft[childKey] = { view: false, manage: false };
        state.draft[childKey].manage = false;
      }
    });
  }
};

const setActionInternal = (state: DraftState, key: string, enabled: boolean) => {
  state.actions[key] = enabled;
  if (enabled) bubbleViewUp(state, key);
};

export function setViewState(state: DraftState, key: string, enabled: boolean): DraftState {
  const next = cloneDraftState(state);
  setViewInternal(next, key, enabled);
  return next;
}

export function setManageState(state: DraftState, key: string, enabled: boolean): DraftState {
  const next = cloneDraftState(state);
  setManageInternal(next, key, enabled);
  return next;
}

export function setActionState(state: DraftState, key: string, enabled: boolean): DraftState {
  const next = cloneDraftState(state);
  setActionInternal(next, key, enabled);
  return next;
}

export function applyStateToTree(tree: UIPermissionNode[], state: DraftState): UIPermissionNode[] {
  const applyNode = (node: UIPermissionNode): UIPermissionNode => {
    if (node.level === 'action') {
      return {
        ...node,
        access: { view: false, manage: !!state.actions[node.key] }
      };
    }
    const access = state.draft[node.key] ?? { view: false, manage: false };
    return {
      ...node,
      access: { view: access.view, manage: access.manage },
      children: node.children?.map(applyNode)
    };
  };
  return tree.map(applyNode);
}

export function hasAnyViewState(state: DraftState | null): boolean {
  if (!state) return false;
  return Object.values(state.draft).some((entry) => entry.view || entry.manage) || Object.values(state.actions).some((value) => value);
}

export function currentPermissionsFromState(baseTree: UIPermissionNode[], state: DraftState): Permission[] {
  const decorated = applyStateToTree(baseTree, state);
  return uiTreeToPermissionsFormat(decorated);
}

type FlatEntry = { key: string; kind: 'module' | 'action'; view?: boolean; manage?: boolean; value?: boolean };

const flattenPermissions = (permissions: Permission[]): FlatEntry[] => {
  const entries: FlatEntry[] = [];
  permissions.forEach((module) => {
    entries.push({ key: module.key, kind: 'module', view: module.view, manage: module.manage });
    module.actions?.forEach((action) => entries.push({ key: action.key, kind: 'action', value: action.value }));
    module.pages?.forEach((page) =>
      page.actions?.forEach((action) => entries.push({ key: action.key, kind: 'action', value: action.value }))
    );
    module.tabs?.forEach((tab) => tab.actions?.forEach((action) => entries.push({ key: action.key, kind: 'action', value: action.value })));
  });
  return entries;
};

export interface PermissionDiff {
  moduleChanges: { key: string; view: boolean; manage: boolean }[];
  actionChanges: { key: string; value: boolean }[];
}

export function diffPermissions(prev: Permission[], next: Permission[]): PermissionDiff {
  const prevEntries = new Map(flattenPermissions(prev).map((entry) => [entry.key, entry]));
  const nextEntries = new Map(flattenPermissions(next).map((entry) => [entry.key, entry]));

  const moduleChanges: PermissionDiff['moduleChanges'] = [];
  const actionChanges: PermissionDiff['actionChanges'] = [];

  nextEntries.forEach((nextEntry, key) => {
    const prevEntry = prevEntries.get(key);
    if (!prevEntry) {
      if (nextEntry.kind === 'module') {
        moduleChanges.push({ key, view: !!nextEntry.view, manage: !!nextEntry.manage });
      } else {
        actionChanges.push({ key, value: !!nextEntry.value });
      }
      return;
    }

    if (nextEntry.kind === 'module') {
      if (prevEntry.view !== nextEntry.view || prevEntry.manage !== nextEntry.manage) {
        moduleChanges.push({ key, view: !!nextEntry.view, manage: !!nextEntry.manage });
      }
    } else if (nextEntry.kind === 'action') {
      if (prevEntry.value !== nextEntry.value) {
        actionChanges.push({ key, value: !!nextEntry.value });
      }
    }
  });

  return { moduleChanges, actionChanges };
}
