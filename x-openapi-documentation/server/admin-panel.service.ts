import axios, { Axios } from "axios";
import https from "https";
import { OpenAPIIntroduction, OpenAPIService } from "../types";
import { env } from "../utils";

export class AdminPanelService {
	private readonly httpClient: Axios;
	constructor() {
		const adminPanelUrl = env("ADMIN_PANEL_URL", true);
		const adminPanelToken = env("ADMIN_PANEL_TOKEN", true);
		this.httpClient = axios.create({
			baseURL: adminPanelUrl + "/api",
			httpsAgent: new https.Agent({
				rejectUnauthorized: false,
			}),
			headers: {
				Authorization: `Bearer ${adminPanelToken}`,
			},
		});
	}

	async getInfoData(): Promise<OpenAPIIntroduction> {
		const url = "/introduction";
		const response = await this.httpClient.get<{
			data: { attributes: OpenAPIIntroduction };
		}>(url);
		return response.data.data.attributes;
	}

	async getSingleAPIService(
		method: string,
		serviceUrl: string
	): Promise<{ ok: boolean; result?: OpenAPIService | null }> {
		const url = "/api-services";
		try {
			const response = await this.httpClient.get<{
				data: { attributes: OpenAPIService }[];
			}>(url, {
				params: {
					"filters[identifier][$eq]": `${method}:${serviceUrl}`,
				},
			});
			return {
				ok: Boolean(response.data.data && response.data.data[0]),
				result: response.data.data[0] ? response.data.data[0].attributes : null,
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
		const url = "/api-services";
		try {
			console.log("create service >>", data);
			
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
}
