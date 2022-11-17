import { Swagger } from 'atlassian-openapi';
import { convert } from 'openapi-to-postmanv2';

export class OpenAPIExtensions {
  constructor() {}

  private logger(...data: any[]): void {
    console.log('[ OpenAPIExtensions ] >> ', ...data);
  }

  async convertOpenAPIToPostmanV2Collection(openapi: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        convert(
          { type: 'string', data: openapi },
          {
            requestNameSource: 'URL',
            requestParametersResolution:
              'Schema' /* if you want to create request parameter base on request example, change it to `Example` */,
            folderStrategy: 'Tags' /* if you want to create folders base on paths, change it to `Paths` */,
          },
          (err, result) => {
            if (err) {
              throw err;
            }
            if (!result.result) {
              throw new Error('Conversion FAILED!: ' + result.reason)
            }

            this.logger('openapi to postman > ', result.output)
            resolve(result.output[0].data)
          }
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
