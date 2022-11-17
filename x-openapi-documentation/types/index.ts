export type OpenApiSource = {
	url: string;
	prefix: string;
};

export type OpenAPIIntroduction = {
	company_name: string;
	company_email: string;
	service_title: string;
	company_site: string;
	description: string;
	service_version: string;
	service_baseurl: string;
};

export type OpenAPIService = {
	identifier: string;
	title: string;
	description: string;
	public: boolean;
	response_description: string;
	service_input: OpenAPIServiceInput; // json
	service_output: OpenAPIServiceOutput; // json
};

export type OpenAPIServiceInput = {
	/** for example
	// paths: {
	// 	[key: string]: { description: string };
	// };
	// queries: {
	// 	[key: string]: { description: string };
	// };
	// body: {
	// 	// "application/json"?: OpenAPISchemaItem;
	// 	// "application/xml"?: OpenAPISchemaItem;
	// 	// "application/x-www-form-urlencoded"?: OpenAPISchemaItem;
	// 	[key: string]: OpenAPISchemaItem;
	// };
	*/
	[key: string]: OpenAPIGeneralSchema;
};

export type OpenAPIServiceOutput = {
	// "application/json"?: OpenAPISchemaItem;
	// "application/xml"?: OpenAPISchemaItem
	[key: string]: OpenAPISchemaItem | OpenAPISchemaItem[];
};

export type OpenAPISchemaItem = {
	description: string;
	__c?: OpenAPIGeneralSchema;
};

export type OpenAPIGeneralSchema = {
	[key: string]: OpenAPISchemaItem;
}
