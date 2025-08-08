import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AIInputSearch from '@/components/ai-input-search'

// Mock framer-motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock the auto-resize textarea hook
vi.mock('@/hooks/use-auto-resize-textarea', () => ({
  useAutoResizeTextarea: () => ({
    textareaRef: { current: null },
    adjustHeight: vi.fn(),
  }),
}))

describe('AIInputSearch - Image Generation Features', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    placeholder: 'Search the web...',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders image generation toggle button', () => {
    render(<AIInputSearch {...defaultProps} />)
    
    const imageButton = screen.getByRole('button', { name: /image/i })
    expect(imageButton).toBeInTheDocument()
  })

  it('toggles image generation mode when image button is clicked', () => {
    render(<AIInputSearch {...defaultProps} />)
    
    const imageButton = screen.getByRole('button', { name: /image/i })
    const textarea = screen.getByRole('textbox')
    
    // Initially should show default placeholder
    expect(textarea).toHaveAttribute('placeholder', defaultProps.placeholder)
    
    // Click image button
    fireEvent.click(imageButton)
    
    // Should show image generation placeholder
    expect(textarea).toHaveAttribute('placeholder', 'Describe the image you want to generate...')
  })

  it('disables search mode when image mode is enabled', () => {
    render(<AIInputSearch {...defaultProps} />)
    
    const searchButton = screen.getByRole('button', { name: /search/i })
    const imageButton = screen.getByRole('button', { name: /image/i })
    
    // Enable search mode first
    fireEvent.click(searchButton)
    expect(searchButton).toHaveClass('bg-sky-500/15')
    
    // Enable image mode
    fireEvent.click(imageButton)
    
    // Search mode should be disabled
    expect(searchButton).not.toHaveClass('bg-sky-500/15')
    expect(imageButton).toHaveClass('bg-purple-500/15')
  })

  it('disables image mode when search mode is enabled', () => {
    render(<AIInputSearch {...defaultProps} />)
    
    const searchButton = screen.getByRole('button', { name: /search/i })
    const imageButton = screen.getByRole('button', { name: /image/i })
    
    // Enable image mode first
    fireEvent.click(imageButton)
    expect(imageButton).toHaveClass('bg-purple-500/15')
    
    // Enable search mode
    fireEvent.click(searchButton)
    
    // Image mode should be disabled
    expect(imageButton).not.toHaveClass('bg-purple-500/15')
    expect(searchButton).toHaveClass('bg-sky-500/15')
  })

  it('calls onSubmit with text type when in text mode', () => {
    const onSubmit = vi.fn()
    render(<AIInputSearch {...defaultProps} onSubmit={onSubmit} />)
    
    const textarea = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    // Type some text
    fireEvent.change(textarea, { target: { value: 'test message' } })
    
    // Submit
    fireEvent.click(submitButton)
    
    expect(onSubmit).toHaveBeenCalledWith('test message', 'text')
  })

  it('calls onSubmit with image type when in image mode', () => {
    const onSubmit = vi.fn()
    render(<AIInputSearch {...defaultProps} onSubmit={onSubmit} />)
    
    const textarea = screen.getByRole('textbox')
    const imageButton = screen.getByRole('button', { name: /image/i })
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    // Enable image mode
    fireEvent.click(imageButton)
    
    // Type some text
    fireEvent.change(textarea, { target: { value: 'generate a cat' } })
    
    // Submit
    fireEvent.click(submitButton)
    
    expect(onSubmit).toHaveBeenCalledWith('generate a cat', 'image')
  })

  it('submits with correct type when Enter key is pressed', () => {
    const onSubmit = vi.fn()
    render(<AIInputSearch {...defaultProps} onSubmit={onSubmit} />)
    
    const textarea = screen.getByRole('textbox')
    const imageButton = screen.getByRole('button', { name: /image/i })
    
    // Enable image mode
    fireEvent.click(imageButton)
    
    // Type some text
    fireEvent.change(textarea, { target: { value: 'generate a dog' } })
    
    // Press Enter
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    
    expect(onSubmit).toHaveBeenCalledWith('generate a dog', 'image')
  })

  it('does not submit with Shift+Enter', () => {
    const onSubmit = vi.fn()
    render(<AIInputSearch {...defaultProps} onSubmit={onSubmit} />)
    
    const textarea = screen.getByRole('textbox')
    
    // Type some text
    fireEvent.change(textarea, { target: { value: 'test message' } })
    
    // Press Shift+Enter
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears input after successful submission', () => {
    const onSubmit = vi.fn()
    render(<AIInputSearch {...defaultProps} onSubmit={onSubmit} />)
    
    const textarea = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    // Type some text
    fireEvent.change(textarea, { target: { value: 'test message' } })
    expect(textarea).toHaveValue('test message')
    
    // Submit
    fireEvent.click(submitButton)
    
    // Input should be cleared
    expect(textarea).toHaveValue('')
  })

  it('shows correct button styles for image mode', () => {
    render(<AIInputSearch {...defaultProps} />)
    
    const imageButton = screen.getByRole('button', { name: /image/i })
    
    // Initially inactive
    expect(imageButton).toHaveClass('bg-black/5')
    expect(imageButton).not.toHaveClass('bg-purple-500/15')
    
    // Click to activate
    fireEvent.click(imageButton)
    
    // Should be active with purple styling
    expect(imageButton).toHaveClass('bg-purple-500/15')
    expect(imageButton).toHaveClass('border-purple-400')
    expect(imageButton).toHaveClass('text-purple-500')
  })

  it('shows image icon in the button', () => {
    render(<AIInputSearch {...defaultProps} />)
    
    // Image icon should be present (we can't easily test the actual icon, but we can test the button exists)
    const imageButton = screen.getByRole('button', { name: /image/i })
    expect(imageButton).toBeInTheDocument()
  })

  it('disables submission when disabled prop is true', () => {
    const onSubmit = vi.fn()
    render(<AIInputSearch {...defaultProps} onSubmit={onSubmit} disabled={true} />)
    
    const textarea = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /send/i })
    const imageButton = screen.getByRole('button', { name: /image/i })
    
    // Components should be disabled
    expect(textarea).toBeDisabled()
    expect(submitButton).toBeDisabled()
    
    // Try to interact
    fireEvent.click(imageButton)
    fireEvent.change(textarea, { target: { value: 'test' } })
    fireEvent.click(submitButton)
    
    // Should not submit
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables submission when isGenerating prop is true', () => {
    const onSubmit = vi.fn()
    render(<AIInputSearch {...defaultProps} onSubmit={onSubmit} isGenerating={true} />)
    
    const textarea = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    // Components should be disabled
    expect(textarea).toBeDisabled()
    expect(submitButton).toBeDisabled()
    
    // Should show generating placeholder
    expect(textarea).toHaveAttribute('placeholder', 'AI is generating...')
    
    // Try to submit
    fireEvent.click(submitButton)
    
    // Should not submit
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit empty or whitespace-only input', () => {
    const onSubmit = vi.fn()
    render(<AIInputSearch {...defaultProps} onSubmit={onSubmit} />)
    
    const textarea = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    // Try to submit empty input
    fireEvent.click(submitButton)
    expect(onSubmit).not.toHaveBeenCalled()
    
    // Try to submit whitespace-only input
    fireEvent.change(textarea, { target: { value: '   ' } })
    fireEvent.click(submitButton)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('trims whitespace from input before submission', () => {
    const onSubmit = vi.fn()
    render(<AIInputSearch {...defaultProps} onSubmit={onSubmit} />)
    
    const textarea = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    // Type text with leading/trailing whitespace
    fireEvent.change(textarea, { target: { value: '  test message  ' } })
    fireEvent.click(submitButton)
    
    expect(onSubmit).toHaveBeenCalledWith('test message', 'text')
  })
})