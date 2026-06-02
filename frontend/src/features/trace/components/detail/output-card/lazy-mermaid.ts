// Lazy-loaded Mermaid: pulls the heavy diagram bundle only when a
// DiagramBlock actually renders. Initialization runs once per session.

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null

async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(mod => {
      const m = mod.default
      m.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: '#f1f5f9',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#94a3b8',
          lineColor: '#64748b',
          secondaryColor: '#ecfdf5',
          tertiaryColor: '#f8fafc',
          background: '#ffffff',
          mainBkg: '#f1f5f9',
          nodeBorder: '#64748b',
          fontSize: '18px',
        },
        flowchart: {
          curve: 'basis',
          padding: 20,
          nodeSpacing: 60,
          rankSpacing: 60,
          useMaxWidth: true,
          htmlLabels: true,
        },
      })
      return m
    })
  }
  return mermaidPromise
}

export async function renderMermaid(id: string, code: string): Promise<{ svg: string }> {
  const m = await getMermaid()
  return m.render(id, code)
}
