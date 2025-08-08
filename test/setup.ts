import '@testing-library/jest-dom'

// Set up environment variables for testing
// Use real API key if available, otherwise use test key
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'AIzaSyA09zz-JJnRE7SSXjTWpJ9hHc0KdhUyyso'
}