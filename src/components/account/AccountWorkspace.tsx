import { useState } from 'react';
import type { AccountPageId } from '../../lib/userAccount';
import { ACCOUNT_PAGES } from '../../lib/userAccount';
import type { useUserAccount } from '../../hooks/useUserAccount';
import { AccountRail } from './AccountRail';
import { AccountPageContent } from './AccountPageContent';

interface AccountWorkspaceProps {
  api: ReturnType<typeof useUserAccount>;
  onExit: () => void;
  onSignOut: () => void;
  onApplyDefaultTemplate?: () => void | Promise<void>;
  onOpenAskJeremy?: () => void;
}

export function AccountWorkspace({
  api,
  onExit,
  onSignOut,
  onApplyDefaultTemplate,
  onOpenAskJeremy,
}: AccountWorkspaceProps) {
  const [page, setPage] = useState<AccountPageId>('profile');
  const meta = ACCOUNT_PAGES.find((p) => p.id === page)!;
  const { account } = api;

  return (
    <div className="account-workspace flex min-h-0 min-w-0 flex-1">
      <AccountRail
        activePage={page}
        onPageChange={setPage}
        onExit={onExit}
        onSignOut={onSignOut}
        displayName={account.profile.displayName}
        avatarUrl={account.profile.avatarUrl}
      />

      <div className="account-main flex min-h-0 min-w-0 flex-1 flex-col bg-xai-bg">
        <header className="account-page-header">
          <div className="min-w-0">
            <p className="account-page-eyebrow">Account</p>
            <h1 className="account-page-title">{meta.label}</h1>
            <p className="account-page-desc">{meta.description}</p>
          </div>
        </header>

        <div className="account-page-scroll">
          <div className="account-page-inner">
            <AccountPageContent
              page={page}
              api={api}
              onOpenGrokSettings={onOpenAskJeremy}
              onApplyDefaultTemplate={onApplyDefaultTemplate}
              onSignOut={onSignOut}
            />
          </div>
        </div>
      </div>
    </div>
  );
}