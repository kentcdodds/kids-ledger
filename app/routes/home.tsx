import { Link } from 'react-router'
import type { Route } from './+types/home'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Kids Ledger - Track Your Kids Account Balances' },
		{
			name: 'description',
			content:
				'Simple and secure balance tracking for your kids. No login required, just create a ledger and start managing their accounts.',
		},
	]
}

export function loader({ context }: Route.LoaderArgs) {
	return { message: 'Welcome to Kids Ledger' }
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<div className="bg-background min-h-screen">
			<div className="container mx-auto px-4 py-8">
				{/* Hero Section */}
				<div className="mb-12 text-center">
					{/* Logo */}
					<div className="mb-8">
						<div className="bg-primary/10 mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full">
							<span className="text-4xl">💰</span>
						</div>
						<h1 className="text-h1 text-foreground mb-4 font-bold">
							Kids Ledger
						</h1>
						<p className="text-body-lg text-muted-foreground mx-auto max-w-2xl">
							Simple balance tracking for your kids. No login required, just
							create a ledger and start managing their accounts with ease.
						</p>
					</div>

					{/* CTA Button */}
					<Link
						to="/create-ledger"
						className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring text-body-lg inline-flex items-center gap-2 rounded-lg px-8 py-4 font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						<svg
							className="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
						Create Your First Ledger
					</Link>
				</div>

				{/* Features Section */}
				<div className="mb-12 grid gap-8 md:grid-cols-3">
					<div className="text-center">
						<div className="bg-accent/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
							<span className="text-2xl">👨‍👩‍👧‍👦</span>
						</div>
						<h3 className="text-h4 text-foreground mb-2 font-semibold">
							Family Focused
						</h3>
						<p className="text-muted-foreground">
							Track account balances for multiple kids with personalized emoji
							avatars and individual accounts.
						</p>
					</div>

					<div className="text-center">
						<div className="bg-accent/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
							<span className="text-2xl">🔒</span>
						</div>
						<h3 className="text-h4 text-foreground mb-2 font-semibold">
							Simple & Secure
						</h3>
						<p className="text-muted-foreground">
							No accounts to create. Just generate a unique ledger ID and start
							tracking immediately.
						</p>
					</div>

					<div className="text-center">
						<div className="bg-accent/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
							<span className="text-2xl">📱</span>
						</div>
						<h3 className="text-h4 text-foreground mb-2 font-semibold">
							Mobile Friendly
						</h3>
						<p className="text-muted-foreground">
							Optimized for mobile devices with intuitive drag-and-drop
							reordering and easy balance updates.
						</p>
					</div>
				</div>

				{/* How It Works */}
				<div className="bg-card border-border rounded-lg border p-8">
					<h2 className="text-h3 text-foreground mb-6 text-center font-bold">
						How It Works
					</h2>
					<div className="grid gap-6 md:grid-cols-3">
						<div className="flex items-start gap-4">
							<div className="bg-primary text-primary-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold">
								1
							</div>
							<div>
								<h4 className="text-foreground mb-1 font-semibold">
									Create a Ledger
								</h4>
								<p className="text-muted-foreground text-sm">
									Start by creating a new ledger with a name that makes sense
									for your family.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-4">
							<div className="bg-primary text-primary-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold">
								2
							</div>
							<div>
								<h4 className="text-foreground mb-1 font-semibold">
									Add Your Kids
								</h4>
								<p className="text-muted-foreground text-sm">
									Add each child with their name and a fun emoji avatar to
									personalize their profile.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-4">
							<div className="bg-primary text-primary-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold">
								3
							</div>
							<div>
								<h4 className="text-foreground mb-1 font-semibold">
									Track Balances
								</h4>
								<p className="text-muted-foreground text-sm">
									Create accounts for different categories and easily update
									balances as needed.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Important Notice */}
				<div className="bg-muted/50 border-border mt-8 rounded-lg border p-4">
					<div className="text-center">
						<h3 className="text-h5 text-foreground mb-2 font-semibold">
							Important Notice
						</h3>
						<p className="text-muted-foreground text-sm">
							This app has no privacy policy or terms of service. Data could
							disappear at any time without warning. Please backup your data
							regularly.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
