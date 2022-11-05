import { Body, Post, Route, Tags } from "tsoa";
import {
	GlobalResponse,
	AddBody,
	DecreaseBody,
	MultiplyBody,
	DivideBody,
} from "./types";

@Route("/basic")
@Tags("Math")
export class MathController {
	@Post("/plus")
	add(@Body() body: AddBody): GlobalResponse<number> {
		let result = 0;
		for (const n of body.numbers) {
			result += n;
		}
		return {
			message: "Done",
			error: false,
			result: result,
		};
	}

	@Post("/minus")
	decrease(@Body() body: DecreaseBody): GlobalResponse<number> {
		const result = body.from - body.value;
		return {
			message: "Done",
			error: false,
			result: result,
		};
	}

	@Post('/multiply')
	multiply(@Body() body: MultiplyBody): GlobalResponse<number> {
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

	@Post('/divide')
	divide(@Body() body: DivideBody): GlobalResponse<number> {
		const result = body.value / body.by;
		return {
			message: "Done",
			error: false,
			result: result,
		};
	}
}
