declare class TreeView {
  treeRoot: HTMLOListElement;
  selectedNodes: HTMLLIElement[];

  constructor(container: HTMLElement, options?: {
    dragStartCallback?: TreeView.DragStartCallback,
    dropCallback?: TreeView.DropCallback,
    multipleSelection?: boolean
  });
  clearSelection(): void;
  addToSelection(element: HTMLLIElement): void;
  append(element: HTMLLIElement, type: string /* "item" or "group" */, parentGroupElement?: HTMLElement): void;
  insertBefore(element: HTMLLIElement, type: string, referenceElement: HTMLLIElement): void;
  insertAt(element: HTMLLIElement, type: string, index: number, parentElement?: HTMLLIElement): void;
  remove(element: HTMLLIElement): void;
  
  scrollIntoView(element: HTMLLIElement): void;
  moveVertically(offset: number /* 1 or -1 */);
  moveHorizontally(offset: number /* 1 or -1 */);

  addListener(event: string, listener: Function): TreeView;
  on(event: string, listener: Function): TreeView;
  once(event: string, listener: Function): TreeView;
  removeListener(event: string, listener: Function): TreeView;
  removeAllListeners(event?: string): TreeView;
  setMaxListeners(n: number): TreeView;
  getMaxListeners(): number;
  listeners(event: string): Function[];
  emit(event: string, ...args: any[]): boolean;
  listenerCount(type: string): number;

  on(event: "selectionChange", listener: () => any): TreeView;
  on(event: "activate", listener: () => any): TreeView;
}

declare namespace TreeView {
  interface DragStartCallback {
    (event: DragEvent, nodeElt: HTMLLIElement): boolean;
  }

  interface DropLocation {
    target: HTMLLIElement|HTMLOListElement;
    where: string; // "above", "inside" or "below"
  }

  interface DropCallback {
    (event: DragEvent,
    dropLocation: DropLocation,
    orderedNodes: HTMLLIElement[]): boolean;
  }
}

export = TreeView;
