export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0
}

export const validateNumber = (value: string): boolean => {
  return !isNaN(parseFloat(value)) && isFinite(Number(value))
}

export const validatePositiveNumber = (value: string): boolean => {
  return validateNumber(value) && parseFloat(value) > 0
}