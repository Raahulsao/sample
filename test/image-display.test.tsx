import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImageDisplay, ImageLoadingSkeleton } from '@/components/image-display'

// Mock framer-motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ children, ...props }: any) => <img {...props}>{children}</img>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock URL.createObjectURL and related APIs
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
})

// Mock fetch for download functionality
global.fetch = vi.fn()

describe('ImageDisplay', () => {
  const defaultProps = {
    src: 'https://example.com/test-image.jpg',
    alt: 'Test image',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
    
    // Reset DOM
    document.body.innerHTML = ''
  })

  it('renders image with correct attributes', () => {
    render(<ImageDisplay {...defaultProps} />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', defaultProps.src)
    expect(image).toHaveAttribute('alt', defaultProps.alt)
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('shows loading state when isLoading is true', () => {
    render(<ImageDisplay {...defaultProps} isLoading={true} />)
    
    expect(screen.getByText('Generating image...')).toBeInTheDocument()
  })

  it('shows loading state when image is not loaded', () => {
    render(<ImageDisplay {...defaultProps} />)
    
    // Image should be initially hidden (opacity-0)
    const image = screen.getByRole('img')
    expect(image).toHaveClass('opacity-0')
    
    // Should show loading indicator
    expect(screen.getByText('Loading image...')).toBeInTheDocument()
  })

  it('shows error state when error prop is provided', () => {
    const errorMessage = 'Failed to generate image'
    render(<ImageDisplay {...defaultProps} error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows retry button when error and onRetry are provided', () => {
    const onRetry = vi.fn()
    render(<ImageDisplay {...defaultProps} error="Error" onRetry={onRetry} />)
    
    const retryButton = screen.getByText('Try again')
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('handles image load event', () => {
    render(<ImageDisplay {...defaultProps} />)
    
    const image = screen.getByRole('img')
    fireEvent.load(image)
    
    // Image should become visible
    expect(image).toHaveClass('opacity-100')
  })

  it('handles image error event', () => {
    render(<ImageDisplay {...defaultProps} />)
    
    const image = screen.getByRole('img')
    fireEvent.error(image)
    
    // Should show error message
    expect(screen.getByText('Failed to load image')).toBeInTheDocument()
  })

  it('shows action buttons when showActions is true and image is loaded', () => {
    render(<ImageDisplay {...defaultProps} showActions={true} />)
    
    const image = screen.getByRole('img')
    fireEvent.load(image)
    
    expect(screen.getByTitle('View fullscreen')).toBeInTheDocument()
    expect(screen.getByTitle('Download image')).toBeInTheDocument()
  })

  it('hides action buttons when showActions is false', () => {
    render(<ImageDisplay {...defaultProps} showActions={false} />)
    
    const image = screen.getByRole('img')
    fireEvent.load(image)
    
    expect(screen.queryByTitle('View fullscreen')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Download image')).not.toBeInTheDocument()
  })

  it('displays caption when provided', () => {
    const caption = 'This is a test caption'
    render(<ImageDisplay {...defaultProps} caption={caption} />)
    
    expect(screen.getByText(caption)).toBeInTheDocument()
  })

  it('opens fullscreen modal when fullscreen button is clicked', () => {
    render(<ImageDisplay {...defaultProps} />)
    
    const image = screen.getByRole('img')
    fireEvent.load(image)
    
    const fullscreenButton = screen.getByTitle('View fullscreen')
    fireEvent.click(fullscreenButton)
    
    // Should show fullscreen modal with close button
    const buttons = screen.getAllByRole('button')
    const closeButton = buttons.find(button => 
      button.className.includes('absolute top-4 right-4')
    )
    expect(closeButton).toBeInTheDocument()
  })

  it('closes fullscreen modal when close button is clicked', () => {
    render(<ImageDisplay {...defaultProps} />)
    
    const image = screen.getByRole('img')
    fireEvent.load(image)
    
    // Open fullscreen
    const fullscreenButton = screen.getByTitle('View fullscreen')
    fireEvent.click(fullscreenButton)
    
    // Close fullscreen
    const buttons = screen.getAllByRole('button')
    const closeButton = buttons.find(button => 
      button.className.includes('absolute top-4 right-4')
    )
    expect(closeButton).toBeInTheDocument()
    fireEvent.click(closeButton!)
    
    // Modal should be closed (only one image visible)
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
  })

  it('handles download functionality', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' })
    ;(global.fetch as any).mockResolvedValueOnce({
      blob: () => Promise.resolve(mockBlob),
    })

    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
    const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any)
    const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any)

    render(<ImageDisplay {...defaultProps} />)
    
    const image = screen.getByRole('img')
    fireEvent.load(image)
    
    const downloadButton = screen.getByTitle('Download image')
    fireEvent.click(downloadButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(defaultProps.src)
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockLink.click).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    // Cleanup mocks
    mockCreateElement.mockRestore()
    mockAppendChild.mockRestore()
    mockRemoveChild.mockRestore()
  })

  it('handles download error gracefully', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ImageDisplay {...defaultProps} />)
    
    const image = screen.getByRole('img')
    fireEvent.load(image)
    
    const downloadButton = screen.getByTitle('Download image')
    fireEvent.click(downloadButton)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to download image:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('applies custom className', () => {
    const customClass = 'custom-image-class'
    render(<ImageDisplay {...defaultProps} className={customClass} />)
    
    const container = screen.getByRole('img').closest('div')
    expect(container).toHaveClass(customClass)
  })
})

describe('ImageLoadingSkeleton', () => {
  it('renders loading skeleton', () => {
    render(<ImageLoadingSkeleton />)
    
    // Should have the skeleton container
    const skeleton = document.querySelector('.aspect-square')
    expect(skeleton).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const customClass = 'custom-skeleton-class'
    render(<ImageLoadingSkeleton className={customClass} />)
    
    const container = document.querySelector('.relative')
    expect(container).toHaveClass(customClass)
  })
})