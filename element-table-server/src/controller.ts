import { Get, Path, Response, Route, Security, Tags } from "tsoa";
import { ElementImage, GlobalResponse, TableElement } from "./types";
import elements from "./elements";

@Route("/elements")
@Tags("شیمی")
export class ElementsController {
	/**
	 * {{description}}
	 */
	@Get("/{elementIndex}")
	@Response<GlobalResponse<{}>>(404, "{{description}}", {
		message: "element not found",
		error: true,
		result: {},
	})
	@Response<GlobalResponse<{}>>(422, "{{description}}", {
		message: "elementIndex is invalid",
		error: true,
		result: {},
	})
	getAnElementByIndex(
		/**
		 * {{description}}
		 */
		@Path("elementIndex") elementIndex: number
	): GlobalResponse<TableElement> {
		if (!elementIndex) {
			throw { msg: "elementIndex is invalid", status: 422 };
		}
		const element = elements[elementIndex - 1];
		if (!element) {
			throw { msg: "element not found", status: 404 };
		}
		delete element.image;
		return {
			message: "Done",
			error: false,
			result: element,
		};
	}

	/**
	 * {{description}}
	 */
	@Get("/{elementIndex}/image")
	@Security("api_key")
	@Response<GlobalResponse<{}>>(404, "{{description}}", {
		message: "element not found",
		error: true,
		result: {},
	})
	@Response<GlobalResponse<{}>>(422, "{{description}}", {
		message: "elementIndex is invalid",
		error: true,
		result: {},
	})
	getImageOfElementByIndex(
		/**
		 * {{description}}
		 */
		@Path("elementIndex") elementIndex: number
	): GlobalResponse<ElementImage> {
		if (!elementIndex) {
			throw { msg: "elementIndex is invalid", status: 422 };
		}
		const element = { ...elements[elementIndex] };
		if (!element) {
			throw { msg: "element not found", status: 404 };
		}
		return {
			message: "Done",
			error: false,
			result: element.image as ElementImage,
		};
	}
}
