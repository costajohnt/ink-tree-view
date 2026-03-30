import {type BoxProps, type TextProps} from 'ink';

type StyleFnProps = {
	isFocused?: boolean;
	isExpanded?: boolean;
	isSelected?: boolean;
	depth?: number;
	hasChildren?: boolean;
	isLoading?: boolean;
};

const theme = {
	styles: {
		container: (): BoxProps => ({
			flexDirection: 'column' as const,
		}),
		node: ({isFocused}: StyleFnProps): BoxProps => ({
			gap: 1,
			paddingLeft: isFocused ? 0 : 2,
		}),
		indent: ({depth}: StyleFnProps): BoxProps => ({
			width: (depth ?? 0) * 2,
		}),
		focusIndicator: (): TextProps => ({
			color: 'blue',
		}),
		expandIndicator: (_props: StyleFnProps): TextProps => ({
			color: 'gray',
		}),
		label: ({isFocused, isSelected}: StyleFnProps): TextProps => {
			let color: string | undefined;
			if (isSelected) color = 'green';
			if (isFocused) color = 'blue';
			return {color};
		},
		selectedIndicator: (): TextProps => ({
			color: 'green',
		}),
		loadingIndicator: (): TextProps => ({
			color: 'yellow',
		}),
	},
};

export default theme;
export type Theme = typeof theme;
