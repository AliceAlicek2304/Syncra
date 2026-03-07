import { useState, useRef, useCallback } from 'react'
import { FileText, Link2, Upload, Trash2, ClipboardPaste, File, X } from 'lucide-react'
import { useRepurpose } from '../../context/repurposeContextBase'
import styles from './RepurposeComponents.module.css'

const SAMPLE_TEXT = `Content strategy is the foundation of every successful brand online.

Most creators make the mistake of posting without a clear plan. They create content reactively — jumping on trends without thinking about whether that content serves their audience.

The truth is, the best content creators treat their social media like a business. They have pillars (3–5 main topics they talk about), they have a consistent posting cadence, and they always tie their content back to a goal.

Here are the three pillars I use with every client:

1. Discovery content: broad topics that attract new followers (tips, myths, how-tos)
2. Trust content: behind-the-scenes, case studies, personal stories
3. Conversion content: direct offers, testimonials, comparisons

If you can produce content in all three pillars weekly, you'll see compounding growth within 90 days.`

const ACCEPTED_TYPES = '.txt,.md,.docx,.pdf'
const MAX_FILE_MB = 5

export default function InputSection() {
    const { config, setConfig } = useRepurpose()
    const [inputMode, setInputMode] = useState<'text' | 'url' | 'file'>('text')
    const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const charCount = config.sourceText.length
    const wordCount = config.sourceText.trim() ? config.sourceText.trim().split(/\s+/).length : 0

    const readFileAsText = (file: File) => {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            alert(`File quá lớn. Giới hạn ${MAX_FILE_MB}MB.`)
            return
        }
        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result as string
            setConfig(prev => ({ ...prev, sourceText: text }))
            setUploadedFile({ name: file.name, size: file.size })
        }
        reader.readAsText(file, 'utf-8')
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) readFileAsText(file)
        e.target.value = ''
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) readFileAsText(file)
    }, [])

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
    const handleDragLeave = () => setIsDragging(false)

    const clearFile = () => {
        setUploadedFile(null)
        setConfig(prev => ({ ...prev, sourceText: '' }))
    }

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className={styles.inputSection}>
            {/* Mode tabs */}
            <div className={styles.modeTabs}>
                <button
                    className={`${styles.modeTab} ${inputMode === 'text' ? styles.modeTabActive : ''}`}
                    onClick={() => setInputMode('text')}
                >
                    <FileText size={13} />
                    Dán văn bản
                </button>
                <button
                    className={`${styles.modeTab} ${inputMode === 'url' ? styles.modeTabActive : ''}`}
                    onClick={() => setInputMode('url')}
                >
                    <Link2 size={13} />
                    Từ URL
                </button>
                <button
                    className={`${styles.modeTab} ${inputMode === 'file' ? styles.modeTabActive : ''}`}
                    onClick={() => setInputMode('file')}
                >
                    <Upload size={13} />
                    Tải file lên
                </button>

                <div className={styles.modeTabRight}>
                    {config.sourceText && inputMode !== 'file' ? (
                        <button
                            className={styles.clearBtn}
                            onClick={() => setConfig(prev => ({ ...prev, sourceText: '' }))}
                        >
                            <Trash2 size={12} />
                            Xóa
                        </button>
                    ) : inputMode === 'text' && !config.sourceText ? (
                        <button
                            className={styles.sampleBtn}
                            onClick={() => setConfig(prev => ({ ...prev, sourceText: SAMPLE_TEXT }))}
                        >
                            <ClipboardPaste size={12} />
                            Dùng nội dung mẫu
                        </button>
                    ) : null}
                </div>
            </div>

            {inputMode === 'text' && (
                <div className={styles.textareaWrapper}>
                    <textarea
                        className={styles.textarea}
                        placeholder="Dán nội dung dài của bạn vào đây: blog post, script video, email, newsletter..."
                        value={config.sourceText}
                        onChange={(e) => setConfig(prev => ({ ...prev, sourceText: e.target.value }))}
                    />
                    <div className={styles.textareaFooter}>
                        <span className={styles.counter}>
                            {wordCount > 0 && <span className={styles.counterWords}>{wordCount} từ</span>}
                            <span className={charCount > 5000 ? styles.counterOver : ''}>{charCount.toLocaleString()} ký tự</span>
                        </span>
                    </div>
                </div>
            )}

            {inputMode === 'url' && (
                <div className={styles.urlInput}>
                    <Link2 size={16} className={styles.urlIcon} />
                    <input
                        type="url"
                        className={styles.urlField}
                        placeholder="https://your-blog-post.com/article"
                    />
                    <button className={styles.fetchBtn}>Tải nội dung</button>
                </div>
            )}

            {inputMode === 'file' && (
                <div className={styles.fileZone}>
                    {uploadedFile ? (
                        <div className={styles.fileLoaded}>
                            <div className={styles.fileLoadedIcon}>
                                <File size={22} />
                            </div>
                            <div className={styles.fileLoadedInfo}>
                                <span className={styles.fileLoadedName}>{uploadedFile.name}</span>
                                <span className={styles.fileLoadedMeta}>
                                    {formatBytes(uploadedFile.size)}
                                    {wordCount > 0 && ` · ${wordCount.toLocaleString()} từ`}
                                    {charCount > 0 && ` · ${charCount.toLocaleString()} ký tự`}
                                </span>
                            </div>
                            <div className={styles.fileLoadedActions}>
                                <button
                                    className={styles.fileReplaceBtn}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={12} />
                                    Thay thế
                                </button>
                                <button className={styles.fileRemoveBtn} onClick={clearFile}>
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`${styles.dropArea} ${isDragging ? styles.dropAreaDragging : ''}`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className={styles.dropIcon}>
                                <Upload size={26} />
                            </div>
                            <p className={styles.dropTitle}>Kéo & thả file vào đây</p>
                            <p className={styles.dropSub}>hoặc <span className={styles.dropBrowse}>chọn từ máy tính</span></p>
                            <div className={styles.dropFormats}>
                                <span>.TXT</span>
                                <span>.MD</span>
                                <span>.DOCX</span>
                                <span>.PDF</span>
                            </div>
                            <p className={styles.dropLimit}>Tối đa {MAX_FILE_MB}MB</p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_TYPES}
                        className={styles.fileInputHidden}
                        onChange={handleFileChange}
                    />
                </div>
            )}
        </div>
    )
}
