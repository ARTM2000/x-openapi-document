export const env = (name: string, throwIfNotExist?: boolean): string => {
	const value = process.env[name] as string;
	if (throwIfNotExist && !value) {
		throw new Error(`Environment variable ${name} IS NOT DEFINED!!`);
	}
	return value;
};
