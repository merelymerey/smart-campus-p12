export function validateAvailability(start, end, now, blocked, existing) {
  if (![start, end, now].every(Number.isInteger))
    return {available:false, message:'Enter whole minutes in all three time fields.'};
  if (now < 0 || now > 1439)
    return {available:false, message:'Current time must be between 0 and 1439.'};
  if (start < 0 || start >= end || end > 1440)
    return {available:false, message:'Use 0 <= start < end <= 1440 on the same day.'};
  if (start <= now)
    return {available:false, message:'Start must be after the supplied current time.'};
  if (end - start > 120)
    return {available:false, message:'Choose an interval of 120 minutes or less.'};
  if (blocked)
    return {available:false, message:'This room is blocked. Choose another room.'};
  if (existing.some(([s, e]) => start < e && s < end))
    return {available:false, message:'This interval overlaps an existing booking.'};
  return {available:true, message:'The room is available. No booking has been saved.'};
}
