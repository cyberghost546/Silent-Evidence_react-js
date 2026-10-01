// ---------------------------------------------------------------
// Runs before every test file (see `test.setupFiles` in vite.config.js).
//
// 1. jest-dom adds readable checks like
//      expect(button).toBeDisabled()
//      expect(screen.getByText('Hi')).toBeInTheDocument()
// 2. cleanup() removes what a test rendered, so the next test starts
//    with an empty page.
// ---------------------------------------------------------------
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
    cleanup()
})
