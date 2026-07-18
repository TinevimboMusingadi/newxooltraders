import { NavLink, useLocation } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useBotDesk } from '../context/BotDeskContext';

/** Floating chip when bot runs off the desk page — return without killing the session */
export default function BotLiveChip() {
  const { running, name } = useBotDesk();
  const location = useLocation();
  if (!running) return null;
  if (location.pathname.startsWith('/bots/run')) return null;

  return (
    <NavLink to="/bots/run" className="bot-live-chip" title="Bot still running — open desk">
      <span className="bot-live-dot" aria-hidden />
      <Bot size={14} />
      <span>{name || 'Bot'} live</span>
    </NavLink>
  );
}
