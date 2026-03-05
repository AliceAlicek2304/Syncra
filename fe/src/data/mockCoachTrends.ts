import type { ContentIdea } from './mockAI'
import { shortId } from '../utils/shortId'

export interface CoachTrend {
  id: string
  title: string
  text: string
  category: 'trend'
  action: string
  ideas: ContentIdea[]
}

export const TREND_TIPS: CoachTrend[] = [
  {
    id: 'trend-1',
    title: 'AI Workflow Automation',
    text: 'Cộng đồng đang bàn tán sôi nổi về cách tối ưu hóa quy trình làm việc bằng AI. Những bài viết chia sẻ case study thực tế hoặc prompt template đang có tỷ lệ tương tác cao hơn 150% so với thông thường. Khai thác chủ đề này để khẳng định vị thế chuyên gia của bạn!',
    category: 'trend',
    action: 'Tạo bài ngay',
    ideas: [
      {
        id: shortId(),
        type: 'Carousel',
        hook: 'Tôi đã cắt giảm 20 giờ làm việc mỗi tuần nhờ 3 AI Workflow này.',
        title: '3 AI Workflow tối ưu hiệu suất',
        caption: 'Hầu hết mọi người đang sử dụng AI sai cách. Họ coi AI như một công cụ tìm kiếm thay vì một người trợ lý thực thụ.\n\nSau hơn 6 tháng thử nghiệm, đây là 3 workflow tự động hóa đã giúp tôi tiết kiệm 20 giờ mỗi tuần:\n\n1️⃣ Tự động hóa research nội dung\n2️⃣ Tạo outline và drafting kịch bản\n3️⃣ Phân tích dữ liệu & Báo cáo hiệu suất\n\nSwipe sang trái để xem chi tiết từng bước thiết lập nhé! Bạn đang dùng AI để làm gì? 👇',
        hashtags: ['#AIworkflow', '#Productivity', '#CreatorEconomy'],
        platforms: ['LinkedIn', 'Facebook', 'Instagram'],
        bestTime: '10:00 Thứ 3',
        estimatedReach: '15K - 30K'
      },
      {
        id: shortId(),
        type: 'Thread',
        hook: 'Bạn không cần thêm thời gian, bạn cần một quy trình thông minh hơn. Đây là cách tôi dùng AI để scale công việc.',
        title: 'Cách scale công việc với AI',
        caption: 'Thread 🧵: AI không cướp việc của bạn, nhưng người biết dùng AI thì có.\n\n1/ Đừng viết prompt chung chung nữa. Hãy cung cấp ngữ cảnh, vai trò, và định dạng đầu ra mong muốn.\n2/ Sử dụng AI để review lỗi logic trong bài viết của bạn.\n3/ Tự động phân loại email và tin nhắn của khách hàng.\n\nTheo dõi tôi để nhận thêm các bài học thực chiến về AI.',
        hashtags: ['#Automation', '#AI', '#Tips'],
        platforms: ['X', 'LinkedIn'],
        bestTime: '08:00 Thứ 4',
        estimatedReach: '10K - 25K'
      },
      {
        id: shortId(),
        type: 'Reel',
        hook: 'Đừng lãng phí 3 tiếng mỗi ngày để viết content nữa. Xem ngay bí kíp này!',
        title: 'Bí kíp viết content siêu tốc',
        caption: 'Bạn vẫn đang ngồi nhìn màn hình trắng suốt hàng giờ đồng hồ? 🛑\n\nTrong video này, mình sẽ chỉ bạn cách tận dụng AI để lên dàn ý 30 bài viết chỉ trong 10 phút. Lưu video này lại ngay để áp dụng cho lần lên kế hoạch content tiếp theo của bạn nhé!\n\nChi tiết prompt mình để ở dưới phần bình luận! 💬',
        hashtags: ['#ContentCreator', '#AITools', '#Growth'],
        platforms: ['TikTok', 'Instagram', 'YouTube'],
        bestTime: '19:00 Thứ 5',
        estimatedReach: '50K - 100K'
      },
      {
        id: shortId(),
        type: 'Photo',
        hook: 'Sự khác biệt giữa làm việc chăm chỉ và làm việc thông minh nằm ở bộ công cụ của bạn.',
        title: 'Work smart, not hard',
        caption: 'Trước đây, mình luôn tự hào vì có thể làm việc 12 tiếng/ngày. Nhưng thực tế đó là dấu hiệu của sự thiếu hiệu quả. \n\nTừ khi đưa AI vào hệ thống làm việc, mình hoàn thành khối lượng tương đương chỉ trong 6 tiếng. Bí mật nằm ở việc biết cách ủy quyền cho máy móc những tác vụ lặp đi lặp lại.\n\nNếu bạn vẫn đang kiệt sức, hãy chậm lại một nhịp và review lại quy trình của mình. Bạn đang mắc kẹt ở khâu nào nhất?',
        hashtags: ['#WorkSmart', '#Mindset', '#Solopreneur'],
        platforms: ['Facebook', 'LinkedIn'],
        bestTime: '09:00 Thứ 6',
        estimatedReach: '8K - 15K'
      },
      {
        id: shortId(),
        type: 'Short',
        hook: 'POV: Sếp hỏi tại sao KPI tăng gấp đôi mà không cần tuyển thêm người.',
        title: 'Khi AI làm trợ lý đắc lực',
        caption: 'Bí mật kinh doanh: Tuyển thêm một "trợ lý ảo" không bao giờ ngủ, không kêu ca và xử lý data trong tích tắc. 🤫\n\nĐùa chút thôi, nhưng thực sự ứng dụng AI đang là lợi thế cạnh tranh lớn nhất hiện nay. \n\nClick link bio để nhận danh sách 10 AI Tools dân văn phòng nào cũng cần biết.',
        hashtags: ['#CareerTips', '#OfficeLife', '#Trending'],
        platforms: ['TikTok', 'YouTube'],
        bestTime: '12:00 Thứ 2',
        estimatedReach: '20K - 45K'
      }
    ]
  },
  {
    id: 'trend-2',
    title: 'Personal Branding for Introverts',
    text: 'Từ khóa "Xây dựng thương hiệu cá nhân cho người hướng nội" đang leo top tìm kiếm. Đây là cơ hội tuyệt vời để chia sẻ những góc nhìn chân thực, sâu sắc mà không cần phải luôn "ồn ào" bằng video múa hát trên mạng xã hội.',
    category: 'trend',
    action: 'Tạo bài ngay',
    ideas: [
      {
        id: shortId(),
        type: 'Carousel',
        hook: 'Hướng nội không có nghĩa là vô hình. Đây là cách xây dựng thương hiệu cá nhân không cần lên video.',
        title: 'Personal Branding không cần lên sóng',
        caption: 'Nhiều người nghĩ rằng làm Creator thì phải nói nhiều, phải hoạt ngôn trước ống kính. Hoàn toàn sai! ❌\n\nBạn hoàn toàn có thể xây dựng một thương hiệu mạnh mẽ qua sức mạnh của câu chữ và hình ảnh thiết kế.\n\nSwipe để xem 4 chiến lược "quiet branding" dành riêng cho team hướng nội. 👉\n\nBạn thuộc team hướng nội hay hướng ngoại? Comment nhé!',
        hashtags: ['#IntrovertPower', '#PersonalBranding', '#ContentWriting'],
        platforms: ['Instagram', 'LinkedIn'],
        bestTime: '20:00 Thứ 4',
        estimatedReach: '12K - 28K'
      },
      {
        id: shortId(),
        type: 'Thread',
        hook: 'Tôi là một người cực kỳ hướng nội, nhưng vẫn xây dựng được cộng đồng 50k người theo dõi. Đây là công thức của tôi.',
        title: 'Công thức cho người hướng nội',
        caption: 'Góc chia sẻ 🧵\n\n1. Thay vì livestream, hãy viết bản tin (newsletter) sâu sắc.\n2. Thay vì networking sự kiện đông người, hãy xây dựng mối quan hệ 1-1 chất lượng.\n3. Hãy coi việc chia sẻ như đang kể chuyện cho một người bạn thân.\n\nSự chân thành luôn có sức mạnh lan tỏa hơn sự ồn ào sáo rỗng. Bạn có đồng ý không?',
        hashtags: ['#CreatorJourney', '#Introvert', '#Community'],
        platforms: ['X', 'LinkedIn'],
        bestTime: '08:30 Thứ 3',
        estimatedReach: '8K - 20K'
      },
      {
        id: shortId(),
        type: 'Photo',
        hook: 'Năng lượng của bạn rất quý giá. Đừng lãng phí nó vào việc cố gắng trở thành một ai đó khác.',
        title: 'Sức mạnh của sự tĩnh lặng',
        caption: 'Làm nội dung không có nghĩa là bạn phải đốt cạn năng lượng xã hội của mình. \n\nHãy tìm một nhịp độ phù hợp. Nếu 1 bài/tuần là giới hạn của bạn, hãy làm cho bài viết đó thật sự xuất sắc. Khán giả sẽ nhớ đến bạn vì chất lượng, chứ không phải tần suất.\n\nCuối tuần rồi, hãy cho phép bản thân nghỉ ngơi và nạp lại năng lượng nhé. ☕🌿',
        hashtags: ['#MentalHealth', '#SlowLiving', '#IntrovertCreator'],
        platforms: ['Facebook', 'Instagram'],
        bestTime: '09:00 Thứ 7',
        estimatedReach: '10K - 22K'
      },
      {
        id: shortId(),
        type: 'Reel',
        hook: 'Cách mình làm video triệu view mà không cần lộ mặt 🤫',
        title: 'Faceless Video Tips',
        caption: 'Sợ camera? Không sao cả!\n\nVideo không lộ mặt (Faceless video) đang là một xu hướng cực thịnh. Bạn chỉ cần: \n🎬 Cảnh quay B-roll aesthetic\n✍️ Text on screen hấp dẫn\n🎵 Nhạc nền viral\n\nLưu ngay tips này để bắt đầu kênh TikTok của bạn ngay hôm nay mà không còn e ngại!',
        hashtags: ['#FacelessCreator', '#TikTokTips', '#VideoEditing'],
        platforms: ['TikTok', 'Instagram', 'YouTube'],
        bestTime: '19:30 Thứ 6',
        estimatedReach: '30K - 70K'
      },
      {
        id: shortId(),
        type: 'Photo',
        hook: 'Sự khác biệt lớn nhất giữa Influencer và Thought Leader.',
        title: 'Influencer vs Thought Leader',
        caption: 'Bạn không cần phải có hàng triệu followers để trở thành một Thought Leader trong ngách của mình.\n\nTrong khi Influencer tập trung vào độ rộng (reach), Thought Leader tập trung vào độ sâu (trust). \nĐối với người hướng nội, việc phân tích sâu một vấn đề luôn mang lại cảm giác thoải mái và tự tin hơn là việc chạy theo xu hướng đám đông.\n\nHãy chọn sân chơi mà bạn nắm chắc phần thắng.',
        hashtags: ['#ThoughtLeadership', '#Strategy', '#DeepWork'],
        platforms: ['LinkedIn', 'X'],
        bestTime: '08:00 Thứ 2',
        estimatedReach: '15K - 35K'
      }
    ]
  },
  {
    id: 'trend-3',
    title: 'The End of Hustle Culture',
    text: 'Người xem đang chán ngấy với văn hóa làm việc "bán mạng". Những nội dung cổ vũ sự cân bằng, sức khỏe tinh thần và "làm việc thông minh" đang nhận được sự đồng cảm và lượng chia sẻ khổng lồ.',
    category: 'trend',
    action: 'Tạo bài ngay',
    ideas: [
      {
        id: shortId(),
        type: 'Photo',
        hook: 'Tôi đã ngừng làm việc 14 tiếng/ngày, và doanh thu của tôi... lại tăng lên.',
        title: 'Nghịch lý của sự chăm chỉ',
        caption: 'Chúng ta đã bị tẩy não rằng "càng làm nhiều, càng thành công". 📉\n\nNhưng khi tôi cắt giảm thời gian làm việc xuống còn 6 tiếng/ngày, tôi buộc bản thân phải tập trung vào 20% công việc mang lại 80% kết quả. Thời gian nghỉ ngơi giúp tôi có những ý tưởng sáng tạo đột phá mà lúc kiệt sức tôi không bao giờ nghĩ ra được.\n\nSức khỏe của bạn không phải là cái giá để đánh đổi lấy sự nghiệp. Hãy bảo vệ nó. 🛡️',
        hashtags: ['#AntiHustle', '#MentalHealth', '#WorkLifeBalance'],
        platforms: ['LinkedIn', 'Facebook'],
        bestTime: '10:00 Thứ 5',
        estimatedReach: '18K - 40K'
      },
      {
        id: shortId(),
        type: 'Carousel',
        hook: 'Dấu hiệu bạn đang rơi vào bẫy "Toxic Productivity".',
        title: 'Toxic Productivity',
        caption: 'Cảm thấy tội lỗi khi nghỉ ngơi? Luôn phải làm gì đó mới thấy yên tâm?\n\nBạn không cô đơn. Swipe để xem 5 dấu hiệu của "Toxic productivity" và cách thoát khỏi nó ➡️\n\nĐừng quên gửi bài viết này cho một người bạn đang cần được nghỉ ngơi nhé. 🫂',
        hashtags: ['#Productivity', '#SelfCare', '#Burnout'],
        platforms: ['Instagram', 'LinkedIn'],
        bestTime: '12:00 Thứ 3',
        estimatedReach: '20K - 45K'
      },
      {
        id: shortId(),
        type: 'Reel',
        hook: 'Cuộc sống không chỉ là những deadline và hóa đơn.',
        title: 'Reminder to slow down',
        caption: 'Một lời nhắc nhở nhẹ nhàng dành cho bạn ngày hôm nay 🌿\n\nThế giới ngoài kia vẫn quay, công việc thì không bao giờ hết. Nhấp một ngụm nước, vươn vai và thở sâu nào. Bạn đã làm rất tốt rồi!\n\nComment "✨" nếu bạn cần thêm những năng lượng bình yên này.',
        hashtags: ['#SlowLiving', '#Peaceful', '#DailyReminder'],
        platforms: ['TikTok', 'Instagram', 'YouTube'],
        bestTime: '21:00 Chủ Nhật',
        estimatedReach: '40K - 90K'
      },
      {
        id: shortId(),
        type: 'Thread',
        hook: 'Hustle culture đã lừa dối chúng ta như thế nào?',
        title: 'Sự thật về Hustle Culture',
        caption: 'Đã đến lúc chúng ta nhìn nhận lại định nghĩa về sự thành công 🧵\n\n1/ Việc thiếu ngủ không phải là huy hiệu danh dự.\n2/ Trả lời email lúc 2h sáng chỉ chứng tỏ quy trình làm việc của bạn đang có vấn đề.\n3/ Tiền bạc vô nghĩa nếu bạn không có thời gian và sức khỏe để tiêu nó.\n\nHãy xây dựng một cuộc sống bạn không cần phải trốn chạy khỏi nó.',
        hashtags: ['#LifeLessons', '#Mindset', '#RealTalk'],
        platforms: ['X', 'LinkedIn'],
        bestTime: '08:00 Thứ 2',
        estimatedReach: '12K - 30K'
      },
      {
        id: shortId(),
        type: 'Short',
        hook: 'Cách mình thiết lập ranh giới (boundaries) với công việc.',
        title: 'Thiết lập boundaries',
        caption: 'Tắt thông báo sau 6h tối. Không làm việc cuối tuần. 🛑\n\nBan đầu rất khó, nhưng khi bạn tôn trọng ranh giới của chính mình, khách hàng và đồng nghiệp cũng sẽ làm như vậy.\n\nBạn có đang gặp khó khăn trong việc nói "Không" không? Chia sẻ cùng mình nhé.',
        hashtags: ['#Boundaries', '#CareerAdvice', '#SelfRespect'],
        platforms: ['TikTok', 'YouTube'],
        bestTime: '18:00 Thứ 4',
        estimatedReach: '25K - 60K'
      }
    ]
  },
  {
    id: 'trend-4',
    title: 'Short-form Storytelling',
    text: 'Thay vì nhảy múa theo trend, việc kể những câu chuyện cá nhân chân thực trong video ngắn (dưới 60s) đang là chìa khóa để xây dựng lòng trung thành và tỷ lệ chuyển đổi cao nhất.',
    category: 'trend',
    action: 'Tạo bài ngay',
    ideas: [
      {
        id: shortId(),
        type: 'Reel',
        hook: 'Câu chuyện mình từng thất bại thảm hại ở dự án đầu tiên...',
        title: 'My biggest failure',
        caption: 'Không ai thích kể về thất bại, nhưng nó lại là bài học đáng giá nhất. 🌧️\n\nNăm 2021, mình đánh mất toàn bộ vốn liếng vì một quyết định sai lầm. Nhưng chính sự vấp ngã đó đã dạy mình 3 bài học cốt lõi này...\n\n[Xem video để nghe chi tiết]\n\nĐừng sợ thất bại, hãy sợ việc không dám bắt đầu. Bạn đã từng vượt qua cú sốc nào lớn nhất?',
        hashtags: ['#Storytelling', '#Failure', '#LessonsLearned'],
        platforms: ['TikTok', 'Instagram', 'YouTube'],
        bestTime: '20:00 Thứ 5',
        estimatedReach: '35K - 80K'
      },
      {
        id: shortId(),
        type: 'Carousel',
        hook: 'Cấu trúc 3 bước để kể một câu chuyện lôi cuốn chỉ trong 60 giây.',
        title: 'Cấu trúc Storytelling 60s',
        caption: 'Kể chuyện là một kỹ năng, và bạn hoàn toàn có thể học được nó! 📖\n\nSwipe để lưu lại công thức H.B.R (Hook - Body - Resolution) giúp giữ chân người xem đến giây cuối cùng. Áp dụng ngay cho video tiếp theo của bạn nhé!\n\nLưu bài viết này lại để dùng khi bí ý tưởng nha! 📌',
        hashtags: ['#ContentTips', '#StorytellingFrame', '#CreatorTips'],
        platforms: ['Instagram', 'LinkedIn'],
        bestTime: '11:00 Thứ 3',
        estimatedReach: '15K - 35K'
      },
      {
        id: shortId(),
        type: 'Photo',
        hook: 'Sự chân thật là chiến lược marketing duy nhất không bao giờ lỗi thời.',
        title: 'Sự chân thật trong Marketing',
        caption: 'Khán giả ngày nay quá tinh rờ và dễ dàng nhận ra đâu là một nội dung "sặc mùi quảng cáo". 🚫\n\nĐiều họ tìm kiếm là sự đồng cảm, những câu chuyện thực tế đằng sau sản phẩm, những khó khăn mà bạn đã trải qua.\n\nHãy dũng cảm chia sẻ cả những góc khuất. Sự không hoàn hảo mới chính là điều kết nối con người với nhau.',
        hashtags: ['#Authenticity', '#MarketingStrategy', '#Branding'],
        platforms: ['LinkedIn', 'Facebook'],
        bestTime: '08:30 Thứ 6',
        estimatedReach: '10K - 25K'
      },
      {
        id: shortId(),
        type: 'Thread',
        hook: 'Case study: Video 45 giây này mang về 200 đơn hàng nhờ 1 câu chuyện.',
        title: 'Story-driven Sales',
        caption: 'Đừng bán sản phẩm, hãy bán giải pháp cho nỗi đau của khách hàng 🧵\n\n1/ Bắt đầu bằng việc mô tả lại một cách sống động khó khăn mà chính bạn từng gặp phải.\n2/ Kể về quá trình bạn gian nan đi tìm giải pháp.\n3/ Giới thiệu sản phẩm như "chìa khóa" cuối cùng.\n\nĐây là cách storytelling tạo ra doanh thu.',
        hashtags: ['#Copywriting', '#SalesTips', '#CaseStudy'],
        platforms: ['X', 'LinkedIn'],
        bestTime: '10:00 Thứ 4',
        estimatedReach: '9K - 22K'
      },
      {
        id: shortId(),
        type: 'Short',
        hook: 'Đằng sau mỗi sản phẩm thành công là một người sáng lập từng muốn bỏ cuộc.',
        title: 'Behind the brand',
        caption: 'Hành trình khởi nghiệp chưa bao giờ là trải đầy hoa hồng. 🥀\n\nVideo này dành tặng cho những ai đang chật vật xây dựng giấc mơ của riêng mình. Hãy tiếp tục bước đi, vì câu chuyện của bạn sẽ là nguồn cảm hứng cho rất nhiều người khác.\n\nTag một người bạn đang cần lời động viên này nhé!',
        hashtags: ['#FounderStory', '#Motivation', '#EntrepreneurLife'],
        platforms: ['TikTok', 'YouTube'],
        bestTime: '21:00 Thứ 7',
        estimatedReach: '40K - 100K'
      }
    ]
  },
  {
    id: 'trend-5',
    title: 'Building a Community, Not Just an Audience',
    text: 'Thuật toán thay đổi liên tục khiến lượng reach tự nhiên ngày càng giảm. Việc xây dựng một cộng đồng (Group kín, Discord, Newsletter) nơi mọi người gắn kết sâu sắc đang là ưu tiên hàng đầu của các Creator chuyên nghiệp.',
    category: 'trend',
    action: 'Tạo bài ngay',
    ideas: [
      {
        id: shortId(),
        type: 'Photo',
        hook: 'Audience giúp bạn có danh tiếng. Community giúp bạn có sự nghiệp bền vững.',
        title: 'Audience vs Community',
        caption: 'Sự khác biệt là gì?\n\nAudience (Khán giả) chỉ lắng nghe bạn nói. \nCommunity (Cộng đồng) giao tiếp với bạn VÀ với nhau. 🤝\n\nKhi thuật toán bóp tương tác, những người chỉ xem (audience) sẽ rời đi. Nhưng cộng đồng thì vẫn ở lại, ủng hộ và bảo vệ bạn. \n\nNăm 2026, hãy ngừng việc đuổi theo các con số vô tri. Hãy tập trung xây dựng một không gian an toàn và giá trị cho những người thực sự quan tâm.',
        hashtags: ['#CommunityBuilding', '#CreatorEconomy', '#FutureOfWork'],
        platforms: ['LinkedIn', 'Facebook'],
        bestTime: '08:00 Thứ 2',
        estimatedReach: '12K - 30K'
      },
      {
        id: shortId(),
        type: 'Carousel',
        hook: '4 bước chuyển đổi từ người theo dõi thành "Fan cứng" trung thành.',
        title: 'Phễu xây dựng cộng đồng',
        caption: '10k followers nhưng không ai mua hàng? Bạn đang thiếu một cộng đồng. ⚠️\n\nSwipe để xem mô hình phễu 4 bước giúp bạn lọc và nuôi dưỡng những cá nhân chất lượng nhất. \n\nĐừng quên áp dụng ngay bước số 2 trong tuần này nhé! Có thắc mắc gì cứ để lại bình luận.',
        hashtags: ['#MarketingFunnel', '#Fanbase', '#BusinessTips'],
        platforms: ['Instagram', 'LinkedIn'],
        bestTime: '12:00 Thứ 4',
        estimatedReach: '15K - 35K'
      },
      {
        id: shortId(),
        type: 'Reel',
        hook: 'Tại sao mình quyết định mở Newsletter thay vì tập trung làm TikTok?',
        title: 'Quyền sở hữu tệp khách hàng',
        caption: 'Đừng xây nhà trên đất của người khác! 🏠\n\nMạng xã hội có thể khóa tài khoản của bạn bất cứ lúc nào. Newsletter/Email list là tài sản duy nhất bạn THỰC SỰ sở hữu.\n\nVideo này giải thích lý do tại sao mọi Creator đều nên bắt đầu thu thập email ngay từ hôm nay. Link đăng ký bản tin của mình ở bio nhé! 💌',
        hashtags: ['#Newsletter', '#EmailMarketing', '#CreatorTips'],
        platforms: ['TikTok', 'Instagram', 'YouTube'],
        bestTime: '19:00 Thứ 5',
        estimatedReach: '25K - 60K'
      },
      {
        id: shortId(),
        type: 'Thread',
        hook: 'Sai lầm phổ biến khi lập Group Facebook/Discord cộng đồng.',
        title: 'Sai lầm khi tạo Group',
        caption: 'Rất nhiều group chết yểu chỉ sau 1 tháng hoạt động. Vì sao? 🧵\n\n1/ Không có luật chơi (Guidelines) rõ ràng từ đầu.\n2/ Founder chỉ quăng link bài viết vào nhóm mà không tương tác.\n3/ Không có các hoạt động định kỳ (Q&A, Workshop) để gắn kết member.\n\nCộng đồng giống như một cái cây, bạn phải tưới nước mỗi ngày.',
        hashtags: ['#CommunityManagement', '#FacebookGroup', '#Growth'],
        platforms: ['X', 'LinkedIn'],
        bestTime: '09:00 Thứ 3',
        estimatedReach: '10K - 22K'
      },
      {
        id: shortId(),
        type: 'Short',
        hook: 'Khoảnh khắc xúc động nhất khi làm Creator không phải là nút Bạc...',
        title: 'Giá trị thực sự của cộng đồng',
        caption: 'Mà là khi thấy các thành viên trong cộng đồng giúp đỡ, động viên lẫn nhau, cùng nhau tiến bộ. ✨\n\nCảm ơn mọi người đã là một phần của hành trình này. Mình tự hào về không gian chúng ta đang xây dựng cùng nhau.\n\nHãy tag một người bạn đã quen qua mạng xã hội vào đây nào!',
        hashtags: ['#Gratitude', '#CommunityLove', '#CreatorLife'],
        platforms: ['TikTok', 'YouTube'],
        bestTime: '20:30 Thứ 7',
        estimatedReach: '30K - 90K'
      }
    ]
  }
]