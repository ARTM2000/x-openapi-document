import * as path from "path";
import express, { Application, NextFunction, Request, Response } from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import router from "./router";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded());
app.use(morgan("combined"));
app.use("/assets", express.static(path.join(__dirname, "..", "public")));
app.use("/elements", router);
app.use(
	"/docs",
	swaggerUi.serve,
	swaggerUi.setup(undefined, { swaggerUrl: "/assets/swagger.json" })
);

app.use(
	(
		err: { msg: string; status: number },
		_: Request,
		res: Response,
		__: NextFunction
	) => {
		return res
			.status(err.status)
			.json({ message: err.msg, error: true, result: {} });
	}
);

const PORT: number = +(process.env.PORT as string) || 1000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT} ...`);
});
