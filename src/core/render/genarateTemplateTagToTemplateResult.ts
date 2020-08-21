import { Injectable, Injector, ReflectiveInjector } from 'injection-js';
import { html, TemplateResult } from '../../../../lit-html/src/lit-html';
import ChildInstanceManager from './childInstanceManager';
import { ComponentTemplateToken, SimpleTemplateToken, SimpleTemplateTag, ComponentTemplateTag, TemplateTag } from '../templateTag/index';
import { RenderComponent } from '../component';
import { CONNECT_TYPE, DISCONNECT_TYPE } from './processorLifeCircle';
import { ProcessProps } from '../decorators/Input';
export const instanceTemplateResultMap = new WeakMap();

@Injectable()
export class ProcessorTemplateTagToTemplateResult {
    instanceConnectAndDisConnectTask = [];
    constructor(public rootInjector: Injector, public processProps: ProcessProps) {}
    processorLifeCircle() {
        this.instanceConnectAndDisConnectTask.map(({ instance, type }) => {
            if (type === CONNECT_TYPE) {
                instance.connectedCallback();
                return;
            }
            if (type === DISCONNECT_TYPE) {
                instance.disconnectedCallback();
                return;
            }
        });
        this.instanceConnectAndDisConnectTask.length = 0;
    }
    initParentChildren(parentComponent: any) {
        return ChildInstanceManager.create(parentComponent);
    }
    addNewInstance(childrenInstanceManager: ChildInstanceManager, instance: RenderComponent) {
        childrenInstanceManager.addNewInstance(instance);
        this.instanceConnectAndDisConnectTask.push({
            instance,
            type: CONNECT_TYPE
        });
    }
    clearInstance(instances: RenderComponent[]) {
        instances.forEach((instance) => {
            this.instanceConnectAndDisConnectTask.push({
                instance,
                type: DISCONNECT_TYPE
            });
        });
    }
    instanceRender(instance) {
        const templateTag = instance.render();
        const templateResult = this.wrapGenarateTemplateTagToTemplateResult(templateTag, instance);
        instanceTemplateResultMap.set(instance, templateResult);
        return templateResult;
    }
    wrapGenarateTemplateTagToTemplateResult(t: TemplateTag | TemplateTag[], parent: any) {
        const childrenInstanceManager = this.initParentChildren(parent);
        const result = this.genarateTemplateTagToTemplateResult(t, parent);
        const clearChildren = childrenInstanceManager.clearLastNotUseChildInstance();
        this.clearInstance(clearChildren);
        return result;
    }
    genarateValueToTemplateResult(t, parent) {
        if (typeof t === 'object' && t !== null && (t.type === SimpleTemplateToken || t.type === ComponentTemplateToken)) {
            return this.genarateTemplateTagToTemplateResult(t, parent);
        }
        if (Array.isArray(t)) {
            return t.map((item) => this.genarateValueToTemplateResult(item, parent));
        }
        return t;
    }
    genarateTemplateTagToTemplateResult(t: TemplateTag | Array<TemplateTag>, parent): TemplateResult | Array<TemplateResult> {
        const childrenInstanceManager = this.initParentChildren(parent);
        if (
            typeof t === 'object' &&
            t !== null &&
            !Array.isArray(t) &&
            (t.type === SimpleTemplateToken || t.type === ComponentTemplateToken)
        ) {
            if (t.type === ComponentTemplateToken) {
                const componentTemplateTag = t as ComponentTemplateTag;
                const { component, props } = componentTemplateTag;
                const childComponentInfo = childrenInstanceManager.findCanReUseIntance(component); //  findIntanceFromChildrenComponentInfo(component, childrenInstaneManager);

                let instance: RenderComponent;

                if (childComponentInfo) {
                    instance = childComponentInfo.instance;
                    // update child props
                    instance.propsChangedCallback(props);
                    this.processProps.updateProps(instance, props, component);
                    const clearChildren = childrenInstanceManager.clearMiddleNotUseChildInstance(childComponentInfo.i);
                    this.clearInstance(clearChildren);
                } else {
                    instance = this.processProps.createClass(component);
                    this.processProps.updateProps(instance, props, component);
                    this.addNewInstance(childrenInstanceManager, instance);
                }

                return this.instanceRender(instance);
            }
            if (t.type === SimpleTemplateToken) {
                const simpleTemplateTag = t as SimpleTemplateTag;
                const { strings, values } = simpleTemplateTag;
                const result = html(strings, ...values.map((item) => this.genarateValueToTemplateResult(item, parent)));
                return result;
            }
        } else if (Array.isArray(t)) {
            return t.map((item) => this.genarateTemplateTagToTemplateResult(item, parent)).flat();
        } else {
            return html`
                ${t ? String(t) : ''}
            `;
        }
    }
}