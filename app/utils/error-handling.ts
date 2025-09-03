import { z } from 'zod'

// Error types for better categorization
export type AppError = {
	type: 'validation' | 'database' | 'network' | 'unknown'
	message: string
	details?: string
	code?: string
}

// Helper to create descriptive error messages
export function createError(
	type: AppError['type'],
	message: string,
	details?: string,
	code?: string,
): AppError {
	return { type, message, details, code }
}

// Helper to log errors to console with context
export function logError(error: AppError, context?: string) {
	const timestamp = new Date().toISOString()
	const contextPrefix = context ? `[${context}] ` : ''

	console.error(`${contextPrefix}Error at ${timestamp}:`, {
		type: error.type,
		message: error.message,
		details: error.details,
		code: error.code,
	})
}

// Helper to handle Zod validation errors
export function handleZodError(error: z.ZodError, context?: string): AppError {
	const issues = error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join(', ')

	const appError = createError(
		'validation',
		'Invalid data provided',
		issues,
		'VALIDATION_ERROR',
	)

	logError(appError, context)
	return appError
}

// Helper to handle database errors
export function handleDatabaseError(
	error: unknown,
	context?: string,
): AppError {
	let appError: AppError

	if (error instanceof Error) {
		appError = createError(
			'database',
			'Database operation failed',
			error.message,
			error.name,
		)
	} else {
		appError = createError(
			'database',
			'Database operation failed',
			'Unknown database error',
			'DB_ERROR',
		)
	}

	logError(appError, context)
	return appError
}

// Helper to handle network/request errors
export function handleNetworkError(error: unknown, context?: string): AppError {
	let appError: AppError

	if (error instanceof Error) {
		appError = createError(
			'network',
			'Network request failed',
			error.message,
			error.name,
		)
	} else {
		appError = createError(
			'network',
			'Network request failed',
			'Unknown network error',
			'NETWORK_ERROR',
		)
	}

	logError(appError, context)
	return appError
}

// Helper to handle unknown errors
export function handleUnknownError(error: unknown, context?: string): AppError {
	let appError: AppError

	if (error instanceof Error) {
		appError = createError(
			'unknown',
			'An unexpected error occurred',
			error.message,
			error.name,
		)
	} else {
		appError = createError(
			'unknown',
			'An unexpected error occurred',
			'Unknown error type',
			'UNKNOWN_ERROR',
		)
	}

	logError(appError, context)
	return appError
}

// Helper to get user-friendly error messages
export function getUserFriendlyMessage(error: AppError): string {
	switch (error.type) {
		case 'validation':
			return error.details || 'Please check your input and try again.'
		case 'database':
			return 'Something went wrong with the database. Please try again.'
		case 'network':
			return 'Network connection issue. Please check your internet and try again.'
		case 'unknown':
		default:
			return 'Something went wrong. Please try again.'
	}
}
