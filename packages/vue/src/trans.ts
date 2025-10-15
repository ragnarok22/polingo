import {
  Fragment,
  computed,
  createTextVNode,
  defineComponent,
  h,
  isVNode,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue';
import type { InterpolationValues } from './context';
import { useTranslation } from './composables';

type ComponentRenderer = (children: VNodeChild[]) => VNodeChild;
type ComponentValue = VNodeChild | Component | ComponentRenderer;
type ComponentsProp = ComponentValue[] | Record<string, ComponentValue>;

interface TextNode {
  type: 'text';
  value: string;
}

interface TagNode {
  type: 'tag';
  name: string;
  children: NodeTree[];
}

type NodeTree = TextNode | TagNode;

export interface TransProps {
  message: string;
  context?: string;
  values?: InterpolationValues;
  plural?: string;
  count?: number;
  components?: ComponentsProp;
  fallback?: string;
}

function parseNodes(input: string, start = 0, stopTag?: string): [NodeTree[], number] {
  const nodes: NodeTree[] = [];
  let cursor = start;
  let buffer = '';

  const flushBuffer = (): void => {
    if (buffer.length > 0) {
      nodes.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  while (cursor < input.length) {
    const char = input[cursor];

    if (char === '<') {
      const closeIndex = input.indexOf('>', cursor + 1);
      if (closeIndex === -1) {
        break;
      }

      const rawTag = input.slice(cursor + 1, closeIndex).trim();
      if (!rawTag) {
        buffer += input.slice(cursor, closeIndex + 1);
        cursor = closeIndex + 1;
        continue;
      }

      if (rawTag.startsWith('/')) {
        const tagName = rawTag.slice(1).trim();
        if (stopTag && tagName === stopTag) {
          flushBuffer();
          return [nodes, closeIndex + 1];
        }

        buffer += input.slice(cursor, closeIndex + 1);
        cursor = closeIndex + 1;
        continue;
      }

      flushBuffer();

      const selfClosing = rawTag.endsWith('/');
      const tagName = (selfClosing ? rawTag.slice(0, -1) : rawTag).trim();

      if (!tagName) {
        cursor = closeIndex + 1;
        continue;
      }

      cursor = closeIndex + 1;

      if (selfClosing) {
        nodes.push({ type: 'tag', name: tagName, children: [] });
        continue;
      }

      const [children, nextIndex] = parseNodes(input, cursor, tagName);
      nodes.push({ type: 'tag', name: tagName, children });
      cursor = nextIndex;
      continue;
    }

    buffer += char;
    cursor += 1;
  }

  if (buffer.length > 0) {
    nodes.push({ type: 'text', value: buffer });
  }

  return [nodes, cursor];
}

function getComponent(name: string, components?: ComponentsProp): ComponentValue | undefined {
  if (!components) {
    return undefined;
  }

  if (Array.isArray(components)) {
    const index = Number(name);
    if (!Number.isNaN(index) && index in components) {
      return components[index];
    }
    return undefined;
  }

  return components[name];
}

function wrapWithKey(node: VNodeChild | VNodeChild[], key: string): VNodeChild {
  return h(Fragment, { key }, Array.isArray(node) ? node : [node]);
}

function isComponent(value: ComponentValue): value is Component {
  if (isVNode(value) || Array.isArray(value)) {
    return false;
  }
  if (typeof value === 'function') {
    return false;
  }
  return typeof value === 'object' && value !== null;
}

function materializeComponent(
  component: ComponentValue,
  children: VNodeChild[],
  key: string
): VNodeChild {
  if (typeof component === 'function') {
    const rendered = (component as ComponentRenderer)(children);
    return wrapWithKey(rendered, key);
  }

  if (isVNode(component)) {
    const baseChildren =
      children.length === 0
        ? (component.children ?? [])
        : children.map((child) =>
            typeof child === 'string' || typeof child === 'number' ? createTextVNode(child) : child
          );

    return h(
      component.type as Component,
      {
        ...(component.props ?? {}),
        key,
      },
      Array.isArray(baseChildren) && baseChildren.length === 1 ? baseChildren[0] : baseChildren
    );
  }

  if (isComponent(component)) {
    return h(component, { key }, children);
  }

  if (children.length === 0) {
    return wrapWithKey(component, key);
  }

  return wrapWithKey([component, ...children], key);
}

function renderNodeTree(
  nodes: NodeTree[],
  components?: ComponentsProp,
  keyPrefix = 'p'
): VNodeChild[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    if (node.type === 'text') {
      return node.value;
    }

    const component = getComponent(node.name, components);
    const children = renderNodeTree(node.children, components, key);

    if (!component) {
      if (children.length === 1) {
        return wrapWithKey(children[0], key);
      }
      return wrapWithKey(children, key);
    }

    return materializeComponent(component, children, key);
  });
}

export const Trans = defineComponent({
  name: 'PolingoTrans',
  props: {
    message: {
      type: String,
      required: true,
    },
    context: {
      type: String,
      required: false,
    },
    values: {
      type: Object as PropType<InterpolationValues>,
      required: false,
    },
    plural: {
      type: String,
      required: false,
    },
    count: {
      type: Number,
      required: false,
    },
    components: {
      type: [Array, Object] as PropType<ComponentsProp>,
      required: false,
    },
    fallback: {
      type: String,
      required: false,
    },
  },
  setup(props) {
    const { t, tp, tn, tnp } = useTranslation();

    const translated = computed(() => {
      if (typeof props.count === 'number' && props.plural) {
        if (props.context) {
          return tnp(props.context, props.message, props.plural, props.count, props.values);
        }
        return tn(props.message, props.plural, props.count, props.values);
      }

      if (props.context) {
        return tp(props.context, props.message, props.values);
      }

      return t(props.message, props.values);
    });

    const output = computed<VNodeChild | VNodeChild[]>(() => {
      const source = translated.value ?? props.fallback ?? props.message;

      if (!props.components) {
        return source;
      }

      const [tree] = parseNodes(source);
      return renderNodeTree(tree, props.components);
    });

    return () => output.value;
  },
});
