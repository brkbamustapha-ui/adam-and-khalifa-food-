import { SITE } from '../config.js'

/** Horaires d'ouverture, calculés à l'heure d'Algérie quel que soit le fuseau du visiteur. */
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const OPEN = toMin(SITE.hours.open)
const CLOSE = toMin(SITE.hours.close)

export const fmtTime = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440
  if (m === 0) return 'minuit'
  return `${String(Math.floor(m / 60)).padStart(2, '0')}h${String(m % 60).padStart(2, '0')}`
}

export function algiersMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Algiers',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

export function isOpenAt(mins) {
  return CLOSE > OPEN ? mins >= OPEN && mins < CLOSE : mins >= OPEN || mins < CLOSE
}

export function openStatus() {
  const now = algiersMinutes()
  const open = isOpenAt(now)
  return {
    open,
    now,
    label: open ? `Ouvert maintenant, jusqu'à ${fmtTime(CLOSE)}` : `Fermé pour le moment, ouverture à ${fmtTime(OPEN)}`,
  }
}

/** Créneaux proposés dans le formulaire de commande (par quart d'heure). */
export function timeSlots() {
  const { open, now } = openStatus()
  const first = open ? 'Dès que possible' : `Dès l'ouverture (${fmtTime(OPEN)})`
  const slots = [first]
  let t = open ? Math.ceil((now + 30) / 15) * 15 : OPEN + 30
  const end = CLOSE > OPEN ? CLOSE : CLOSE + 1440
  while (t <= end - 15 && slots.length < 17) {
    slots.push(fmtTime(t))
    t += 15
  }
  return slots
}

export function initStatus() {
  const render = () => {
    const s = openStatus()
    for (const el of document.querySelectorAll('[data-open-status]')) {
      el.classList.toggle('is-open', s.open)
      el.classList.toggle('is-closed', !s.open)
      el.textContent = el.classList.contains('status--box') && !s.open ? `${s.label}. Ta commande sera traitée dès l'ouverture.` : s.label
    }
  }
  render()
  setInterval(render, 60_000)
}
