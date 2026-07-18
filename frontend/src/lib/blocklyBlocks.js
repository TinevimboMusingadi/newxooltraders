export function defineTradingBlocks(Blockly) {
  Blockly.Blocks.trade_parameters = {
    init() {
      this.appendDummyInput()
        .appendField('Trade parameters')
        .appendField('Symbol')
        .appendField(new Blockly.FieldTextInput('R_25'), 'SYMBOL')
        .appendField('Contract')
        .appendField(new Blockly.FieldDropdown([
          ['Match', 'DIGITMATCH'],
          ['Differ', 'DIGITDIFF'],
          ['Rise', 'CALL'],
          ['Fall', 'PUT'],
          ['Even', 'DIGITEVEN'],
          ['Odd', 'DIGITODD'],
        ]), 'CONTRACT');
      this.appendDummyInput()
        .appendField('Duration (ticks)')
        .appendField(new Blockly.FieldNumber(1, 1, 10), 'DURATION')
        .appendField('Stake')
        .appendField(new Blockly.FieldNumber(1, 0.35, 1000), 'STAKE');
      this.appendDummyInput()
        .appendField('Win amount')
        .appendField(new Blockly.FieldNumber(1, 0.35, 10000), 'WIN_AMOUNT')
        .appendField('prediction')
        .appendField(new Blockly.FieldNumber(9, 0, 9), 'PREDICTION');
      this.appendDummyInput()
        .appendField('Take profit')
        .appendField(new Blockly.FieldNumber(10000, 0), 'TAKE_PROFIT')
        .appendField('stop loss')
        .appendField(new Blockly.FieldNumber(1000, 0), 'STOP_LOSS')
        .appendField('Martingale')
        .appendField(new Blockly.FieldNumber(1, 1, 10), 'MARTINGALE');
      this.setColour('#7c5cff');
      this.setTooltip('Exact bot parameters: market, digits, stake, prediction, TP/SL, martingale.');
    },
  };

  Blockly.Blocks.purchase_condition = {
    init() {
      this.appendDummyInput().appendField('Purchase when signal ready');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('#22c55e');
    },
  };

  Blockly.Blocks.digit_even_check = {
    init() {
      this.appendDummyInput()
        .appendField('Even digit % >=')
        .appendField(new Blockly.FieldNumber(50, 0, 100), 'THRESHOLD');
      this.setOutput(true, 'Boolean');
      this.setColour('#f59e0b');
    },
  };
}

export function registerTradingGenerators(Blockly) {
  /* Runtime uses compileBlocklyXml — generators optional for MVP */
  void Blockly;
}
