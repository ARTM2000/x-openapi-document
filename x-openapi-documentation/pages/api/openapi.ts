import { Swagger } from "atlassian-openapi";
import { NextApiRequest, NextApiResponse } from "next";
import { OpenAPIOrganizer } from "../../server/openapi.service";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<string>
) {
	const openapiSchema = await new OpenAPIOrganizer().getOpenAPISchema();
	return res.status(200).send(openapiSchema);
}
