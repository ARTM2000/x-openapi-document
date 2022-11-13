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
	service_input: OpenAPIServiceInput; // json
	service_output: any; // json
};

export interface OpenAPIServiceInput {
	paths: any;
	queries: any;
	body: {
		// "application/json"?: OpenAPIInputBodyItem;
		// "application/xml"?: OpenAPIInputBodyItem;
		// "application/x-www-form-urlencoded"?: OpenAPIInputBodyItem;
		[key: string]: OpenAPIInputBodyItem;
	};
}

export type OpenAPIInputBodyItem = {
	description: string;
	__children?: { [key: string]: OpenAPIInputBodyItem };
};
