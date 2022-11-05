import { RedocStandalone } from "redoc";

export default function Home() {
	return (
		<div>
			<RedocStandalone
				specUrl="/api/openapi"
        // specUrl="http://petstore.swagger.io/v2/swagger.json"
				options={{
					hideDownloadButton: true,
					requiredPropsFirst: true,
					theme: {},
				}}
			/>
		</div>
	);
}
