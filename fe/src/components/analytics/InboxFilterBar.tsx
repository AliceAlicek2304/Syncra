import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCcw, ChevronDown, Check, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { useInboxAnalytics } from '../../hooks/useInboxAnalytics';
import { ZERNIO_PLATFORMS } from '../../data/platforms';
import { ExtendedPlatformIcon } from '../create-post/platformIcons';
import type { InboxMessageSource } from '../../types/inbox-analytics';
import { cn } from '../../lib/utils';

interface FilterOption {
  value: string;
  label: string;
  iconPlatform?: string;
}

function FilterDropdown({
  value,
  onChange,
  options,
  label,
  leftIcon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  label: string;
  leftIcon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value) ?? options[0];

  const renderOptionLabel = (option?: FilterOption) => {
    if (!option) return label;
    return (
      <span className="flex items-center gap-1.5 min-w-0">
        {option.iconPlatform && (
          <span className="shrink-0 flex items-center">
            <ExtendedPlatformIcon platform={option.iconPlatform} size={14} />
          </span>
        )}
        <span className="truncate">{option.label}</span>
      </span>
    );
  };

  return (
    <div className="relative flex items-center shrink-0" ref={ref}>
      <button
        type="button"
        className={`h-9 pl-3 pr-8 py-1.5 flex items-center justify-between bg-white border border-brand-border rounded-brand-sm text-xs font-semibold text-brand-ink-soft hover:bg-brand-canvas-soft/60 hover:border-brand-primary transition-all outline-none cursor-pointer gap-2 relative ${
          open ? 'bg-brand-canvas-soft border-brand-primary' : ''
        }`}
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
          <span className="text-left select-none">{renderOptionLabel(selected)}</span>
        </span>
        <ChevronDown
          size={12}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-brand-body opacity-70 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-brand-border rounded-brand-md shadow-lg z-50 py-1 overflow-y-auto max-h-60">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 outline-none ${
                opt.value === value
                  ? 'bg-brand-canvas-soft text-brand-primary font-bold'
                  : 'text-brand-ink hover:bg-brand-canvas-soft/40 hover:text-brand-primary'
              }`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span className="w-4 shrink-0 flex items-center justify-center">
                {opt.value === value ? <Check size={14} className="text-brand-primary" /> : null}
              </span>
              {renderOptionLabel(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SOURCE_OPTIONS: { value: InboxMessageSource | 'all'; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'human', label: 'Human' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'broadcast', label: 'Broadcast' },
  { value: 'comment_automation', label: 'Comment automation' },
  { value: 'api', label: 'API' },
  { value: 'contact', label: 'Contact' },
  { value: 'platform', label: 'Platform' },
];

export const InboxFilterBar = ({ profileId }: { profileId?: string }) => {
  const {
    presetOptions,
    presetDays,
    setPresetDays,
    platform,
    setPlatform,
    source,
    setSource,
    rangeLabel,
    isFetching,
    refresh,
  } = useInboxAnalytics({ profileId });

  const dateOptions = presetOptions.map((o) => ({ value: String(o.days), label: o.label }));
  const platformOptions = [
    { value: 'all', label: 'All platforms' },
    ...ZERNIO_PLATFORMS.map((p) => ({ value: p.id, label: p.label, iconPlatform: p.id })),
  ];
  const sourceOptions = SOURCE_OPTIONS.map((s) => ({ value: s.value, label: s.label }));

  return (
    <div className="flex flex-col gap-3 rounded-brand-md border border-brand-border bg-white p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 mr-2">
          <Inbox className="h-4 w-4 text-brand-body" />
          <span className="text-sm font-bold text-brand-ink">Inbox Analytics</span>
        </div>

        <FilterDropdown
          value={String(presetDays)}
          onChange={(v) => setPresetDays(Number(v) as any)}
          options={dateOptions}
          label="Date range"
          leftIcon={<Calendar size={12} className="text-brand-body" />}
        />
        <span className="text-xs text-brand-body-mid ml-1">{rangeLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown
          value={platform ?? 'all'}
          onChange={(v) => setPlatform(v === 'all' ? undefined : v)}
          options={platformOptions}
          label="Platform"
        />

        <FilterDropdown
          value={source}
          onChange={(v) => setSource(v as any)}
          options={sourceOptions}
          label="Source"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          className="h-9 border-brand-border bg-white text-xs font-bold"
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <RefreshCcw className="h-4 w-4 mr-1.5" />
          )}
          Refresh
        </Button>
      </div>
    </div>
  );
};

export const InboxBanner = ({ profileId }: { profileId?: string }) => {
  const { inboxError, isNotConnected, isBillingGate, isScopeError, isError, refresh } =
    useInboxAnalytics({ profileId });

  if (!isError || !inboxError) return null;

  if (isNotConnected) {
    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-brand-md border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center md:justify-between'
        )}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Zernio is not connected</h3>
            <p className="text-sm text-amber-800">
              Connect your Zernio account in workspace settings to unlock inbox analytics.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="bg-amber-600 text-white hover:bg-amber-700">
          <a href={inboxError.dashboardUrl ?? '/app/settings'} target="_blank" rel="noreferrer">
            Open Zernio dashboard
          </a>
        </Button>
      </div>
    );
  }

  if (isBillingGate) {
    return (
      <div className="flex flex-col gap-2 rounded-brand-md border border-rose-200 bg-rose-50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-rose-700" />
          <div>
            <h3 className="text-sm font-semibold text-rose-900">Analytics add-on required</h3>
            <p className="text-sm text-rose-800">
              {inboxError.message ?? 'Your plan does not include inbox analytics.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isScopeError) {
    return (
      <div className="flex flex-col gap-2 rounded-brand-md border border-indigo-200 bg-indigo-50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-indigo-700" />
          <div>
            <h3 className="text-sm font-semibold text-indigo-900">Reauthorize Zernio</h3>
            <p className="text-sm text-indigo-800">
              Required scopes are missing. Reconnect Zernio to continue.
            </p>
          </div>
        </div>
        {inboxError.reauthorizeUrl && (
          <Button asChild size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700">
            <a href={inboxError.reauthorizeUrl} target="_blank" rel="noreferrer">
              Reauthorize
            </a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-brand-md border border-rose-200 bg-rose-50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-rose-700" />
        <div>
          <h3 className="text-sm font-semibold text-rose-900">Could not load inbox analytics</h3>
          <p className="text-sm text-rose-800">{inboxError.message}</p>
          {inboxError.code && (
            <p className="text-xs text-rose-700">code: {inboxError.code}</p>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={refresh} className="border-rose-200 bg-white">
        Try again
      </Button>
    </div>
  );
};
