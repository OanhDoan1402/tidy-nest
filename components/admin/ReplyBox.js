'use client';

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';

const QUICK = ['Thanks for reaching out!', 'Let me check that for you.', 'Free US shipping on orders $50+.'];

function Send() {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send'}</button>;
}

export default function ReplyBox({ conversationId, action }) {
  const formRef = useRef(null);
  const textRef = useRef(null);

  async function submit(formData) {
    await action(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={submit} style={{ borderTop: '1px solid var(--line)', background: '#fff', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name="conversation_id" value={conversationId} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {QUICK.map((q) => (
          <button key={q} type="button" className="btn btn-ghost btn-sm" style={{ borderRadius: 999 }}
            onClick={() => { const t = textRef.current; if (t) { t.value = (t.value ? t.value + ' ' : '') + q; t.focus(); } }}>{q}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <label className="sr" htmlFor="reply">Reply</label>
        <textarea ref={textRef} id="reply" name="body" rows={2} className="input" placeholder="Write a reply…" maxLength={2000} required style={{ minHeight: 48 }} />
        <Send />
      </div>
    </form>
  );
}
