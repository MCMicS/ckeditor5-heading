/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ModelTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/modeltesteditor';
import HeadingCommand from '../src/headingcommand';
import Range from '@ckeditor/ckeditor5-engine/src/model/range';
import { setData, getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

const formats = [
	{ id: 'paragraph', element: 'p', default: true },
	{ id: 'heading1', element: 'h2' },
	{ id: 'heading2', element: 'h3' },
	{ id: 'heading3', element: 'h4' }
];

describe( 'HeadingCommand', () => {
	let editor, document, command, root, schema;

	beforeEach( () => {
		return ModelTestEditor.create( {
			heading: {
				defaultFormatId: 'paragraph'
			}
		} )
		.then( newEditor => {
			editor = newEditor;
			document = editor.document;
			command = new HeadingCommand( editor, formats );
			schema = document.schema;

			for ( let format of formats ) {
				schema.registerItem( format.id, '$block' );
			}

			root = document.getRoot();
		} );
	} );

	afterEach( () => {
		command.destroy();
	} );

	describe( 'value', () => {
		for ( let format of formats ) {
			test( format );
		}

		function test( format ) {
			it( `equals ${ format.id } when collapsed selection is placed inside ${ format.id } element`, () => {
				setData( document, `<${ format.id }>foobar</${ format.id }>` );
				const element = root.getChild( 0 );
				document.selection.addRange( Range.createFromParentsAndOffsets( element, 3, element, 3 ) );

				expect( command.value ).to.equal( format );
			} );
		}

		it( 'should be equal to defaultFormat if format has not been found', () => {
			schema.registerItem( 'div', '$block' );
			setData( document, '<div>xyz</div>' );
			const element = root.getChild( 0 );
			document.selection.addRange( Range.createFromParentsAndOffsets( element, 1, element, 1 ) );

			expect( command.value ).to.equal( command.defaultFormat );
		} );
	} );

	describe( '_doExecute', () => {
		it( 'should update value after execution', () => {
			setData( document, '<paragraph>[]</paragraph>' );
			command._doExecute( { formatId: 'heading1' } );

			expect( getData( document ) ).to.equal( '<heading1>[]</heading1>' );
			expect( command.value ).to.be.object;
			expect( command.value.id ).to.equal( 'heading1' );
			expect( command.value.element ).to.equal( 'h2' );
		} );

		describe( 'custom options', () => {
			it( 'should use provided batch', () => {
				const batch = editor.document.batch();
				setData( document, '<paragraph>foo[]bar</paragraph>' );

				expect( batch.deltas.length ).to.equal( 0 );

				command._doExecute( { batch } );

				expect( batch.deltas.length ).to.be.above( 0 );
			} );
		} );

		describe( 'collapsed selection', () => {
			let convertTo = formats[ formats.length - 1 ];

			for ( let format of formats ) {
				test( format, convertTo );
				convertTo = format;
			}

			it( 'uses paragraph as default value', () => {
				setData( document, '<heading1>foo[]bar</heading1>' );
				command._doExecute();

				expect( getData( document ) ).to.equal( '<paragraph>foo[]bar</paragraph>' );
			} );

			it( 'converts to default format when executed with already applied format', () => {
				setData( document, '<heading1>foo[]bar</heading1>' );
				command._doExecute( { formatId: 'heading1' } );

				expect( getData( document ) ).to.equal( '<paragraph>foo[]bar</paragraph>' );
			} );

			it( 'converts topmost blocks', () => {
				schema.registerItem( 'inlineImage', '$inline' );
				schema.allow( { name: '$text', inside: 'inlineImage' } );

				setData( document, '<heading1><inlineImage>foo[]</inlineImage>bar</heading1>' );
				command._doExecute( { formatId: 'heading1' } );

				expect( getData( document ) ).to.equal( '<paragraph><inlineImage>foo[]</inlineImage>bar</paragraph>' );
			} );

			function test( from, to ) {
				it( `converts ${ from.id } to ${ to.id } on collapsed selection`, () => {
					setData( document, `<${ from.id }>foo[]bar</${ from.id }>` );
					command._doExecute( { formatId: to.id } );

					expect( getData( document ) ).to.equal( `<${ to.id }>foo[]bar</${ to.id }>` );
				} );
			}
		} );

		describe( 'non-collapsed selection', () => {
			let convertTo = formats[ formats.length - 1 ];

			for ( let format of formats ) {
				test( format, convertTo );
				convertTo = format;
			}

			it( 'converts all elements where selection is applied', () => {
				setData( document, '<heading1>foo[</heading1><heading2>bar</heading2><heading2>]baz</heading2>' );
				command._doExecute( { formatId: 'paragraph' } );

				expect( getData( document ) ).to.equal(
					'<paragraph>foo[</paragraph><paragraph>bar</paragraph><paragraph>]baz</paragraph>'
				);
			} );

			it( 'resets to default value all elements with same format', () => {
				setData( document, '<heading1>foo[</heading1><heading1>bar</heading1><heading2>baz</heading2>]' );
				command._doExecute( { formatId: 'heading1' } );

				expect( getData( document ) ).to.equal(
					'<paragraph>foo[</paragraph><paragraph>bar</paragraph><heading2>baz</heading2>]'
				);
			} );

			function test( from, to ) {
				it( `converts ${ from.id } to ${ to.id } on non-collapsed selection`, () => {
					setData( document, `<${ from.id }>foo[bar</${ from.id }><${ from.id }>baz]qux</${ from.id }>` );
					command._doExecute( { formatId: to.id } );

					expect( getData( document ) ).to.equal( `<${ to.id }>foo[bar</${ to.id }><${ to.id }>baz]qux</${ to.id }>` );
				} );
			}
		} );
	} );
} );
