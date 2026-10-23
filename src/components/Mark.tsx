/** The Willow & Wren mark: a wren perched on a willow branch. `reversed` is for use on a willow-green tile. */
export function Mark({ size = 32, reversed = false, className = '' }: { size?: number; reversed?: boolean; className?: string }) {
  const branch = reversed ? '#FBF8F2' : '#3F6B4E'
  const leaf = reversed ? '#B9D6BC' : '#6E9A73'
  return (
    <svg width={size} height={size} viewBox="2 9 60 60" fill="none" aria-hidden className={className}>
      <path d="M6 47c14-5 32-6 52-2" stroke={branch} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M15 45.2c-1.6 4.2-1.4 8.4.6 12.2 1.8-4 1.6-8.2-.6-12.2Z" fill={leaf} />
      <path d="M47 44.6c2 3.6 2.4 7.4 1.2 11.2-2.2-3.4-2.6-7.2-1.2-11.2Z" fill={leaf} />
      <path d="M21.5 36.5 11.8 22.6c-.9-1.3.3-3 1.8-2.6l12.4 3.6" fill="#7A4A2C" />
      <path d="M19 35.5c0-9.4 7.1-15.5 15.6-15.5 8 0 13.4 5.2 13.4 12.2 0 7.9-6.4 12.8-14.6 12.8C24.6 45 19 41.6 19 35.5Z" fill="#A8683F" />
      <path d="M24.5 33.8c2.6-4.8 8.3-6.6 12.7-4.6-1.2 5.2-6.6 8.3-12.7 4.6Z" fill="#7A4A2C" />
      <path d="M39.5 41.9c4.5-1.6 7.6-5 8.3-9.4-3.6 1.4-6.8 4.6-8.3 9.4Z" fill="#E9C9A6" />
      <path d="M47.4 27.4 54 28.6l-6.2 2.2" fill="#3A2A1F" />
      <circle cx="42.6" cy="26.6" r="1.7" fill="#1F2A24" />
      <circle cx="43.1" cy="26.1" r=".55" fill="#FBF8F2" />
      <path d="M31 44.8v2.4M35.5 44.8v2.2" stroke="#3A2A1F" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
