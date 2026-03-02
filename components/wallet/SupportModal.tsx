import dataService from '../../utils/dataService';
import { useState, useEffect } from 'react';
import { X, Plus, MessageCircle, Clock, CheckCircle, Send, ExternalLink, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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

  // Load or create live chat
  useEffect(() => {
    if (walletData?.id && showLiveChat) {
      const allChats = JSON.parse(dataService.getItem('pluto_live_chats') || '[]');
      const userChat = allChats.find((chat: any) => chat.userId === walletData.id);
      
      if (userChat) {
        setCurrentChat(userChat);
      } else {
        // Create new chat
        const newChat = {
          id: `CHT-${Date.now()}`,
          userId: walletData.id,
          userEmail: walletData.email || 'user@example.com',
          userName: walletData.username || 'User',
          userPhone: walletData.phone || '',
          status: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          messages: []
        };
        setCurrentChat(newChat);
        allChats.push(newChat);
        dataService.setItem('pluto_live_chats', JSON.stringify(allChats));
      }

      // Auto-refresh chat every 2 seconds
      const interval = setInterval(() => {
        const updatedChats = JSON.parse(dataService.getItem('pluto_live_chats') || '[]');
        const updatedUserChat = updatedChats.find((chat: any) => chat.userId === walletData.id);
        if (updatedUserChat) {
          setCurrentChat(updatedUserChat);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [walletData, showLiveChat]);

  const handleStartLiveChat = () => {
    if (!walletData?.id) {
      alert('Please log in to start a live chat');
      return;
    }
    setShowLiveChat(true);
  };

  const handleSendChatMessage = () => {
    if (!chatMessage.trim() || !currentChat || !walletData?.id) return;

    const newMessage = {
      sender: 'user',
      senderName: walletData.username || 'User',
      message: chatMessage,
      timestamp: new Date().toISOString()
    };

    const updatedChat = {
      ...currentChat,
      updated: new Date().toISOString(),
      messages: [...currentChat.messages, newMessage]
    };

    // Update local state
    setCurrentChat(updatedChat);
    setChatMessage('');

    // Update localStorage
    const allChats = JSON.parse(dataService.getItem('pluto_live_chats') || '[]');
    const chatIndex = allChats.findIndex((chat: any) => chat.id === currentChat.id);
    if (chatIndex !== -1) {
      allChats[chatIndex] = updatedChat;
      dataService.setItem('pluto_live_chats', JSON.stringify(allChats));
    }
  };

  const handleCloseLiveChat = () => {
    setShowLiveChat(false);
    setCurrentChat(null);
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
            <div className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl text-gray-900 dark:text-white mb-2">Live Chat Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Connect with our support team in real-time for immediate assistance.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Available: Monday - Friday, 9:00 AM - 6:00 PM UTC
              </p>
              <Button className="w-full max-w-xs mx-auto" onClick={handleStartLiveChat}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Start Live Chat
              </Button>
            </div>

            {showLiveChat && currentChat && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <h4 className="text-gray-900 dark:text-white mb-3">Live Chat with Support</h4>
                <div className="space-y-2">
                  {currentChat.messages.map((msg: any, idx: number) => (
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
                <div className="flex gap-2 mt-4">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendChatMessage}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" onClick={handleCloseLiveChat} className="mt-4">
                  End Chat
                </Button>
              </div>
            )}

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <h4 className="text-gray-900 dark:text-white mb-3">Quick Help Topics</h4>
              <div className="space-y-2">
                {['How to deposit funds', 'Withdrawal process', 'Security features', 'Trading fees', 'KYC verification'].map((topic) => (
                  <button
                    key={topic}
                    className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm text-gray-700 dark:text-gray-300"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}