export type Tab = 'faq' | 'docs' | 'report' | 'contact'

export interface FAQItem {
  id: string
  category: string
  q: string
  a: string
}

export interface DocArticle {
  id: string
  title: string
  mins: number
}

export interface DocCategory {
  id: string
  icon: string
  title: string
  color: string
  articles: DocArticle[]
}

export interface VideoTutorial {
  id: string
  title: string
  duration: string
  views: string
  thumbnail: string
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'f1',
    category: 'Tài khoản & Thanh toán',
    q: 'Tôi có thể dùng thử Syncra miễn phí không?',
    a: 'Có! Syncra cung cấp gói Free với tối đa 5 bài/tháng, kết nối 2 nền tảng và truy cập tính năng AI cơ bản. Không cần thẻ tín dụng khi đăng ký.',
  },
  {
    id: 'f2',
    category: 'Tài khoản & Thanh toán',
    q: 'Tôi có thể hủy subscription bất kỳ lúc nào không?',
    a: 'Hoàn toàn có thể. Bạn có thể hủy subscription ngay trong trang Settings > Billing. Tài khoản của bạn vẫn hoạt động đến hết chu kỳ thanh toán hiện tại.',
  },
  {
    id: 'f3',
    category: 'Tài khoản & Thanh toán',
    q: 'Syncra hỗ trợ những phương thức thanh toán nào?',
    a: 'Syncra chấp nhận thẻ Visa, Mastercard, JCB và thanh toán qua PayPal. Dành cho người dùng Việt Nam, chúng tôi sẽ sớm hỗ trợ VNPay và MoMo.',
  },
  {
    id: 'f4',
    category: 'Tính năng AI',
    q: 'AI tạo nội dung của Syncra hoạt động như thế nào?',
    a: 'Bạn nhập chủ đề, niche và tone giọng văn. AI sẽ phân tích trend hiện tại trên từng nền tảng và đề xuất hook, caption, hashtag phù hợp. Kết quả được tối ưu riêng cho TikTok, Instagram, YouTube, LinkedIn, X và Facebook.',
  },
  {
    id: 'f5',
    category: 'Tính năng AI',
    q: 'Tôi có thể dùng AI để repurpose nội dung cũ không?',
    a: 'Có! Tính năng AI Repurpose cho phép bạn chuyển đổi một bài đăng thành nhiều định dạng: thread Twitter → caption Instagram, blog post → TikTok script, v.v. Truy cập AI Repurpose trong sidebar.',
  },
  {
    id: 'f6',
    category: 'Tính năng AI',
    q: 'Trend Radar là gì?',
    a: 'Trend Radar theo dõi và phân tích các xu hướng nội dung đang hot trên mạng xã hội theo thời gian thực. Nó giúp bạn biết chủ đề nào đang được quan tâm để tạo content kịp thời và đạt reach cao hơn.',
  },
  {
    id: 'f7',
    category: 'Đăng bài & Lên lịch',
    q: 'Syncra hỗ trợ đăng bài trực tiếp lên mạng xã hội không?',
    a: 'Đây là tính năng đang được phát triển (coming soon). Hiện tại, Syncra giúp bạn lên lịch, quản lý và chuẩn bị nội dung. Tích hợp API trực tiếp với TikTok, Instagram và YouTube sẽ ra mắt trong Q2/2026.',
  },
  {
    id: 'f8',
    category: 'Đăng bài & Lên lịch',
    q: 'Tôi có thể lên lịch bao nhiêu bài một lúc?',
    a: 'Gói Creator cho phép lên lịch không giới hạn bài. Gói Free giới hạn 5 bài/tháng. Gói Studio dành cho team cho phép nhiều thành viên cùng lên lịch và phê duyệt nội dung.',
  },
  {
    id: 'f9',
    category: 'Analytics',
    q: 'Dữ liệu analytics của tôi được cập nhật bao lâu một lần?',
    a: 'Với gói Creator trở lên, analytics được cập nhật mỗi 6 giờ. Gói Free cập nhật mỗi 24 giờ. Dữ liệu bao gồm reach, engagement rate, follower growth và best time to post.',
  },
]

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: 'dc1',
    icon: 'zap',
    title: 'Bắt đầu nhanh',
    color: '#f59e0b',
    articles: [
      { id: 'a1', title: 'Thiết lập tài khoản và kết nối nền tảng', mins: 3 },
      { id: 'a2', title: 'Tạo bài đăng đầu tiên với AI', mins: 5 },
      { id: 'a3', title: 'Lên lịch bài đăng trên nhiều nền tảng', mins: 4 },
      { id: 'a4', title: 'Hiểu dashboard và các chỉ số cơ bản', mins: 6 },
    ],
  },
  {
    id: 'dc2',
    icon: 'zap',
    title: 'AI Content Tools',
    color: '#8b5cf6',
    articles: [
      { id: 'a5', title: 'Cách dùng AI Ideas để tạo ý tưởng content', mins: 5 },
      { id: 'a6', title: 'AI Repurpose — chuyển đổi nội dung sang nhiều format', mins: 7 },
      { id: 'a7', title: 'Tùy chỉnh tone và phong cách viết', mins: 4 },
      { id: 'a8', title: 'Trend Radar — đọc và tận dụng xu hướng', mins: 6 },
    ],
  },
  {
    id: 'dc3',
    icon: 'calendar',
    title: 'Calendar & Scheduling',
    color: '#06b6d4',
    articles: [
      { id: 'a9', title: 'Tổng quan Content Calendar', mins: 4 },
      { id: 'a10', title: 'Tạo và chỉnh sửa bài đăng trong calendar', mins: 5 },
      { id: 'a11', title: 'Kéo thả để thay đổi lịch đăng', mins: 3 },
      { id: 'a12', title: 'Quản lý trạng thái bài: Draft / Scheduled / Published', mins: 4 },
    ],
  },
  {
    id: 'dc4',
    icon: 'barChart2',
    title: 'Analytics & Báo cáo',
    color: '#10b981',
    articles: [
      { id: 'a13', title: 'Hiểu các chỉ số Analytics', mins: 6 },
      { id: 'a14', title: 'So sánh hiệu suất giữa các nền tảng', mins: 5 },
      { id: 'a15', title: 'Xuất báo cáo (coming soon)', mins: 3 },
    ],
  },
  {
    id: 'dc5',
    icon: 'shield',
    title: 'Bảo mật & Tài khoản',
    color: '#ef4444',
    articles: [
      { id: 'a16', title: 'Đổi mật khẩu và bảo mật 2 lớp', mins: 4 },
      { id: 'a17', title: 'Kết nối và ngắt kết nối tài khoản mạng xã hội', mins: 5 },
      { id: 'a18', title: 'Xóa hoặc tạm khóa tài khoản', mins: 3 },
    ],
  },
]

export const VIDEO_TUTORIALS: VideoTutorial[] = [
  { id: 'v1', title: 'Syncra Quick Start — Từ 0 đến bài đăng đầu tiên trong 10 phút', duration: '10:24', views: '4.2K', thumbnail: '🎬' },
  { id: 'v2', title: 'AI Content Assistant — Tạo content hàng loạt với AI', duration: '8:15', views: '3.8K', thumbnail: '🤖' },
  { id: 'v3', title: 'Repurpose Content — Một bài đăng, nhiều nền tảng', duration: '6:42', views: '2.9K', thumbnail: '♻️' },
  { id: 'v4', title: 'Content Calendar Pro Tips — Lên lịch hiệu quả', duration: '12:30', views: '5.1K', thumbnail: '📅' },
  { id: 'v5', title: 'Analytics Deep Dive — Đọc data và cải thiện hiệu suất', duration: '9:55', views: '3.3K', thumbnail: '📊' },
  { id: 'v6', title: 'Trend Radar — Nắm bắt xu hướng trước đối thủ', duration: '7:18', views: '2.7K', thumbnail: '🎯' },
]

export const ISSUE_CATEGORIES: string[] = [
  'Lỗi tính năng AI (Ideas / Repurpose / Trend)',
  'Lỗi Calendar / Lên lịch bài',
  'Lỗi Analytics / Dữ liệu không chính xác',
  'Vấn đề kết nối tài khoản mạng xã hội',
  'Lỗi thanh toán / Subscription',
  'Hiệu năng chậm / UI bị lỗi',
  'Vấn đề bảo mật / Tài khoản',
  'Khác',
]
