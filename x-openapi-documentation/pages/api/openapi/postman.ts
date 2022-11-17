import { NextApiRequest, NextApiResponse } from 'next';
import { openapiConfig } from '../../../config/openapi';
import { OpenAPIExtensions } from '../../../server/openapi-extensions.service';
import { OpenAPIOrganizer } from '../../../server/openapi.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (!openapiConfig.postman.enable) {
    return res.status(404).send('not found');
  }
  const openapiSchema = await new OpenAPIOrganizer().getOpenAPISchema();
  const postmanV2Collection =
    await new OpenAPIExtensions().convertOpenAPIToPostmanV2Collection(
      openapiSchema
    );
  return res.status(200).send(postmanV2Collection);
}
