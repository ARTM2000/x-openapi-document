import { Body, Post, Route, Tags } from "tsoa";
import {
	GlobalResponse,
	AddBody,
	DecreaseBody,
	MultiplyBody,
	DivideBody,
} from "./types";

@Route("/basic")
@Tags("ریاضی")
export class MathController {
	/**
	 * {{description}}
	 */
	@Post("/plus")
	add(
		/**
		 * {{description}}
		 */
		@Body() body: AddBody
	): GlobalResponse<number> {
		let result = 0;
		for (const n of body.numbers) {
			result += n.value;
		}
		return {
			message: "Done",
			error: false,
			result: result,
		};
	}

	/**
	 * {{description}}
	 */
	@Post("/minus")
	decrease(
		/**
		 * {{description}}
		 */
		@Body() body: DecreaseBody
	): GlobalResponse<number> {
		const result = body.from.value - body.value.value;
		return {
			message: "Done",
			error: false,
			result: result,
		};
	}

	/**
	 * {{description}}
	 */
	@Post("/multiply")
	multiply(
		/**
		 * {{description}}
		 */
		@Body() body: MultiplyBody
	): GlobalResponse<number> {
		let result = 1;
		for (const n of body.numbers) {
			result *= n;
		}
		return {
			message: "Done",
			error: false,
			result: result,
		};
	}

	/**
	 * {{description}}
	 */
	@Post("/divide")
	divide(
		/**
		 * {{description}}
		 */
		@Body() body: DivideBody
	): GlobalResponse<number> {
		const result = body.value / body.by;
		return {
			message: "Done",
			error: false,
			result: result,
		};
	}
}
