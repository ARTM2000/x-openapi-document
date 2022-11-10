import https from "https";
import axios from "axios";
import yaml from "yaml";
import { Swagger } from "atlassian-openapi";
import {
	merge,
	isErrorResult as isOpenAPIMergeError,
	MergeInput,
} from "openapi-merge";
import { OpenApiSource } from "../types";
import { openapiSourceList, openapiConfig } from "../config/openapi";

export class OpenAPIOrganizer {
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
				console.error('fetching schema got error:', err);
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
		/* update info */
		openapiSchema.info.title = openapiConfig.openapi_title;
		openapiSchema.info.version = openapiConfig.openapi_api_version;
		openapiSchema.info.description = openapiConfig.openapi_description;
		openapiSchema.info.contact = openapiConfig.openapi_contact;
		openapiSchema.info.license = { name: "ISC" };
		(openapiSchema.info as any)['x-logo'] = openapiConfig.logo;
		/* update server */
		openapiSchema.servers = [{ ...openapiConfig.server }];

		return openapiSchema;
	}

	private async convertOpenapiJsonToYaml(
		openapiSchemaJson: Swagger.SwaggerV3
	): Promise<string> {
		const openapiYaml = yaml.stringify(openapiSchemaJson);
		return openapiYaml;
	}
}
