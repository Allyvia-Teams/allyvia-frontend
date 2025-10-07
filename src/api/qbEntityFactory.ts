import axiosServices from 'utils/axios';
import { EntityConfig } from 'config/qbEntities';

export interface EntityAPIResponse {
  items: any[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface SyncResponse {
  message: string;
  results: {
    items_created?: number;
    items_updated?: number;
    items_skipped?: number;
    errors_count?: number;
    created?: number;
    updated?: number;
    deleted?: number;
  };
}

export class QBEntityAPI {
  private config: EntityConfig;

  constructor(config: EntityConfig) {
    this.config = config;
  }

  static create(config: EntityConfig): QBEntityAPI {
    return new QBEntityAPI(config);
  }

  async getAll(companyId: string, params?: Record<string, any>): Promise<EntityAPIResponse> {
    // Process filters to match backend expectations
    const processedParams: Record<string, any> = {
      company_id: companyId
    };

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (key === 'search' && value) {
          processedParams.search = value;
        } else if (key === 'dateRange' && value && typeof value === 'object') {
          if (value.start) processedParams.start_date = value.start;
          if (value.end) processedParams.end_date = value.end;
        } else if (key === 'amount' && value && typeof value === 'object') {
          if (value.min !== undefined) processedParams.amount_min = value.min;
          if (value.max !== undefined) processedParams.amount_max = value.max;
        } else if (key === 'paymentType' && value) {
          processedParams.payment_type = value;
        } else if (key === 'paymentMethod' && value) {
          processedParams.payment_method = value;
        } else if (key === 'customer' && value) {
          processedParams.customer = value;
        } else if (key === 'appliedStatus' && value) {
          processedParams.applied_status = value;
        } else if (key === 'entity' && value) {
          processedParams.entity_ref_id = value;
        } else if (key === 'page' || key === 'page_size') {
          processedParams[key] = value;
        } else if (value !== undefined && value !== null && value !== '') {
          processedParams[key] = value;
        }
      });
    }

    const response = await axiosServices.get(this.config.endpoint, {
      params: processedParams
    });
    return response.data;
  }

  async getOne(companyId: string, id: string): Promise<any> {
    const response = await axiosServices.get(`${this.config.endpoint}/${id}`, {
      params: {
        company_id: companyId
      }
    });
    return response.data;
  }

  async create(companyId: string, data: any): Promise<any> {
    const response = await axiosServices.post(this.config.endpoint, {
      company_id: companyId,
      ...data
    });
    return response.data;
  }

  async update(companyId: string, id: string, data: any): Promise<any> {
    const response = await axiosServices.put(`${this.config.endpoint}/${id}`, {
      company_id: companyId,
      ...data
    });
    return response.data;
  }

  async delete(companyId: string, id: string): Promise<any> {
    const response = await axiosServices.delete(`${this.config.endpoint}/${id}`, {
      params: {
        company_id: companyId
      }
    });
    return response.data;
  }

  async sync(companyId: string): Promise<SyncResponse> {
    const response = await axiosServices.post(this.config.syncEndpoint, {
      company_id: companyId
    });
    return response.data;
  }

  async getStats(companyId: string): Promise<any> {
    if (!this.config.statsEndpoint) {
      throw new Error('Stats endpoint not configured for this entity');
    }
    const response = await axiosServices.get(this.config.statsEndpoint, {
      params: { company_id: companyId }
    });
    return response.data;
  }

  async search(companyId: string, query: string, fields?: string[]): Promise<EntityAPIResponse> {
    const searchFields = fields || this.config.searchFields || [];
    const params: Record<string, any> = {
      company_id: companyId,
      search: query
    };

    if (searchFields.length > 0) {
      params.search_fields = searchFields.join(',');
    }

    const response = await axiosServices.get(this.config.endpoint, { params });
    return response.data;
  }

  async getFiltered(companyId: string, filters: Record<string, any>): Promise<EntityAPIResponse> {
    const params: Record<string, any> = {
      company_id: companyId
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'dateRange' && typeof value === 'object') {
          if (value.start) params.start_date = value.start;
          if (value.end) params.end_date = value.end;
        } else if (key === 'amount' && typeof value === 'object') {
          if (value.min) params.min_amount = value.min;
          if (value.max) params.max_amount = value.max;
        } else {
          params[key] = value;
        }
      }
    });

    const response = await axiosServices.get(this.config.endpoint, { params });
    return response.data;
  }

  async export(companyId: string, format: 'csv' | 'pdf' | 'excel', filters?: Record<string, any>): Promise<Blob> {
    const response = await axiosServices.get(`${this.config.endpoint}/export`, {
      params: {
        company_id: companyId,
        format,
        ...filters
      },
      responseType: 'blob'
    });
    return response.data;
  }

  buildFilterParams(filters: Record<string, any>): Record<string, any> {
    const params: Record<string, any> = {};

    Object.entries(filters).forEach(([key, value]) => {
      const filterConfig = this.config.filters[key];

      if (!filterConfig || value === undefined || value === null || value === '') {
        return;
      }

      switch (filterConfig.type) {
        case 'dateRange':
          if (typeof value === 'object') {
            if (value.start) params[`${filterConfig.field || key}_start`] = value.start;
            if (value.end) params[`${filterConfig.field || key}_end`] = value.end;
          }
          break;

        case 'range':
          if (typeof value === 'object') {
            if (value.min !== undefined) params[`min_${filterConfig.field || key}`] = value.min;
            if (value.max !== undefined) params[`max_${filterConfig.field || key}`] = value.max;
          }
          break;

        case 'lookup':
        case 'select':
        case 'boolean':
          params[filterConfig.field || key] = value;
          break;

        case 'text':
          params.search = value;
          if (filterConfig.fields && filterConfig.fields.length > 0) {
            params.search_fields = filterConfig.fields.join(',');
          }
          break;

        default:
          params[key] = value;
      }
    });

    return params;
  }
}
