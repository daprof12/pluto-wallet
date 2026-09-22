import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  Shield, 
  UserCheck, 
  Minus, 
  Sparkles,
  Check,
  CheckCheck
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { liveChatService, LiveChatSession, ChatMessage } from '../../utils/liveChatService';

interface UserFloatingChatProps {
  walletData?: any;
}

export default function UserFloatingChat({ walletData }: UserFloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentChat, setCurrentChat] = useState<LiveChatSession | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or load chat
  useEffect(() => {
    if (!walletData?.id) return;

    const chat = liveChatService.getOrCreateUserChat({
      id: walletData.id,
      email: walletData.email,
      username: walletData.username || walletData.fullName,
      phone: walletData.phone
    });
    setCurrentChat(chat);

    const handleUpdate = (e: any) => {
      const chats = e.detail?.chats || liveChatService.getLiveChats();
      const updated = chats.find((c: any) => c.userId === walletData.id);
      if (updated) {
        setCurrentChat(updated);
      }
    };

    window.addEventListener('pluto_live_chats_updated', handleUpdate);

    // Periodic check to ensure unread message counts stay fresh across tabs
    const interval = setInterval(() => {
      const chats = liveChatService.getLiveChats();
      const updated = chats.find((c: any) => c.userId === walletData.id);
      if (updated) {
        setCurrentChat(prev => {
          if (!prev || prev.unreadCountUser !== updated.unreadCountUser || prev.messages.length !== updated.messages.length) {
            return updated;
          }
          return prev;
        });
      }
    }, 1500);

    return () => {
      window.removeEventListener('pluto_live_chats_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [walletData?.id]);

  // Scroll to bottom and clear unread count when chat is opened
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (currentChat?.id && (currentChat.unreadCountUser || 0) > 0) {
        liveChatService.markRead(currentChat.id, 'user');
        setCurrentChat(prev => prev ? { ...prev, unreadCountUser: 0 } : null);
      }
    }
  }, [isOpen, currentChat?.messages]);

  if (!walletData?.id) return null;

  const handleSendMessage = async (textOverride?: string) => {
    const text = (textOverride || messageText).trim();
    if (!text || !currentChat || isSending) return;

    setMessageText('');
    setIsSending(true);

    try {
      const { chat } = await liveChatService.sendMessage({
        chatId: currentChat.id,
        message: text,
        sender: 'user',
        senderName: walletData.username || walletData.fullName || 'User'
      });
      setCurrentChat(chat);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleEscalateToHuman = () => {
    handleSendMessage('I would like to speak with a human support agent, please.');
  };

  const handleToggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && currentChat?.id) {
      liveChatService.markRead(currentChat.id, 'user');
      setCurrentChat(prev => prev ? { ...prev, unreadCountUser: 0 } : null);
    }
  };

  const unreadCount = (!isOpen && currentChat?.unreadCountUser) ? currentChat.unreadCountUser : 0;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-5 z-50 flex flex-col items-end">
      {/* Expanded Chat Box */}
      {isOpen && currentChat && (
        <div 
          className="mb-3 w-[92vw] sm:w-[400px] h-[540px] max-h-[82vh] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                  {currentChat.needsHuman || currentChat.assignedAgent ? (
                    <Shield className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-purple-700 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-wide text-white">
                    {currentChat.assignedAgent
                      ? `Agent ${currentChat.assignedAgent}`
                      : currentChat.needsHuman
                      ? 'Live Support Agent (Alerted)'
                      : 'Pluto AI Assistant'}
                  </h3>
                </div>
                <p className="text-[11px] text-purple-100/80">
                  {currentChat.needsHuman
                    ? 'Transferring to human support...'
                    : 'Online • Instant Crypto Answers'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {!currentChat.needsHuman && !currentChat.assignedAgent && (
                <button
                  onClick={handleEscalateToHuman}
                  title="Request human support agent"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-xs flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Human</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Sub-Banner */}
          {currentChat.needsHuman && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>An administrative specialist has been notified and will take over shortly.</span>
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-gray-900/40">
            {currentChat.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isBot = msg.sender === 'bot';
              const isAdmin = msg.sender === 'admin';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {isBot && <Bot className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
                    {isAdmin && <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      {isUser ? 'You' : isBot ? 'Pluto AI Bot' : (msg.senderName || 'Support Team')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-2xl max-w-[85%] text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-purple-600 text-white rounded-br-sm shadow-sm'
                        : msg.is_escalation
                        ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-bl-sm'
                        : isAdmin
                        ? 'bg-blue-600 text-white rounded-bl-sm shadow-sm'
                        : 'bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Suggestions */}
          <div className="px-3 py-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/60 flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <button
              onClick={() => handleSendMessage('How do I deposit and what is the gas fee?')}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 transition-colors"
            >
              📥 Deposit & Gas Fee
            </button>
            <button
              onClick={() => handleSendMessage('What are withdrawal processing fees?')}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 transition-colors"
            >
              📤 Withdrawal
            </button>
            <button
              onClick={() => handleSendMessage('How do I complete KYC verification?')}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 transition-colors"
            >
              🪪 KYC
            </button>
            <button
              onClick={handleEscalateToHuman}
              className="shrink-0 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
            >
              🙋 Human Agent
            </button>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Ask anything (or 'human' for agent)..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="h-10 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/40 border-gray-200 dark:border-gray-700 rounded-xl"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!messageText.trim() || isSending}
              className="h-10 px-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={handleToggleOpen}
        className="group relative w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center focus:outline-none"
        aria-label="Open Live Chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-7 h-7" />
        )}

        {/* Unread Count Badge for New Messages */}
        {!isOpen && unreadCount > 0 && (
          <span 
            className="absolute -top-1.5 -right-1.5 min-w-[24px] h-[24px] px-1.5 bg-red-600 text-white text-xs font-black rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-xl ring-2 ring-red-400/50 animate-bounce"
            style={{ zIndex: 10 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Floating tooltip when closed */}
        {!isOpen && (
          <span className="absolute right-16 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden sm:block">
            {unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''} • Live Chat` : 'Need Help? Chat with Pluto AI'}
          </span>
        )}
      </button>
    </div>
  );
}
