import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';

import { Pullquote } from './Pullquote.js';
import { Spacer } from './Spacer.js';
import { Gallery } from './Gallery.js';
import { Video } from './Video.js';
import { Columns, Column } from './Columns.js';
import { Button } from './Button.js';
import { Embed } from './Embed.js';
import { Html } from './Html.js';
import { Shortcode } from './Shortcode.js';
import { Preformatted } from './Preformatted.js';

export function getExtensions() {
	return [
		// StarterKit (Tiptap 3) includes: Document, Paragraph, Text, Heading, Bold, Italic,
		// Strike, Code, Blockquote, BulletList, OrderedList, ListItem, ListKeymap,
		// HardBreak, HorizontalRule, Link, Underline, UndoRedo (History), Dropcursor,
		// Gapcursor, TrailingNode
		StarterKit.configure({
			// Disable built-in codeBlock — replaced by Preformatted (plain <pre>)
			codeBlock: false
		}),

		// Image block
		Image.configure({ inline: false, allowBase64: false }),

		// Text alignment
		TextAlign.configure({ types: ['heading', 'paragraph'] }),

		// Color + TextStyle (for text color)
		Color,
		TextStyle,

		// Placeholder text
		Placeholder.configure({ placeholder: 'Start writing…' }),

		// Tables
		Table.configure({ resizable: false }),
		TableRow,
		TableHeader,
		TableCell,

		// Custom blocks
		Pullquote,
		Spacer,
		Gallery,
		Video,
		Column,
		Columns,
		Button,
		Embed,
		Html,
		Shortcode,
		Preformatted
	];
}
