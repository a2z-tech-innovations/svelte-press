<script lang="ts">
	// GalleryLightbox — frontend-only lightbox for gallery blocks.
	// Gallery blocks render as HTML strings (via renderBlock), so this component
	// uses event delegation on the document to detect clicks on gallery images.
	// Each gallery image in the rendered HTML carries:
	//   data-sp-gallery-id="<block-id>"
	//   data-sp-gallery-index="<number>"
	// The component receives all gallery blocks so it can build per-gallery image lists.

	interface GalleryImage {
		src: string;
		alt?: string;
		caption?: string;
	}

	interface GalleryBlock {
		id: string;
		attrs: {
			images?: GalleryImage[];
			[key: string]: unknown;
		};
	}

	let { galleries }: { galleries: GalleryBlock[] } = $props();

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);
	let activeGalleryId = $state<string | null>(null);

	let activeImages: GalleryImage[] = $derived(
		activeGalleryId
			? ((galleries.find((g) => g.id === activeGalleryId)?.attrs.images ?? []) as GalleryImage[])
			: []
	);

	let currentImage = $derived(activeImages[lightboxIndex] ?? null);
	let total = $derived(activeImages.length);

	function openLightbox(galleryId: string, index: number) {
		activeGalleryId = galleryId;
		lightboxIndex = index;
		lightboxOpen = true;
	}

	function closeLightbox() {
		lightboxOpen = false;
	}

	function prev() {
		if (total === 0) return;
		lightboxIndex = (lightboxIndex - 1 + total) % total;
	}

	function next() {
		if (total === 0) return;
		lightboxIndex = (lightboxIndex + 1) % total;
	}

	function handleDocumentClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		// Walk up to find the gallery image button
		const btn = target.closest('[data-sp-gallery-id]') as HTMLElement | null;
		if (!btn) return;
		const galleryId = btn.getAttribute('data-sp-gallery-id');
		const indexStr = btn.getAttribute('data-sp-gallery-index');
		if (!galleryId || indexStr === null) return;
		e.preventDefault();
		openLightbox(galleryId, Number(indexStr));
	}

	function handleOverlayClick(e: MouseEvent) {
		// Close only if clicking the dark backdrop (not the image or controls)
		if (e.target === e.currentTarget) closeLightbox();
	}
</script>

<!-- Event delegation: catch all gallery image clicks on the page -->
<svelte:document onclick={handleDocumentClick} />

<svelte:window
	onkeydown={(e) => {
		if (!lightboxOpen) return;
		if (e.key === 'Escape') closeLightbox();
		if (e.key === 'ArrowLeft') prev();
		if (e.key === 'ArrowRight') next();
	}}
/>

{#if lightboxOpen && currentImage}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="sp-lightbox-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Image lightbox"
		onclick={handleOverlayClick}
	>
		<!-- Counter -->
		{#if total > 1}
			<div class="sp-lightbox-counter" aria-live="polite">
				{lightboxIndex + 1} / {total}
			</div>
		{/if}

		<!-- Close button -->
		<button
			type="button"
			class="sp-lightbox-close"
			aria-label="Close lightbox"
			onclick={closeLightbox}
		>
			&times;
		</button>

		<!-- Prev button -->
		{#if total > 1}
			<button
				type="button"
				class="sp-lightbox-prev"
				aria-label="Previous image"
				onclick={(e) => { e.stopPropagation(); prev(); }}
			>
				&#8249;
			</button>
		{/if}

		<!-- Image -->
		<figure class="sp-lightbox-figure">
			<img
				src={currentImage.src}
				alt={currentImage.alt ?? ''}
				class="sp-lightbox-img"
			/>
			{#if currentImage.caption}
				<figcaption class="sp-lightbox-caption">{currentImage.caption}</figcaption>
			{/if}
		</figure>

		<!-- Next button -->
		{#if total > 1}
			<button
				type="button"
				class="sp-lightbox-next"
				aria-label="Next image"
				onclick={(e) => { e.stopPropagation(); next(); }}
			>
				&#8250;
			</button>
		{/if}
	</div>
{/if}
