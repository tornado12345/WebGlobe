﻿import Kernel from './Kernel';
import {Drawable, Pickable, PickListener} from './Definitions.d';
import Camera from './Camera';
import Line from './math/Line';

class GraphicGroup<T extends Drawable> implements Drawable {
    id: number;
    parent: GraphicGroup<T>;
    children: T[];
    visible: boolean = true;

    constructor() {
        this.id = ++Kernel.idCounter;
        this.children = [];
    }

    add(g: T, first: boolean = false) {
        if (first) {
            this.children.unshift(g);
        } else {
            this.children.push(g);
        }
        g.parent = this;
    }

    remove(g: T): boolean {
        // var result = false;
        // var findResult = this.findChildById(g.id);
        // if (findResult) {
        //     g.destroy();
        //     this.children.splice(findResult.index, 1);
        //     g = null;
        //     result = true;
        // }
        // return result;
        const index = this.findChildIndex(g);
        if(index >= 0){
            this.children.splice(index, 1);
            return true;
        }
        return false;
    }

    clear() {
        var i = 0, length = this.children.length, g: Drawable = null;
        for (; i < length; i++) {
            g = this.children[i];
            g.destroy();
        }
        this.children = [];
    }

    destroy() {
        this.parent = null;
        this.clear();
    }

    findChildIndex(child: T){
        const count = this.children.length;
        for(let i = 0; i < count; i++){
            const g = this.children[i];
            if(child === g){
                return i;
            }
        }
        return -1;
    }

    findChildById(graphicId: number) {
        var i = 0, length = this.children.length, g: T = null;
        for (; i < length; i++) {
            g = this.children[i];
            if (g.id === graphicId) {
                return {
                    index: i,
                    graphic: g
                };
            }
        }
        return null;
    }

    shouldDraw() {
        return this.visible && this.children.length > 0;
    }

    moveChildToLastPosition(child: T){
        const index = this.findChildIndex(child);
        this.children.splice(index, 1);
        this.children.push(child);
    }

    draw(camera: Camera) {
        if (this.shouldDraw()) {
            this.onBeforeDraw();
            this.onDraw(camera);
            this.onAfterDraw();
        }
    }

    protected onBeforeDraw(){

    }

    protected onDraw(camera: Camera) {
        this.children.forEach(function (g: Drawable) {
            if (g.shouldDraw(camera)) {
                g.draw(camera);
            }
        });
    }

    protected onAfterDraw(){

    }
};


//通过T extends Drawable & Pickable让T同时继承自多个接口
export class PickableGraphicGroup<T extends Drawable & Pickable> extends GraphicGroup<T>{
    private pickListener: PickListener = null;

    pickByLocalLine(localLine: Line, emitListener: boolean = false): T{
        const count = this.children.length;
        for(let i = count - 1; i >= 0; i--){
            const child = this.children[i];
            if(child.ifIntersectLocalLine(localLine)){
                if(emitListener){
                    this.onPick(child);
                }
                return child;
            }
        }
        return null;
    }

    pickByWorldLine(worldLine: Line, emitListener: boolean = false): T{
        const count = this.children.length;
        for(let i = count - 1; i >= 0; i--){
            const child = this.children[i];
            if(child.ifIntersectWorldLine(worldLine)){
                if(emitListener){
                    this.onPick(child);
                }
                return child;
            }
        }
        return null;
    }

    private onPick(target: T){
        //将选中的child放到最后的位置以便于最后渲染，这样防止其他child对其遮挡
        this.moveChildToLastPosition(target);
        if(this.pickListener){
            this.pickListener(target);
        }
    }

    hasPickListener(){
        return !!this.pickListener;
    }

    setPickListener(listener: PickListener){
        this.pickListener = listener;
    }
}

export default GraphicGroup;