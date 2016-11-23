/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Plugin from '../core/plugin.js';
import buildModelConverter from '../engine/conversion/buildmodelconverter.js';
import buildViewConverter from '../engine/conversion/buildviewconverter.js';
import Paragraph from '../paragraph/paragraph.js';
import HeadingCommand from './headingcommand.js';

const formats = [
	{ id: 'paragraph', viewElement: 'p', label: 'Paragraph' },
	{ id: 'heading1', viewElement: 'h2', label: 'Heading 1' },
	{ id: 'heading2', viewElement: 'h3', label: 'Heading 2' },
	{ id: 'heading3', viewElement: 'h4', label: 'Heading 3' }
];

/**
 * The headings engine feature. It handles switching between block formats &ndash; headings and paragraph.
 * This class represents the engine part of the heading feature. See also {@link heading.Heading}.
 *
 * @memberOf heading
 * @extends core.Feature
 */
export default class HeadingEngine extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ Paragraph ];
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const data = editor.data;
		const editing = editor.editing;

		for ( let format of formats ) {
			// Skip paragraph - it is defined in required Paragraph feature.
			if ( format.id !== 'paragraph' ) {
				// Schema.
				editor.document.schema.registerItem( format.id, '$block' );

				// Build converter from model to view for data and editing pipelines.
				buildModelConverter().for( data.modelToView, editing.modelToView )
					.fromElement( format.id )
					.toElement( format.viewElement );

				// Build converter from view to model for data pipeline.
				buildViewConverter().for( data.viewToModel )
					.fromElement( format.viewElement )
					.toElement( format.id );
			}
		}

		// Register the heading command.
		const command = new HeadingCommand( editor, formats );
		editor.commands.set( 'heading', command );

		// If the enter command is added to the editor, alter its behavior.
		// Enter at the end of a heading element should create a paragraph.
		const enterCommand = editor.commands.get( 'enter' );

		if ( enterCommand ) {
			this.listenTo( enterCommand, 'afterExecute', ( evt, data ) => {
				const positionParent = editor.document.selection.getFirstPosition().parent;
				const batch = data.batch;
				const isHeading = formats.some( ( format ) => format.id == positionParent.name );

				if ( isHeading && positionParent.name != command.defaultFormat.id && positionParent.childCount === 0 ) {
					batch.rename( positionParent, command.defaultFormat.id );
				}
			} );
		}
	}
}
