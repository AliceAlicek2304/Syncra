import { Check, GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import logo from '../assets/syncra-logo.png'

const PLANS = [
  {
    name: 'Basic',
    code: 'basic',
    icon: <img src={logo} alt="Syncra" className="w-5 h-5 object-contain" />,
    price: { monthly: 99, yearly: 79 },
    desc: 'Phù hợp để bắt đầu thử nền tảng.',
    features: [
      'Kết nối 20 tài khoản mạng xã hội',
      'Lên lịch bài đăng không giới hạn',
      'Phân tích cơ bản',
      'Trình soạn nội dung',
      'Hỗ trợ cộng đồng',
      'Trợ lý AI giới hạn',
    ],
    highlight: false,
  },
  {
    name: 'Pro',
    code: 'pro',
    icon: <img src={logo} alt="Syncra" className="w-5 h-5 object-contain invert" />,
    price: { monthly: 149, yearly: 119 },
    desc: 'Dành cho creator làm nội dung nghiêm túc.',
    features: [
      'Kết nối tối đa 50 tài khoản mạng xã hội',
      'Lên lịch bài đăng không giới hạn',
      'Phân tích nâng cao',
      'Gợi ý giờ đăng tốt nhất',
      'Tái sử dụng nội dung hiệu quả',
      'Hỗ trợ ưu tiên',
      'Trợ lý AI',
    ],
    highlight: true,
    badge: 'Phổ biến nhất',
  },
  {
    name: 'Max',
    code: 'max',
    icon: <img src={logo} alt="Syncra" className="w-5 h-5 object-contain" />,
    price: { monthly: 199, yearly: 159 },
    desc: 'Cho team nhỏ và creator cần nhiều quyền hơn.',
    features: [
      'Tất cả tính năng của Pro',
      'Tối đa 10 thành viên trong team',
      'Bộ nhận diện thương hiệu riêng',
      'Báo cáo white-label',
      'Quyền truy cập API',
      'Hỗ trợ riêng',
      'Tích hợp tuỳ chỉnh',
    ],
    highlight: false,
  },
  {
    name: 'Student',
    code: 'student',
    icon: <GraduationCap size={20} />,
    price: { monthly: 59, yearly: 49 },
    desc: 'Ưu đãi cho sinh viên xác thực bằng email .edu hoặc .edu.vn.',
    features: [
      'Giá sinh viên 59.000đ/tháng',
      'Xác thực bằng email trường',
      'Hiệu lực 12 tháng',
      'Kết nối 20 tài khoản mạng xã hội',
      'Lên lịch bài đăng không giới hạn',
      'Trợ lý AI giới hạn',
    ],
    highlight: false,
    badge: 'Sinh viên',
  },
]

export default function Pricing() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className="py-16 md:py-24 bg-brand-canvas-soft text-brand-ink border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-widest block mb-3">Bảng giá</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-ink leading-tight">
            Giá rõ ràng, dễ bắt đầu.<br />
            <span className="text-brand-primary">Có gói riêng cho sinh viên.</span>
          </h2>
          <p className="text-base sm:text-lg text-brand-body mt-4 max-w-xl mx-auto leading-relaxed">
            Bắt đầu với 14 ngày dùng thử miễn phí. Sinh viên có thể xác thực email trường để dùng Syncra từ 59.000đ/tháng.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <span
              className={`text-sm font-bold select-none cursor-pointer transition-colors duration-150 ${!yearly ? 'text-brand-ink' : 'text-brand-body-mid'}`}
              onClick={() => setYearly(false)}
            >
              Theo tháng
            </span>
            <button
              className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 outline-none relative flex items-center ${yearly ? 'bg-brand-primary' : 'bg-brand-mute'}`}
              onClick={() => setYearly(y => !y)}
              aria-label="Đổi chu kỳ thanh toán"
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-4.5 h-4.5 rounded-full bg-brand-on-primary shadow-sm absolute ${yearly ? 'right-1' : 'left-1'}`}
              />
            </button>
            <span
              className={`text-sm font-bold select-none cursor-pointer transition-colors duration-150 flex items-center gap-2 ${yearly ? 'text-brand-ink' : 'text-brand-body-mid'}`}
              onClick={() => setYearly(true)}
            >
              Theo năm
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full">Tiết kiệm 20%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-brand-md p-7 flex flex-col shadow-sm relative transition-all duration-150 hover:shadow-md border ${
                plan.highlight
                  ? 'border-brand-ink bg-brand-ink text-brand-on-primary'
                  : 'border-brand-border bg-brand-canvas text-brand-ink'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-brand-on-primary text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-sm">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-brand-sm flex items-center justify-center p-1.5 border ${
                    plan.highlight
                      ? 'bg-brand-ink-soft border-brand-ink-soft'
                      : 'bg-brand-canvas border-brand-border text-brand-primary'
                  }`}>
                    {plan.icon}
                  </div>
                  <span className="text-2xl font-black tracking-tight">{plan.name}</span>
                </div>
                <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-brand-on-primary/80' : 'text-brand-body-mid'}`}>
                  {plan.desc}
                </p>
              </div>

              <div className={`mb-8 border-b pb-6 flex items-baseline gap-1 ${
                plan.highlight ? 'border-brand-border/20' : 'border-brand-border/60'
              }`}>
                <span className="text-4xl font-extrabold tracking-tight">
                  {yearly ? plan.price.yearly : plan.price.monthly}.000
                </span>
                <span className={`text-xs font-semibold ${plan.highlight ? 'text-brand-on-primary/60' : 'text-brand-body-mid'}`}>
                  đ / tháng
                </span>
              </div>

              <ul className="flex flex-col gap-3.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm font-medium">
                    <Check size={16} className="text-brand-primary shrink-0 mt-0.5" />
                    <span className={plan.highlight ? 'text-brand-on-primary/95' : 'text-brand-body'}>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2.5 mt-auto w-full">
                <Link
                  to={plan.code === 'student' ? `/signup?flow=checkout&plan=${plan.code}` : `/signup?flow=trial&plan=${plan.code}`}
                  className={`w-full py-2.5 font-bold rounded-brand-md text-sm transition-all inline-flex items-center justify-center shadow-sm hover:shadow ${
                    plan.highlight
                      ? 'bg-brand-primary text-brand-on-primary hover:bg-brand-primary-hover'
                      : 'bg-brand-canvas border border-brand-border text-brand-ink hover:bg-brand-canvas-soft'
                  }`}
                >
                  {plan.code === 'student' ? 'Xác thực sinh viên' : 'Dùng thử miễn phí'}
                </Link>
                <Link
                  to={`/signup?flow=checkout&plan=${plan.code}`}
                  className={`w-full py-2.5 font-bold rounded-brand-md text-sm transition-all inline-flex items-center justify-center shadow-sm hover:shadow ${
                    plan.highlight
                      ? 'bg-brand-on-primary text-brand-ink hover:bg-brand-canvas-soft'
                      : 'bg-brand-ink text-brand-on-primary hover:bg-brand-ink-soft'
                  }`}
                >
                  {plan.code === 'student' ? 'Xác thực sinh viên' : 'Mua ngay'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-brand-body-mid mt-10">
          Gói Student cần xác thực lại sau 12 tháng. Các gói trả phí khác có 14 ngày đảm bảo hoàn tiền.
        </p>
      </div>
    </section>
  )
}
