import {
  type EditorState,
  type EditorStateConfig,
  Plugin,
  PluginKey,
  type Transaction,
} from 'prosemirror-state';
import { type Node } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { createElement } from './utils';
// @ts-ignore
import { isEqual } from 'lodash';

export interface TocOptions {
  // The maximum number of characters that should be allowed. Defaults to `0`.
  limit: number | null | undefined;
  // The mode by which the size is calculated. Defaults to 'textSize'.
  mode: 'textSize' | 'nodeSize';
}
interface HeadingData {
  gradeType: number[];
  headingMatches: Object[];
}

class Toc {
  readonly options: TocOptions;
  renderList: any;
  tocContainer: HTMLElement;
  tocBody: HTMLElement;

  constructor(options: TocOptions) {
    console.log('[plugin] toc options: ', options);
    this.options = options;
    this.renderList = {};
    this.tocContainer = createElement('div', 'yl-toc-container');
    this.tocBody = createElement('div', 'yl-toc-body');
    this.tocContainer.appendChild(this.tocBody);
  }

  updateToc(doc: any): HeadingData {
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
    return { gradeType, headingMatches };
  }

  rederToc(data: any) {
    this.tocBody.innerHTML = '';
    const { gradeType, headingMatches } = data;

    gradeType.sort();
    // console.log('===============', headingMatches, this.renderList);
    headingMatches.forEach((item: any, index: number) => {
      // console.log('-----', this.renderList);
      // heading 属性
      const { textContent, level, id } = item;

      // 折叠
      const collapseAbility = !(
        index === headingMatches.length - 1 ||
        (headingMatches[index + 1] && level >= headingMatches[index + 1].level)
      );
      // 缩进层级
      const indentGrade = gradeType.indexOf(level) + 1;
      const resultData = { textContent, level, id, collapseAbility, indentGrade };

      if (this.renderList[id]) {
        const isSame = isEqual(this.renderList[id], resultData);
        if (isSame) {
          // 不需任何改变
        } else {
          // 删除 || 修改
          console.log(
            '-------------exist----------------',
            isEqual(this.renderList[id], resultData),
          );
        }
      } else {
        // 新增
      }

      this.renderList[`${id}`] = resultData;

      // [DOM] item
      const itemDom = createElement('div', [
        'yl-toc-item',
        `yl-toc-indent-${indentGrade}`,
      ]);
      itemDom.dataset.id = id;
      itemDom.dataset.level = level;
      itemDom.dataset.collapseAbility = String(collapseAbility);
      // [DOM] 折叠展开
      const collapseSvgDom = createElement(
        'span',
        'item-collapse-svg',
        collapseAbility ? '>' : '',
      );
      // [DOM] 标题内容
      const textDom = createElement('span', 'item-text-content', textContent);
      [collapseSvgDom, textDom].forEach((_) => itemDom.appendChild(_));
      // [DOM] 初始化item事件
      this.initItemEvent(itemDom, collapseSvgDom, textDom);
      this.tocBody.appendChild(itemDom);
    });

    // console.log('[toc] render data: ', this.tocContainer);
    return this.tocContainer;
  }

  private initItemEvent(item: Element, collapseSvgDom: Element, textDom: Element) {
    // @ts-ignore
    const { id, level, collapseAbility } = item.dataset;
    if (collapseAbility === 'true')
      collapseSvgDom.addEventListener('click', () => {
        console.log('[toc] click collapse svg...');
      });
    textDom.addEventListener('click', () => {
      console.log('[toc] click toc item content: ', id, level);
      // TODO: 1. 指定h标签滚动到顶部 2. h标签需要一个高亮显示隐藏动画
    });
  }
}

export const TocPlugin = (options: TocOptions) => {
  const plugin = new Toc(options);

  return new Plugin({
    key: new PluginKey('toc'),
    state: {
      init(config: EditorStateConfig, instance: EditorState) {
        return plugin.updateToc(instance.doc);
      },
      apply(tr, prev) {
        const node = tr.doc;
        return { ...prev, ...plugin.updateToc(node) };
      },
    },
    props: {
      decorations(editorState) {
        return DecorationSet.create(editorState.doc, [
          Decoration.widget(editorState.doc.content.size, () =>
            plugin.rederToc(this.getState(editorState)),
          ),
        ]);
      },
    },
  });
};
