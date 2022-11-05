export type GlobalResponse<T> = {
    message: string;
    error: boolean;
    result: T;
}

export type AddBody = {
    numbers: number[];
}

export type DecreaseBody = {
    from: number;
    value: number;
}

export type MultiplyBody = {
    numbers: number[];
}

export type DivideBody = {
    value: number;
    by: number;
}