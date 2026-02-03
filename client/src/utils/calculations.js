export const formatCurrency = (amount) => {
    // User requested "LKR" or 'Rs.' prefix.
    // en-LK usually gives 'Rs.'
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2
    }).format(amount);
};

export const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startDate = new Date(0, 0, 0, startH, startM);
    const endDate = new Date(0, 0, 0, endH, endM);
    let diff = (endDate - startDate) / 1000 / 60 / 60; // hours
    if (diff < 0) diff += 24; // Handle overnight? Assuming same day for now or standard shift
    return diff;
};

export const calculateDailyPay = (entry, baseSalary, otDivisor = 240) => {
    // Normal Hour Rate
    // Hourly Rate = Base / Divisor (e.g. 30000 / 240 = 125)
    const R = baseSalary / otDivisor;

    // Parse times
    const totalWorkDuration = calculateDuration(entry.checkIn, entry.checkOut);
    const lunchDuration = calculateDuration(entry.lunchOut, entry.lunchIn);

    const actualWorkHours = Math.max(0, totalWorkDuration - lunchDuration);

    // Determine day type
    const date = new Date(entry.date);
    const day = date.getDay(); // 0 = Sun, 6 = Sat

    let otHours = 0;
    let otRate = 0;
    let otPay = 0;

    // Special Day (Poya/Sunday)
    // Note: User said "Sunday/Poya", so we treat Sunday OR isSpecialDay=true as Special
    if (day === 0 || entry.isSpecialDay) {
        otHours = actualWorkHours;
        otRate = R * 2.0;
        otPay = otHours * otRate;
    } else if (day === 6) {
        // Saturday
        const threshold = 5;
        if (actualWorkHours > threshold) {
            otHours = actualWorkHours - threshold;
            otRate = R * 1.5;
            otPay = otHours * otRate;
        }
    } else {
        // Normal Day (Mon-Fri)
        const threshold = 8;
        if (actualWorkHours > threshold) {
            otHours = actualWorkHours - threshold;
            otRate = R * 1.5; // Corrected from R * 1.5 per earlier instruction
            otPay = otHours * otRate;
        }
    }

    return {
        date: entry.date,
        hours: Number(actualWorkHours.toFixed(2)),
        otHours: Number(otHours.toFixed(2)),
        otPay,
        totalPay: otPay
    };
};
