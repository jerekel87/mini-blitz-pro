import clsx from 'clsx';
import { ArrowLeft, LogOut } from 'lucide-react';
import { ACCOUNT_NAV_PAGES, type AccountPageId } from '../../lib/userAccount';
import { UserAvatar } from './UserAvatar';

interface AccountRailProps {
  activePage: AccountPageId;
  onPageChange: (page: AccountPageId) => void;
  onExit: () => void;
  onSignOut: () => void;
  displayName: string;
  avatarUrl?: string | null;
}

export function AccountRail({
  activePage,
  onPageChange,
  onExit,
  onSignOut,
  displayName,
  avatarUrl,
}: AccountRailProps) {
  return (
    <nav
      className="activity-rail account-rail flex w-[var(--rail-width)] shrink-0 flex-col border-r border-xai-border-subtle bg-xai-surface"
      aria-label="Account navigation"
    >
      <div className="flex shrink-0 flex-col items-center pb-2 pt-4">
        <button
          type="button"
          onClick={onExit}
          className="rail-btn"
          aria-label="Back to Cloud IDE"
          title="Back to Cloud IDE"
        >
          <span className="rail-circle rail-back-circle">
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1 py-2">
        {ACCOUNT_NAV_PAGES.map(({ id, label, icon: Icon }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPageChange(id)}
              className="rail-btn"
              aria-label={label}
              title={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={clsx('rail-circle rail-btn-circle', isActive && 'rail-btn-circle-active')}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="account-rail-footer flex shrink-0 flex-col items-center gap-2 border-t border-xai-border-subtle py-3">
        <button
          type="button"
          onClick={() => onPageChange('profile')}
          className="rail-btn"
          aria-label="Profile"
          title="Profile"
          aria-current={activePage === 'profile' ? 'page' : undefined}
        >
          <span
            className={clsx(
              'rail-circle rail-btn-circle overflow-hidden p-0',
              activePage === 'profile' && 'rail-btn-circle-active',
            )}
          >
            <UserAvatar
              displayName={displayName}
              imageUrl={avatarUrl}
              size="md"
              className="!h-full !w-full !text-[0.6875rem]"
            />
          </span>
        </button>
        <button
          type="button"
          className="rail-btn"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => {
            if (window.confirm('Sign out and reset local workspace data?')) onSignOut();
          }}
        >
          <span className="rail-circle rail-btn-circle">
            <LogOut className="h-[17px] w-[17px]" strokeWidth={1.5} />
          </span>
        </button>
      </div>
    </nav>
  );
}