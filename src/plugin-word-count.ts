import {
  type EditorState,
  type EditorStateConfig,
  Plugin,
  PluginKey,
  type Transaction,
} from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';

export interface WordCountOptions {
  // The maximum number of characters that should be allowed. Defaults to `0`.
  limit: number | null | undefined;
  // The mode by which the size is calculated. Defaults to 'textSize'.
  mode: 'textSize' | 'nodeSize';
}

class WordCount {
  readonly options: WordCountOptions;

  constructor(options: WordCountOptions) {
    this.options = options;
  }

  calcStorage(node: Node) {
    return {
      characters: this.characters(node),
      words: this.words(node),
    };
  }

  filterTransactionByLimit(transaction: Transaction, state: EditorState) {
    const { limit }: { limit: any } = this.options;

    const oldSize = this.characters(state.doc);
    const newSize = this.characters(transaction.doc);

    // Everything is in the limit. Good.
    if (newSize <= limit) {
      return true;
    }

    // The limit has already been exceeded but will be reduced.
    if (oldSize > limit && newSize > limit && newSize <= oldSize) {
      return true;
    }

    // The limit has already been exceeded and will be increased further.
    if (oldSize > limit && newSize > limit && newSize > oldSize) {
      return false;
    }

    const isPaste = transaction.getMeta('paste');

    // Block all exceeding transactions that were not pasted.
    if (!isPaste) {
      return false;
    }

    // For pasted content, we try to remove the exceeding content.
    const pos = transaction.selection.$head.pos;
    const over = newSize - limit;
    const from = pos - over;
    const to = pos;

    // It’s probably a bad idea to mutate transactions within `filterTransaction`
    // but for now this is working fine.
    transaction.deleteRange(from, to);

    // In some situations, the limit will continue to be exceeded after trimming.
    // This happens e.g. when truncating within a complex node (e.g. table)
    // and ProseMirror has to close this node again.
    // If this is the case, we prevent the transaction completely.
    const updatedSize = this.characters(transaction.doc);

    return updatedSize <= limit;
  }

  private characters(node: Node) {
    const mode = this.options.mode;

    if (mode === 'textSize') {
      const text = node.textBetween(0, node.content.size, undefined, ' ');

      return text.length;
    }

    return node.nodeSize;
  }

  private words(node: Node) {
    const text: string = node.textBetween(0, node.content.size, ' ', ' ');
    const words = text.split(' ').filter((word) => word !== '');

    return words.length;
  }
}

export const wordCountPlugin = (options: WordCountOptions) => {
  console.log('[plugin] word count options: ', options);
  const plugin = new WordCount(options);

  return new Plugin({
    key: new PluginKey('wordCount'),
    filterTransaction: (transaction, state) => {
      const { limit } = plugin.options;
      // Nothing has changed or no limit is defined. Ignore it.
      console.warn('----------filterTransaction', !transaction.docChanged || !limit);
      if (!transaction.docChanged || !limit) return true;

      return plugin.filterTransactionByLimit(transaction, state);
    },
    state: {
      /**
       * 插件初始化
       * @returns {Object}
       */
      init(config: EditorStateConfig, instance: EditorState) {
        console.log('----------init', config, instance);
        return plugin.calcStorage(instance.doc);
      },

      /**
       * 编辑器状态改变 (filterTransaction 被应用)
       * @param {Transaction} tr
       * @param {Object} prev
       * @returns {Object}
       */
      apply(tr, prev) {
        console.log('----------apply', tr, prev);
        const node = tr.doc;
        return { ...prev, ...plugin.calcStorage(node) };
      },
    },
    props: {
      /**
       * 初始化 / 状态变化 建立装饰器
       * @param {EditorState} editorState
       * @returns {?DecorationSet}
       */
      decorations(editorState) {
        console.log('____________decorations', editorState);
        return DecorationSet.create(editorState.doc, [
          Decoration.widget(editorState.doc.content.size, () => {
            // @ts-ignore
            const { characters } = this.getState(editorState);
            const widgetNode = document.createElement('div');
            // adding customized class for client customizing the style of widget content
            widgetNode.classList.add('counter-widget');
            widgetNode.appendChild(
              document.createTextNode(`${characters}/${plugin.options.limit} Characters`),
            );

            return widgetNode;
          }),
        ]);
      },
    },
  });
};
