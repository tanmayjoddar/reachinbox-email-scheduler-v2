export const HOUR = 3_600_000;

export const hourWindow = (nowMs: number) => Math.floor(nowMs / HOUR);

export const nextHourStart = (nowMs: number) => (hourWindow(nowMs) + 1) * HOUR;
