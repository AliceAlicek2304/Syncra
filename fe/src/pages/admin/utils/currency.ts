export const formatVnd = (value: unknown) => {
  const amount =
    typeof value === 'number'
      ? value
      : Number(String(value ?? '0').replace(/[^0-9.-]/g, ''))

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}
