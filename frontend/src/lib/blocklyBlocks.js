export function defineTradingBlocks(Blockly) {
  Blockly.Blocks.trade_parameters = {
    init() {
      this.appendDummyInput()
        .appendField('Trade parameters')
        .appendField('Symbol')
        .appendField(new Blockly.FieldTextInput('R_100'), 'SYMBOL')
        .appendField('Contract')
        .appendField(new Blockly.FieldDropdown([
          ['Rise', 'CALL'],
          ['Fall', 'PUT'],
          ['Even', 'DIGITEVEN'],
          ['Odd', 'DIGITODD'],
        ]), 'CONTRACT')
        .appendField('Duration (ticks)')
        .appendField(new Blockly.FieldNumber(5, 1, 10), 'DURATION')
        .appendField('Stake')
        .appendField(new Blockly.FieldNumber(1, 0.35, 1000), 'STAKE');
      this.setColour('#7c5cff');
      this.setTooltip('Configure market, contract type, duration and stake.');
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
}
