import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  MessageCircle, 
  Send, 
  Bot, 
  Shield, 
  UserCheck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  Phone, 
  Sparkles, 
  RefreshCw, 
  MoreVertical,
  Check,
  CheckCheck,
  Zap,
  Filter,
  Info
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { liveChatService, LiveChatSession, ChatMessage } from '../../utils/liveChatService';
import { AdminUser } from '../../utils/adminUserService';

interface AdminLiveChatViewProps {
  users?: any[];
  currentAdmin?: AdminUser | null;
}

export default function AdminLiveChatView({ users = [], currentAdmin }: AdminLiveChatViewProps) {
  const [chats, setChats] = useState<LiveChatSession[]>(() => liveChatService.getLiveChats());
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'needs_human' | 'bot' | 'admin' | 'resolved'>('all');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats on mount and sync from cloud
  const refreshChats = async () => {
    try {
      const refreshed = await liveChatService.syncFromCloud();
      setChats(refreshed);
    } catch (e) {
      console.warn('Failed to sync live chats:', e);
    }
  };

  useEffect(() => {
    refreshChats();

    const handleUpdate = (e: any) => {
      const updated = e.detail?.chats || liveChatService.getLiveChats();
      setChats(updated);
    };

    window.addEventListener('pluto_live_chats_updated', handleUpdate);
    return () => window.removeEventListener('pluto_live_chats_updated', handleUpdate);
  }, []);

  // Filter chats by search query and filter tabs
  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        chat.userName.toLowerCase().includes(q) ||
        chat.userEmail.toLowerCase().includes(q) ||
        chat.userId.toLowerCase().includes(q) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(q));

      // Filter tabs
      let matchesFilter = true;
      if (filterMode === 'needs_human') {
        matchesFilter = !!chat.needsHuman || chat.status === 'escalated';
      } else if (filterMode === 'bot') {
        matchesFilter = chat.botEnabled && !chat.needsHuman && chat.status !== 'resolved';
      } else if (filterMode === 'admin') {
        matchesFilter = !chat.botEnabled && chat.status !== 'resolved';
      } else if (filterMode === 'resolved') {
        matchesFilter = chat.status === 'resolved';
      }

      return matchesSearch && matchesFilter;
    });
  }, [chats, searchQuery, filterMode]);

  // Selected chat object
  const activeChat = useMemo(() => {
    return chats.find(c => c.id === selectedChatId) || null;
  }, [chats, selectedChatId]);

  // Associated user info for drawer
  const activeUserData = useMemo(() => {
    if (!activeChat) return null;
    return users.find(u => u.id === activeChat.userId || u.email === activeChat.userEmail) || null;
  }, [activeChat, users]);

  // Auto-scroll messages when active chat changes or receives a new message
  useEffect(() => {
    if (activeChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      liveChatService.markRead(activeChat.id, 'admin');
    }
  }, [activeChat?.id, activeChat?.messages?.length]);

  // If no chat selected, pick first in list if available
  useEffect(() => {
    if (!selectedChatId && filteredChats.length > 0) {
      setSelectedChatId(filteredChats[0].id);
    }
  }, [filteredChats, selectedChatId]);

  const handleSendReply = async (textOverride?: string) => {
    const text = (textOverride || replyText).trim();
    if (!text || !activeChat || isSending) return;

    setReplyText('');
    setIsSending(true);

    try {
      const adminName = currentAdmin?.email ? currentAdmin.email.split('@')[0] : 'Support Agent';
      const { chat } = await liveChatService.sendMessage({
        chatId: activeChat.id,
        message: text,
        sender: 'admin',
        senderName: adminName
      });
      setChats(liveChatService.getLiveChats());
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleBot = async () => {
    if (!activeChat) return;
    const adminName = currentAdmin?.email ? currentAdmin.email.split('@')[0] : 'Support Agent';

    try {
      if (activeChat.botEnabled) {
        await liveChatService.takeOverChat(activeChat.id, adminName);
      } else {
        await liveChatService.handBackToBot(activeChat.id);
      }
      setChats(liveChatService.getLiveChats());
    } catch (e) {
      console.error('Error toggling bot:', e);
    }
  };

  const handleMarkResolved = async () => {
    if (!activeChat) return;
    try {
      await liveChatService.markResolved(activeChat.id);
      setChats(liveChatService.getLiveChats());
    } catch (e) {
      console.error('Error marking resolved:', e);
    }
  };

  // Canned quick replies
  const cannedReplies = [
    '👋 Hello! How can I assist you with your wallet today?',
    '🔍 Could you please share your transaction hash (TxHash)?',
    '🪪 Your KYC verification documents are currently being processed.',
    '⛽ For token transfers, ensure you have sufficient gas fee balance.',
    '✅ The issue has been reviewed and resolved for you.'
  ];

  // Stats calculation
  const stats = useMemo(() => {
    const total = chats.length;
    const needsHuman = chats.filter(c => c.needsHuman || c.status === 'escalated').length;
    const botActive = chats.filter(c => c.botEnabled && !c.needsHuman && c.status !== 'resolved').length;
    const resolved = chats.filter(c => c.status === 'resolved').length;
    return { total, needsHuman, botActive, resolved };
  }, [chats]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[740px]">
      {/* Top Banner with Stats & Controls */}
      <div className="px-6 py-3.5 bg-slate-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Live Chat Console</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              WhatsApp-style customer messaging with automated AI bot & human-in-the-loop escalation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stats.needsHuman > 0 && (
            <Badge className="bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse text-xs font-semibold px-2.5 py-1">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {stats.needsHuman} Needs Human Agent
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={refreshChats}
            className="h-8 text-xs text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Sync
          </Button>
        </div>
      </div>

      {/* Main 2-Pane Console */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: User Conversations List */}
        <div className="w-80 sm:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800/80">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-700/60">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users or messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1 mt-2.5 overflow-x-auto text-[11px] no-scrollbar">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
                }`}
              >
                All ({chats.length})
              </button>
              <button
                onClick={() => setFilterMode('needs_human')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  filterMode === 'needs_human'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Needs Agent ({stats.needsHuman})
              </button>
              <button
                onClick={() => setFilterMode('bot')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'bot'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
                }`}
              >
                Bot Active ({stats.botActive})
              </button>
              <button
                onClick={() => setFilterMode('resolved')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'resolved'
                    ? 'bg-gray-800 dark:bg-gray-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
                }`}
              >
                Resolved ({stats.resolved})
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                No conversations found in this category.
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                const isEscalated = chat.needsHuman || chat.status === 'escalated';

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-purple-50/80 dark:bg-purple-950/30 border-l-4 border-purple-600'
                        : isEscalated
                        ? 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70 border-l-4 border-amber-500'
                        : 'hover:bg-slate-50 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    {/* User Avatar with Status Indicator */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        {(chat.userName || chat.userEmail || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-800" />
                    </div>

                    {/* Chat Preview Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {chat.userName}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(chat.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1">
                        {chat.userEmail}
                      </p>

                      <div className="flex items-center justify-between gap-1.5">
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[180px]">
                          {chat.lastMessage || 'No messages yet'}
                        </p>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isEscalated ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold animate-pulse">
                              Needs Agent
                            </span>
                          ) : chat.status === 'resolved' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                              Resolved
                            </span>
                          ) : chat.botEnabled ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium flex items-center gap-0.5">
                              <Bot className="w-2.5 h-2.5" /> Bot
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                              Agent
                            </span>
                          )}

                          {chat.unreadCountAdmin > 0 && (
                            <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                              {chat.unreadCountAdmin}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: WhatsApp-style Active Conversation */}
        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-gray-900/40 overflow-hidden">
          {activeChat ? (
            <>
              {/* WhatsApp Active Header */}
              <div className="px-6 py-3.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {(activeChat.userName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        {activeChat.userName}
                      </h3>
                      <span className="text-xs font-mono text-gray-400 bg-slate-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {activeChat.userId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{activeChat.userEmail}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                    </div>
                  </div>
                </div>

                {/* Header Action Controls */}
                <div className="flex items-center gap-2">
                  {/* Bot vs Human Takeover Toggle */}
                  <Button
                    size="sm"
                    variant={activeChat.botEnabled ? 'outline' : 'default'}
                    onClick={handleToggleBot}
                    className={`h-8 text-xs font-medium ${
                      activeChat.botEnabled 
                        ? 'border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {activeChat.botEnabled ? (
                      <>
                        <Shield className="w-3.5 h-3.5 mr-1 text-purple-600" />
                        Take Over from Bot
                      </>
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5 mr-1" />
                        Resume Bot Assistant
                      </>
                    )}
                  </Button>

                  {/* Mark as Resolved */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkResolved}
                    className="h-8 text-xs text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Resolve
                  </Button>

                  {/* Toggle User Details Drawer */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowUserDetails(!showUserDetails)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    title="Toggle user profile info"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Status Alert Ribbon if Escalated */}
              {activeChat.needsHuman && (
                <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>This user has requested a live human specialist or the question was escalated.</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleToggleBot}
                    className="h-6 text-[11px] bg-amber-600 hover:bg-amber-700 text-white px-2.5"
                  >
                    Accept & Reply
                  </Button>
                </div>
              )}

              {/* Message Feed & Optional User Info Sidebar */}
              <div className="flex-1 flex overflow-hidden">
                {/* Chat Messages Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-100/60 dark:bg-gray-900/50">
                  {activeChat.messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    const isBot = msg.sender === 'bot';
                    const isAdmin = msg.sender === 'admin';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender Tag */}
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          {isUser && <User className="w-3 h-3 text-purple-600" />}
                          {isBot && <Bot className="w-3 h-3 text-indigo-600" />}
                          {isAdmin && <Shield className="w-3 h-3 text-emerald-600" />}
                          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            {isAdmin 
                              ? `${msg.senderName || 'You (Admin)'}` 
                              : isBot 
                              ? 'Pluto AI Bot' 
                              : `${activeChat.userName} (User)`}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div
                          className={`p-3.5 rounded-2xl max-w-[75%] text-xs sm:text-sm leading-relaxed shadow-xs ${
                            isAdmin
                              ? 'bg-purple-600 text-white rounded-br-sm'
                              : isBot
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 rounded-bl-sm'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Collapsible User Details Drawer */}
                {showUserDetails && activeUserData && (
                  <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-y-auto space-y-4 animate-in slide-in-from-right-4 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        User Profile
                      </h4>
                      <button onClick={() => setShowUserDetails(false)} className="text-gray-400 hover:text-gray-600">
                        ×
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-gray-400 block">Full Name:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{activeUserData.fullName || activeUserData.username}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Email:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{activeUserData.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Monospace User ID:</span>
                        <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400">{activeUserData.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">KYC Status:</span>
                        <Badge variant="outline" className="capitalize text-[10px] mt-0.5">
                          {activeUserData.kyc_status || 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                      <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Token Balances
                      </h5>
                      <div className="space-y-1.5 text-xs">
                        {Object.entries(activeUserData.balances || {}).map(([sym, amt]) => (
                          <div key={sym} className="flex justify-between py-1 border-b border-slate-50 dark:border-gray-700/50">
                            <span className="font-medium">{sym}:</span>
                            <span className="font-mono">{String(amt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Canned Replies Bar */}
              <div className="px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto text-[11px] no-scrollbar">
                <span className="text-gray-400 shrink-0 self-center font-medium">Quick Replies:</span>
                {cannedReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendReply(reply)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40 transition-colors"
                  >
                    {reply.slice(0, 24)}...
                  </button>
                ))}
              </div>

              {/* Message Reply Box */}
              <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply as ${currentAdmin?.email?.split('@')[0] || 'Admin'} (Enter to send)...`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  className="h-10 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/40 border-gray-200 dark:border-gray-700 rounded-xl"
                />
                <Button
                  onClick={() => handleSendReply()}
                  disabled={!replyText.trim() || isSending}
                  className="h-10 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Send
                </Button>
              </div>
            </>
          ) : (
            /* No conversation selected state */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center mb-3">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Pluto WhatsApp-Style Live Chat
              </h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Select a user conversation from the left to inspect real-time user messages, review AI bot answers, or take over to provide direct human assistance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
