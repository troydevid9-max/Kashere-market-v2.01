import { useRef } from 'react'
import { Camera, Plus, X } from 'lucide-react'

/** Matches the Add Product design: dashed "tap to upload" tile, thumbnails with remove buttons, and a trailing + slot. */
export function PhotoUpload({ photos, onChange, max = 5, onError }) {
  const input = useRef(null)

  const add = (fileList) => {
    const files = Array.from(fileList || [])
    const room = max - photos.length
    const ok = files.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) && f.size <= 5 * 1024 * 1024)
    if (ok.length < files.length) onError?.('Only JPG, PNG or WebP images up to 5MB are allowed.')
    if (files.length > room) onError?.(`You can add up to ${max} photos.`)
    const next = ok.slice(0, room).map((f) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f), name: f.name, file: f }))
    if (next.length) onChange([...photos, ...next])
    if (input.current) input.current.value = ''
  }
  const remove = (id) => {
    const p = photos.find((x) => x.id === id)
    if (p) URL.revokeObjectURL(p.url)
    onChange(photos.filter((x) => x.id !== id))
  }

  return (
    <div className="pu">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => add(e.target.files)} />
      <div className="pu__row">
        {photos.length === 0 && (
          <button type="button" className="pu__drop" onClick={() => input.current?.click()}>
            <Camera size={24} />
            <b>Tap to upload</b>
            <small>(max {max} photos)</small>
          </button>
        )}
        {photos.map((p, i) => (
          <div key={p.id} className={`pu__thumb ${i === 0 ? 'is-cover' : ''}`}>
            <img src={p.url} alt={`Product photo ${i + 1}`} />
            <button type="button" className="pu__x" onClick={() => remove(p.id)} aria-label={`Remove photo ${i + 1}`}><X size={12} strokeWidth={3} /></button>
          </div>
        ))}
        {photos.length > 0 && photos.length < max && (
          <button type="button" className="pu__add" onClick={() => input.current?.click()} aria-label="Add another photo">
            <Plus size={22} />
          </button>
        )}
      </div>
    </div>
  )
}
