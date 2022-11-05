import { OpenApiSource } from "../types";

export const openapiConfig = {
	openapi_title: "School OpenAPI",
	// Todo: should make it automated
	openapi_api_version: "0.1.0",
	openapi_contact: {
		email: "school@example.com",
		name: "Developers School",
		url: "https://my.school.edu",
	},
	openapi_description: "This is school api for doing math and chemistry stuffs",
	server: {
		url: "http://api.school.edu"
	},
    logo: {
        url: '/docs-logo.jpeg',
        backgroundColor: '#FFFFFF',
        altText: 'School API',
        href: 'https://www.google.com'
    }
};

export const openapiSourceList: OpenApiSource[] = [
	{
		url: "http://localhost:1000/assets/swagger.json",
		prefix: "/chemistry",
	},
	{
		url: "http://localhost:1001/assets/swagger.json",
		prefix: "/math",
	},
];
