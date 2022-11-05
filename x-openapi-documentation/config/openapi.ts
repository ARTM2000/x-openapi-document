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
		url: "{protocol}://{environment}.school.edu",
		variables: {
			protocol: {
				enum: ["http", "https"],
				default: "https",
			},
			environment: {
				enum: ["api", "sandbox"],
				default: "api",
			},
		},
	},
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
