import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';

import { MenuItem } from 'prosemirror-menu';
import { DOMParser, Node, ResolvedPos, Schema } from 'prosemirror-model';
import { DOMOutputSpec, MarkSpec, NodeSpec } from 'prosemirror-model';
import { addListNodes } from 'prosemirror-schema-list';
import { EditorState } from 'prosemirror-state';
import { findWrapping, liftTarget } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import {
  lift,
  joinUp,
  selectParentNode,
  wrapIn,
  setBlockType,
} from 'prosemirror-commands';

import { buildMenuItems, exampleSetup } from './basic';

ReactDOM.render(
  <React.StrictMode>
    <div id="editor"></div>
    <div id="content" style={{ display: 'none' }}>
      <h3>Hello ProseMirror</h3>

      <p>This is editable text. You can focus it and start typing.</p>

      <p>
        To apply styling, you can select a piece of text and manipulate its styling from
        the menu. The basic schema supports <em>emphasis</em>,{' '}
        <strong>strong text</strong>, <a href="http://marijnhaverbeke.nl/blog">links</a>,{' '}
        <code>code font</code>, and
        <img
          src="https://cdn.jsdelivr.net/gh/imaegoo/emotion/bilibili/0d15c7e2ee58e935adc6a7193ee042388adc22af.png"
          alt=""
        />
        images.
      </p>

      <p>
        Block-level structure can be manipulated with key bindings (try ctrl-shift-2 to
        create a level 2 heading, or enter in an empty textblock to exit the parent
        block), or through the menu.
      </p>

      <p>
        Try using the “list” item in the menu to wrap this paragraph in a numbered list.
      </p>
    </div>
  </React.StrictMode>,
  document.getElementById('root'),
);
// ======================================================== //
//                         Schema                           //
// ======================================================== //
const pDOM: DOMOutputSpec = ['p', 0];
const blockquoteDOM: DOMOutputSpec = ['blockquote', 0];
const hrDOM: DOMOutputSpec = ['hr'];
const preDOM: DOMOutputSpec = ['pre', ['code', 0]];
const brDOM: DOMOutputSpec = ['br'];
const emDOM: DOMOutputSpec = ['em', 0];
const strongDOM: DOMOutputSpec = ['strong', 0];
const codeDOM: DOMOutputSpec = ['code', 0];
const schema = new Schema({
  nodes: {
    /// NodeSpec The top level document node.
    doc: {
      content: 'block+',
    } as NodeSpec,

    /// A plain paragraph textblock. Represented in the DOM
    /// as a `<p>` element.
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM() {
        return pDOM;
      },
    } as NodeSpec,
    // 引用
    blockquote: {
      content: 'block+',
      group: 'block',
      defining: true,
      parseDOM: [{ tag: 'blockquote' }],
      toDOM() {
        return blockquoteDOM;
      },
    } as NodeSpec,
    // 分割线
    horizontal_rule: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM() {
        return hrDOM;
      },
    } as NodeSpec,
    // 标题
    heading: {
      attrs: { level: { default: 1 } },
      content: 'inline*',
      group: 'block',
      defining: true,
      parseDOM: [
        { tag: 'h1', attrs: { level: 1 } },
        { tag: 'h2', attrs: { level: 2 } },
        { tag: 'h3', attrs: { level: 3 } },
        { tag: 'h4', attrs: { level: 4 } },
        { tag: 'h5', attrs: { level: 5 } },
        { tag: 'h6', attrs: { level: 6 } },
      ],
      toDOM(node) {
        return ['h' + node.attrs.level, 0];
      },
    } as NodeSpec,
    // 行内代码
    code_block: {
      content: 'text*',
      marks: '',
      group: 'block',
      code: true,
      defining: true,
      parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
      toDOM() {
        return preDOM;
      },
    } as NodeSpec,

    /// The text node.
    text: {
      group: 'inline',
    } as NodeSpec,
    // 插入图片
    image: {
      inline: true,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null },
      },
      group: 'inline',
      draggable: true,
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs(dom: HTMLElement) {
            return {
              src: dom.getAttribute('src'),
              title: dom.getAttribute('title'),
              alt: dom.getAttribute('alt'),
            };
          },
        },
      ],
      toDOM(node) {
        const { src, alt, title } = node.attrs;
        return ['img', { src, alt, title }];
      },
    } as NodeSpec,

    /// A hard line break, represented in the DOM as `<br>`.
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM() {
        return brDOM;
      },
    } as NodeSpec,

    // 自定义图片
    dino: {
      attrs: { type: { default: 'default-pic' } },
      inline: true,
      group: 'inline',
      draggable: true,
      parseDOM: [
        {
          tag: 'img[dino-type]',
          getAttrs: (dom: Element) => {
            const type: string = dom.getAttribute('dino-type') || '';
            return ['default-pic'].indexOf(type) > -1 ? { type } : false;
          },
        },
      ],
      toDOM: (node: any) => [
        'img',
        {
          'dino-type': node.attrs.type,
          src: '/src/assets/test.jpg',
          title: node.attrs.type,
          class: `custom-schema-assign-pic`,
        },
      ],
    } as NodeSpec,

    // 高亮块
    highlightBlock: {
      attrs: { color: { default: 'cyan' } },
      content: 'block*',
      group: 'block',
      defining: true,
      draggable: true,
      parseDOM: [
        'div',
        {
          class: 'highlight-block-container',
        },
        0,
      ],

      toDOM: (node: any) => {
        return [
          'div',
          {
            class: 'highlight-block-container',
          },
          [
            'div',
            {
              class: 'highlight-block-emoji',
            },
          ],
          [
            'div',
            {
              class: 'highlight-block-content',
              'data-color': node.attrs.color,
            },
            0,
          ],
        ];
      },
    } as NodeSpec,
  },
  marks: {
    /// A link. Has `href` and `title` attributes. `title`
    /// defaults to the empty string. Rendered and parsed as an `<a>`
    /// element.
    link: {
      attrs: {
        href: {},
        title: { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs(dom: HTMLElement) {
            return { href: dom.getAttribute('href'), title: dom.getAttribute('title') };
          },
        },
      ],
      toDOM(node) {
        const { href, title } = node.attrs;
        return ['a', { href, title }, 0];
      },
    } as MarkSpec,

    /// An emphasis mark. Rendered as an `<em>` element. Has parse rules
    /// that also match `<i>` and `font-style: italic`.
    em: {
      parseDOM: [
        { tag: 'i' },
        { tag: 'em' },
        { style: 'font-style=italic' },
        { style: 'font-style=normal', clearMark: (m) => m.type.name == 'em' },
      ],
      toDOM() {
        return emDOM;
      },
    } as MarkSpec,

    /// A strong mark. Rendered as `<strong>`, parse rules also match
    /// `<b>` and `font-weight: bold`.
    strong: {
      parseDOM: [
        { tag: 'strong' },
        // This works around a Google Docs misbehavior where
        // pasted content will be inexplicably wrapped in `<b>`
        // tags with a font-weight normal.
        {
          tag: 'b',
          getAttrs: (node: HTMLElement) => node.style.fontWeight != 'normal' && null,
        },
        { style: 'font-weight=400', clearMark: (m) => m.type.name == 'strong' },
        {
          style: 'font-weight',
          getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
        },
      ],
      toDOM() {
        return strongDOM;
      },
    } as MarkSpec,

    /// Code font mark. Represented as a `<code>` element.
    code: {
      parseDOM: [{ tag: 'code' }],
      toDOM() {
        return codeDOM;
      },
    } as MarkSpec,
  },
});
// 最终Schema
const resultSchema = new Schema({
  // 监听list
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks,
});
// ======================================================== //
//                     注册Schema逻辑                        //
// ======================================================== //
// 工具栏
const menu: any = buildMenuItems(resultSchema);

// 【插入指定图片】
const insertAssignImg = (type: string) => {
  return (state: any, dispatch: any) => {
    const { $from } = state.selection;
    const index = $from.index();

    if (!$from.parent.canReplaceWith(index, index, resultSchema.nodes.dino)) return false;

    if (dispatch)
      dispatch(state.tr.replaceSelectionWith(resultSchema.nodes.dino.create({ type })));

    return true;
  };
};
// 【插入高亮块】
const insertHighlightBlock = (attrs: any) => {
  return (state: any, dispatch: any) => {
    const { $from, $to } = state.selection;
    const range = $from.blockRange($to);
    const wrapping =
      range && findWrapping(range, resultSchema.nodes.highlightBlock, attrs);

    if (!wrapping) {
      console.warn(
        '[highlight] set highlight block, but warpping is null...',
        range,
        wrapping,
      );
      return false;
    }
    const { depth: fromDepth, path: fromPath, pos: fromPos } = $from;
    const { depth: toDepth, path: toPath, pos: toPos } = $to;
    const fromExistHigh = fromPath.find((_: Node | number) =>
      typeof _ === 'number' ? false : _?.type?.name === 'highlightBlock',
    );
    const toExistHigh = toPath.find((_: Node | number) =>
      typeof _ === 'number' ? false : _?.type?.name === 'highlightBlock',
    );
    // console.group('[highlight] set info...');
    // console.log('state: ', state);
    // console.log('$from: ', $from);
    // console.log('$to: ', $to);
    // console.log($from.sameParent($to));
    // console.log('wrapping: ', wrapping);
    // console.groupEnd();

    if ($from.sameParent($to)) {
      // range 处于同一父级块
      if (fromExistHigh) {
        console.warn('[highlight] highlight block does not allow nesting...');
        return true;
      }
    } else if (fromExistHigh || toExistHigh) {
      // TODO:
      console.warn('[highlight] merge highlight blocks...');
      // dispatch(state.tr.join(fromPos, 1));
      return true;
    }
    if (dispatch) {
      dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
    }
    return true;
  };
};
// 触发逻辑
[
  new MenuItem({
    title: '插入指定图片',
    label: '插入指定图片',
    enable(state) {
      // @ts-ignore
      return insertAssignImg('default-pic')(state);
    },
    run: insertAssignImg('default-pic'),
  }),
  new MenuItem({
    title: '插入高亮块',
    label: '插入高亮块',
    enable(state) {
      // @ts-ignore
      // return insertHighlightBlock('highlightBlock')(state, null);
      return true;
    },
    run: insertHighlightBlock({
      color: 'yellow',
    }),
  }),
].forEach((_) => {
  menu.insertMenu.content.push(_);
});

// ======================================================== //
//                      初始化编辑器                        //
// ======================================================== //
// @ts-ignore
window.view = new EditorView(document.querySelector('#editor'), {
  state: EditorState.create({
    // @ts-ignore
    doc: DOMParser.fromSchema(resultSchema).parse(document.querySelector('#content')),
    plugins: exampleSetup({ schema: resultSchema, menuContent: menu.fullMenu }),
  }),
});

// @ts-ignore
// console.log('[view instance]: ', window.view);
