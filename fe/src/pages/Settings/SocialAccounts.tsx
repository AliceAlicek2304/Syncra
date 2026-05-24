import { useState, useEffect, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  Loader2,
  AlertTriangle,
  ExternalLink,
  UserCircle2,
} from 'lucide-react';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import BillingGateOverlay from '../../components/BillingGateOverlay';
import styles from './SocialAccounts.module.css';
import { useWorkspace } from '../../context/WorkspaceContext';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SocialAccountDto {
  id: string;
  platform: string;
  displayName: string;
  handle?: string;
  avatarUrl?: string;
  isActive: boolean;
  connectedAtUtc: string;
}

interface BillingErrorBody {
  reason: string;
  dashboardUrl: string;
  message?: string;
}

interface BillingOverlayState {
  isOpen: boolean;
  reason: string;
  dashboardUrl: string;
}

interface DisconnectState {
  accountId: string;
  platform: string;
  displayName: string;
  scheduledPostCount?: number;
}

// ─── Platform metadata ───────────────────────────────────────────────────────

const PLATFORMS = [
  { key: 'twitter',          label: 'Twitter / X',           color: '#e7e9ea' },
  { key: 'facebook',         label: 'Facebook',               color: '#1877f2' },
  { key: 'instagram',        label: 'Instagram',              color: '#e4405f' },
  { key: 'linkedin',         label: 'LinkedIn',               color: '#0a66c2' },
  { key: 'tiktok',           label: 'TikTok',                 color: '#ff0050' },
  { key: 'youtube',          label: 'YouTube',                color: '#ff0000' },
  { key: 'pinterest',        label: 'Pinterest',              color: '#e60023' },
  { key: 'google_business',  label: 'Google Business',        color: '#4285f4' },
  { key: 'snapchat',         label: 'Snapchat',               color: '#fffc00' },
  { key: 'reddit',           label: 'Reddit',                 color: '#ff4500' },
  { key: 'threads',          label: 'Threads',                color: '#e7e9ea' },
  { key: 'mastodon',         label: 'Mastodon',               color: '#6364ff' },
  { key: 'bluesky',          label: 'Bluesky',                color: '#0085ff' },
  { key: 'tumblr',           label: 'Tumblr',                 color: '#35465c' },
] as const;

type PlatformKey = typeof PLATFORMS[number]['key'];

// ─── Platform brand icons (inline SVG paths) ─────────────────────────────────

function PlatformIcon({ platformKey, color }: { platformKey: PlatformKey; color: string }) {
  switch (platformKey) {
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.74-8.851L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      );
    case 'google_business':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34a853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fbbc05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ea4335" />
        </svg>
      );
    case 'snapchat':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M12.065.001c1.368-.007 4.254.399 5.765 3.12.538.967.565 2.605.539 3.847l-.004.259c.005.044.025.083.059.107a4.31 4.31 0 0 0 1.073.482c.47.163 1.031.367 1.048.975.013.468-.336.81-.726.989-.126.057-.362.131-.548.189-.32.097-.75.228-.877.457a.52.52 0 0 0-.017.435c.38.892 1.684 3.029 3.871 3.452.134.026.23.14.228.278a.284.284 0 0 1-.012.086c-.151.51-1.102.879-2.912 1.128-.044.006-.108.083-.124.163l-.063.354c-.031.176-.08.453-.295.453-.074 0-.153-.02-.252-.043-.29-.067-.689-.158-1.285-.158-.33 0-.678.033-1.035.098-.698.129-1.299.586-1.988 1.104-.924.699-1.972 1.49-3.495 1.49-.049 0-.095-.001-.143-.003l-.143.003c-1.523 0-2.571-.791-3.495-1.49-.689-.518-1.29-.975-1.988-1.104a5.98 5.98 0 0 0-1.035-.098c-.603 0-1.001.092-1.291.159-.097.022-.177.042-.252.042-.215 0-.264-.278-.295-.454l-.062-.353c-.016-.08-.08-.157-.124-.163-1.81-.249-2.761-.619-2.912-1.128a.284.284 0 0 1-.012-.086.282.282 0 0 1 .228-.278c2.187-.424 3.491-2.56 3.871-3.452a.52.52 0 0 0-.017-.435c-.127-.229-.558-.36-.877-.457-.186-.058-.421-.132-.547-.188-.391-.18-.74-.522-.727-.99.017-.607.579-.811 1.048-.975.308-.108.6-.219.849-.352.174-.093.337-.222.333-.398l-.006-.37C3.68 3.497 3.697 1.97 4.17 1.121 5.652.355 8.601.003 9.965.001Z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    case 'threads':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.312-.883-2.371-.887h-.02c-.785 0-1.962.218-2.8 1.322l-1.603-1.21C8.26 2.392 9.999 1.895 11.828 1.89h.028c1.647.006 3.045.467 4.055 1.43 1.107 1.055 1.67 2.62 1.674 4.648 0 .044-.001.09-.003.135l.064.065.007.064c.843.472 1.58 1.09 2.175 1.833.91 1.13 1.326 2.574 1.152 4.046-.174 1.48-.912 2.773-2.087 3.733-1.466 1.197-3.469 1.8-5.951 1.793zm-.516-6.82c-.13.005-.262.015-.394.03-1.024.076-1.822.391-2.255.88a1.714 1.714 0 0 0-.436 1.338c.057.89.607 1.55 1.546 1.86.671.22 1.498.258 2.202.1.984-.22 1.74-.74 2.178-1.503.358-.625.558-1.467.593-2.506a12.4 12.4 0 0 0-3.434-.2z" />
        </svg>
      );
    case 'mastodon':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
        </svg>
      );
    case 'bluesky':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.3-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z" />
        </svg>
      );
    case 'tumblr':
      return (
        <svg viewBox="0 0 24 24" fill={color} width="22" height="22">
          <path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.558h-2.5V6.726c3.628-1.326 4.963-4.661 5.168-6.602.055-.528.437-.124.437-.124V6.32h4.37v3.238h-4.37v7.714c0 1.42.583 2.74 2.586 2.74h1.843V24h-.503z" />
        </svg>
      );
    default:
      return <UserCircle2 size={22} color={color} />;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SocialAccounts() {
  const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [accounts, setAccounts] = useState<SocialAccountDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [pendingDisconnect, setPendingDisconnect] = useState<DisconnectState | null>(null);
  const [billingOverlay, setBillingOverlay] = useState<BillingOverlayState>({
    isOpen: false,
    reason: '',
    dashboardUrl: '',
  });

  const { success: showSuccess, error: showError } = useToast();

  const showLoading = isLoading || workspaceLoading || !activeWorkspace;

  // ─ Fetch connected accounts ─────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const response = await api.get<SocialAccountDto[]>('social-accounts', {
        headers: {
          'X-Workspace-Id': activeWorkspace.id
        }
      });
      setAccounts(response.data);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load connected accounts';
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [showError, activeWorkspace]);

  useEffect(() => {
    if (activeWorkspace) {
      fetchAccounts();
    }
  }, [activeWorkspace, fetchAccounts]);

  // ─ Billing gate helper ───────────────────────────────────────────────────

  const handleBillingError = (err: unknown) => {
    const resp = (err as { response?: { status?: number; data?: BillingErrorBody } })?.response;
    if (resp?.status === 402) {
      setBillingOverlay({
        isOpen: true,
        reason: resp.data?.reason ?? 'free_tier_exceeded',
        dashboardUrl: resp.data?.dashboardUrl ?? '',
      });
      return true;
    }
    return false;
  };

  // ─ Connect flow ──────────────────────────────────────────────────────────

  const handleConnect = async (platform: string) => {
    if (!activeWorkspace) return;
    setConnectingPlatform(platform);
    try {
      const callbackUrl = `${window.location.origin}/Syncra/social-accounts/select`;
      const response = await api.get<{ connectUrl: string }>(
        `social-accounts/connect-url/${platform}`,
        {
          params: { redirectUrl: callbackUrl },
          headers: {
            'X-Workspace-Id': activeWorkspace.id
          }
        }
      );
      window.location.href = response.data.connectUrl;
    } catch (err) {
      if (!handleBillingError(err)) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          `Failed to start ${platform} connection`;
        showError(msg);
      }
    } finally {
      setConnectingPlatform(null);
    }
  };

  // ─ Disconnect flow ───────────────────────────────────────────────────────

  const openDisconnectDialog = (account: SocialAccountDto) => {
    setPendingDisconnect({
      accountId: account.id,
      platform: account.platform,
      displayName: account.displayName,
    });
  };

  const confirmDisconnect = async () => {
    if (!pendingDisconnect || !activeWorkspace) return;
    setDisconnecting(pendingDisconnect.accountId);
    setPendingDisconnect(null);
    try {
      await api.delete(`social-accounts/${pendingDisconnect.accountId}`, {
        headers: {
          'X-Workspace-Id': activeWorkspace.id
        }
      });
      showSuccess(`${pendingDisconnect.displayName} disconnected successfully`);
      await fetchAccounts();
    } catch (err) {
      if (!handleBillingError(err)) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to disconnect account';
        showError(msg);
      }
    } finally {
      setDisconnecting(null);
    }
  };

  // ─ Lookup helper ─────────────────────────────────────────────────────────

  const getConnectedAccount = (platformKey: string) =>
    accounts.find(
      (a) => a.platform.toLowerCase() === platformKey.toLowerCase() && a.isActive
    );

  // ─ Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Platform grid */}
      <div className={styles.grid}>
        {PLATFORMS.map((platform) => {
          const connected = getConnectedAccount(platform.key);
          const isConnecting = connectingPlatform === platform.key;
          const isDisconnecting = connected ? disconnecting === connected.id : false;

          return (
            <div
              key={platform.key}
              className={`${styles.card} ${connected ? styles.cardConnected : ''}`}
            >
              {/* Platform icon */}
              <div
                className={styles.iconWrap}
                style={{ background: `${platform.color}20`, borderColor: `${platform.color}30` }}
              >
                <PlatformIcon platformKey={platform.key} color={platform.color} />
              </div>

              {/* Platform info */}
              <div className={styles.cardMeta}>
                <span className={styles.platformName}>{platform.label}</span>

                {connected ? (
                  <span className={styles.statusConnected}>
                    <span className={styles.dot} />
                    {connected.handle || connected.displayName}
                  </span>
                ) : (
                  <span className={styles.statusDisconnected}>
                    <WifiOff size={11} />
                    Not connected
                  </span>
                )}
              </div>

              {/* Avatar (if connected) */}
              {connected?.avatarUrl && (
                <img
                  src={connected.avatarUrl}
                  alt={connected.displayName}
                  className={styles.avatar}
                />
              )}

              {/* Action button */}
              {connected ? (
                <button
                  className={styles.btnDisconnect}
                  onClick={() => openDisconnectDialog(connected)}
                  disabled={isDisconnecting}
                  title={`Disconnect ${platform.label}`}
                >
                  {isDisconnecting ? (
                    <Loader2 size={13} className={styles.spinner} />
                  ) : (
                    'Disconnect'
                  )}
                </button>
              ) : (
                <button
                  className={styles.btnConnect}
                  onClick={() => handleConnect(platform.key)}
                  disabled={isConnecting || showLoading}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={13} className={styles.spinner} />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink size={13} />
                      Connect {platform.label}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {showLoading && (
        <div className={styles.loadingOverlay}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading accounts...</span>
        </div>
      )}

      {/* Disconnect confirmation dialog */}
      {pendingDisconnect && (
        <div className={styles.dialogBackdrop} role="dialog" aria-modal="true">
          <div className={styles.dialogCard}>
            <div className={styles.dialogIcon}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3 className={styles.dialogTitle}>
              Disconnect {pendingDisconnect.platform}
            </h3>
            <p className={styles.dialogBody}>
              Are you sure you want to disconnect{' '}
              <strong>{pendingDisconnect.displayName}</strong> from this workspace?
              All pending posts scheduled for this account will be canceled.
              This action cannot be undone.
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.btnDanger} onClick={confirmDisconnect}>
                Yes, Disconnect
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => setPendingDisconnect(null)}
              >
                Keep Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing gate overlay */}
      <BillingGateOverlay
        isOpen={billingOverlay.isOpen}
        reason={billingOverlay.reason}
        dashboardUrl={billingOverlay.dashboardUrl}
        onClose={() =>
          setBillingOverlay((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Empty state */}
      {!showLoading && accounts.length === 0 && (
        <div className={styles.emptyState}>
          <Wifi size={32} className={styles.emptyIcon} />
          <h4>No Social Accounts Connected</h4>
          <p>
            Link your social channels to schedule posts, view performance analytics,
            and reply to messages from a single workspace dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
