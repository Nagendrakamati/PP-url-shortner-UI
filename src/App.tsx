import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Database, LayoutGrid, Link2, Scissors, SquareArrowOutUpRight } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { createLink, isDemo, isWebUrl, listLinks } from './services/links'
import { readDraft, saveDraft } from './services/storage'
import './App.css'

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = pathname === '/admin' ? 'Admin | Linkline' : 'Linkline | URL Shortener'
  }, [pathname])

  return (
    <div className="site">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand"><span className="brand-icon"><Link2 size={20} /></span>Linkline</Link>
          <nav aria-label="Main navigation">
            <NavLink to="/" end><Scissors size={16} /> Shorten</NavLink>
            <NavLink to="/admin"><LayoutGrid size={16} /> Admin</NavLink>
          </nav>
        </div>
      </header>
      <main id="main"><Outlet /></main>
      <footer className="footer">
        <div className="footer-inner">
          <span><Link2 size={17} /> Linkline</span>
          {isDemo && <span><Database size={15} /> Browser-only demo</span>}
        </div>
      </footer>
    </div>
  )
}

function CopyButton({ url }: { url: string }) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (feedback !== 'copied') return
    const timeout = window.setTimeout(() => setFeedback('idle'), 2000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setFeedback('copied')
    } catch {
      setFeedback('failed')
    }
  }

  return (
    <div className="copy-action">
      <button type="button" className="button secondary copy" onClick={copy} aria-label={`Copy ${url}`}>
        {feedback === 'copied' ? <Check size={16} /> : <Copy size={16} />}
        {feedback === 'copied' ? 'Copied' : 'Copy'}
      </button>
      <span className="sr-only" role="status">{feedback === 'copied' ? 'Link copied' : ''}</span>
      {feedback === 'failed' && <small role="status">Copy the link manually.</small>}
    </div>
  )
}

export function ShortenPage() {
  const [draft, setDraft] = useState(readDraft)
  const [validation, setValidation] = useState('')
  const queryClient = useQueryClient()
  const create = useMutation({
    mutationFn: createLink,
    onSuccess: () => {
      setDraft('')
      saveDraft('')
      void queryClient.invalidateQueries({ queryKey: ['links'] })
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (create.isPending) return
    const url = draft.trim()
    if (!isWebUrl(url)) {
      setValidation('Enter a valid URL starting with https:// or http://.')
      return
    }
    setValidation('')
    create.mutate(url)
  }

  const error = validation || create.error?.message

  return (
    <section className="shorten-page">
      <div className="hero">
        <span className="hero-icon"><Scissors size={24} /></span>
        <h1>Give your link<br />a <em>shorter</em> life.</h1>
        <p>Turn a long URL into a short link that’s easy to share.</p>
      </div>
      <div className="panel form-card">
        <form onSubmit={submit} noValidate>
          <label htmlFor="long-url">Destination URL</label>
          <div className="form-row">
            <div className="input-wrap">
              <Link2 size={20} />
              <input id="long-url" name="longUrl" type="url" autoComplete="url" spellCheck={false}
                placeholder="https://example.com/your-long-link" value={draft} disabled={create.isPending}
                aria-invalid={Boolean(validation)} aria-describedby={error ? 'form-error' : undefined}
                onChange={(event) => {
                  setDraft(event.target.value)
                  saveDraft(event.target.value)
                  if (validation) setValidation('')
                  if (create.isError) create.reset()
                }} />
            </div>
            <button className="button primary" disabled={create.isPending} type="submit">
              <Scissors size={17} /> {create.isPending ? 'Shortening…' : 'Shorten link'}
            </button>
          </div>
          {error && <p id="form-error" className="error" role="alert">{error}</p>}
        </form>
        {create.data && (
          <div className="result">
            <div className="result-link">
              <span role="status"><Check size={16} /> Short link created</span>
              <a href={create.data.shortUrl} target="_blank" rel="noreferrer">{create.data.shortUrl}</a>
            </div>
            <CopyButton key={create.data.id} url={create.data.shortUrl} />
          </div>
        )}
      </div>
      {isDemo && <p className="demo-note"><Database size={16} /> Demo links are stored and resolve in this browser only.</p>}
    </section>
  )
}

const pageSize = 10
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function AdminPage() {
  const [params, setParams] = useSearchParams()
  const requestedPage = Number(params.get('page'))
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const query = useQuery({ queryKey: ['links', page, pageSize], queryFn: ({ signal }) => listLinks(page, pageSize, signal) })
  const total = query.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (query.isSuccess && page > pages) {
      setParams(pages === 1 ? {} : { page: String(pages) }, { replace: true })
    }
  }, [page, pages, query.isSuccess, setParams])

  function changePage(next: number) {
    setParams(next === 1 ? {} : { page: String(next) })
  }

  return (
    <section className="admin-page">
      <div className="admin-heading">
        <div><h1>Manage links</h1><p>View your short links and their destinations.</p></div>
        <Link className="button primary" to="/"><Scissors size={17} /> New link</Link>
      </div>
      <div className="panel admin-panel">
        <div className="table-heading">
          <h2>All links</h2>
          {query.isSuccess && <span>{total} {total === 1 ? 'link' : 'links'}</span>}
        </div>
        {query.isPending && <p className="table-message" role="status">Loading links…</p>}
        {query.isError && <div className="table-message">
          <p className="error" role="alert">{query.error.message}</p>
          <button className="button secondary" onClick={() => void query.refetch()}>Try again</button>
        </div>}
        {query.isSuccess && total === 0 && <div className="table-message empty">
          <span className="hero-icon"><Link2 size={23} /></span>
          <h3>No links yet</h3>
          <p>Create your first short link to see it here.</p>
          <Link className="button secondary" to="/">Shorten a URL</Link>
        </div>}
        {query.isSuccess && total > 0 && page <= pages && (
          <>
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Saved links">
              <table>
                <thead><tr><th scope="col">Short URL</th><th scope="col">Destination</th><th scope="col">Created</th><th scope="col">Actions</th></tr></thead>
                <tbody>
                  {query.data.items.map((link) => (
                    <tr key={link.id}>
                      <td><a className="table-short" href={link.shortUrl} target="_blank" rel="noreferrer">{link.shortUrl}<SquareArrowOutUpRight size={14} /></a></td>
                      <td><a href={link.longUrl} target="_blank" rel="noreferrer">{link.longUrl}</a></td>
                      <td><time dateTime={link.createdAt}>{dateFormat.format(new Date(link.createdAt))}</time></td>
                      <td><CopyButton url={link.shortUrl} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="pagination" aria-label="Pagination">
              <span role="status">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
              <div>
                <button className="button secondary" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</button>
                <button className="button secondary" disabled={page >= pages} onClick={() => changePage(page + 1)}>Next</button>
              </div>
            </nav>
          </>
        )}
      </div>
    </section>
  )
}

export function MissingPage({ shortLink = false }: { shortLink?: boolean }) {
  return (
    <section className="missing-page">
      <span className="hero-icon"><Link2 size={24} /></span>
      <h1>{shortLink ? 'Link unavailable' : 'Page not found'}</h1>
      <p>{shortLink ? 'Demo links only open in the browser where they were created.' : 'Check the address or return to the shortener.'}</p>
      <Link className="button primary" to="/">Back to Shorten</Link>
    </section>
  )
}
