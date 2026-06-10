import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserNotifications } from '../lib/userAccount';

interface Toast {
  id: number;
  message: string;
}

interface AccountNotificationContextValue {
  push: (message: string, kind?: keyof UserNotifications) => void;
}

const AccountNotificationContext = createContext<AccountNotificationContextValue | null>(
  null
);

export function AccountNotificationProvider({
  children,
  preferences,
}: {
  children: ReactNode;
  preferences: UserNotifications;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback(
    (message: string, kind?: keyof UserNotifications) => {
      if (kind && !preferences[kind]) return;
      const id = Date.now();
      setToasts((t) => [...t.slice(-2), { id, message }]);
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 5000);
    },
    [preferences]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <AccountNotificationContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="account-toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <p key={t.id} className="account-toast">
              {t.message}
            </p>
          ))}
        </div>
      )}
    </AccountNotificationContext.Provider>
  );
}

export function useAccountNotification(): AccountNotificationContextValue {
  const ctx = useContext(AccountNotificationContext);
  if (!ctx) {
    return { push: () => {} };
  }
  return ctx;
}