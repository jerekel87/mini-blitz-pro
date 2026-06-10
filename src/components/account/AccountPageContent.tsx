import clsx from 'clsx';
import { ExternalLink } from 'lucide-react';
import type { AccountPageId } from '../../lib/userAccount';
import { getInitials } from '../../lib/userAccount';
import type { useUserAccount } from '../../hooks/useUserAccount';
import { UserAvatar } from './UserAvatar';
import { SelectInput } from './SelectInput';
import { TEMPLATES } from '../../lib/templates';
import { GROK_PRESET, providerLabel, usesDevProxy } from '../../lib/aiSettings';
import { formatUsageValue } from '../../lib/accountUsage';
import { useAiSettingsState } from '../../hooks/useAiSettingsState';

type AccountApi = ReturnType<typeof useUserAccount>;

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="account-field">
      <span className="account-field-label">{label}</span>
      {hint && <p className="account-field-hint">{hint}</p>}
      <div className="account-field-control">{children}</div>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label
      className="account-toggle-row"
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className="account-toggle-copy">
        <span className="account-toggle-label">{label}</span>
        <p className="account-toggle-desc">{description}</p>
      </div>
      <span className={clsx('account-toggle-switch', checked && 'account-toggle-switch-on')} aria-hidden>
        <span className="account-toggle-switch-thumb" />
      </span>
    </label>
  );
}

function ToggleList({ children }: { children: React.ReactNode }) {
  return <div className="account-toggle-list">{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="account-section">
      <h3 className="account-section-title">{title}</h3>
      <div className="account-section-body">{children}</div>
    </section>
  );
}

export function AccountPageContent({
  page,
  api,
  onOpenGrokSettings,
  onApplyDefaultTemplate,
  onSignOut,
}: {
  page: AccountPageId;
  api: AccountApi;
  onOpenGrokSettings?: () => void;
  onApplyDefaultTemplate?: () => void | Promise<void>;
  onSignOut?: () => void;
}) {
  const {
    account,
    updateProfile,
    updateSettings,
    updateAppearance,
    updateNotifications,
    updateSecurity,
    updateBilling,
    signOutOtherSessions,
  } = api;
  const aiSettings = useAiSettingsState();
  const p = account.profile;

  if (page === 'profile') {
    return (
      <div className="account-page-stack">
        <Section title="Your avatar">
          <div className="flex flex-wrap items-center gap-6">
            <UserAvatar displayName={p.displayName} size="xl" imageUrl={p.avatarUrl} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-2xl font-semibold tracking-tight text-xai-fg">
                {getInitials(p.displayName)}
              </p>
              <p className="text-sm text-xai-muted">
                Solid initials from your display name — first letter of your first name and first
                letter of your last name.
              </p>
              <p className="font-mono text-xs text-xai-secondary">
                {p.displayName.trim().split(/\s+/).filter(Boolean).length >= 2
                  ? `e.g. ${p.displayName} → ${getInitials(p.displayName)}`
                  : 'Add first and last name for two-letter initials'}
              </p>
            </div>
          </div>
        </Section>
        <Section title="Basic info">
          <div className="account-form-grid grid gap-5 sm:grid-cols-2">
            <Field label="Display name">
              <input
                className="input-field text-sm"
                value={p.displayName}
                onChange={(e) => updateProfile({ displayName: e.target.value })}
              />
            </Field>
            <Field label="Username">
              <input
                className="input-field text-sm"
                value={p.username}
                onChange={(e) => updateProfile({ username: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="input-field text-sm"
                value={p.email}
                onChange={(e) => updateProfile({ email: e.target.value })}
              />
            </Field>
            <Field label="Company">
              <input
                className="input-field text-sm"
                value={p.company}
                onChange={(e) => updateProfile({ company: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <input
                className="input-field text-sm"
                value={p.location}
                onChange={(e) => updateProfile({ location: e.target.value })}
              />
            </Field>
            <Field label="Website">
              <input
                className="input-field text-sm"
                value={p.website}
                onChange={(e) => updateProfile({ website: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Bio">
            <textarea
              className="input-field min-h-[80px] resize-none text-sm"
              value={p.bio}
              onChange={(e) => updateProfile({ bio: e.target.value })}
              placeholder="A short bio for your Grok Build profile"
            />
          </Field>
        </Section>
      </div>
    );
  }

  if (page === 'settings') {
    const s = account.settings;
    return (
      <div className="account-page-stack">
        <Section title="Editor">
          <ToggleList>
            <Toggle
              checked={s.autoSave}
              onChange={(v) => updateSettings({ autoSave: v })}
              label="Auto-save files"
              description="Save changes automatically as you edit — no manual save needed."
            />
            <Toggle
              checked={s.formatOnSave}
              onChange={(v) => updateSettings({ formatOnSave: v })}
              label="Format on save"
              description="Run the formatter each time a file is saved."
            />
            <Toggle
              checked={s.wordWrap}
              onChange={(v) => updateSettings({ wordWrap: v })}
              label="Word wrap"
              description="Wrap long lines in the editor instead of horizontal scrolling."
            />
            <Toggle
              checked={s.vimMode}
              onChange={(v) => updateSettings({ vimMode: v })}
              label="Vim keybindings"
              description="Use Vim-style modal editing in the code editor."
            />
          </ToggleList>
          <Field label="Tab size">
            <SelectInput
              value={s.tabSize}
              onChange={(e) => updateSettings({ tabSize: Number(e.target.value) as 2 | 4 })}
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </SelectInput>
          </Field>
        </Section>
        <Section title="New projects">
          <Field label="Default template">
            <SelectInput
              value={s.defaultTemplate}
              onChange={(e) => updateSettings({ defaultTemplate: e.target.value })}
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <button
            type="button"
            className="btn-secondary !text-xs"
            onClick={() => void onApplyDefaultTemplate?.()}
          >
            Apply default template to current project
          </button>
        </Section>
      </div>
    );
  }

  if (page === 'api-keys') {
    const ai = aiSettings.settings;
    const hasKey = !!ai.apiKey.trim();
    return (
      <div className="account-page-stack">
        <Section title="Ask Jeremy">
          <p className="text-sm text-xai-muted">
            Keys are stored locally in your browser. Use the dev proxy when running{' '}
            <code className="font-mono text-xs text-xai-secondary">npm run dev</code>.
          </p>
          {usesDevProxy(ai.baseUrl) && (
            <p className="text-sm text-emerald-400/90">
              {providerLabel(ai.baseUrl)} → proxied through this dev server
            </p>
          )}
          <p className="text-xs text-xai-secondary">
            Status: {hasKey ? 'API key configured' : 'No API key — add one to generate patches'}
          </p>
          <Field label="API key">
            <input
              type="password"
              className="input-field font-mono text-sm"
              value={ai.apiKey}
              placeholder="sk-…"
              onChange={(e) => aiSettings.update({ apiKey: e.target.value })}
            />
          </Field>
          <Field label="Base URL">
            <input
              className="input-field font-mono text-sm"
              value={ai.baseUrl}
              onChange={(e) => aiSettings.update({ baseUrl: e.target.value })}
            />
          </Field>
          <Field label="Model">
            <input
              className="input-field font-mono text-sm"
              value={ai.model}
              onChange={(e) => aiSettings.update({ model: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary !text-xs"
              onClick={() =>
                aiSettings.replace({ ...ai, ...GROK_PRESET, apiKey: ai.apiKey })
              }
            >
              Apply Grok preset
            </button>
            {onOpenGrokSettings && (
              <button type="button" className="btn-ghost !text-xs" onClick={onOpenGrokSettings}>
                Open in Ask Jeremy
              </button>
            )}
          </div>
        </Section>
        <Section title="Integrations">
          <p className="text-sm text-xai-muted">
            GitHub, GitLab, and deploy hooks will connect here. For now, use Ask Jeremy with your API
            key above.
          </p>
        </Section>
      </div>
    );
  }

  if (page === 'appearance') {
    const a = account.appearance;
    return (
      <div className="account-page-stack">
        <Section title="Appearance">
          <Field label="Editor font size">
            <SelectInput
              value={a.fontSize}
              onChange={(e) => updateAppearance({ fontSize: e.target.value as typeof a.fontSize })}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </SelectInput>
          </Field>
          <ToggleList>
            <Toggle
              checked={a.compactMode}
              onChange={(v) => updateAppearance({ compactMode: v })}
              label="Compact UI density"
              description="Tighter spacing in panels, tabs, and side navigation."
            />
          </ToggleList>
        </Section>
      </div>
    );
  }

  if (page === 'notifications') {
    const n = account.notifications;
    return (
      <div className="account-page-stack">
        <Section title="Alerts">
          <ToggleList>
            <Toggle
              checked={n.buildFailures}
              onChange={(v) => updateNotifications({ buildFailures: v })}
              label="Build & WebContainer failures"
              description="Alert when preview builds fail or the WebContainer session errors."
            />
            <Toggle
              checked={n.aiPatchReady}
              onChange={(v) => updateNotifications({ aiPatchReady: v })}
              label="Ask Jeremy patch ready"
              description="Notify when a suggested patch is ready to review and apply."
            />
            <Toggle
              checked={n.emailDigest}
              onChange={(v) => updateNotifications({ emailDigest: v })}
              label="Weekly email digest"
              description="A short summary of project activity and usage, once per week."
            />
            <Toggle
              checked={n.productUpdates}
              onChange={(v) => updateNotifications({ productUpdates: v })}
              label="Product updates"
              description="Occasional notes on new Grok Build features and improvements."
            />
          </ToggleList>
        </Section>
      </div>
    );
  }

  if (page === 'security') {
    const sec = account.security;
    return (
      <div className="account-page-stack">
        <Section title="Account security">
          <Field label="Password">
            <button
              type="button"
              className="btn-secondary !text-xs"
              onClick={() => {
                const next = window.prompt('Set a local sign-in PIN (demo only, stored in this browser):');
                if (next && next.length >= 4) {
                  updateSecurity({ localPinSet: true });
                  window.alert('PIN saved locally. Full account SSO will replace this in production.');
                }
              }}
            >
              Set local PIN (demo)
            </button>
          </Field>
          <ToggleList>
            <Toggle
              checked={sec.twoFactorEnabled}
              onChange={(v) => updateSecurity({ twoFactorEnabled: v })}
              label="Two-factor authentication"
              description="Require a second verification step when signing in to your account."
            />
          </ToggleList>
          <Field label="Session timeout">
            <SelectInput
              value={sec.sessionTimeoutMins}
              onChange={(e) =>
                updateSecurity({ sessionTimeoutMins: Number(e.target.value) as typeof sec.sessionTimeoutMins })
              }
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={480}>8 hours</option>
            </SelectInput>
          </Field>
        </Section>
        <Section title="Active sessions">
          <p className="text-sm text-xai-muted">This device · Last active now</p>
          <button
            type="button"
            className="btn-ghost mt-2 !text-xs text-red-300"
            onClick={() => {
              signOutOtherSessions();
              window.alert('Other sessions cleared (local demo).');
            }}
          >
            Sign out all other sessions
          </button>
          {onSignOut && (
            <button
              type="button"
              className="btn-secondary mt-3 !text-xs"
              onClick={() => {
                if (window.confirm('Sign out and reset all local data?')) onSignOut();
              }}
            >
              Sign out on this device
            </button>
          )}
        </Section>
      </div>
    );
  }

  if (page === 'billing') {
    const b = account.billing;
    return (
      <div className="account-page-stack">
        <Section title="Current plan">
          <div className="account-plan-block">
            <p className="text-lg font-semibold capitalize text-xai-fg">{b.plan}</p>
            <p className="mt-1 text-sm text-xai-muted">
              {b.plan === 'free'
                ? 'WebContainer hours and AI patches included with fair-use limits.'
                : 'Unlimited private projects and priority compute.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {b.plan !== 'pro' && (
                <button
                  type="button"
                  className="btn-primary !text-xs"
                  onClick={() => updateBilling({ plan: 'pro', seats: 1 })}
                >
                  Upgrade to Pro
                </button>
              )}
              {b.plan !== 'team' && (
                <button
                  type="button"
                  className="btn-secondary !text-xs"
                  onClick={() => updateBilling({ plan: 'team', seats: 5 })}
                >
                  Upgrade to Team
                </button>
              )}
              {b.plan !== 'free' && (
                <button
                  type="button"
                  className="btn-ghost !text-xs"
                  onClick={() => updateBilling({ plan: 'free', seats: 1 })}
                >
                  Downgrade to Free
                </button>
              )}
            </div>
          </div>
        </Section>
        <Section title="Invoices">
          <p className="text-sm text-xai-muted">
            {b.plan === 'free'
              ? 'No invoices on the Free plan.'
              : 'Sample invoice #1001 — paid (demo). Billing is stored locally in this preview build.'}
          </p>
        </Section>
      </div>
    );
  }

  if (page === 'usage') {
    const u = account.usage;
    const rows = [
      { key: 'webContainerMinutes' as const, label: 'WebContainer' },
      { key: 'aiPatches' as const, label: 'AI patches' },
      { key: 'storageBytes' as const, label: 'Storage' },
    ];
    return (
      <div className="account-page-stack">
        <Section title="This billing period">
          <p className="mb-4 text-xs text-xai-muted">
            Period started {new Date(u.periodStartedAt).toLocaleDateString()} — tracked locally in
            this browser.
          </p>
          <div className="account-usage-grid">
            {rows.map((row) => {
              const formatted = formatUsageValue(row.key, u);
              return (
                <div key={row.label} className="account-usage-cell">
                  <p className="text-2xs uppercase tracking-wider text-xai-muted">{row.label}</p>
                  <p className="mt-1 text-lg font-semibold text-xai-fg">{formatted.value}</p>
                  <p className="text-2xs text-xai-muted">of {formatted.cap}</p>
                </div>
              );
            })}
          </div>
        </Section>
        <Section title="Documentation">
          <a
            href="https://docs.x.ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-xai-fg hover:underline"
          >
            Usage & limits <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Section>
      </div>
    );
  }

  return null;
}