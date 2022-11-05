export type GlobalResponse<T> = {
    /**
     * {{description}}
     */
    message: string;
    /**
     * {{description}}
     * @example false
     */
    error: boolean;
    /**
     * {{description}}
     */
    result: T;
}

export type AddBody = {
    /**
     * {{description}}
     */
    numbers: number[];
}

export type DecreaseBody = {
    /**
     * {{description}}
     */
    from: number;
    /**
     * {{description}}
     */
    value: number;
}

export type MultiplyBody = {
    /**
     * {{description}}
     */
    numbers: number[];
}

export type DivideBody = {
    /**
     * {{description}}
     */
    value: number;
    /**
     * {{description}}
     */
    by: number;
}