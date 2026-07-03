import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Edit3, Eye, Percent, Plus, Power, RotateCcw, Search, TicketPercent } from 'lucide-react'
import adminApi, { type AdminVoucher, type AdminVoucherRedemption, type UpsertAdminVoucherRequest } from '../../api/admin'
import styles from './AdminModern.module.css'
import { Card, EmptyState, LoadingState, PageHeader, Pill, StatCard } from './components/AdminPrimitives'
import { formatVnd } from './utils/currency'

const PLAN_OPTIONS = ['BASIC', 'PRO', 'MAX']
const INTERVAL_OPTIONS = [
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
]

type VoucherFormState = {
  code: string
  name: string
  description: string
  discountType: 'percent' | 'amount'
  percentOff: string
  amountOff: string
  minimumAmount: string
  applicablePlanCodes: string[]
  applicableIntervals: string[]
  maxRedemptions: string
  maxRedemptionsPerUser: string
  startsAtUtc: string
  expiresAtUtc: string
  isActive: boolean
  requiresStudentVerification: boolean
}

const emptyForm: VoucherFormState = {
  code: '',
  name: '',
  description: '',
  discountType: 'percent',
  percentOff: '50',
  amountOff: '',
  minimumAmount: '',
  applicablePlanCodes: ['BASIC', 'MAX'],
  applicableIntervals: ['month', 'year'],
  maxRedemptions: '',
  maxRedemptionsPerUser: '1',
  startsAtUtc: '',
  expiresAtUtc: '',
  isActive: true,
  requiresStudentVerification: false,
}

const parseList = (json?: string | null): string[] => {
  if (!json) return []
  try {
    const value = JSON.parse(json)
    return Array.isArray(value) ? value.map(String) : []
  } catch {
    return []
  }
}

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

const toUtcIso = (value: string) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const toNullableNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

const voucherToForm = (voucher: AdminVoucher): VoucherFormState => ({
  code: voucher.code,
  name: voucher.name,
  description: voucher.description ?? '',
  discountType: voucher.discountType === 'amount' ? 'amount' : 'percent',
  percentOff: voucher.percentOff?.toString() ?? '',
  amountOff: voucher.amountOff?.toString() ?? '',
  minimumAmount: voucher.minimumAmount?.toString() ?? '',
  applicablePlanCodes: parseList(voucher.applicablePlanCodesJson),
  applicableIntervals: parseList(voucher.applicableIntervalsJson),
  maxRedemptions: voucher.maxRedemptions?.toString() ?? '',
  maxRedemptionsPerUser: voucher.maxRedemptionsPerUser?.toString() ?? '',
  startsAtUtc: toDateTimeLocal(voucher.startsAtUtc),
  expiresAtUtc: toDateTimeLocal(voucher.expiresAtUtc),
  isActive: voucher.isActive,
  requiresStudentVerification: voucher.requiresStudentVerification,
})

const formToPayload = (form: VoucherFormState): UpsertAdminVoucherRequest => ({
  code: form.code.trim().toUpperCase(),
  name: form.name.trim(),
  description: form.description.trim() || null,
  discountType: form.discountType,
  percentOff: form.discountType === 'percent' ? toNullableNumber(form.percentOff) : null,
  amountOff: form.discountType === 'amount' ? toNullableNumber(form.amountOff) : null,
  minimumAmount: toNullableNumber(form.minimumAmount),
  applicablePlanCodes: form.applicablePlanCodes,
  applicableIntervals: form.applicableIntervals,
  maxRedemptions: toNullableNumber(form.maxRedemptions),
  maxRedemptionsPerUser: toNullableNumber(form.maxRedemptionsPerUser),
  startsAtUtc: toUtcIso(form.startsAtUtc),
  expiresAtUtc: toUtcIso(form.expiresAtUtc),
  isActive: form.isActive,
  requiresStudentVerification: form.requiresStudentVerification,
  source: form.requiresStudentVerification ? 'student' : 'manual',
})

const formatDiscount = (voucher: AdminVoucher) => {
  if (voucher.discountType === 'amount') {
    return formatVnd(voucher.amountOff ?? 0)
  }

  return `${voucher.percentOff ?? 0}%`
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Không giới hạn'
  return new Date(value).toLocaleDateString('vi-VN')
}

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([])
  const [form, setForm] = useState<VoucherFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'percent' | 'amount' | 'student'>('all')
  const [selectedVoucher, setSelectedVoucher] = useState<AdminVoucher | null>(null)
  const [redemptions, setRedemptions] = useState<AdminVoucherRedemption[]>([])
  const [redemptionsLoading, setRedemptionsLoading] = useState(false)

  const loadVouchers = async () => {
    setLoading(true)
    setError(null)
    try {
      setVouchers(await adminApi.listVouchers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách mã giảm giá.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVouchers()
  }, [])

  const filteredVouchers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return vouchers.filter((voucher) => {
      if (statusFilter === 'active' && !voucher.isActive) return false
      if (statusFilter === 'inactive' && voucher.isActive) return false
      if (typeFilter === 'percent' && voucher.discountType !== 'percent') return false
      if (typeFilter === 'amount' && voucher.discountType !== 'amount') return false
      if (typeFilter === 'student' && !voucher.requiresStudentVerification) return false
      if (!keyword) return true
      return (
      [voucher.code, voucher.name, voucher.description ?? '', voucher.source]
        .some((value) => value.toLowerCase().includes(keyword))
      )
    })
  }, [query, statusFilter, typeFilter, vouchers])

  const activeCount = vouchers.filter((voucher) => voucher.isActive).length
  const redeemedCount = vouchers.reduce((total, voucher) => total + (voucher.redemptionCount ?? voucher.redeemedCount ?? 0), 0)
  const studentCount = vouchers.filter((voucher) => voucher.requiresStudentVerification).length

  const toggleArrayValue = (field: 'applicablePlanCodes' | 'applicableIntervals', value: string) => {
    setForm((current) => {
      const exists = current[field].includes(value)
      return {
        ...current,
        [field]: exists
          ? current[field].filter((item) => item !== value)
          : [...current[field], value],
      }
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = formToPayload(form)
      if (editingId) {
        await adminApi.updateVoucher(editingId, payload)
      } else {
        await adminApi.createVoucher(payload)
      }
      setForm(emptyForm)
      setEditingId(null)
      await loadVouchers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được mã giảm giá.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (voucher: AdminVoucher) => {
    setEditingId(voucher.id)
    setForm(voucherToForm(voucher))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSelectVoucher = async (voucher: AdminVoucher) => {
    setSelectedVoucher(voucher)
    setRedemptionsLoading(true)
    setError(null)
    try {
      setRedemptions(await adminApi.listVoucherRedemptions(voucher.id))
    } catch (err) {
      setRedemptions([])
      setError(err instanceof Error ? err.message : 'Không tải được lịch sử dùng mã.')
    } finally {
      setRedemptionsLoading(false)
    }
  }

  const handleStatusToggle = async (voucher: AdminVoucher) => {
    setError(null)
    try {
      await adminApi.updateVoucherStatus(voucher.id, !voucher.isActive)
      await loadVouchers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được trạng thái mã.')
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="VOUCHERS"
        title="Mã giảm giá"
        subtitle="Tạo và quản lý ưu đãi cho các gói thanh toán. Lượt dùng chỉ ghi nhận sau khi SePay xác nhận thanh toán thành công."
      />

      <div className={styles.statsGrid}>
        <StatCard label="Tổng mã" value={vouchers.length} icon={<TicketPercent size={20} />} />
        <StatCard label="Đang bật" value={activeCount} icon={<Power size={20} />} tone="#10b981" />
        <StatCard label="Đã dùng" value={redeemedCount} icon={<Percent size={20} />} tone="#7c3aed" />
        <StatCard label="Mã sinh viên" value={studentCount} icon={<TicketPercent size={20} />} tone="#0891b2" />
      </div>

      {error && <div className={styles.adminError}>{error}</div>}

      <Card
        title={editingId ? 'Cập nhật mã giảm giá' : 'Tạo mã giảm giá'}
        meta={editingId ? 'Đang chỉnh sửa mã hiện có' : 'Mã mới sẽ dùng được ngay nếu bật trạng thái hoạt động'}
        actions={editingId && (
          <button type="button" className={styles.secondaryAction} onClick={resetForm}>
            <RotateCcw size={16} /> Tạo mới
          </button>
        )}
      >
        <form className={styles.voucherForm} onSubmit={handleSubmit}>
          <label>
            <span>Mã</span>
            <input
              className={styles.input}
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
              placeholder="VD: STUDENT50"
              required
            />
          </label>
          <label>
            <span>Tên hiển thị</span>
            <input
              className={styles.input}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ưu đãi sinh viên"
              required
            />
          </label>
          <label>
            <span>Loại giảm</span>
            <select
              className={styles.select}
              value={form.discountType}
              onChange={(event) => setForm({ ...form, discountType: event.target.value as 'percent' | 'amount' })}
            >
              <option value="percent">Theo phần trăm</option>
              <option value="amount">Theo số tiền</option>
            </select>
          </label>
          <label>
            <span>{form.discountType === 'percent' ? 'Phần trăm giảm' : 'Số tiền giảm'}</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              max={form.discountType === 'percent' ? 100 : undefined}
              value={form.discountType === 'percent' ? form.percentOff : form.amountOff}
              onChange={(event) => setForm({
                ...form,
                [form.discountType === 'percent' ? 'percentOff' : 'amountOff']: event.target.value,
              })}
              required
            />
          </label>
          <label>
            <span>Giá trị tối thiểu</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={form.minimumAmount}
              onChange={(event) => setForm({ ...form, minimumAmount: event.target.value })}
              placeholder="Không bắt buộc"
            />
          </label>
          <label>
            <span>Tổng lượt dùng</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={form.maxRedemptions}
              onChange={(event) => setForm({ ...form, maxRedemptions: event.target.value })}
              placeholder="Không giới hạn"
            />
          </label>
          <label>
            <span>Lượt mỗi user</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={form.maxRedemptionsPerUser}
              onChange={(event) => setForm({ ...form, maxRedemptionsPerUser: event.target.value })}
              placeholder="Không giới hạn"
            />
          </label>
          <label>
            <span>Bắt đầu</span>
            <input
              className={styles.input}
              type="datetime-local"
              value={form.startsAtUtc}
              onChange={(event) => setForm({ ...form, startsAtUtc: event.target.value })}
            />
          </label>
          <label>
            <span>Hết hạn</span>
            <input
              className={styles.input}
              type="datetime-local"
              value={form.expiresAtUtc}
              onChange={(event) => setForm({ ...form, expiresAtUtc: event.target.value })}
            />
          </label>
          <label className={styles.voucherFull}>
            <span>Mô tả</span>
            <input
              className={styles.input}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Ghi chú nội bộ hoặc mô tả ngắn"
            />
          </label>

          <div className={styles.voucherChoiceGroup}>
            <span>Gói áp dụng</span>
            <div className={styles.voucherChoices}>
              {PLAN_OPTIONS.map((plan) => (
                <label key={plan} className={styles.checkPill}>
                  <input
                    type="checkbox"
                    checked={form.applicablePlanCodes.includes(plan)}
                    onChange={() => toggleArrayValue('applicablePlanCodes', plan)}
                  />
                  {plan}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.voucherChoiceGroup}>
            <span>Chu kỳ</span>
            <div className={styles.voucherChoices}>
              {INTERVAL_OPTIONS.map((interval) => (
                <label key={interval.value} className={styles.checkPill}>
                  <input
                    type="checkbox"
                    checked={form.applicableIntervals.includes(interval.value)}
                    onChange={() => toggleArrayValue('applicableIntervals', interval.value)}
                  />
                  {interval.label}
                </label>
              ))}
            </div>
          </div>

          <label className={styles.switchRow}>
            <input
              type="checkbox"
              checked={form.requiresStudentVerification}
              onChange={(event) => setForm({ ...form, requiresStudentVerification: event.target.checked })}
            />
            Yêu cầu xác thực sinh viên
          </label>
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            Đang hoạt động
          </label>

          <div className={styles.voucherActions}>
            <button className={styles.primaryAction} type="submit" disabled={saving}>
              <Plus size={16} /> {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo mã'}
            </button>
          </div>
        </form>
      </Card>

      <Card
        title="Danh sách mã"
        meta={`${filteredVouchers.length} mã đang hiển thị`}
        actions={
          <>
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} size={16} />
              <input
                className={styles.inputSearch}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm mã..."
              />
            </div>
            <select className={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang bật</option>
              <option value="inactive">Đã tắt</option>
            </select>
            <select className={styles.select} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
              <option value="all">Tất cả loại mã</option>
              <option value="percent">Theo phần trăm</option>
              <option value="amount">Theo số tiền</option>
              <option value="student">Mã sinh viên</option>
            </select>
          </>
        }
      >
        {loading ? (
          <LoadingState />
        ) : filteredVouchers.length === 0 ? (
          <EmptyState>Chưa có mã giảm giá nào.</EmptyState>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Giảm</th>
                  <th>Áp dụng</th>
                  <th>Lượt dùng</th>
                  <th>Thời hạn</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map((voucher) => {
                  const plans = parseList(voucher.applicablePlanCodesJson)
                  const intervals = parseList(voucher.applicableIntervalsJson)
                  const used = voucher.redemptionCount ?? voucher.redeemedCount ?? 0
                  return (
                    <tr key={voucher.id}>
                      <td>
                        <div className={styles.itemTitle}>{voucher.code}</div>
                        <div className={styles.itemMeta}>{voucher.name}</div>
                      </td>
                      <td>{formatDiscount(voucher)}</td>
                      <td>
                        <div>{plans.length ? plans.join(', ') : 'Tất cả gói'}</div>
                        <div className={styles.itemMeta}>{intervals.length ? intervals.join(', ') : 'Mọi chu kỳ'}</div>
                      </td>
                      <td>{used}{voucher.maxRedemptions ? ` / ${voucher.maxRedemptions}` : ''}</td>
                      <td>
                        <div>{formatDate(voucher.startsAtUtc)}</div>
                        <div className={styles.itemMeta}>đến {formatDate(voucher.expiresAtUtc)}</div>
                      </td>
                      <td>
                        <Pill tone={voucher.isActive ? 'green' : 'rose'}>
                          {voucher.isActive ? 'Đang bật' : 'Đã tắt'}
                        </Pill>
                        {voucher.requiresStudentVerification && <div className={styles.itemMeta}>Sinh viên</div>}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.iconAction} onClick={() => handleSelectVoucher(voucher)} aria-label="Xem lịch sử dùng mã">
                            <Eye size={15} />
                          </button>
                          <button className={styles.iconAction} onClick={() => handleEdit(voucher)} aria-label="Sửa mã">
                            <Edit3 size={15} />
                          </button>
                          <button className={styles.iconAction} onClick={() => handleStatusToggle(voucher)} aria-label="Đổi trạng thái">
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedVoucher && (
        <Card
          title={`Lịch sử sử dụng ${selectedVoucher.code}`}
          meta="50 lượt dùng gần nhất sau khi thanh toán thành công"
          actions={
            <button className={styles.secondaryAction} type="button" onClick={() => {
              setSelectedVoucher(null)
              setRedemptions([])
            }}>
              Đóng
            </button>
          }
        >
          {redemptionsLoading ? (
            <LoadingState />
          ) : redemptions.length === 0 ? (
            <EmptyState>Chưa có lượt dùng nào cho mã này.</EmptyState>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Gói</th>
                    <th>Giảm</th>
                    <th>Thanh toán</th>
                    <th>Thời gian</th>
                    <th>Phiên</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((redemption) => (
                    <tr key={redemption.id}>
                      <td>
                        <div className={styles.itemTitle}>{redemption.userEmail}</div>
                        <div className={styles.itemMeta}>{redemption.userId}</div>
                      </td>
                      <td>{redemption.planCode}</td>
                      <td>{formatVnd(redemption.discountAmount)}</td>
                      <td>
                        <div>{formatVnd(redemption.finalAmount)}</div>
                        <div className={styles.itemMeta}>Gốc {formatVnd(redemption.originalAmount)}</div>
                      </td>
                      <td>{new Date(redemption.redeemedAtUtc).toLocaleString('vi-VN')}</td>
                      <td>
                        <div>{redemption.checkoutSessionId || 'N/A'}</div>
                        <div className={styles.itemMeta}>{redemption.paymentProvider || redemption.status}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  )
}
