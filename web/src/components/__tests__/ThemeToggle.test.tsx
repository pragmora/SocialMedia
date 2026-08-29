import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithRouter } from '@/test/render'
import { ThemeProvider } from '@/context/ThemeProvider'
import ThemeToggle from '../ThemeToggle'

function renderToggle() {
  return renderWithRouter(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.removeItem('sf-theme')
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    window.localStorage.removeItem('sf-theme')
    document.documentElement.classList.remove('dark')
  })

  it('inicia en claro (sin preferencia guardada) y permite pasar a oscuro', () => {
    renderToggle()
    const btn = screen.getByRole('button', { name: 'Modo oscuro' })
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    fireEvent.click(btn)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('sf-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Modo claro' })).toBeInTheDocument()
  })

  it('vuelve a claro al alternar de nuevo', () => {
    renderToggle()
    const btn = screen.getByRole('button', { name: 'Modo oscuro' })

    fireEvent.click(btn)
    fireEvent.click(screen.getByRole('button', { name: 'Modo claro' }))

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem('sf-theme')).toBe('light')
  })

  it('respeta la preferencia guardada al montar', () => {
    window.localStorage.setItem('sf-theme', 'dark')
    renderToggle()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(screen.getByRole('button', { name: 'Modo claro' })).toBeInTheDocument()
  })
})
