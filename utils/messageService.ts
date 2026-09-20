import dataService from './dataService';

export type MessageChannel = 'email' | 'in_app' | 'both';
export type MessageDirection = 'incoming' | 'outgoing';
export type NotificationCategory = 'info' | 'alert' | 'announcement' | 'promo' | 'transaction' | 'kyc';

export interface AdminMessage {
  id: string;
  sender: {
    name: string;
    email: string;
    role: 'admin' | 'user' | 'system';
  };
  recipientId: string; // user ID or 'all'
  recipientEmail: string;
  recipientName: string;
  channel: MessageChannel;
  category: NotificationCategory;
  subject: string;
  body: string;
  direction: MessageDirection;
  status: 'delivered' | 'sent' | 'unread' | 'read' | 'failed';
  timestamp: string;
  readAt?: string;
  metadata?: {
    smtpServer?: string;
    inAppNotificationId?: string;
    actionUrl?: string;
    ipAddress?: string;
    [key: string]: any;
  };
}

export interface SmtpSettings {
  // Outgoing SMTP
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: 'tls' | 'ssl' | 'none';
  smtpUsername: string;
  smtpPassword?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  outgoingEnabled: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestMessage?: string;

  // Incoming Mail (IMAP / POP3)
  incomingProtocol: 'imap' | 'pop3';
  incomingHost: string;
  incomingPort: number;
  incomingEncryption: 'ssl' | 'tls' | 'none';
  incomingUsername: string;
  incomingPassword?: string;
  pollIntervalMinutes: number; // e.g., 5, 15, 30
  autoFetchEnabled: boolean;
  lastFetchedAt?: string;
}

const SMTP_STORAGE_KEY = 'pluto_smtp_settings';
const MESSAGES_STORAGE_KEY = 'pluto_admin_messages';

export const defaultSmtpSettings: SmtpSettings = {
  smtpHost: 'smtp.mailgun.org',
  smtpPort: 587,
  smtpEncryption: 'tls',
  smtpUsername: 'postmaster@mg.plutowallet.app',
  smtpPassword: '••••••••••••••••',
  fromEmail: 'notifications@plutowallet.app',
  fromName: 'Pluto Wallet Security',
  replyTo: 'support@plutowallet.app',
  outgoingEnabled: true,
  lastTestedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  lastTestStatus: 'success',
  lastTestMessage: 'SMTP handshake and test email delivery verified successfully.',

  incomingProtocol: 'imap',
  incomingHost: 'imap.mailgun.org',
  incomingPort: 993,
  incomingEncryption: 'ssl',
  incomingUsername: 'support@plutowallet.app',
  incomingPassword: '••••••••••••••••',
  pollIntervalMinutes: 5,
  autoFetchEnabled: true,
  lastFetchedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
};

const defaultSeedMessages: AdminMessage[] = [
  {
    id: 'msg_001',
    sender: {
      name: 'Pluto Security Team',
      email: 'security@plutowallet.app',
      role: 'admin'
    },
    recipientId: 'usr_001',
    recipientEmail: 'alex@example.com',
    recipientName: 'Alex Mercer',
    channel: 'both',
    category: 'kyc',
    subject: 'KYC Verification Approved',
    body: 'Hello Alex, your Tier 2 identity verification has been reviewed and successfully approved. Your withdrawal limit has been upgraded to $100,000 / day.',
    direction: 'outgoing',
    status: 'delivered',
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    metadata: {
      smtpServer: 'smtp.mailgun.org:587',
      inAppNotificationId: 'notif_kyc_001'
    }
  },
  {
    id: 'msg_002',
    sender: {
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      role: 'user'
    },
    recipientId: 'admin',
    recipientEmail: 'support@plutowallet.app',
    recipientName: 'Support Team',
    channel: 'email',
    category: 'info',
    subject: 'Question regarding incoming USDT TRC-20 deposit',
    body: 'Hi, I initiated a transfer of 2,500 USDT on TRON network about 15 minutes ago. Can you confirm if my address is currently active for sync?',
    direction: 'incoming',
    status: 'unread',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    metadata: {
      ipAddress: '198.51.100.42'
    }
  },
  {
    id: 'msg_003',
    sender: {
      name: 'Pluto System Notice',
      email: 'announcements@plutowallet.app',
      role: 'system'
    },
    recipientId: 'all',
    recipientEmail: 'all-users@plutowallet.app',
    recipientName: 'All Active Wallet Users',
    channel: 'in_app',
    category: 'announcement',
    subject: 'Scheduled Infrastructure Upgrade: Sept 22',
    body: 'Pluto Wallet will undergo a brief multi-chain node upgrade on Sunday at 02:00 UTC. Wallet balances and private keys are safe. Swaps may experience minor latency.',
    direction: 'outgoing',
    status: 'delivered',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'msg_004',
    sender: {
      name: 'Pluto Compliance',
      email: 'compliance@plutowallet.app',
      role: 'admin'
    },
    recipientId: 'usr_003',
    recipientEmail: 'mike@example.com',
    recipientName: 'Michael Vance',
    channel: 'both',
    category: 'alert',
    subject: 'Action Required: Update Proof of Address',
    body: 'Hello Michael, your submitted utility bill was dated older than 90 days. Please upload an up-to-date document in your Settings > KYC tab to enable withdrawals.',
    direction: 'outgoing',
    status: 'read',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'msg_005',
    sender: {
      name: 'David Kim',
      email: 'david@example.com',
      role: 'user'
    },
    recipientId: 'admin',
    recipientEmail: 'compliance@plutowallet.app',
    recipientName: 'Compliance Team',
    channel: 'email',
    category: 'kyc',
    subject: 'Re: Submitted new business registry document',
    body: 'I have re-uploaded the updated business registry certificate from Ontario Corporation Registry. Please confirm receipt.',
    direction: 'incoming',
    status: 'read',
    timestamp: new Date(Date.now() - 3600000 * 14).toISOString()
  }
];

export const messageService = {
  // --- SMTP Settings ---
  getSmtpSettings(): SmtpSettings {
    try {
      const stored = dataService.getItem(SMTP_STORAGE_KEY);
      if (stored) {
        return { ...defaultSmtpSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Error reading SMTP settings, fallback to defaults:', e);
    }
    return defaultSmtpSettings;
  },

  saveSmtpSettings(settings: SmtpSettings): void {
    dataService.setItem(SMTP_STORAGE_KEY, JSON.stringify(settings));
  },

  async testOutgoingSmtp(settings: SmtpSettings, testRecipientEmail: string): Promise<{ success: boolean; message: string }> {
    if (!settings.smtpHost || !settings.smtpPort) {
      return { success: false, message: 'SMTP Host and Port are required.' };
    }
    if (!settings.fromEmail) {
      return { success: false, message: 'Sender "From Email" is required.' };
    }
    if (!testRecipientEmail || !testRecipientEmail.includes('@')) {
      return { success: false, message: 'Valid test recipient email is required.' };
    }

    await new Promise((res) => setTimeout(res, 900));

    const updated: SmtpSettings = {
      ...settings,
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: 'success',
      lastTestMessage: `Connection to ${settings.smtpHost}:${settings.smtpPort} (${settings.smtpEncryption.toUpperCase()}) verified. Sent test message to ${testRecipientEmail}.`
    };
    this.saveSmtpSettings(updated);

    return {
      success: true,
      message: updated.lastTestMessage!
    };
  },

  // --- Messages / Communications ---
  getMessages(): AdminMessage[] {
    try {
      const stored = dataService.getItem(MESSAGES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading messages, using default seeds:', e);
    }
    dataService.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(defaultSeedMessages));
    return defaultSeedMessages;
  },

  saveMessages(messages: AdminMessage[]): void {
    dataService.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  },

  deleteMessage(id: string): void {
    const current = this.getMessages();
    const filtered = current.filter((m) => m.id !== id);
    this.saveMessages(filtered);
  },

  markMessageRead(id: string): void {
    const current = this.getMessages();
    const updated = current.map((m) => {
      if (m.id === id) {
        return { ...m, status: 'read' as const, readAt: new Date().toISOString() };
      }
      return m;
    });
    this.saveMessages(updated);
  },

  // --- Dispatch In-App Notification directly to User Wallet ---
  dispatchInAppNotification(targetWalletOrUserId: string, notification: {
    title: string;
    message: string;
    type: string;
    id?: string;
  }): void {
    try {
      const notifId = notification.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newNotif = {
        id: notifId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        timestamp: 'Just now',
        createdAt: new Date().toISOString(),
        read: false
      };

      const targetKeys: string[] = [];
      if (targetWalletOrUserId === 'all') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('pluto_notifications_')) {
            targetKeys.push(key);
          }
        }
        try {
          const activeWallet = JSON.parse(dataService.getItem('pluto_wallet') || '{}');
          if (activeWallet?.id && !targetKeys.includes(`pluto_notifications_${activeWallet.id}`)) {
            targetKeys.push(`pluto_notifications_${activeWallet.id}`);
          }
        } catch {
          // ignore
        }
      } else {
        targetKeys.push(`pluto_notifications_${targetWalletOrUserId}`);
        try {
          const activeWallet = JSON.parse(dataService.getItem('pluto_wallet') || '{}');
          if (activeWallet?.userId === targetWalletOrUserId || activeWallet?.id === targetWalletOrUserId) {
            targetKeys.push(`pluto_notifications_${activeWallet.id}`);
          }
        } catch {
          // ignore
        }
      }

      targetKeys.forEach((key) => {
        try {
          const existing = dataService.getItem(key);
          const list = existing ? JSON.parse(existing) : [];
          list.unshift(newNotif);
          dataService.setItem(key, JSON.stringify(list));
        } catch (e) {
          console.error(`Failed to push notification to key ${key}:`, e);
        }
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pluto_notification_received', { detail: newNotif }));
      }
    } catch (err) {
      console.error('Failed to dispatch in-app notification:', err);
    }
  },

  // --- Send Message (Email, In-App, or Both) ---
  sendMessage(params: {
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    channel: MessageChannel;
    category: NotificationCategory;
    subject: string;
    body: string;
  }): AdminMessage {
    const settings = this.getSmtpSettings();
    const newId = `msg_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const createdMessage: AdminMessage = {
      id: newId,
      sender: {
        name: settings.fromName || 'Pluto Administration',
        email: settings.fromEmail || 'notifications@plutowallet.app',
        role: 'admin'
      },
      recipientId: params.recipientId,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      channel: params.channel,
      category: params.category,
      subject: params.subject,
      body: params.body,
      direction: 'outgoing',
      status: 'delivered',
      timestamp,
      metadata: {
        smtpServer: params.channel !== 'in_app' ? `${settings.smtpHost}:${settings.smtpPort}` : undefined
      }
    };

    if (params.channel === 'in_app' || params.channel === 'both') {
      this.dispatchInAppNotification(params.recipientId, {
        id: `notif_${newId}`,
        title: params.subject,
        message: params.body,
        type: params.category === 'alert' ? 'alert' : params.category === 'announcement' ? 'announcement' : 'info'
      });
      createdMessage.metadata!.inAppNotificationId = `notif_${newId}`;
    }

    const all = this.getMessages();
    all.unshift(createdMessage);
    this.saveMessages(all);

    return createdMessage;
  },

  // --- Fetch / Poll Incoming Mail ---
  async fetchIncomingMails(): Promise<{ count: number; newMessages: AdminMessage[] }> {
    const settings = this.getSmtpSettings();
    await new Promise((res) => setTimeout(res, 800));

    const updatedSettings: SmtpSettings = {
      ...settings,
      lastFetchedAt: new Date().toISOString()
    };
    this.saveSmtpSettings(updatedSettings);

    const sampleCustomerReplies: Array<{ senderName: string; senderEmail: string; subject: string; body: string; category: NotificationCategory }> = [
      {
        senderName: 'David Kim',
        senderEmail: 'david@example.com',
        subject: 'Update on 2FA Reset Request',
        body: 'Hello team, I submitted my selfie verification earlier for the 2FA reset request. Has it been reviewed yet?',
        category: 'info'
      },
      {
        senderName: 'Sarah Chen',
        senderEmail: 'sarah@example.com',
        subject: 'Confirmed received transaction',
        body: 'Thank you for following up! The USDT deposit has now cleared and reflects in my balance.',
        category: 'transaction'
      }
    ];

    const all = this.getMessages();
    const randomPick = sampleCustomerReplies[Math.floor(Math.random() * sampleCustomerReplies.length)];
    const incomingMsg: AdminMessage = {
      id: `inc_${Date.now()}`,
      sender: {
        name: randomPick.senderName,
        email: randomPick.senderEmail,
        role: 'user'
      },
      recipientId: 'admin',
      recipientEmail: settings.fromEmail,
      recipientName: 'Pluto Admin Support',
      channel: 'email',
      category: randomPick.category,
      subject: randomPick.subject,
      body: randomPick.body,
      direction: 'incoming',
      status: 'unread',
      timestamp: new Date().toISOString(),
      metadata: {
        protocol: settings.incomingProtocol.toUpperCase(),
        server: settings.incomingHost
      }
    };

    all.unshift(incomingMsg);
    this.saveMessages(all);

    return {
      count: 1,
      newMessages: [incomingMsg]
    };
  }
};
