import { db } from '@/lib/supabase/admin';
import { gemini, aiReady } from '@/lib/ai';
import { notify } from '@/lib/push';
import { STORE_NAME, money } from '@/lib/format';

const FIRST = ['Megan', 'Tom', 'Alicia', 'Ben', 'Nora', 'Luis', 'Grace', 'Sam', 'Chloe', 'Ethan', 'Ava', 'Noah', 'Priya', 'Marcus', 'Jenna', 'Diego'];
const LAST = ['Ross', 'Becker', 'Gomez', 'Carter', 'Walsh', 'Ortega', 'Liu', 'Patel', 'Hayes', 'Price', 'Turner', 'Morgan', 'Bennett', 'Reyes'];
const CITIES = ['Chicago, IL', 'Austin, TX', 'Phoenix, AZ', 'Denver, CO', 'Seattle, WA', 'Boston, MA', 'Raleigh, NC', 'San Diego, CA', 'Atlanta, GA', 'Portland, OR'];

// Each scenario has a fallback script used when no AI key is set or the AI call fails.
export const SCENARIOS = [
  { key: 'gift', tip: 'Suggest one or two specific products with prices, then confirm how gift notes work.', level: 'easy', mood: 'Friendly', scenario: 'Looking for a housewarming gift under $40',
    script: ['Hi! I need a housewarming gift under $40. What would you recommend?', 'Nice. Can you add a gift note to the order?', 'Perfect, thank you so much! [END]'],
    keys: ['$', 'gift', 'note', 'board', 'container', 'bottle', 'tray'] },
  { key: 'compare', tip: 'Ask about the space first, then compare size, install and price side by side.', level: 'mixed', mood: 'Undecided', scenario: 'Comparing the spice rack and the under-sink organizer for a tiny kitchen',
    script: ['What is the difference between the spice rack and the under-sink organizer? My kitchen is tiny.', 'Which one is easier to install? I rent, so no big holes in the wall.', 'Got it, I will go with that one. Thanks. [END]'],
    keys: ['spice', 'under-sink', 'organizer', 'install', 'wall', 'size'] },
  { key: 'shipping', tip: 'Give handling time plus a transit estimate, and mention the $50 free-shipping threshold.', level: 'easy', mood: 'Neutral', scenario: 'Asking how long shipping takes and whether it is free',
    script: ['How long does shipping take?', 'Is shipping free? My cart is about $45.', 'Okay, I will add something small then. Thanks! [END]'],
    keys: ['ship', 'day', '$50', 'free', '5.99'] },
  { key: 'late', tip: 'Apologize, ask for the order number, give a clear next step and never promise what you cannot guarantee.', level: 'hard', mood: 'Frustrated', scenario: 'Their order has not arrived after 6 days and they need it by Friday',
    script: ['My order still has not arrived and it has been 6 days. What is going on??', 'I need it by Friday. Can you guarantee that?', 'Fine. Please email me the tracking as soon as you have it. [END]'],
    keys: ['sorry', 'apolog', 'track', 'order number', 'check', 'today'] },
  { key: 'detail', tip: 'Answer care details precisely. If you are not sure of a spec, say you will check instead of guessing.', level: 'easy', mood: 'Curious', scenario: 'Asking whether the 25 oz steel bottle is dishwasher safe and how long it keeps drinks cold',
    script: ['Is the 25 oz steel bottle dishwasher safe?', 'How long does it keep drinks cold?', 'Great, ordering one now. [END]'],
    keys: ['hand wash', 'dishwasher', 'hour', 'cold', 'lid'] },
  { key: 'bulk', tip: 'State a clear offer and its limit, then give the next step (a code or a draft order).', level: 'mixed', mood: 'Businesslike', scenario: 'Wants a discount for buying 10 packs of wall hooks for an office',
    script: ['Do you offer a discount if I buy 10 packs of the wall hooks? It is for our office.', 'Can you do free shipping on top of that?', 'Okay, send me the details and I will order today. [END]'],
    keys: ['%', 'discount', 'code', 'bulk', 'pack'] },
  { key: 'damaged', tip: 'Apologize, ask for a photo, offer a replacement or refund, and cover return shipping for damaged items.', level: 'hard', mood: 'Disappointed', scenario: 'The fabric bins arrived dented with a tear and they want to return them',
    script: ['The fabric bins arrived dented and one has a tear. Can I return them?', 'Do I have to pay for return shipping?', 'Thanks for sorting it out. [END]'],
    keys: ['sorry', 'photo', 'replace', 'refund', 'return', 'label'] },
  { key: 'restock', tip: 'Give an honest restock estimate and offer to notify them, or suggest an alternative.', level: 'mixed', mood: 'Hopeful', scenario: 'Asking when the microfiber towel set will be back in stock',
    script: ['When will the microfiber towel set be back in stock?', 'Can you let me know when it is?', 'Thanks! [END]'],
    keys: ['stock', 'notify', 'email', 'week', 'soon'] },
];

const GAP = { low: [45, 80], mid: [20, 40], high: [8, 16] };
export function nextGap(freq) {
  const [a, b] = GAP[freq] || GAP.mid;
  return Math.round(a + Math.random() * (b - a));
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

async function catalog(supabase) {
  const { data } = await supabase.from('products').select('title, price, available, status').neq('status', 'archived');
  return (data || []).map((p) => `- ${p.title}: ${money(p.price)}, ${p.status !== 'active' ? 'not for sale yet' : p.available > 0 ? `${p.available} in stock` : 'out of stock'}`).join('\n');
}

function systemPrompt(persona, products) {
  return [
    `You are role-playing a CUSTOMER chatting on the website of ${STORE_NAME}, a small US online shop for home goods.`,
    'This is a practice exercise for the shop owner. Stay in character as the customer at all times. Never mention AI, practice or training.',
    `You are ${persona.name} from ${persona.city}. Mood: ${persona.mood}. What you want: ${persona.scenario}.`,
    'The shop\'s products:',
    products,
    'Shop policies: free US shipping on orders $50+, otherwise $5.99; orders ship within 1 business day; 30-day returns; ships to the US only.',
    'Write like a real person typing in a website chat: 1 or 2 short sentences, casual American English, no greeting formulas, no sign-off, no emojis, no markdown.',
    'Ask about one thing at a time. React to what the shop actually said. If they are vague or wrong, push back politely.',
    'When your need is resolved, or after about 3 of your messages, end politely and put [END] at the very end of that message.',
  ].join('\n');
}

function clean(text) {
  return String(text || '').replace(/^\s*["']|["']\s*$/g, '').replace(/\*\*/g, '').trim().slice(0, 600);
}

export function elapsedSeconds(s, now = Date.now()) {
  const started = new Date(s.started_at).getTime();
  const pausedNow = s.status === 'paused' && s.paused_at ? now - new Date(s.paused_at).getTime() : 0;
  return Math.max(0, Math.round((now - started - pausedNow) / 1000) - (s.paused_seconds || 0));
}

export async function activeSession(supabase = db()) {
  const { data } = await supabase.from('practice_sessions').select('*').in('status', ['running', 'paused']).order('started_at', { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function newCustomer(supabase, session) {
  const { data: used } = await supabase.from('conversations').select('persona').eq('practice_session_id', session.id);
  const usedKeys = new Set((used || []).map((c) => c.persona?.key));
  const allowed = SCENARIOS.filter((s) => session.diff === 'mixed' || (session.diff === 'easy' ? s.level !== 'hard' : s.level !== 'easy'));
  const fresh = allowed.filter((s) => !usedKeys.has(s.key));
  const sc = pick(fresh.length ? fresh : allowed);
  const persona = { key: sc.key, name: `${pick(FIRST)} ${pick(LAST)}`, city: pick(CITIES), mood: sc.mood, scenario: sc.scenario, step: 1, done: false };

  let first = null;
  if (aiReady()) {
    first = clean(await gemini({ system: systemPrompt(persona, await catalog(supabase)), turns: [{ role: 'user', text: 'A new chat window just opened. Write your first message to the shop.' }], maxTokens: 120 }));
    persona.ai = Boolean(first);
  }
  if (!first) first = sc.script[0];

  const now = new Date().toISOString();
  const { data: conv } = await supabase.from('conversations').insert({
    customer_name: persona.name, is_practice: true, practice_session_id: session.id, persona,
    unread_admin: true, last_message_at: now,
  }).select('id').single();
  if (!conv) return false;
  await supabase.from('messages').insert({ conversation_id: conv.id, sender: 'customer', body: first.replace(/\s*\[END\]\s*$/, '') });
  await notify('practice', { title: persona.name, body: first.replace(/\s*\[END\]\s*$/, ''), url: `/admin/inbox?c=${conv.id}`, tag: `chat-${conv.id}` });
  return true;
}

async function customerReply(supabase, conv) {
  const persona = conv.persona || {};
  const sc = SCENARIOS.find((s) => s.key === persona.key) || SCENARIOS[0];
  const { data: msgs } = await supabase.from('messages').select('sender, body').eq('conversation_id', conv.id).order('created_at').limit(60);

  let text = null;
  if (aiReady()) {
    const turns = (msgs || []).map((m) => ({ role: m.sender === 'customer' ? 'model' : 'user', text: m.body }));
    text = clean(await gemini({ system: systemPrompt(persona, await catalog(supabase)), turns, maxTokens: 120 }));
  }
  if (!text) text = sc.script[Math.min(persona.step || 1, sc.script.length - 1)];
  const theirs = (msgs || []).filter((m) => m.sender === 'customer').length;
  const done = /\[END\]\s*$/.test(text) || theirs >= 5;
  const body = text.replace(/\s*\[END\]\s*$/, '') || 'Thanks!';

  await supabase.from('messages').insert({ conversation_id: conv.id, sender: 'customer', body });
  await supabase.from('conversations').update({
    unread_admin: true, last_message_at: new Date().toISOString(), ai_pending_at: null,
    persona: { ...persona, step: (persona.step || 1) + 1, done },
  }).eq('id', conv.id);
}

// Called every few seconds by the open Inbox page while a session runs.
export async function tick() {
  const supabase = db();
  const session = await activeSession(supabase);
  if (!session || session.status !== 'running') return { changed: false };
  const now = Date.now();
  let changed = false;

  const { data: convs } = await supabase
    .from('conversations')
    .select('id, persona, ai_pending_at, status, messages(sender, created_at)')
    .eq('practice_session_id', session.id)
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(1, { referencedTable: 'messages' });

  let replies = 0;
  for (const c of convs || []) {
    const last = c.messages?.[0];
    if (!last || last.sender !== 'admin' || c.persona?.done || c.status === 'done') continue;
    if (!c.ai_pending_at) {
      const due = new Date(now + (3 + Math.random() * 5) * 1000).toISOString();
      await supabase.from('conversations').update({ ai_pending_at: due }).eq('id', c.id).is('ai_pending_at', null);
      changed = true;
      continue;
    }
    if (replies < 2 && new Date(c.ai_pending_at).getTime() <= now) {
      const { data: claimed } = await supabase.from('conversations')
        .update({ ai_pending_at: '2999-01-01T00:00:00Z' }).eq('id', c.id).eq('ai_pending_at', c.ai_pending_at).select('id, persona');
      if (claimed?.length) {
        replies += 1;
        await customerReply(supabase, claimed[0]);
        changed = true;
      }
    }
  }

  if (new Date(session.next_at).getTime() <= now && (convs || []).length < 12) {
    const next = new Date(now + nextGap(session.freq) * 1000).toISOString();
    const { data: claimed } = await supabase.from('practice_sessions')
      .update({ next_at: next }).eq('id', session.id).eq('next_at', session.next_at).select('id');
    if (claimed?.length && (await newCustomer(supabase, session))) changed = true;
  }
  return { changed };
}

function fmtSeconds(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60), r = s % 60;
  return m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
}

// Builds the end-of-session review.
export async function review(session) {
  const supabase = db();
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, customer_name, persona, created_at, messages(sender, body, created_at)')
    .eq('practice_session_id', session.id)
    .order('created_at');

  const items = (convs || []).map((c) => {
    const msgs = (c.messages || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const firstCustomer = msgs.find((m) => m.sender === 'customer');
    const firstMine = msgs.find((m) => m.sender === 'admin');
    const firstReply = firstCustomer && firstMine ? (new Date(firstMine.created_at) - new Date(firstCustomer.created_at)) / 1000 : null;
    const sc = SCENARIOS.find((s) => s.key === c.persona?.key) || SCENARIOS[0];
    const mine = msgs.filter((m) => m.sender === 'admin').map((m) => m.body.toLowerCase()).join(' ');
    const hits = sc.keys.filter((k) => mine.includes(k)).length;
    let grade = 'No reply';
    if (firstReply !== null) grade = firstReply <= 60 && hits >= 2 ? 'Strong' : firstReply <= 120 && hits >= 1 ? 'Good' : 'Needs work';
    return {
      id: c.id, name: c.customer_name, scenario: c.persona?.scenario || '', grade, firstReply,
      detail: firstReply === null ? 'This customer never got a reply.' : `First reply after ${fmtSeconds(firstReply)}.`,
      tip: '', transcript: msgs.map((m) => `${m.sender === 'admin' ? 'SHOP' : 'CUSTOMER'}: ${m.body}`).join('\n'),
    };
  });

  if (aiReady() && items.some((i) => i.firstReply !== null)) {
    const prompt = items.map((i, n) => `#${n + 1} (${i.name}, scenario: ${i.scenario}, first reply after ${i.firstReply === null ? 'no reply' : fmtSeconds(i.firstReply)})\n${i.transcript}`).join('\n\n');
    const out = await gemini({
      system: [
        'You coach a small online shop owner on customer chat. Review each practice chat below.',
        'Shop policies: free US shipping on orders $50+, otherwise $5.99; ships within 1 business day; 30-day returns; US only.',
        'For each chat return: grade ("Strong", "Good", "Needs work", or "No reply" when the shop never answered),',
        'summary (one sentence on what the shop did well or missed), tip (one concrete sentence the owner could say next time).',
        'Judge speed (under 1 minute is great), accuracy against the policies, warmth, and whether the question was resolved.',
        'Return JSON: {"items":[{"n":1,"grade":"","summary":"","tip":""}]}',
      ].join('\n'),
      turns: [{ role: 'user', text: prompt }], json: true, maxTokens: 1500, temperature: 0.3,
    });
    try {
      const parsed = JSON.parse(out || '{}');
      (parsed.items || []).forEach((r) => {
        const it = items[(r.n || 0) - 1];
        if (it) Object.assign(it, { grade: r.grade || it.grade, detail: `${it.detail} ${r.summary || ''}`.trim(), tip: r.tip || '' });
      });
    } catch {}
  }
  items.forEach((it) => {
    if (!it.tip) it.tip = SCENARIOS.find((s) => s.scenario === it.scenario)?.tip || 'Answer within a minute, quote the exact policy or price, and end with a clear next step.';
    delete it.transcript;
  });

  const replied = items.filter((i) => i.firstReply !== null);
  return {
    items,
    total: items.length,
    handled: replied.length,
    avgFirst: replied.length ? fmtSeconds(replied.reduce((a, i) => a + i.firstReply, 0) / replied.length) : 'n/a',
    length: fmtSeconds(elapsedSeconds({ ...session, status: 'running' })),
    ai: aiReady(),
  };
}
