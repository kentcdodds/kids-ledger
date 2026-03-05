const confettiColors = [
	'#f43f5e',
	'#f59e0b',
	'#10b981',
	'#3b82f6',
	'#8b5cf6',
	'#ec4899',
]

const confettiShapes = ['circle', 'square']

export function launchConfetti() {
	if (typeof window === 'undefined' || typeof document === 'undefined') return
	const container = document.createElement('div')
	container.setAttribute('aria-hidden', 'true')
	container.style.position = 'fixed'
	container.style.inset = '0'
	container.style.pointerEvents = 'none'
	container.style.overflow = 'hidden'
	container.style.zIndex = '2000'

	document.body.append(container)

	const particleCount = 540
	for (let index = 0; index < particleCount; index += 1) {
		const particle = document.createElement('span')
		const color =
			confettiColors[Math.floor(Math.random() * confettiColors.length)] ||
			'#f43f5e'
		const shape =
			confettiShapes[Math.floor(Math.random() * confettiShapes.length)] ||
			'square'
		const size = 6 + Math.random() * 6
		const startX = Math.random() * window.innerWidth
		const drift = (Math.random() - 0.5) * 280
		const fallDistance = window.innerHeight + 120 + Math.random() * 220
		const rotation = (Math.random() - 0.5) * 1080

		particle.style.position = 'fixed'
		particle.style.left = `${startX}px`
		particle.style.top = '-24px'
		particle.style.width = `${size}px`
		particle.style.height = `${size * 1.2}px`
		particle.style.backgroundColor = color
		particle.style.opacity = '1'
		particle.style.borderRadius = shape === 'circle' ? '999px' : '2px'
		particle.style.willChange = 'transform, opacity'

		container.append(particle)
		const animation = particle.animate(
			[
				{ transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
				{
					transform: `translate(${drift}px, ${fallDistance}px) rotate(${rotation}deg)`,
					opacity: 0,
				},
			],
			{
				duration: 1800 + Math.random() * 1400,
				delay: Math.random() * 1000,
				easing: 'cubic-bezier(0.2, 0.2, 0.8, 0.8)',
				fill: 'forwards',
			},
		)

		animation.addEventListener('finish', () => {
			particle.remove()
		})
	}

	window.setTimeout(() => {
		container.remove()
	}, 3500)
}
