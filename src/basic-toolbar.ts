import { toggleMark } from 'prosemirror-commands';
import {
  blockTypeItem,
  Dropdown,
  DropdownSubmenu,
  icons,
  joinUpItem,
  liftItem,
  MenuItem,
  redoItem,
  selectParentNodeItem,
  undoItem,
  wrapItem,
} from 'prosemirror-menu';
import { Attrs, DOMParser, NodeType, Schema } from 'prosemirror-model';
import { wrapInList } from 'prosemirror-schema-list';
import { NodeSelection } from 'prosemirror-state';
import { EditorState } from 'prosemirror-state';

import { openPrompt, TextField } from './basic-prompt';

// Helpers to create specific types of items

function canInsert(state: EditorState, nodeType: NodeType) {
  const $from = state.selection.$from;
  for (let d = $from.depth; d >= 0; d--) {
    const index = $from.index(d);
    if ($from.node(d).canReplaceWith(index, index, nodeType)) return true;
  }
  return false;
}

function insertImageItem(nodeType: NodeType) {
  return new MenuItem({
    title: 'Insert image',
    label: 'Image',
    enable(state) {
      return canInsert(state, nodeType);
    },
    run(state, _, view) {
      let { from, to } = state.selection,
        attrs = null;
      if (
        state.selection instanceof NodeSelection &&
        state.selection.node.type == nodeType
      )
        attrs = state.selection.node.attrs;
      openPrompt({
        title: 'Insert image',
        fields: {
          src: new TextField({
            label: 'Location',
            required: true,
            value: attrs && attrs.src,
          }),
          title: new TextField({ label: 'Title', value: attrs && attrs.title }),
          alt: new TextField({
            label: 'Description',
            value: attrs ? attrs.alt : state.doc.textBetween(from, to, ' '),
          }),
        },
        callback(attrs: Attrs | null | undefined) {
          view.dispatch(
            view.state.tr.replaceSelectionWith(nodeType.createAndFill(attrs) as any),
          );
          view.focus();
        },
      });
    },
  });
}

function cmdItem(cmd: any, options: any) {
  const passedOptions = {
    label: options.title,
    run: cmd,
  };
  // @ts-ignore
  for (const prop in options) passedOptions[prop] = options[prop];
  if ((!options.enable || options.enable === true) && !options.select)
    // @ts-ignore
    passedOptions[options.enable ? 'enable' : 'select'] = (state: EditorState) =>
      cmd(state);

  return new MenuItem(passedOptions);
}

function markActive(state: EditorState, type: any) {
  const { from, $from, to, empty } = state.selection;
  if (empty) return type.isInSet(state.storedMarks || $from.marks());
  else return state.doc.rangeHasMark(from, to, type);
}

function markItem(markType: any, options: any) {
  const passedOptions = {
    active(state: EditorState) {
      return markActive(state, markType);
    },
    enable: true,
  };
  // @ts-ignore
  for (const prop in options) passedOptions[prop] = options[prop];
  return cmdItem(toggleMark(markType), passedOptions);
}

function linkItem(markType: any) {
  return new MenuItem({
    title: 'Add or remove link',
    icon: icons.link,
    active(state) {
      return markActive(state, markType);
    },
    enable(state) {
      return !state.selection.empty;
    },
    run(state, dispatch, view) {
      if (markActive(state, markType)) {
        toggleMark(markType)(state, dispatch);
        return true;
      }
      openPrompt({
        title: 'Create a link',
        fields: {
          href: new TextField({
            label: 'Link target',
            required: true,
          }),
          title: new TextField({ label: 'Title' }),
        },
        callback(attrs: any) {
          toggleMark(markType, attrs)(view.state, view.dispatch);
          view.focus();
        },
      });
    },
  });
}

function wrapListItem(nodeType: NodeType, options: any) {
  return cmdItem(wrapInList(nodeType, options.attrs), options);
}
const cut = (arr: any) => arr.filter((x: any) => x);
export function buildMenuItems(schema: Schema) {
  const { nodes, marks } = schema;
  const { strong, em, code, link } = marks;
  const {
    image,
    bullet_list,
    ordered_list,
    blockquote,
    paragraph,
    code_block,
    heading,
    horizontal_rule,
  } = nodes;
  const r: {
    toggleStrong: MenuItem;
    toggleEm: MenuItem;
    toggleCode: MenuItem;
    toggleLink: MenuItem;
    insertImage: MenuItem;
    wrapBulletList: MenuItem;
    wrapOrderedList: MenuItem;
    wrapBlockQuote: MenuItem;
    makeParagraph: MenuItem;
    makeCodeBlock: MenuItem;
    insertHorizontalRule: MenuItem;
    makeHead1: MenuItem;
    makeHead2: MenuItem;
    makeHead3: MenuItem;
    makeHead4: MenuItem;
    makeHead5: MenuItem;
    makeHead6: MenuItem;
    insertMenu: Dropdown;
    typeMenu: Dropdown;
    inlineMenu: any[];
    blockMenu: any[];
    fullMenu: any[];
  } = {
    toggleStrong: markItem(strong, { title: '加粗', icon: icons.strong }),
    toggleEm: markItem(em, { title: '斜体', icon: icons.em }),
    toggleCode: markItem(code, { title: '行内代码', icon: icons.code }),
    toggleLink: linkItem(link),
    insertImage: insertImageItem(image),
    wrapBulletList: wrapListItem(bullet_list, {
      title: 'Wrap in bullet list',
      icon: icons.bulletList,
    }),
    wrapOrderedList: wrapListItem(ordered_list, {
      title: 'Wrap in ordered list',
      icon: icons.orderedList,
    }),
    wrapBlockQuote: wrapItem(blockquote, {
      title: '引用',
      icon: icons.blockquote,
    }),
    makeParagraph: blockTypeItem(paragraph, {
      title: 'Change to paragraph',
      label: 'Plain',
    }),
    makeCodeBlock: blockTypeItem(code_block, {
      title: 'Change to code block',
      label: 'Code',
    }),
    insertHorizontalRule: new MenuItem({
      title: 'Insert horizontal rule',
      label: 'Horizontal rule',
      enable(state) {
        return canInsert(state, horizontal_rule);
      },
      run(state, dispatch) {
        dispatch(state.tr.replaceSelectionWith(horizontal_rule.create()));
      },
    }),
    makeHead1: blockTypeItem(heading, {
      title: 'Change to heading 1',
      label: 'Level 1',
      attrs: { level: 1 },
    }),
    makeHead2: blockTypeItem(heading, {
      title: 'Change to heading 2',
      label: 'Level 2',
      attrs: { level: 2 },
    }),
    makeHead3: blockTypeItem(heading, {
      title: 'Change to heading 3',
      label: 'Level 3',
      attrs: { level: 3 },
    }),
    makeHead4: blockTypeItem(heading, {
      title: 'Change to heading 4',
      label: 'Level 4',
      attrs: { level: 4 },
    }),
    makeHead5: blockTypeItem(heading, {
      title: 'Change to heading 5',
      label: 'Level 5',
      attrs: { level: 5 },
    }),
    makeHead6: blockTypeItem(heading, {
      title: 'Change to heading 6',
      label: 'Level 6',
      attrs: { level: 6 },
    }),
    // @ts-ignore
    insertMenu: new Dropdown(),
    // @ts-ignore
    typeMenu: new Dropdown(),
    inlineMenu: [],
    blockMenu: [],
    fullMenu: [],
  };
  r.inlineMenu = [cut([r.toggleStrong, r.toggleEm, r.toggleCode, r.toggleLink])];

  r.insertMenu = new Dropdown(cut([r.insertImage, r.insertHorizontalRule]), {
    label: 'Insert',
  });

  r.typeMenu = new Dropdown(
    cut([
      r.makeParagraph,
      r.makeCodeBlock,
      r.makeHead1 &&
        new DropdownSubmenu(
          cut([
            r.makeHead1,
            r.makeHead2,
            r.makeHead3,
            r.makeHead4,
            r.makeHead5,
            r.makeHead6,
          ]),
          { label: 'Heading' },
        ),
    ]),
    { label: 'Type...' },
  );

  r.blockMenu = [
    cut([
      r.wrapBulletList,
      r.wrapOrderedList,
      r.wrapBlockQuote,
      joinUpItem,
      liftItem,
      selectParentNodeItem,
    ]),
  ];

  r.fullMenu = r.inlineMenu.concat(
    [[r.insertMenu, r.typeMenu]],
    [[undoItem, redoItem]],
    r.blockMenu,
  );

  return r;
}
