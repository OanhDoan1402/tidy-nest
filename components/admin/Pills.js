export function PayPill({ s }) {
  const m = { paid: ['Paid', 'pill-mute'], pending: ['Payment pending', 'pill-warn'], refunded: ['Refunded', 'pill-mute'] }[s] || [s, 'pill-mute'];
  return <span className={'pill ' + m[1]}>{m[0]}</span>;
}

export function FulPill({ s }) {
  const m = { unfulfilled: ['Unfulfilled', 'pill-warn'], fulfilled: ['Fulfilled', 'pill-ok'], canceled: ['Canceled', 'pill-mute'] }[s] || [s, 'pill-mute'];
  return <span className={'pill ' + m[1]}>{m[0]}</span>;
}
