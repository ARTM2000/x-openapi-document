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
	OpenAPISchemaItem,
	OpenAPIIntroduction,
	OpenAPIServiceInput,
	OpenApiSource,
	OpenAPIServiceOutput,
} from "../types";
import { openapiSourceList, openapiConfig } from "../config/openapi";
import { AdminPanelService } from "./admin-panel.service";

export class OpenAPIOrganizer {
	private readonly adminPanelService: AdminPanelService;
	private readonly defaultDescription: string = "--";
	// add this response status codes with "priority". They are check from beginning
	private readonly successfulResponseStatusCodes: string[] = ["201", "200"];

	constructor() {
		// check if `successfulResponseStatusCodes` is defined and at least '200' was set
		if (
			this.successfulResponseStatusCodes.length === 0 ||
			!this.successfulResponseStatusCodes.includes("200")
		) {
			throw new Error(
				"[OpenAPIOrganizer] >> No 'successfulResponseStatusCode' is defined or '200' not exist in list"
			);
		}
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
				openapi_title: "unset",
				openapi_version: "unset",
				openapi_description: "unset",
				openapi_service_baseurl: "unset",
				openapi_contact: {
					name: "unset",
					email: "unset",
					url: "unset",
				},
			};
		}
	}

	private async exchangeOpenAPIContentWithAdminPanel(
		openapi: Swagger.SwaggerV3
	): Promise<Swagger.SwaggerV3> {
		for (let path of Object.keys(openapi.paths)) {
			for (let method of Object.keys(openapi.paths[path])) {
				console.log(
					"method path",
					method,
					path,
					(openapi.paths[path] as any)[method].operationId
				);
				//(openapi.paths[path] as Swagger.PathItem)[method as Swagger.Method]
				const apiServiceValue =
					await this.adminPanelService.getSingleAPIService(method, path);

				if (apiServiceValue.ok && apiServiceValue.result) {
					// set service description
					(openapi.paths[path] as any)[method].description =
						apiServiceValue.result.description;
					// set service name
					(openapi.paths[path] as any)[method].operationId =
						apiServiceValue.result.title;
					// set success response description
					const successResponse =
						this.findSuccessResponseOfOpenAPIService(
							openapi,
							path,
							method
						);
					(openapi.paths[path] as any)[method].responses[
						successResponse.statusCode
					].description = apiServiceValue.result.response_description;
					// set input descriptions
					openapi = this.replaceOpenAPIInputDescription(
						openapi,
						method as Swagger.Method,
						path,
						apiServiceValue.result.service_input
					);
					// set output descriptions
					openapi = this.replaceOpenAPIOutputDescription(
						openapi,
						method as Swagger.Method,
						path,
						apiServiceValue.result.service_output
					);
					continue;
				}

				const apiServiceInput = this.exportOpenAPIServiceInputFromOpenAPIPath(
					openapi,
					path,
					method
				);
				const apiServiceOutput = this.exportOpenAPIServiceOutputFromOpenAPIPath(
					openapi,
					path,
					method
				);

				const newAPIService =
					await this.adminPanelService.createSingleAPIService({
						title: (openapi.paths[path] as any)[method].operationId,
						identifier: `${method}:${path}`,
						description: this.defaultDescription,
						public: true,
						response_description: this.defaultDescription,
						service_input: apiServiceInput,
						service_output: apiServiceOutput,
					});
				if (newAPIService.ok && newAPIService.result) {
					// set service description
					(openapi.paths[path] as any)[method].description =
						newAPIService.result.description;
					// set service name
					(openapi.paths[path] as any)[method].operationId =
						newAPIService.result.title;
					// set success response description
					const successResponse =
						this.findSuccessResponseOfOpenAPIService(
							openapi,
							path,
							method
						);
					(openapi.paths[path] as any)[method].responses[
						successResponse.statusCode
					].description = newAPIService.result.response_description;
					// set input descriptions
					openapi = this.replaceOpenAPIInputDescription(
						openapi,
						method as Swagger.Method,
						path,
						newAPIService.result.service_input
					);
					// set output descriptions
					openapi = this.replaceOpenAPIOutputDescription(
						openapi,
						method as Swagger.Method,
						path,
						newAPIService.result.service_output
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
				if (targetIndex === undefined || targetIndex < 0) {
					// !important: document content update trigger
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
					// !important: document content update trigger
					continue;
				}
				(
					((openapi.paths[path] as any)[method] as Swagger.Operation)
						.parameters as Swagger.ParameterOrRef[]
				)[targetIndex].description = queries[q].description;
			}
		}

		if (body) {
			const serviceInfo: Swagger.Operation = (openapi.paths[path] as any)[
				method
			];
			for (const contentType of Object.keys(body)) {
				const schemaRef = (
					(
						(serviceInfo.requestBody as Swagger.RequestBody).content[
							contentType
						].schema as Swagger.Reference
					).$ref as string
				)
					.replace("#/", "")
					.split("/")[2] as string;

				if ((openapi.paths[path] as any)[method].requestBody) {
					// !important: document content update trigger
					(openapi.paths[path] as any)[method].requestBody.description =
						body[contentType].description;
				}

				const bodySchema: Swagger.Schema = (openapi.components?.schemas as any)[
					schemaRef
				];

				(openapi.components?.schemas as any)[schemaRef] =
					this.schemaFieldUpdater(
						openapi,
						bodySchema,
						body[contentType]
					).schema;
			}
		}

		return openapi;
	}

	private exportOpenAPIServiceInputFromOpenAPIPath(
		openapi: Swagger.SwaggerV3,
		path: string,
		method: string
	): OpenAPIServiceInput {
		//! should contain queries, body and paths information
		const serviceInput: OpenAPIServiceInput = {
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
							description: this.defaultDescription,
						},
					};
					continue;
				}
				if (parameter.in === "query") {
					serviceInput.queries = {
						...serviceInput.queries,
						[parameter.name]: {
							description: this.defaultDescription,
						},
					};
					continue;
				}
			}
		}

		if (serviceInfo.requestBody) {
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
					...serviceInput.body,
					[contentType]: this.schemaFieldsDetector(openapi, bodySchema).fields,
				};
			}
		}

		return serviceInput;
	}

	private findSuccessResponseOfOpenAPIService(
		openapi: Swagger.SwaggerV3,
		path: string,
		method: string
	): {
		res: Swagger.Response | Swagger.Reference | undefined;
		statusCode: string;
	} {
		const serviceInfo: Swagger.Operation = (openapi.paths[path] as any)[method];
		const responses = serviceInfo.responses;
		const response: { successResponse?: Swagger.Response | Swagger.Reference } =
			{};
		let finalStatusCode: string = "";
		for (const successStatusCode of this.successfulResponseStatusCodes) {
			// get first preferred success response status code
			if (!responses[successStatusCode]) {
				continue;
			}
			response.successResponse = responses[successStatusCode];
			finalStatusCode = successStatusCode;
			break;
		}
		return { res: response.successResponse, statusCode: finalStatusCode };
	}

	private exportOpenAPIServiceOutputFromOpenAPIPath(
		openapi: Swagger.SwaggerV3,
		path: string,
		method: string
	): OpenAPIServiceOutput {
		let serviceOutput: OpenAPIServiceOutput = {};
		const finalResponse = this.findSuccessResponseOfOpenAPIService(
			openapi,
			path,
			method
		).res;

		for (const contentType of Object.keys(
			(finalResponse as Swagger.Response | Swagger.Reference).content
		)) {
			const schemaRef = (
				(finalResponse as Swagger.Response | Swagger.Reference).content[
					contentType
				].schema.$ref as string
			)
				.replace("#/", "")
				.split("/")[2] as string;
			const responseSchema: Swagger.Schema = (
				openapi.components?.schemas as any
			)[schemaRef];
			serviceOutput = {
				...serviceOutput,
				[contentType]: this.schemaFieldsDetector(openapi, responseSchema)
					.fields,
			};
		}

		return serviceOutput;
	}

	private replaceOpenAPIOutputDescription(
		openapi: Swagger.SwaggerV3,
		method: Swagger.Method,
		path: string,
		serviceOutput: OpenAPIServiceOutput
	): Swagger.SwaggerV3 {
		const finalResponse = this.findSuccessResponseOfOpenAPIService(
			openapi,
			path,
			method
		).res;

		for (const contentType of Object.keys(
			(finalResponse as Swagger.Response | Swagger.Reference).content
		)) {
			const schemaRef = (
				(finalResponse as Swagger.Response | Swagger.Reference).content[
					contentType
				].schema.$ref as string
			)
				.replace("#/", "")
				.split("/")[2] as string;

			const mainResponseSchema: Swagger.Schema = (
				openapi.components?.schemas as any
			)[schemaRef];

			const replacementResult = this.schemaFieldUpdater(
				openapi,
				mainResponseSchema,
				serviceOutput[contentType]
			);
			(openapi.components?.schemas as any)[schemaRef] =
				replacementResult.schema;
			openapi = replacementResult.openapi;
		}

		return openapi;
	}

	private schemaFieldsDetector = (
		openapi: Swagger.SwaggerV3,
		childSchema: Swagger.Schema | Swagger.Reference
	): { fields: OpenAPISchemaItem; openapi: Swagger.SwaggerV3 } => {
		let b: OpenAPISchemaItem = {
			description: this.defaultDescription,
		};
		let __c: { [key: string]: OpenAPISchemaItem } = {};

		/**
		 * if `childSchema` has a reference to other schema instead of
		 * properties, get that ref and process it as below
		 */
		if ((childSchema as any).$ref) {
			const schemaRef = ((childSchema as any).$ref as string)
				.replace("#/", "")
				.split("/")[2];
			const schema: Swagger.Schema = (openapi.components?.schemas as any)[
				schemaRef
			];
			__c = {
				[schemaRef]: this.schemaFieldsDetector(openapi, schema).fields,
			};
			b = {
				...b,
				__c,
			};
			return { fields: b, openapi };
		}

		/**
		 * in case that no properties or items key exist, thats end of node.
		 */
		if (
			(!childSchema.properties && !childSchema.items) ||
			(childSchema.items && !childSchema.items.properties)
		) {
			return { fields: b, openapi };
		}

		/**
		 *  if `properties` key exist, we should loop go through every
		 *  properties key and detect fields
		 */
		if (childSchema.properties) {
			for (const field of Object.keys(childSchema.properties)) {
				__c = {
					...__c,
					[field]: this.schemaFieldsDetector(
						openapi,
						childSchema.properties[field]
					).fields,
				};
			}
			b = {
				...b,
				__c,
			};
			return { fields: b, openapi };
		}

		/**
		 * in case that body part has `items` key and properties key found in it,
		 * we should look into `items`.`properties` key instead of direct way
		 */
		for (const field of Object.keys(childSchema.items.properties)) {
			__c = {
				...__c,
				[field]: this.schemaFieldsDetector(
					openapi,
					childSchema.items.properties[field]
				).fields,
			};
		}
		b = {
			...b,
			__c,
		};
		return { fields: b, openapi };
	};

	private schemaFieldUpdater(
		openapi: Swagger.SwaggerV3,
		childSchema: Swagger.Schema | Swagger.Reference,
		childContent: OpenAPISchemaItem
	): {
		schema: Swagger.Schema | Swagger.Reference;
		openapi: Swagger.SwaggerV3;
	} {
		if (
			!childSchema.description ||
			childSchema.description === this.defaultDescription
		) {
			childSchema.description = childContent.description as string;
		}

		/**
		 * if `childSchema` has a reference to other schema instead of
		 * properties, get that ref and process it as below
		 */
		if ((childSchema as any).$ref) {
			const schemaRef = ((childSchema as any).$ref as string)
				.replace("#/", "")
				.split("/")[2];
			const schema: Swagger.Schema = (openapi.components?.schemas as any)[
				schemaRef
			];

			if (childContent.__c && childContent.__c[schemaRef]) {
				openapi = this.schemaFieldUpdater(
					openapi,
					schema,
					childContent.__c[schemaRef]
				).openapi;
			} else {
				// !important: document content update trigger
			}
		}

		/**
		 * in case that no properties or items key exist, thats end of node.
		 */
		if (
			(!childSchema.properties && !childSchema.items) ||
			(childSchema.items && !childSchema.items.properties)
		) {
			return { schema: childSchema, openapi };
		}

		/**
		 * When `childSchema` has `properties` key, we should loop into fields.
		 * In this case, `childContent` must have `__c` key; for its content
		 */
		if (childSchema.properties) {
			for (const property of Object.keys(childSchema.properties)) {
				if (!childContent.__c || !childContent.__c[property]) {
					// !important: document content update trigger
					continue;
				}
				childSchema.properties[property] = this.schemaFieldUpdater(
					openapi,
					childSchema.properties[property],
					childContent.__c[property]
				).schema;
			}
			return { schema: childSchema, openapi };
		}

		/**
		 * Otherwise, when `childSchema` has `items` property, we should look into
		 * `items`.`properties` instead of direct way.
		 * In this case, `childContent` must have `__c` key; for its content
		 */
		for (const property of Object.keys(childSchema.items.properties)) {
			if (!childContent.__c || !childContent.__c[property]) {
				// !important: document content update trigger
				continue;
			}
			childSchema.items.properties[property] = this.schemaFieldUpdater(
				openapi,
				childSchema.items.properties[property],
				childContent.__c[property]
			).schema;
		}
		return { schema: childSchema, openapi };
	}

	private async convertOpenapiJsonToYaml(
		openapiSchemaJson: Swagger.SwaggerV3
	): Promise<string> {
		const openapiYaml = yaml.stringify(openapiSchemaJson);
		return openapiYaml;
	}
}
