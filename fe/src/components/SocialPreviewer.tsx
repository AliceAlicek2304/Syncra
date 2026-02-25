import { 
  Music, Heart, MessageCircle, Send, Bookmark, 
  Repeat2, MessageSquare, Share 
} from 'lucide-react'
import styles from './SocialPreviewer.module.css'

interface SocialPreviewerProps {
  platform: string
  type: string
  content: {
    hook: string
    caption: string
    hashtags: string[]
  }
}

export default function SocialPreviewer({ platform, type, content }: SocialPreviewerProps) {
  const renderTikTok = () => (
    <div className={styles.tiktokPreview}>
      <div className={styles.tiktokOverlay}>
        <div className={styles.tiktokUser}>@minhanh.creates</div>
        <div className={styles.tiktokCaption}>
          {content.hook} {content.caption}
        </div>
        <div className={styles.tiktokTags}>
          {content.hashtags.join(' ')}
        </div>
        <div className={styles.tiktokMusic}>
          <Music size={12} />
          <span>Original Audio - Minh Anh</span>
        </div>
      </div>
    </div>
  )

  const renderInstagram = () => (
    <div className={styles.instagramPreview}>
      <div className={styles.instaHeader}>
        <div className={styles.avatar} />
        <span className={styles.username}>minhanh.creates</span>
      </div>
      <div className={styles.instaMedia}>
        {type} Preview
      </div>
      <div className={styles.instaActions}>
        <Heart size={20} />
        <MessageCircle size={20} />
        <Send size={20} />
        <div style={{ flex: 1 }} />
        <Bookmark size={20} />
      </div>
      <div className={styles.instaContent}>
        <div className={styles.instaCaption}>
          <b>minhanh.creates</b>
          {content.hook} {content.caption}
          <div style={{ color: '#00376b', marginTop: 4 }}>
            {content.hashtags.join(' ')}
          </div>
        </div>
      </div>
    </div>
  )

  const renderYouTube = () => (
    <div className={styles.youtubePreview}>
      <div className={styles.ytVideo}>{type} Preview</div>
      <div className={styles.ytInfo}>
        <div className={styles.ytTitle}>{content.hook}</div>
        <div className={styles.ytMeta}>1.2M views • 2 hours ago</div>
        <div className={styles.ytChannel}>
          <div className={styles.ytAvatar} />
          <div className={styles.ytChannelName}>Minh Anh Creates</div>
          <div className={styles.ytSubscribe}>Subscribe</div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
          {content.caption}
          <div style={{ color: '#065fd4', marginTop: 4 }}>{content.hashtags.join(' ')}</div>
        </div>
      </div>
    </div>
  )

  const renderX = () => (
    <div className={styles.xPreview}>
      <div className={styles.xAvatar} />
      <div className={styles.xBody}>
        <div className={styles.xUserRow}>
          <span className={styles.xName}>Minh Anh</span>
          <span className={styles.xHandle}>@minhanh · 2h</span>
        </div>
        <div className={styles.xText}>
          {content.hook}
          {'\n\n'}
          {content.caption}
          {'\n\n'}
          <span style={{ color: '#1d9bf0' }}>{content.hashtags.join(' ')}</span>
        </div>
        <div className={styles.xMedia}>{type} Preview</div>
        <div className={styles.xActions}>
          <MessageSquare size={16} />
          <Repeat2 size={16} />
          <Heart size={16} />
          <Share size={16} />
        </div>
      </div>
    </div>
  )

  const renderLinkedIn = () => (
    <div className={styles.linkedinPreview}>
      <div className={styles.liHeader}>
        <div className={styles.liAvatar} />
        <div className={styles.liUser}>
          <span className={styles.liName}>Minh Anh</span>
          <span className={styles.liTitle}>Content Creator @ TechNest</span>
          <span className={styles.liMeta}>2h • Edited • 🌐</span>
        </div>
      </div>
      <div className={styles.liText}>
        {content.hook}
        {'\n\n'}
        {content.caption}
        {'\n\n'}
        <span style={{ color: '#0a66c2', fontWeight: 600 }}>{content.hashtags.join(' ')}</span>
      </div>
      <div className={styles.liMedia}>{type} Preview</div>
      <div className={styles.liActions}>
        <span>Like</span>
        <span>Comment</span>
        <span>Repost</span>
        <span>Send</span>
      </div>
    </div>
  )

  const renderFacebook = () => (
    <div className={styles.facebookPreview}>
      <div className={styles.fbPost}>
        <div className={styles.fbHeader}>
          <div className={styles.fbAvatar} />
          <div className={styles.fbUser}>
            <span className={styles.fbName}>Minh Anh</span>
            <span className={styles.fbMeta}>2 giờ · 🌐</span>
          </div>
        </div>
        <div className={styles.fbText}>
          {content.hook}
          {'\n\n'}
          {content.caption}
          {'\n\n'}
          <span style={{ color: '#050505' }}>{content.hashtags.join(' ')}</span>
        </div>
        <div className={styles.fbMedia}>{type} Preview</div>
        <div className={styles.fbActions}>
          <span>Thích</span>
          <span>Bình luận</span>
          <span>Chia sẻ</span>
        </div>
      </div>
    </div>
  )

  const getContent = () => {
    switch (platform.toLowerCase()) {
      case 'tiktok': return renderTikTok()
      case 'instagram': return renderInstagram()
      case 'youtube': return renderYouTube()
      case 'x': return renderX()
      case 'linkedin': return renderLinkedIn()
      case 'facebook': return renderFacebook()
      default: return (
        <div className={styles.placeholder}>
          <p>Preview for {platform} coming soon</p>
        </div>
      )
    }
  }

  return (
    <div className={styles.previewContainer}>
      <div className={styles.platformBadge}>{platform} {type}</div>
      <div className={styles.screen}>
        {getContent()}
      </div>
    </div>
  )
}
