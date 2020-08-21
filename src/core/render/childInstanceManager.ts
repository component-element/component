import { RenderComponent } from '../component';

export const managers: WeakMap<any, ChildInstanceManager> = new WeakMap();

export default class ChildInstanceManager {
    static create(root) {
        const self = managers.get(root);
        if (self) {
            return self;
        }
        return new ChildInstanceManager(root);
    }
    children: Array<RenderComponent>;
    index: number;
    constructor(root) {
        this.children = [];
        this.index = -1;
        return this.init(root);
    }

    init(root) {
        const self = managers.get(root);
        if (self) {
            return self;
        }
        managers.set(root, this);
        return this;
    }

    addNewInstance(instance) {
        this.children = [...this.children.slice(0, this.index + 1), instance, ...this.children.slice(this.index + 1, this.children.length)];
        this.index = this.index + 1;
        return this;
    }

    clearMiddleNotUseChildInstance(index: number) {
        const newChildren = [...this.children.slice(0, this.index + 1), ...this.children.slice(index)];
        const clearChildren = this.children.slice(this.index + 1, index - this.index - 1);
        this.children = newChildren;
        this.index = this.index + 1;
        return clearChildren;
    }

    clearLastNotUseChildInstance() {
        if (this.children.length == 0) {
            this.index = -1;
            return [];
        }
        const newChildren = [...this.children.slice(0, this.index + 1)];
        const clearChildren = [...this.children.slice(this.index + 1)];
        this.children = newChildren;
        this.index = -1;
        return clearChildren;
    }

    findCanReUseIntance(ComponentClass) {
        const { index, children } = this;
        let instance;
        let i = index + 1;
        for (; i < children.length; i++) {
            const child = children[i];
            if (child.constructor === ComponentClass) {
                instance = child;
                break;
            }
        }
        if (instance) {
            return {
                instance,
                i
            };
        } else {
            return null;
        }
    }
}