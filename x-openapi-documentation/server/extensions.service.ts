import { Swagger } from 'atlassian-openapi';
import { convert } from 'openapi-to-postmanv2';

export class OpenAPIExtensions {
  constructor() {}

  private logger(...data: any[]): void {
    console.log('[ OpenAPIExtensions ] >> ', ...data);
  }

  async convertOpenAPIToPostmanV2Collection(openapi: Swagger.SwaggerV3) {
    return new Promise((resolve, reject) => {
      try {
        convert(
          { type: 'json', data: JSON.stringify(openapi) },
          {
            requestNameSource: 'URL',
            requestParametersResolution:
              'Schema' /* if you want to create request parameter base on request example, change it to `Example` */,
            folderStrategy: 'Tags' /* if you want to create folders base on paths, change it to `Paths` */,
          },
          (err, result) => {}
        );
      } catch (err) {
        this.logger(
          'Error in conversion of OpenAPI to PostmanV2-Collection: ',
          err
        );
        reject(err);
      }
    });
  }
}
