import { type Handle } from 'remix/component'
import { Counter } from '#client/counter.tsx'
import {
	colors,
	radius,
	shadows,
	spacing,
	typography,
} from '#client/styles/tokens.ts'

export function HomeRoute(_handle: Handle) {
	return () => (
		<section
			css={{
				display: 'grid',
				gap: spacing.lg,
				justifyItems: 'center',
				textAlign: 'center',
			}}
		>
			<div
				css={{
					display: 'grid',
					gap: spacing.lg,
					padding: spacing.lg,
					borderRadius: radius.lg,
					border: `1px solid ${colors.border}`,
					background: `linear-gradient(135deg, ${colors.primarySoftStrong}, ${colors.primarySoftest})`,
					boxShadow: shadows.sm,
					maxWidth: '36rem',
					width: '100%',
				}}
			>
				<div
					css={{
						display: 'grid',
						gap: spacing.md,
						justifyItems: 'center',
					}}
				>
					<img
						src="/logo.png"
						alt="Kids Ledger logo"
						width={1024}
						height={1024}
						css={{
							width: '220px',
							maxWidth: '100%',
							height: 'auto',
							aspectRatio: '1 / 1',
						}}
					/>
					<div css={{ display: 'grid', gap: spacing.sm }}>
						<h1
							css={{
								fontSize: typography.fontSize['2xl'],
								fontWeight: typography.fontWeight.semibold,
								margin: 0,
								color: colors.text,
							}}
						>
							Kids Ledger
						</h1>
						<p css={{ margin: 0, color: colors.textMuted }}>
							Built with Remix 3 components on the client, backed by Remix 3
							routing in the worker.
						</p>
					</div>
				</div>
			</div>
			<Counter setup={{ initial: 1 }} />
		</section>
	)
}
