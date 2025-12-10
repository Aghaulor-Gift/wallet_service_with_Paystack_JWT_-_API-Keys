export function addExpiryToNow(code: string): Date {
  const now = new Date();
  const amount = parseInt(code.slice(0, -1), 10);
  const unit = code.slice(-1).toUpperCase();

  const expiry = new Date(now);

  switch (unit) {
    case 'H':
      expiry.setHours(expiry.getHours() + amount);
      break;
    case 'D':
      expiry.setDate(expiry.getDate() + amount);
      break;
    case 'M':
      expiry.setMonth(expiry.getMonth() + amount);
      break;
    case 'Y':
      expiry.setFullYear(expiry.getFullYear() + amount);
      break;
    default:
      throw new Error('Invalid expiry format. Use 1H, 1D, 1M, or 1Y');
  }

  return expiry;
}
