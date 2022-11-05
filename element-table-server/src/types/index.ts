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

export type TableElement = {
	/**
     * {{description}}
     */
	name: string;
	/**
     * {{description}}
     */
	appearance: string | null;
	/**
     * {{description}}
     */
	atomic_mass: number;
	/**
     * {{description}}
     */
	boil: number | null;
	/**
     * {{description}}
     */
	category: string;
	/**
     * {{description}}
     */
	density: number | null;
	/**
     * {{description}}
     */
	discovered_by: string | null;
	/**
     * {{description}}
     */
	melt: number | null;
	/**
     * {{description}}
     */
	molar_heat: number | null;
	/**
     * {{description}}
     */
	named_by: string | null;
	/**
     * {{description}}
     */
	number: number;
	/**
     * {{description}}
     */
	period: number;
	/**
     * {{description}}
     */
	phase: string;
	/**
     * {{description}}
     */
	source: string;
	/**
     * {{description}}
     */
	bohr_model_image: string | null;
	/**
     * {{description}}
     */
	bohr_model_3d: string | null;
	/**
     * {{description}}
     */
	spectral_img: string | null;
	/**
     * {{description}}
     */
	summary: string;
	/**
     * {{description}}
     */
	symbol: string;
	/**
     * {{description}}
     */
	xpos: number;
	/**
     * {{description}}
     */
	ypos: number;
	/**
     * {{description}}
     */
	shells: number[];
	/**
     * {{description}}
     */
	electron_configuration: string;
	/**
     * {{description}}
     */
	electron_configuration_semantic: string;
	/**
     * {{description}}
     */
	electron_affinity: number | null;
	/**
     * {{description}}
     */
	electronegativity_pauling: number | null;
	/**
     * {{description}}
     */
	ionization_energies: number[];
	/**
     * {{description}}
     */
	"cpk-hex": string | null;
	/**
     * {{description}}
     */
	image?: ElementImage;
};

export type ElementImage = {
	/**
     * {{description}}
     */
	title: string;
	/**
     * {{description}}
     */
	url: string;
	/**
     * {{description}}
     */
	attribution: string;
};
