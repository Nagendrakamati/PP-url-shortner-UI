export function readDraft() {
  try {
    return sessionStorage.getItem('linkline.draft') ?? ''
  } catch {
    return ''
  }
}

export function saveDraft(value: string) {
  try {
    if (value) sessionStorage.setItem('linkline.draft', value)
    else sessionStorage.removeItem('linkline.draft')
  } catch {
    // Draft persistence is optional when browser storage is unavailable.
  }
}
