/**
 * ============================================================================
 * PLUTO WALLET - LIVE CHAT & HUMAN-IN-THE-LOOP (HITL) BOT SERVICE
 * ============================================================================
 * 
 * Provides real-time messaging, intelligent automated crypto assistant replies,
 * automatic escalation to human administrators when the bot cannot resolve
 * the query or when the user requests an agent, and WhatsApp-style state syncing.
 * ============================================================================
 */

import dataService from './dataService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  is_automated?: boolean;
  is_escalation?: boolean;
}

export interface LiveChatSession {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  status: 'active' | 'escalated' | 'resolved' | 'closed';
  botEnabled: boolean;
  needsHuman: boolean;
  assignedAgent?: string;
  unreadCountAdmin: number;
  unreadCountUser: number;
  lastMessage?: string;
  lastSender?: 'user' | 'bot' | 'admin';
  created: string;
  updated: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'pluto_live_chats';

// Smart crypto assistant responses
const KNOWLEDGE_BASE: { keywords: string[]; answer: string; followUps?: string[] }[] = [
  {
    keywords: ['deposit', 'how to deposit', 'fund', 'add money', 'receive'],
    answer: `To deposit funds into your Pluto Wallet:\n\n1. Go to the **Receive** screen from the navigation or home dashboard.\n2. Select the cryptocurrency you want to deposit (BTC, ETH, SOL, BNB, USDT).\n3. Copy your unique deposit address or scan the QR code using your sending wallet.\n4. Ensure you select the matching blockchain network before sending. Confirmations typically take 1–10 minutes depending on network congestion.`,
    followUps: ['Check deposit gas fee', 'View supported networks', 'Speak with human agent']
  },
  {
    keywords: ['gas fee', 'gas', 'network fee', 'usdt fee', 'why need gas', 'fee deposit'],
    answer: `Gas Fee Information:\n\nWhen sending or swapping tokens (such as USDT), the underlying blockchain requires a network fee ("gas") to process the transaction. You need a small balance of the native network asset (e.g., ETH for Ethereum USDT, or BNB for BNB Chain) to pay the validator gas fee. You can deposit the required gas fee asset directly to your wallet address anytime.`,
    followUps: ['How to deposit gas fee', 'What are withdrawal fees?', 'Speak with human agent']
  },
  {
    keywords: ['withdraw', 'withdrawal', 'cash out', 'send out', 'transfer out'],
    answer: `To make a withdrawal:\n\n1. Click **Send** on the home dashboard or asset page.\n2. Choose the asset you wish to withdraw and enter the destination wallet address.\n3. Enter the amount. You will see a transparent breakdown including the destination address, network fee, and processing fee.\n4. Verify details and confirm. All transactions are broadcast directly to the blockchain.`,
    followUps: ['What are withdrawal fees?', 'Withdrawal pending time', 'Speak with human agent']
  },
  {
    keywords: ['kyc', 'verify', 'verification', 'tier', 'id card', 'passport', 'limits'],
    answer: `Pluto Wallet KYC Verification:\n\n• **Tier 1 (Basic)**: Available immediately upon registration.\n• **Tier 2 (Full Verification)**: Submit your government-issued ID (Passport, National ID, or Driver's License) and a quick selfie in the **Security & KYC** section to unlock unrestricted withdrawal limits ($500,000/day).\n• Reviews are processed in 5–15 minutes during standard operational hours.`,
    followUps: ['Check KYC review status', 'How to submit documents', 'Speak with human agent']
  },
  {
    keywords: ['seed phrase', 'recovery phrase', 'private key', 'mnemonic', 'backup', 'lost phone'],
    answer: `Security & Seed Phrase Safety:\n\n• Your 12-word recovery phrase is the master key to your funds. Pluto uses non-custodial client-side AES-256 encryption.\n• Pluto staff will **NEVER** ask for your seed phrase or private keys under any circumstances.\n• Store your 12 words offline on paper or a hardware backup. Never screenshot or share it online.`,
    followUps: ['How to enable 2FA', 'Account security tips', 'Speak with human agent']
  },
  {
    keywords: ['swap', 'trade', 'exchange', 'convert', 'slippage'],
    answer: `Instant Token Swaps:\n\n• Navigate to the **Swap** tab in your wallet.\n• Select the token pair you want to exchange (e.g. BTC to USDT, or ETH to SOL).\n• Pluto scans multi-chain decentralized liquidity pools to secure the lowest slippage with zero hidden spreads.`,
    followUps: ['How to deposit funds', 'Swap fees explanation', 'Speak with human agent']
  },
  {
    keywords: ['fee', 'fees', 'charges', 'rates', 'percentage'],
    answer: `Pluto Wallet Fee Structure:\n\n• Deposits: 0% Pluto fee (standard blockchain network miners fee only).\n• Swaps: Transparent dynamic liquidity pool fee.\n• Withdrawals: Displayed explicitly before confirmation on the transaction summary screen.`,
    followUps: ['How to deposit gas fee', 'Speak with human agent']
  }
];

// Escalation trigger keywords indicating user wants human agent
const HUMAN_ESCALATION_KEYWORDS = [
  'human',
  'agent',
  'representative',
  'operator',
  'real person',
  'speak to someone',
  'talk to someone',
  'talk to human',
  'speak with human',
  'customer care',
  'support person',
  'manager',
  'complaint',
  'fraud',
  'stolen',
  'hacked',
  'stuck transaction',
  'lost money',
  'scam'
];

export const liveChatService = {
  /**
   * Get all live chat sessions
   */
  getLiveChats(): LiveChatSession[] {
    try {
      const raw = dataService.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((chat: any) => ({
            ...chat,
            botEnabled: chat.botEnabled !== false,
            needsHuman: !!chat.needsHuman,
            unreadCountUser: typeof chat.unreadCountUser === 'number' ? chat.unreadCountUser : 1,
            unreadCountAdmin: typeof chat.unreadCountAdmin === 'number' ? chat.unreadCountAdmin : 0,
            messages: Array.isArray(chat.messages) ? chat.messages : []
          }));
        }
      }
    } catch (e) {
      console.warn('[LiveChatService] Error reading local chats:', e);
    }
    return [];
  },

  /**
   * Sync chats from Supabase
   */
  async syncFromCloud(): Promise<LiveChatSession[]> {
    if (!isSupabaseConfigured()) {
      return this.getLiveChats();
    }

    try {
      const { data: remoteChats, error } = await supabase.from('live_chats').select('*');
      if (!error && remoteChats && remoteChats.length > 0) {
        const mapped: LiveChatSession[] = remoteChats.map(r => ({
          id: r.id,
          userId: r.user_id || r.userId || '',
          userEmail: r.user_email || r.userEmail || '',
          userName: r.user_name || r.userName || 'User',
          userPhone: r.user_phone || r.userPhone || '',
          status: r.status || 'active',
          botEnabled: r.bot_enabled !== undefined ? !!r.bot_enabled : true,
          needsHuman: r.needs_human !== undefined ? !!r.needs_human : (r.status === 'escalated'),
          assignedAgent: r.assigned_agent || r.assignedAgent,
          unreadCountAdmin: r.unread_count_admin || 0,
          unreadCountUser: r.unread_count_user || 0,
          lastMessage: r.last_message || '',
          lastSender: r.last_sender || 'user',
          created: r.created_at || r.created || new Date().toISOString(),
          updated: r.updated_at || r.updated || new Date().toISOString(),
          messages: Array.isArray(r.messages) ? r.messages : []
        }));

        this.persistLocal(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[LiveChatService] Cloud sync fallback:', err);
    }

    return this.getLiveChats();
  },

  /**
   * Save chats locally and to cloud
   */
  async saveLiveChats(chats: LiveChatSession[]): Promise<void> {
    this.persistLocal(chats);

    if (isSupabaseConfigured()) {
      try {
        // Persist to pluto_kv_store
        await supabase.from('pluto_kv_store').upsert({
          key: STORAGE_KEY,
          value: chats
        });

        // Upsert into dedicated live_chats table if exists
        for (const chat of chats) {
          try {
            await supabase.from('live_chats').upsert({
              id: chat.id,
              user_id: chat.userId,
              user_email: chat.userEmail,
              user_name: chat.userName,
              messages: chat.messages,
              status: chat.status,
              created_at: chat.created,
              updated_at: chat.updated
            });
          } catch {}
        }
      } catch (err) {
        console.warn('[LiveChatService] Cloud save warning:', err);
      }
    }
  },

  /**
   * Persist locally and dispatch custom event
   */
  persistLocal(chats: LiveChatSession[]): void {
    const jsonStr = JSON.stringify(chats);
    dataService.setItem(STORAGE_KEY, jsonStr);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, jsonStr);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pluto_live_chats_updated', {
        detail: { chats }
      }));
    }
  },

  /**
   * Get or create a live chat conversation for a user
   */
  getOrCreateUserChat(walletData: {
    id: string;
    email?: string;
    username?: string;
    phone?: string;
  }): LiveChatSession {
    const chats = this.getLiveChats();
    const existing = chats.find(c => c.userId === walletData.id);

    if (existing) {
      return existing;
    }

    const newChat: LiveChatSession = {
      id: `CHT-${Date.now()}`,
      userId: walletData.id,
      userEmail: walletData.email || 'user@example.com',
      userName: walletData.username || walletData.email?.split('@')[0] || 'Pluto User',
      userPhone: walletData.phone || '',
      status: 'active',
      botEnabled: true,
      needsHuman: false,
      unreadCountAdmin: 0,
      unreadCountUser: 1, // Start with 1 so the welcome message appears as a new message notification
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      messages: [
        {
          id: `msg_welcome_${Date.now()}`,
          sender: 'bot',
          senderName: 'Pluto AI Assistant',
          message: `Hello! 👋 Welcome to Pluto Support. I'm your 24/7 automated assistant.\n\nI can help you with deposits, gas fees, withdrawals, KYC verification, and security. What can I assist you with today?`,
          timestamp: new Date().toISOString(),
          is_automated: true
        }
      ]
    };

    newChat.lastMessage = newChat.messages[0].message;
    newChat.lastSender = 'bot';

    chats.unshift(newChat);
    this.saveLiveChats(chats);
    return newChat;
  },

  /**
   * Send a message from either user or admin
   */
  async sendMessage(params: {
    chatId: string;
    message: string;
    sender: 'user' | 'admin';
    senderName: string;
  }): Promise<{ chat: LiveChatSession; isEscalated?: boolean }> {
    const chats = this.getLiveChats();
    const chatIndex = chats.findIndex(c => c.id === params.chatId);

    if (chatIndex === -1) {
      throw new Error('Chat session not found');
    }

    const chat = { ...chats[chatIndex] };
    const now = new Date().toISOString();

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sender: params.sender,
      senderName: params.senderName,
      message: params.message.trim(),
      timestamp: now,
      status: 'sent'
    };

    chat.messages = [...chat.messages, newMsg];
    chat.lastMessage = newMsg.message;
    chat.lastSender = params.sender;
    chat.updated = now;

    if (params.sender === 'user') {
      chat.unreadCountAdmin = (chat.unreadCountAdmin || 0) + 1;
      chat.unreadCountUser = 0;
    } else {
      chat.unreadCountUser = (chat.unreadCountUser || 0) + 1;
      // Admin response automatically acknowledges human handling
      chat.assignedAgent = params.senderName;
      if (chat.status === 'escalated') {
        chat.status = 'active';
      }
    }

    chats[chatIndex] = chat;
    await this.saveLiveChats(chats);

    // If user sent message and bot is enabled, process automated reply / HITL transfer
    let isEscalated = false;
    if (params.sender === 'user') {
      isEscalated = await this.evaluateAndReply(chat.id, params.message);
    }

    return { chat: this.getLiveChats().find(c => c.id === chat.id) || chat, isEscalated };
  },

  /**
   * Automated bot evaluation and reply
   */
  async evaluateAndReply(chatId: string, userText: string): Promise<boolean> {
    const chats = this.getLiveChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat || chat.botEnabled === false) return false;

    const lower = userText.toLowerCase().trim();

    // Check if user requested human escalation
    const isEscalationRequest = HUMAN_ESCALATION_KEYWORDS.some(kw => lower.includes(kw));

    if (isEscalationRequest) {
      // Transition to Human-In-The-Loop (HITL)
      chat.needsHuman = true;
      chat.status = 'escalated';
      chat.updated = new Date().toISOString();

      const escalationMessage: ChatMessage = {
        id: `msg_esc_${Date.now()}`,
        sender: 'bot',
        senderName: 'Pluto AI Assistant',
        message: `I understand you would like to speak with a human support specialist. 🛡️\n\nI have transferred your request to our on-duty administrative team. An agent has been alerted and will join this live chat momentarily.\n\nPlease feel free to provide your transaction hash, asset symbol, or any additional context in the meantime.`,
        timestamp: new Date().toISOString(),
        is_automated: true,
        is_escalation: true
      };

      chat.messages.push(escalationMessage);
      chat.lastMessage = escalationMessage.message;
      chat.lastSender = 'bot';
      chat.unreadCountUser = (chat.unreadCountUser || 0) + 1;

      await this.saveLiveChats(chats);
      return true;
    }

    // If already escalated to human and user is providing more details
    if (chat.needsHuman) {
      // Just keep human alerted, optional acknowledgement
      chat.updated = new Date().toISOString();
      await this.saveLiveChats(chats);
      return true;
    }

    // Try finding answer in knowledge base
    let matchedAnswer: string | null = null;
    for (const kb of KNOWLEDGE_BASE) {
      if (kb.keywords.some(kw => lower.includes(kw))) {
        matchedAnswer = kb.answer;
        break;
      }
    }

    // If external API key is provided, try LLM generation
    const apiKey = import.meta.env.VITE_AI_CHAT_API_KEY;
    if (!matchedAnswer && apiKey && apiKey.trim()) {
      try {
        matchedAnswer = await this.queryExternalLLM(apiKey, userText);
      } catch (e) {
        console.warn('[LiveChatService] External LLM error, falling back:', e);
      }
    }

    // Default intelligent response if not directly matched
    if (!matchedAnswer) {
      matchedAnswer = `Thank you for your message! I'm here to assist with Pluto Wallet features.\n\nCould you clarify if your question is related to:\n1. 📥 **Depositing funds or gas fees**\n2. 📤 **Sending or withdrawing crypto**\n3. 🪪 **Identity verification (KYC)**\n4. 🔐 **Wallet security & recovery**\n\nOr click **"Human"** at any time to connect with a live support agent.`;
    }

    // Add bot reply to conversation
    const botReply: ChatMessage = {
      id: `msg_bot_${Date.now()}`,
      sender: 'bot',
      senderName: 'Pluto AI Assistant',
      message: matchedAnswer,
      timestamp: new Date().toISOString(),
      is_automated: true
    };

    chat.messages.push(botReply);
    chat.lastMessage = botReply.message;
    chat.lastSender = 'bot';
    chat.unreadCountUser = (chat.unreadCountUser || 0) + 1;
    chat.updated = new Date().toISOString();

    await this.saveLiveChats(chats);
    return false;
  },

  /**
   * Query external LLM provider if configured by user
   */
  async queryExternalLLM(apiKey: string, prompt: string): Promise<string> {
    const provider = import.meta.env.VITE_AI_CHAT_PROVIDER || 'openai';
    const model = import.meta.env.VITE_AI_CHAT_MODEL || 'gpt-4o-mini';

    const systemPrompt = `You are the official Pluto Multi-Chain Wallet automated support assistant. Provide concise, friendly, and accurate answers about cryptocurrency wallet operations (BTC, ETH, SOL, BNB, USDT), non-custodial security, gas fees, KYC tiers, and blockchain transactions. If you cannot solve an issue or if user funds seem compromised, tell the user you are transferring them to a live support agent.`;

    if (provider === 'openai' || provider === 'openrouter' || provider === 'grok') {
      const endpoint = provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : provider === 'grok'
        ? 'https://api.x.ai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: 350,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API returned status ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    throw new Error(`Unsupported provider: ${provider}`);
  },

  /**
   * Admin takes over conversation from bot
   */
  async takeOverChat(chatId: string, adminName: string): Promise<LiveChatSession> {
    const chats = this.getLiveChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) throw new Error('Chat not found');

    chat.botEnabled = false;
    chat.needsHuman = false;
    chat.assignedAgent = adminName;
    chat.status = 'active';
    chat.updated = new Date().toISOString();

    const systemNotice: ChatMessage = {
      id: `sys_${Date.now()}`,
      sender: 'admin',
      senderName: 'System',
      message: `Support specialist ${adminName} has joined the conversation.`,
      timestamp: new Date().toISOString(),
      is_automated: true
    };
    chat.messages.push(systemNotice);

    await this.saveLiveChats(chats);
    return chat;
  },

  /**
   * Admin returns conversation back to bot
   */
  async handBackToBot(chatId: string): Promise<LiveChatSession> {
    const chats = this.getLiveChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) throw new Error('Chat not found');

    chat.botEnabled = true;
    chat.needsHuman = false;
    chat.status = 'active';
    chat.updated = new Date().toISOString();

    const systemNotice: ChatMessage = {
      id: `sys_${Date.now()}`,
      sender: 'bot',
      senderName: 'System',
      message: `Pluto AI Assistant has resumed handling this conversation.`,
      timestamp: new Date().toISOString(),
      is_automated: true
    };
    chat.messages.push(systemNotice);

    await this.saveLiveChats(chats);
    return chat;
  },

  /**
   * Mark chat as resolved
   */
  async markResolved(chatId: string): Promise<LiveChatSession> {
    const chats = this.getLiveChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) throw new Error('Chat not found');

    chat.status = 'resolved';
    chat.needsHuman = false;
    chat.unreadCountAdmin = 0;
    chat.unreadCountUser = 0;
    chat.updated = new Date().toISOString();

    await this.saveLiveChats(chats);
    return chat;
  },

  /**
   * Clear unread counter for user or admin
   */
  async markRead(chatId: string, forWhom: 'admin' | 'user'): Promise<void> {
    const chats = this.getLiveChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    if (forWhom === 'admin') {
      chat.unreadCountAdmin = 0;
    } else {
      chat.unreadCountUser = 0;
    }
    await this.saveLiveChats(chats);
  }
};

export default liveChatService;
