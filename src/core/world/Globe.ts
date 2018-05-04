import Kernel from './Kernel';
import Utils from './Utils';
import Renderer from './Renderer';
import Camera, { CameraCore } from './Camera';
import Scene from './Scene';
import ImageUtils from './Image';
import EventHandler from './EventHandler';
import TiledLayer from './layers/TiledLayer';
import { GoogleTiledLayer } from './layers/Google';
import { AutonaviTiledLayer, AutonaviLabelLayer } from './layers/Autonavi';
import LabelLayer from './layers/LabelLayer';
import TrafficLayer from './layers/TrafficLayer';
// import { QihuTrafficLayer } from './layers/Qihu';
import Atmosphere from './graphics/Atmosphere';
import LocationGraphic from './graphics/LocationGraphic';
import PoiLayer from './layers/PoiLayer';
import RouteLayer from './layers/RouteLayer';
import Extent from './Extent';
import Service,{Location} from './Service';
import {WebGLRenderingContextExtension} from './Definitions.d';

const initLevel:number = Utils.isMobile() ? 11 : 3;

const initLonlat:number[] = [116.3975, 39.9085];

type RenderCallback = () => void;

export class GlobeOptions{
  pauseRendering: boolean = false;
  satellite: boolean = true;
  level: number | 'auto' = 'auto';
  lonlat: number[] | 'auto' = 'auto';
  key: string = "";
  resolutionFactor: number;
}

export default class Globe {
  renderer: Renderer = null;
  scene: Scene = null;
  camera: Camera = null;
  tiledLayer: TiledLayer = null;
  labelLayer: LabelLayer = null;
  trafficLayer: TrafficLayer = null;
  poiLayer: PoiLayer = null;
  routeLayer: RouteLayer = null;
  locationGraphic: LocationGraphic = null;
  debugStopRefreshTiles: boolean = false;
  private readonly REFRESH_INTERVAL: number = 150; //Globe自动刷新时间间隔，以毫秒为单位
  private lastRefreshTimestamp: number = -1;
  private lastRefreshCameraCore: CameraCore = null;
  private eventHandler: EventHandler = null;
  private allRefreshCount: number = 0;
  private realRefreshCount: number = 0;
  // private beforeRenderCallbacks: RenderCallback[] = [];
  private afterRenderCallbacks: RenderCallback[] = [];
  public gl: WebGLRenderingContextExtension = null;
  private static globe: Globe = null;

  static getInstance(options?: GlobeOptions){
    if(!this.globe){
      const canvas = document.createElement("canvas");
      canvas.width = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;
      this.globe = new Globe(canvas, options);
    }
    return this.globe;
  }

  private constructor(public canvas: HTMLCanvasElement, private options?: GlobeOptions) {
    if(!this.options){
      this.options = new GlobeOptions();
    }
    this.renderer = new Renderer(canvas, this._onBeforeRender.bind(this), this._onAfterRender.bind(this));
    this.gl = this.renderer.gl;
    this.scene = new Scene();
    var radio = canvas.width / canvas.height;
    let level = this.options.level >= 0 ? (this.options.level as number) : initLevel;
    let lonlat = (this.options.lonlat && this.options.lonlat.length === 2) ? (this.options.lonlat as number[]) : initLonlat;
    this.camera = new Camera(canvas, 30, radio, 1, Kernel.EARTH_RADIUS * 2, level, lonlat, options.resolutionFactor);
    this.renderer.setScene(this.scene);
    this.renderer.setCamera(this.camera);

    if(this.options.satellite){
      //not display well for level 10,11 when style is Default
      this._setTiledLayer(new GoogleTiledLayer("Default"), this.options.pauseRendering);//"Default" | "Satellite" | "Road" | "RoadOnly" | "Terrain" | "TerrainOnly";
      // this.labelLayer = new AutonaviLabelLayer();
      // this.labelLayer = new SosoLabelLayer();
      // this.scene.add(this.labelLayer);
    }else{
      this._setTiledLayer(new AutonaviTiledLayer(), this.options.pauseRendering);
    }

    // this.trafficLayer = new QihuTrafficLayer();
    // this.trafficLayer.visible = false;
    // this.scene.add(this.trafficLayer);
    var atmosphere = Atmosphere.getInstance();
    this.scene.add(atmosphere);
    this.routeLayer = RouteLayer.getInstance(this.camera, this.options.key);
    this.scene.add(this.routeLayer);
    this.poiLayer = PoiLayer.getInstance();
    this.poiLayer.globe = this;
    this.scene.add(this.poiLayer);
    this.locationGraphic = LocationGraphic.getInstance(this);
    this.scene.add(this.locationGraphic);

    this.eventHandler = new EventHandler(this);

    if(this.options.pauseRendering !== true){
      this.renderer.resumeRendering();
    }

    const locationCallback = (location: any) => {
      if(location){
        this.afterRenderCallbacks.push(() => {
          this.updateUserLocation(location);
        });
      }
    };

    Service.getCurrentPosition(false).then(locationCallback).then(() => {
      if(Utils.isMobile()){
        Service.getCurrentPosition(true).then(locationCallback);
      }
    });
  }

  placeAt(container: HTMLElement){
    if(this.canvas.parentNode){
      if(this.canvas.parentNode !== container){
        container.appendChild(this.canvas);
      }
    }else{
      container.appendChild(this.canvas);
    }
  }
  
  public resize(width: number, height: number){
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.setAspect(this.canvas.width / this.canvas.height);
    Utils.publish("extent-change");
  }

  private updateUserLocation(location: Location) {
    this.locationGraphic.setLonLat(location.lon, location.lat);

    let [lon, lat] = this.camera.getLonlat();

    if(this.options.lonlat === 'auto'){
      lon = location.lon;
      lat = location.lat;
    }

    let level = this.getLevel();

    if(this.options.level === 'auto'){
      level = 8;
      if (location.accuracy <= 100) {
        level = 16;
      } else if (location.accuracy <= 1000) {
        level = 13;
      } else {
        level = 11;
      }
    }

    this.centerTo(lon, lat, level);
  }

  getLonlat(){
    return this.camera.getLonlat();
  }

  isRenderingPaused(){
    return this.renderer.isRenderingPaused();
  }

  pauseRendering(){
    this.renderer.pauseRendering();
  }

  resumeRendering(){
    this.renderer.resumeRendering();
    this.refresh(true);
  }

  private _setTiledLayer(tiledLayer: TiledLayer, dontRefresh: boolean = false) {
    //在更换切片图层的类型时清空缓存的图片
    ImageUtils.clear();
    if (this.tiledLayer) {
      var b = this.scene.remove(this.tiledLayer);
      if (!b) {
        console.error("this.scene.remove(this.tiledLayer)失败");
      }
      this.scene.tiledLayer = null;
    }
    tiledLayer.globe = this;
    this.tiledLayer = tiledLayer;
    this.scene.add(this.tiledLayer, true);
    if(!dontRefresh){
      this.refresh(true);
    }
  }

  showLabelLayer() {
    if (this.labelLayer) {
      this.labelLayer.visible = true;
    }
  }

  hideLabelLayer() {
    if (this.labelLayer) {
      this.labelLayer.visible = false;
    }
  }

  showTrafficLayer() {
    if (this.trafficLayer) {
      this.trafficLayer.visible = true;
    }
  }

  hideTrafficLayer() {
    if (this.trafficLayer) {
      this.trafficLayer.visible = false;
    }
  }

  getLevel() {
    return this.camera.getLevel();
  }

  zoomIn() {
    this.setLevel(this.getLevel() + 1);
  }

  setLevel(level: number) {
    if (this.camera) {
      this.camera.setLevel(level);
    }
  }

  centerTo(lon: number, lat: number, level:number = this.getLevel()){
    return this.camera.centerTo(lon, lat, level);
  }

  animateTo(newLon: number, newLat: number, newLevel: number = this.getLevel(), duration: number = 1000){
    return this.camera.animateTo(newLon, newLat, newLevel, duration);
  }

  setExtent(extent: Extent){
    return this.camera.setExtent(extent);
  }

  animateToExtent(extent: Extent, duration: number = 1000){
    return this.camera.animateToExtent(extent, duration);
  }

  isAnimating(): boolean {
    return this.camera.isAnimating();
  }

  animateToLevel(level: number, cb?: () => void) {
    if (!this.isAnimating()) {
      if (level < Kernel.MIN_LEVEL) {
        level = Kernel.MIN_LEVEL;
      }
      if (level > Kernel.MAX_LEVEL) {
        level = Kernel.MAX_LEVEL;
      }
      if (level !== this.getLevel()) {
        this.camera.animateToLevel(level, cb);
      }
    }
  }

  animateOut(cb?: () => void) {
    this.animateToLevel(this.getLevel() - 1, cb);
  }

  animateIn(cb?: () => void) {
    this.animateToLevel(this.getLevel() + 1, cb);
  }

  private _onBeforeRender(renderer: Renderer) {
    // this.beforeRenderCallbacks.forEach((callback) => callback());
    this.refresh();
  }

  private _onAfterRender(render: Renderer) {
    this.afterRenderCallbacks.forEach((callback) => callback());
    this.afterRenderCallbacks = [];
  }

  logRefreshInfo() {
    console.log(this.realRefreshCount, this.allRefreshCount, this.realRefreshCount / this.allRefreshCount);
  }

  refresh(force: boolean = false) {
    this.allRefreshCount++;
    var timestamp = Date.now();

    //先更新camera中的各种矩阵
    this.camera.update(force);

    if (!this.tiledLayer || !this.scene || !this.camera) {
      return;
    }

    if (this.debugStopRefreshTiles) {
      return;
    }

    var newCameraCore = this.camera.getCameraCore();
    // var isNeedRefresh = force || !newCameraCore.equals(this.cameraCore);
    var isNeedRefresh = false;
    if (force) {
      isNeedRefresh = true;
    } else {
      if(this.isRenderingPaused()){
        //when rendering paused, we don't need to refresh
        isNeedRefresh = false;
      }else{
        if (newCameraCore.equals(this.lastRefreshCameraCore)) {
          isNeedRefresh = false;
        } else {
          isNeedRefresh = timestamp - this.lastRefreshTimestamp >= this.REFRESH_INTERVAL;
        }
      }
    }

    this.tiledLayer.updateSubLayerCount();

    if (isNeedRefresh) {
      this.realRefreshCount++;
      this.lastRefreshTimestamp = timestamp;
      this.lastRefreshCameraCore = newCameraCore;
      this.tiledLayer.refresh();
    }

    this.tiledLayer.updateTileVisibility();

    if(!this.isRenderingPaused()){
      var a = !!(this.labelLayer && this.labelLayer.visible);
      var b = !!(this.trafficLayer && this.trafficLayer.visible);
      if (a || b) {
        var lastLevelTileGrids = this.tiledLayer.getLastLevelVisibleTileGrids();
        if (a) {
          this.labelLayer.updateTiles(this.getLevel(), lastLevelTileGrids);
        }
        if (b) {
          this.trafficLayer.updateTiles(this.getLevel(), lastLevelTileGrids);
        }
      }
    }
  }

  getExtent(){
    const extents:Extent[] = [];
    //layerExtent is null when rendering paused
    var layerExtent = this.tiledLayer.getExtent();
    if(layerExtent){
      extents.push(layerExtent);
    }

    var cameraExtent = this.camera.getExtent();
    if(cameraExtent){
      extents.push(cameraExtent);
    }

    if(extents.length === 0){
      return  null;
    }else if(extents.length === 1){
      return extents[0];
    }else{
      return Extent.intersect(extents);
    }
  }

  pick(canvasX: number, canvasY: number){
    const pickInfo = this.camera.getPickInfoByCanvas(canvasX, canvasY, false);
    const line = pickInfo.line;
    this.scene.pickByWorldLine(line);
  }

  test(){
    this.debugStopRefreshTiles = true;
    this.labelLayer.hideAllTiles();
    this.tiledLayer.children.forEach((subLayer) => subLayer.hideAllTiles());
    var subLayer = this.tiledLayer.children[this.tiledLayer.children.length-1];
    subLayer.visible = true;
    subLayer.children[0].visible = true;
    return subLayer;
  }

};