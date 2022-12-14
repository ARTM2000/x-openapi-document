import { OpenApiSource } from '../types';

export const openapiConfig = {
  logo: {
    url: '/docs-logo.jpeg',
    backgroundColor: '#FFFFFF',
  },
  postman: {
    enable: true,
    title: 'Postman',
    filename: 'smart-school.postman-collection',
    linkText: 'دانلود کالکشن پست من',
  },
  codeSample: {
    enable: true,
  }
};

export const openapiSourceList: OpenApiSource[] = [
  {
    url: 'http://openapi-element-table:1000/assets/swagger.json',
    prefix: '/chemistry',
  },
  {
    url: 'http://openapi-basic-math:1000/assets/swagger.json',
    prefix: '/math',
  }
];

/**
 * [more info for redocly and securitySchemes](https://redocly.com/docs/openapi-visual-reference/security-schemes/)
 * [for OAuth2 see this link](https://redocly.com/docs/openapi-visual-reference/oauth-flows/)
 */
export const openapiSecuritySchemes: {
  [key: string]: {
    type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
    name: string;
    in: 'query' | 'header' | 'cookie';
    scheme?: any;
  };
} = {
  api_key: {
    type: 'apiKey',
    name: 'authorization',
    in: 'header',
  },
  Authorization: {
    type: 'http',
    name: 'authorization',
    in: 'header',
    scheme: 'basic',
  },
};
