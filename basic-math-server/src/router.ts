import { Router } from "express";
import { MathController } from "./controller";

const router = Router();
const mathController = new MathController();

router.post('/plus', (req, res, next) => {
    try {
        const response = mathController.add(req.body);
        return res.status(200).json(response);
    } catch (err) {
        next(err)
    }
})

router.post('/minus', (req, res, next) => {
    try {
        const response = mathController.decrease(req.body);
        return res.status(200).json(response);
    } catch (err) {
        next(err)
    }
})

router.post('/multiply', (req, res, next) => {
    try {
        const response = mathController.multiply(req.body);
        return res.status(200).json(response);
    } catch (err) {
        next(err)
    }
})

router.post('/divide', (req, res, next) => {
    try {
        const response = mathController.divide(req.body);
        return res.status(200).json(response);
    } catch (err) {
        next(err)
    }
})

export default router;