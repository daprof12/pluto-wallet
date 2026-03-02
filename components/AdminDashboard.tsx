import dataService from '../utils/dataService';
import { useState, useEffect } from 'react';
import { Users, DollarSign, Settings, FileText, ArrowLeft, Shield, Search, MoreVertical, Edit, Edit2, Trash, Lock, Unlock, Eye, EyeOff, Activity, Coins, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, RefreshCw, Check, Copy, Headphones, MessageCircle, Send, Phone, Mail, Clock, AlertCircle, CheckCircle, XCircle, User, LogOut, KeyRound, Moon, Sun, Database } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Logo from './Logo';
import { generateAllAddresses, generateAddressForCoin } from '../utils/addressGenerator';
import { validateAddress } from '../utils/addressValidation';
import { copyToClipboard } from '../utils/clipboard';
import EditFeeModal from './admin/EditFeeModal';
import { loadAssetConfig, saveAssetConfig, AssetConfig } from '../utils/assetConfig';
import { fetchCryptoPrices } from '../utils/priceService';
import { formatDecimal, formatPercentage, formatBalance } from '../utils/formatNumber';
import MigrationPanel from './MigrationPanel';

interface AdminDashboardProps {
  onBack: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function AdminDashboard({ onBack, darkMode = false, onToggleDarkMode }: AdminDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showEditBalance, setShowEditBalance] = useState(false);
  const [showUserActivities, setShowUserActivities] = useState(false);
  const [showTransactionReceipt, setShowTransactionReceipt] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showLoginDetailsEdit, setShowLoginDetailsEdit] = useState(false);
  const [editLoginData, setEditLoginData] = useState<any>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(false);
  const [editBalances, setEditBalances] = useState<any>({});
  const [editAddresses, setEditAddresses] = useState<any>({});
  const [addressErrors, setAddressErrors] = useState<{[key: string]: string}>({});
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [ticketResponse, setTicketResponse] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'in-progress' | 'resolved' | 'closed'>('all');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [showChatDetails, setShowChatDetails] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [notificationMethod, setNotificationMethod] = useState<'email' | 'sms' | 'both'>('both');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [newUser, setNewUser] = useState({
    email: '',
    phone: '',
    password: '',
    kyc_status: 'pending',
    balances: { BTC: '0', ETH: '0', SOL: '0', BNB: '0', USDT: '0' },
    addresses: { BTC: '', ETH: '', SOL: '', BNB: '', USDT: '' }
  });
  const [newUserAddressErrors, setNewUserAddressErrors] = useState<{[key: string]: string}>({});
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [adminProfile, setAdminProfile] = useState({
    name: 'Super Admin',
    email: 'admin@pluto.io',
    role: 'Super Admin'
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [editingFee, setEditingFee] = useState<{asset: string; data: any} | null>(null);
  const [copiedDepositAddresses, setCopiedDepositAddresses] = useState<{[key: string]: boolean}>({});

  // Coin Management States
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [editingCoin, setEditingCoin] = useState<any>(null);
  const [coinForm, setCoinForm] = useState({
    symbol: '',
    name: '',
    color: 'bg-blue-500',
    icon: '₿',
    logoUrl: '',
    coinGeckoId: ''
  });

  // Real-time price data from CoinGecko API
  const [prices, setPrices] = useState<{[key: string]: number}>({
    BTC: 45230.50,
    ETH: 3420.75,
    SOL: 98.32,
    BNB: 315.60,
    USDT: 1.00
  });

  const [priceChanges, setPriceChanges] = useState<{[key: string]: number}>({
    BTC: 2.4,
    ETH: -1.2,
    SOL: 5.8,
    BNB: 3.1,
    USDT: 0.0
  });

  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  // Asset configurations loaded from centralized config
  const [assetConfig, setAssetConfig] = useState<AssetConfig[]>(loadAssetConfig());

  // Persist asset config changes to localStorage
  useEffect(() => {
    saveAssetConfig(assetConfig);
  }, [assetConfig]);

  // Fetch real-time cryptocurrency prices from CoinGecko
  useEffect(() => {
    const updatePrices = async () => {
      setPricesLoading(true);
      try {
        const symbols = assetConfig.map(asset => asset.symbol);
        const priceData = await fetchCryptoPrices(symbols);
        
        // Update prices state
        const newPrices: {[key: string]: number} = {};
        const newPriceChanges: {[key: string]: number} = {};
        
        symbols.forEach(symbol => {
          if (priceData[symbol]) {
            newPrices[symbol] = priceData[symbol].usd;
            newPriceChanges[symbol] = priceData[symbol].usd_24h_change;
          }
        });
        
        setPrices(newPrices);
        setPriceChanges(newPriceChanges);
        setLastPriceUpdate(new Date());
        
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      } finally {
        setPricesLoading(false);
      }
    };

    // Fetch prices immediately on mount
    updatePrices();

    // Update prices every 60 seconds
    const interval = setInterval(updatePrices, 60000);

    return () => clearInterval(interval);
  }, [assetConfig]);

  // Load users from localStorage or use default mock data
  const loadUsers = () => {
    const storedUsers = dataService.getItem('pluto_admin_users');
    if (storedUsers) {
      return JSON.parse(storedUsers);
    }
    // Default mock users if no stored data
    return [
      {
        id: 'usr_001',
        email: 'john@example.com',
        phone: '+1234567890',
        kyc_status: 'verified',
        created_at: '2025-11-20T10:00:00Z',
        last_login: '2025-11-27T08:30:00Z',
        blocked: false,
        balances: { BTC: '0.5', ETH: '10.0', SOL: '50.0', BNB: '5.0', USDT: '5000.00' },
        addresses: { 
          BTC: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          ETH: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          SOL: '7YpJ5x9nE4kBYmJmGKZhCvXBAPngXzFqPmgvT8KJnKvH',
          BNB: 'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23',
          USDT: 'TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe'
        },
        password: 'hashed_password_123',
        passwordLastChanged: '2025-11-20T10:00:00Z',
        twoFactorAuth: {
          enabled: true,
          preferredMethod: 'passcode',
          passcode: '123456',
          biometricEnabled: false,
          biometricData: null,
          setupDate: '2025-11-20T10:00:00Z'
        },
        failedLoginAttempts: 0,
        accountLocked: false
      },
      {
        id: 'usr_002',
        email: 'sarah@example.com',
        phone: '+9876543210',
        kyc_status: 'pending',
        created_at: '2025-11-25T14:20:00Z',
        last_login: '2025-11-27T09:15:00Z',
        blocked: false,
        balances: { BTC: '0.1', ETH: '2.5', SOL: '15.0', BNB: '1.2', USDT: '1200.00' },
        addresses: { 
          BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          SOL: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          BNB: 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2',
          USDT: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9'
        },
        password: 'hashed_password_456',
        passwordLastChanged: '2025-11-25T14:20:00Z',
        twoFactorAuth: {
          enabled: true,
          preferredMethod: 'biometric',
          passcode: '789012',
          biometricEnabled: true,
          biometricData: 'simulated_biometric_hash_456',
          setupDate: '2025-11-25T14:20:00Z'
        },
        failedLoginAttempts: 0,
        accountLocked: false
      },
      {
        id: 'usr_003',
        email: 'mike@example.com',
        phone: '+1122334455',
        kyc_status: 'rejected',
        created_at: '2025-11-22T11:30:00Z',
        last_login: '2025-11-26T16:45:00Z',
        blocked: true,
        balances: { BTC: '0.05', ETH: '1.0', SOL: '5.0', BNB: '0.5', USDT: '500.00' },
        addresses: { 
          BTC: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          ETH: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
          SOL: '9aXQSfCGWdvJLTcCfmWyTbKhKGmEwDLUQnpWsYi4r5aA',
          BNB: 'bnb1jxfh2g85q3v0tdq56fnevx6xcxtcnhtsmcu64m',
          USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
        },
        password: 'hashed_password_789',
        passwordLastChanged: null,
        twoFactorAuth: {
          enabled: false,
          preferredMethod: null,
          passcode: null,
          biometricEnabled: false,
          biometricData: null,
          setupDate: null
        },
        failedLoginAttempts: 3,
        accountLocked: true
      }
    ];
  };

  const [users, setUsers] = useState(loadUsers());

  // Load fees from localStorage or use defaults
  const loadFees = () => {
    const storedFees = dataService.getItem('pluto_admin_fees');
    if (storedFees) {
      return JSON.parse(storedFees);
    }
    return {
      BTC: { 
        withdraw_fee: '0.0005', 
        percent: '0.5',
        deposit_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        deposit_enabled: true,
        gas_fee_enabled: true,
        gas_fee_type: 'fixed',
        gas_fee_fixed: '0.00001',
        gas_fee_percent: '0.1'
      },
      ETH: { 
        withdraw_fee: '0.003', 
        percent: '0.3',
        deposit_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        deposit_enabled: true,
        gas_fee_enabled: true,
        gas_fee_type: 'fixed',
        gas_fee_fixed: '0.0015',
        gas_fee_percent: '0.2'
      },
      SOL: { 
        withdraw_fee: '0.001', 
        percent: '0.2',
        deposit_address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
        deposit_enabled: true,
        gas_fee_enabled: true,
        gas_fee_type: 'fixed',
        gas_fee_fixed: '0.000005',
        gas_fee_percent: '0.15'
      },
      BNB: { 
        withdraw_fee: '0.002', 
        percent: '0.25',
        deposit_address: 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2',
        deposit_enabled: true,
        gas_fee_enabled: true,
        gas_fee_type: 'fixed',
        gas_fee_fixed: '0.0008',
        gas_fee_percent: '0.18'
      },
      USDT: { 
        withdraw_fee: '1.0', 
        percent: '0.1',
        deposit_address: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
        deposit_enabled: true,
        gas_fee_enabled: true,
        gas_fee_type: 'fixed',
        gas_fee_fixed: '1.5',
        gas_fee_percent: '0.25'
      }
    };
  };

  const [fees, setFees] = useState(loadFees());

  // Persist fees to localStorage whenever they change
  useEffect(() => {
    dataService.setItem('pluto_admin_fees', JSON.stringify(fees));
  }, [fees]);

  // Load user activities from localStorage or use default mock data
  const loadUserActivities = () => {
    const storedActivities = dataService.getItem('pluto_user_activities');
    if (storedActivities) {
      return JSON.parse(storedActivities);
    }
    // Default mock activities if no stored data
    return {
      'usr_001': [
        {
          id: 'txn_001',
          type: 'send',
          asset: 'ETH',
          amount: '0.5',
          timestamp: '2025-11-27T10:30:00Z',
          status: 'pending',
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          from: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          fee: '0.002',
          network: 'Ethereum Mainnet',
          confirmations: 0,
          requiredConfirmations: 12,
          notes: ''
        },
      {
        id: 'txn_002',
        type: 'receive',
        asset: 'BTC',
        amount: '0.05',
        timestamp: '2025-11-26T15:20:00Z',
        status: 'processing',
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        to: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        from: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        fee: '0.0005',
        network: 'Bitcoin Mainnet',
        confirmations: 3,
        requiredConfirmations: 6,
        notes: ''
      },
      {
        id: 'txn_003',
        type: 'swap',
        asset: 'SOL',
        amount: '10.0',
        toAsset: 'USDT',
        toAmount: '983.20',
        timestamp: '2025-11-25T09:15:00Z',
        status: 'completed',
        hash: '0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef',
        fee: '0.001',
        network: 'Solana Mainnet',
        confirmations: 32,
        requiredConfirmations: 32,
        notes: ''
      },
      {
        id: 'txn_004',
        type: 'buy',
        asset: 'ETH',
        amount: '2.0',
        timestamp: '2025-11-24T14:00:00Z',
        status: 'pending',
        hash: '0xdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210ab',
        paymentMethod: 'Credit Card',
        fiatAmount: '$6,841.50',
        fiatCurrency: 'USD',
        fee: '0.003',
        network: 'Ethereum Mainnet',
        notes: ''
      },
      {
        id: 'txn_005',
        type: 'deposit',
        asset: 'USDT',
        amount: '5000.00',
        timestamp: '2025-11-23T10:00:00Z',
        status: 'processing',
        hash: '0x321fedcba9876543210fedcba9876543210fedcba9876543210fedcba987654',
        to: 'TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe',
        from: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
        fee: '1.0',
        network: 'TRON (TRC20)',
        confirmations: 15,
        requiredConfirmations: 19,
        notes: ''
      }
    ],
    'usr_002': [
      {
        id: 'txn_006',
        type: 'swap',
        asset: 'BNB',
        amount: '0.5',
        toAsset: 'USDT',
        toAmount: '157.80',
        timestamp: '2025-11-27T11:00:00Z',
        status: 'completed',
        hash: '0xaaa111bbb222ccc333ddd444eee555fff666aaa777bbb888ccc999ddd000eee',
        fee: '0.002',
        network: 'BNB Smart Chain',
        confirmations: 15,
        requiredConfirmations: 15,
        notes: ''
      }
      ],
      'usr_003': []
    };
  };

  const [userActivities, setUserActivities] = useState<{[key: string]: any[]}>(loadUserActivities());

  const getUserActivities = (userId: string) => userActivities[userId] || [];
  
  // Update user activities and persist to localStorage
  const updateUserActivities = (userId: string, activities: any[]) => {
    const updatedActivities = {
      ...userActivities,
      [userId]: activities
    };
    setUserActivities(updatedActivities);
    dataService.setItem('pluto_user_activities', JSON.stringify(updatedActivities));
  };
  
  // Delete a specific transaction
  const handleDeleteTransaction = (userId: string, transactionId: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      const userTransactions = getUserActivities(userId);
      const updatedTransactions = userTransactions.filter(tx => tx.id !== transactionId);
      updateUserActivities(userId, updatedTransactions);
    }
  };
  
  // Update transaction status
  const handleUpdateTransactionStatus = (userId: string, transactionId: string, newStatus: string) => {
    const userTransactions = getUserActivities(userId);
    const updatedTransactions = userTransactions.map(tx => 
      tx.id === transactionId ? { ...tx, status: newStatus } : tx
    );
    updateUserActivities(userId, updatedTransactions);
  };

  // Calculate total balance in USD
  const calculateTotalBalance = (balances: any) => {
    let total = 0;
    Object.entries(balances).forEach(([asset, balance]) => {
      const price = prices[asset as keyof typeof prices] || 0;
      total += parseFloat(balance as string) * price;
    });
    return total;
  };

  // Calculate total platform assets
  const calculatePlatformAssets = () => {
    const totals: any = {};
    assetConfig.forEach(asset => {
      totals[asset.symbol] = {
        total: 0,
        users: 0,
        value: 0
      };
    });

    users.forEach(user => {
      Object.entries(user.balances).forEach(([asset, balance]) => {
        if (totals[asset]) {
          totals[asset].total += parseFloat(balance as string);
          if (parseFloat(balance as string) > 0) {
            totals[asset].users += 1;
          }
          totals[asset].value += parseFloat(balance as string) * prices[asset as keyof typeof prices];
        }
      });
    });

    return totals;
  };

  // Load support tickets from localStorage
  const [tickets, setTickets] = useState<any[]>([]);

  // Load tickets on mount and refresh periodically
  useEffect(() => {
    const loadTickets = () => {
      const storedTickets = dataService.getItem('pluto_support_tickets');
      if (storedTickets) {
        setTickets(JSON.parse(storedTickets));
      }
    };

    loadTickets();

    // Refresh every 2 seconds to sync with user submissions
    const interval = setInterval(loadTickets, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle ticket status change
  const handleTicketStatusChange = (ticketId: string, newStatus: string) => {
    const updatedTickets = tickets.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          status: newStatus,
          updated: new Date().toISOString()
        };
      }
      return ticket;
    });

    setTickets(updatedTickets);
    dataService.setItem('pluto_support_tickets', JSON.stringify(updatedTickets));

    // Update user's local tickets
    const ticket = updatedTickets.find(t => t.id === ticketId);
    if (ticket && ticket.userId) {
      const userTickets = JSON.parse(dataService.getItem(`pluto_tickets_${ticket.userId}`) || '[]');
      const userUpdatedTickets = userTickets.map((t: any) => t.id === ticketId ? ticket : t);
      dataService.setItem(`pluto_tickets_${ticket.userId}`, JSON.stringify(userUpdatedTickets));
    }
  };

  // Handle admin reply to ticket
  const handleAdminReply = (ticketId: string, message: string) => {
    if (!message.trim()) return;

    const updatedTickets = tickets.map(ticket => {
      if (ticket.id === ticketId) {
        const newMessage = {
          sender: 'admin',
          senderName: 'Support Team',
          message: message.trim(),
          timestamp: new Date().toISOString()
        };

        return {
          ...ticket,
          updated: new Date().toISOString(),
          messages: [...ticket.messages, newMessage]
        };
      }
      return ticket;
    });

    setTickets(updatedTickets);
    dataService.setItem('pluto_support_tickets', JSON.stringify(updatedTickets));

    // Update user's local tickets
    const ticket = updatedTickets.find(t => t.id === ticketId);
    if (ticket && ticket.userId) {
      const userTickets = JSON.parse(dataService.getItem(`pluto_tickets_${ticket.userId}`) || '[]');
      const userUpdatedTickets = userTickets.map((t: any) => t.id === ticketId ? ticket : t);
      dataService.setItem(`pluto_tickets_${ticket.userId}`, JSON.stringify(userUpdatedTickets));
    }

    setTicketResponse('');
  };

  // Load live chats from localStorage
  const [chats, setChats] = useState<any[]>([]);
  const [chatStatusFilter, setChatStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');

  // Load chats from localStorage
  useEffect(() => {
    const loadChats = () => {
      const storedChats = dataService.getItem('pluto_live_chats');
      if (storedChats) {
        setChats(JSON.parse(storedChats));
      }
    };

    loadChats();
    
    // Auto-refresh chats every 2 seconds
    const interval = setInterval(loadChats, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load audit logs from localStorage or use defaults
  const loadAuditLogs = () => {
    const storedLogs = dataService.getItem('pluto_admin_audit_logs');
    if (storedLogs) {
      return JSON.parse(storedLogs);
    }
    return [
      {
        id: 1,
        admin: 'admin@pluto.io',
        action: 'User Balance Adjustment',
        details: 'Increased ETH balance for usr_001 by 5.0',
        timestamp: '2025-11-27T10:30:00Z',
        ip: '192.168.1.1'
      },
      {
        id: 2,
        admin: 'support@pluto.io',
        action: 'User Blocked',
        details: 'Blocked user usr_003 - Suspicious activity',
        timestamp: '2025-11-27T09:15:00Z',
        ip: '192.168.1.2'
      },
      {
        id: 3,
        admin: 'admin@pluto.io',
        action: 'Fee Update',
        details: 'Updated BTC withdrawal fee to 0.0005',
        timestamp: '2025-11-27T08:00:00Z',
        ip: '192.168.1.1'
      }
    ];
  };

  const [auditLogs, setAuditLogs] = useState(loadAuditLogs());

  // Persist audit logs to localStorage whenever they change
  useEffect(() => {
    dataService.setItem('pluto_admin_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const handleViewDetails = (user: any) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleEditBalance = (user: any) => {
    setSelectedUser(user);
    setEditBalances(user.balances);
    setEditAddresses(user.addresses || {});
    setAddressErrors({});
    setShowEditBalance(true);
  };

  const handleViewActivities = (user: any) => {
    setSelectedUser(user);
    setShowUserActivities(true);
  };

  const handleBlockUser = (userId: string) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, blocked: !u.blocked } : u);
    setUsers(updatedUsers);
    // Persist to localStorage
    dataService.setItem('pluto_admin_users', JSON.stringify(updatedUsers));
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      // Persist to localStorage
      dataService.setItem('pluto_admin_users', JSON.stringify(updatedUsers));
    }
  };

  const handleAddressChange = (asset: string, value: string) => {
    setEditAddresses({ ...editAddresses, [asset]: value });
    
    // Validate address if not empty
    if (value && value.trim()) {
      const validation = validateAddress(value, asset);
      if (!validation.isValid) {
        setAddressErrors({ ...addressErrors, [asset]: validation.error || 'Invalid address' });
      } else {
        // Remove error if validation passes
        const newErrors = { ...addressErrors };
        delete newErrors[asset];
        setAddressErrors(newErrors);
      }
    } else {
      // Remove error if field is empty
      const newErrors = { ...addressErrors };
      delete newErrors[asset];
      setAddressErrors(newErrors);
    }
  };

  const handleUpdateBalance = () => {
    // Check if there are any validation errors
    if (Object.keys(addressErrors).length > 0) {
      alert('Please fix invalid addresses before saving');
      return;
    }

    // Get original balances before update to calculate differences
    const originalBalances = selectedUser.balances;
    const newBalances = editBalances;
    
    // Create transactions for each asset that changed
    const balanceChangeTransactions: any[] = [];
    const assets = loadAssetConfig();
    
    Object.keys(newBalances).forEach(asset => {
      const oldBalance = parseFloat(originalBalances[asset] || '0');
      const newBalance = parseFloat(newBalances[asset] || '0');
      const difference = newBalance - oldBalance;
      
      // Only create transaction if balance actually changed
      if (difference !== 0) {
        const assetInfo = assets.find(a => a.symbol === asset);
        const network = asset === 'BTC' ? 'Bitcoin' : 
                       asset === 'ETH' ? 'Ethereum' : 
                       asset === 'SOL' ? 'Solana' : 
                       asset === 'BNB' ? 'BNB Smart Chain' : 
                       asset === 'TRX' ? 'TRON' : 'Unknown';
        
        const transaction = {
          id: `txn_${Date.now()}_${asset}_${Math.random().toString(16).substring(2, 10)}`,
          type: difference > 0 ? 'admin_credit' : 'admin_debit',
          asset: asset,
          amount: formatDecimal(Math.abs(difference)),
          timestamp: new Date().toISOString(),
          status: 'completed',
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          to: difference > 0 ? (editAddresses[asset] || selectedUser.addresses?.[asset] || 'User Wallet') : 'Admin Adjustment',
          from: difference > 0 ? 'Admin' : (editAddresses[asset] || selectedUser.addresses?.[asset] || 'User Wallet'),
          fee: '0',
          gasFee: '0',
          totalDeducted: difference < 0 ? formatDecimal(Math.abs(difference)) : undefined,
          network: network,
          confirmations: 15,
          requiredConfirmations: 15,
          notes: difference > 0 ? `Admin credited ${formatDecimal(Math.abs(difference))} ${asset}` : `Admin debited ${formatDecimal(Math.abs(difference))} ${asset}`
        };
        
        balanceChangeTransactions.push(transaction);
      }
    });

    const updatedUsers = users.map(u => 
      u.id === selectedUser.id ? { ...u, balances: editBalances, addresses: editAddresses } : u
    );
    setUsers(updatedUsers);
    
    // Persist to localStorage
    dataService.setItem('pluto_admin_users', JSON.stringify(updatedUsers));
    
    // CRITICAL: Sync balance changes to user's wallet if they're currently logged in
    const userWallet = dataService.getItem('pluto_wallet');
    if (userWallet) {
      const walletData = JSON.parse(userWallet);
      // Check if the updated user is the currently logged in user
      if (walletData.id === selectedUser.id) {
        // Add new transactions to the wallet
        const existingTransactions = walletData.transactions || [];
        const updatedTransactions = [...existingTransactions, ...balanceChangeTransactions];
        
        // Update the user's wallet with new balances, addresses, and transactions
        const updatedWallet = {
          ...walletData,
          balances: editBalances,
          addresses: editAddresses,
          transactions: updatedTransactions
        };
        dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
        
        // Dispatch custom event to notify user wallet to refresh (same-tab updates)
        window.dispatchEvent(new CustomEvent('walletDataUpdated', {
          detail: { walletData: updatedWallet }
        }));
        
        // Also dispatch storage event for cross-tab updates
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'pluto_wallet',
          newValue: JSON.stringify(updatedWallet),
          oldValue: userWallet,
          storageArea: localStorage,
          url: window.location.href
        }));
      }
    }
    
    // Update admin user activities with new transactions
    if (balanceChangeTransactions.length > 0) {
      const userActivities = JSON.parse(dataService.getItem('pluto_user_activities') || '{}');
      if (!userActivities[selectedUser.id]) {
        userActivities[selectedUser.id] = [];
      }
      userActivities[selectedUser.id].push(...balanceChangeTransactions);
      dataService.setItem('pluto_user_activities', JSON.stringify(userActivities));
    }
    
    setShowEditBalance(false);
    setSelectedUser(null);
    setAddressErrors({});
  };

  const handleEditLoginDetails = (user: any) => {
    setSelectedUser(user);
    setEditLoginData({
      password: '',
      newPassword: '',
      confirmPassword: '',
      twoFactorEnabled: user.twoFactorAuth?.enabled || false,
      twoFactorMethod: user.twoFactorAuth?.preferredMethod || 'passcode',
      passcode: user.twoFactorAuth?.passcode || '',
      biometricEnabled: user.twoFactorAuth?.biometricEnabled || false,
      accountLocked: user.accountLocked || false,
      failedLoginAttempts: user.failedLoginAttempts || 0
    });
    setShowLoginDetailsEdit(true);
  };

  const handleUpdateLoginDetails = () => {
    const updatedUser = { ...selectedUser };

    // Update password if new password is provided
    if (editLoginData.newPassword && editLoginData.newPassword === editLoginData.confirmPassword) {
      updatedUser.password = editLoginData.newPassword;
      updatedUser.passwordLastChanged = new Date().toISOString();
    }

    // Update 2FA settings
    updatedUser.twoFactorAuth = {
      enabled: editLoginData.twoFactorEnabled,
      preferredMethod: editLoginData.twoFactorMethod,
      passcode: editLoginData.passcode,
      biometricEnabled: editLoginData.biometricEnabled,
      biometricData: editLoginData.biometricEnabled ? updatedUser.twoFactorAuth?.biometricData || 'admin_set_biometric' : null,
      setupDate: editLoginData.twoFactorEnabled ? (updatedUser.twoFactorAuth?.setupDate || new Date().toISOString()) : null
    };

    // Update account lock status
    updatedUser.accountLocked = editLoginData.accountLocked;
    updatedUser.failedLoginAttempts = editLoginData.failedLoginAttempts;

    setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
    setShowLoginDetailsEdit(false);
    setSelectedUser(null);
    alert('Login details updated successfully!');
  };

  const handleResetPassword = () => {
    if (!editLoginData.newPassword) {
      alert('Please enter a new password');
      return;
    }
    if (editLoginData.newPassword !== editLoginData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    handleUpdateLoginDetails();
  };

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setTicketResponse('');
    setShowTicketDetails(true);
  };

  const handleUpdateTicket = (ticketId: string, status: string) => {
    handleTicketStatusChange(ticketId, status);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status });
    }
  };

  const handleSendTicketResponse = () => {
    if (!ticketResponse.trim() || !selectedTicket) return;

    handleAdminReply(selectedTicket.id, ticketResponse);
    
    // Update selected ticket to show the new message immediately
    const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
    if (updatedTicket) {
      setSelectedTicket(updatedTicket);
    }

    const response = {
      admin: 'admin@pluto.io',
      message: ticketResponse,
      timestamp: new Date().toISOString()
    };

    setTickets(tickets.map(t => 
      t.id === selectedTicket.id 
        ? { 
            ...t, 
            responses: [...t.responses, response],
            status: 'in_progress',
            updated_at: new Date().toISOString()
          } 
        : t
    ));

    setSelectedTicket({
      ...selectedTicket,
      responses: [...selectedTicket.responses, response],
      status: 'in_progress'
    });

    // Simulate email/SMS notification
    sendNotification(selectedTicket, ticketResponse);

    setTicketResponse('');
    alert('Response sent successfully! User will be notified via ' + notificationMethod);
  };

  const sendNotification = (ticket: any, message: string) => {
    // This would integrate with actual email/SMS services
    console.log('Sending notification:', {
      method: notificationMethod,
      email: ticket.user_email,
      phone: ticket.user_phone,
      subject: `Update on your ticket: ${ticket.subject}`,
      message: message
    });
  };

  const handleViewChat = (chat: any) => {
    setSelectedChat(chat);
    setChatMessage('');
    setShowChatDetails(true);
    
    // Mark as read
    setChats(chats.map(c => 
      c.id === chat.id ? { ...c, unread_count: 0 } : c
    ));
  };

  const handleSendChatMessage = () => {
    if (!chatMessage.trim() || !selectedChat) return;

    const newMessage = {
      sender: 'admin',
      senderName: adminProfile.username || 'Support Team',
      message: chatMessage,
      timestamp: new Date().toISOString()
    };

    const updatedChat = {
      ...selectedChat,
      messages: [...(selectedChat.messages || []), newMessage],
      updated: new Date().toISOString()
    };

    // Update local state
    const updatedChats = chats.map(c => 
      c.id === selectedChat.id ? updatedChat : c
    );
    setChats(updatedChats);
    setSelectedChat(updatedChat);

    // Save to localStorage
    dataService.setItem('pluto_live_chats', JSON.stringify(updatedChats));

    // Simulate WhatsApp/Telegram notification
    console.log(`📱 WhatsApp notification sent to ${selectedChat.userEmail || selectedChat.user_email}: "${chatMessage}"`);

    setChatMessage('');
  };

  const sendChatToIntegration = (chat: any, message: string) => {
    // This would integrate with WhatsApp Business API or Telegram Bot API
    if (chat.whatsapp_connected) {
      console.log('Sending to WhatsApp:', {
        phone: chat.user_phone,
        message: message
      });
    }
    if (chat.telegram_connected) {
      console.log('Sending to Telegram:', {
        user: chat.user_email,
        message: message
      });
    }
  };

  const handleCreateUser = () => {
    // Validate required fields
    if (!newUser.email || !newUser.phone || !newUser.password) {
      alert('Please fill in all required fields: Email, Phone, and Password');
      return;
    }

    // Check if there are any address validation errors
    if (Object.keys(newUserAddressErrors).length > 0) {
      alert('Please fix invalid addresses before creating user');
      return;
    }

    // Generate user ID
    const userId = `usr_${String(users.length + 1).padStart(3, '0')}`;
    
    // Auto-generate any missing addresses
    const finalAddresses = { ...newUser.addresses };
    Object.keys(finalAddresses).forEach(asset => {
      if (!finalAddresses[asset]) {
        finalAddresses[asset] = generateRandomAddress(asset);
      }
    });
    
    // Create new user object
    const userToCreate = {
      id: userId,
      email: newUser.email,
      phone: newUser.phone,
      kyc_status: newUser.kyc_status,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      blocked: false,
      balances: newUser.balances,
      addresses: finalAddresses
    };

    // Add to users array
    const updatedUsers = [...users, userToCreate];
    setUsers(updatedUsers);
    
    // Persist to localStorage
    dataService.setItem('pluto_admin_users', JSON.stringify(updatedUsers));

    // Reset form and close modal
    setNewUser({
      email: '',
      phone: '',
      password: '',
      kyc_status: 'pending',
      balances: { BTC: '0', ETH: '0', SOL: '0', BNB: '0', USDT: '0' },
      addresses: { BTC: '', ETH: '', SOL: '', BNB: '', USDT: '' }
    });
    setNewUserAddressErrors({});
    setShowCreateUser(false);

    alert(`User created successfully!\n\nUser ID: ${userId}\nEmail: ${newUser.email}\nPassword: ${newUser.password}\n\nPlease save these credentials securely.`);
  };

  const generateRandomAddress = (asset: string) => {
    return generateAddressForCoin(asset);
  };

  const handleNewUserAddressChange = (asset: string, value: string) => {
    setNewUser({
      ...newUser,
      addresses: { ...newUser.addresses, [asset]: value }
    });
    
    // Validate address if not empty
    if (value && value.trim()) {
      const validation = validateAddress(value, asset);
      if (!validation.isValid) {
        setNewUserAddressErrors({ ...newUserAddressErrors, [asset]: validation.error || 'Invalid address' });
      } else {
        // Remove error if validation passes
        const newErrors = { ...newUserAddressErrors };
        delete newErrors[asset];
        setNewUserAddressErrors(newErrors);
      }
    } else {
      // Remove error if field is empty
      const newErrors = { ...newUserAddressErrors };
      delete newErrors[asset];
      setNewUserAddressErrors(newErrors);
    }
  };

  const handleEditFee = (asset: string) => {
    setEditingFee({ asset, data: fees[asset] });
  };

  const handleSaveFee = (asset: string, updatedFee: any) => {
    // Update fees state
    const updatedFees = {
      ...fees,
      [asset]: updatedFee
    };
    setFees(updatedFees);

    // Log activity
    const activity = {
      id: auditLogs.length + 1,
      admin: 'admin@pluto.io',
      action: 'Fee Update',
      details: `Updated ${asset} withdrawal fee and deposit settings`,
      timestamp: new Date().toISOString(),
      ip: '192.168.1.1'
    };
    setAuditLogs([activity, ...auditLogs]);

    // Close modal
    setEditingFee(null);

    alert(`${asset} fee settings updated successfully!`);
  };

  const handleChangePassword = () => {
    // Validate form
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    // In production, this would verify currentPassword against stored hash
    // For now, we'll just simulate success
    alert('Password changed successfully!');
    
    // Reset form and close modal
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowChangePassword(false);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      // In production, this would clear session/tokens
      // Redirect to admin login by calling onBack
      onBack();
    }
  };

  // Coin CRUD Handlers
  const handleAddCoin = () => {
    setEditingCoin(null);
    setCoinForm({
      symbol: '',
      name: '',
      color: 'bg-blue-500',
      icon: '₿',
      logoUrl: '',
      coinGeckoId: ''
    });
    setShowCoinModal(true);
  };

  const handleEditCoin = (coin: any) => {
    setEditingCoin(coin);
    setCoinForm({
      symbol: coin.symbol,
      name: coin.name,
      color: coin.color,
      icon: coin.icon,
      logoUrl: coin.logoUrl || ''
    });
    setShowCoinModal(true);
  };

  const handleDeleteCoin = (symbol: string) => {
    if (confirm(`Are you sure you want to delete ${symbol}? This will affect all users holding this asset.`)) {
      // Remove from asset config
      setAssetConfig(assetConfig.filter(a => a.symbol !== symbol));
      
      // Remove from prices
      const newPrices = { ...prices };
      delete newPrices[symbol];
      setPrices(newPrices);
      
      // Remove from price changes
      const newPriceChanges = { ...priceChanges };
      delete newPriceChanges[symbol];
      setPriceChanges(newPriceChanges);
      
      // Remove from fees
      const newFees = { ...fees };
      delete newFees[symbol];
      setFees(newFees);
      
      // Store fees in localStorage
      dataService.setItem('pluto_admin_fees', JSON.stringify(newFees));
      
      // Remove from localStorage prices
      dataService.removeItem(`price_${symbol}`);
      
      // Remove from all user balances
      const updatedUsers = users.map(user => {
        const newBalances = { ...user.balances };
        delete newBalances[symbol];
        const newAddresses = { ...user.addresses };
        delete newAddresses[symbol];
        return {
          ...user,
          balances: newBalances,
          addresses: newAddresses
        };
      });
      setUsers(updatedUsers);
      
      // Update users in localStorage
      dataService.setItem('pluto_admin_users', JSON.stringify(updatedUsers));
      
      // Update current wallet if exists
      const currentWallet = dataService.getItem('pluto_wallet');
      if (currentWallet) {
        try {
          const walletData = JSON.parse(currentWallet);
          const newBalances = { ...walletData.balances };
          const newAddresses = { ...walletData.addresses };
          delete newBalances[symbol];
          delete newAddresses[symbol];
          
          const updatedWallet = {
            ...walletData,
            balances: newBalances,
            addresses: newAddresses
          };
          dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
          
          // Dispatch event to notify wallet components
          window.dispatchEvent(new CustomEvent('walletUpdated', {
            detail: { wallet: updatedWallet }
          }));
        } catch (e) {
          console.error('Error updating current wallet:', e);
        }
      }
      
      alert(`${symbol} has been deleted successfully!`);
    }
  };

  const handleSaveCoin = () => {
    // Validate form
    if (!coinForm.symbol || !coinForm.name) {
      alert('Please fill in Symbol and Name fields');
      return;
    }

    const symbol = coinForm.symbol.toUpperCase();

    if (editingCoin) {
      // Update existing coin
      setAssetConfig(assetConfig.map(a => 
        a.symbol === editingCoin.symbol 
          ? { ...a, ...coinForm, symbol } 
          : a
      ));
      
      // If symbol changed, update prices and fees keys
      if (editingCoin.symbol !== symbol) {
        // Update prices
        const newPrices = { ...prices };
        if (newPrices[editingCoin.symbol] !== undefined) {
          newPrices[symbol] = newPrices[editingCoin.symbol];
          delete newPrices[editingCoin.symbol];
        }
        setPrices(newPrices);
        
        // Update localStorage prices
        const oldPrice = dataService.getItem(`price_${editingCoin.symbol}`);
        if (oldPrice) {
          dataService.setItem(`price_${symbol}`, oldPrice);
          dataService.removeItem(`price_${editingCoin.symbol}`);
        }
        
        // Update price changes
        const newPriceChanges = { ...priceChanges };
        if (newPriceChanges[editingCoin.symbol] !== undefined) {
          newPriceChanges[symbol] = newPriceChanges[editingCoin.symbol];
          delete newPriceChanges[editingCoin.symbol];
        }
        setPriceChanges(newPriceChanges);
        
        // Update fees
        const newFees = { ...fees };
        if (newFees[editingCoin.symbol]) {
          newFees[symbol] = newFees[editingCoin.symbol];
          delete newFees[editingCoin.symbol];
        }
        setFees(newFees);
        
        // Store fees in localStorage
        dataService.setItem('pluto_admin_fees', JSON.stringify(newFees));
        
        // Update all users' balances and addresses
        const updatedUsers = users.map(user => {
          const newBalances = { ...user.balances };
          const newAddresses = { ...user.addresses };
          
          if (newBalances[editingCoin.symbol] !== undefined) {
            newBalances[symbol] = newBalances[editingCoin.symbol];
            delete newBalances[editingCoin.symbol];
          }
          
          if (newAddresses[editingCoin.symbol] !== undefined) {
            newAddresses[symbol] = newAddresses[editingCoin.symbol];
            delete newAddresses[editingCoin.symbol];
          }
          
          return {
            ...user,
            balances: newBalances,
            addresses: newAddresses
          };
        });
        setUsers(updatedUsers);
        dataService.setItem('pluto_admin_users', JSON.stringify(updatedUsers));
        
        // Update current wallet if exists
        const currentWallet = dataService.getItem('pluto_wallet');
        if (currentWallet) {
          try {
            const walletData = JSON.parse(currentWallet);
            const newBalances = { ...walletData.balances };
            const newAddresses = { ...walletData.addresses };
            
            if (newBalances[editingCoin.symbol] !== undefined) {
              newBalances[symbol] = newBalances[editingCoin.symbol];
              delete newBalances[editingCoin.symbol];
            }
            
            if (newAddresses[editingCoin.symbol] !== undefined) {
              newAddresses[symbol] = newAddresses[editingCoin.symbol];
              delete newAddresses[editingCoin.symbol];
            }
            
            const updatedWallet = {
              ...walletData,
              balances: newBalances,
              addresses: newAddresses
            };
            dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
            
            // Dispatch event to notify wallet components
            window.dispatchEvent(new CustomEvent('walletUpdated', {
              detail: { wallet: updatedWallet }
            }));
          } catch (e) {
            console.error('Error updating current wallet:', e);
          }
        }
      }
      
      alert(`${symbol} has been updated successfully!`);
    } else {
      // Add new coin
      if (assetConfig.find(a => a.symbol === symbol)) {
        alert('A coin with this symbol already exists!');
        return;
      }
      
      setAssetConfig([...assetConfig, { ...coinForm, symbol }]);
      
      // Add default price
      const newPrices = { ...prices, [symbol]: 1.00 };
      setPrices(newPrices);
      setPriceChanges({ ...priceChanges, [symbol]: 0.0 });
      
      // Store price in localStorage for gas fee calculations
      dataService.setItem(`price_${symbol}`, '1.00');
      
      // Add default fees
      const newFees = {
        ...fees,
        [symbol]: {
          withdraw_fee: '0.001',
          percent: '0.5',
          deposit_address: generateRandomAddress(symbol),
          deposit_enabled: true,
          gas_fee_enabled: false,
          gas_fee_type: 'fixed',
          gas_fee_fixed: '0.0001',
          gas_fee_percent: '0.1'
        }
      };
      setFees(newFees);
      
      // Store fees in localStorage
      dataService.setItem('pluto_admin_fees', JSON.stringify(newFees));
      
      // Add to all users with 0 balance
      const updatedUsers = users.map(user => ({
        ...user,
        balances: { ...user.balances, [symbol]: '0' },
        addresses: { ...user.addresses, [symbol]: generateRandomAddress(symbol) }
      }));
      setUsers(updatedUsers);
      
      // Update users in localStorage
      dataService.setItem('pluto_admin_users', JSON.stringify(updatedUsers));
      
      // Update current logged-in user's wallet if exists
      const currentWallet = dataService.getItem('pluto_wallet');
      if (currentWallet) {
        try {
          const walletData = JSON.parse(currentWallet);
          const updatedWallet = {
            ...walletData,
            balances: { ...walletData.balances, [symbol]: '0' },
            addresses: { ...walletData.addresses, [symbol]: generateRandomAddress(symbol) }
          };
          dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
          
          // Dispatch event to notify wallet components
          window.dispatchEvent(new CustomEvent('walletUpdated', {
            detail: { wallet: updatedWallet }
          }));
        } catch (e) {
          console.error('Error updating current wallet:', e);
        }
      }
      
      alert(`${symbol} has been added successfully!`);
    }
    
    setShowCoinModal(false);
    setEditingCoin(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In production, this would upload to storage
      // For now, we'll use a local URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoinForm({ ...coinForm, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleViewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowTransactionReceipt(true);
    setEditingTransaction(false);
  };

  const handleUpdateTransaction = (userId: string, updatedTransaction: any) => {
    const updatedActivities = {
      ...userActivities,
      [userId]: userActivities[userId].map(txn =>
        txn.id === updatedTransaction.id ? updatedTransaction : txn
      )
    };
    setUserActivities(updatedActivities);
    dataService.setItem('pluto_user_activities', JSON.stringify(updatedActivities));
    
    setSelectedTransaction(updatedTransaction);
    setEditingTransaction(false);
    alert('Transaction updated successfully!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const platformAssets = calculatePlatformAssets();
  const totalPlatformValue = Object.values(platformAssets).reduce((sum: number, asset: any) => sum + asset.value, 0);

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Open Tickets', value: tickets.filter(t => t.status === 'open').length, icon: Headphones, color: 'bg-red-500' },
    { label: 'Active Chats', value: chats.filter(c => c.status === 'active').length, icon: MessageCircle, color: 'bg-green-500' },
    { label: 'Platform Value', value: `$${totalPlatformValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'bg-purple-500', isValue: true }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" showText={false} onClick={onBack} />
              <div>
                <h1 className="text-2xl text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pluto Wallet Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{adminProfile.role}</Badge>
              
              {/* Admin Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-gray-900 dark:text-white">{adminProfile.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{adminProfile.email}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                      <User className="w-5 h-5" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{adminProfile.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{adminProfile.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowAdminSettings(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Change Password
                  </DropdownMenuItem>
                  {onToggleDarkMode && (
                    <DropdownMenuItem onClick={onToggleDarkMode}>
                      {darkMode ? (
                        <>
                          <Sun className="w-4 h-4 mr-2" />
                          Light Mode
                        </>
                      ) : (
                        <>
                          <Moon className="w-4 h-4 mr-2" />
                          Dark Mode
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-3xl text-gray-900 dark:text-white">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile Select Dropdown */}
          <div className="md:hidden mb-6">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">User Management</SelectItem>
                <SelectItem value="assets">Assets Overview</SelectItem>
                <SelectItem value="fees">Fee Settings</SelectItem>
                <SelectItem value="support">
                  Support Tickets
                  {tickets.filter(t => t.status === 'open').length > 0 && ` (${tickets.filter(t => t.status === 'open').length})`}
                </SelectItem>
                <SelectItem value="chat">
                  Live Chat
                  {chats.reduce((sum, c) => sum + c.unread_count, 0) > 0 && ` (${chats.reduce((sum, c) => sum + c.unread_count, 0)})`}
                </SelectItem>
                <SelectItem value="audit">Audit Logs</SelectItem>
                <SelectItem value="sync">Data Sync</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Tab Buttons */}
          <TabsList className="mb-6 hidden md:flex">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="assets">Assets Overview</TabsTrigger>
            <TabsTrigger value="fees">Fee Settings</TabsTrigger>
            <TabsTrigger value="support">
              <div className="flex items-center gap-2">
                Support Tickets
                {tickets.filter(t => t.status === 'open').length > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    {tickets.filter(t => t.status === 'open').length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="chat">
              <div className="flex items-center gap-2">
                Live Chat
                {chats.reduce((sum, c) => sum + c.unread_count, 0) > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    {chats.reduce((sum, c) => sum + c.unread_count, 0)}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="sync">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data Sync
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl text-gray-900 dark:text-white">Users</h2>
                  <Button onClick={() => setShowCreateUser(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Create User
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by email or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Balance (USD)</TableHead>
                    <TableHead>KYC Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const totalBalance = calculateTotalBalance(user.balances);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-sm">{user.id}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="font-semibold text-gray-900 dark:text-white">
                          ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.kyc_status === 'verified'
                                ? 'default'
                                : user.kyc_status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {user.kyc_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.blocked ? 'destructive' : 'default'}>
                            {user.blocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditBalance(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Balance
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewActivities(user)}>
                                <Activity className="w-4 h-4 mr-2" />
                                View Activities
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBlockUser(user.id)}>
                                {user.blocked ? (
                                  <>
                                    <Unlock className="w-4 h-4 mr-2" />
                                    Unblock User
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Block User
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets">
            <div className="grid gap-6">
              {/* Platform Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl text-gray-900 dark:text-white">Platform Assets Overview</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Total value locked across all user wallets
                      {lastPriceUpdate && (
                        <span className="ml-2 text-xs">
                          • Live prices {pricesLoading && '(updating...)'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                      <p className="text-3xl text-gray-900 dark:text-white">
                        ${totalPlatformValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {lastPriceUpdate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Updated {lastPriceUpdate.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    <Button onClick={handleAddCoin} className="flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      Add New Coin
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {assetConfig.map((asset) => {
                    const assetData = platformAssets[asset.symbol];
                    const price = prices[asset.symbol as keyof typeof prices] || 0;
                    const change = priceChanges[asset.symbol as keyof typeof priceChanges] || 0;

                    return (
                      <div key={asset.symbol} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl relative group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {asset.logoUrl ? (
                              <img src={asset.logoUrl} alt={asset.name} className="w-14 h-14 rounded-full object-cover" />
                            ) : (
                              <div className={`w-14 h-14 rounded-full ${asset.color} flex items-center justify-center text-white text-2xl`}>
                                {asset.icon}
                              </div>
                            )}
                            <div>
                              <h3 className="text-lg text-gray-900 dark:text-white">{asset.name}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{asset.symbol}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-center gap-2 justify-end mb-1">
                                <span className="text-lg text-gray-900 dark:text-white">
                                  ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                                <Badge variant={change >= 0 ? 'default' : 'destructive'} className="flex items-center gap-1">
                                  {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">24h Change</p>
                            </div>
                            
                            {/* Edit/Delete Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditCoin(asset)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Coin
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteCoin(asset.symbol)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <Trash className="w-4 h-4 mr-2" />
                                  Delete Coin
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Balance</p>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {assetData?.total?.toLocaleString('en-US', { maximumFractionDigits: 4 }) || '0'} {asset.symbol}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">USD Value</p>
                            <p className="text-sm text-gray-900 dark:text-white">
                              ${assetData?.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Holders</p>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {assetData?.users || 0} users
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Asset Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl mb-4 text-gray-900 dark:text-white">Asset Distribution</h2>
                <div className="space-y-3">
                  {assetConfig.map((asset) => {
                    const assetData = platformAssets[asset.symbol];
                    const percentage = (assetData.value / totalPlatformValue) * 100;

                    return (
                      <div key={asset.symbol}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {asset.logoUrl ? (
                              <img src={asset.logoUrl} alt={asset.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className={`w-8 h-8 rounded-full ${asset.color} flex items-center justify-center text-white text-sm`}>
                                {asset.icon}
                              </div>
                            )}
                            <span className="text-sm text-gray-900 dark:text-white">{asset.name}</span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`${asset.color} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Fees Tab */}
          <TabsContent value="fees">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl mb-6 text-gray-900 dark:text-white">Fee & Deposit Configuration</h2>
              
              <div className="space-y-6">
                {Object.entries(fees).map(([asset, fee]) => {
                  const assetInfo = assetConfig.find(a => a.symbol === asset);
                  
                  const handleCopyDeposit = async () => {
                    const success = await copyToClipboard(fee.deposit_address);
                    if (success) {
                      setCopiedDepositAddresses({...copiedDepositAddresses, [asset]: true});
                      setTimeout(() => {
                        setCopiedDepositAddresses(prev => ({...prev, [asset]: false}));
                      }, 2000);
                    }
                  };

                  return (
                    <div key={asset} className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          {assetInfo?.logoUrl ? (
                            <img src={assetInfo.logoUrl} alt={assetInfo.name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className={`w-12 h-12 rounded-full ${assetInfo?.color} flex items-center justify-center text-white text-xl`}>
                              {assetInfo?.icon}
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg text-gray-900 dark:text-white">{assetInfo?.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{asset}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditFee(asset)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>

                      {/* Withdrawal Fees */}
                      <div className="mb-6">
                        <h4 className="text-sm text-gray-700 dark:text-gray-300 mb-3">Withdrawal Fees</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                              Fixed Fee
                            </label>
                            <Input value={fee.withdraw_fee} readOnly />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                              Percentage Fee
                            </label>
                            <Input value={`${fee.percent}%`} readOnly />
                          </div>
                        </div>
                      </div>

                      {/* Gas Fees */}
                      <div className="mb-6 border-t border-gray-200 dark:border-gray-600 pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm text-gray-700 dark:text-gray-300">Estimated Gas Fees</h4>
                          <Badge variant={fee.gas_fee_enabled ? 'default' : 'secondary'}>
                            {fee.gas_fee_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                              Fee Type
                            </label>
                            <Input value={fee.gas_fee_type === 'fixed' ? 'Fixed Amount' : 'Percentage'} readOnly className="capitalize" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                              {fee.gas_fee_type === 'fixed' ? 'Fixed Amount' : 'Percentage Rate'}
                            </label>
                            <Input 
                              value={fee.gas_fee_type === 'fixed' ? fee.gas_fee_fixed : `${fee.gas_fee_percent}%`} 
                              readOnly 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Deposit Address */}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm text-gray-700 dark:text-gray-300">Deposit Address</h4>
                          <Badge variant={fee.deposit_enabled ? 'default' : 'destructive'}>
                            {fee.deposit_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 font-mono text-sm text-gray-900 dark:text-white break-all">
                              {fee.deposit_address}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleCopyDeposit}
                              className="flex-shrink-0"
                            >
                              {copiedDepositAddresses[asset] ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>Deposit Instructions:</strong> Users send {asset} to this address. Once the transaction is confirmed on the blockchain, their wallet balance will be automatically credited. Minimum deposit: {asset === 'BTC' ? '0.0001' : asset === 'ETH' ? '0.001' : asset === 'USDT' ? '10' : '0.01'} {asset}.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Important:</strong> Changes to fee structure and deposit addresses will take effect immediately for all users. All modifications are logged in the audit trail. Ensure deposit addresses are correct before enabling deposits.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Support Tickets Tab */}
          <TabsContent value="support">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl text-gray-900 dark:text-white">Support Tickets</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Manage user support requests and send notifications
                    </p>
                  </div>
                </div>

                {/* Filter Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
                  <button
                    onClick={() => setTicketStatusFilter('all')}
                    className={`transition-all ${
                      ticketStatusFilter === 'all'
                        ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800'
                        : ''
                    }`}
                  >
                    <Badge 
                      variant="outline" 
                      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        ticketStatusFilter === 'all' ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      All ({tickets.length})
                    </Badge>
                  </button>
                  <button
                    onClick={() => setTicketStatusFilter('open')}
                    className={`transition-all ${
                      ticketStatusFilter === 'open'
                        ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800'
                        : ''
                    }`}
                  >
                    <Badge 
                      variant="destructive" 
                      className={`cursor-pointer hover:opacity-80 ${
                        ticketStatusFilter === 'open' ? 'ring-2 ring-white' : ''
                      }`}
                    >
                      Open ({tickets.filter(t => t.status === 'open').length})
                    </Badge>
                  </button>
                  <button
                    onClick={() => setTicketStatusFilter('in-progress')}
                    className={`transition-all ${
                      ticketStatusFilter === 'in-progress'
                        ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800'
                        : ''
                    }`}
                  >
                    <Badge 
                      variant="default" 
                      className={`cursor-pointer hover:opacity-80 ${
                        ticketStatusFilter === 'in-progress' ? 'ring-2 ring-white' : ''
                      }`}
                    >
                      In Progress ({tickets.filter(t => t.status === 'in-progress' || t.status === 'in_progress').length})
                    </Badge>
                  </button>
                  <button
                    onClick={() => setTicketStatusFilter('resolved')}
                    className={`transition-all ${
                      ticketStatusFilter === 'resolved'
                        ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800'
                        : ''
                    }`}
                  >
                    <Badge 
                      variant="secondary" 
                      className={`cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                        ticketStatusFilter === 'resolved' ? 'bg-gray-200 dark:bg-gray-600' : ''
                      }`}
                    >
                      Resolved ({tickets.filter(t => t.status === 'resolved').length})
                    </Badge>
                  </button>
                  <button
                    onClick={() => setTicketStatusFilter('closed')}
                    className={`transition-all ${
                      ticketStatusFilter === 'closed'
                        ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800'
                        : ''
                    }`}
                  >
                    <Badge 
                      variant="outline" 
                      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        ticketStatusFilter === 'closed' ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      Closed ({tickets.filter(t => t.status === 'closed').length})
                    </Badge>
                  </button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets
                    .filter(ticket => {
                      if (ticketStatusFilter === 'all') return true;
                      if (ticketStatusFilter === 'in-progress') {
                        return ticket.status === 'in-progress' || ticket.status === 'in_progress';
                      }
                      return ticket.status === ticketStatusFilter;
                    })
                    .map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-sm">{ticket.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {ticket.userEmail || ticket.user_email || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ticket.userName || ticket.user_name || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{ticket.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            ticket.priority === 'high' || ticket.priority === 'urgent'
                              ? 'destructive' 
                              : ticket.priority === 'medium' 
                              ? 'default' 
                              : 'secondary'
                          }
                          className="capitalize"
                        >
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ticket.status === 'open' 
                              ? 'destructive' 
                              : ticket.status === 'in-progress' || ticket.status === 'in_progress'
                              ? 'default' 
                              : ticket.status === 'closed'
                              ? 'outline'
                              : 'secondary'
                          }
                          className="capitalize"
                        >
                          {ticket.status === 'in-progress' || ticket.status === 'in_progress' ? 'In Progress' : ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(ticket.created || ticket.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Empty State */}
              {tickets.filter(ticket => {
                if (ticketStatusFilter === 'all') return true;
                if (ticketStatusFilter === 'in-progress') {
                  return ticket.status === 'in-progress' || ticket.status === 'in_progress';
                }
                return ticket.status === ticketStatusFilter;
              }).length === 0 && (
                <div className="p-12 text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg text-gray-900 dark:text-white mb-2">
                    No {ticketStatusFilter !== 'all' ? ticketStatusFilter : ''} tickets found
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {ticketStatusFilter !== 'all' 
                      ? `There are no tickets with status "${ticketStatusFilter}"`
                      : 'No support tickets have been created yet'}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Live Chat Tab */}
          <TabsContent value="chat">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl text-gray-900 dark:text-white">Live Chat</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Chat with users in real-time (Messages synced with WhatsApp)
                    </p>
                  </div>
                </div>

                {/* Filter Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
                  <button
                    onClick={() => setChatStatusFilter('all')}
                    className={`transition-all ${
                      chatStatusFilter === 'all'
                        ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800'
                        : ''
                    }`}
                  >
                    <Badge 
                      variant="outline" 
                      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        chatStatusFilter === 'all' ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      All ({chats.length})
                    </Badge>
                  </button>
                  <button
                    onClick={() => setChatStatusFilter('active')}
                    className={`transition-all ${
                      chatStatusFilter === 'active'
                        ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800'
                        : ''
                    }`}
                  >
                    <Badge 
                      variant="default" 
                      className={`cursor-pointer hover:opacity-80 ${
                        chatStatusFilter === 'active' ? 'ring-2 ring-white' : ''
                      }`}
                    >
                      Active ({chats.filter(c => c.status === 'active').length})
                    </Badge>
                  </button>
                  <button
                    onClick={() => setChatStatusFilter('resolved')}
                    className={`transition-all ${
                      chatStatusFilter === 'resolved'
                        ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800'
                        : ''
                    }`}
                  >
                    <Badge 
                      variant="secondary" 
                      className={`cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                        chatStatusFilter === 'resolved' ? 'bg-gray-200 dark:bg-gray-600' : ''
                      }`}
                    >
                      Resolved ({chats.filter(c => c.status === 'resolved').length})
                    </Badge>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {chats
                  .filter(chat => {
                    if (chatStatusFilter === 'all') return true;
                    return chat.status === chatStatusFilter;
                  })
                  .map((chat) => (
                  <div 
                    key={chat.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => handleViewChat(chat)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">
                          {(chat.userName || chat.user_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-gray-900 dark:text-white">{chat.userName || chat.user_name || 'Unknown User'}</h3>
                            <Badge variant="outline" className="text-xs">
                              <Phone className="w-3 h-3 mr-1" />
                              WhatsApp
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{chat.userEmail || chat.user_email || 'No email'}</p>
                          {chat.messages && chat.messages.length > 0 && (
                            <p className="text-sm text-gray-800 dark:text-gray-300 mt-1 truncate max-w-md">
                              {chat.messages[chat.messages.length - 1].message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {new Date(chat.updated || chat.updated_at).toLocaleTimeString()}
                        </p>
                        <Badge 
                          variant={chat.status === 'active' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {chat.status}
                        </Badge>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {chat.messages ? chat.messages.length : 0} messages
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {chats.filter(chat => {
                if (chatStatusFilter === 'all') return true;
                return chat.status === chatStatusFilter;
              }).length === 0 && (
                <div className="p-12 text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg text-gray-900 dark:text-white mb-2">
                    No {chatStatusFilter !== 'all' ? chatStatusFilter : ''} chats found
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {chatStatusFilter !== 'all' 
                      ? `There are no ${chatStatusFilter} chat conversations`
                      : 'No live chat conversations yet. Users can start a chat from their Support Center.'}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl text-gray-900 dark:text-white">Audit Logs</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Complete history of all admin actions
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.admin}</TableCell>
                      <TableCell>
                        <Badge>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {log.details}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Data Sync Tab */}
          <TabsContent value="sync">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl text-gray-900 dark:text-white">Data Synchronization</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage data migration from local storage to Supabase cloud database
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <span className="font-medium">Admin Access:</span> As an admin, you can migrate user data from local storage to Supabase for cloud synchronization.
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                      This operation will sync wallet data, transactions, notifications, support tickets, fee settings, and asset configurations to the cloud database.
                    </p>
                  </div>
                </div>
              </div>

              <MigrationPanel 
                userId="admin" 
                onMigrationComplete={() => {
                  console.log('Migration completed');
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowUserDetails(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4">
              <h2 className="text-2xl text-gray-900 dark:text-white">User Details</h2>
              <button onClick={() => setShowUserDetails(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">User ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Email</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Phone</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedUser.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">KYC Status</p>
                  <Badge
                    variant={
                      selectedUser.kyc_status === 'verified'
                        ? 'default'
                        : selectedUser.kyc_status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {selectedUser.kyc_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Created</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Last Login</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedUser.last_login).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Balance */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 mb-6 text-white">
              <p className="text-sm opacity-90 mb-1">Total Balance</p>
              <p className="text-4xl">
                ${calculateTotalBalance(selectedUser.balances).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Login & Security Details */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-gray-900 dark:text-white">Login & Security</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditLoginDetails(selectedUser)}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit Login Details
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Password</p>
                      <p className="text-sm text-gray-900 dark:text-white">••••••••</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Password Last Changed</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedUser.passwordLastChanged ? new Date(selectedUser.passwordLastChanged).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedUser.twoFactorAuth?.enabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <Badge variant={selectedUser.twoFactorAuth?.enabled ? 'default' : 'secondary'}>
                      {selectedUser.twoFactorAuth?.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  {selectedUser.twoFactorAuth?.enabled && (
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Preferred Method</p>
                        <p className="text-sm text-gray-900 dark:text-white capitalize">
                          {selectedUser.twoFactorAuth.preferredMethod || 'None'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Setup Date</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedUser.twoFactorAuth.setupDate ? new Date(selectedUser.twoFactorAuth.setupDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      {selectedUser.twoFactorAuth.passcode && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Passcode</p>
                          <p className="text-sm text-gray-900 dark:text-white font-mono">
                            {selectedUser.twoFactorAuth.passcode}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Biometric</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedUser.twoFactorAuth.biometricEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Failed Login Attempts</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedUser.failedLoginAttempts || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Account Locked</p>
                      <Badge variant={selectedUser.accountLocked ? 'destructive' : 'default'}>
                        {selectedUser.accountLocked ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assets */}
            <div>
              <h3 className="text-lg mb-4 text-gray-900 dark:text-white">Assets</h3>
              <div className="space-y-3">
                {assetConfig.map((asset) => {
                  const balance = parseFloat(selectedUser.balances[asset.symbol] || '0');
                  const price = prices[asset.symbol as keyof typeof prices] || 0;
                  const value = balance * price;
                  const change = priceChanges[asset.symbol as keyof typeof priceChanges] || 0;

                  return (
                    <div key={asset.symbol} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {asset.logoUrl ? (
                            <img src={asset.logoUrl} alt={asset.name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className={`w-12 h-12 rounded-full ${asset.color} flex items-center justify-center text-white text-xl`}>
                              {asset.icon}
                            </div>
                          )}
                          <div>
                            <h4 className="text-gray-900 dark:text-white">{asset.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{asset.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-900 dark:text-white">
                            {formatBalance(balance)} {asset.symbol}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          Price: ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <Badge variant={change >= 0 ? 'default' : 'destructive'} className="flex items-center gap-1">
                          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Balance Modal */}
      {showEditBalance && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowEditBalance(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4">
              <h2 className="text-2xl text-gray-900 dark:text-white">Edit Balance & Addresses</h2>
              <button onClick={() => setShowEditBalance(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">User</p>
                <p className="text-gray-900 dark:text-white">{selectedUser.email}</p>
              </div>

              {Object.entries(selectedUser.balances).map(([asset, balance]) => {
                const assetInfo = assetConfig.find(a => a.symbol === asset);
                return (
                  <div key={asset} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3 mb-3">
                      {assetInfo?.logoUrl ? (
                        <img src={assetInfo.logoUrl} alt={assetInfo.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full ${assetInfo?.color} flex items-center justify-center text-white`}>
                          {assetInfo?.icon}
                        </div>
                      )}
                      <div>
                        <h4 className="text-gray-900 dark:text-white">{assetInfo?.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{asset}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                        Balance
                      </label>
                      <Input
                        type="number"
                        value={editBalances[asset] as string}
                        placeholder="0.00"
                        onChange={(e) => setEditBalances({ ...editBalances, [asset]: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                        Wallet Address
                      </label>
                      <Input
                        type="text"
                        value={editAddresses[asset] as string || ''}
                        placeholder={`Enter ${asset} address`}
                        className={`font-mono text-sm ${addressErrors[asset] ? 'border-red-500 dark:border-red-500' : ''}`}
                        onChange={(e) => handleAddressChange(asset, e.target.value)}
                      />
                      {addressErrors[asset] && (
                        <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{addressErrors[asset]}</span>
                        </div>
                      )}
                      {!addressErrors[asset] && editAddresses[asset] && (
                        <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Valid {asset} address</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newAddress = generateRandomAddress(asset);
                            handleAddressChange(asset, newAddress);
                          }}
                          className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Generate Address
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button size="lg" className="w-full mt-4" onClick={handleUpdateBalance}>
                <Check className="w-4 h-4 mr-2" />
                Update Balance & Addresses
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Activities Modal */}
      {showUserActivities && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setShowUserActivities(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full p-6 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900 dark:text-white">User Activities</h2>
              <button onClick={() => setShowUserActivities(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">User</p>
                <p className="text-gray-900 dark:text-white">{selectedUser.email}</p>
              </div>

              <div className="space-y-3">
                {getUserActivities(selectedUser.id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No activities yet
                  </div>
                ) : (
                  getUserActivities(selectedUser.id).map((activity) => {
                    const asset = assetConfig.find(a => a.symbol === activity.asset);
                    const isPending = activity.status === 'pending' || activity.status === 'processing';
                    
                    return (
                      <div key={activity.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent hover:border-purple-500 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full ${asset?.color} flex items-center justify-center text-white relative`}>
                              {activity.type === 'send' && <ArrowUpRight className="w-6 h-6" />}
                              {activity.type === 'receive' && <ArrowDownLeft className="w-6 h-6" />}
                              {activity.type === 'swap' && <RefreshCw className="w-6 h-6" />}
                              {activity.type === 'buy' && <DollarSign className="w-6 h-6" />}
                              {activity.type === 'deposit' && <ArrowDownLeft className="w-6 h-6" />}
                              {isPending && (
                                <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              )}
                            </div>
                            <div>
                              <p className="text-gray-900 dark:text-white capitalize">{activity.type} {activity.asset}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(activity.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-gray-900 dark:text-white ${activity.type === 'send' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {activity.type === 'send' ? '-' : '+'}{activity.amount} {activity.asset}
                            </p>
                            <div className="flex items-center gap-2 justify-end mt-1">
                              <Badge className={getStatusColor(activity.status)}>
                                <div className="flex items-center gap-1">
                                  {isPending && (
                                    <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                  )}
                                  {activity.status}
                                </div>
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate flex-1 mr-2">
                            {activity.hash.substring(0, 20)}...{activity.hash.substring(activity.hash.length - 8)}
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewTransaction(activity)}
                            className="shrink-0"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Receipt
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {showTicketDetails && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowTicketDetails(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4">
              <h2 className="text-2xl text-gray-900 dark:text-white">Ticket Details</h2>
              <button onClick={() => setShowTicketDetails(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            {/* Ticket Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ticket ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">{selectedTicket.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">User</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedTicket.userEmail || selectedTicket.user_email || 'Unknown'}
                  </p>
                  {(selectedTicket.userName || selectedTicket.user_name) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedTicket.userName || selectedTicket.user_name}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Created</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedTicket.created || selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Last Updated</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedTicket.updated || selectedTicket.updated_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Category</p>
                  <Badge variant="outline" className="capitalize">{selectedTicket.category}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Priority</p>
                  <Badge 
                    variant={
                      selectedTicket.priority === 'high' || selectedTicket.priority === 'urgent'
                        ? 'destructive' 
                        : selectedTicket.priority === 'medium' 
                        ? 'default' 
                        : 'secondary'
                    }
                    className="capitalize"
                  >
                    {selectedTicket.priority}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <h3 className="text-lg text-gray-900 dark:text-white mb-2">{selectedTicket.subject}</h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selectedTicket.status === 'open' 
                      ? 'destructive' 
                      : selectedTicket.status === 'in-progress' || selectedTicket.status === 'in_progress'
                      ? 'default' 
                      : selectedTicket.status === 'closed'
                      ? 'outline'
                      : 'secondary'
                  }
                  className="capitalize"
                >
                  {selectedTicket.status === 'in-progress' || selectedTicket.status === 'in_progress' ? 'In Progress' : selectedTicket.status}
                </Badge>
              </div>
            </div>

            {/* Message Thread */}
            <div className="mb-6">
              <h3 className="text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Conversation ({(selectedTicket.messages || []).length} messages)
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {(selectedTicket.messages || []).map((msg: any, index: number) => (
                  <div 
                    key={index} 
                    className={`rounded-xl p-4 ${
                      msg.sender === 'user' 
                        ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 ml-8' 
                        : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {msg.senderName || (msg.sender === 'user' ? 'User' : 'Support Team')}
                        </Badge>
                        {msg.sender === 'admin' && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Admin Reply</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Form */}
            {selectedTicket.status === 'closed' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    This ticket is closed. Users cannot reply to closed tickets.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {selectedTicket.status !== 'closed' && (
                <>
                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Notification Method
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant={notificationMethod === 'email' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNotificationMethod('email')}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                      <Button
                        variant={notificationMethod === 'sms' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNotificationMethod('sms')}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        SMS
                      </Button>
                      <Button
                        variant={notificationMethod === 'both' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNotificationMethod('both')}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Both
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Your Response
                    </label>
                    <textarea
                      value={ticketResponse}
                      onChange={(e) => setTicketResponse(e.target.value)}
                      placeholder="Type your response to the user..."
                      className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                {selectedTicket.status !== 'closed' && (
                  <Button 
                    size="lg" 
                    className="flex-1"
                    onClick={handleSendTicketResponse}
                    disabled={!ticketResponse.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Response
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="lg">
                      Update Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleUpdateTicket(selectedTicket.id, 'open')}>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateTicket(selectedTicket.id, 'in-progress')}>
                      <Clock className="w-4 h-4 mr-2" />
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateTicket(selectedTicket.id, 'resolved')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Resolved
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleUpdateTicket(selectedTicket.id, 'closed')} className="text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4 mr-2" />
                      Close Ticket
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Details Modal */}
      {showChatDetails && selectedChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowChatDetails(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">
                  {(selectedChat.userName || selectedChat.user_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl text-gray-900 dark:text-white">{selectedChat.userName || selectedChat.user_name || 'Unknown User'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedChat.userEmail || selectedChat.user_email || 'No email'}</p>
                    <Badge variant="outline" className="text-xs">
                      <Phone className="w-3 h-3 mr-1" />
                      WhatsApp
                    </Badge>
                    <Badge 
                      variant={selectedChat.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs capitalize"
                    >
                      {selectedChat.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowChatDetails(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(selectedChat.messages || []).length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                (selectedChat.messages || []).map((msg: any, index: number) => (
                  <div 
                    key={index}
                    className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.sender === 'admin' 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}>
                      <p className="text-xs mb-1 opacity-70">
                        {msg.sender === 'admin' ? (msg.senderName || 'Support Team') : (msg.senderName || selectedChat.userName || 'User')}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender === 'admin' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Integration Notice */}
            <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <strong>WhatsApp Integration Active:</strong> Messages are synced with WhatsApp. User will receive instant notifications.
              </p>
            </div>

            {/* Chat Input */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2 mb-3">
                <Button 
                  variant={selectedChat.status === 'active' ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => {
                    const updatedStatus = selectedChat.status === 'active' ? 'resolved' : 'active';
                    const updatedChat = { ...selectedChat, status: updatedStatus };
                    const updatedChats = chats.map(c => c.id === selectedChat.id ? updatedChat : c);
                    setChats(updatedChats);
                    setSelectedChat(updatedChat);
                    dataService.setItem('pluto_live_chats', JSON.stringify(updatedChats));
                  }}
                >
                  {selectedChat.status === 'active' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Resolved
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Reopen Chat
                    </>
                  )}
                </Button>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 h-12 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Button 
                  size="lg"
                  onClick={handleSendChatMessage}
                  disabled={!chatMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateUser(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4">
              <h2 className="text-2xl text-gray-900 dark:text-white">Create New User</h2>
              <button onClick={() => setShowCreateUser(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* User Credentials Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={newUser.email}
                      placeholder="user@example.com"
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={newUser.phone}
                      placeholder="+1234567890"
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Initial Password <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={newUser.password}
                      placeholder="Enter initial password"
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      User can change this after first login
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      KYC Status
                    </label>
                    <select
                      value={newUser.kyc_status}
                      onChange={(e) => setNewUser({ ...newUser, kyc_status: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Asset Balances Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Initial Balances & Wallet Addresses
                </h3>
                <div className="space-y-4">
                  {assetConfig.map((asset) => (
                    <div key={asset.symbol} className="bg-white dark:bg-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full ${asset.color} flex items-center justify-center text-white`}>
                          {asset.icon}
                        </div>
                        <div>
                          <h4 className="text-gray-900 dark:text-white">{asset.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{asset.symbol}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                            Initial Balance
                          </label>
                          <Input
                            type="number"
                            value={newUser.balances[asset.symbol]}
                            placeholder="0.00"
                            onChange={(e) => setNewUser({
                              ...newUser,
                              balances: { ...newUser.balances, [asset.symbol]: e.target.value }
                            })}
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300 flex items-center justify-between">
                            Wallet Address
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const randomAddr = generateRandomAddress(asset.symbol);
                                setNewUser({
                                  ...newUser,
                                  addresses: { ...newUser.addresses, [asset.symbol]: randomAddr }
                                });
                              }}
                              className="text-xs h-6"
                            >
                              Generate
                            </Button>
                          </label>
                          <Input
                            type="text"
                            value={newUser.addresses[asset.symbol]}
                            placeholder={`${asset.symbol} address`}
                            className={`font-mono text-sm ${newUserAddressErrors[asset.symbol] ? 'border-red-500 dark:border-red-500' : ''}`}
                            onChange={(e) => handleNewUserAddressChange(asset.symbol, e.target.value)}
                          />
                          {newUserAddressErrors[asset.symbol] && (
                            <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm">{newUserAddressErrors[asset.symbol]}</span>
                            </div>
                          )}
                          {!newUserAddressErrors[asset.symbol] && newUser.addresses[asset.symbol] && (
                            <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Valid {asset.symbol} address</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> User credentials will be displayed once after creation. Make sure to save them securely. The user will be able to log in immediately with these credentials. Wallet addresses can be generated automatically or entered manually.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  size="lg" 
                  className="flex-1"
                  onClick={handleCreateUser}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Create User Account
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => setShowCreateUser(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings Modal */}
      {showAdminSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAdminSettings(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4">
              <h2 className="text-2xl text-gray-900 dark:text-white">Admin Settings</h2>
              <button onClick={() => setShowAdminSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                      <User className="w-10 h-10" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Profile Picture</p>
                      <Button variant="outline" size="sm">
                        Change Avatar
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      value={adminProfile.name}
                      onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={adminProfile.email}
                      onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Role
                    </label>
                    <Input
                      type="text"
                      value={adminProfile.role}
                      disabled
                      className="bg-gray-100 dark:bg-gray-600"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Role cannot be changed
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security
                </h3>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      setShowAdminSettings(false);
                      setShowChangePassword(true);
                    }}
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">Two-Factor Authentication</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
                      </div>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Last Login:</strong> {new Date().toLocaleString()}<br />
                  <strong>IP Address:</strong> 192.168.1.1<br />
                  <strong>Session ID:</strong> sess_7x9k2m4p
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  size="lg" 
                  className="flex-1"
                  onClick={() => {
                    alert('Settings saved successfully!');
                    setShowAdminSettings(false);
                  }}
                >
                  Save Changes
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => setShowAdminSettings(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowChangePassword(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900 dark:text-white">Change Password</h2>
              <button onClick={() => setShowChangePassword(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  placeholder="Enter current password"
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  placeholder="Enter new password"
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  placeholder="Confirm new password"
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">Password must contain:</p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className={`w-3 h-3 ${passwordForm.newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`} />
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className={`w-3 h-3 ${/[A-Z]/.test(passwordForm.newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                    One uppercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className={`w-3 h-3 ${/[a-z]/.test(passwordForm.newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                    One lowercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className={`w-3 h-3 ${/[0-9]/.test(passwordForm.newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                    One number
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  size="lg" 
                  className="flex-1"
                  onClick={handleChangePassword}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Update Password
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => {
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setShowChangePassword(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Receipt Modal */}
      {showTransactionReceipt && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowTransactionReceipt(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900 dark:text-white">Transaction Receipt</h2>
              <button onClick={() => setShowTransactionReceipt(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            {editingTransaction ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Admin Mode: Editing transaction details
                  </p>
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Transaction Type</label>
                  <select
                    value={selectedTransaction.type}
                    onChange={(e) => setSelectedTransaction({ ...selectedTransaction, type: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="send">Send</option>
                    <option value="receive">Receive</option>
                    <option value="swap">Swap</option>
                    <option value="buy">Buy</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    value={selectedTransaction.status}
                    onChange={(e) => setSelectedTransaction({ ...selectedTransaction, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Asset */}
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Asset</label>
                    <select
                      value={selectedTransaction.asset}
                      onChange={(e) => setSelectedTransaction({ ...selectedTransaction, asset: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="SOL">SOL</option>
                      <option value="BNB">BNB</option>
                      <option value="TRX">TRX</option>
                      <option value="USDT">USDT</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                    <Input
                      type="text"
                      value={selectedTransaction.amount}
                      onChange={(e) => setSelectedTransaction({ ...selectedTransaction, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Network Fee */}
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Network Fee</label>
                    <Input
                      type="text"
                      value={selectedTransaction.fee}
                      onChange={(e) => setSelectedTransaction({ ...selectedTransaction, fee: e.target.value })}
                      placeholder="0.0001"
                    />
                  </div>

                  {/* Network */}
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Network</label>
                    <select
                      value={selectedTransaction.network || 'Ethereum Mainnet'}
                      onChange={(e) => setSelectedTransaction({ ...selectedTransaction, network: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      <option value="Bitcoin Mainnet">Bitcoin Mainnet</option>
                      <option value="Ethereum Mainnet">Ethereum Mainnet</option>
                      <option value="Solana Mainnet">Solana Mainnet</option>
                      <option value="BNB Smart Chain">BNB Smart Chain</option>
                      <option value="TRON (TRC20)">TRON (TRC20)</option>
                    </select>
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={selectedTransaction.timestamp ? new Date(selectedTransaction.timestamp).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setSelectedTransaction({ ...selectedTransaction, timestamp: new Date(e.target.value).toISOString() })}
                  />
                </div>

                {/* Transaction ID */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Transaction ID</label>
                  <Input
                    type="text"
                    value={selectedTransaction.id}
                    onChange={(e) => setSelectedTransaction({ ...selectedTransaction, id: e.target.value })}
                    className="font-mono text-sm"
                    placeholder="Transaction ID"
                  />
                </div>

                {/* Network Confirmations */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Current Confirmations</label>
                    <Input
                      type="number"
                      value={selectedTransaction.confirmations || 0}
                      onChange={(e) => setSelectedTransaction({ ...selectedTransaction, confirmations: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Required Confirmations</label>
                    <Input
                      type="number"
                      value={selectedTransaction.requiredConfirmations || 6}
                      onChange={(e) => setSelectedTransaction({ ...selectedTransaction, requiredConfirmations: parseInt(e.target.value) || 6 })}
                      min="1"
                    />
                  </div>
                </div>

                {/* From Address */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">From Address</label>
                  <Input
                    type="text"
                    value={selectedTransaction.from || ''}
                    onChange={(e) => setSelectedTransaction({ ...selectedTransaction, from: e.target.value })}
                    className="font-mono text-sm"
                    placeholder="0x..."
                  />
                </div>

                {/* To Address */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">To Address</label>
                  <Input
                    type="text"
                    value={selectedTransaction.to || ''}
                    onChange={(e) => setSelectedTransaction({ ...selectedTransaction, to: e.target.value })}
                    className="font-mono text-sm"
                    placeholder="0x..."
                  />
                </div>

                {/* Transaction Hash */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Transaction Hash</label>
                  <Input
                    type="text"
                    value={selectedTransaction.hash}
                    onChange={(e) => setSelectedTransaction({ ...selectedTransaction, hash: e.target.value })}
                    className="font-mono text-sm"
                    placeholder="0x..."
                  />
                </div>

                {/* Swap-specific fields */}
                {selectedTransaction.type === 'swap' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">To Asset</label>
                      <select
                        value={selectedTransaction.toAsset || 'ETH'}
                        onChange={(e) => setSelectedTransaction({ ...selectedTransaction, toAsset: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                      >
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                        <option value="SOL">SOL</option>
                        <option value="BNB">BNB</option>
                        <option value="TRX">TRX</option>
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">To Amount</label>
                      <Input
                        type="text"
                        value={selectedTransaction.toAmount || ''}
                        onChange={(e) => setSelectedTransaction({ ...selectedTransaction, toAmount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                {/* Buy-specific fields */}
                {selectedTransaction.type === 'buy' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Fiat Amount</label>
                      <Input
                        type="text"
                        value={selectedTransaction.fiatAmount || ''}
                        onChange={(e) => setSelectedTransaction({ ...selectedTransaction, fiatAmount: e.target.value })}
                        placeholder="$100.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                      <select
                        value={selectedTransaction.paymentMethod || 'Credit Card'}
                        onChange={(e) => setSelectedTransaction({ ...selectedTransaction, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                      >
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="PayPal">PayPal</option>
                        <option value="Apple Pay">Apple Pay</option>
                        <option value="Google Pay">Google Pay</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Admin Notes</label>
                  <Textarea
                    value={selectedTransaction.notes || ''}
                    onChange={(e) => setSelectedTransaction({ ...selectedTransaction, notes: e.target.value })}
                    placeholder="Add internal notes about this transaction..."
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    size="lg" 
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    onClick={() => {
                      handleUpdateTransaction(selectedUser.id, selectedTransaction);
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => setEditingTransaction(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-xl border-2 ${
                  selectedTransaction.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                  selectedTransaction.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                  selectedTransaction.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                  'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedTransaction.status === 'pending' || selectedTransaction.status === 'processing' ? (
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-white animate-spin" />
                          </div>
                        </div>
                      ) : selectedTransaction.status === 'completed' ? (
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                          <XCircle className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Transaction Status</p>
                        <p className="text-xl text-gray-900 dark:text-white capitalize">{selectedTransaction.status}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(selectedTransaction.status)}>
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Type</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{selectedTransaction.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Asset</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.asset}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Amount</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.amount} {selectedTransaction.asset}</p>
                    </div>
                    {selectedTransaction.type === 'swap' && (
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Received</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.toAmount} {selectedTransaction.toAsset}</p>
                      </div>
                    )}
                    {selectedTransaction.type === 'buy' && (
                      <>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fiat Amount</p>
                          <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.fiatAmount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payment Method</p>
                          <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.paymentMethod}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Network Fee</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.fee} {selectedTransaction.asset}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Network</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.network}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date & Time</p>
                      <p className="text-sm text-gray-900 dark:text-white">{new Date(selectedTransaction.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction ID</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.id}</p>
                    </div>
                  </div>

                  {(selectedTransaction.confirmations !== undefined) && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Confirmations</p>
                        <p className="text-xs text-gray-900 dark:text-white">
                          {selectedTransaction.confirmations} / {selectedTransaction.requiredConfirmations}
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((selectedTransaction.confirmations / selectedTransaction.requiredConfirmations) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedTransaction.from && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">From Address</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{selectedTransaction.from}</p>
                        <button
                          onClick={async () => {
                            const success = await copyToClipboard(selectedTransaction.from);
                            if (success) {
                              alert('Address copied!');
                            }
                          }}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg shrink-0"
                        >
                          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTransaction.to && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">To Address</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{selectedTransaction.to}</p>
                        <button
                          onClick={async () => {
                            const success = await copyToClipboard(selectedTransaction.to);
                            if (success) {
                              alert('Address copied!');
                            }
                          }}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg shrink-0"
                        >
                          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{selectedTransaction.hash}</p>
                      <button
                        onClick={async () => {
                          const success = await copyToClipboard(selectedTransaction.hash);
                          if (success) {
                            alert('Transaction hash copied!');
                          }
                        }}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg shrink-0"
                      >
                        <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {selectedTransaction.notes && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Admin Notes</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedTransaction.notes}</p>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                  <p className="text-sm text-purple-900 dark:text-purple-200 mb-4">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Admin Actions
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTransaction(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Status
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleUpdateTransactionStatus(selectedUser.id, selectedTransaction.id, 'pending')}>
                          Set as Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateTransactionStatus(selectedUser.id, selectedTransaction.id, 'processing')}>
                          Set as Processing
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateTransactionStatus(selectedUser.id, selectedTransaction.id, 'completed')}>
                          Set as Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateTransactionStatus(selectedUser.id, selectedTransaction.id, 'failed')}>
                          Set as Failed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
                          handleDeleteTransaction(selectedUser.id, selectedTransaction.id);
                          setShowTransactionReceipt(false);
                        }
                      }}
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Report Transaction */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      if (confirm('Are you sure you want to report this transaction as suspicious? This will flag it for review.')) {
                        alert('Transaction reported. An investigation will be initiated.');
                      }
                    }}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Report Transaction
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Login Details Modal */}
      {showLoginDetailsEdit && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowLoginDetailsEdit(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4">
              <h2 className="text-2xl text-gray-900 dark:text-white">Edit Login Details</h2>
              <button onClick={() => setShowLoginDetailsEdit(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Editing Login Details for:</p>
                <p className="text-lg text-gray-900 dark:text-white">{selectedUser.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">User ID: {selectedUser.id}</p>
              </div>

              {/* Password Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
                <h3 className="text-lg text-gray-900 dark:text-white mb-2">Password Management</h3>
                
                {/* Current Password Display */}
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                    Current Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={selectedUser.password || 'Not set'}
                      readOnly
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This is the user's current password (in plain text for admin view)
                  </p>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={editLoginData.newPassword || ''}
                    placeholder="Enter new password"
                    onChange={(e) => setEditLoginData({ ...editLoginData, newPassword: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave blank to keep current password
                  </p>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={editLoginData.confirmPassword || ''}
                    placeholder="Confirm new password"
                    onChange={(e) => setEditLoginData({ ...editLoginData, confirmPassword: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">Password Last Changed</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedUser.passwordLastChanged ? new Date(selectedUser.passwordLastChanged).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editLoginData.twoFactorEnabled}
                      onChange={(e) => setEditLoginData({ ...editLoginData, twoFactorEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    <span className="ml-3 text-sm text-gray-900 dark:text-white">
                      {editLoginData.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                {editLoginData.twoFactorEnabled && (
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div>
                      <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                        Preferred Method
                      </label>
                      <select
                        value={editLoginData.twoFactorMethod}
                        onChange={(e) => setEditLoginData({ ...editLoginData, twoFactorMethod: e.target.value })}
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                      >
                        <option value="passcode">6-Digit Passcode</option>
                        <option value="biometric">Biometric</option>
                      </select>
                    </div>

                    {editLoginData.twoFactorMethod === 'passcode' && (
                      <div>
                        <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                          Passcode
                        </label>
                        <Input
                          type="text"
                          value={editLoginData.passcode}
                          placeholder="Enter 6-digit passcode"
                          maxLength={6}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setEditLoginData({ ...editLoginData, passcode: value });
                          }}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Must be exactly 6 digits
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <span className="text-sm text-gray-900 dark:text-white">Biometric Enabled</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editLoginData.biometricEnabled}
                          onChange={(e) => setEditLoginData({ ...editLoginData, biometricEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Security Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
                <h3 className="text-lg text-gray-900 dark:text-white mb-2">Account Security</h3>
                
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">Account Locked</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Lock/unlock user account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editLoginData.accountLocked}
                      onChange={(e) => setEditLoginData({ ...editLoginData, accountLocked: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                    Failed Login Attempts
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={editLoginData.failedLoginAttempts}
                    onChange={(e) => setEditLoginData({ ...editLoginData, failedLoginAttempts: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Reset to 0 to clear failed login attempts
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditLoginData({ ...editLoginData, failedLoginAttempts: 0, accountLocked: false })}
                  className="w-full"
                >
                  Reset Security Settings
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <Button
                  variant="outline"
                  onClick={() => setShowLoginDetailsEdit(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateLoginDetails}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coin Management Modal */}
      {showCoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCoinModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4">
              <h2 className="text-2xl text-gray-900 dark:text-white">
                {editingCoin ? 'Edit Coin' : 'Add New Coin'}
              </h2>
              <button onClick={() => setShowCoinModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                    Symbol *
                  </label>
                  <Input
                    placeholder="BTC"
                    value={coinForm.symbol}
                    onChange={(e) => setCoinForm({ ...coinForm, symbol: e.target.value.toUpperCase() })}
                    disabled={!!editingCoin}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {editingCoin ? 'Symbol cannot be changed' : 'Unique identifier (e.g., BTC, ETH)'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                    Name *
                  </label>
                  <Input
                    placeholder="Bitcoin"
                    value={coinForm.name}
                    onChange={(e) => setCoinForm({ ...coinForm, name: e.target.value })}
                  />
                </div>
              </div>

              {/* CoinGecko ID */}
              <div>
                <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                  CoinGecko ID
                </label>
                <Input
                  placeholder="bitcoin"
                  value={coinForm.coinGeckoId}
                  onChange={(e) => setCoinForm({ ...coinForm, coinGeckoId: e.target.value.toLowerCase() })}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Required for live price fetching. Find IDs at{' '}
                  <a 
                    href="https://www.coingecko.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    coingecko.com
                  </a>
                  {' '}(e.g., bitcoin, ethereum, dogecoin)
                </p>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                  Logo
                </label>
                <div className="flex items-center gap-4">
                  {coinForm.logoUrl ? (
                    <div className="relative">
                      <img src={coinForm.logoUrl} alt="Logo preview" className="w-20 h-20 rounded-full object-cover" />
                      <button
                        onClick={() => setCoinForm({ ...coinForm, logoUrl: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className={`w-20 h-20 rounded-full ${coinForm.color} flex items-center justify-center text-white text-2xl`}>
                      {coinForm.icon}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="mb-2"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Upload a custom logo or use the icon/color settings below
                    </p>
                  </div>
                </div>
              </div>

              {/* Icon & Color (if no logo uploaded) */}
              {!coinForm.logoUrl && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Icon Character
                    </label>
                    <Input
                      placeholder="₿"
                      value={coinForm.icon}
                      onChange={(e) => setCoinForm({ ...coinForm, icon: e.target.value })}
                      maxLength={2}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Single character or emoji (e.g., ₿, Ξ, ◎)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Background Color
                    </label>
                    <select
                      value={coinForm.color}
                      onChange={(e) => setCoinForm({ ...coinForm, color: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      <option value="bg-orange-500">Orange</option>
                      <option value="bg-blue-500">Blue</option>
                      <option value="bg-blue-600">Dark Blue</option>
                      <option value="bg-purple-500">Purple</option>
                      <option value="bg-purple-600">Dark Purple</option>
                      <option value="bg-yellow-500">Yellow</option>
                      <option value="bg-green-500">Green</option>
                      <option value="bg-green-600">Dark Green</option>
                      <option value="bg-red-500">Red</option>
                      <option value="bg-pink-500">Pink</option>
                      <option value="bg-indigo-500">Indigo</option>
                      <option value="bg-gray-500">Gray</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Preview</p>
                <div className="flex items-center gap-4">
                  {coinForm.logoUrl ? (
                    <img src={coinForm.logoUrl} alt="Preview" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className={`w-14 h-14 rounded-full ${coinForm.color} flex items-center justify-center text-white text-2xl`}>
                      {coinForm.icon}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg text-gray-900 dark:text-white">{coinForm.name || 'Coin Name'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{coinForm.symbol || 'SYMBOL'}</p>
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> {editingCoin ? 'Updating this coin will reflect changes across all user wallets and fee settings.' : 'Adding a new coin will automatically create entries for all existing users with zero balance.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <Button
                  variant="outline"
                  onClick={() => setShowCoinModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCoin}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {editingCoin ? 'Update Coin' : 'Add Coin'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Fee Modal */}
      {editingFee && (() => {
        const assetInfo = assetConfig.find(a => a.symbol === editingFee.asset);
        return (
          <EditFeeModal
            asset={editingFee.asset}
            assetName={assetInfo?.name || editingFee.asset}
            assetIcon={assetInfo?.icon || '?'}
            assetColor={assetInfo?.color || 'bg-gray-500'}
            feeData={editingFee.data}
            onSave={(updatedFee) => handleSaveFee(editingFee.asset, updatedFee)}
            onClose={() => setEditingFee(null)}
          />
        );
      })()}
    </div>
  );
}