import Kernel from '../Kernel';
import Utils from '../Utils';
import Vertice from './Vertice';
import Vector from './Vector';
import Line from './Line';
import Plan from './Plan';
import Matrix from './Matrix';

//Math.log2() method is defined in ES6
if (!(<any>Math).log2) {
    (<any>Math).log2 = (value: number) => (Math.log(value) / Math.log(2));
}

const pow2Cache: any = {};
(function (cache: any) {
    cache[0] = 1;
    for (var i: number = 1; i <= 20; i++) {
        cache[i] = cache[i - 1] << 1;
        cache[-i] = 1 / cache[i];
    }
})(pow2Cache);

const ONE_RADIAN_EQUAL_DEGREE: number = 57.29577951308232;//=>180/Math.PI
const ONE_DEGREE_EQUAL_RADIAN: number = 0.017453292519943295;//=>Math.PI/180

export default class MathUtils {
    static getRealValueInWorld(virtualValue: number) {
        return virtualValue / Kernel.SCALE_FACTOR;
    }

    static pow2(v: number) {
        var s: string = v.toString();
        if (pow2Cache.hasOwnProperty(s)) {
            return pow2Cache[s];
        } else {
            return Math.pow(2, v);
        }
    }

    static log2(value: number) {
        return (<any>Math).log2(value);
    }

    static izZero(value: any): boolean {
        if (!Utils.isNumber(value)) {
            throw "invalid value";
        }
        return Math.abs(value) < 0.000001;
    }

    static isPowerOfTwo(value: number) {
        return (value & (value - 1)) === 0 && value !== 0;
    }

    static asinSafely(value: number) {
        if (value > 1) {
            value = 1;
        }
        if (value < -1) {
            value = -1;
        }
        return Math.asin(value);
    }

    static acosSafely(value: number) {
        if (value > 1) {
            value = 1;
        }
        if (value < -1) {
            value = -1;
        }
        return Math.acos(value);
    }

    /**
     * 将其他进制的数字转换为10进制
     * @param numSys 要准换的进制
     * @param strNum 字符串形式的要转换的数据
     * @returns {number} 整数的十进制数据
     */
    static numerationSystemTo10(numSys: number, strNum: string): number {
        var sum = 0;
        for (var i = 0; i < strNum.length; i++) {
            var level = strNum.length - 1 - i;
            var key = parseInt(strNum[i]);
            sum += key * Math.pow(numSys, level);
        }
        return sum;
    }

    /**
     * 将10进制的数字转换为其他进制
     * @param numSys 要转换成的进制
     * @param num 要转换的十进制数字
     * @returns {string} 字符串形式的其他进制的数据
     */
    static numerationSystemFrom10(numSys: number, num: number) {
        return num.toString(numSys);
    }

    /**
     * 将数据从一个进制转换到另一个进制，输入和输出都是字符串
     * @param numSysFrom
     * @param numSysTo
     * @param strNumFrom
     * @returns {string}
     */
    static numerationSystemChange(numSysFrom: number, numSysTo: number, strNumFrom: string) {
        var temp10 = this.numerationSystemTo10(numSysFrom, strNumFrom);
        var strResult = this.numerationSystemFrom10(numSysTo, temp10);
        return strResult;
    }

    /**
     * 计算三角形的面积
     */
    static getTriangleArea(v1: Vertice, v2: Vertice, v3: Vertice) {
        var v1Copy = v1.clone();
        var v2Copy = v2.clone();
        var v3Copy = v3.clone();
        var direction = Vector.verticeMinusVertice(v3Copy, v2Copy);
        var line = new Line(v2Copy, direction);
        var h = this.getLengthFromVerticeToLine(v1Copy, line);
        var w = this.getLengthFromVerticeToVertice(v2Copy, v3Copy);
        var area = 0.5 * w * h;
        return area;
    }

    /**
     * 计算三维空间中两点之间的直线距离
     * @param vertice1
     * @param vertice2
     * @return {Number}
     */
    static getLengthFromVerticeToVertice(vertice1: Vertice, vertice2: Vertice) {
        var vertice1Copy = vertice1.clone();
        var vertice2Copy = vertice2.clone();
        var length2 = Math.pow(vertice1Copy.x - vertice2Copy.x, 2) + Math.pow(vertice1Copy.y - vertice2Copy.y, 2) + Math.pow(vertice1Copy.z - vertice2Copy.z, 2);
        var length = Math.sqrt(length2);
        return length;
    }

    /**
     * 已验证正确
     * 获取点到直线的距离
     * @param vertice 直线外一点
     * @param line 直线
     * @return {Number}
     */
    static getLengthFromVerticeToLine(vertice: Vertice, line: Line) {
        var verticeCopy = vertice.clone();
        var lineCopy = line.clone();
        var x0 = verticeCopy.x;
        var y0 = verticeCopy.y;
        var z0 = verticeCopy.z;
        var verticeOnLine = lineCopy.vertice;
        var x1 = verticeOnLine.x;
        var y1 = verticeOnLine.y;
        var z1 = verticeOnLine.z;
        var lineVector = lineCopy.vector;
        lineVector.normalize();
        var a = lineVector.x;
        var b = lineVector.y;
        var c = lineVector.z;
        var A = (y0 - y1) * c - b * (z0 - z1);
        var B = (z0 - z1) * a - c * (x0 - x1);
        var C = (x0 - x1) * b - a * (y0 - y1);
        return Math.sqrt(A * A + B * B + C * C);
    }

    /**
     * 已验证正确
     * 计算点到平面的距离，平面方程由Ax+By+Cz+D=0决定
     * @param vertice
     * @param plan 平面，包含A、B、C、D四个参数信息
     * @return {Number}
     */
    static getLengthFromVerticeToPlan(vertice: Vertice, plan: Plan) {
        var verticeCopy = vertice.clone();
        var planCopy = plan.clone();
        var x = verticeCopy.x;
        var y = verticeCopy.y;
        var z = verticeCopy.z;
        var A = planCopy.A;
        var B = planCopy.B;
        var C = planCopy.C;
        var D = planCopy.D;
        var numerator = Math.abs(A * x + B * y + C * z + D);
        var denominator = Math.sqrt(A * A + B * B + C * C);
        var length = numerator / denominator;
        return length;
    }

    /**
     * 已验证正确
     * 从vertice向平面plan做垂线，计算垂点坐标
     * @param vertice
     * @param plan
     * @return {World.Vertice}
     */
    static getVerticeVerticalIntersectPointWidthPlan(vertice: Vertice, plan: Plan) {
        var verticeCopy = vertice.clone();
        var planCopy = plan.clone();
        var x0 = verticeCopy.x;
        var y0 = verticeCopy.y;
        var z0 = verticeCopy.z;
        var normalVector = new Vector(planCopy.A, planCopy.B, planCopy.C);
        normalVector.normalize();
        var a = normalVector.x;
        var b = normalVector.y;
        var c = normalVector.z;
        var d = planCopy.D * a / planCopy.A;
        var k = -(a * x0 + b * y0 + c * z0 + d);
        var x = k * a + x0;
        var y = k * b + y0;
        var z = k * c + z0;
        var intersectVertice = new Vertice(x, y, z);
        return intersectVertice;
    }

    static getIntersectPointByLineAdPlan(line: Line, plan: Plan) {
        var lineCopy = line.clone();
        var planCopy = plan.clone();
        lineCopy.vector.normalize();
        var A = planCopy.A;
        var B = planCopy.B;
        var C = planCopy.C;
        var D = planCopy.D;
        var x0 = lineCopy.vertice.x;
        var y0 = lineCopy.vertice.y;
        var z0 = lineCopy.vertice.z;
        var a = lineCopy.vector.x;
        var b = lineCopy.vector.y;
        var c = lineCopy.vector.z;
        var k = -(A * x0 + B * y0 + C * z0 + D) / (A * a + B * b + C * c);
        var x = k * a + x0;
        var y = k * b + y0;
        var z = k * c + z0;
        var intersectVertice = new Vertice(x, y, z);
        return intersectVertice;
    }

    /**
     * 已验证正确
     * 计算某直线与地球的交点，有可能没有交点，有可能有一个交点，也有可能有两个交点
     * @param line 与地球求交的直线
     * @return {Array}
     */
    static getLineIntersectPointWithEarth(line: Line): Vertice[] {
        var result: Vertice[] = [];
        var lineCopy = line.clone();
        var vertice = lineCopy.vertice;
        var direction = lineCopy.vector;
        direction.normalize();
        var r = Kernel.EARTH_RADIUS;
        var a = direction.x;
        var b = direction.y;
        var c = direction.z;
        var x0 = vertice.x;
        var y0 = vertice.y;
        var z0 = vertice.z;
        var a2 = a * a;
        var b2 = b * b;
        var c2 = c * c;
        var r2 = r * r;
        var ay0 = a * y0;
        var az0 = a * z0;
        var bx0 = b * x0;
        var bz0 = b * z0;
        var cx0 = c * x0;
        var cy0 = c * y0;
        var deltaA = ay0 * bx0 + az0 * cx0 + bz0 * cy0;
        var deltaB = ay0 * ay0 + az0 * az0 + bx0 * bx0 + bz0 * bz0 + cx0 * cx0 + cy0 * cy0;
        var deltaC = a2 + b2 + c2;
        var delta = 8 * deltaA - 4 * deltaB + 4 * r2 * deltaC;
        if (delta < 0) {
            result = [];
        }
        else {
            var t = a * x0 + b * y0 + c * z0;
            var A = a2 + b2 + c2;
            if (delta == 0) {
                var k = - t / A;
                var x = k * a + x0;
                var y = k * b + y0;
                var z = k * c + z0;
                var p = new Vertice(x, y, z);
                result.push(p);
            }
            else if (delta > 0) {
                var sqrtDelta = Math.sqrt(delta);
                var k1 = (-2 * t + sqrtDelta) / (2 * A);
                var x1 = k1 * a + x0;
                var y1 = k1 * b + y0;
                var z1 = k1 * c + z0;
                var p1 = new Vertice(x1, y1, z1);
                result.push(p1);

                var k2 = (-2 * t - sqrtDelta) / (2 * A);
                var x2 = k2 * a + x0;
                var y2 = k2 * b + y0;
                var z2 = k2 * c + z0;
                var p2 = new Vertice(x2, y2, z2);
                result.push(p2);
            }
        }

        return result;
    }

    /**
     * 计算过P点且垂直于向量V的平面
     * @param vertice P点
     * @param direction 向量V
     * @return {Object} World.Plan 返回平面表达式中Ax+By+Cz+D=0的A、B、C、D的信息
     */
    static getCrossPlaneByLine(vertice: Vertice, direction: Vector): Plan {
        var verticeCopy = vertice.clone();
        var directionCopy = direction.clone();
        directionCopy.normalize();
        var a = directionCopy.x;
        var b = directionCopy.y;
        var c = directionCopy.z;
        var x0 = verticeCopy.x;
        var y0 = verticeCopy.y;
        var z0 = verticeCopy.z;
        var d = -(a * x0 + b * y0 + c * z0);
        var plan = new Plan(a, b, c, d);
        return plan;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    //点变换: Canvas->NDC
    static convertPointFromCanvasToNDC(canvasWidth: number, canvasHeight: number, canvasX: number, canvasY: number): number[] {
        if (!(Utils.isNumber(canvasX))) {
            throw "invalid canvasX";
        }
        if (!(Utils.isNumber(canvasY))) {
            throw "invalid canvasY";
        }
        var ndcX = 2 * canvasX / canvasWidth - 1;
        var ndcY = 1 - 2 * canvasY / canvasHeight;
        return [ndcX, ndcY];
    }

    //点变换: NDC->Canvas
    static convertPointFromNdcToCanvas(canvasWidth: number, canvasHeight: number, ndcX: number, ndcY: number): number[] {
        if (!(Utils.isNumber(ndcX))) {
            throw "invalid ndcX";
        }
        if (!(Utils.isNumber(ndcY))) {
            throw "invalid ndcY";
        }
        var canvasX = (1 + ndcX) * canvasWidth / 2.0;
        var canvasY = (1 - ndcY) * canvasHeight / 2.0;
        return [canvasX, canvasY];
    }

    /**将经纬度转换为笛卡尔空间直角坐标系中的x、y、z
     * @lon 经度(角度单位)
     * @lat 纬度(角度单位)
     * @r optional 可选的地球半径
     * @p 笛卡尔坐标系中的坐标
     */
    static geographicToCartesianCoord(lon: number, lat: number, r: number = Kernel.EARTH_RADIUS): Vertice {
        if (!(lon >= -(180 + 0.001) && lon <= (180 + 0.001))) {
            throw "invalid lon";
        }
        if (!(lat >= -(90 + 0.001) && lat <= (90 + 0.001))) {
            throw "invalid lat";
        }
        var radianLon = this.degreeToRadian(lon);
        var radianLat = this.degreeToRadian(lat);
        var sin1 = Math.sin(radianLon);
        var cos1 = Math.cos(radianLon);
        var sin2 = Math.sin(radianLat);
        var cos2 = Math.cos(radianLat);
        var x = r * sin1 * cos2;
        var y = r * sin2;
        var z = r * cos1 * cos2;
        return new Vertice(x, y, z);
    }

    /**
     * 将笛卡尔空间直角坐标系中的坐标转换为经纬度，以角度表示
     * @param vertice
     * @return {Array}
     */
    static cartesianCoordToGeographic(vertice: Vertice): number[] {
        var verticeCopy = vertice.clone();
        var x = verticeCopy.x;
        var y = verticeCopy.y;
        var z = verticeCopy.z;
        var sin2 = y / Kernel.EARTH_RADIUS;
        var radianLat = this.asinSafely(sin2);
        var cos2 = Math.cos(radianLat);
        var sin1 = x / (Kernel.EARTH_RADIUS * cos2);
        if (sin1 > 1) {
            sin1 = 1;
        }
        if (sin1 < -1) {
            sin1 = -1;
        }
        var cos1 = z / (Kernel.EARTH_RADIUS * cos2);
        if (cos1 > 1) {
            cos1 = 1;
        }
        if (cos1 < -1) {
            cos1 = -1;
        }
        var radianLog = this.asinSafely(sin1);
        if (sin1 >= 0) {
            //经度在[0,π]
            if (cos1 >= 0) {
                //经度在[0, π/2]之间
                radianLog = radianLog;
            } else {
                //经度在[π/2, π]之间
                radianLog = Math.PI - radianLog;
            }
        } else {
            //经度在[-π, 0]之间
            if (cos1 >= 0) {
                //经度在[-π/2, 0]之间
                radianLog = radianLog;
            } else {
                //经度在[-π,-π/2]之间
                radianLog = -radianLog - Math.PI;
            }
        }
        var degreeLat = this.radianToDegree(radianLat);
        var degreeLog = this.radianToDegree(radianLog);
        return [degreeLog, degreeLat];
    }

    /**
     * 角度转弧度
     * @param degree
     * @return {*}
     */
    static degreeToRadian(degree: number) {
        return degree * ONE_DEGREE_EQUAL_RADIAN;
    }

    /**
     * 弧度转角度
     * @param radian
     * @return {*}
     */
    static radianToDegree(radian: number) {
        return radian * ONE_RADIAN_EQUAL_DEGREE;
    }

    // static webMercatorDistanceBetweenLonlats(lon1: number, lat1: number, lon2: number, lat2: number){
    //     var xy1 = this.degreeGeographicToWebMercator(lon1, lat1);
    //     var xy2 = this.degreeGeographicToWebMercator(lon2, lat2);
    //     var deltaX = xy1[0] - xy2[0];
    //     var deltaY = xy1[1] - xy2[1];
    //     var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    //     return distance;
    // }

    static getRealArcDistanceBetweenLonLats(lon1: number, lat1: number, lon2: number, lat2: number) {
        //http://www.movable-type.co.uk/scripts/latlong.html
        var φ1 = this.degreeToRadian(lat1);
        var φ2 = this.degreeToRadian(lat2);
        var Δφ = φ2 - φ1;
        var Δλ = this.degreeToRadian(lon2 - lon1);
        var a = Math.sin(Δφ / 2);
        var b = Math.sin(Δλ / 2);

        var c = a * a + Math.cos(φ1) * Math.cos(φ2) * b * b;
        var d = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));

        var distance = Kernel.REAL_EARTH_RADIUS * d;
        return distance;
    }

    /**
     * 将投影坐标x转换为以弧度表示的经度
     * @param x 投影坐标x
     * @return {Number} 返回的经度信息以弧度表示
     */
    static webMercatorXToRadianLon(x: number) {
        return x / Kernel.EARTH_RADIUS;
    }

    /**
     * 将投影坐标x转换为以角度表示的经度
     * @param x 投影坐标x
     * @return {*} 返回的经度信息以角度表示
     */
    static webMercatorXToDegreeLon(x: number): number {
        var radianLog = this.webMercatorXToRadianLon(x);
        return this.radianToDegree(radianLog);
    }

    /**
     * 将投影坐标y转换为以弧度表示的纬度
     * @param y 投影坐标y
     * @return {Number} 返回的纬度信息以弧度表示
     */
    static webMercatorYToRadianLat(y: number): number {
        if (!(Utils.isNumber(y))) {
            throw "invalid y";
        }
        var a = y / Kernel.EARTH_RADIUS;
        var b = Math.pow(Math.E, a);
        var c = Math.atan(b);
        var radianLat = 2 * c - Math.PI / 2;
        return radianLat;
    }

    /**
     * 将投影坐标y转换为以角度表示的纬度
     * @param y 投影坐标y
     * @return {*} 返回的纬度信息以角度表示
     */
    static webMercatorYToDegreeLat(y: number): number {
        var radianLat = this.webMercatorYToRadianLat(y);
        return this.radianToDegree(radianLat);
    }

    /**
     * 将投影坐标x、y转换成以弧度表示的经纬度
     * @param x 投影坐标x
     * @param y 投影坐标y
     * @return {Array} 返回的经纬度信息以弧度表示
     */
    static webMercatorToRadianGeographic(x: number, y: number): number[] {
        var radianLog = this.webMercatorXToRadianLon(x);
        var radianLat = this.webMercatorYToRadianLat(y);
        return [radianLog, radianLat];
    }

    /**
     * 将投影坐标x、y转换成以角度表示的经纬度
     * @param x 投影坐标x
     * @param y 投影坐标y
     * @return {Array} 返回的经纬度信息以角度表示
     */
    static webMercatorToDegreeGeographic(x: number, y: number): number[] {
        var degreeLog = this.webMercatorXToDegreeLon(x);
        var degreeLat = this.webMercatorYToDegreeLat(y);
        return [degreeLog, degreeLat];
    }

    /**
     * 将以弧度表示的经度转换为投影坐标x
     * @param radianLog 以弧度表示的经度
     * @return {*} 投影坐标x
     */
    static radianLonToWebMercatorX(radianLog: number, real: boolean = false): number {
        if (!(Utils.isNumber(radianLog) && radianLog <= (Math.PI + 0.001) && radianLog >= -(Math.PI + 0.001))) {
            throw "invalid radianLog";
        }
        if (real) {
            return Kernel.REAL_EARTH_RADIUS * radianLog;
        } else {
            return Kernel.EARTH_RADIUS * radianLog;
        }
    }

    /**
     * 将以角度表示的纬度转换为投影坐标y
     * @param degreeLog 以角度表示的经度
     * @return {*} 投影坐标x
     */
    static degreeLonToWebMercatorX(degreeLog: number, real: boolean = false): number {
        if (!(Utils.isNumber(degreeLog) && degreeLog <= (180 + 0.001) && degreeLog >= -(180 + 0.001))) {
            throw "invalid degreeLog";
        }
        var radianLog = this.degreeToRadian(degreeLog);
        return this.radianLonToWebMercatorX(radianLog, real);
    }

    /**
     * 将以弧度表示的纬度转换为投影坐标y
     * @param radianLat 以弧度表示的纬度
     * @return {Number} 投影坐标y
     */
    static radianLatToWebMercatorY(radianLat: number, real: boolean = false): number {
        if (!(radianLat <= (Math.PI / 2 + 0.001) && radianLat >= -(Math.PI / 2 + 0.001))) {
            throw "invalid radianLat";
        }
        var a = Math.PI / 4 + radianLat / 2;
        var b = Math.tan(a);
        var c = Math.log(b);
        if (real) {
            return Kernel.REAL_EARTH_RADIUS * c;
        } else {
            return Kernel.EARTH_RADIUS * c;
        }
    }

    /**
     * 将以角度表示的纬度转换为投影坐标y
     * @param degreeLat 以角度表示的纬度
     * @return {Number} 投影坐标y
     */
    static degreeLatToWebMercatorY(degreeLat: number, real: boolean = false): number {
        if (!(degreeLat <= (90 + 0.001) && degreeLat >= -(90 + 0.001))) {
            throw "invalid degreeLat";
        }
        var radianLat = this.degreeToRadian(degreeLat);
        return this.radianLatToWebMercatorY(radianLat, real);
    }

    /**
     * 将以弧度表示的经纬度转换为投影坐标
     * @param radianLog 以弧度表示的经度
     * @param radianLat 以弧度表示的纬度
     * @return {Array}  投影坐标x、y
     */
    static radianGeographicToWebMercator(radianLog: number, radianLat: number): number[] {
        var x = this.radianLonToWebMercatorX(radianLog);
        var y = this.radianLatToWebMercatorY(radianLat);
        return [x, y];
    }

    /**
     * 将以角度表示的经纬度转换为投影坐标
     * @param degreeLog 以角度表示的经度
     * @param degreeLat 以角度表示的纬度
     * @return {Array}
     */
    static degreeGeographicToWebMercator(degreeLog: number, degreeLat: number): number[] {
        var x = this.degreeLonToWebMercatorX(degreeLog);
        var y = this.degreeLatToWebMercatorY(degreeLat);
        return [x, y];
    }

    //根据切片的level、row、column计算该切片所覆盖的投影区域的范围
    static getTileWebMercatorEnvelopeByGrid(level: number, row: number, column: number): any {
        var k = Kernel.MAX_PROJECTED_COORD;
        var size = 2 * k / Math.pow(2, level);
        var minX = -k + column * size;
        var maxX = minX + size;
        var maxY = k - row * size;
        var minY = maxY - size;
        var Eproj = {
            "minX": minX,
            "minY": minY,
            "maxX": maxX,
            "maxY": maxY
        };
        return Eproj;
    }

    //根据切片的level、row、column计算该切片所覆盖的经纬度区域的范围,以经纬度表示返回结果
    static getTileGeographicEnvelopByGrid(level: number, row: number, column: number): any {
        var Eproj = this.getTileWebMercatorEnvelopeByGrid(level, row, column);
        var pMin = this.webMercatorToDegreeGeographic(Eproj.minX, Eproj.minY);
        var pMax = this.webMercatorToDegreeGeographic(Eproj.maxX, Eproj.maxY);
        var Egeo = {
            "minLon": pMin[0],
            "minLat": pMin[1],
            "maxLon": pMax[0],
            "maxLat": pMax[1]
        };
        return Egeo;
    }

    //根据切片的level、row、column计算该切片所覆盖的笛卡尔空间直角坐标系的范围,以x、y、z表示返回结果
    static getTileCartesianEnvelopByGrid(level: number, row: number, column: number): Object {
        var Egeo = this.getTileGeographicEnvelopByGrid(level, row, column);
        var minLon = Egeo.minLon;
        var minLat = Egeo.minLat;
        var maxLon = Egeo.maxLon;
        var maxLat = Egeo.maxLat;
        var pLeftBottom = this.geographicToCartesianCoord(minLon, minLat);
        var pLeftTop = this.geographicToCartesianCoord(minLon, maxLat);
        var pRightTop = this.geographicToCartesianCoord(maxLon, maxLat);
        var pRightBottom = this.geographicToCartesianCoord(maxLon, minLat);
        var Ecar = {
            "pLeftBottom": pLeftBottom,
            "pLeftTop": pLeftTop,
            "pRightTop": pRightTop,
            "pRightBottom": pRightBottom,
            "minLon": minLon,
            "minLat": minLat,
            "maxLon": maxLon,
            "maxLat": maxLat
        };
        return Ecar;
    }

    /**
     * 获取切片的中心点，以经纬度数组形式返回
     * @param level
     * @param row
     * @param column
     * @return {Array}
     */
    static getGeographicTileCenter(level: number, row: number, column: number): number[] {
        var Egeo = this.getTileGeographicEnvelopByGrid(level, row, column);
        var minLon = Egeo.minLon;
        var minLat = Egeo.minLat;
        var maxLon = Egeo.maxLon;
        var maxLat = Egeo.maxLat;
        var centerLon = (minLon + maxLon) / 2;//切片的经度中心
        var centerLat = (minLat + maxLat) / 2;//切片的纬度中心
        var lonlatTileCenter = [centerLon, centerLat];
        return lonlatTileCenter;
    }

    static getCartesianTileCenter(level: number, row: number, column: number): Vertice {
        var lonLat = this.getGeographicTileCenter(level, row, column);
        var vertice = this.geographicToCartesianCoord(lonLat[0], lonLat[1]);
        return vertice;
    }

    /**
     * http://www.cnblogs.com/jay-dong/archive/2012/09/26/2704188.html
     * 根据二阶贝塞尔曲线生成指定数量的曲线上的点，返回结果包含p0和p2
     * @param p0 长度为2，x和y，贝塞尔曲线的起点
     * @param p1 长度为2，x和y，贝塞尔曲线的控制点
     * @param p2 长度为2，x和y，贝塞尔曲线的终点
     * @param count 生成的点的数量
     */
    static quad(p0: number[], p1: number[], p2: number[], count: number) {
        const points: number[][] = [];
        for (var i = 0; i < count; i++) {
            if (i === 0) {
                points.push(p0);
            } else if (i === count - 1) {
                points.push(p2)
            } else {
                const t = i / count;
                const a = (1 - t) * (1 - t);
                const b = 2 * t * (1 - t);
                const c = t * t;
                const x = a * p0[0] + b * p1[0] + c * p2[0];
                const y = a * p0[1] + b * p1[1] + c * p2[1];
                points.push([x, y]);
            }
        }
        return points;
    }

    /**
     * 计算TRIANGLES的平均法向量
     * @param vs 传入的顶点坐标数组 array
     * @param ind 传入的顶点的索引数组 array
     * @return {Array} 返回每个顶点的平均法向量的数组
     */
    static calculateNormals(vs: number[], ind: number[]): number[] {
        var x = 0;
        var y = 1;
        var z = 2;
        var ns: number[] = [];
        //对于每个vertex，初始化normal x, normal y, normal z
        for (var i = 0; i < vs.length; i = i + 3) {
            ns[i + x] = 0.0;
            ns[i + y] = 0.0;
            ns[i + z] = 0.0;
        }

        //用三元组vertices计算向量,所以i = i+3,i表示索引
        for (var i = 0; i < ind.length; i = i + 3) {
            var v1: number[] = [];
            var v2: number[] = [];
            var normal: number[] = [];
            //p2 - p1,得到向量Vp1p2
            v1[x] = vs[3 * ind[i + 2] + x] - vs[3 * ind[i + 1] + x];
            v1[y] = vs[3 * ind[i + 2] + y] - vs[3 * ind[i + 1] + y];
            v1[z] = vs[3 * ind[i + 2] + z] - vs[3 * ind[i + 1] + z];
            //p0 - p1,得到向量Vp0p1
            v2[x] = vs[3 * ind[i] + x] - vs[3 * ind[i + 1] + x];
            v2[y] = vs[3 * ind[i] + y] - vs[3 * ind[i + 1] + y];
            v2[z] = vs[3 * ind[i] + z] - vs[3 * ind[i + 1] + z];
            //两个向量叉乘得到三角形的法线向量，注意三角形的正向都是逆时针方向，此处要注意两个向量相乘的顺序，要保证法线向量是从背面指向正面的
            normal[x] = v1[y] * v2[z] - v1[z] * v2[y];
            normal[y] = v1[z] * v2[x] - v1[x] * v2[z];
            normal[z] = v1[x] * v2[y] - v1[y] * v2[x];
            //更新三角形的法线向量：向量的和
            for (var j = 0; j < 3; j++) {
                ns[3 * ind[i + j] + x] = ns[3 * ind[i + j] + x] + normal[x];
                ns[3 * ind[i + j] + y] = ns[3 * ind[i + j] + y] + normal[y];
                ns[3 * ind[i + j] + z] = ns[3 * ind[i + j] + z] + normal[z];
            }
        }
        //对法线向量进行归一化
        for (var i = 0; i < vs.length; i = i + 3) {
            var nn: number[] = [];
            nn[x] = ns[i + x];
            nn[y] = ns[i + y];
            nn[z] = ns[i + z];

            var len = Math.sqrt((nn[x] * nn[x]) + (nn[y] * nn[y]) + (nn[z] * nn[z]));
            if (len == 0) len = 1.0;

            nn[x] = nn[x] / len;
            nn[y] = nn[y] / len;
            nn[z] = nn[z] / len;

            ns[i + x] = nn[x];
            ns[i + y] = nn[y];
            ns[i + z] = nn[z];
        }

        return ns;
    }

    /**
     * 判断射线是否穿过三角形
     * 三角形的参数方程如下，其中V0，V1和V2是三角形的三个点，u, v是V1和V2的权重，1-u-v是V0的权重，并且满足u>=0, v >= 0,u+v<=1。
     * 三角形内一点p = (1 - u - v)*v0 + u*v1 + v*v2
     * http://www.cnblogs.com/graphics/archive/2010/08/09/1795348.html
     * @param orig 射线起点
     * @param dir 射线方向
     * @param v0 三角形第一个顶点
     * @param v1 三角形第二个顶点
     * @param v2 三角形第三个顶点
     */
    static intersectTriangle(orig: Vertice, dir: Vector, v0: Vertice, v1: Vertice, v2: Vertice) {
        var t: number, u: number, v: number;

        var E1 = Vector.verticeMinusVertice(v1, v0);

        var E2 = Vector.verticeMinusVertice(v2, v0);

        var P = dir.cross(E2);

        // determinant
        var det = E1.dot(P);

        // keep det > 0, modify T accordingly
        var T: Vector = null;
        if(det > 0){
            T = Vector.verticeMinusVertice(orig, v0);
        }else{
            T = Vector.verticeMinusVertice(v0, orig);
            det = -det;
        }

        // If determinant is near zero, ray lies in plane of triangle
        if(det < 0.0001){
            return false;
        }

        // Calculate u and make sure u <= 1
        u = T.dot(P);
        if(u < 0 || u > det){
            return false;
        }

        var Q = T.cross(E1);

        // Calculate v and make sure u + v <= 1
        v = dir.dot(Q);
        if(v < 0 || (u + v) > det){
            return false;
        }

        // Calculate t, scale parameters, ray intersects triangle
        // 如果要求出具体的交点可以使用下面的代码
        // t = E2.dot(Q);

        // var fInvDet = 1 / det;
        // t *= fInvDet;
        // u *= fInvDet;
        // v *= fInvDet;
        // // p = (1 - u - v)*v0 + u*v1 + v*v2
        // var s = 1- u - v;
        // //intersect就是射线与三角形的交点
        // var intersect = new Vertice();
        // intersect.x = s * v0.x + u * v1.x + v * v2.x;
        // intersect.y = s * v0.y + u * v1.y + v * v2.y;
        // intersect.z = s * v0.z + u * v1.z + v * v2.z;

        return true;
    }

    /**
     * 将世界坐标系中的坐标转换为模型坐标系中的坐标
     * @param worldVertice 世界坐标系中的坐标
     * @param localMatrix 模型矩阵
     * @param inverseLocalMatrix 可选参数，模型矩阵的逆矩阵，如果传递该参数可以减少不必要的逆矩阵计算 
     */
    static convertWorldVerticeToLocalVertice(worldVertice: Vertice, localMatrix: Matrix, inverseLocalMatrix?: Matrix){
        if(!inverseLocalMatrix){
            inverseLocalMatrix = localMatrix.getInverseMatrix();
        }
        const inputColumn = worldVertice.getArray();
        inputColumn.push(1);
        const column = inverseLocalMatrix.multiplyColumn(inputColumn);
        const localVertice = new Vertice(column[0], column[1], column[2]);
        return localVertice;
    }

    /**
     * 将世界坐标系中的向量转换为模型坐标系中的向量
     * @param worldVector 世界坐标系中的向量
     * @param localMatrix 模型矩阵
     * @param inverseLocalMatrix 可选参数，模型矩阵的逆矩阵，如果传递该参数可以减少不必要的逆矩阵计算 
     */
    static convertWorldVectorToLocalVector(worldVector: Vector, localMatrix: Matrix, inverseLocalMatrix?: Matrix){
        if(!inverseLocalMatrix){
            inverseLocalMatrix = localMatrix.getInverseMatrix();
        }
        const worldVertice1 = new Vertice(0, 0, 0);
        const worldVertice2 = worldVector.getVertice();
        const localVertice1 = this.convertWorldVerticeToLocalVertice(worldVertice1, localMatrix, inverseLocalMatrix);
        const localVertice2 = this.convertWorldVerticeToLocalVertice(worldVertice2, localMatrix, inverseLocalMatrix);
        const localVector = Vector.verticeMinusVertice(localVertice2, localVertice1);
        localVector.normalize();
        return localVector;
    }

    /**
     * 将世界坐标系中的直线转换为模型坐标系中的直线
     * @param worldLine 世界坐标系中的直线
     * @param localMatrix 模型矩阵
     * @param inverseLocalMatrix 可选参数，模型矩阵的逆矩阵，如果传递该参数可以减少不必要的逆矩阵计算
     */
    static convertWorldLineToLocalLine(worldLine: Line, localMatrix: Matrix, inverseLocalMatrix?: Matrix){
        if(!inverseLocalMatrix){
            inverseLocalMatrix = localMatrix.getInverseMatrix();
        }
        const localVertice = this.convertWorldVerticeToLocalVertice(worldLine.vertice, localMatrix, inverseLocalMatrix);
        const localVector = this.convertWorldVectorToLocalVector(worldLine.vector, localMatrix, inverseLocalMatrix);
        const localLine = new Line(localVertice, localVector);
        return localLine;
    }
};