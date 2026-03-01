import { SvelteNodeViewRenderer } from '../SvelteNodeViewRenderer.svelte.js';
import { Spacer } from './Spacer.js';
import { Gallery } from './Gallery.js';
import { Video } from './Video.js';
import { Embed } from './Embed.js';
import { Html } from './Html.js';
import { Shortcode } from './Shortcode.js';
import { Button } from './Button.js';
import SpacerNodeView from '../../components/editor/node-views/SpacerNodeView.svelte';
import GalleryNodeView from '../../components/editor/node-views/GalleryNodeView.svelte';
import VideoNodeView from '../../components/editor/node-views/VideoNodeView.svelte';
import EmbedNodeView from '../../components/editor/node-views/EmbedNodeView.svelte';
import HtmlNodeView from '../../components/editor/node-views/HtmlNodeView.svelte';
import ShortcodeNodeView from '../../components/editor/node-views/ShortcodeNodeView.svelte';
import ButtonNodeView from '../../components/editor/node-views/ButtonNodeView.svelte';

/**
 * Returns extension overrides that add Svelte node views.
 * Import this ONLY in browser context (TiptapEditor.svelte).
 * Tests and SSR use getExtensions() from index.ts without node views.
 */
export const SpacerWithView = Spacer.extend({
	addNodeView() { return SvelteNodeViewRenderer(SpacerNodeView); }
});

export const GalleryWithView = Gallery.extend({
	addNodeView() { return SvelteNodeViewRenderer(GalleryNodeView); }
});

export const VideoWithView = Video.extend({
	addNodeView() { return SvelteNodeViewRenderer(VideoNodeView); }
});

export const EmbedWithView = Embed.extend({
	addNodeView() { return SvelteNodeViewRenderer(EmbedNodeView); }
});

export const HtmlWithView = Html.extend({
	addNodeView() { return SvelteNodeViewRenderer(HtmlNodeView); }
});

export const ShortcodeWithView = Shortcode.extend({
	addNodeView() { return SvelteNodeViewRenderer(ShortcodeNodeView); }
});

export const ButtonWithView = Button.extend({
	addNodeView() { return SvelteNodeViewRenderer(ButtonNodeView); }
});
