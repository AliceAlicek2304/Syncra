import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronDown, Check, X, Info, Copy, Loader2, HelpCircle, Key, ShieldCheck
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { workspacesApi } from '../../api/workspaces';
import type { SocialAccountDto } from '../../api/socialAccounts';
import { socialAccountsApi, type AccountHealthDto } from '../../api/socialAccounts';
import api from '../../lib/axios';
import styles from './ConnectionsPage.module.css';

// ── Platform Metadata ────────────────────────────────────────────────────────
interface PlatformConfig {
  id: string;
  label: string;
  color: string;
  isSupported: boolean;
}

const ALL_PLATFORMS: PlatformConfig[] = [
  { id: 'tiktok', label: 'TikTok', color: '#ff0050', isSupported: true },
  { id: 'instagram', label: 'Instagram', color: '#e4405f', isSupported: true },
  { id: 'facebook', label: 'Facebook', color: '#1877f2', isSupported: true },
  { id: 'youtube', label: 'YouTube', color: '#ff0000', isSupported: true },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2', isSupported: true },
  { id: 'twitter', label: 'Twitter / X', color: '#201515', isSupported: true },
  { id: 'threads', label: 'Threads', color: '#201515', isSupported: true },
  { id: 'bluesky', label: 'Bluesky', color: '#0085ff', isSupported: true },
  { id: 'pinterest', label: 'Pinterest', color: '#e60023', isSupported: true },
  { id: 'reddit', label: 'Reddit', color: '#ff4500', isSupported: true },
  { id: 'googlebusiness', label: 'Google Business', color: '#4285f4', isSupported: true },
  { id: 'telegram', label: 'Telegram', color: '#0088cc', isSupported: true },
  { id: 'discord', label: 'Discord', color: '#5865f2', isSupported: false },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25d366', isSupported: true },
  { id: 'metaads', label: 'Meta Ads', color: '#0081fb', isSupported: false },
  { id: 'linkedinads', label: 'LinkedIn Ads', color: '#0a66c2', isSupported: false },
  { id: 'pinterestads', label: 'Pinterest Ads', color: '#e60023', isSupported: false },
  { id: 'tiktokads', label: 'TikTok Ads', color: '#ff0050', isSupported: false },
  { id: 'googleads', label: 'Google Ads', color: '#4285f4', isSupported: false },
  { id: 'xads', label: 'X Ads', color: '#201515', isSupported: false },
  { id: 'snapchat', label: 'Snapchat', color: '#fffc00', isSupported: true },
];

function PlatformIcon({ platform, size = 20 }: { platform: string; size?: number }) {
  const color = "currentColor";
  const p = platform.toLowerCase();
  switch (p) {
    case 'twitter':
    case 'twitter/x':
    case 'xads':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.74-8.851L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      );
    case 'facebook':
    case 'metaads':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      );
    case 'linkedin':
    case 'linkedinads':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'tiktok':
    case 'tiktokads':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'pinterest':
    case 'pinterestads':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      );
    case 'googlebusiness':
    case 'googleads':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34a853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fbbc05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ea4335" />
        </svg>
      );
    case 'snapchat':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M12.065.001c1.368-.007 4.254.399 5.765 3.12.538.967.565 2.605.539 3.847l-.004.259c.005.044.025.083.059.107a4.31 4.31 0 0 0 1.073.482c.47.163 1.031.367 1.048.975.013.468-.336.81-.726.989-.126.057-.362.131-.548.189-.32.097-.75.228-.877.457a.52.52 0 0 0-.017.435c.38.892 1.684 3.029 3.871 3.452.134.026.23.14.228.278a.284.284 0 0 1-.012.086c-.151.51-1.102.879-2.912 1.128-.044.006-.108.083-.124.163l-.063.354c-.031.176-.08.453-.295.453-.074 0-.153-.02-.252-.043-.29-.067-.689-.158-1.285-.158-.33 0-.678.033-1.035.098-.698.129-1.299.586-1.988 1.104-.924.699-1.972 1.49-3.495 1.49-.049 0-.095-.001-.143-.003l-.143.003c-1.523 0-2.571-.791-3.495-1.49-.689-.518-1.29-.975-1.988-1.104a5.98 5.98 0 0 0-1.035-.098c-.603 0-1.001.092-1.291.159-.097.022-.177.042-.252.042-.215 0-.264-.278-.295-.454l-.062-.353c-.016-.08-.08-.157-.124-.163-1.81-.249-2.761-.619-2.912-1.128a.284.284 0 0 1-.012-.086.282.282 0 0 1 .228-.278c2.187-.424 3.491-2.56 3.871-3.452a.52.52 0 0 0-.017-.435c-.127-.229-.558-.36-.877-.457-.186-.058-.421-.132-.547-.188-.391-.18-.74-.522-.727-.99.017-.607.579-.811 1.048-.975.308-.108.6-.219.849-.352.174-.093.337-.222.333-.398l-.006-.37C3.68 3.497 3.697 1.97 4.17 1.121 5.652.355 8.601.003 9.965.001Z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    case 'threads':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.312-.883-2.371-.887h-.02c-.785 0-1.962.218-2.8 1.322l-1.603-1.21C8.26 2.392 9.999 1.895 11.828 1.89h.028c1.647.006 3.045.467 4.055 1.43 1.107 1.055 1.67 2.62 1.674 4.648 0 .044-.001.09-.003.135l.064.065.007.064c.843.472 1.58 1.09 2.175 1.833.91 1.13 1.326 2.574 1.152 4.046-.174 1.48-.912 2.773-2.087 3.733-1.466 1.197-3.469 1.8-5.951 1.793zm-.516-6.82c-.13.005-.262.015-.394.03-1.024.076-1.822.391-2.255.88a1.714 1.714 0 0 0-.436 1.338c.057.89.607 1.55 1.546 1.86.671.22 1.498.258 2.202.1.984-.22 1.74-.74 2.178-1.503.358-.625.558-1.467.593-2.506a12.4 12.4 0 0 0-3.434-.2z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    case 'bluesky':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.3-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.76-1.653-2.059-.173-.3-.018-.462.13-.61.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      );
    case 'discord':
      return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
        </svg>
      );
    default:
      return <HelpCircle size={size} color={color} />;
  }
}

interface PlatformPermissions {
  requiredPosting: string[];
  requiredAnalytics: string[];
  optional: string[];
}

function getPlatformPermissions(platform: string): PlatformPermissions {
  const p = platform.toLowerCase();
  switch (p) {
    case 'facebook':
      return {
        requiredPosting: ['pages_manage_posts', 'pages_read_engagement'],
        requiredAnalytics: ['pages_read_engagement', 'read_insights'],
        optional: ['pages_show_list', 'pages_manage_engagement', 'pages_read_user_content', 'business_management', 'pages_messaging', 'pages_manage_metadata']
      };
    case 'instagram':
      return {
        requiredPosting: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
        requiredAnalytics: ['instagram_basic', 'instagram_manage_insights'],
        optional: ['pages_read_engagement', 'business_management']
      };
    case 'youtube':
      return {
        requiredPosting: ['youtube.upload', 'youtube.readonly'],
        requiredAnalytics: ['yt-analytics.readonly', 'yt-analytics-monetization.readonly'],
        optional: ['youtube', 'youtube.force-ssl']
      };
    case 'tiktok':
      return {
        requiredPosting: ['video.publish', 'video.upload'],
        requiredAnalytics: ['user.info.stats', 'video.list'],
        optional: ['user.info.basic', 'video.search']
      };
    case 'linkedin':
      return {
        requiredPosting: ['w_member_social'],
        requiredAnalytics: ['r_organization_social', 'r_liteprofile'],
        optional: ['w_organization_social']
      };
    default:
      return {
        requiredPosting: ['post.write', 'offline_access'],
        requiredAnalytics: ['analytics.read'],
        optional: ['user.read']
      };
  }
}

// ── Account Health Modal ─────────────────────────────────────────────────────

function HealthModal({ account, workspaceId, onClose }: {
  account: SocialAccountDto & { workspace: { id: string; name: string; color: string; isDefault: boolean } };
  workspaceId: string;
  onClose: () => void;
}) {
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['account-health', account.id],
    queryFn: () => socialAccountsApi.getAccountHealth(workspaceId, account.id),
    enabled: !!workspaceId,
  });

  const s = health?.status.toLowerCase() ?? '';

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>Account Health</h2>
              <p className={styles.modalSubtitle}>
                @{account.displayName || account.externalAccountId} · {account.platform}
              </p>
            </div>
            <button className={styles.modalCloseBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.modalBody}>
            {isLoading ? (
              <div className={styles.healthLoading}>
                <Loader2 size={24} className={styles.spinner} />
                <p>Loading health data...</p>
              </div>
            ) : error ? (
              <div className={styles.healthBadgeError}>
                <X size={18} />
                <span>Failed to load health data</span>
              </div>
            ) : health ? (
              <>
                <div className={`${styles.healthBadge} ${s === 'healthy' ? styles.healthBadgeOk : s === 'warning' ? styles.healthBadgeWarn : styles.healthBadgeError}`}>
                  {s === 'healthy' ? <Check size={18} /> : <X size={18} />}
                  <span className={styles.healthBadgeLabel}>{health.status}</span>
                </div>

                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>
                    <Key size={14} />
                    <span>Token Status</span>
                  </h3>
                  <div className={styles.metaList}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Valid</span>
                      <span className={health.tokenStatus.valid ? styles.metaValueOk : styles.metaValueBad}>
                        {health.tokenStatus.valid ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Expires in</span>
                      <span className={styles.metaValue}>
                        {health.tokenStatus.expiresIn ?? (health.tokenStatus.expiresAt
                          ? `${Math.max(0, Math.ceil((new Date(health.tokenStatus.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days`
                          : 'Unknown')}
                      </span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Expires at</span>
                      <span className={styles.metaValue}>
                        {health.tokenStatus.expiresAt
                          ? new Date(health.tokenStatus.expiresAt).toLocaleDateString()
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>
                    <ShieldCheck size={14} />
                    <span>Permissions</span>
                  </h3>
                  <div className={styles.permGrid}>
                    <div className={health.permissions.canPost ? styles.permBadgeOk : styles.permBadgeFail}>
                      {health.permissions.canPost ? '✓' : '✗'} Can Post
                    </div>
                    <div className={health.permissions.canFetchAnalytics ? styles.permBadgeOk : styles.permBadgeFail}>
                      {health.permissions.canFetchAnalytics ? '✓' : '✗'} Analytics
                    </div>
                  </div>

                  {health.permissions.posting.length > 0 && (
                    <div className={styles.permSubSection}>
                      <p className={styles.permSubTitle}>Required for posting:</p>
                      <div className={styles.permTagsList}>
                        {health.permissions.posting.map(s => (
                          <span key={s.scope} className={s.granted ? styles.permTagOk : styles.permTagFail}>
                            {s.granted ? '✓' : '✗'} {s.scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {health.permissions.analytics.length > 0 && (
                    <div className={styles.permSubSection}>
                      <p className={styles.permSubTitle}>For analytics:</p>
                      <div className={styles.permTagsList}>
                        {health.permissions.analytics.map(s => (
                          <span key={s.scope} className={s.granted ? styles.permTagOk : styles.permTagFail}>
                            {s.granted ? '✓' : '✗'} {s.scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {health.permissions.optional.length > 0 && (
                    <div className={styles.permSubSection}>
                      <p className={styles.permSubTitle}>Optional:</p>
                      <div className={styles.permTagsList}>
                        {health.permissions.optional.map(s => (
                          <span key={s.scope} className={s.granted ? styles.permTagOk : styles.permTagMuted}>
                            {s.granted ? '✓' : '✗'} {s.scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {health.issues.length > 0 && (
                  <div className={styles.issuesBox}>
                    <h3 className={styles.issuesBoxTitle}>
                      <X size={14} />
                      <span>Issues</span>
                    </h3>
                    <ul className={styles.issuesList}>
                      {health.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {health.recommendations.length > 0 && (
                  <div className={styles.recsBox}>
                    <h3 className={styles.recsBoxTitle}>
                      <HelpCircle size={14} />
                      <span>Recommendations</span>
                    </h3>
                    <ul className={styles.recsList}>
                      {health.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.modalCloseActionBtn} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MockPageOption {
  id: string;
  name: string;
  avatarUrl: string;
  category: string;
}

function getPlatformPages(platform: string, displayName: string): MockPageOption[] {
  const p = platform.toLowerCase();
  switch (p) {
    case 'facebook':
      return [
        { id: 'fb-1', name: displayName, avatarUrl: '', category: 'Dịch vụ kỹ thuật' },
        { id: 'fb-2', name: `${displayName} Team`, avatarUrl: '', category: 'Doanh nghiệp địa phương' },
        { id: 'fb-3', name: `${displayName} Community`, avatarUrl: '', category: 'Cộng đồng' }
      ];
    case 'instagram':
      return [
        { id: 'ig-1', name: displayName, avatarUrl: '', category: 'Trang cá nhân' },
        { id: 'ig-2', name: `${displayName}_business`, avatarUrl: '', category: 'Người sáng tạo nội dung' }
      ];
    case 'youtube':
      return [
        { id: 'yt-1', name: displayName, avatarUrl: '', category: 'Kênh chính thức' },
        { id: 'yt-2', name: `${displayName} Vlogs`, avatarUrl: '', category: 'Giải trí' }
      ];
    case 'tiktok':
      return [
        { id: 'tt-1', name: displayName, avatarUrl: '', category: 'Tài khoản cá nhân' },
        { id: 'tt-2', name: `${displayName} Pro`, avatarUrl: '', category: 'Thương hiệu' }
      ];
    default:
      return [
        { id: 'gen-1', name: displayName, avatarUrl: '', category: 'Mặc định' }
      ];
  }
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const { workspaces, activeWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();
  const { success: showSuccess, error: showError } = useToast();

  const [selectedHealthAccount, setSelectedHealthAccount] = useState<(SocialAccountDto & { workspace: typeof workspaces[0] }) | null>(null);
  const [selectedManagePagesAccount, setSelectedManagePagesAccount] = useState<(SocialAccountDto & { workspace: typeof workspaces[0] }) | null>(null);

  // Drawers open state
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  const [isNewConnectionOpen, setIsNewConnectionOpen] = useState(false);

  // Form states
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [newWorkspaceColor, setNewWorkspaceColor] = useState('#fda4af'); // Rose color as default indicator

  // New Connection selection states
  const [selectedWorkspaceForConnection, setSelectedWorkspaceForConnection] = useState<string>('');
  const [isConnWorkspaceDropdownOpen, setIsConnWorkspaceDropdownOpen] = useState(false);

  // Filters state
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState<string>('all');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Filter dropdown visibility
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsWorkspaceDropdownOpen(false);
        setIsPlatformDropdownOpen(false);
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync selectedWorkspaceForConnection with active workspace when drawer opens
  useEffect(() => {
    if (activeWorkspace) {
      setSelectedWorkspaceForConnection(activeWorkspace.id);
    } else if (workspaces.length > 0) {
      setSelectedWorkspaceForConnection(workspaces[0].id);
    }
  }, [activeWorkspace, workspaces, isNewConnectionOpen]);

  // Fetch connections for selected workspace or all workspaces
  const { data: connections = [], isLoading: isConnectionsLoading } = useQuery<
    (SocialAccountDto & { workspace: typeof workspaces[0] })[]
  >({
    queryKey: ['connections-list', selectedWorkspaceFilter, workspaces.map(w => w.id).join(',')],
    queryFn: async () => {
      if (selectedWorkspaceFilter === 'all') {
        const promises = workspaces.map(async (ws) => {
          try {
            const accounts = await socialAccountsApi.getSocialAccounts(ws.id);
            return accounts.map(acc => ({ ...acc, workspace: ws }));
          } catch (err) {
            console.error(`Error loading social accounts for workspace ${ws.name}`, err);
            return [];
          }
        });
        const results = await Promise.all(promises);
        return results.flat();
      } else {
        const ws = workspaces.find(w => w.id === selectedWorkspaceFilter);
        if (!ws) return [];
        try {
          const accounts = await socialAccountsApi.getSocialAccounts(ws.id);
          return accounts.map(acc => ({ ...acc, workspace: ws }));
        } catch (err) {
          console.error(`Error loading social accounts for workspace ${ws.name}`, err);
          return [];
        }
      }
    },
    enabled: workspaces.length > 0,
  });

  // Create Workspace Mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      return workspacesApi.createWorkspace(data);
    },
    onSuccess: (newWorkspace) => {
      showSuccess(`Workspace "${newWorkspace.name}" created successfully`);
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setIsNewWorkspaceOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create workspace';
      showError(msg);
    }
  });

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) {
      showError('Please enter a workspace name');
      return;
    }
    const slug = newWorkspaceName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    createWorkspaceMutation.mutate({ name: newWorkspaceName, slug });
  };

  // Disconnect Connection Mutation
  const disconnectMutation = useMutation({
    mutationFn: async ({ accountId, workspaceId }: { accountId: string; workspaceId: string }) => {
      await api.delete(`social-accounts/${accountId}`, {
        headers: {
          'X-Workspace-Id': workspaceId
        }
      });
    },
    onSuccess: () => {
      showSuccess("Disconnected successfully");
      void queryClient.invalidateQueries({ queryKey: ['connections-list'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-integrations'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to disconnect social account';
      showError(msg);
    }
  });

  // Handle platform connection
  const handleConnectPlatform = async (platformId: string) => {
    const config = ALL_PLATFORMS.find(p => p.id === platformId);
    if (!config?.isSupported) {
      showError(`${config?.label || platformId} integration is coming soon! Under development.`);
      return;
    }
    if (!selectedWorkspaceForConnection) {
      showError("Please select a workspace first.");
      return;
    }
    try {
      const callbackUrl = `${window.location.origin}/Syncra/social-accounts/select`;
      const response = await api.get<{ connectUrl: string }>(
        `social-accounts/connect-url/${platformId}`,
        {
          params: { redirectUrl: callbackUrl },
          headers: { 'X-Workspace-Id': selectedWorkspaceForConnection },
        }
      );
      // Close modal and redirect
      setIsNewConnectionOpen(false);
      window.location.href = response.data.connectUrl;
    } catch (err: any) {
      const msg = err?.response?.data?.message || `Failed to connect ${platformId}`;
      showError(msg);
    }
  };

  // Filter connections
  const filteredConnections = connections.filter(conn => {
    const matchesPlatform = selectedPlatformFilter === 'all' || conn.platform.toLowerCase() === selectedPlatformFilter.toLowerCase();
    const matchesStatus = selectedStatusFilter === 'all' || (selectedStatusFilter === 'connected' ? conn.isActive : !conn.isActive);
    return matchesPlatform && matchesStatus;
  });

  const hasActiveFilters = selectedWorkspaceFilter !== 'all' || selectedPlatformFilter !== 'all' || selectedStatusFilter !== 'all';

  const resetFilters = () => {
    setSelectedWorkspaceFilter('all');
    setSelectedPlatformFilter('all');
    setSelectedStatusFilter('all');
  };

  const getWorkspaceName = (id: string) => {
    if (id === 'all') return 'All workspaces';
    return workspaces.find(w => w.id === id)?.name || id;
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    showSuccess("Copied ID to clipboard");
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Connections</h1>
          <p className={styles.subtitle}>Manage workspaces and platform integrations</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.newConnBtn}
            onClick={() => setIsNewConnectionOpen(true)}
          >
            <Plus size={16} />
            <span>New Connection</span>
          </button>
          <button
            className={styles.newProfileBtn}
            onClick={() => setIsNewWorkspaceOpen(true)}
          >
            New Workspace
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={styles.filterBar} ref={dropdownRef}>
        <div className={styles.filterLeft}>
          <span className={styles.filterLabel}>Platforms</span>

          {/* Workspace Filter Dropdown */}
          <div className={styles.dropdownContainer}>
            <button
              className={styles.dropdownTrigger}
              onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            >
              <span>{getWorkspaceName(selectedWorkspaceFilter)}</span>
              <ChevronDown size={14} />
            </button>
            {isWorkspaceDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${selectedWorkspaceFilter === 'all' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedWorkspaceFilter('all');
                    setIsWorkspaceDropdownOpen(false);
                  }}
                >
                  <span>All workspaces</span>
                  {selectedWorkspaceFilter === 'all' && <Check size={14} />}
                </button>
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    className={`${styles.dropdownItem} ${selectedWorkspaceFilter === ws.id ? styles.activeItem : ''}`}
                    onClick={() => {
                      setSelectedWorkspaceFilter(ws.id);
                      setIsWorkspaceDropdownOpen(false);
                    }}
                  >
                    <div className={styles.workspaceOptRow}>
                      <span className={styles.workspaceDot} />
                      <span className={styles.workspaceOptName}>{ws.name}</span>
                      {ws.role === 'owner' && <span className={styles.defaultBadge}>default</span>}
                    </div>
                    {selectedWorkspaceFilter === ws.id && <Check size={14} />}
                  </button>
                ))}
                <div className={styles.dropdownDivider} />
                <button
                  className={styles.dropdownAddBtn}
                  onClick={() => {
                    setIsWorkspaceDropdownOpen(false);
                    setIsNewWorkspaceOpen(true);
                  }}
                >
                  <Plus size={14} />
                  <span>Create new workspace...</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.filterRight}>
          {/* Platform Filter Dropdown */}
          <div className={styles.dropdownContainer}>
            <button
              className={styles.dropdownTriggerSecondary}
              onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
            >
              <span>{selectedPlatformFilter === 'all' ? 'All platforms' : ALL_PLATFORMS.find(p => p.id === selectedPlatformFilter)?.label}</span>
              <ChevronDown size={14} />
            </button>
            {isPlatformDropdownOpen && (
              <div className={`${styles.dropdownMenu} ${styles.platformDropdownScroll}`}>
                <button
                  className={`${styles.dropdownItem} ${selectedPlatformFilter === 'all' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedPlatformFilter('all');
                    setIsPlatformDropdownOpen(false);
                  }}
                >
                  <span>All platforms</span>
                  {selectedPlatformFilter === 'all' && <Check size={14} />}
                </button>
                {ALL_PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    className={`${styles.dropdownItem} ${selectedPlatformFilter === p.id ? styles.activeItem : ''}`}
                    onClick={() => {
                      setSelectedPlatformFilter(p.id);
                      setIsPlatformDropdownOpen(false);
                    }}
                  >
                    <div className={styles.platformItemRow}>
                      <span className={styles.platformIconSpan} style={{ color: p.color }}>
                        <PlatformIcon platform={p.id} size={14} />
                      </span>
                      <span>{p.label}</span>
                    </div>
                    {selectedPlatformFilter === p.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className={styles.dropdownContainer}>
            <button
              className={styles.dropdownTriggerSecondary}
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            >
              <span>{selectedStatusFilter === 'all' ? 'All statuses' : selectedStatusFilter === 'connected' ? 'Connected' : 'Disconnected'}</span>
              <ChevronDown size={14} />
            </button>
            {isStatusDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${selectedStatusFilter === 'all' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedStatusFilter('all');
                    setIsStatusDropdownOpen(false);
                  }}
                >
                  <span>All statuses</span>
                  {selectedStatusFilter === 'all' && <Check size={14} />}
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatusFilter === 'connected' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedStatusFilter('connected');
                    setIsStatusDropdownOpen(false);
                  }}
                >
                  <span>Connected</span>
                  {selectedStatusFilter === 'connected' && <Check size={14} />}
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatusFilter === 'disconnected' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedStatusFilter('disconnected');
                    setIsStatusDropdownOpen(false);
                  }}
                >
                  <span>Disconnected</span>
                  {selectedStatusFilter === 'disconnected' && <Check size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <button className={styles.resetBtn} onClick={resetFilters}>
              <X size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Connection Cards Grid */}
      {isConnectionsLoading || isWorkspaceLoading ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={32} />
          <p>Loading connections...</p>
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className={styles.emptyState}>
          <HelpCircle size={48} className={styles.emptyIcon} />
          <h2>No connections found</h2>
          <p>Link your social channels to schedule posts and monitor analytics.</p>
          <button
            className={styles.newConnBtn}
            style={{ marginTop: '16px' }}
            onClick={() => setIsNewConnectionOpen(true)}
          >
            <Plus size={16} />
            <span>Connect platform</span>
          </button>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {filteredConnections.map((account) => {
            const platformConfig = ALL_PLATFORMS.find(p => p.id === account.platform.toLowerCase());
            const displayDate = account.connectedAtUtc
              ? new Date(account.connectedAtUtc).toLocaleDateString()
              : 'Unknown';

            return (
              <div key={account.id} className={styles.card}>
                {/* Info and Card Top */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <div
                      className={styles.platformIconWrap}
                      style={{
                        backgroundColor: `${platformConfig?.color || '#ff4f00'}15`,
                        color: platformConfig?.color || '#ff4f00',
                        borderColor: `${platformConfig?.color || '#ff4f00'}30`
                      }}
                    >
                      <PlatformIcon platform={account.platform} size={18} />
                    </div>
                    <div>
                      <h3 className={styles.cardPlatformName}>{platformConfig?.label || account.platform}</h3>
                      <div className={styles.statusBadge}>
                        <span className={styles.statusDot} />
                        <span>connected</span>
                      </div>
                    </div>
                  </div>
                  <button
                    className={styles.infoBtn}
                    title="Connection details"
                    onClick={() => setSelectedHealthAccount(account)}
                  >
                    <Info size={16} />
                  </button>
                </div>

                {/* Card Body */}
                <div className={styles.cardBody}>
                  <div className={styles.workspaceDisplay}>
                    {account.displayName || account.externalAccountId}
                  </div>
                  <div className={styles.connectionMeta}>
                    {account.displayName || account.externalAccountId} • {displayDate}
                  </div>
                  <div
                    className={styles.handleBlock}
                    onClick={() => setSelectedWorkspaceFilter(account.workspace.id)}
                    title={`Filter by workspace: ${account.workspace.name}`}
                  >
                    <span className={styles.handleDot} />
                    <span className={styles.handleText}>{account.workspace.name}</span>
                    <button
                      className={styles.copyBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyId(account.workspace.name);
                      }}
                      title="Copy workspace name"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>

                {/* Card Actions */}
                <div className={styles.cardActions}>
                  <button
                    className={styles.managePagesBtn}
                    onClick={() => setSelectedManagePagesAccount(account)}
                  >
                    Manage Pages
                  </button>
                  <button
                    className={styles.disconnectBtn}
                    onClick={() => {
                      if (confirm(`Are you sure you want to disconnect ${account.displayName}?`)) {
                        disconnectMutation.mutate({ accountId: account.id, workspaceId: account.workspace.id });
                      }
                    }}
                    disabled={disconnectMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DRAWER 1: Create New Workspace Drawer */}
      {isNewWorkspaceOpen && (
        <div className={styles.drawerBackdrop}>
          <div className={styles.drawerCard}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>Create new workspace</h2>
                <p className={styles.drawerSubtitle}>Add a new workspace to organize your social accounts.</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => setIsNewWorkspaceOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className={styles.drawerForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Workspace Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., Personal, Business, Agency"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Optional description"
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  rows={4}
                  maxLength={200}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Color</label>
                <div className={styles.colorPickerContainer}>
                  <div className={styles.colorBox} style={{ backgroundColor: newWorkspaceColor }} />
                  <div className={styles.colorPalette}>
                    {['#fda4af', '#f0abfc', '#c084fc', '#818cf8', '#93c5fd', '#86efac', '#fde047', '#fdba74'].map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.colorPaletteBtn} ${newWorkspaceColor === color ? styles.colorPaletteBtnActive : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewWorkspaceColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.drawerFooter}>
                <button
                  type="submit"
                  className={styles.drawerSubmitBtn}
                  disabled={createWorkspaceMutation.isPending}
                >
                  {createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
                </button>
                <button
                  type="button"
                  className={styles.drawerCancelBtn}
                  onClick={() => setIsNewWorkspaceOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER 2: New Connection Drawer */}
      {isNewConnectionOpen && (
        <div className={styles.drawerBackdrop}>
          <div className={styles.drawerCard}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>New Connection</h2>
                <p className={styles.drawerSubtitle}>Choose a workspace and platform to connect.</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => setIsNewConnectionOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Workspace Selection */}
              <div className={styles.formGroup} style={{ position: 'relative' }}>
                <label className={styles.formLabel}>Workspace</label>
                <button
                  className={styles.drawerDropdownTrigger}
                  onClick={() => setIsConnWorkspaceDropdownOpen(!isConnWorkspaceDropdownOpen)}
                >
                  <span>
                    {selectedWorkspaceForConnection
                      ? workspaces.find(w => w.id === selectedWorkspaceForConnection)?.name
                      : 'Select a workspace'}
                  </span>
                  <ChevronDown size={14} />
                </button>

                {isConnWorkspaceDropdownOpen && (
                  <div className={styles.drawerDropdownMenu}>
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        className={`${styles.dropdownItem} ${selectedWorkspaceForConnection === ws.id ? styles.activeItem : ''}`}
                        onClick={() => {
                          setSelectedWorkspaceForConnection(ws.id);
                          setIsConnWorkspaceDropdownOpen(false);
                        }}
                      >
                        <div className={styles.workspaceOptRow}>
                          <span className={styles.workspaceDot} />
                          <span>{ws.name}</span>
                        </div>
                        {selectedWorkspaceForConnection === ws.id && <Check size={14} />}
                      </button>
                    ))}
                    <div className={styles.dropdownDivider} />
                    <button
                      className={styles.dropdownAddBtn}
                      onClick={() => {
                        setIsConnWorkspaceDropdownOpen(false);
                        setIsNewWorkspaceOpen(true);
                      }}
                    >
                      <Plus size={14} />
                      <span>Create new workspace...</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Platforms Grid Section */}
              <div className={styles.platformsSection}>
                <h3 className={styles.platformsSectionTitle}>Platforms</h3>

                <div className={styles.platformsGridContainer}>
                  {/* Blur Overlay if no workspace is selected */}
                  {!selectedWorkspaceForConnection && (
                    <div className={styles.platformsGridBlurOverlay}>
                      <div className={styles.blurCard}>
                        <h4 className={styles.blurCardTitle}>Select a workspace first</h4>
                        <p className={styles.blurCardText}>Pick a workspace above to choose what to connect.</p>
                      </div>
                    </div>
                  )}

                  <div className={`${styles.platformsGrid} ${!selectedWorkspaceForConnection ? styles.platformsGridBlur : ''}`}>
                    {ALL_PLATFORMS.map(p => (
                      <button
                        key={p.id}
                        className={styles.platformButton}
                        onClick={() => handleConnectPlatform(p.id)}
                        disabled={!selectedWorkspaceForConnection}
                      >
                        <div
                          className={styles.platformBtnIconWrap}
                          style={{ color: p.color, backgroundColor: `${p.color}12` }}
                        >
                          <PlatformIcon platform={p.id} size={22} />
                        </div>
                        <span className={styles.platformBtnLabel}>{p.label}</span>
                        {!p.isSupported && <span className={styles.comingSoonBadge}>Soon</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Health Modal */}
      {selectedHealthAccount && <HealthModal
        account={selectedHealthAccount}
        workspaceId={activeWorkspace?.id ?? ''}
        onClose={() => setSelectedHealthAccount(null)}
      />}

      {/* Manage Pages Drawer */}
      {selectedManagePagesAccount && (
        <div className={styles.drawerBackdrop} onClick={() => setSelectedManagePagesAccount(null)}>
          <div className={styles.drawerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>
                  Switch {selectedManagePagesAccount.platform.charAt(0).toUpperCase() + selectedManagePagesAccount.platform.slice(1)} {selectedManagePagesAccount.platform.toLowerCase() === 'youtube' ? 'channel' : selectedManagePagesAccount.platform.toLowerCase() === 'instagram' ? 'account' : 'page'}
                </h2>
                <p className={styles.drawerSubtitle}>Pick a different page to publish from.</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => setSelectedManagePagesAccount(null)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.pagesList}>
                {getPlatformPages(selectedManagePagesAccount.platform, selectedManagePagesAccount.displayName || selectedManagePagesAccount.externalAccountId).map((page, index) => {
                  const isCurrent = index === 0;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      className={styles.pageSelectorBtn}
                      onClick={() => {
                        showSuccess(`Switched to ${page.name}`);
                        setSelectedManagePagesAccount(null);
                      }}
                    >
                      <div className={styles.pageAvatarWrap}>
                        {selectedManagePagesAccount.avatarUrl ? (
                          <img
                            src={selectedManagePagesAccount.avatarUrl}
                            alt={page.name}
                            className={styles.pageAvatar}
                          />
                        ) : (
                          <div
                            className={styles.pagePlatformFallback}
                            style={{
                              color: ALL_PLATFORMS.find(p => p.id === selectedManagePagesAccount.platform.toLowerCase())?.color || '#ff4f00'
                            }}
                          >
                            <PlatformIcon platform={selectedManagePagesAccount.platform} size={18} />
                          </div>
                        )}
                      </div>
                      <div className={styles.pageInfo}>
                        <div className={styles.pageNameRow}>
                          <span className={styles.pageName}>{page.name}</span>
                          {isCurrent && <span className={styles.currentBadge}>Current</span>}
                        </div>
                        <p className={styles.pageCategory}>{page.category}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
