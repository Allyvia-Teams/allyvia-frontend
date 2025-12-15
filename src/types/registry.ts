import type { ComponentType } from 'react';

export type RegistryNodeType = 'module' | 'collapse' | 'page';

export interface RegistryAction {
  key: string;
  title?: string;
  description?: string;
  icon?: ComponentType<any>;
}

export interface RegistryTab {
  key: string;
  title?: string;
  description?: string;
  icon?: ComponentType<any>;
  actions?: RegistryAction[];
}

export interface RegistryNode {
  menuId: string;
  type: RegistryNodeType;
  title: string;
  description?: string;
  path?: string;
  component?: ComponentType<any>;
  icon?: ComponentType<any>;
  requiresAuth?: boolean;
  requiresPermission?: boolean;
  permissionKey?: string;
  moduleKey?: string;
  supportsView?: boolean;
  supportsManage?: boolean;
  tabs?: RegistryTab[];
  actions?: RegistryAction[];
  planTags?: string[];
  hidden?: boolean;
  devOnly?: boolean;
  featureFlag?: string;
  children?: RegistryNode[];
}
