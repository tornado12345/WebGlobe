import MeshTextureMaterial from './MeshTextureMaterial';

type ImageType = string | HTMLImageElement;

export default class MarkerTextureMaterial extends MeshTextureMaterial{
    constructor(imageOrUrl?: ImageType, public size:number = 16){
        super(imageOrUrl, false);
    }
};