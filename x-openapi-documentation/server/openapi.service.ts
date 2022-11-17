import https from 'https';
import axios from 'axios';
import yaml from 'yaml';
import { Swagger } from 'atlassian-openapi';
import {
  merge,
  isErrorResult as isOpenAPIMergeError,
  MergeInput,
} from 'openapi-merge';
import {
  OpenAPISchemaItem,
  OpenAPIIntroduction,
  OpenAPIServiceInput,
  OpenApiSource,
  OpenAPIServiceOutput,
  OpenAPIGeneralSchema,
} from '../types';
import {
  openapiSourceList,
  openapiConfig,
  openapiSecuritySchemes,
} from '../config/openapi';
import { AdminPanelService } from './admin-panel.service';

export class OpenAPIOrganizer {
  private readonly adminPanelService: AdminPanelService;
  private readonly defaultDescription: string = '--';
  // add this response status codes with "priority". They are check from beginning
  private readonly successfulResponseStatusCodes: string[] = ['201', '200'];

  constructor() {
    // check if `successfulResponseStatusCodes` is defined and at least '200' was set
    if (
      this.successfulResponseStatusCodes.length === 0 ||
      !this.successfulResponseStatusCodes.includes('200')
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
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
          }),
        });
        openapiContents.push({ openapiContent: response.data, source });
      } catch (err) {
        this.logger('fetching schema got error:', err);
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

  // private clearAllOpenAPIDescription(
  //   openapi: Swagger.SwaggerV3
  // ): Swagger.SwaggerV3 {
  //   openapi.info.description = this.defaultDescription;
  //   for (const p of Object.keys(openapi.paths)) {
  //     const path = openapi.paths[p];
  //     for (const m of Object.keys(path)) {
  //       const method = path[m as Swagger.Method] as Swagger.Operation;
  //       if (method?.description) {
  //         (
  //           openapi.paths[p][m as Swagger.Method] as Swagger.Operation
  //         ).description = this.defaultDescription;
  //       }

  //       if (method.responses) {
  //         for (const r of Object.keys(method.responses)) {
  //           const response = method.responses[r];
  //           if (response.description) {
  //             (
  //               openapi.paths[p][m as Swagger.Method] as Swagger.Operation
  //             ).responses[r].description = this.defaultDescription;
  //           }
  //         }
  //       }

  //       if (method.parameters) {
  //         for (const parameterIndex in method.parameters) {
  //           const parameter = method.parameters[parameterIndex];
  //           if (parameter.description) {
  //             (
  //               (openapi.paths[p][m as Swagger.Method] as Swagger.Operation)
  //                 .parameters as Swagger.ParameterOrRef[]
  //             )[parameterIndex].description = this.defaultDescription;
  //           }
  //         }
  //       }
  //     }
  //   }

  //   const schemas = openapi.components?.schemas;
  //   if (schemas) {
  //     for (const s of Object.keys(schemas)) {
  //       const schema = schemas[s];
  //       if (schema.properties) {
  //         for (const ppt of Object.keys(schema.properties)) {
  //           const property = schema.properties[ppt] as Swagger.Schema;
  //           if (property.description) {
  //             (
  //               (
  //                 openapi.components?.schemas as {
  //                   [key: string]: Swagger.Schema | Swagger.Reference;
  //                 }
  //               )[s].properties[ppt] as Swagger.Schema
  //             ).description = this.defaultDescription;
  //           }
  //         }
  //       }
  //     }
  //   }

  //   return openapi;
  // }

  private async formatOpenapiJSON(
    openapiSchema: Swagger.SwaggerV3
  ): Promise<Swagger.SwaggerV3> {
    const infoData = await this.getInfoDataFromAdminPanel();
    openapiSchema = await this.exchangeOpenAPIContentWithAdminPanel(
      openapiSchema
    );
    openapiSchema = this.formatSecuritySchemes(openapiSchema);

    openapiSchema.openapi = '3.0.0';
    /* update info */
    openapiSchema.info.title = infoData.openapi_title;
    openapiSchema.info.version = infoData.openapi_version;
    openapiSchema.info.description = infoData.openapi_description;

    /**
     * check if openapi conversion to postman enabled, add link to
     * info.description for user on client side
     */
    if (openapiConfig.postman.enable) {
      this.logger('(Enable) postman conversion');
      openapiSchema.info.description += `\n# ${openapiConfig.postman.title}\n<a href='/api/openapi/postman' download='${openapiConfig.postman.filename}.${openapiSchema.info.version}.json'>${openapiConfig.postman.linkText}</a>`;
    }

    openapiSchema.info.contact = infoData.openapi_contact;
    // ?: Is license required?
    openapiSchema.info.license = { name: 'ISC' };
    (openapiSchema.info as any)['x-logo'] = {
      url: openapiConfig.logo.url,
      altText: infoData.openapi_title,
      backgroundColor: openapiConfig.logo.backgroundColor,
      href: infoData.openapi_contact.url,
    };
    /* update server */
    openapiSchema.servers = [{ url: infoData.openapi_service_baseurl }];

    return openapiSchema;
  }

  private formatSecuritySchemes(openapi: Swagger.SwaggerV3): Swagger.SwaggerV3 {
    (openapi.components as any).securitySchemes = openapiSecuritySchemes;
    return openapi;
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
        '[ OpenAPI ] >> getInfoDataFromAdminPanel got error:',
        error
      );
      return {
        openapi_title: 'unset',
        openapi_version: 'unset',
        openapi_description: 'unset',
        openapi_service_baseurl: 'unset',
        openapi_contact: {
          name: 'unset',
          email: 'unset',
          url: 'unset',
        },
      };
    }
  }

  private async exchangeOpenAPIContentWithAdminPanel(
    openapi: Swagger.SwaggerV3
  ): Promise<Swagger.SwaggerV3> {
    for (let path of Object.keys(openapi.paths)) {
      for (let method of Object.keys(openapi.paths[path])) {
        //(openapi.paths[path] as Swagger.PathItem)[method as Swagger.Method]
        const apiServiceValue =
          await this.adminPanelService.getSingleAPIService(method, path);

        if (apiServiceValue.ok && apiServiceValue.result) {
          // remove path if it is not publicly available
          if (!apiServiceValue.result.public) {
            delete (openapi.paths[path] as any)[method];
            continue;
          }

          // set service description
          (openapi.paths[path] as any)[method].description =
            apiServiceValue.result.description;
          // set service name
          (openapi.paths[path] as any)[method].operationId =
            apiServiceValue.result.title;
          // set success response description
          const successResponse = this.findSuccessResponseOfOpenAPIService(
            openapi,
            path,
            method
          );
          (openapi.paths[path] as any)[method].responses[
            successResponse.statusCode
          ].description = apiServiceValue.result.response_description;
          // set description for error responses
          openapi = await this.exchangeErrorResponsesOfOpenAPIService(
            openapi,
            path,
            method
          );
          // set input descriptions
          openapi = await this.replaceOpenAPIInputDescription(
            openapi,
            method as Swagger.Method,
            path,
            apiServiceValue.result.service_input
          );
          // set output descriptions
          openapi = await this.replaceOpenAPIOutputDescription(
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
          const successResponse = this.findSuccessResponseOfOpenAPIService(
            openapi,
            path,
            method
          );
          (openapi.paths[path] as any)[method].responses[
            successResponse.statusCode
          ].description = newAPIService.result.response_description;
          // set description for error responses
          openapi = await this.exchangeErrorResponsesOfOpenAPIService(
            openapi,
            path,
            method
          );
          // set input descriptions
          openapi = await this.replaceOpenAPIInputDescription(
            openapi,
            method as Swagger.Method,
            path,
            newAPIService.result.service_input
          );
          // set output descriptions
          openapi = await this.replaceOpenAPIOutputDescription(
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

  private async replaceOpenAPIInputDescription(
    openapi: Swagger.SwaggerV3,
    method: Swagger.Method,
    path: string,
    serviceInput: OpenAPIServiceInput
  ): Promise<Swagger.SwaggerV3> {
    const { headers, paths, queries, body } = serviceInput;
    if (headers) {
      for (const h of Object.keys(headers)) {
        // as openapi parameters are array, we should find each field's index to replace value
        const targetIndex = (
          (openapi.paths[path] as any)[method] as Swagger.Operation
        ).parameters?.findIndex(
          (header_params) =>
            header_params.in === 'header' && header_params.name === h
        );
        if (targetIndex === undefined || targetIndex < 0) {
          // !important: document content update trigger
          continue;
        }
        (
          ((openapi.paths[path] as any)[method] as Swagger.Operation)
            .parameters as Swagger.ParameterOrRef[]
        )[targetIndex].description = headers[h].description;
      }
    }

    if (paths) {
      for (const p of Object.keys(paths)) {
        // as openapi parameters are array, we should find each field's index to replace value
        const targetIndex = (
          (openapi.paths[path] as any)[method] as Swagger.Operation
        ).parameters?.findIndex(
          (path_params) => path_params.in === 'path' && path_params.name === p
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
          (query_params) =>
            query_params.in === 'query' && query_params.name === q
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
          .replace('#/', '')
          .split('/')[2] as string;

        if ((openapi.paths[path] as any)[method].requestBody) {
          // !important: document content update trigger
          (openapi.paths[path] as any)[method].requestBody.description =
            body[contentType].description;
        }

        const bodySchema: Swagger.Schema = (openapi.components?.schemas as any)[
          schemaRef
        ];

        (openapi.components?.schemas as any)[schemaRef] = (
          await this.schemaFieldUpdater(
            openapi,
            bodySchema,
            body[contentType],
            {
              path,
              method,
              type: 'input',
              originalContent: serviceInput,
              keyChain: ['body', contentType],
            }
          )
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
      headers: {},
      paths: {},
      queries: {},
      body: {},
    };

    const serviceInfo: Swagger.Operation = (openapi.paths[path] as any)[method];

    if (serviceInfo.parameters) {
      for (const parameter of serviceInfo.parameters) {
        if (parameter.in === 'header') {
          serviceInput.headers = {
            ...serviceInput.headers,
            [parameter.name]: {
              description: this.defaultDescription,
            },
          };
          continue;
        }
        if (parameter.in === 'path') {
          serviceInput.paths = {
            ...serviceInput.paths,
            [parameter.name]: {
              description: this.defaultDescription,
            },
          };
          continue;
        }
        if (parameter.in === 'query') {
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
          .replace('#/', '')
          .split('/')[2] as string;
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
    const response: {
      successResponse?: Swagger.Response | Swagger.Reference;
    } = {};
    let finalStatusCode: string = '';
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

  private async exchangeErrorResponsesOfOpenAPIService(
    openapi: Swagger.SwaggerV3,
    path: string,
    method: string
  ): Promise<Swagger.SwaggerV3> {
    const serviceInfo: Swagger.Operation = (openapi.paths[path] as any)[method];
    const responses = serviceInfo.responses;

    for (const responseStatusCode of Object.keys(responses)) {
      if (this.successfulResponseStatusCodes.includes(responseStatusCode)) {
        continue;
      }

      const errorResponse =
        await this.adminPanelService.getErrorStatusCodeDescription(
          responseStatusCode
        );
      if (errorResponse.ok && errorResponse.result?.description) {
        (openapi.paths[path] as any)[method].responses[
          responseStatusCode
        ].description = errorResponse.result.description;
        continue;
      }

      // in case that error response status code did not exist
      await this.adminPanelService.createSingleErrorStatusCode(
        responseStatusCode,
        this.defaultDescription
      );
      (openapi.paths[path] as any)[method].responses[
        responseStatusCode
      ].description = this.defaultDescription;
    }

    return openapi;
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
      this.logger(
        'here >>',
        (finalResponse as Swagger.Response | Swagger.Reference).content[
          contentType
        ].schema
      );

      const schema = (finalResponse as Swagger.Response | Swagger.Reference)
        .content[contentType].schema;
      if (schema.oneOf) {
        for (const refObj of schema.oneOf) {
          this.logger(refObj);
          const schemaRef = (refObj as Swagger.Reference).$ref
            .replace('#/', '')
            .split('/')[2] as string;

          const responseSchema: Swagger.Schema = (
            openapi.components?.schemas as any
          )[schemaRef];

          this.logger('serviceOutput >> ', serviceOutput);
          const prevContentType = serviceOutput[contentType]
            ? (serviceOutput[contentType] as OpenAPISchemaItem[])
            : [];

          serviceOutput = {
            ...serviceOutput,
            [contentType]: [
              ...prevContentType,
              this.schemaFieldsDetector(openapi, responseSchema).fields,
            ],
          };
        }
        continue;
      }

      const schemaRef = (schema.$ref as string)
        .replace('#/', '')
        .split('/')[2] as string;
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

  private async replaceOpenAPIOutputDescription(
    openapi: Swagger.SwaggerV3,
    method: Swagger.Method,
    path: string,
    serviceOutput: OpenAPIServiceOutput
  ): Promise<Swagger.SwaggerV3> {
    const finalResponse = this.findSuccessResponseOfOpenAPIService(
      openapi,
      path,
      method
    ).res;

    for (const contentType of Object.keys(
      (finalResponse as Swagger.Response | Swagger.Reference).content
    )) {
      const schema = (finalResponse as Swagger.Response | Swagger.Reference)
        .content[contentType].schema;
      if (schema.oneOf && Array.isArray(serviceOutput[contentType])) {
        for (const refIndex in schema.oneOf) {
          const refObj = schema.oneOf[refIndex] as Swagger.Reference;
          const schemaRef = refObj.$ref
            .replace('#/', '')
            .split('/')[2] as string;

          const mainResponseSchema: Swagger.Schema = (
            openapi.components?.schemas as any
          )[schemaRef];

          const replacementResult = await this.schemaFieldUpdater(
            openapi,
            mainResponseSchema,
            (serviceOutput[contentType] as OpenAPISchemaItem[])[
              +refIndex
            ] as OpenAPISchemaItem,
            {
              path,
              method,
              type: 'output',
              originalContent: serviceOutput,
              keyChain: [contentType, refIndex],
            }
          );

          (openapi.components?.schemas as any)[schemaRef] =
            replacementResult.schema;
          openapi = replacementResult.openapi;
        }
        continue;
      }

      const schemaRef = (
        (finalResponse as Swagger.Response | Swagger.Reference).content[
          contentType
        ].schema.$ref as string
      )
        .replace('#/', '')
        .split('/')[2] as string;

      const mainResponseSchema: Swagger.Schema = (
        openapi.components?.schemas as any
      )[schemaRef];

      const replacementResult = await this.schemaFieldUpdater(
        openapi,
        mainResponseSchema,
        serviceOutput[contentType] as OpenAPISchemaItem,
        {
          path,
          method,
          type: 'output',
          originalContent: serviceOutput,
          keyChain: [contentType],
        }
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
        .replace('#/', '')
        .split('/')[2];
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

  private async schemaFieldUpdater(
    openapi: Swagger.SwaggerV3,
    childSchema: Swagger.Schema | Swagger.Reference,
    childContent: OpenAPISchemaItem,
    meta: {
      path: string;
      method: string;
      keyChain: string[];
      type: 'input' | 'output';
      originalContent: OpenAPIServiceInput | OpenAPIServiceOutput;
    }
  ): Promise<{
    schema: Swagger.Schema | Swagger.Reference;
    openapi: Swagger.SwaggerV3;
  }> {
    if (
      !childSchema.description ||
      (childSchema.description as string).match(/[a-z]+/gi) ||
      childSchema.description === this.defaultDescription
    ) {
      childSchema.description = childSchema.description =
        childContent.description as string;
    }

    if ((childSchema as any).$ref) {
      /**
       * if `childSchema` has a reference to other schema instead of
       * properties, get that ref and process it as below
       */
      const schemaRef = ((childSchema as any).$ref as string)
        .replace('#/', '')
        .split('/')[2];
      const schema: Swagger.Schema = (openapi.components?.schemas as any)[
        schemaRef
      ];

      if (childContent.__c && childContent.__c[schemaRef]) {
        openapi = (
          await this.schemaFieldUpdater(
            openapi,
            schema,
            childContent.__c[schemaRef],
            { ...meta, keyChain: [...meta.keyChain, schemaRef] }
          )
        ).openapi;
      } else {
        // !important: document content update trigger
        childContent = await this.updateOpenAPIServiceSchemaByOpenAPIChange(
          meta.type,
          {
            path: meta.path,
            method: meta.method,
            openapi: openapi,
            originalContent: meta.originalContent,
            childContent: childContent,
          },
          meta.keyChain
        );
        this.logger('childContent here in else >> ', childContent);
        if (childContent.__c && childContent.__c[schemaRef]) {
          openapi = (
            await this.schemaFieldUpdater(
              openapi,
              schema,
              (childContent.__c as any)[schemaRef],
              { ...meta, keyChain: [...meta.keyChain, schemaRef] }
            )
          ).openapi;
        } else {
          this.logger(
            'content update trigger by schema missed content did not find any useful childContent'
          );
        }
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
          childContent = await this.updateOpenAPIServiceSchemaByOpenAPIChange(
            meta.type,
            {
              path: meta.path,
              method: meta.method,
              openapi: openapi,
              originalContent: meta.originalContent,
              childContent: childContent,
            },
            meta.keyChain
          );

          if (!childContent.__c || !childContent.__c[property]) {
            this.logger(
              'content update trigger by schema missed content did not find any useful childContent'
            );
            continue;
          }
        }
        childSchema.properties[property] = (
          await this.schemaFieldUpdater(
            openapi,
            childSchema.properties[property],
            childContent.__c[property],
            { ...meta, keyChain: [...meta.keyChain, property] }
          )
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
        childContent = await this.updateOpenAPIServiceSchemaByOpenAPIChange(
          meta.type,
          {
            path: meta.path,
            method: meta.method,
            openapi: openapi,
            originalContent: meta.originalContent,
            childContent: childContent,
          },
          meta.keyChain
        );

        if (!childContent.__c || !childContent.__c[property]) {
          this.logger(
            'content update trigger by schema missed content did not find any useful childContent'
          );
          continue;
        }
      }
      childSchema.items.properties[property] = (
        await this.schemaFieldUpdater(
          openapi,
          childSchema.items.properties[property],
          childContent.__c[property],
          { ...meta, keyChain: [...meta.keyChain, property] }
        )
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

  private async updateOpenAPIServiceSchemaByOpenAPIChange(
    type: 'input' | 'output',
    data: {
      path: string;
      method: string;
      openapi: Swagger.SwaggerV3;
      originalContent: OpenAPIServiceInput | OpenAPIServiceOutput;
      childContent: OpenAPISchemaItem;
    },
    keyChains: string[]
  ): Promise<OpenAPISchemaItem> {
    const getChildContent = (
      content: OpenAPIServiceInput | OpenAPIServiceOutput,
      keyChain: string[]
    ): OpenAPISchemaItem => {
      let childContent = content;
      for (const key of keyChain) {
        this.logger('110 >> ', childContent);
        if ((childContent[key] as OpenAPISchemaItem).__c) {
          // @ts-ignore
          childContent = childContent[key].__c;
          continue;
        }

        // @ts-ignore
        childContent = childContent[key];
      }

      return childContent as unknown as OpenAPISchemaItem;
    };

    const checkOpenAPIService = (
      previousInputContent: OpenAPIGeneralSchema,
      newOpenAPIServiceInput: OpenAPIGeneralSchema
    ): { content: OpenAPIGeneralSchema; isDifferent: boolean } => {
      let diff = false;
      for (const k of Object.keys(newOpenAPIServiceInput)) {
        /**
         * if there is a content, always there is description.
         * so we don't check its existence
         */
        if (!previousInputContent[k]) {
          diff = true;
          continue;
        }
        (newOpenAPIServiceInput[k] as any as OpenAPISchemaItem).description = (
          previousInputContent[k] as any as OpenAPISchemaItem
        ).description;

        /**
         * check if new schema has __c and pervious content don't, ignore
         * checking __c!
         */
        if (!newOpenAPIServiceInput[k].__c || !previousInputContent[k].__c) {
          if (newOpenAPIServiceInput[k].__c && !previousInputContent[k].__c) {
            diff = true;
          }
          continue;
        }
        const checkedResult = checkOpenAPIService(
          previousInputContent[k].__c as OpenAPIGeneralSchema,
          newOpenAPIServiceInput[k].__c as OpenAPIGeneralSchema
        );
        newOpenAPIServiceInput[k].__c = checkedResult.content;
        if (checkedResult.isDifferent) {
          diff = true;
        }
      }

      return { content: newOpenAPIServiceInput, isDifferent: diff };
    };

    let childContent: OpenAPISchemaItem = getChildContent(
      type === 'input'
        ? this.exportOpenAPIServiceInputFromOpenAPIPath(
            data.openapi,
            data.path,
            data.method
          )
        : this.exportOpenAPIServiceOutputFromOpenAPIPath(
            data.openapi,
            data.path,
            data.method
          ),
      keyChains
    );

    switch (type) {
      case 'input':
        let somethingsInInputChanged = false;
        const savedAPIService_forInput =
          await this.adminPanelService.getSingleAPIService(
            data.method,
            data.path
          );
        const newOpenAPIServiceInput =
          this.exportOpenAPIServiceInputFromOpenAPIPath(
            data.openapi,
            data.path,
            data.method
          );
        if (!savedAPIService_forInput.ok || !savedAPIService_forInput.result) {
          this.logger('error in fetching saved content');
          /**
           * in case that unpredictable error in fetching data happens, set
           * `childContent` from newly detected fields and break switch
           */
          break;
        }

        const previousInputContent =
          savedAPIService_forInput.result.service_input;

        this.logger('perv => ', JSON.stringify(previousInputContent));
        this.logger(
          'new pure service input >> ',
          JSON.stringify(newOpenAPIServiceInput)
        );

        if (newOpenAPIServiceInput.body && previousInputContent.body) {
          if (
            newOpenAPIServiceInput.body['application/json'] &&
            previousInputContent.body['application/json']
          ) {
            const checkResult = checkOpenAPIService(
              previousInputContent.body['application/json']
                .__c as OpenAPIGeneralSchema,
              newOpenAPIServiceInput.body['application/json']
                .__c as OpenAPIGeneralSchema
            );
            newOpenAPIServiceInput.body['application/json'].__c =
              checkResult.content;
            if (checkResult.isDifferent) somethingsInInputChanged = true;
          }
          if (
            newOpenAPIServiceInput.body['application/xml'] &&
            previousInputContent.body['application/xml']
          ) {
            const checkResult = checkOpenAPIService(
              previousInputContent.body['application/xml']
                .__c as OpenAPIGeneralSchema,
              newOpenAPIServiceInput.body['application/xml']
                .__c as OpenAPIGeneralSchema
            );
            newOpenAPIServiceInput.body['application/xml'].__c =
              checkResult.content;
            if (checkResult.isDifferent) somethingsInInputChanged = true;
          }
          if (
            newOpenAPIServiceInput.body['application/x-www-form-urlencoded'] &&
            previousInputContent.body['application/x-www-form-urlencoded']
          ) {
            const checkResult = checkOpenAPIService(
              previousInputContent.body['application/x-www-form-urlencoded']
                .__c as OpenAPIGeneralSchema,
              newOpenAPIServiceInput.body['application/x-www-form-urlencoded']
                .__c as OpenAPIGeneralSchema
            );
            newOpenAPIServiceInput.body[
              'application/x-www-form-urlencoded'
            ].__c = checkResult.content;
            if (checkResult.isDifferent) somethingsInInputChanged = true;
          }
        }

        if (newOpenAPIServiceInput.headers && previousInputContent.headers) {
          const checkResult = checkOpenAPIService(
            previousInputContent.headers as OpenAPIGeneralSchema,
            newOpenAPIServiceInput.headers as OpenAPIGeneralSchema
          );
          newOpenAPIServiceInput.headers = checkResult.content;
          if (checkResult.isDifferent) somethingsInInputChanged = true;
        }

        if (newOpenAPIServiceInput.paths && previousInputContent.paths) {
          const checkResult = checkOpenAPIService(
            previousInputContent.paths as OpenAPIGeneralSchema,
            newOpenAPIServiceInput.paths as OpenAPIGeneralSchema
          );
          newOpenAPIServiceInput.paths = checkResult.content;
          if (checkResult.isDifferent) somethingsInInputChanged = true;
        }

        if (newOpenAPIServiceInput.queries && previousInputContent.queries) {
          const checkResult = checkOpenAPIService(
            previousInputContent.queries as OpenAPIGeneralSchema,
            newOpenAPIServiceInput.queries as OpenAPIGeneralSchema
          );
          newOpenAPIServiceInput.queries = checkResult.content;
          if (checkResult.isDifferent) somethingsInInputChanged = true;
        }

        let finalInputContent: OpenAPIServiceInput = newOpenAPIServiceInput;
        if (somethingsInInputChanged) {
          this.logger('Some changes in openapi by admin panel detected', type);
          savedAPIService_forInput.result.service_input =
            newOpenAPIServiceInput;
          await this.adminPanelService.updateSingleAPIService(
            savedAPIService_forInput.id as number,
            savedAPIService_forInput.result
          );
        }
        childContent = getChildContent(finalInputContent, keyChains);
        break;

      case 'output':
        let somethingsInOutputChanged = false;
        const savedAPIService_forOutput =
          await this.adminPanelService.getSingleAPIService(
            data.method,
            data.path
          );
        const newOpenAPIServiceOutput =
          this.exportOpenAPIServiceOutputFromOpenAPIPath(
            data.openapi,
            data.path,
            data.method
          );
        if (
          !savedAPIService_forOutput.ok ||
          !savedAPIService_forOutput.result
        ) {
          this.logger('error in fetching saved content');
          /**
           * in case that unpredictable error in fetching data happens, set
           * `childContent` from newly detected fields and break switch
           */
          break;
        }

        const previousContent = savedAPIService_forOutput.result.service_output;

        this.logger('perv => ', JSON.stringify(previousContent));
        this.logger(
          'new pure service input >> ',
          JSON.stringify(newOpenAPIServiceOutput)
        );

        if (
          newOpenAPIServiceOutput['application/json'] &&
          previousContent['application/json']
        ) {
          this.logger('check json');

          if (
            Array.isArray(newOpenAPIServiceOutput['application/json']) &&
            Array.isArray(previousContent['application/json'])
          ) {
            for (const index in newOpenAPIServiceOutput['application/json']) {
              const checkResult = checkOpenAPIService(
                previousContent['application/json'][index]
                  .__c as OpenAPIGeneralSchema,
                newOpenAPIServiceOutput['application/json'][index]
                  .__c as OpenAPIGeneralSchema
              );
              newOpenAPIServiceOutput['application/json'][index].__c =
                checkResult.content;
              this.logger(
                ' -----------------> ',
                JSON.stringify(
                  newOpenAPIServiceOutput['application/json'][index].__c
                )
              );

              if (checkResult.isDifferent) somethingsInOutputChanged = true;
            }
          } else {
            const checkResult = checkOpenAPIService(
              (previousContent['application/json'] as OpenAPISchemaItem)
                .__c as OpenAPIGeneralSchema,
              (newOpenAPIServiceOutput['application/json'] as OpenAPISchemaItem)
                .__c as OpenAPIGeneralSchema
            );
            (
              newOpenAPIServiceOutput['application/json'] as OpenAPISchemaItem
            ).__c = checkResult.content;
            this.logger(
              ' -----------------> ',
              JSON.stringify(
                (
                  newOpenAPIServiceOutput[
                    'application/json'
                  ] as OpenAPISchemaItem
                ).__c
              )
            );

            if (checkResult.isDifferent) somethingsInOutputChanged = true;
          }
        }
        if (
          newOpenAPIServiceOutput['application/xml'] &&
          previousContent['application/xml']
        ) {
          this.logger('check xml');

          if (
            Array.isArray(newOpenAPIServiceOutput['application/xml']) &&
            Array.isArray(previousContent['application/xml'])
          ) {
            for (const index in newOpenAPIServiceOutput['application/xml']) {
              const checkResult = checkOpenAPIService(
                previousContent['application/xml'][index]
                  .__c as OpenAPIGeneralSchema,
                newOpenAPIServiceOutput['application/xml'][index]
                  .__c as OpenAPIGeneralSchema
              );
              newOpenAPIServiceOutput['application/xml'][index].__c =
                checkResult.content;
              this.logger(
                ' -----------------> ',
                JSON.stringify(
                  newOpenAPIServiceOutput['application/xml'][index].__c
                )
              );

              if (checkResult.isDifferent) somethingsInOutputChanged = true;
            }
          } else {
            const checkResult = checkOpenAPIService(
              (previousContent['application/xml'] as OpenAPISchemaItem)
                .__c as OpenAPIGeneralSchema,
              (newOpenAPIServiceOutput['application/xml'] as OpenAPISchemaItem)
                .__c as OpenAPIGeneralSchema
            );
            (
              newOpenAPIServiceOutput['application/xml'] as OpenAPISchemaItem
            ).__c = checkResult.content;
            this.logger(
              ' -----------------> ',
              JSON.stringify(
                (
                  newOpenAPIServiceOutput[
                    'application/xml'
                  ] as OpenAPISchemaItem
                ).__c
              )
            );

            if (checkResult.isDifferent) somethingsInOutputChanged = true;
          }
        }
        if (
          newOpenAPIServiceOutput['application/x-www-form-urlencoded'] &&
          previousContent['application/x-www-form-urlencoded']
        ) {
          this.logger('check form-data');

          if (
            Array.isArray(
              newOpenAPIServiceOutput['application/x-www-form-urlencoded']
            ) &&
            Array.isArray(previousContent['application/x-www-form-urlencoded'])
          ) {
            for (const index in newOpenAPIServiceOutput[
              'application/x-www-form-urlencoded'
            ]) {
              const checkResult = checkOpenAPIService(
                previousContent['application/x-www-form-urlencoded'][index]
                  .__c as OpenAPIGeneralSchema,
                newOpenAPIServiceOutput['application/x-www-form-urlencoded'][
                  index
                ].__c as OpenAPIGeneralSchema
              );
              newOpenAPIServiceOutput['application/x-www-form-urlencoded'][
                index
              ].__c = checkResult.content;
              this.logger(
                ' -----------------> ',
                JSON.stringify(
                  newOpenAPIServiceOutput['application/x-www-form-urlencoded'][
                    index
                  ].__c
                )
              );

              if (checkResult.isDifferent) somethingsInOutputChanged = true;
            }
          } else {
            const checkResult = checkOpenAPIService(
              (
                previousContent[
                  'application/x-www-form-urlencoded'
                ] as OpenAPISchemaItem
              ).__c as OpenAPIGeneralSchema,
              (
                newOpenAPIServiceOutput[
                  'application/x-www-form-urlencoded'
                ] as OpenAPISchemaItem
              ).__c as OpenAPIGeneralSchema
            );
            (
              newOpenAPIServiceOutput[
                'application/x-www-form-urlencoded'
              ] as OpenAPISchemaItem
            ).__c = checkResult.content;
            this.logger(
              ' -----------------> ',
              JSON.stringify(
                (
                  newOpenAPIServiceOutput[
                    'application/x-www-form-urlencoded'
                  ] as OpenAPISchemaItem
                ).__c
              )
            );

            if (checkResult.isDifferent) somethingsInOutputChanged = true;
          }
        }

        let finalContent: OpenAPIServiceOutput = newOpenAPIServiceOutput;
        if (somethingsInOutputChanged) {
          this.logger('Some changes in openapi by admin panel detected', type);
          savedAPIService_forOutput.result.service_output =
            newOpenAPIServiceOutput;

          await this.adminPanelService.updateSingleAPIService(
            savedAPIService_forOutput.id as number,
            savedAPIService_forOutput.result
          );
        }
        childContent = getChildContent(finalContent, keyChains);
        break;
    }

    this.logger('keyChains >>', keyChains);
    this.logger('childContent >>', childContent);

    // TODO: update schema from panel

    // TODO: return required childContent from update trigger

    return {
      ...data.childContent,
      // @ts-ignore
      __c: { ...childContent },
    };
  }

  private logger(...data: any[]) {
    console.log('[ OpenAPI ] >> ', ...data);
  }
}
