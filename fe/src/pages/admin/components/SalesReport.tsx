import { FaMoneyBillWave, FaUsers, FaChartLine } from 'react-icons/fa'
import styles from '../AdminLayout.module.css'

export default function SalesReport() {
  const cards = [
    { id: 'c1', title: 'MRR', period: '30d', value: '28.450 ₫', icon: <FaMoneyBillWave size={20} color="#10B981" /> },
    { id: 'c2', title: 'Khách hàng hoạt động', period: '30d', value: '1,240', icon: <FaUsers size={20} color="#7cc6ff" /> },
    { id: 'c3', title: 'Tỷ lệ chuyển đổi', period: '30d', value: '+3.4%', icon: <FaChartLine size={20} color="#b07cff" /> },
  ]

  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16}}>
      {cards.map((c) => (
        <div key={c.id} className={styles.card} style={{padding:16}}>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:8}}>
            {c.icon}
            <div>
              <div style={{fontSize:13, color:'#605d52'}}>{c.title}</div>
              <div style={{fontSize:12, color:'#939084'}}>{c.period}</div>
            </div>
          </div>
          <div style={{fontSize:20, fontWeight:700}}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}
