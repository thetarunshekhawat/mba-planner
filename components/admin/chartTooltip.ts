/**
 * One tooltip skin for every recharts chart in the admin dashboard.
 *
 * recharts leaves the label and item text at their default near-black, which is
 * invisible on this dark surface — the panel was styled with `contentStyle`
 * alone and read as an empty black box on hover. Both text colors have to be
 * set explicitly, so they live here rather than being retyped per chart.
 */
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    fontSize: '12px',
  },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
};

/** Hover band behind a bar. Recharts' default is a translucent white wash that
 *  hides the bar it is meant to highlight. */
export const CHART_TOOLTIP_CURSOR = { fill: 'rgba(148, 163, 184, 0.12)' };
