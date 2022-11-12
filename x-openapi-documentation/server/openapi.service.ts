import https from "https";
import axios from "axios";
import yaml from "yaml";
import { Swagger } from "atlassian-openapi";
import {
	merge,
	isErrorResult as isOpenAPIMergeError,
	MergeInput,
} from "openapi-merge";
import {
	OpenAPIIntroduction,
	OpenAPIServiceInput,
	OpenApiSource,
} from "../types";
import { openapiSourceList, openapiConfig } from "../config/openapi";
import { AdminPanelService } from "./admin-panel.service";

export class OpenAPIOrganizer {
	private readonly adminPanelService: AdminPanelService;

	constructor() {
		this.adminPanelService = new AdminPanelService();
	}

	async getOpenAPISchema(): Promise<string> {
		const openapiSources = await this.getListOfOpenAPISourceURLs();
		const openapiSchemas = await this.getOpenAPIsSchemas(openapiSources);
		const unifiedOpenapiSchema = await this.mergeOpenAPIs(openapiSchemas);
		const formattedOpenapiSchema = await this.formatOpenapiJSON(
			unifiedOpenapiSchema
		);
		const openapiYaml = await this.convertOpenapiJsonToYaml(
			formattedOpenapiSchema
		);
		return openapiYaml;
	}

	private async getListOfOpenAPISourceURLs(): Promise<OpenApiSource[]> {
		return openapiSourceList;
	}

	private async getOpenAPIsSchemas(sources: OpenApiSource[]): Promise<
		{
			openapiContent: Swagger.SwaggerV3;
			source: OpenApiSource;
		}[]
	> {
		const openapiContents: {
			openapiContent: Swagger.SwaggerV3;
			source: OpenApiSource;
		}[] = [];
		for (const source of sources) {
			try {
				const response = await axios.get<Swagger.SwaggerV3>(source.url, {
					httpsAgent: new https.Agent({ rejectUnauthorized: false }),
				});
				openapiContents.push({ openapiContent: response.data, source });
			} catch (err) {
				console.error("fetching schema got error:", err);
			}
		}

		return openapiContents;
	}

	private async mergeOpenAPIs(
		openapiSchemas: {
			openapiContent: Swagger.SwaggerV3;
			source: OpenApiSource;
		}[]
	): Promise<Swagger.SwaggerV3> {
		const formattedSchemasForMerge: MergeInput = openapiSchemas.map(
			(schemaInfo, index) => ({
				oas: schemaInfo.openapiContent,
				pathModification: { prepend: schemaInfo.source.prefix },
			})
		);

		const mergedSchema = merge(formattedSchemasForMerge);
		if (isOpenAPIMergeError(mergedSchema)) {
			throw new Error(`${mergedSchema.message} - ${mergedSchema.type}`);
		}

		return mergedSchema.output;
	}

	private async formatOpenapiJSON(
		openapiSchema: Swagger.SwaggerV3
	): Promise<Swagger.SwaggerV3> {
		openapiSchema.openapi = "3.0.0";

		const infoData = await this.getInfoDataFromAdminPanel();
		openapiSchema = await this.exchangeOpenAPIContentWithAdminPanel(
			openapiSchema
		);

		/* update info */
		openapiSchema.info.title = infoData.openapi_title;
		openapiSchema.info.version = infoData.openapi_version;
		openapiSchema.info.description = infoData.openapi_description;
		openapiSchema.info.contact = infoData.openapi_contact;
		// ?: Is license required?
		openapiSchema.info.license = { name: "ISC" };
		(openapiSchema.info as any)["x-logo"] = {
			url: openapiConfig.logo.url,
			altText: infoData.openapi_title,
			backgroundColor: openapiConfig.logo.backgroundColor,
			href: infoData.openapi_contact.url,
		};
		/* update server */
		openapiSchema.servers = [{ url: infoData.openapi_service_baseurl }];

		return openapiSchema;
	}

	private async getInfoDataFromAdminPanel(): Promise<{
		openapi_title: string;
		openapi_version: string;
		openapi_description: string;
		openapi_service_baseurl: string;
		openapi_contact: {
			name: string;
			email: string;
			url: string;
		};
	}> {
		try {
			let data: OpenAPIIntroduction;
			/**
			 * Todo: add a level of caching here.
			 */
			data = await this.adminPanelService.getInfoData();

			return {
				openapi_title: data.service_title,
				openapi_version: data.service_version,
				openapi_description: data.description,
				openapi_service_baseurl: data.service_baseurl,
				openapi_contact: {
					name: data.company_name,
					email: data.company_email,
					url: data.company_site,
				},
			};
		} catch (error) {
			console.error(
				"[ OpenAPI ] >> getInfoDataFromAdminPanel got error:",
				error
			);
			return {
				openapi_title: "",
				openapi_version: "",
				openapi_description: "",
				openapi_service_baseurl: "",
				openapi_contact: {
					name: "",
					email: "",
					url: "",
				},
			};
		}
	}

	private async exchangeOpenAPIContentWithAdminPanel(
		openapi: Swagger.SwaggerV3
	): Promise<Swagger.SwaggerV3> {
		for (let path of Object.keys(openapi.paths)) {
			for (let method of Object.keys(openapi.paths[path])) {
				// console.log("method path", method, path, (openapi.paths[path] as Swagger.PathItem)[method as Swagger.Method]);
				const apiServiceValue =
					await this.adminPanelService.getSingleAPIService(method, path);

				if (apiServiceValue.ok && apiServiceValue.result) {
					(openapi.paths[path] as any)[method].description =
						apiServiceValue.result.description;
					(openapi.paths[path] as any)[method].operationId =
						apiServiceValue.result.title;
					openapi = this.replaceOpenAPIInputDescription(
						openapi,
						method as Swagger.Method,
						path,
						apiServiceValue.result.service_input
					);
					continue;
				}

				const apiServiceInput = this.exportAPIServiceInputFromOpenAPIPath(
					openapi,
					path,
					method
				);

				const newAPIService =
					await this.adminPanelService.createSingleAPIService({
						title: (openapi.paths[path] as any)[method].operationId,
						identifier: `${method}:${path}`,
						description: "--",
						public: true,
						service_input: apiServiceInput,
						service_output: {},
					});
				if (newAPIService.ok && newAPIService.result) {
					(openapi.paths[path] as any)[method].description =
						newAPIService.result.description;
					(openapi.paths[path] as any)[method].operationId =
						newAPIService.result.title;
					openapi = this.replaceOpenAPIInputDescription(
						openapi,
						method as Swagger.Method,
						path,
						newAPIService.result.service_input
					);
				}
			}
		}

		return openapi;
	}

	private replaceOpenAPIInputDescription(
		openapi: Swagger.SwaggerV3,
		method: Swagger.Method,
		path: string,
		serviceInput: OpenAPIServiceInput
	): Swagger.SwaggerV3 {
		const { paths, queries, body } = serviceInput;
		if (paths) {
			for (const p of Object.keys(paths)) {
				// as openapi parameters are array, we should find each field's index to replace value
				const targetIndex = (
					(openapi.paths[path] as any)[method] as Swagger.Operation
				).parameters?.findIndex(
					(path_params) => path_params.in === "path" && path_params.name === p
				);
				console.log(">>>>>",p,method, path,targetIndex);
				
				if (targetIndex === undefined || targetIndex < 0) {
					continue;
				}
				(
					((openapi.paths[path] as any)[method] as Swagger.Operation)
						.parameters as Swagger.ParameterOrRef[]
				)[targetIndex].description = paths[p].description;
			}
		}

		if (queries) {
			for (const q of Object.keys(queries)) {
				// as openapi parameters are array, we should find each field's index to replace value
				const targetIndex = (
					(openapi.paths[path] as any)[method] as Swagger.Operation
				).parameters?.findIndex(
					(path_params) => path_params.in === "query" && path_params.name === q
				);
				if (!targetIndex || targetIndex < 0) {
					continue;
				}
				(
					((openapi.paths[path] as any)[method] as Swagger.Operation)
						.parameters as Swagger.ParameterOrRef[]
				)[targetIndex].description = queries[q].description;
			}
		}

		return openapi;
	}

	private exportAPIServiceInputFromOpenAPIPath(
		openapi: Swagger.SwaggerV3,
		path: string,
		method: string
	): OpenAPIServiceInput {
		//! should contain queries, body and paths information
		const serviceInput = {
			paths: {},
			queries: {},
			body: {},
		};

		const serviceInfo: Swagger.Operation = (openapi.paths[path] as any)[method];

		if (serviceInfo.parameters) {
			for (const parameter of serviceInfo.parameters) {
				if (parameter.in === "path") {
					serviceInput.paths = {
						...serviceInput.paths,
						[parameter.name]: {
							description: "",
						},
					};
					continue;
				}
				if (parameter.in === "query") {
					serviceInput.queries = {
						...serviceInput.queries,
						[parameter.name]: {
							description: "",
						},
					};
					continue;
				}
			}
		}

		if (serviceInfo.requestBody) {
			// Todo: if it's possible, make this function's performance better (Big O notation)
			const bodyFieldsDetector = (
				bodyPart: Swagger.Schema | Swagger.Reference
			) => {
				let b: { description: string; __is_array: boolean; __children?: any } =
					{ description: "--", __is_array: true };
				let __children = {};
				/**
				 * in case that no properties or items key exist, thats end of node.
				 */
				if (!bodyPart.properties && !bodyPart.items) {
					b.__is_array = false;
					return b;
				}

				if (bodyPart.items && !bodyPart.items.properties) {
					return b;
				}

				/**
				 *  if `properties` key exist, we should loop go through every
				 *  properties key and detect fields
				 */
				if (bodyPart.properties) {
					for (const field of Object.keys(bodyPart.properties)) {
						__children = {
							...__children,
							[field]: bodyFieldsDetector(bodyPart.properties[field]),
						};
					}
					b = {
						...b,
						__children,
					};
					return b;
				}

				/**
				 * in case that body part has `items` key and properties key found in it,
				 * we should look into `items`.`properties` key instead of direct way
				 */
				for (const field of Object.keys(bodyPart.items.properties)) {
					__children = {
						...__children,
						[field]: bodyFieldsDetector(bodyPart.items.properties[field]),
					};
				}
				b = {
					...b,
					__children,
				};
				return b;
			};

			for (const contentType of Object.keys(serviceInfo.requestBody.content)) {
				const schemaRef = (
					serviceInfo.requestBody.content[contentType].schema.$ref as string
				)
					.replace("#/", "")
					.split("/")[2] as string;
				const bodySchema: Swagger.Schema = (openapi.components?.schemas as any)[
					schemaRef
				];
				serviceInput.body = {
					[contentType]: bodyFieldsDetector(bodySchema),
				};
			}
		}

		return serviceInput;
	}

	private async convertOpenapiJsonToYaml(
		openapiSchemaJson: Swagger.SwaggerV3
	): Promise<string> {
		const openapiYaml = yaml.stringify(openapiSchemaJson);
		return openapiYaml;
	}
}
