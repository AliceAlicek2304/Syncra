import type { SocialAccountDto } from '../api/socialAccounts';

interface FacebookPagePicture {
  data?: { url?: string };
}

interface FacebookPage {
  id: string;
  picture?: FacebookPagePicture;
}

interface FacebookMetadata {
  availablePages?: FacebookPage[];
  selectedPageId?: string;
}

function getFacebookMetadata(account: SocialAccountDto): FacebookMetadata | null {
  if (account.platform !== 'facebook' || !account.metadata) return null;
  return account.metadata as unknown as FacebookMetadata;
}

export function getSocialAvatarUrl(account: SocialAccountDto): string | undefined {
  const fbMeta = getFacebookMetadata(account);
  if (fbMeta?.availablePages && fbMeta.selectedPageId) {
    const page = fbMeta.availablePages.find((p) => p.id === fbMeta.selectedPageId);
    if (page?.picture?.data?.url) return page.picture.data.url;
  }
  return account.avatarUrl;
}

export function getFbPageAvatarUrl(account: SocialAccountDto, pageId: string): string | undefined {
  const fbMeta = getFacebookMetadata(account);
  if (fbMeta?.availablePages) {
    const page = fbMeta.availablePages.find((p) => p.id === pageId);
    if (page?.picture?.data?.url) return page.picture.data.url;
  }
  return undefined;
}
