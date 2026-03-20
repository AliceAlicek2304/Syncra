export interface CoachTrend {
  id: string
  title: string
  text: string
  category: 'trend'
  action: string
  topic: string  // pre-fill topic for AI Generator
}

export const TREND_TIPS: CoachTrend[] = [
  {
    id: 'trend-1',
    title: 'AI Workflow Automation',
    text: 'Cộng đồng đang bàn tán sôi nổi về cách tối ưu hóa quy trình làm việc bằng AI. Những bài viết chia sẻ case study thực tế hoặc prompt template đang có tỷ lệ tương tác cao hơn 150% so với thông thường.',
    category: 'trend',
    action: 'Tạo bài ngay',
    topic: 'AI Workflow Automation cho Content Creator',
  },
  {
    id: 'trend-2',
    title: 'Personal Branding for Introverts',
    text: 'Từ khóa "Xây dựng thương hiệu cá nhân cho người hướng nội" đang leo top tìm kiếm. Đây là cơ hội tuyệt vời để chia sẻ những góc nhìn chân thực, sâu sắc mà không cần phải luôn "ồn ào".',
    category: 'trend',
    action: 'Tạo bài ngay',
    topic: 'Personal Branding cho người hướng nội',
  },
  {
    id: 'trend-3',
    title: 'The End of Hustle Culture',
    text: 'Người xem đang chán ngấy với văn hóa làm việc "bán mạng". Những nội dung cổ vũ sự cân bằng, sức khỏe tinh thần và làm việc thông minh đang nhận được sự đồng cảm và lượng chia sẻ khổng lồ.',
    category: 'trend',
    action: 'Tạo bài ngay',
    topic: 'Work-life balance và chống Hustle Culture',
  },
  {
    id: 'trend-4',
    title: 'Short-form Storytelling',
    text: 'Thay vì nhảy múa theo trend, việc kể những câu chuyện cá nhân chân thực trong video ngắn (dưới 60s) đang là chìa khóa để xây dựng lòng trung thành và tỷ lệ chuyển đổi cao nhất.',
    category: 'trend',
    action: 'Tạo bài ngay',
    topic: 'Kỹ thuật Storytelling ngắn để tăng engagement',
  },
  {
    id: 'trend-5',
    title: 'Building a Community',
    text: 'Thuật toán thay đổi liên tục khiến lượng reach tự nhiên ngày càng giảm. Việc xây dựng một cộng đồng (Group kín, Discord, Newsletter) đang là ưu tiên hàng đầu của các Creator chuyên nghiệp.',
    category: 'trend',
    action: 'Tạo bài ngay',
    topic: 'Xây dựng cộng đồng cho Content Creator 2026',
  },
]