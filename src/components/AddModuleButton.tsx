'use client'

export default function AddModuleButton({ courseId }: { courseId: string }) {
  return (
    <button
      className="btn btn-primary btn-sm"
      onClick={() => document.dispatchEvent(new CustomEvent('add-module', { detail: courseId }))}
    >
      + Add module
    </button>
  )
}
