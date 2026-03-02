import dataService from '../../utils/dataService';
import { X, Bell, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useState, useEffect } from 'react';

interface NotificationModalProps {
  onClose: () => void;
  onOpenSupport: () => void;
  walletId?: string;
}

export default function NotificationModal({ onClose, onOpenSupport, walletId }: NotificationModalProps) {
  // Load notifications from localStorage (admin-sent notifications)
  const [notifications, setNotifications] = useState<any[]>([]);
  
  useEffect(() => {
    const loadNotifications = () => {
      try {
        // Get wallet ID from localStorage if not provided
        const currentWalletId = walletId || JSON.parse(dataService.getItem('pluto_wallet') || '{}').id;
        if (!currentWalletId) return;
        
        const stored = dataService.getItem(`pluto_notifications_${currentWalletId}`);
        if (stored) {
          setNotifications(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };
    
    loadNotifications();
  }, [walletId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'announcement':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'promo':
        return <Bell className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl text-gray-900 dark:text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">No notifications</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                You'll be notified about important updates
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border ${
                  notification.read
                    ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {notification.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>


      </div>
    </div>
  );
}