import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Bell,
  Settings,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  Eye,
  RefreshCw,
  Sparkles,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  ShieldAlert,
  Server,
  Key,
  Globe,
  Radio,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import {
  messageService,
  AdminMessage,
  SmtpSettings,
  MessageChannel,
  NotificationCategory
} from '../../utils/messageService';

interface AdminMessagesTabProps {
  users: Array<{
    id: string;
    email: string;
    fullName?: string;
    wallet_id?: string;
    [key: string]: any;
  }>;
}

export default function AdminMessagesTab({ users }: AdminMessagesTabProps) {
  // Navigation inside Messages Tab
  const [subTab, setSubTab] = useState<'inbox' | 'compose' | 'notifications' | 'smtp'>('inbox');

  // Messages state
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);

  // Filters
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // SMTP configuration state
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>(messageService.getSmtpSettings());
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showIncomingPassword, setShowIncomingPassword] = useState<boolean>(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('admin@plutowallet.app');
  const [smtpFeedback, setSmtpFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isFetchingMail, setIsFetchingMail] = useState<boolean>(false);

  // Compose State
  const [composeRecipient, setComposeRecipient] = useState<string>('all'); // user id or 'all'
  const [composeChannel, setComposeChannel] = useState<MessageChannel>('both');
  const [composeCategory, setComposeCategory] = useState<NotificationCategory>('info');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccessToast, setSendSuccessToast] = useState<string | null>(null);

  // Notification management quick broadcast modal
  const [activeUserNotifications, setActiveUserNotifications] = useState<any[]>([]);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    setMessages(messageService.getMessages());
    setSmtpSettings(messageService.getSmtpSettings());
    loadAllUserNotifications();
  };

  const loadAllUserNotifications = () => {
    const list: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pluto_notifications_')) {
          const walletId = key.replace('pluto_notifications_', '');
          const notifs = JSON.parse(localStorage.getItem(key) || '[]');
          notifs.forEach((n: any) => {
            list.push({ ...n, targetWallet: walletId });
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    setActiveUserNotifications(list);
  };

  // Quick message templates
  const applyTemplate = (type: string) => {
    switch (type) {
      case 'kyc_approved':
        setComposeSubject('Identity Verification (KYC) Approved');
        setComposeBody(
          'Dear user,\n\nWe are pleased to inform you that your identity verification has been reviewed and successfully approved. Your withdrawal limits have been increased.\n\nThank you for choosing Pluto Wallet.'
        );
        setComposeCategory('kyc');
        break;
      case 'kyc_rejected':
        setComposeSubject('KYC Verification - Additional Documentation Required');
        setComposeBody(
          'Dear user,\n\nOur compliance team reviewed your submission but could not verify your document due to low image quality or expiration. Please upload a clear, unexpired government-issued ID in Settings > KYC.\n\nSupport is available 24/7.'
        );
        setComposeCategory('alert');
        break;
      case 'security_alert':
        setComposeSubject('Security Notice: New Session Login Detected');
        setComposeBody(
          'Security Alert: A new login was registered to your Pluto Wallet account from an unfamiliar IP address. If this was you, no action is needed. If you did not perform this action, lock your wallet immediately from Settings.'
        );
        setComposeCategory('alert');
        break;
      case 'maintenance':
        setComposeSubject('Scheduled Network Maintenance Notice');
        setComposeBody(
          'Please be advised that Pluto Wallet will undergo scheduled multi-chain node maintenance this weekend. Asset balances remain 100% secure. Swaps and transfers may experience brief confirmation delays.'
        );
        setComposeCategory('announcement');
        break;
      case 'promo':
        setComposeSubject('Zero Gas Fee Weekend on Solana & Polygon!');
        setComposeBody(
          'Trade your favorite tokens with 0% network gas surcharge this weekend on Solana and Polygon networks. Experience lightning-fast transactions with Pluto Multi-Chain.'
        );
        setComposeCategory('promo');
        break;
    }
  };

  // Handle Send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeSubject.trim() || !composeBody.trim()) {
      alert('Please provide both subject and message body.');
      return;
    }

    setIsSending(true);

    setTimeout(() => {
      let recipientEmail = 'all-users@plutowallet.app';
      let recipientName = 'All Wallet Users';

      if (composeRecipient !== 'all') {
        const found = users.find((u) => u.id === composeRecipient || u.wallet_id === composeRecipient);
        if (found) {
          recipientEmail = found.email;
          recipientName = found.fullName || found.email;
        }
      }

      messageService.sendMessage({
        recipientId: composeRecipient,
        recipientEmail,
        recipientName,
        channel: composeChannel,
        category: composeCategory,
        subject: composeSubject,
        body: composeBody
      });

      setIsSending(false);
      setSendSuccessToast(`Message dispatched successfully via ${composeChannel.toUpperCase()} to ${recipientName}!`);
      setComposeSubject('');
      setComposeBody('');
      loadAllData();

      setTimeout(() => {
        setSendSuccessToast(null);
        setSubTab('inbox');
      }, 1500);
    }, 600);
  };

  // Handle Save SMTP
  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    messageService.saveSmtpSettings(smtpSettings);
    setSmtpFeedback({ type: 'success', message: 'SMTP and Mail server settings saved successfully.' });
    setTimeout(() => setSmtpFeedback(null), 3000);
  };

  // Handle Test Outgoing SMTP
  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpFeedback(null);
    try {
      const res = await messageService.testOutgoingSmtp(smtpSettings, testEmailAddress);
      setSmtpSettings(messageService.getSmtpSettings());
      if (res.success) {
        setSmtpFeedback({ type: 'success', message: res.message });
      } else {
        setSmtpFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setSmtpFeedback({ type: 'error', message: err.message || 'SMTP test connection failed' });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Handle Fetch Incoming Mail
  const handleFetchIncomingMail = async () => {
    setIsFetchingMail(true);
    try {
      const res = await messageService.fetchIncomingMails();
      loadAllData();
      setSmtpFeedback({
        type: 'success',
        message: `Fetched ${res.count} new incoming message(s) from ${smtpSettings.incomingProtocol.toUpperCase()} mail server.`
      });
      setTimeout(() => setSmtpFeedback(null), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingMail(false);
    }
  };

  // Filter messages list
  const filteredMessages = messages.filter((m) => {
    if (filterUser !== 'all' && m.recipientId !== filterUser && m.sender.email !== filterUser) {
      // Also match if recipient email matches
      const matchedUser = users.find((u) => u.id === filterUser);
      if (!matchedUser || (m.recipientEmail !== matchedUser.email && m.sender.email !== matchedUser.email)) {
        return false;
      }
    }
    if (filterChannel !== 'all' && m.channel !== filterChannel) {
      return false;
    }
    if (filterDirection !== 'all' && m.direction !== filterDirection) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = m.subject.toLowerCase().includes(q);
      const matchBody = m.body.toLowerCase().includes(q);
      const matchEmail = m.recipientEmail.toLowerCase().includes(q) || m.sender.email.toLowerCase().includes(q);
      if (!matchSubject && !matchBody && !matchEmail) return false;
    }
    return true;
  });

  const getChannelBadge = (ch: MessageChannel) => {
    switch (ch) {
      case 'email':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <Mail className="w-3 h-3" /> Email
          </span>
        );
      case 'in_app':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <Bell className="w-3 h-3" /> In-App
          </span>
        );
      case 'both':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            <Sparkles className="w-3 h-3" /> Email + In-App
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: NotificationCategory) => {
    switch (cat) {
      case 'alert':
        return <Badge variant="destructive" className="text-[11px] px-1.5 py-0">Alert</Badge>;
      case 'kyc':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[11px] px-1.5 py-0">KYC</Badge>;
      case 'announcement':
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-[11px] px-1.5 py-0">Notice</Badge>;
      case 'promo':
        return <Badge className="bg-pink-600 hover:bg-pink-700 text-[11px] px-1.5 py-0">Promo</Badge>;
      case 'transaction':
        return <Badge className="bg-cyan-600 hover:bg-cyan-700 text-[11px] px-1.5 py-0">Transfer</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px] px-1.5 py-0">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{messages.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">In-App Delivered</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {messages.filter((m) => m.channel === 'in_app' || m.channel === 'both').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Emails Sent (SMTP)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {messages.filter((m) => m.channel === 'email' || m.channel === 'both').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Incoming Inquiries</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {messages.filter((m) => m.direction === 'incoming').length}
              </span>
              {messages.filter((m) => m.direction === 'incoming' && m.status === 'unread').length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white">
                  {messages.filter((m) => m.direction === 'incoming' && m.status === 'unread').length} Unread
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">SMTP Status</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {smtpSettings.outgoingEnabled ? 'Connected' : 'Disabled'}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 truncate max-w-[110px] mt-0.5">{smtpSettings.smtpHost}</p>
          </div>
          <button
            onClick={() => setSubTab('smtp')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            title="Configure SMTP"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('inbox')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === 'inbox'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Messages & Mail</span>
            <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
              {messages.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('compose')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === 'compose'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Compose Dispatch</span>
          </button>

          <button
            onClick={() => {
              setSubTab('notifications');
              loadAllUserNotifications();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === 'notifications'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Manage Notifications</span>
          </button>

          <button
            onClick={() => setSubTab('smtp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === 'smtp'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>SMTP / Mail Config</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'inbox' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchIncomingMail}
              disabled={isFetchingMail}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingMail ? 'animate-spin text-purple-500' : ''}`} />
              <span>{isFetchingMail ? 'Checking Mail...' : 'Fetch Incoming Mail'}</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setSubTab('compose')}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>New Message</span>
          </Button>
        </div>
      </div>

      {/* Subtab 1: INBOX & LOG */}
      {subTab === 'inbox' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center flex-wrap gap-3 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search subject, recipient, content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {/* Filter by User */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="w-3.5 h-3.5" />
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Filter: All Users</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Channel */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Filter className="w-3.5 h-3.5" />
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Channels</option>
                  <option value="email">Email Only</option>
                  <option value="in_app">In-App Only</option>
                  <option value="both">Both (Email & In-App)</option>
                </select>
              </div>

              {/* Filter by Direction */}
              <select
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value)}
                className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Directions</option>
                <option value="outgoing">Outgoing (Sent by Admin)</option>
                <option value="incoming">Incoming (From Users/Replies)</option>
              </select>
            </div>

            {(filterUser !== 'all' || filterChannel !== 'all' || filterDirection !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setFilterUser('all');
                  setFilterChannel('all');
                  setFilterDirection('all');
                  setSearchQuery('');
                }}
                className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Messages Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Direction & Type</th>
                    <th className="px-4 py-3">User / Recipient</th>
                    <th className="px-4 py-3">Subject & Preview</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredMessages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="font-medium text-gray-700 dark:text-gray-300">No messages found matching criteria</p>
                        <p className="text-xs text-gray-400 mt-1">Try changing filters or compose a new dispatch.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMessages.map((msg) => {
                      const isIncoming = msg.direction === 'incoming';
                      return (
                        <tr
                          key={msg.id}
                          className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                            msg.status === 'unread' ? 'bg-purple-50/30 dark:bg-purple-900/10 font-medium' : ''
                          }`}
                          onClick={() => {
                            if (msg.status === 'unread') {
                              messageService.markMessageRead(msg.id);
                              loadAllData();
                            }
                            setSelectedMessage(msg);
                          }}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {isIncoming ? (
                                <span
                                  className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0"
                                  title="Incoming Email Reply"
                                >
                                  <ArrowDownLeft className="w-4 h-4" />
                                </span>
                              ) : (
                                <span
                                  className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0"
                                  title="Outgoing Admin Dispatch"
                                >
                                  <ArrowUpRight className="w-4 h-4" />
                                </span>
                              )}
                              <div>{getCategoryBadge(msg.category)}</div>
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <p className="text-gray-900 dark:text-white font-medium text-xs">
                                {isIncoming ? msg.sender.name : msg.recipientName}
                              </p>
                              <p className="text-gray-400 text-[11px]">
                                {isIncoming ? msg.sender.email : msg.recipientEmail}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-3 max-w-xs md:max-w-md">
                            <div className="truncate text-gray-900 dark:text-white text-xs font-semibold">
                              {msg.subject}
                            </div>
                            <div className="truncate text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">
                              {msg.body}
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">{getChannelBadge(msg.channel)}</td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            {msg.status === 'delivered' && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                              </span>
                            )}
                            {msg.status === 'sent' && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                <Clock className="w-3.5 h-3.5" /> Sent
                              </span>
                            )}
                            {msg.status === 'unread' && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Unread
                              </span>
                            )}
                            {msg.status === 'read' && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400">Read</span>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                            {new Date(msg.timestamp).toLocaleDateString()}
                            <div className="text-[10px] text-gray-400">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedMessage(msg)}
                                className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this message from communications log?')) {
                                    messageService.deleteMessage(msg.id);
                                    loadAllData();
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                title="Delete message"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: COMPOSE DISPATCH */}
      {subTab === 'compose' && (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 sm:p-8">
          {sendSuccessToast && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="font-medium text-sm">{sendSuccessToast}</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-5 border-b border-gray-200 dark:border-gray-700 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-600" />
                <span>Compose Multi-Channel Dispatch</span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Dispatch verified notices directly to user in-app wallets, email inbox via SMTP, or both.
              </p>
            </div>

            {/* Quick Templates Dropdown */}
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <select
                onChange={(e) => {
                  if (e.target.value) applyTemplate(e.target.value);
                }}
                defaultValue=""
                className="h-9 px-3 text-xs rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 font-medium cursor-pointer"
              >
                <option value="" disabled>
                  ⚡ Load Quick Template...
                </option>
                <option value="kyc_approved">KYC Verification Approved</option>
                <option value="kyc_rejected">KYC Needs Additional Info</option>
                <option value="security_alert">Security Alert (New Sign-in)</option>
                <option value="maintenance">Scheduled System Maintenance</option>
                <option value="promo">Zero Gas Promo Announcement</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="space-y-6">
            {/* Delivery Channel Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                1. Delivery Channel
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setComposeChannel('email')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    composeChannel === 'email'
                      ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <input
                      type="radio"
                      checked={composeChannel === 'email'}
                      onChange={() => setComposeChannel('email')}
                      className="text-purple-600"
                    />
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mt-2">Email Only</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Dispatched via configured SMTP server ({smtpSettings.smtpHost})
                  </p>
                </div>

                <div
                  onClick={() => setComposeChannel('in_app')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    composeChannel === 'in_app'
                      ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Bell className="w-5 h-5 text-amber-500" />
                    <input
                      type="radio"
                      checked={composeChannel === 'in_app'}
                      onChange={() => setComposeChannel('in_app')}
                      className="text-purple-600"
                    />
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mt-2">In-App Notification</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Appears directly inside recipient's wallet notification bell
                  </p>
                </div>

                <div
                  onClick={() => setComposeChannel('both')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    composeChannel === 'both'
                      ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <input
                      type="radio"
                      checked={composeChannel === 'both'}
                      onChange={() => setComposeChannel('both')}
                      className="text-purple-600"
                    />
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mt-2">Both (Email & In-App)</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Maximum visibility: simultaneous inbox and in-wallet alert
                  </p>
                </div>
              </div>
            </div>

            {/* Recipient & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  2. Target Recipient
                </label>
                <select
                  value={composeRecipient}
                  onChange={(e) => setComposeRecipient(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">📢 Broadcast to All Registered Users</option>
                  <optgroup label="Specific Registered Users">
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email} — {u.email}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  3. Notice Classification
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['info', 'kyc', 'alert', 'announcement', 'promo', 'transaction'] as NotificationCategory[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setComposeCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                          composeCategory === cat
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                4. Subject Line
              </label>
              <Input
                placeholder="e.g., Important Security Update Regarding Your Pluto Account"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="h-11 font-medium"
                required
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                5. Message Content
              </label>
              <textarea
                rows={6}
                placeholder="Write message body here..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="w-full p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>

            {/* Preview Box */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview Delivery Summary</p>
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                <span>
                  <strong>Channel:</strong> {composeChannel.toUpperCase()}
                </span>
                <span>
                  <strong>Recipient:</strong>{' '}
                  {composeRecipient === 'all'
                    ? 'All Users'
                    : users.find((u) => u.id === composeRecipient)?.email || composeRecipient}
                </span>
                <span>
                  <strong>Classification:</strong> {composeCategory.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={() => setSubTab('inbox')}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSending}
                className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px] flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Dispatch</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Subtab 3: MANAGE NOTIFICATIONS */}
      {subTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <span>Active In-App Wallet Notifications</span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Monitor and manage notifications currently residing in user wallet notification centers.
              </p>
            </div>

            <Button
              onClick={() => {
                setComposeChannel('in_app');
                setSubTab('compose');
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              <span>Broadcast In-App Alert</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeUserNotifications.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="font-medium text-gray-700 dark:text-gray-300">No active user notifications found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Dispatch a notification from the Compose tab to see it here.
                </p>
              </div>
            ) : (
              activeUserNotifications.map((notif, idx) => (
                <div
                  key={`${notif.id}_${idx}`}
                  className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                        {notif.title}
                      </h4>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {notif.type || 'info'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">{notif.message}</p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
                    <span className="truncate max-w-[130px]">Target: {notif.targetWallet}</span>
                    <span>{notif.timestamp || 'Recent'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Subtab 4: SMTP / MAIL CONFIGURATION */}
      {subTab === 'smtp' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {smtpFeedback && (
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                smtpFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}
            >
              {smtpFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
              )}
              <p className="text-sm font-medium">{smtpFeedback.message}</p>
            </div>
          )}

          <form onSubmit={handleSaveSmtp} className="space-y-6">
            {/* Outgoing Mail Card (SMTP) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Outgoing Mail Server (SMTP)</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Configure server used to transmit emails, KYC alerts, and password resets
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Enable Outgoing</span>
                  <Switch
                    checked={smtpSettings.outgoingEnabled}
                    onCheckedChange={(val) => setSmtpSettings({ ...smtpSettings, outgoingEnabled: val })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Host / Server
                  </label>
                  <Input
                    placeholder="e.g., smtp.mailgun.org or smtp.gmail.com"
                    value={smtpSettings.smtpHost}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpHost: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Port
                  </label>
                  <Input
                    type="number"
                    placeholder="587, 465, or 25"
                    value={smtpSettings.smtpPort}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpPort: parseInt(e.target.value) || 587 })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Encryption Protocol
                  </label>
                  <select
                    value={smtpSettings.smtpEncryption}
                    onChange={(e) =>
                      setSmtpSettings({ ...smtpSettings, smtpEncryption: e.target.value as 'tls' | 'ssl' | 'none' })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="tls">STARTTLS / TLS (Recommended for port 587)</option>
                    <option value="ssl">SSL (Port 465)</option>
                    <option value="none">None (Plaintext)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Username / API Key
                  </label>
                  <Input
                    placeholder="postmaster@yourdomain.com"
                    value={smtpSettings.smtpUsername}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpUsername: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Password / Secret
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••••••"
                      value={smtpSettings.smtpPassword || ''}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Sender "From Email"
                  </label>
                  <Input
                    placeholder="notifications@plutowallet.app"
                    value={smtpSettings.fromEmail}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Sender Display Name
                  </label>
                  <Input
                    placeholder="Pluto Wallet Security"
                    value={smtpSettings.fromName}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Reply-To Address
                  </label>
                  <Input
                    placeholder="support@plutowallet.app"
                    value={smtpSettings.replyTo || ''}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, replyTo: e.target.value })}
                  />
                </div>
              </div>

              {/* Test Outgoing Connection Bar */}
              <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-purple-900 dark:text-purple-300">Test Outgoing Mail Connection</p>
                  <p className="text-xs text-purple-700/80 dark:text-purple-400">
                    Verify credentials and dispatch an instant test email.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Test recipient email..."
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="h-9 w-48 text-xs bg-white dark:bg-gray-800"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isTestingSmtp}
                    onClick={handleTestSmtp}
                    className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 text-xs"
                  >
                    {isTestingSmtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Test SMTP</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Incoming Mail Card (IMAP / POP3) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Incoming Mail Server (IMAP / POP3)</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Configure server to receive customer email replies and support requests into your Admin Inbox
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Auto Fetch</span>
                  <Switch
                    checked={smtpSettings.autoFetchEnabled}
                    onCheckedChange={(val) => setSmtpSettings({ ...smtpSettings, autoFetchEnabled: val })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Incoming Protocol
                  </label>
                  <select
                    value={smtpSettings.incomingProtocol}
                    onChange={(e) =>
                      setSmtpSettings({ ...smtpSettings, incomingProtocol: e.target.value as 'imap' | 'pop3' })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="imap">IMAP (Recommended - Multi-Device Synced)</option>
                    <option value="pop3">POP3 (Standard Mailbox Download)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Incoming Server Host
                  </label>
                  <Input
                    placeholder="imap.mailgun.org or imap.gmail.com"
                    value={smtpSettings.incomingHost}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, incomingHost: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Incoming Port
                  </label>
                  <Input
                    type="number"
                    placeholder="993 or 995"
                    value={smtpSettings.incomingPort}
                    onChange={(e) =>
                      setSmtpSettings({ ...smtpSettings, incomingPort: parseInt(e.target.value) || 993 })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Security Protocol
                  </label>
                  <select
                    value={smtpSettings.incomingEncryption}
                    onChange={(e) =>
                      setSmtpSettings({ ...smtpSettings, incomingEncryption: e.target.value as 'ssl' | 'tls' | 'none' })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="ssl">SSL / TLS (Port 993/995)</option>
                    <option value="tls">STARTTLS</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Username / Email
                  </label>
                  <Input
                    placeholder="support@plutowallet.app"
                    value={smtpSettings.incomingUsername}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, incomingUsername: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showIncomingPassword ? 'text' : 'password'}
                      placeholder="••••••••••••••••"
                      value={smtpSettings.incomingPassword || ''}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, incomingPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowIncomingPassword(!showIncomingPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showIncomingPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Fetch incoming test */}
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-300">Poll Incoming Mailbox</p>
                  <p className="text-xs text-blue-700/80 dark:text-blue-400">
                    Last polled: {smtpSettings.lastFetchedAt ? new Date(smtpSettings.lastFetchedAt).toLocaleString() : 'Never'}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isFetchingMail}
                  onClick={handleFetchIncomingMail}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingMail ? 'animate-spin' : ''}`} />
                  <span>Fetch Mails Now</span>
                </Button>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setSubTab('inbox')}>
                Back to Messages
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px]">
                Save All Mail Settings
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Message Details Modal */}
      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(selectedMessage.category)}
                  {getChannelBadge(selectedMessage.channel)}
                  <span className="text-xs text-gray-400">
                    {new Date(selectedMessage.timestamp).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  {selectedMessage.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl">
              <div>
                <p className="text-gray-400 font-medium">From:</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {selectedMessage.sender.name} ({selectedMessage.sender.email})
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">To:</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {selectedMessage.recipientName} ({selectedMessage.recipientEmail})
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Direction:</p>
                <p className="font-semibold text-gray-900 dark:text-white capitalize mt-0.5">
                  {selectedMessage.direction}
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Delivery Status:</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize mt-0.5">
                  {selectedMessage.status}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Message Content</p>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono">
                {selectedMessage.body}
              </div>
            </div>

            {selectedMessage.metadata && (
              <div className="text-[11px] text-gray-400 space-y-1">
                {selectedMessage.metadata.smtpServer && (
                  <p>Relayed via: {selectedMessage.metadata.smtpServer}</p>
                )}
                {selectedMessage.metadata.inAppNotificationId && (
                  <p>In-App Notification ID: {selectedMessage.metadata.inAppNotificationId}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  messageService.deleteMessage(selectedMessage.id);
                  loadAllData();
                  setSelectedMessage(null);
                }}
                className="flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Message</span>
              </Button>

              <div className="flex items-center gap-2">
                {selectedMessage.direction === 'incoming' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setComposeRecipient(selectedMessage.recipientId || 'all');
                      setComposeSubject(`Re: ${selectedMessage.subject}`);
                      setSubTab('compose');
                      setSelectedMessage(null);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reply to User</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedMessage(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
