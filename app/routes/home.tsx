import { Link } from 'react-router'
import type { Route } from './+types/home'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Kids Ledger - Track Your Kids Expenses' },
		{ name: 'description', content: 'Simple and secure expense tracking for your kids. No login required, just create a ledger and start managing their accounts.' },
	]
}

export function loader({ context }: Route.LoaderArgs) {
	return { message: 'Welcome to Kids Ledger' }
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				{/* Hero Section */}
				<div className="text-center mb-12">
					{/* Logo */}
					<div className="mb-8">
						<div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-6">
							<span className="text-4xl">💰</span>
						</div>
						<h1 className="text-h1 font-bold text-foreground mb-4">
							Kids Ledger
						</h1>
						<p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
							Simple expense tracking for your kids. No login required, just create a ledger and start managing their accounts with ease.
						</p>
					</div>

					{/* CTA Button */}
					<Link
						to="/create-ledger"
						className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-4 px-8 rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-body-lg"
					>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
						Create Your First Ledger
					</Link>
				</div>

				{/* Features Section */}
				<div className="grid md:grid-cols-3 gap-8 mb-12">
					<div className="text-center">
						<div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">👨‍👩‍👧‍👦</span>
						</div>
						<h3 className="text-h4 font-semibold text-foreground mb-2">Family Focused</h3>
						<p className="text-muted-foreground">
							Track expenses for multiple kids with personalized emoji avatars and individual accounts.
						</p>
					</div>

					<div className="text-center">
						<div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">🔒</span>
						</div>
						<h3 className="text-h4 font-semibold text-foreground mb-2">Simple & Secure</h3>
						<p className="text-muted-foreground">
							No accounts to create. Just generate a unique ledger ID and start tracking immediately.
						</p>
					</div>

					<div className="text-center">
						<div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">📱</span>
						</div>
						<h3 className="text-h4 font-semibold text-foreground mb-2">Mobile Friendly</h3>
						<p className="text-muted-foreground">
							Optimized for mobile devices with intuitive drag-and-drop reordering and easy balance updates.
						</p>
					</div>
				</div>

				{/* How It Works */}
				<div className="bg-card rounded-lg p-8 border border-border">
					<h2 className="text-h3 font-bold text-foreground mb-6 text-center">How It Works</h2>
					<div className="grid md:grid-cols-3 gap-6">
						<div className="flex items-start gap-4">
							<div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
								1
							</div>
							<div>
								<h4 className="font-semibold text-foreground mb-1">Create a Ledger</h4>
								<p className="text-muted-foreground text-sm">
									Start by creating a new ledger with a name that makes sense for your family.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-4">
							<div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
								2
							</div>
							<div>
								<h4 className="font-semibold text-foreground mb-1">Add Your Kids</h4>
								<p className="text-muted-foreground text-sm">
									Add each child with their name and a fun emoji avatar to personalize their profile.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-4">
							<div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
								3
							</div>
							<div>
								<h4 className="font-semibold text-foreground mb-1">Track Expenses</h4>
								<p className="text-muted-foreground text-sm">
									Create accounts for different expense categories and easily update balances as needed.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
