export function compileBlocklyXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const block = doc.querySelector('block[type="trade_parameters"]');
  if (!block) {
    return { contractType: 'CALL', amount: 1, duration: 5, durationUnit: 't', symbol: 'R_100' };
  }
  const getField = (name, fallback) => block.querySelector(`field[name="${name}"]`)?.textContent || fallback;
  return {
    symbol: getField('SYMBOL', 'R_100'),
    contractType: getField('CONTRACT', 'CALL'),
    amount: Number(getField('STAKE', '1')),
    duration: Number(getField('DURATION', '5')),
    durationUnit: 't',
  };
}
