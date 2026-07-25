import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

interface CompiledContentProps {
  /** HTML compiled from `content/` at build time by the ace-content plugin. */
  html: string
  className: string
}

/**
 * Renders build-time-compiled content and keeps its links inside the SPA.
 *
 * The prose is authored in Markdown, so a cross-link between lessons is an
 * ordinary `<a href>` — which the browser would treat as a full navigation,
 * reloading the bundle and throwing away React state. React Router cannot see
 * these anchors (they are injected, not `<Link>`s), so the click is intercepted
 * here and handed to the router instead.
 *
 * Clicks that mean "open this somewhere else" — modifier or non-primary clicks,
 * `target` set, external hosts — are left alone.
 *
 * The HTML is injected because it is compiled from files in this repo, with
 * markdown-it configured `html: false` so raw tags in a source file are escaped
 * rather than passed through. If content ever arrives from outside a reviewed
 * PR (a CMS), sanitise in the plugin.
 */
export function CompiledContent({ html, className }: CompiledContentProps) {
  const navigate = useNavigate()

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return

    // Same-origin check via the resolved href: jsdom and the browser both
    // resolve a relative href against the current document.
    const href = anchor.getAttribute('href')
    if (!href || !href.startsWith('/')) return

    event.preventDefault()
    navigate(href)
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div className={className} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
  )
}
