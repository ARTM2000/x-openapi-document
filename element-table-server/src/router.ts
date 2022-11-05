import { Router } from "express";
import { expressAuthentication } from "./auth-middleware";
import { ElementsController } from "./controller";

const router = Router();
const elementController = new ElementsController();

router.get("/:elementIndex", (req, res, next) => {
	try {
		const response = elementController.getAnElementByIndex(
			+req.params.elementIndex
		);
        return res.status(200).json(response);
	} catch (error) {
		next(error);
	}
});

router.get("/:elementIndex/image", expressAuthentication('api_key'), (req, res, next) => {
	try {
		const response = elementController.getImageOfElementByIndex(
			+req.params.elementIndex
		);
        return res.status(200).json(response);
	} catch (error) {
		next(error);
	}
});

export default router;
