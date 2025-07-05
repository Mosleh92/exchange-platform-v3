// Utility functions for formatting data

export const formatCurrency = (amount, currency = 'IRR') => {
  if (!amount) return '0'
  
  const formatter = new Intl.NumberFormat('fa-IR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  
  return formatter.format(amount)
}

export const formatNumber = (number) => {
  if (!number) return '0'
  
  return new Intl.NumberFormat('fa-IR').format(number)
}

export const formatDate = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  return d.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatDateTime = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  return d.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatPhoneNumber = (phone) => {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Format Iranian phone numbers
  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
  }
  
  return phone
}

export const formatNationalCode = (code) => {
  if (!code) return ''
  
  const cleaned = code.replace(/\D/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3')
}

export const formatBankCard = (card) => {
  if (!card) return ''
  
  const cleaned = card.replace(/\D/g, '')
  return cleaned.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')
}

export const formatPercentage = (value) => {
  if (!value) return '0%'
  
  return `${value.toFixed(2)}%`
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

export const truncateText = (text, maxLength = 50) => {
  if (!text) return ''
  
  if (text.length <= maxLength) return text
  
  return text.substring(0, maxLength) + '...'
}

export const capitalizeFirst = (text) => {
  if (!text) return ''
  
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Minimal placeholder for format.js
export default {}; 