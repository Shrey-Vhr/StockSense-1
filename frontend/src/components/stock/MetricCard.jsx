import MetricTile from '../ui/MetricTile';

/**
 * A fundamental metric with a good/bad threshold — P/E under 20, ROE over 15,
 * and so on. Lifted out of StockDetail unchanged in behaviour; the value
 * formatting and the goodAbove/goodBelow comparison are the original logic.
 *
 * The colour now comes from the up/down tokens rather than the raw #00c853 /
 * #ff1744 pair, which existed nowhere else in the app.
 */
const MetricCard = ({ label, value, format, goodAbove, goodBelow }) => {
  let displayValue = 'N/A';
  let tone = 'default';

  if (value !== null && value !== undefined) {
    if (format === 'percent') {
      displayValue = `${parseFloat(value).toFixed(2)}%`;
    } else if (format === 'ratio') {
      displayValue = `${parseFloat(value).toFixed(2)}x`;
    } else {
      displayValue = String(value);
    }

    let isGood = null;
    if (goodAbove !== undefined) {
      isGood = value >= goodAbove;
    } else if (goodBelow !== undefined) {
      isGood = value <= goodBelow;
    }

    if (isGood === true) tone = 'up';
    else if (isGood === false) tone = 'down';
  }

  return (
    <MetricTile
      label={label}
      value={displayValue}
      tone={tone}
      size="sm"
      align="center"
      className="font-mono"
    />
  );
};

export default MetricCard;
