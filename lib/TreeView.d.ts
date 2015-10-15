declare class TreeView {
  treeRoot: HTMLOListElement;
  selectedNodes: HTMLLIElement[];

  constructor(container: HTMLElement, options?: { dropCallback?: TreeView.DropCallback, multipleSelection?: boolean });
  clearSelection(): void;
  addToSelection(element: HTMLLIElement): void;
  append(element: HTMLLIElement, type: string /* "item" or "group" */, parentGroupElement: HTMLElement): void;
  insertBefore(element: HTMLLIElement, type: string, referenceElement: HTMLLIElement): void;
  insertAt(element: HTMLLIElement, type: string, index: number, parentElement: HTMLLIElement): void;
  remove(element: HTMLLIElement): void;
}

declare namespace TreeView {
  interface DropCallback {
    (dropInfo: {
      target: HTMLLIElement;
      where: string /* "above", "inside" or "below" */;
    },
    orderedNodes: HTMLLIElement[]): boolean;
  }
}
