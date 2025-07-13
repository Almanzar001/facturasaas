'use client'

export default function TestPage() {
  console.log('TEST PAGE LOADED - This should appear in console')
  
  return (
    <div>
      <h1>Test Page</h1>
      <button onClick={() => console.log('Button clicked!')}>
        Click me - should log to console
      </button>
    </div>
  )
}