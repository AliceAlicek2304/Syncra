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
  platformCaptions?: Record<string, string>
  variations?: string[]
}

export interface MockAIResponse {
  topic: string
  ideas: ContentIdea[]
}

export interface AIGenerateInput {
  topic: string
  niche: string
  audience: string
  goal: string
  tone: string
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
      variations: [
        'Stop scrolling! 🛑\n\nĐây là 3 lý do tại sao Reel của bạn không có view:\n\n1️⃣ Hook đầu tiên quá nhàm\n2️⃣ Không có CTA rõ ràng\n3️⃣ Caption không match với video\n\nSave lại để không quên nhé! 👇',
        'Cứ mải mê quay dựng nhưng quên mất 3 điều này thì Reel vẫn 0 view... 🎬\n\nLưu lại 3 checkpoint quan trọng này để video của bạn "on top" ngay hôm nay:\n✅ Hook cực mạnh trong 3s đầu\n✅ CTA khéo léo\n✅ Caption chuẩn SEO\n\nBạn đã check chưa?',
        'Bí kíp "phá đảo" view cho Creator mới! 🚀\n\nNhiều bạn hỏi mình sao video lại flop, câu trả lời nằm ở 3 điểm mù này...\n[Xem chi tiết trong video]\n\nComment "CHECK" để mình gửi thêm list hook xịn nhé!'
      ]
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
      variations: [
        'Làm content mà chưa dùng AI là đang lãng phí thời gian! ⏰\n\nSwipe để xem 5 tool đang giúp mình tiết kiệm 10 tiếng mỗi tuần 👉\n\nTool nào bạn đang dùng? Comment xuống nhé! 💬',
        'Top 5 trợ thủ AI đắc lực cho Creator năm 2026! 🚀\n\nNếu bạn đang cảm thấy burnout vì khối lượng công việc khổng lồ, hãy để 5 công cụ này "gánh" bớt cho bạn.\n\n[Chi tiết từng tool trong slide]\nLưu lại ngay kẻo lạc mất! 📌',
        'Tăng hiệu suất làm việc X10 với AI — Tin được không? 🤯\n\nDưới đây là danh sách 5 công cụ AI mình tâm đắc nhất:\n1️⃣ [Tool 1]: Viết nội dung\n2️⃣ [Tool 2]: Design hình ảnh\n3️⃣ [Tool 3]: Edit video nhanh\n4️⃣ [Tool 4]: Nghiên cứu trend\n5️⃣ [Tool 5]: Quản lý dự án\n\nBạn đã thử cái nào chưa?'
      ]
    },
    {
      id: '3',
      type: 'Short',
      hook: 'POV: Bạn vừa mất 3 tiếng để đăng 1 bài lên 6 nền tảng',
      title: 'Multi-platform posting — làm đúng cách',
      caption:
        'Không cần copy-paste manual nữa đâu bạn ơi 😭\n\nMình đã thử Syncra và nó thay đổi hoàn toàn workflow:\n✅ Viết 1 lần\n✅ Tự adapt caption cho từng platform\n✅ Schedule tự động\n\nLink thử free trong bio! 🔗',
      hashtags: ['#workflow', '#contentcreator', '#syncra', '#scheduling', '#timesaving'],
      platforms: ['TikTok', 'YouTube'],
      bestTime: '12:00 – 13:00 Thứ 6',
      estimatedReach: '20K – 60K',
      variations: [
        'Không cần copy-paste manual nữa đâu bạn ơi 😭\n\nMình đã thử Syncra và nó thay đổi hoàn toàn workflow:\n✅ Viết 1 lần\n✅ Tự adapt caption cho từng platform\n✅ Schedule tự động\n\nLink thử free trong bio! 🔗',
        'Nỗi ám ảnh mang tên "Đăng bài đa kênh" đã chấm dứt! 🛑\n\nĐã từng tốn hàng giờ chỉ để copy nội dung sang từng nền tảng, giờ đây mình chỉ cần 5 phút với công cụ này.\n\nXem cách mình "xử lý" 6 nền tảng cùng lúc trong video nhé! 👇 #Syncra #ContentAutomation',
        'POV: Bạn là Content Creator hiện đại nhưng vẫn dùng cách thủ công để đăng bài... 👁️👄👁️\n\nDừng lại ngay và xem cách "automation" hóa cuộc đời tại đây. Workflow mới cực mượt, cực nhàn!\n\nBạn muốn mình review sâu hơn không?'
      ]
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
      variations: [
        'Mình sẽ chia sẻ toàn bộ những gì mình đã làm để grow từ 0 👇\n\n1/ Niche rõ ràng từ ngày đầu\n2/ Consistency > Perfection\n3/ Engage trước khi post\n4/ Data-driven: xem analytics mỗi tuần\n\nRT nếu thấy hữu ích! 🔁',
        '🧵 Strategy "phá băng" 10K Follower trong 90 ngày cho người mới.\n\nNhiều bạn cứ mải chạy theo số lượng, nhưng thực tế 3 THÁNG ĐẦU chỉ cần làm đúng 4 điều này...\n[Đọc tiếp ở các tweet dưới] 👇',
        'Lộ trình tăng trưởng bền vững: 0 → 10,000 người theo dõi.\n\nKhông có "phép màu" nào cả, chỉ có kỷ luật và chiến lược đúng đắn. Đây là 4 trụ cột chính trong hành trình của mình.\n\nLưu lại và bắt đầu từ hôm nay nhé! 📈'
      ]
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
      variations: [
        'Sau 5 năm làm digital marketing, đây là pattern mình thấy lặp lại nhiều nhất.\n\nSwipe để xem phân tích chi tiết và cách fix từng vấn đề ➡️\n\nNếu bạn cũng gặp vấn đề này, comment xuống để mình hỗ trợ.',
        'Tại sao doanh nghiệp của bạn vẫn dậm chân tại chỗ trên Social Media? 🤔\n\nQua quá trình tư vấn cho hàng trăm brand, mình nhận thấy 3 sai lầm chí mạng này đang trực tiếp "đốt tiền" của bạn.\n\nChi tiết giải pháp nằm ở các slide tiếp theo! 💼 #BusinessGrowth #MarketingStrategy',
        'Chi phí marketing tăng cao nhưng doanh thu không đổi? 📉\n\nHãy check ngay xem team marketing của bạn có đang mắc phải 3 lỗi cơ bản này không. Đôi khi chỉ cần thay đổi 1 tư duy nhỏ, kết quả sẽ rất khác biệt.'
      ]
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
      variations: [
        'Numbers don\'t lie 📊\n\nChúng tôi đã giúp Brand X đi từ 2% → 8% engagement rate.\nBí quyết? 3 bước đơn giản trong video này.\n\nSave & share cho đồng nghiệp của bạn! 💼',
        'Làm thế nào để một thương hiệu B2B có thể viral? 📈\n\nBrand X là minh chứng sống cho việc áp dụng đúng Framework nội dung. Trong video này, mình sẽ bóc tách chiến lược "Engagement-First" đã giúp họ tăng trưởng 300% chỉ trong 30 ngày.\n\nĐừng bỏ lỡ insight cuối cùng nhé!',
        'Case Study: Phá vỡ giới hạn tăng trưởng cho Brand X.\n\nNếu bạn đang gặp khó khăn trong việc tăng tương tác cho fanpage doanh nghiệp, hãy tham khảo ngay quy trình 3 bước này. Đơn giản, thực tế và cực kỳ hiệu quả.\n\nComment "CASE" để nhận bản PDF chi tiết.'
      ]
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
      variations: [
        'Okay okay mình thú nhận 💀\n\nKhông phải lúc nào cũng aesthetic và well-planned như trên feed đâu nha\n\nNhưng đó là lý do mình yêu nghề này — hôm nay luôn có thể tốt hơn hôm qua 🌱\n\nAi đồng cảm không? 🙋',
        'Sự thật "đau lòng" đằng sau một chiếc video 15 giây... 🎥🤣\n\nMất 3 tiếng setup, 2 tiếng quay, 1 tiếng edit và 80 lần quay hỏng.\nĐừng tin vào những gì quá hoàn hảo trên mạng nhé mọi người!\n\nTag một người bạn "sống ảo" vào đây nào 💖',
        'Đằng sau hào quang là... một đống lộn xộn! 🌪️\n\nVideo này dành cho những ai đang cảm thấy tự ti khi so sánh cuộc đời mình với feed của người khác. Chúng mình đều giống nhau cả thôi!\n\nStay real, stay happy! ✨'
      ]
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
      variations: [
        'New desk unlock! 🖥️✨\n\nSau 6 tháng tiết kiệm, mình finally có góc làm việc trong mơ\n\nCái khiến mình productive nhất không phải đồ đắt tiền — mà là ánh sáng tự nhiên và cây xanh 🌿\n\nBạn setup góc làm việc như thế nào?',
        'Dream Desk Setup — Hoàn thành! 🥰\n\nCuối cùng góc nhỏ này cũng xong xuôi để mình có thêm cảm hứng sáng tạo. Tip nhỏ cho mọi người: Hãy giữ bàn làm việc gọn gàng nhất có thể, tâm trí bạn sẽ minh mẫn hơn rất nhiều!\n\nBạn thích món đồ nào nhất trên bàn mình? ✨',
        'Workspace Tour: Nơi mọi ý tưởng bắt đầu... ✍️✨\n\nKhông cần quá cầu kỳ, chỉ cần đủ thoải mái và reflect được cá tính của bạn. Cây xanh và ánh sáng tự nhiên luôn là ưu tiên số 1 của mình.\n\nShare góc làm việc của bạn vào story và tag mình nhé!'
      ]
    },
  ],
}

export function getMockResults(input: AIGenerateInput): ContentIdea[] {
  const { tone } = input
  if (tone === 'professional') return MOCK_AI_RESULTS.professional
  if (tone === 'casual') return MOCK_AI_RESULTS.casual
  return MOCK_AI_RESULTS.default
}

// ─── Repurpose Engine Mock Data ────────────────────────────────────────────

export type RepurposePlatform = 'LinkedIn' | 'X' | 'Instagram' | 'Newsletter'
export type AtomType = 'POST' | 'THREAD' | 'CAROUSEL' | 'INSIGHT' | 'TIP' | 'QUOTE'

export interface RepurposeAtom {
  id: string
  type: AtomType
  title?: string
  content: string
  platform: RepurposePlatform
  suggestedHashtags: string[]
  suggestedCTA?: string
}

export interface GenerateRepurposeRequest {
  sourceText: string
  platforms: RepurposePlatform[]
  tone: string
  extractAtoms: boolean
}

const MOCK_REPURPOSE_ATOMS: RepurposeAtom[] = [
  {
    id: 'r1',
    type: 'POST',
    title: 'LinkedIn: The 3 Pillars of Content Strategy',
    content: 'Content strategy isn\'t just making posts.\n\nIt\'s about three pillars:\n1. Discovery: How do they find you?\n2. Trust: Why should they listen?\n3. Value: What\'s in it for them?\n\nIf you nail these 3, you\'re golden.\n\nWhat is the hardest pillar for you to build?',
    platform: 'LinkedIn',
    suggestedHashtags: ['#ContentStrategy', '#Marketing', '#Growth'],
    suggestedCTA: 'What is the hardest pillar for you?',
  },
  {
    id: 'r2',
    type: 'THREAD',
    title: 'X/Twitter: Thread on Strategy',
    content: 'Content strategy broken down into 3 simple pillars 🧵👇\n\n1/3\nFirst is Discovery. If they can\'t find you, the best content in the world won\'t help. Optimize for search and shares.\n\n2/3\nSecond is Trust. You need to show authority in your niche. Case studies and personal stories work best.\n\n3/3\nThird is Value. Give away the secrets, sell the implementation. What\'s your strategy?',
    platform: 'X',
    suggestedHashtags: ['#ContentCreator', '#TwitterTips'],
  },
  {
    id: 'r3',
    type: 'CAROUSEL',
    title: 'Instagram: Carousel Outline',
    content: 'Slide 1: Stop posting aimlessly. Try these 3 pillars instead.\nSlide 2: Pillar 1 - Discovery (Search algorithms)\nSlide 3: Pillar 2 - Trust (Social Proof)\nSlide 4: Pillar 3 - Value (Actionable take-aways)\nSlide 5: Save this for your next brainstorm!',
    platform: 'Instagram',
    suggestedHashtags: ['#InstagramTips', '#ContentMarketing', '#Carousel'],
    suggestedCTA: 'Save this post!',
  },
  {
    id: 'r4',
    type: 'INSIGHT',
    content: 'The best content gives away the secret but sells the implementation.',
    platform: 'LinkedIn',
    suggestedHashtags: ['#Insight', '#MarketingTruths'],
  },
  {
    id: 'r5',
    type: 'TIP',
    content: 'Review your analytics weekly. Discovery, Trust, and Value all have different metrics (Reach, Saves/Shares, Link Clicks).',
    platform: 'X',
    suggestedHashtags: ['#QuickTip', '#Analytics'],
  },
  {
    id: 'r6',
    type: 'QUOTE',
    content: '"If you nail these 3 pillars, you\'re golden." - The Source Material',
    platform: 'Instagram',
    suggestedHashtags: ['#Quotes', '#Motivation'],
  }
]

export const mockGenerateRepurpose = async (req: GenerateRepurposeRequest): Promise<{ atoms: RepurposeAtom[] }> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Filter by platform requests
      let results = MOCK_REPURPOSE_ATOMS.filter(atom => req.platforms.includes(atom.platform))

      // If asking for atoms only, only show INSIGHT/TIP/QUOTE
      if (req.extractAtoms) {
        const atomTypes = ['INSIGHT', 'TIP', 'QUOTE']
        results = results.filter(a => atomTypes.includes(a.type))
      }

      if (results.length === 0) results = MOCK_REPURPOSE_ATOMS // Fallback
      resolve({ atoms: results })
    }, 1500)
  })
}
