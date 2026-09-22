import dataService from '../../utils/dataService';
import { useState, useEffect } from 'react';
import { X, Plus, MessageCircle, Clock, CheckCircle, Send, ExternalLink, XCircle, AlertTriangle, Bot, Shield, Sparkles, HelpCircle, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { liveChatService, LiveChatSession, ChatMessage } from '../../utils/liveChatService';

interface SupportModalProps {
  onClose: () => void;
  walletData?: any;
}

export default function SupportModal({ onClose, walletData }: SupportModalProps) {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('general');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [replyMessage, setReplyMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [currentChat, setCurrentChat] = useState<any>(null);

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'transaction', label: 'Transaction Problem' },
    { value: 'account', label: 'Account & Security' },
    { value: 'kyc', label: 'KYC Verification' },
    { value: 'feature', label: 'Feature Request' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', icon: <MessageCircle className="w-3 h-3" />, color: 'text-gray-600' },
    { value: 'medium', label: 'Medium', icon: <Clock className="w-3 h-3" />, color: 'text-yellow-600' },
    { value: 'high', label: 'High', icon: <AlertTriangle className="w-3 h-3" />, color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', icon: <XCircle className="w-3 h-3" />, color: 'text-red-600' }
  ];

  // Load user tickets from localStorage
  useEffect(() => {
    if (walletData?.id) {
      const userTickets = dataService.getItem(`pluto_tickets_${walletData.id}`);
      if (userTickets) {
        setTickets(JSON.parse(userTickets));
      }
    }
  }, [walletData]);

  // Load or create live chat session
  useEffect(() => {
    if (!walletData?.id) return;

    const chat = liveChatService.getOrCreateUserChat({
      id: walletData.id,
      email: walletData.email,
      username: walletData.username || walletData.fullName,
      phone: walletData.phone
    });
    setCurrentChat(chat);

    const handleChatsUpdated = (e: any) => {
      const chats = e.detail?.chats || liveChatService.getLiveChats();
      const updated = chats.find((c: any) => c.userId === walletData.id);
      if (updated) {
        setCurrentChat(updated);
      }
    };

    window.addEventListener('pluto_live_chats_updated', handleChatsUpdated);
    return () => window.removeEventListener('pluto_live_chats_updated', handleChatsUpdated);
  }, [walletData?.id]);

  // Mark read when user opens live chat inside SupportModal
  useEffect(() => {
    if (showLiveChat && currentChat?.id && (currentChat.unreadCountUser || 0) > 0) {
      liveChatService.markRead(currentChat.id, 'user');
      setCurrentChat(prev => prev ? { ...prev, unreadCountUser: 0 } : null);
    }
  }, [showLiveChat, currentChat?.messages]);

  const handleStartLiveChat = (initialPrompt?: string) => {
    if (!walletData?.id) {
      alert('Please log in to start a live chat');
      return;
    }
    setShowLiveChat(true);
    if (initialPrompt) {
      setTimeout(() => {
        handleSendChatMessage(initialPrompt);
      }, 200);
    }
  };

  const handleSendChatMessage = async (textOverride?: string) => {
    const textToSend = (textOverride || chatMessage).trim();
    if (!textToSend || !currentChat || !walletData?.id) return;

    setChatMessage('');
    try {
      const { chat } = await liveChatService.sendMessage({
        chatId: currentChat.id,
        message: textToSend,
        sender: 'user',
        senderName: walletData.username || walletData.fullName || 'User'
      });
      setCurrentChat(chat);
    } catch (err) {
      console.error('Failed to send live chat message:', err);
    }
  };

  const handleEscalateToHuman = () => {
    handleSendChatMessage('I would like to speak with a human support agent, please.');
  };

  const handleCloseLiveChat = () => {
    setShowLiveChat(false);
    setChatMessage('');
  };

  const handleCreateTicket = () => {
    if (!ticketSubject || !ticketMessage || !walletData?.id) {
      alert('Please fill in all fields');
      return;
    }

    const ticketId = `TKT-${Date.now()}`;
    const newTicket = {
      id: ticketId,
      userId: walletData.id,
      userEmail: walletData.email || 'user@example.com',
      userName: walletData.username || 'User',
      subject: ticketSubject,
      category: ticketCategory,
      priority: ticketPriority,
      status: 'open',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      messages: [
        {
          sender: 'user',
          senderName: walletData.username || 'User',
          message: ticketMessage,
          timestamp: new Date().toISOString()
        }
      ]
    };

    // Save to user's tickets
    const updatedTickets = [newTicket, ...tickets];
    setTickets(updatedTickets);
    dataService.setItem(`pluto_tickets_${walletData.id}`, JSON.stringify(updatedTickets));

    // Save to global admin tickets
    const allTickets = JSON.parse(dataService.getItem('pluto_support_tickets') || '[]');
    allTickets.push(newTicket);
    dataService.setItem('pluto_support_tickets', JSON.stringify(allTickets));

    setTicketSubject('');
    setTicketMessage('');
    setTicketCategory('general');
    setTicketPriority('medium');
    setShowNewTicket(false);
    alert('Ticket created successfully! Our support team will respond soon.');
  };

  const handleSendReply = (ticketId: string) => {
    if (!replyMessage || !walletData?.id) return;

    const updatedTickets = tickets.map(ticket => {
      if (ticket.id === ticketId) {
        const updatedTicket = {
          ...ticket,
          updated: new Date().toISOString(),
          messages: [
            ...ticket.messages,
            {
              sender: 'user',
              senderName: walletData.username || 'User',
              message: replyMessage,
              timestamp: new Date().toISOString()
            }
          ]
        };
        return updatedTicket;
      }
      return ticket;
    });

    setTickets(updatedTickets);
    dataService.setItem(`pluto_tickets_${walletData.id}`, JSON.stringify(updatedTickets));

    // Update global admin tickets
    const allTickets = JSON.parse(dataService.getItem('pluto_support_tickets') || '[]');
    const globalIndex = allTickets.findIndex((t: any) => t.id === ticketId);
    if (globalIndex !== -1) {
      allTickets[globalIndex] = updatedTickets.find(t => t.id === ticketId);
      dataService.setItem('pluto_support_tickets', JSON.stringify(allTickets));
    }

    setReplyMessage('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <MessageCircle className="w-4 h-4" />;
      case 'in-progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'closed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full p-6 mx-auto max-h-[90vh] overflow-y-auto">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl text-gray-900 dark:text-white">Support Center</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tickets">My Tickets</TabsTrigger>
            <TabsTrigger value="livechat">Live Chat</TabsTrigger>
          </TabsList>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4">
            {!showNewTicket && !selectedTicket && (
              <>
                <Button onClick={() => setShowNewTicket(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Ticket
                </Button>

                {tickets.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No tickets yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Create a ticket to get support from our team</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket.id)}
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm text-gray-500 dark:text-gray-400">{ticket.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                                {getStatusIcon(ticket.status)}
                                {ticket.status}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                                {categories.find(c => c.value === ticket.category)?.label || ticket.category}
                              </span>
                            </div>
                            <h3 className="text-gray-900 dark:text-white mb-1">{ticket.subject}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>Created: {new Date(ticket.created).toLocaleDateString()}</span>
                          <span>Updated: {new Date(ticket.updated).toLocaleDateString()}</span>
                          <span>{ticket.messages.length} messages</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* New Ticket Form */}
            {showNewTicket && (
              <div className="space-y-4">
                <Button variant="outline" onClick={() => setShowNewTicket(false)} className="mb-4">
                  ← Back to Tickets
                </Button>

                <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl space-y-4">
                  <h3 className="text-xl text-gray-900 dark:text-white">Create New Ticket</h3>
                  
                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Subject</label>
                    <Input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  {/* Category and Priority - Same Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Category</label>
                      <Select value={ticketCategory} onValueChange={setTicketCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Priority</label>
                      <Select value={ticketPriority} onValueChange={setTicketPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map((pri) => (
                            <SelectItem key={pri.value} value={pri.value}>
                              <div className="flex items-center gap-2">
                                <span className={pri.color}>{pri.icon}</span>
                                <span>{pri.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Message</label>
                    <textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Provide detailed information about your issue"
                      className="w-full min-h-[150px] p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleCreateTicket} className="flex-1">
                      <Send className="w-4 h-4 mr-2" />
                      Submit Ticket
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewTicket(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Detail View */}
            {selectedTicket && (
              <div className="space-y-4">
                <Button variant="outline" onClick={() => setSelectedTicket(null)} className="mb-4">
                  ← Back to Tickets
                </Button>

                {tickets.filter(t => t.id === selectedTicket).map((ticket) => (
                  <div key={ticket.id}>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{ticket.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                              {getStatusIcon(ticket.status)}
                              {ticket.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                              {categories.find(c => c.value === ticket.category)?.label || ticket.category}
                            </span>
                          </div>
                          <h3 className="text-xl text-gray-900 dark:text-white">{ticket.subject}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Created: {new Date(ticket.created).toLocaleString()}</span>
                        <span>Updated: {new Date(ticket.updated).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="space-y-3 mb-4">
                      {ticket.messages.map((msg: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl ${
                            msg.sender === 'user'
                              ? 'bg-purple-50 dark:bg-purple-900/20 ml-8'
                              : 'bg-blue-50 dark:bg-blue-900/20 mr-8'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                              {msg.sender === 'user' ? msg.senderName : 'Support Team'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply Box - Only show if ticket is not closed */}
                    {ticket.status !== 'closed' && (
                      <div className="space-y-3">
                        {ticket.status === 'resolved' && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              This ticket has been marked as resolved. You can still reply if you need further assistance.
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your reply..."
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply(ticket.id);
                              }
                            }}
                          />
                          <Button onClick={() => handleSendReply(ticket.id)}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {ticket.status === 'closed' && (
                      <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
                        <XCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          This ticket has been closed and no longer accepts replies.
                        </p>
                      </div>
                    )}
                  </div>
                ))}</div>
            )}
          </TabsContent>

          {/* Live Chat Tab */}
          <TabsContent value="livechat" className="space-y-4">
            {/* Live Chat Interface */}
            {showLiveChat && currentChat ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                {/* Chat Header */}
                <div className="px-5 py-3.5 bg-slate-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white ${
                      currentChat.needsHuman || currentChat.assignedAgent
                        ? 'bg-gradient-to-tr from-blue-600 to-cyan-500'
                        : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                    }`}>
                      {currentChat.needsHuman || currentChat.assignedAgent ? (
                        <Shield className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {currentChat.assignedAgent
                            ? `Agent ${currentChat.assignedAgent}`
                            : currentChat.needsHuman
                            ? 'Human Support Specialist (Alerted)'
                            : 'Pluto AI Assistant'}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {currentChat.needsHuman
                          ? 'Escalated to human admin team'
                          : 'Online • Typically replies instantly'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!currentChat.needsHuman && !currentChat.assignedAgent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEscalateToHuman}
                        className="h-8 text-xs text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100"
                        title="Transfer conversation to human support"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        Talk to Human
                      </Button>
                    )}
                    <button
                      onClick={handleCloseLiveChat}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto bg-slate-50/40 dark:bg-gray-900/30">
                  {currentChat.messages.map((msg: any) => {
                    const isUser = msg.sender === 'user';
                    const isBot = msg.sender === 'bot';
                    const isAdmin = msg.sender === 'admin';

                    return (
                      <div
                        key={msg.id || msg.timestamp}
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
                          className={`p-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                            isUser
                              ? 'bg-purple-600 text-white rounded-br-sm'
                              : msg.is_escalation
                              ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-bl-sm'
                              : isAdmin
                              ? 'bg-blue-600 text-white rounded-bl-sm shadow-sm'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Suggestion Chips */}
                <div className="px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto text-xs no-scrollbar">
                  <button
                    onClick={() => handleSendChatMessage('How do I deposit funds and what is the gas fee?')}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                  >
                    📥 Deposit & Gas Fee
                  </button>
                  <button
                    onClick={() => handleSendChatMessage('How do withdrawals work and what are the fees?')}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                  >
                    📤 Withdrawal Rules
                  </button>
                  <button
                    onClick={() => handleSendChatMessage('How do I complete KYC verification?')}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                  >
                    🪪 KYC Verification
                  </button>
                  <button
                    onClick={handleEscalateToHuman}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                  >
                    🙋 Speak to Human Agent
                  </button>
                </div>

                {/* Message Input Box */}
                <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type your message (or 'human' to speak to agent)..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                    className="h-10 text-sm bg-slate-50 dark:bg-slate-900/40 border-gray-200 dark:border-gray-700 rounded-xl"
                  />
                  <Button 
                    onClick={() => handleSendChatMessage()} 
                    disabled={!chatMessage.trim()}
                    className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Live Chat Hero Card */
              <div className="p-6 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-gray-800 dark:to-blue-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/40 text-center">
                <div className="w-14 h-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-600/20">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  24/7 Intelligent Live Support
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-4 leading-relaxed">
                  Get instant automated assistance on deposits, gas fees, and transactions, with 1-click transfer to human support agents when you need extra care.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <Button 
                    onClick={() => handleStartLiveChat()}
                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 h-10 rounded-xl shadow-md shadow-purple-600/20"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Live Chat
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleStartLiveChat('I would like to speak with a human support agent, please.')}
                    className="w-full sm:w-auto border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 h-10 rounded-xl"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Talk to Human Agent
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Help Topics Accordion */}
            <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">Quick Help Topics</h4>
                </div>
                <Badge variant="secondary" className="text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-none font-medium">
                  Instant Answers
                </Badge>
              </div>

              <Accordion type="single" collapsible className="w-full space-y-2.5">
                {/* 1. Deposit Funds */}
                <AccordionItem value="deposit" className="border border-slate-200/80 dark:border-gray-700 rounded-xl px-4 overflow-hidden bg-slate-50/50 dark:bg-gray-900/30">
                  <AccordionTrigger className="text-sm font-semibold text-gray-900 dark:text-gray-100 py-3.5 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-xs flex items-center justify-center font-bold">1</span>
                      How to deposit funds into Pluto Wallet
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-600 dark:text-gray-300 space-y-2.5 pb-4 leading-relaxed">
                    <p>
                      Depositing funds into your multi-chain wallet is straightforward and non-custodial:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-gray-700 dark:text-gray-300">
                      <li>Navigate to the <strong>Receive</strong> tab from your wallet dashboard.</li>
                      <li>Select the cryptocurrency you want to deposit (e.g. BTC, ETH, SOL, BNB, or USDT).</li>
                      <li>Copy your unique deposit address or scan the displayed QR code with your external wallet or exchange.</li>
                      <li><strong>Important:</strong> Verify that the chosen network matches your sending platform (e.g. ERC-20 for Ethereum, TRC-20 for Tron).</li>
                      <li>Transactions credit automatically once required block confirmations occur on the blockchain (typically 1–10 minutes).</li>
                    </ol>
                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartLiveChat('How do I deposit funds and check confirmation times?')}
                        className="h-7 text-[11px] text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                      >
                        Ask Bot About Deposits
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. Withdrawal Process */}
                <AccordionItem value="withdrawal" className="border border-slate-200/80 dark:border-gray-700 rounded-xl px-4 overflow-hidden bg-slate-50/50 dark:bg-gray-900/30">
                  <AccordionTrigger className="text-sm font-semibold text-gray-900 dark:text-gray-100 py-3.5 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-bold">2</span>
                      Withdrawal process & fee structure
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-600 dark:text-gray-300 space-y-2.5 pb-4 leading-relaxed">
                    <p>
                      Withdrawals are executed directly from your wallet with full transparency:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-700 dark:text-gray-300">
                      <li>Click <strong>Send</strong> on your wallet home screen or chosen asset card.</li>
                      <li>Paste the recipient destination address and verify it matches the target blockchain.</li>
                      <li>The transaction review screen displays both the <strong>Network Fee</strong> (blockchain miner fee) and the <strong>Processing Fee</strong> clearly before confirmation.</li>
                      <li>For token transfers like USDT, ensure your wallet maintains a balance of the native network asset (e.g. ETH or BNB) to satisfy blockchain gas fee requirements.</li>
                    </ul>
                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartLiveChat('Can you explain the withdrawal processing fee and gas fee?')}
                        className="h-7 text-[11px] text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                      >
                        Ask Bot About Withdrawals
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. Security Features */}
                <AccordionItem value="security" className="border border-slate-200/80 dark:border-gray-700 rounded-xl px-4 overflow-hidden bg-slate-50/50 dark:bg-gray-900/30">
                  <AccordionTrigger className="text-sm font-semibold text-gray-900 dark:text-gray-100 py-3.5 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">3</span>
                      Security features & seed phrase protection
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-600 dark:text-gray-300 space-y-2.5 pb-4 leading-relaxed">
                    <p>
                      Pluto employs institutional-grade client-side encryption to safeguard your digital assets:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-700 dark:text-gray-300">
                      <li><strong>Non-Custodial Architecture:</strong> Your 12-word seed phrase is stored with AES-256 encryption. Only you hold access to your private keys.</li>
                      <li><strong>2FA & Biometrics:</strong> Activate Two-Factor Authentication (TOTP / Google Authenticator) in <em>Settings &gt; Security</em> for added transaction verification.</li>
                      <li><strong>Safety Golden Rule:</strong> Never share your 12 recovery words with anyone. Pluto support agents will NEVER ask for your password or seed phrase.</li>
                    </ul>
                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartLiveChat('What are the best practices for seed phrase security?')}
                        className="h-7 text-[11px] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      >
                        Ask Bot About Security
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 4. Trading & Swap Fees */}
                <AccordionItem value="trading" className="border border-slate-200/80 dark:border-gray-700 rounded-xl px-4 overflow-hidden bg-slate-50/50 dark:bg-gray-900/30">
                  <AccordionTrigger className="text-sm font-semibold text-gray-900 dark:text-gray-100 py-3.5 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-center font-bold">4</span>
                      Trading fees and swap slippage
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-600 dark:text-gray-300 space-y-2.5 pb-4 leading-relaxed">
                    <p>
                      Execute seamless token swaps across supported chains at optimal market rates:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-700 dark:text-gray-300">
                      <li>Pluto automatically routes swaps across decentralized liquidity pools to minimize slippage.</li>
                      <li>Zero hidden fees: The exchange rate quote locks before you confirm your trade.</li>
                      <li>Network gas fees are deducted in the native currency of the executing chain.</li>
                    </ul>
                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartLiveChat('How does the swap feature calculate fees?')}
                        className="h-7 text-[11px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                      >
                        Ask Bot About Swaps
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 5. KYC Verification */}
                <AccordionItem value="kyc" className="border border-slate-200/80 dark:border-gray-700 rounded-xl px-4 overflow-hidden bg-slate-50/50 dark:bg-gray-900/30">
                  <AccordionTrigger className="text-sm font-semibold text-gray-900 dark:text-gray-100 py-3.5 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-center font-bold">5</span>
                      KYC verification tiers and approval times
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-600 dark:text-gray-300 space-y-2.5 pb-4 leading-relaxed">
                    <p>
                      Verify your identity to increase transaction limits and access priority features:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-700 dark:text-gray-300">
                      <li><strong>Tier 1 (Basic):</strong> Standard wallet usage enabled upon registration.</li>
                      <li><strong>Tier 2 (Verified):</strong> Submit a valid Passport, National ID card, or Driver's License along with a clear selfie. Unlocks unlimited daily transaction thresholds ($500,000/day).</li>
                      <li><strong>Review Speed:</strong> Verifications are typically reviewed by compliance officers within 5–15 minutes.</li>
                    </ul>
                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartLiveChat('What documents are accepted for KYC verification?')}
                        className="h-7 text-[11px] text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                      >
                        Ask Bot About KYC
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}