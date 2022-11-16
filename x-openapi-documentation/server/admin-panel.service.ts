import axios, { Axios } from 'axios';
import https from 'https';
import { OpenAPIIntroduction, OpenAPIService } from '../types';
import { env } from '../utils';

export class AdminPanelService {
  private readonly httpClient: Axios;
  constructor() {
    const adminPanelUrl = env('ADMIN_PANEL_URL', true);
    const adminPanelToken = env('ADMIN_PANEL_TOKEN', true);
    this.httpClient = axios.create({
      baseURL: adminPanelUrl + '/api',
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
      headers: {
        Authorization: `Bearer ${adminPanelToken}`,
      },
    });
  }

  async getInfoData(): Promise<OpenAPIIntroduction> {
    const url = '/introduction';
    const response = await this.httpClient.get<{
      data: { attributes: OpenAPIIntroduction };
    }>(url);
    return response.data.data.attributes;
  }

  async getSingleAPIService(
    method: string,
    serviceUrl: string
  ): Promise<{
    ok: boolean;
    result?: OpenAPIService | null;
    id?: number | null;
  }> {
    const url = '/api-services';
    try {
      const response = await this.httpClient.get<{
        data: { attributes: OpenAPIService; id: number }[];
      }>(url, {
        params: {
          'filters[identifier][$eq]': `${method}:${serviceUrl}`,
        },
      });
      return {
        ok: Boolean(response.data.data && response.data.data[0]),
        result: response.data.data[0] ? response.data.data[0].attributes : null,
        id: response.data.data[0] ? response.data.data[0].id : null,
      };
    } catch (err) {
      console.error(err);
      return {
        ok: false,
      };
    }
  }

  async createSingleAPIService(data: OpenAPIService): Promise<{
    ok: boolean;
    result?: OpenAPIService;
  }> {
    const url = '/api-services';
    try {
      console.log('create service >>', data);

      const response = await this.httpClient.post<{
        data: { attributes: OpenAPIService };
      }>(url, { data: data });

      return {
        ok: true,
        result: response.data.data.attributes,
      };
    } catch (err) {
      console.error(err);
      return {
        ok: false,
      };
    }
  }

  async updateSingleAPIService(
    apiServiceId: number,
    data: OpenAPIService
  ): Promise<{ ok: boolean; result?: OpenAPIService | null }> {
    const url = '/api-services';
    try {
      console.log('update service >>', apiServiceId, data);

      const response = await this.httpClient.put<{
        data: { attributes: OpenAPIService };
      }>(`${url}/${apiServiceId}`, { data: data });

      return {
        ok: Boolean(response.data.data),
        result: response.data.data ? response.data.data.attributes : null,
      };
    } catch (err) {
      console.error(err);
      return {
        ok: false,
      };
    }
  }

  async getErrorStatusCodeDescription(
    statusCode: string
  ): Promise<{ ok: boolean; result?: { description: string | null } }> {
    const url = '/error-status-codes';
    try {
      const response = await this.httpClient.get<{
        data: { attributes: { status_code: string; description: string } }[];
      }>(url, {
        params: {
          'filters[status_code][$eq]': `${statusCode}`,
        },
      });

      return {
        ok: Boolean(response.data.data[0].attributes),
        result: {
          description: response.data.data[0]
            ? response.data.data[0].attributes.description
            : null,
        },
      };
    } catch (err) {
      console.error(err);
      return {
        ok: false,
      };
    }
  }

  async createSingleErrorStatusCode(
    statusCode: string,
    description: string
  ): Promise<{
    ok: boolean;
    result?: { status_code: string; description: string };
  }> {
    const url = '/error-status-codes';
    try {
      console.log('create ErrorStatusCode >>', statusCode, description);

      const response = await this.httpClient.post<{
        data: { attributes: { status_code: string; description: string } };
      }>(url, { data: { status_code: statusCode, description } });

      return {
        ok: true,
        result: response.data.data.attributes,
      };
    } catch (err) {
      console.error(err);
      return {
        ok: false,
      };
    }
  }
}
