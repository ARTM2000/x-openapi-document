export type GlobalResponse<T> = {
	message: string;
	/**
	 * @example false
	 */
	error: boolean;
	result: T;
};

export type AddBody = {
	numbers: {
		value: number;
	}[];
};

export type DecreaseBody = {
	from: {
		value: number;
		test_data: {
			data: string;
		};
		test_data2: {
			data: string[];
		};
		test_data3: {
			data: {
				name: string;
			}[];
		};
	};

	value: {
		value: number;
	};
};

export type MultiplyBody = {
	numbers: number[];
	flag: string;
};

export type DivideBody = {
	value: number;
	by: number;
};
