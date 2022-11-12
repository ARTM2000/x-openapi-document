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

export type OpenAPIServiceInput = {
	paths: any;
	queries: any;
	body: any;
};
