// Brutalist chart constants
export const CHART_RADIUS = 0;
export const CHART_STROKE_WIDTH = 2;
export const CHART_DOT = false;
export const BRAND_RED = '#e63946';
export const GRID_COLOR = '#333';
export const AXIS_COLOR = '#666';
export const TOOLTIP_BG = '#141414';
export const TOOLTIP_BORDER = '#333';

// Common axis tick style
export const axisTickStyle = {
  fill: AXIS_COLOR,
  fontSize: 12,
  fontFamily: 'Space Grotesk, sans-serif',
};

// Common tooltip content style (matches brutalist Card design)
export const tooltipContentStyle = {
  backgroundColor: TOOLTIP_BG,
  border: `2px solid ${TOOLTIP_BORDER}`,
  borderRadius: 0,
  boxShadow: '6px 6px 0 #000',
  padding: '8px 12px',
};

export const tooltipLabelStyle = {
  color: '#fff',
  fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 4,
};

export const tooltipItemStyle = {
  color: '#ccc',
  fontSize: 12,
};

// Gradient definitions helper — returns a unique gradient ID
export function gradientId(prefix: string): string {
  return `${prefix}-grad`;
}
