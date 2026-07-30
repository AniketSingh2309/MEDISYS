function timeToMinutes(t) {
  const parts = String(t).split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function computeAvailableSlots(scheduleRows, bookedTimes) {
  const booked = new Set(bookedTimes.map((t) => minutesToTime(timeToMinutes(t))));
  const slots = [];
  for (const row of scheduleRows) {
    const start = timeToMinutes(row.start_time);
    const end = timeToMinutes(row.end_time);
    const step = row.slot_minutes;
    for (let t = start; t + step <= end; t += step) {
      const slot = minutesToTime(t);
      if (!booked.has(slot)) slots.push(slot);
    }
  }
  return slots;
}

module.exports = { computeAvailableSlots, timeToMinutes, minutesToTime };
