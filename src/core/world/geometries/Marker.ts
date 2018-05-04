import Kernel from '../Kernel';
import Geometry from './Geometry';
import VertexBufferObject from '../VertexBufferObject';

export default class Marker implements Geometry{

    vbo: VertexBufferObject;

    constructor(public x: number, public y: number, public z: number){
        this.vbo = new VertexBufferObject(Kernel.gl.ARRAY_BUFFER);
        this.vbo.bind();
		this.vbo.bufferData([x,y,z], Kernel.gl.STATIC_DRAW, true);
		// this.vbo.unbind();
    }

    destroy(){
        this.vbo.destroy();
        this.vbo = null;
    }
}