import { convert } from 'openapi-to-postmanv2';
// @ts-ignore (because declaration not exist)
import OpenAPISnippet from 'openapi-snippet';
import { Swagger } from 'atlassian-openapi';

enum CODE_LANG {
  c_libcurl = 'c_libcurl',
  csharp_restsharp = 'csharp_restsharp',
  csharp_httpclient = 'csharp_httpclient',
  go_native = 'go_native',
  java_okhttp = 'java_okhttp',
  java_unirest = 'java_unirest',
  javascript_jquery = 'javascript_jquery',
  javascript_xhr = 'javascript_xhr',
  node_native = 'node_native',
  node_request = 'node_request',
  node_unirest = 'node_unirest',
  objc_nsurlsession = 'objc_nsurlsession',
  ocaml_cohttp = 'ocaml_cohttp',
  php_curl = 'php_curl',
  php_http1 = 'php_http1',
  php_http2 = 'php_http2',
  python_python3 = 'python_python3',
  python_requests = 'python_requests',
  ruby_native = 'ruby_native',
  shell_curl = 'shell_curl',
  shell_httpie = 'shell_httpie',
  shell_wget = 'shell_wget',
  swift_nsurlsession = 'swift_nsurlsession',
}

export const CODE_SAMPLE: {
  [key: string]: { key: CODE_LANG; docLang: string };
} = {
  shell_curl: {
    key: CODE_LANG.shell_curl,
    docLang: 'cURL',
  },
  node_native: {
    key: CODE_LANG.node_native,
    docLang: 'Node',
  },
  python_requests: {
    key: CODE_LANG.python_requests,
    docLang: 'Python',
  },
  go_native: {
    key: CODE_LANG.go_native,
    docLang: 'Go',
  },
};

export class OpenAPIExtensions {
  private readonly codeSampleList: {
    key: CODE_LANG;
    docLang: string;
  }[] = [
    CODE_SAMPLE.shell_curl,
    CODE_SAMPLE.node_native,
    CODE_SAMPLE.python_requests,
    CODE_SAMPLE.go_native,
  ];

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
            folderStrategy:
              'Tags' /* if you want to create folders base on paths, change it to `Paths` */,
          },
          (err, result) => {
            if (err) {
              throw err;
            }
            if (!result.result) {
              throw new Error('Conversion FAILED!: ' + result.reason);
            }

            this.logger('openapi to postman > ', result.output);
            resolve(result.output[0].data);
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

  async createCodeSampleFromOpenAPI(
    openapi: Swagger.SwaggerV3,
    path: string,
    method: string
  ): Promise<{
    ok: boolean;
    result?: any;
  }> {
    this.logger('create code sample for', method, path);
    try {
      const result = OpenAPISnippet.getEndpointSnippets(
        openapi,
        path,
        method,
        this.codeSampleList.map((csl) => csl.key)
      );

      return {
        ok: true,
        result,
      };
    } catch (err) {
      this.logger(
        'Error in create code sample > method:',
        method,
        ' path:',
        path,
        err
      );
      return {
        ok: false,
      };
    }
  }
}
