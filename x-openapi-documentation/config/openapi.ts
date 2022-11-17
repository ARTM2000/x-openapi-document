import { OpenApiSource } from "../types";

export const openapiConfig = {
	logo: {
		url: "/docs-logo.jpeg",
		backgroundColor: "#FFFFFF",
	},
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
	{
		url: "https://auth.staging.finnotech.ir/dezhbaan-swagger-json",
		prefix: "/auth"
	}
];
