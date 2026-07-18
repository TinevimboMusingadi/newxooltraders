export function compileBlocklyXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const block = doc.querySelector('block[type="trade_parameters"]');
  if (!block) {
    return {
      contractType: 'DIGITMATCH',
      amount: 1,
      duration: 1,
      durationUnit: 't',
      symbol: 'R_25',
      prediction: 9,
    };
  }
  const getField = (name, fallback) => block.querySelector(`field[name="${name}"]`)?.textContent || fallback;
  const contract = getField('CONTRACT', 'DIGITMATCH');
  const prediction = Number(getField('PREDICTION', '9'));
  return {
    symbol: getField('SYMBOL', 'R_25'),
    contractType: contract,
    amount: Number(getField('STAKE', getField('WIN_AMOUNT', '1'))),
    duration: Number(getField('DURATION', '1')),
    durationUnit: 't',
    prediction: Number.isFinite(prediction) ? prediction : 9,
    winAmount: Number(getField('WIN_AMOUNT', '1')),
    takeProfit: Number(getField('TAKE_PROFIT', '10000')),
    stopLoss: Number(getField('STOP_LOSS', '1000')),
    martingale: Number(getField('MARTINGALE', '1')),
    tradeKind: contract.startsWith('DIGIT') ? 'digit_match_differ' : undefined,
  };
}

export function strategyToQuickXml(params = {}) {
  const symbol = params.symbol || 'R_25';
  const contract = params.contractType
    || (params.contractSide === 'differ' ? 'DIGITDIFF' : 'DIGITMATCH');
  const stake = params.winAmount ?? params.baseStake ?? params.amount ?? 1;
  const duration = params.durationTicks ?? params.duration ?? 1;
  const prediction = params.prediction ?? 9;
  const tp = params.takeProfit ?? 10000;
  const sl = params.stopLoss ?? 1000;
  const martingale = params.martingale ?? params.multiplier ?? 1;
  return `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="trade_parameters" x="20" y="20">
    <field name="SYMBOL">${symbol}</field>
    <field name="CONTRACT">${contract}</field>
    <field name="DURATION">${duration}</field>
    <field name="STAKE">${stake}</field>
    <field name="WIN_AMOUNT">${params.winAmount ?? stake}</field>
    <field name="PREDICTION">${prediction}</field>
    <field name="TAKE_PROFIT">${tp}</field>
    <field name="STOP_LOSS">${sl}</field>
    <field name="MARTINGALE">${martingale}</field>
  </block>
</xml>`;
}
