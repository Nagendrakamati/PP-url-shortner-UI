import { createBrowserRouter, redirectDocument } from 'react-router-dom'
import { AdminPage, Layout, MissingPage, ShortenPage } from './App'
import { resolveDemoLink } from './services/links'

export const router = createBrowserRouter([
  {
    Component: Layout,
    hydrateFallbackElement: <main>Loading…</main>,
    children: [
      { index: true, Component: ShortenPage },
      { path: 'admin', Component: AdminPage },
      {
        path: 's/:id',
        loader: ({ params }) => {
          try {
            const destination = resolveDemoLink(params.id ?? '')
            if (destination) return redirectDocument(destination)
          } catch {
            // Treat unreadable browser storage as an unavailable demo link.
          }
          return null
        },
        element: <MissingPage shortLink />,
      },
      { path: '*', Component: MissingPage },
    ],
  },
])
