import { OpenApiSource } from "../types";

export const openapiConfig = {
	openapi_title: "{{openapi_top_title}}",
	// Todo: should make it automated
	openapi_api_version: "0.1.0",
	openapi_contact: {
		email: "{{openapi_email}}",
		name: "{{openapi_name}}",
		url: "{{openapi_url}}",
	},
	openapi_description: "{{openapi_top_description}}",
	server: {
		url: "http://api.school.edu"
	},
    logo: {
        url: '/docs-logo.jpeg',
        altText: 'School API',
        backgroundColor: '#FFFFFF',
        href: '{{openapi_url}}'
    }
};

export const openapiSourceList: OpenApiSource[] = [
	{
		url: "http://openapi-element-table:1000/assets/swagger.json",
		prefix: "/chemistry",
	},
	{
		url: "http://openapi-basic-math:1000/assets/swagger.json",
		prefix: "/math",
	},
];
