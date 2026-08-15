'use client';

import { useState, useEffect } from 'react';

interface Props {
  authToken: string;
  userId: number;
  onSubscribed: () => void;
}

function storageKey(userId: number) {
  return `notifOnboardingSeen_v2_${userId}`;
}

function getDeviceType(): 'ios-browser' | 'ios-standalone' | 'other' {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  if (!isIOS) return 'other';
  return (navigator as any).standalone ? 'ios-standalone' : 'ios-browser';
}

export function NotificationOnboarding({ authToken, userId, onSubscribed }: Props) {
  const [visible, setVisible] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios-browser' | 'ios-standalone' | 'other'>('other');

  useEffect(() => {
    // Don't show if this device is already subscribed as a different user
    const subscribedAs = localStorage.getItem('notifSubscribedUserId');
    if (subscribedAs && parseInt(subscribedAs) !== userId) return;

    if (localStorage.getItem(storageKey(userId))) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      localStorage.setItem(storageKey(userId), 'true');
      return;
    }
    setDeviceType(getDeviceType());
    setVisible(true);
  }, [userId]);

  const dismiss = () => {
    localStorage.setItem(storageKey(userId), 'true');
    setVisible(false);
  };

  const handleEnable = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidKey) {
          try {
            const sub = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapidKey,
            });
            await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
              body: JSON.stringify(sub.toJSON()),
            });
            localStorage.setItem('notifSubscribedUserId', userId.toString());
            onSubscribed();
          } catch (err) {
            console.error('Failed to subscribe:', err);
          }
        }
      }
    }
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🏈</div>
          <h2 className="text-2xl font-bold text-gray-900">Never Miss Your Picks!</h2>
          <p className="text-gray-600 mt-2">
            Get reminders 2 days, 1 day, 2 hours, and 1 hour before the first game of the week.
            Once you've submitted all your picks, the reminders stop automatically.
          </p>
        </div>

        {deviceType === 'ios-browser' ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">iPhone / iPad setup required:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Tap the <strong>Share</strong> button in Safari</li>
              <li>Tap <strong>Add to Home Screen</strong></li>
              <li>Open the app from your home screen</li>
              <li>Then enable notifications from here</li>
            </ol>
          </div>
        ) : (
          <button
            onClick={handleEnable}
            className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 mb-3"
          >
            Enable Notifications
          </button>
        )}

        <button
          onClick={dismiss}
          className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          {deviceType === 'ios-browser' ? 'Skip for now' : 'Maybe later'}
        </button>
      </div>
    </div>
  );
}
