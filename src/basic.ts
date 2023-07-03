import { baseKeymap } from 'prosemirror-commands';
import {
  chainCommands,
  exitCode,
  joinDown,
  joinUp,
  lift,
  selectParentNode,
  setBlockType,
  toggleMark,
  wrapIn,
} from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { history } from 'prosemirror-history';
import { redo, undo } from 'prosemirror-history';
import {
  ellipsis,
  emDash,
  inputRules,
  smartQuotes,
  textblockTypeInputRule,
  wrappingInputRule,
} from 'prosemirror-inputrules';
import { undoInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import { menuBar } from 'prosemirror-menu';
import { DOMParser, NodeType, Schema } from 'prosemirror-model';
import {
  liftListItem,
  sinkListItem,
  splitListItem,
  wrapInList,
} from 'prosemirror-schema-list';
import { Plugin } from 'prosemirror-state';

// @ts-ignore
import { buildMenuItems } from './basic-toolbar';

export { buildInputRules, buildKeymap, buildMenuItems };
// 绑定输入特定键
const buildInputRules = (schema: Schema) => {
  const blockQuoteRule = (nodeType: NodeType) => {
    return wrappingInputRule(/^\s*>\s$/, nodeType);
  };

  const orderedListRule = (nodeType: NodeType) => {
    return wrappingInputRule(
      /^(\d+)\.\s$/,
      nodeType,
      (match) => ({ order: +match[1] }),
      (match, node) => node.childCount + node.attrs.order == +match[1],
    );
  };

  const bulletListRule = (nodeType: NodeType) => {
    return wrappingInputRule(/^\s*([-+*])\s$/, nodeType);
  };

  const codeBlockRule = (nodeType: NodeType) => {
    return textblockTypeInputRule(/^```$/, nodeType);
  };

  const headingRule = (nodeType: NodeType, maxLevel: number) => {
    return textblockTypeInputRule(
      new RegExp('^(#{1,' + maxLevel + '})\\s$'),
      nodeType,
      (match) => ({ level: match[1].length }),
    );
  };
  const rules = smartQuotes.concat(ellipsis, emDash);
  const { blockquote, ordered_list, bullet_list, code_block, heading } = schema.nodes;

  rules.push(blockQuoteRule(blockquote));
  rules.push(orderedListRule(ordered_list));
  rules.push(bulletListRule(bullet_list));
  rules.push(codeBlockRule(code_block));
  rules.push(headingRule(heading, 6));

  return inputRules({ rules });
};
// 绑定快捷键
const mac = typeof navigator != 'undefined' ? /Mac/.test(navigator.platform) : false;
const buildKeymap = (schema: Schema, mapKeys: any) => {
  let keys: any = {},
    type;
  function bind(key: string, cmd: any) {
    if (mapKeys) {
      const mapped = mapKeys[key];
      if (mapped === false) return;
      if (mapped) key = mapped;
    }
    keys[key] = cmd;
  }

  bind('Mod-z', undo);
  bind('Shift-Mod-z', redo);
  bind('Backspace', undoInputRule);
  if (!mac) bind('Mod-y', redo);

  bind('Alt-ArrowUp', joinUp);
  bind('Alt-ArrowDown', joinDown);
  bind('Mod-BracketLeft', lift);
  bind('Escape', selectParentNode);

  if ((type = schema.marks.strong)) {
    bind('Mod-b', toggleMark(type));
    bind('Mod-B', toggleMark(type));
  }
  if ((type = schema.marks.em)) {
    bind('Mod-i', toggleMark(type));
    bind('Mod-I', toggleMark(type));
  }
  if ((type = schema.marks.code)) bind('Mod-`', toggleMark(type));

  if ((type = schema.nodes.bullet_list)) bind('Shift-Ctrl-8', wrapInList(type));
  if ((type = schema.nodes.ordered_list)) bind('Shift-Ctrl-9', wrapInList(type));
  if ((type = schema.nodes.blockquote)) bind('Ctrl->', wrapIn(type));
  if ((type = schema.nodes.hard_break)) {
    const br = type,
      cmd = chainCommands(exitCode, (state, dispatch) => {
        if (dispatch)
          dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView());
        return true;
      });
    bind('Mod-Enter', cmd);
    bind('Shift-Enter', cmd);
    if (mac) bind('Ctrl-Enter', cmd);
  }
  if ((type = schema.nodes.list_item)) {
    bind('Enter', splitListItem(type));
    bind('Mod-[', liftListItem(type));
    bind('Mod-]', sinkListItem(type));
  }
  if ((type = schema.nodes.paragraph)) bind('Shift-Ctrl-0', setBlockType(type));
  if ((type = schema.nodes.code_block)) bind('Shift-Ctrl-\\', setBlockType(type));
  if ((type = schema.nodes.heading))
    for (let i = 1; i <= 6; i++)
      bind('Shift-Ctrl-' + i, setBlockType(type, { level: i }));
  if ((type = schema.nodes.horizontal_rule)) {
    const hr = type;
    bind('Mod-_', (state: any, dispatch: any) => {
      dispatch(state.tr.replaceSelectionWith(hr.create()).scrollIntoView());
      return true;
    });
  }

  return keys;
};

export function exampleSetup(options: {
  schema: Schema;
  menuContent?: any;
  mapKeys?: any;
}) {
  return [
    buildInputRules(options.schema),
    keymap(buildKeymap(options.schema, options.mapKeys)),
    keymap(baseKeymap),
    dropCursor(),
    gapCursor(),
    menuBar({
      floating: true, // 悬浮
      content: options.menuContent || buildMenuItems(options.schema).fullMenu,
    }),
    history(),
  ].concat(
    new Plugin({
      props: {
        attributes: { class: 'ProseMirror-example-setup-style' },
      },
    }),
  );
}
