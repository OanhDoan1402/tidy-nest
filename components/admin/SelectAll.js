'use client';

export default function SelectAll({ formId }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      style={{ width: 18, height: 18, accentColor: '#1E6B57' }}
      onChange={(e) => {
        document.querySelectorAll(`#${formId} input[name="ids"]`).forEach((el) => { el.checked = e.target.checked; });
      }}
    />
  );
}
