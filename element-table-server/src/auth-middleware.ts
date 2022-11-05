import { NextFunction, Request, Response } from "express";

export function expressAuthentication(
	securityName: string,
	scopes?: string[]
) {
	return (req: Request, _: Response, next: NextFunction) => {
		if (securityName !== "api_key") {
			return next({ msg: "unauthorized", status: 401 });
		}
        if (!req.headers.authorization) {
            return next({ msg: "unauthorized", status: 401 });
        }
        if (req.headers.authorization !== "salam-khoobi-khoobam") {
            return next({ msg: "unauthorized", status: 401 });
        }
        next()
	};
}
