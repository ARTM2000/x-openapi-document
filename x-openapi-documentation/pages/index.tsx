import { RedocStandalone } from "redoc";

export default function Home() {
	return (
		<div>
			<RedocStandalone
				specUrl="/api/openapi"
				options={{
					hideDownloadButton: true,
					requiredPropsFirst: true,
					theme: {},
				}}
			/>
		</div>
	);
}
