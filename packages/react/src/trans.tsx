import type { ReactNode } from 'react';
import { Fragment, cloneElement, isValidElement, useMemo } from 'react';
import type { InterpolationValues } from './context';
import { useTranslation } from './hooks';

type ComponentRenderer = (children: ReactNode[]) => ReactNode;
type ComponentValue = ReactNode | ComponentRenderer;
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

      // Closing tag
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

      const [children, newIndex] = parseNodes(input, cursor, tagName);
      nodes.push({ type: 'tag', name: tagName, children });
      cursor = newIndex;
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

function wrapWithKey(node: ReactNode, key: string): ReactNode {
  return <Fragment key={key}>{node}</Fragment>;
}

function materializeComponent(
  component: ComponentValue,
  children: ReactNode[],
  key: string
): ReactNode {
  if (typeof component === 'function') {
    const rendered = component(children);
    return wrapWithKey(rendered, key);
  }

  if (isValidElement(component)) {
    return cloneElement(component, { key }, children.length > 0 ? children : component.props.children);
  }

  if (children.length === 0) {
    return wrapWithKey(component, key);
  }

  return wrapWithKey(
    <Fragment>
      {component}
      {children}
    </Fragment>,
    key
  );
}

function renderNodeTree(
  nodes: NodeTree[],
  components?: ComponentsProp,
  keyPrefix = 'p'
): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    if (node.type === 'text') {
      return node.value;
    }

    const component = getComponent(node.name, components);
    const children = renderNodeTree(node.children, components, key);

    if (!component) {
      return wrapWithKey(children.length === 1 ? children[0] : <Fragment>{children}</Fragment>, key);
    }

    return materializeComponent(component, children, key);
  });
}

export function Trans({
  message,
  context,
  values,
  plural,
  count,
  components,
  fallback,
}: TransProps): JSX.Element {
  const { t, tp, tn, tnp } = useTranslation();

  const translated = useMemo(() => {
    if (typeof count === 'number' && plural) {
      if (context) {
        return tnp(context, message, plural, count, values);
      }
      return tn(message, plural, count, values);
    }

    if (context) {
      return tp(context, message, values);
    }

    return t(message, values);
  }, [context, count, message, plural, tn, tnp, t, tp, values]);

  const output = useMemo(() => {
    const source = translated ?? fallback ?? message;

    if (!components) {
      return source;
    }

    const [tree] = parseNodes(source);
    return renderNodeTree(tree, components);
  }, [components, fallback, message, translated]);

  return <>{output}</>;
}
