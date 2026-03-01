<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { Node } from '@tiptap/pm/model';

	let {
		editor,
		getPos,
		node
	}: {
		editor: Editor;
		getPos: () => number | undefined;
		node: Node;
	} = $props();

	function moveNode(direction: 'up' | 'down') {
		const pos = getPos();
		if (pos === undefined) return;
		const { tr, doc } = editor.state;
		const n = doc.nodeAt(pos);
		if (!n) return;
		const nodeSize = n.nodeSize;
		const resolvedPos = doc.resolve(pos);
		const parent = resolvedPos.parent;
		const indexInParent = resolvedPos.index();

		if (direction === 'up') {
			if (indexInParent === 0) return;
			const prevNode = parent.child(indexInParent - 1);
			const prevPos = pos - prevNode.nodeSize;
			const newTr = tr
				.replaceWith(prevPos, prevPos + prevNode.nodeSize, n)
				.replaceWith(prevPos + nodeSize, prevPos + nodeSize + n.nodeSize, prevNode);
			editor.view.dispatch(newTr);
		} else {
			if (indexInParent >= parent.childCount - 1) return;
			const nextNode = parent.child(indexInParent + 1);
			const nextPos = pos + nodeSize;
			const newTr = tr
				.replaceWith(nextPos, nextPos + nextNode.nodeSize, n)
				.replaceWith(pos, pos + nodeSize, nextNode);
			editor.view.dispatch(newTr);
		}
	}

	function duplicate() {
		const pos = getPos();
		if (pos === undefined) return;
		const n = editor.state.doc.nodeAt(pos);
		if (!n) return;
		const insertPos = pos + n.nodeSize;
		editor.view.dispatch(editor.state.tr.insert(insertPos, n));
	}

	function deleteBlock() {
		const pos = getPos();
		if (pos === undefined) return;
		const n = editor.state.doc.nodeAt(pos);
		if (!n) return;
		editor.view.dispatch(editor.state.tr.delete(pos, pos + n.nodeSize));
	}
</script>

<div class="sp-block-controls" contenteditable="false">
	<button type="button" class="sp-block-ctrl-btn" title="Move up" onclick={() => moveNode('up')}>
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 10V2M2 6l4-4 4 4"/></svg>
	</button>
	<button type="button" class="sp-block-ctrl-btn" title="Move down" onclick={() => moveNode('down')}>
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2v8m-4-4l4 4 4-4"/></svg>
	</button>
	<button type="button" class="sp-block-ctrl-btn" title="Duplicate" onclick={duplicate}>
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="7" height="7" rx="1"/><path d="M4 1h7a1 1 0 011 1v7"/></svg>
	</button>
	<button type="button" class="sp-block-ctrl-btn sp-block-ctrl-delete" title="Delete block" onclick={deleteBlock}>
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 3h10M4 3V2h4v1M5 5v4M7 5v4M2 3l1 7h6l1-7"/></svg>
	</button>
</div>

<style>
	.sp-block-controls {
		position: absolute;
		top: 4px;
		right: 4px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		background: #fff;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 3px;
		box-shadow: 0 1px 4px rgba(0,0,0,0.1);
		z-index: 10;
	}

	.sp-block-ctrl-btn {
		width: 24px;
		height: 24px;
		border: none;
		background: transparent;
		color: var(--sp-text-muted, #646970);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		padding: 0;
	}

	.sp-block-ctrl-btn:hover {
		background: var(--sp-content-bg, #f0f0f1);
		color: var(--sp-text, #1d2327);
	}

	.sp-block-ctrl-delete:hover {
		background: #fceaea;
		color: var(--sp-error, #d63638);
	}
</style>
