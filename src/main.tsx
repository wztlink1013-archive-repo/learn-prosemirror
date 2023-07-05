import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';

import { MenuItem } from 'prosemirror-menu';
import {
  DOMParser,
  Node,
  ResolvedPos,
  Schema,
  Fragment,
  NodeType,
} from 'prosemirror-model';
import { DOMOutputSpec, MarkSpec, NodeSpec } from 'prosemirror-model';
import { addListNodes } from 'prosemirror-schema-list';
import { EditorState, NodeSelection, Transaction } from 'prosemirror-state';
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
import { getRandomId } from './utils';
import { wordCountPlugin } from './plugin-word-count';

declare global {
  interface Window {
    view: EditorView;
  }
}

ReactDOM.render(
  <React.StrictMode>
    <div id="editor"></div>
    <div id="content" style={{ display: 'none' }}>
      <h2>Hello ProseMirror</h2>

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
      <h4>This Heading 4</h4>
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
    doc: {
      content: '(block | highlightBlock)+',
    } as NodeSpec,
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
      attrs: { level: { default: 1 }, id: { default: getRandomId() } },
      content: 'inline*',
      group: 'block',
      defining: true,
      parseDOM: [
        {
          tag: 'h1',
          getAttrs(dom: HTMLElement) {
            return {
              level: 1,
              id: dom.getAttribute('id') || getRandomId(),
            };
          },
        },
        {
          tag: 'h2',
          getAttrs(dom: HTMLElement) {
            return {
              level: 2,
              id: dom.getAttribute('id') || getRandomId(),
            };
          },
        },
        {
          tag: 'h3',
          getAttrs(dom: HTMLElement) {
            return {
              level: 3,
              id: dom.getAttribute('id') || getRandomId(),
            };
          },
        },
        {
          tag: 'h4',
          getAttrs(dom: HTMLElement) {
            return {
              level: 4,
              id: dom.getAttribute('id') || getRandomId(),
            };
          },
        },
        {
          tag: 'h5',
          getAttrs(dom: HTMLElement) {
            return {
              level: 5,
              id: dom.getAttribute('id') || getRandomId(),
            };
          },
        },
        {
          tag: 'h6',
          getAttrs(dom: HTMLElement) {
            return {
              level: 6,
              id: dom.getAttribute('id') || getRandomId(),
            };
          },
        },
      ],
      toDOM(node) {
        return [
          `h${node.attrs.level}`,
          {
            id: node.attrs.id,
          },
          0,
        ];
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
      toDOM: (node: any) => {
        return [
          'img',
          {
            'dino-type': node.attrs.type,
            src: '/src/assets/test.jpg',
            title: node.attrs.type,
            class: `custom-schema-assign-pic`,
          },
        ];
      },
    } as NodeSpec,
    // 高亮块
    highlightBlock: {
      attrs: {
        backgroundColor: { default: '#fff7e6' },
        borderColor: { default: '#ffdfa3' },
      },
      content: 'block*',
      // group: 'doc', // 不设置保证是doc的一代子节点
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
        const { attrs } = node;
        const { backgroundColor, borderColor } = attrs;
        return [
          'div',
          {
            class: 'highlight-block-container',
            'data-background-color': backgroundColor,
            'data-border-color': borderColor,
            style: `background-color: ${backgroundColor}; border-color: ${borderColor}`,
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
            },
            0,
          ],
        ];
      },
    } as NodeSpec,
  },
  marks: {
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
    strong: {
      parseDOM: [
        { tag: 'strong' },
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
    code: {
      parseDOM: [{ tag: 'code' }],
      toDOM() {
        return codeDOM;
      },
    } as MarkSpec,
  },
});
const resultSchema = new Schema({
  // 监听list
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks,
});
// ======================================================== //
//                    注册Schema逻辑                        //
// ======================================================== //

// 插入指定图片
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

// 插入高亮块
const setHighlightBlock = (attrs?: any) => {
  return (state: any, dispatch: any) => {
    const { selection } = state;
    const { $from, $to } = selection;

    const range = $from.blockRange($to);
    if (!range) return false;

    const wrapping = findWrapping(range, resultSchema.nodes.highlightBlock, attrs);
    if (!wrapping) return false;

    if (dispatch) dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
    return true;
  };
};

// 工具栏: 触发逻辑
const menu: any = buildMenuItems(resultSchema);
[
  new MenuItem({
    label: '插入指定图片',
    enable(state) {
      // @ts-ignore
      return insertAssignImg('default-pic')(state);
    },
    run: insertAssignImg('default-pic'),
  }),
  new MenuItem({
    label: '插入高亮块',
    run: setHighlightBlock(),
  }),
].forEach((_) => {
  menu.insertMenu.content.push(_);
});

// ======================================================== //
//                      初始化编辑器                        //
// ======================================================== //
// 更新目录视图
const updateToc = (doc: any) => {
  const gradeType: number[] = [];
  const headingMatches: any[] = doc.content.content
    .filter((_: Node) => {
      const { textContent, type } = _;
      const { name } = type;
      return name === 'heading' && textContent;
    })
    .map((_: Node) => {
      const { textContent, attrs } = _;
      const { level, id } = attrs;
      if (!gradeType.includes(level)) gradeType.push(level);
      return {
        textContent,
        level,
        id,
      };
    });
  console.log('doc content change...', gradeType, headingMatches);
};
// 初始化编辑器
const view: EditorView = new EditorView(document.querySelector('#editor'), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(resultSchema).parse(
      document.querySelector('#content') as Element,
    ),
    plugins: [
      ...exampleSetup({ schema: resultSchema, menuContent: menu.fullMenu }),
      wordCountPlugin({ limit: 550, mode: 'textSize' }),
    ],
  }),
  // dispatchTransaction(transaction: Transaction) {
  //   const { state, transactions } = view.state.applyTransaction(transaction);

  //   view.updateState(state);

  //   if (transactions.some((tr) => tr.docChanged)) {
  //     const { doc } = state;
  //     updateToc(doc);
  //   }

  //   // console.warn('_____________', view.composing);
  //   // const newState = view.state.apply(transaction);
  //   // view.updateState(newState);
  // },
});

window.view = view;
