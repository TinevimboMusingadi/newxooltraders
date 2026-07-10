import { useEffect, useRef, useState } from 'react';
import { Save, FolderOpen, Play, Undo, Redo, Grid3x3, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { compileBlocklyXml } from '../lib/blockCompiler';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { useTradingFooter } from '../context/TradingFooterContext';
import { useTradeSession } from '../context/TradeSessionContext';
import { useAuth } from '../hooks/useAuth';
import WorkspacePageHeader from '../components/WorkspacePageHeader';

const QUICK_STRATEGY = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="trade_parameters" x="20" y="20">
    <field name="SYMBOL">R_100</field>
    <field name="CONTRACT">CALL</field>
    <field name="DURATION">5</field>
    <field name="STAKE">1</field>
  </block>
</xml>`;

export default function Builder() {
  const blocklyDiv = useRef(null);
  const workspaceRef = useRef(null);
  const blocklyRef = useRef(null);
  const [strategies, setStrategies] = useState([]);
  const [name, setName] = useState('My strategy');
  const { selectedSymbol } = useMarket();
  const { connected, getProposal, buyContract } = useTradingWs();
  const { setRunHandler, clearRunHandler } = useTradingFooter();
  const { recordTrade } = useTradeSession();
  const { user } = useAuth();
  const account = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);

  useEffect(() => {
    let workspace;
    (async () => {
      const Blockly = await import('blockly');
      await import('blockly/blocks');
      const { defineTradingBlocks, registerTradingGenerators } = await import('../lib/blocklyBlocks');
      defineTradingBlocks(Blockly);
      registerTradingGenerators(Blockly);
      blocklyRef.current = Blockly;

      workspace = Blockly.inject(blocklyDiv.current, {
        toolbox: {
          kind: 'categoryToolbox',
          contents: [
            { kind: 'category', name: 'Trade parameters', colour: '#7c5cff', contents: [{ kind: 'block', type: 'trade_parameters' }] },
            { kind: 'category', name: 'Purchase', colour: '#22c55e', contents: [{ kind: 'block', type: 'purchase_condition' }] },
            { kind: 'category', name: 'Analysis', colour: '#f59e0b', contents: [{ kind: 'block', type: 'digit_even_check' }] },
          ],
        },
        grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
        zoom: { controls: true, wheel: true },
      });
      workspaceRef.current = workspace;
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(QUICK_STRATEGY), workspace);
    })();

    api.getBotStrategies?.().then((d) => setStrategies(d.strategies || [])).catch(() => {});

    return () => workspace?.dispose?.();
  }, []);

  const undo = () => workspaceRef.current?.undo?.(false);
  const redo = () => workspaceRef.current?.undo?.(true);
  const zoomIn = () => workspaceRef.current?.zoomCenter?.(1);
  const zoomOut = () => workspaceRef.current?.zoomCenter?.(-1);

  const save = async () => {
    const Blockly = blocklyRef.current || await import('blockly');
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current));
    await api.saveBotStrategy({ name, symbol: selectedSymbol, xml });
    toast.success('Strategy saved');
  };

  const loadQuick = async () => {
    const Blockly = blocklyRef.current || await import('blockly');
    workspaceRef.current.clear();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(QUICK_STRATEGY), workspaceRef.current);
  };

  const run = async () => {
    if (!connected) return;
    const Blockly = blocklyRef.current || await import('blockly');
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current));
    const strategy = compileBlocklyXml(xml);
    const proposal = await getProposal({
      ...strategy,
      symbol: strategy.symbol || selectedSymbol,
      currency: account?.currency || 'USD',
    });
    const id = proposal.proposal?.id;
    const price = proposal.proposal?.ask_price;
    if (!id || price == null) throw new Error('No proposal');
    await buyContract(String(id), price);
    recordTrade({
      message: 'Contract bought',
      type: 'builder',
      symbol: strategy.symbol || selectedSymbol,
      contractType: strategy.contractType,
      contractId: null,
      buyPrice: price,
      status: 'open',
    });
    toast.success('Strategy executed');
  };

  useEffect(() => {
    setRunHandler(run, 'Run');
    return () => clearRunHandler();
  }, [connected, selectedSymbol, account]);

  return (
    <div className="builder-page">
      <WorkspacePageHeader
        title="Bot Builder"
        subtitle="Visual Blockly strategies — trade_parameters drive execution; digit blocks are experimental."
      />

      <div className="builder-toolbar card">
        <button type="button" className="btn btn-primary btn-sm" onClick={loadQuick}>Quick Strategy</button>
        <input value={name} onChange={(e) => setName(e.target.value)} className="trade-input builder-name" placeholder="Strategy name" />
        <button type="button" className="btn btn-secondary btn-sm" onClick={save}><Save size={14} /> Save</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={run} disabled={!connected}><Play size={14} /> Run</button>
      </div>

      <div className="builder-workspace card">
        <div className="builder-canvas-toolbar">
          <button type="button" className="builder-tool-btn" onClick={undo} title="Undo"><Undo size={16} /></button>
          <button type="button" className="builder-tool-btn" onClick={redo} title="Redo"><Redo size={16} /></button>
          <span className="builder-tool-sep"><Grid3x3 size={16} /></span>
          <button type="button" className="builder-tool-btn" onClick={zoomIn} title="Zoom in"><ZoomIn size={16} /></button>
          <button type="button" className="builder-tool-btn" onClick={zoomOut} title="Zoom out"><ZoomOut size={16} /></button>
          <button type="button" className="builder-tool-btn" onClick={loadQuick} title="Load template"><FolderOpen size={16} /></button>
        </div>
        <div ref={blocklyDiv} className="blockly-mount" />
      </div>

      {strategies.length > 0 && (
        <div className="card builder-saved">
          <h3 className="heading-md">Saved strategies</h3>
          <ul>{strategies.map((s) => <li key={s.id}>{s.name}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
