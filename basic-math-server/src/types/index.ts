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
};

export type AddBody = {
	/**
	 * {{description}}
	 */
	numbers: {
		/**
		 * {{description}}
		 */
		value: number;
	}[];
};

export type DecreaseBody = {
	/**
	 * {{description}}
	 */
	from: {
		/**
		 * {{description}}
		 */
		value: number;
		/**
		 * {{description}}
		 */
		test_data: {
			/**
			 * {{description}}
			 */
			data: string;
		};
		/**
		 * {{description}}
		 */
		test_data2: {
			/**
			 * {{description}}
			 */
			data: string[];
		};
		/**
		 * {{description}}
		 */
		test_data3: {
			/**
			 * {{description}}
			 */
			data: {
				/**
				 * {{description}}
				 */
				name: string;
			}[];
		};
	};
	/**
	 * {{description}}
	 */
	value: {
		/**
		 * {{description}}
		 */
		value: number;
	};
};

export type MultiplyBody = {
	/**
	 * {{description}}
	 */
	numbers: number[];
};

export type DivideBody = {
	/**
	 * {{description}}
	 */
	value: number;
	/**
	 * {{description}}
	 */
	by: number;
};
