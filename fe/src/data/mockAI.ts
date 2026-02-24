export interface ContentIdea {
  id: string
  type: 'Reel' | 'Carousel' | 'Photo' | 'Thread' | 'Short'
  hook: string
  title: string
  caption: string
  hashtags: string[]
  platforms: string[]
  bestTime: string
  estimatedReach: string
}

export interface MockAIResponse {
  topic: string
  ideas: ContentIdea[]
}

// Mock responses keyed by tone
export const MOCK_AI_RESULTS: Record<string, ContentIdea[]> = {
  default: [
    {
      id: '1',
      type: 'Reel',
      hook: 'Bạn có biết 80% người dùng scroll qua content của bạn trong 3 giây đầu?',
      title: 'Hook mạnh = View cao — Bí kíp giữ chân người xem',
      caption:
        'Stop scrolling! 🛑\n\nĐây là 3 lý do tại sao Reel của bạn không có view:\n\n1️⃣ Hook đầu tiên quá nhàm\n2️⃣ Không có CTA rõ ràng\n3️⃣ Caption không match với video\n\nSave lại để không quên nhé! 👇',
      hashtags: ['#contenttips', '#reels', '#contentcreator', '#viral', '#socialmedia'],
      platforms: ['TikTok', 'Instagram', 'YouTube'],
      bestTime: '19:00 – 21:00 Thứ 3, Thứ 5',
      estimatedReach: '15K – 40K',
    },
    {
      id: '2',
      type: 'Carousel',
      hook: '5 công cụ AI miễn phí giúp bạn tạo content X10 nhanh hơn',
      title: 'AI Tools cho Content Creator 2026',
      caption:
        'Làm content mà chưa dùng AI là đang lãng phí thời gian! ⏰\n\nSwipe để xem 5 tool đang giúp mình tiết kiệm 10 tiếng mỗi tuần 👉\n\nTool nào bạn đang dùng? Comment xuống nhé! 💬',
      hashtags: ['#aitools', '#contentcreator', '#productivity', '#2026', '#socialmediatips'],
      platforms: ['Instagram', 'LinkedIn'],
      bestTime: '08:00 – 10:00 Thứ 2, Thứ 4',
      estimatedReach: '8K – 20K',
    },
    {
      id: '3',
      type: 'Short',
      hook: 'POV: Bạn vừa mất 3 tiếng để đăng 1 bài lên 6 nền tảng',
      title: 'Multi-platform posting — làm đúng cách',
      caption:
        'Không cần copy-paste manual nữa đâu bạn ơi 😭\n\nMình đã thử TechNest và nó thay đổi hoàn toàn workflow:\n✅ Viết 1 lần\n✅ Tự adapt caption cho từng platform\n✅ Schedule tự động\n\nLink thử free trong bio! 🔗',
      hashtags: ['#workflow', '#contentcreator', '#technest', '#scheduling', '#timesaving'],
      platforms: ['TikTok', 'YouTube'],
      bestTime: '12:00 – 13:00 Thứ 6',
      estimatedReach: '20K – 60K',
    },
    {
      id: '4',
      type: 'Thread',
      hook: 'Thread: Từ 0 lên 10K follower trong 90 ngày — toàn bộ strategy của mình',
      title: '90-day creator growth strategy',
      caption:
        'Mình sẽ chia sẻ toàn bộ những gì mình đã làm để grow từ 0 👇\n\n1/ Niche rõ ràng từ ngày đầu\n2/ Consistency > Perfection\n3/ Engage trước khi post\n4/ Data-driven: xem analytics mỗi tuần\n\nRT nếu thấy hữu ích! 🔁',
      hashtags: ['#growthhacks', '#contentcreator', '#X', '#thread', '#socialmedia'],
      platforms: ['X', 'LinkedIn'],
      bestTime: '07:00 – 09:00 Thứ 2',
      estimatedReach: '5K – 15K',
    },
  ],
  professional: [
    {
      id: '5',
      type: 'Carousel',
      hook: '3 sai lầm phổ biến khiến doanh nghiệp của bạn không có khách hàng từ mạng xã hội',
      title: 'Social Media ROI — Why most businesses fail',
      caption:
        'Sau 5 năm làm digital marketing, đây là pattern mình thấy lặp lại nhiều nhất.\n\nSwipe để xem phân tích chi tiết và cách fix từng vấn đề ➡️\n\nNếu bạn cũng gặp vấn đề này, comment xuống để mình hỗ trợ.',
      hashtags: ['#digitalmarketing', '#socialmediatips', '#ROI', '#business', '#marketing2026'],
      platforms: ['LinkedIn', 'Instagram'],
      bestTime: '08:00 – 10:00 Thứ 3, Thứ 5',
      estimatedReach: '10K – 25K',
    },
    {
      id: '6',
      type: 'Reel',
      hook: 'Case study: Brand X tăng 300% engagement chỉ trong 1 tháng — đây là cách họ làm',
      title: 'Viral content framework for brands',
      caption:
        'Numbers don\'t lie 📊\n\nChúng tôi đã giúp Brand X đi từ 2% → 8% engagement rate.\nBí quyết? 3 bước đơn giản trong video này.\n\nSave & share cho đồng nghiệp của bạn! 💼',
      hashtags: ['#brandstrategy', '#contentmarketing', '#casestudy', '#engagement', '#b2b'],
      platforms: ['LinkedIn', 'Instagram', 'YouTube'],
      bestTime: '11:00 – 13:00 Thứ 4',
      estimatedReach: '12K – 30K',
    },
  ],
  casual: [
    {
      id: '7',
      type: 'Reel',
      hook: 'Day in my life làm content creator 😅 (phần thực tế không ai nói cho bạn)',
      title: 'Honest day in my life as a creator',
      caption:
        'Okay okay mình thú nhận 💀\n\nKhông phải lúc nào cũng aesthetic và well-planned như trên feed đâu nha\n\nNhưng đó là lý do mình yêu nghề này — hôm nay luôn có thể tốt hơn hôm qua 🌱\n\nAi đồng cảm không? 🙋',
      hashtags: ['#dayinmylife', '#contentcreator', '#behindthescenes', '#realtalk', '#creatorslife'],
      platforms: ['TikTok', 'Instagram'],
      bestTime: '20:00 – 22:00 Thứ 7, Chủ Nhật',
      estimatedReach: '25K – 80K',
    },
    {
      id: '8',
      type: 'Photo',
      hook: 'Setup góc làm việc mới — finally got my dream desk ✨',
      title: 'Workspace setup reveal',
      caption:
        'New desk unlock! 🖥️✨\n\nSau 6 tháng tiết kiệm, mình finally có góc làm việc trong mơ\n\nCái khiến mình productive nhất không phải đồ đắt tiền — mà là ánh sáng tự nhiên và cây xanh 🌿\n\nBạn setup góc làm việc như thế nào?',
      hashtags: ['#desksetup', '#workspace', '#aesthetic', '#wfh', '#contentcreator'],
      platforms: ['Instagram', 'X'],
      bestTime: '09:00 – 11:00 Thứ 7',
      estimatedReach: '6K – 18K',
    },
  ],
}

export function getMockResults(tone: string): ContentIdea[] {
  if (tone === 'professional') return MOCK_AI_RESULTS.professional
  if (tone === 'casual') return MOCK_AI_RESULTS.casual
  return MOCK_AI_RESULTS.default
}
