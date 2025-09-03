import { useEffect, useState } from 'react'
import type { AppError } from '../utils/error-handling'

interface ErrorDisplayProps {
	error?: AppError | string | null
	className?: string
	onDismiss?: () => void
}

export function ErrorDisplay({
	error,
	className = '',
	onDismiss,
}: ErrorDisplayProps) {
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		if (error) {
			setIsVisible(true)
			// Auto-hide after 10 seconds
			const timer = setTimeout(() => {
				setIsVisible(false)
				onDismiss?.()
			}, 10000)
			return () => clearTimeout(timer)
		} else {
			setIsVisible(false)
		}
	}, [error, onDismiss])

	if (!error || !isVisible) return null

	// Convert string errors to AppError format
	const appError: AppError =
		typeof error === 'string' ? { type: 'unknown', message: error } : error

	function handleDismiss() {
		setIsVisible(false)
		onDismiss?.()
	}

	return (
		<div
			className={`bg-destructive/10 border-destructive/20 mb-4 rounded-lg border p-4 ${className}`}
		>
			<div className="flex items-start gap-3">
				<div className="flex-shrink-0">
					<svg
						className="text-destructive h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="text-destructive text-sm font-medium">
						{appError.message}
					</h3>
					{appError.details ? (
						<p className="text-muted-foreground mt-1 text-sm">
							{appError.details}
						</p>
					) : null}
					{appError.code ? (
						<p className="text-muted-foreground mt-1 font-mono text-xs">
							Error code: {appError.code}
						</p>
					) : null}
				</div>
				<button
					onClick={handleDismiss}
					className="text-destructive/60 hover:text-destructive flex-shrink-0 p-1 transition-colors"
				>
					<svg
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>
	)
}
