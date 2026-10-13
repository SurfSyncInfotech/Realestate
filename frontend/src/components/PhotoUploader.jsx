import { useRef, useState } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { img } from "../data/media.js";
import { apiErrorMessage, uploadPhotos } from "../services/auth.js";

const MAX = 8;
const MAX_MB = 6;

// Pick photos from the computer; they upload straight away and the first one
// is the cover. `value` is the list of stored image paths.
export default function PhotoUploader({ value, onChange }) {
  const input = useRef(null);
  const [state, setState] = useState({ busy: false, error: "" });

  async function handleFiles(event) {
    const files = [...event.target.files];
    event.target.value = "";
    if (files.length === 0) return;
    if (value.length + files.length > MAX) {
      setState({ busy: false, error: `You can add up to ${MAX} photos. Remove one first.` });
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setState({ busy: false, error: `"${tooBig.name}" is larger than ${MAX_MB} MB.` });
      return;
    }
    const wrongType = files.find((f) => !/^image\/(jpeg|png|webp)$/.test(f.type));
    if (wrongType) {
      setState({ busy: false, error: `"${wrongType.name}" is not a JPG, PNG or WebP image.` });
      return;
    }
    setState({ busy: true, error: "" });
    try {
      const urls = await uploadPhotos(files);
      onChange([...value, ...urls]);
      setState({ busy: false, error: "" });
    } catch (error) {
      setState({ busy: false, error: apiErrorMessage(error, "The photos could not be uploaded. Please try again.") });
    }
  }

  const makeCover = (index) => onChange([value[index], ...value.filter((_, i) => i !== index)]);
  const remove = (index) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="pu">
      <ul className="pu-grid">
        {value.map((src, index) => (
          <li key={src} className={index === 0 ? "is-cover" : ""}>
            <img src={img(src, 400)} alt={`Photo ${index + 1}`} />
            {index === 0 && <span className="pu-badge">Cover</span>}
            <div className="pu-actions">
              {index !== 0 && (
                <button type="button" onClick={() => makeCover(index)} aria-label={`Make photo ${index + 1} the cover`}>
                  <Star size={14} /> Cover
                </button>
              )}
              <button type="button" onClick={() => remove(index)} aria-label={`Remove photo ${index + 1}`}>
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
        {value.length < MAX && (
          <li>
            <button type="button" className="pu-add" onClick={() => input.current?.click()} disabled={state.busy}>
              <ImagePlus size={26} aria-hidden="true" />
              <span>{state.busy ? "Uploading…" : "Add photos"}</span>
              <small>JPG, PNG or WebP · up to {MAX_MB} MB</small>
            </button>
          </li>
        )}
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleFiles} aria-label="Choose photos to upload" />
      {state.error && <p className="ws-msg bad" role="alert">{state.error}</p>}
      <p className="pd-muted" style={{ margin: 0 }}>
        {value.length} of {MAX} photos. The first photo is the cover shown on cards and search results.
      </p>
    </div>
  );
}
