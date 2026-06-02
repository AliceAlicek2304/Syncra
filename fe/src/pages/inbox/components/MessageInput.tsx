import { useState, useRef } from 'react';
import { Loader2, FileCode, Video, FileAudio, X, Folder, Smile, MessageSquare } from 'lucide-react';
import styles from '../InboxPage.module.css';

interface MessageInputProps {
  onSend: (text: string, attachments?: any[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

const CANNED_RESPONSES = [
  "Hi, can I get the guide? Need it by Friday.",
  "Yes, please. Thank you!",
  "Sure, let me send that.",
];

export default function MessageInput({ onSend, disabled, placeholder = 'Type your message...' }: MessageInputProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!draft.trim() && attachments.length === 0) return;
    setSending(true);
    try {
      await onSend(draft.trim(), attachments);
      setDraft('');
      setAttachments([]);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const validFiles: any[] = [];
    Array.from(files).forEach(file => {
      const type = file.type.startsWith('image/') ? 'image' 
        : file.type.startsWith('video/') ? 'video' 
        : file.type.startsWith('audio/') ? 'audio' : 'file';
      validFiles.push({ name: file.name, type, url: URL.createObjectURL(file) });
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Dropzone indication logic could toggle a state here
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       // mock handle files
       const file = e.dataTransfer.files[0];
       const type = file.type.startsWith('image/') ? 'image' : 'file';
       setAttachments(prev => [...prev, { name: file.name, type, url: URL.createObjectURL(file) }]);
    }
  };

  return (
    <div className={styles.replyArea} onDragOver={handleDragOver} onDrop={handleDrop}>
      {attachments.length > 0 && (
        <div className={styles.attachmentPreviews}>
          {attachments.map((file, idx) => (
            <div key={idx} className={styles.attachmentThumb}>
              {file.type === 'image' ? (
                <img src={file.url} alt="" />
              ) : file.type === 'video' ? (
                <div style={{ background: '#1e293b', width: '100%', height: '100%', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Video size={16} color="var(--text-muted)" />
                </div>
              ) : file.type === 'audio' ? (
                <div style={{ background: '#1e293b', width: '100%', height: '100%', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileAudio size={16} color="var(--text-muted)" />
                </div>
              ) : (
                <div style={{ background: '#1e293b', width: '100%', height: '100%', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCode size={16} color="var(--text-muted)" />
                </div>
              )}
              <button
                className={styles.removeAttachmentBtn}
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showEmoji && (
        <div className={styles.emojiPopover}>
          <div className={styles.emojiGrid}>
            {['😀', '😂', '🔥', '👍', '🙏', '❤️', '🎉', '💡'].map((emoji) => (
              <button key={emoji} className={styles.emojiBtn} onClick={() => { setDraft(prev => prev + emoji); setShowEmoji(false); }}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {showCanned && (
        <div className={styles.templatePopover}>
          <div className={styles.popoverHeader}>Canned Responses</div>
          {CANNED_RESPONSES.map((tmpl, idx) => (
            <button key={idx} className={styles.templateItem} onClick={() => { setDraft(tmpl); setShowCanned(false); }}>
              <div className={styles.templateText}>{tmpl}</div>
            </button>
          ))}
        </div>
      )}

      <div className={styles.inputControlsRow}>
        <div className={styles.inputToolbar}>
          <button className={styles.toolbarBtn} onClick={() => fileInputRef.current?.click()} title="Attach file" disabled={disabled}>
            <Folder size={18} />
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFileChange} />
          
          <button className={styles.toolbarBtn} onClick={() => setShowCanned(prev => !prev)} title="Canned responses" disabled={disabled}>
            <MessageSquare size={18} />
          </button>
          
          <button className={styles.toolbarBtn} onClick={() => setShowEmoji(prev => !prev)} title="Add emoji" disabled={disabled}>
            <Smile size={18} />
          </button>
        </div>

        <div className={styles.inputFieldWrapper}>
          <textarea
            className={styles.replyInput}
            rows={1}
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        <button
          className={styles.replySendBtn}
          style={{ background: '#201515', color: '#fff' }}
          disabled={(!draft.trim() && attachments.length === 0) || sending || disabled}
          onClick={handleSend}
        >
          {sending ? <Loader2 size={16} className={styles.spinner} /> : 'Send'}
        </button>
      </div>
    </div>
  );
}
