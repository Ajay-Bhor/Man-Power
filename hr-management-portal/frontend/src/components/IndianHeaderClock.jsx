import React, { useState, useEffect } from 'react';

/**
 * Formats a Date object to Indian Standard Time (IST, Asia/Kolkata)
 * using the browser's Intl.DateTimeFormat API without manual hour offsets.
 *
 * @param {Date} dateObj
 * @returns {{ date: string, time: string, greeting: string }}
 */
export function formatIndianDateTime(dateObj = new Date()) {
  const timeZone = 'Asia/Kolkata';

  // 1. Format Date to parts: e.g. "Fri, 23 Oct 2026"
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).formatToParts(dateObj);

  const weekday = dateParts.find(p => p.type === 'weekday')?.value || '';
  const day = dateParts.find(p => p.type === 'day')?.value || '';
  const month = dateParts.find(p => p.type === 'month')?.value || '';
  const year = dateParts.find(p => p.type === 'year')?.value || '';
  const formattedDate = `${weekday}, ${day} ${month} ${year}`;

  // 2. Format 12-hour Time to parts: e.g. "10:26 AM IST"
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).formatToParts(dateObj);

  let hour = timeParts.find(p => p.type === 'hour')?.value || '';
  const minute = timeParts.find(p => p.type === 'minute')?.value || '';
  const dayPeriod = (timeParts.find(p => p.type === 'dayPeriod')?.value || '').toUpperCase();

  // Ensure two digits for hour (e.g., "09:05 AM IST")
  if (hour.length === 1) {
    hour = `0${hour}`;
  }

  const formattedTime = `${hour}:${minute} ${dayPeriod} IST`;

  // 3. Indian Hour for Contextual Greeting
  const hour24Parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false
  }).formatToParts(dateObj);
  const hour24 = parseInt(hour24Parts.find(p => p.type === 'hour')?.value || '12', 10);

  let greeting = 'Good Morning';
  if (hour24 >= 12 && hour24 < 17) {
    greeting = 'Good Afternoon';
  } else if (hour24 >= 17) {
    greeting = 'Good Evening';
  }

  return {
    date: formattedDate,
    time: formattedTime,
    greeting
  };
}

/**
 * Custom React Hook that returns real-time Indian Standard Time (IST),
 * updated automatically every second and properly cleaned up on unmount.
 */
export function useIndianTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // 1. Initial clock sync
    setNow(new Date());

    // 2. Authoritative Internet Time Sync (optional graceful check)
    const syncInternetTime = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata', {
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data && data.datetime) {
            const netDate = new Date(data.datetime);
            if (!isNaN(netDate.getTime())) {
              setNow(netDate);
            }
          }
        }
      } catch (e) {
        // Fallback to client Date smoothly
      }
    };

    syncInternetTime();

    // 3. Tick every 1 second
    const timerId = setInterval(() => {
      setNow(prev => new Date(prev.getTime() + 1000));
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  return formatIndianDateTime(now);
}

/**
 * Reusable Header Clock Component displaying Indian Standard Time (IST)
 * Preserves the exact UI styling, green grid calendar SVG, and layout.
 *
 * Output:
 *   Fri, 23 Oct 2026
 *   10:26 AM IST
 */
export default function IndianHeaderClock({ className = '', style = {} }) {
  const { date, time } = useIndianTime();

  return (
    <div className={`urja-req-date-badge ${className}`} style={style}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="17" rx="3.5" stroke="#98E843" strokeWidth="2" />
        <path d="M3 9.5H21" stroke="#98E843" strokeWidth="2" />
        <circle cx="7.5" cy="13.5" r="1.1" fill="#98E843" />
        <circle cx="12" cy="13.5" r="1.1" fill="#98E843" />
        <circle cx="16.5" cy="13.5" r="1.1" fill="#98E843" />
        <circle cx="7.5" cy="17" r="1.1" fill="#98E843" />
        <circle cx="12" cy="17" r="1.1" fill="#98E843" />
        <circle cx="16.5" cy="17" r="1.1" fill="#98E843" />
      </svg>
      <div className="urja-req-date-text">
        <span className="urja-req-date-day">{date}</span>
        <span className="urja-req-date-clock">{time}</span>
      </div>
    </div>
  );
}
