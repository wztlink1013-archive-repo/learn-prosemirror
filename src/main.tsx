import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';

import { MenuItem } from 'prosemirror-menu';
import { DOMParser, Schema } from 'prosemirror-model';
import { DOMOutputSpec, MarkSpec, NodeSpec } from 'prosemirror-model';
import { addListNodes } from 'prosemirror-schema-list';
import { EditorState } from 'prosemirror-state';
import { findWrapping } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';

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
      content: 'block+',
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

      toDOM: (node: any) => [
        'div',
        {
          class: 'highlight-block-container',
        },
        0,
      ],
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
  // debugger;
  return (state: any, dispatch: any) => {
    const { $from } = state.selection;
    const index = $from.index();

    if (!$from.parent.canReplaceWith(index, index, resultSchema.nodes.dino)) return false;

    if (dispatch) {
      console.groupCollapsed('run insert assign img');
      console.log('type: ', type);
      console.log('state: ', state);
      console.log('selection info: ', $from, index);
      console.log('tr: ', state.tr);
      // debugger;
      dispatch(state.tr.replaceSelectionWith(resultSchema.nodes.dino.create({ type })));
    }
    console.groupEnd();
    return true;
  };
};
menu.insertMenu.content.push(
  new MenuItem({
    title: '插入指定图片',
    label: 'insert assign image',
    enable(state) {
      // @ts-ignore
      return insertAssignImg('default-pic')(state);
    },
    run: insertAssignImg('default-pic'),
  }),
);
// 【插入高亮块】
const insertHighlightBlock = (data: any) => {
  return (state: any, dispatch: any) => {
    const { $from, $to } = state.selection;
    const range = $from.blockRange($to);
    const wrapping =
      range && findWrapping(range, resultSchema.nodes.highlightBlock, null);

    // NOTE: 缺少检查父级
    // if (!$from.parent.canReplaceWith(index, index, resultSchema.nodes.highlightBlock))
    //   return false;
    if (!wrapping) {
      console.groupCollapsed('run insert highlight block...');
      console.warn(
        'run highlight, but warpping is null: ',
        wrapping,
        state,
        state.tr,
        data,
      );
      return false;
    }
    if (dispatch) {
      dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
    }
    console.groupEnd();
    return true;
  };
};
menu.insertMenu.content.push(
  new MenuItem({
    title: '插入高亮块',
    label: 'insert highlight block',
    enable(state) {
      // @ts-ignore
      // console.log(this);
      // return insertHighlightBlock('highlightBlock')(state, null);
      return true;
    },
    run: insertHighlightBlock('highlightBlock'),
  }),
);
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
console.log('[view instance]: ', window.view);
