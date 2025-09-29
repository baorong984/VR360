/*
 * @Author: Maicro-bao baorong@airia.cn
 * @Date: 2022-10-19 13:08:08
 * @LastEditors: Maicro-bao baorong@airia.cn
 * @LastEditTime: 2025-09-29 13:59:34
 * @FilePath: \VR360\dist\tpano.js
 * @Description: 增强版全景查看器 - 支持拍摄点经纬度配置
 * Copyright (c) 2025 by maicro, All Rights Reserved.
 */
function TPano(d) {
  //选取渲染对象的根dom
  let el = document.getElementById(d.el);
  var width = el.clientWidth;
  var height = el.clientHeight;

  // 参数处理与默认值
  const params = {
    DeviceOrientationControls: d.DeviceOrientationControls || false,
    MouseController: d.MouseController !== false,
    photo: d.photo || [],
    hotspot: d.hotspot || [],
    photoLoad: d.photoLoad || null,
    switchLoad: d.switchLoad || null,
    gyroSport: d.gyroSport || null,
    debug: d.debug || false,
    rotateAnimateController: d.rotateAnimateController || false,
  };

  //参数处理
  if (d.DeviceOrientationControls == null) {
    d.DeviceOrientationControls = false;
  }
  if (d.MouseController == null) {
    d.MouseController = true;
  }

  //初始化场景、相机、渲染器
  const scene = new THREE.Scene();
  let fov;
  if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
    //手机端视角
    fov = 90;
  } else {
    //pc端视角
    fov = 60;
  }
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000); //创建相机
  //camera.lookAt(500, 0, 0);//视角矫正
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setSize(width, height);
  renderer.setClearColor(0x272727, 1.0);
  renderer.setPixelRatio(window.devicePixelRatio);
  el.append(renderer.domElement);

  //生成全景图片3D对象
  const geometry = new THREE.SphereBufferGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);
  let mesh = new THREE.Mesh(geometry);
  scene.add(mesh);
  var texture = Array();
  let loadTextureLoaderCount = 0;

  // 增强版经纬度映射工具函数
  const CoordinateMapper = {
    // 当前全景的拍摄点地理信息
    currentGeoReference: null,

    /**
     * 设置当前拍摄点的地理参考
     * @param {Object} geoRef - 地理参考信息
     */
    setGeoReference: function (geoRef) {
      this.currentGeoReference = geoRef;
      if (params.debug) {
        console.log("设置地理参考:", geoRef);
      }
    },

    /**
     * 获取当前拍摄点的地理参考
     */
    getGeoReference: function () {
      return this.currentGeoReference;
    },

    /**
     * 将绝对经纬度转换为相对于拍摄点的3D坐标
     * @param {number} absLon - 绝对经度
     * @param {number} absLat - 绝对纬度
     * @param {number} radius - 球体半径 (默认: 500)
     * @param {number} scale - 缩放系数 (默认: 0.9)
     * @returns {THREE.Vector3} 3D坐标
     */
    absoluteLonLatToVector3: function (
      absLon,
      absLat,
      altitude = 0,
      radius = 500,
      scale = 0.9
    ) {
      if (!this.currentGeoReference) {
        return this.lonLatToVector3(absLon, absLat, altitude, radius, scale);
      }

      // 更精确的坐标转换 - 使用球面距离和方位角
      const deltaLon = absLon - this.currentGeoReference.longitude;
      const deltaLat = absLat - this.currentGeoReference.latitude;

      // 计算方位角（从北顺时针）
      const bearing = this.calculateBearing(absLon, absLat);

      // 计算距离（米）
      const distance = this.calculateDistance(
        this.currentGeoReference.longitude,
        this.currentGeoReference.latitude,
        absLon,
        absLat
      );

      if (params.debug) {
        console.log(`坐标转换详情:`, {
          经度差: deltaLon,
          纬度差: deltaLat,
          实际距离: distance + "米",
          方位角: bearing + "度",
        });
      }

      // 将距离转换为球面上的角度（弧度）
      // 假设球体半径500单位对应现实中的可视范围
      const angularDistance = (distance / 1000) * (Math.PI / 180) * 10; // 调整这个系数

      // 使用球面三角函数计算相对角度
      const relativeLon = Math.sin((bearing * Math.PI) / 180) * angularDistance;
      const relativeLat = Math.cos((bearing * Math.PI) / 180) * angularDistance;

      return this.lonLatToVector3(
        (relativeLon * 180) / Math.PI,
        (relativeLat * 180) / Math.PI,
        altitude, // ← 传递 altitude 参数
        radius,
        scale
      );
    },

    /**
     * 将相对角度转换为3D球面坐标（基础方法）
     * @param {number} lon - 经度偏移量（度）
     * @param {number} lat - 纬度偏移量（度）
     * @param {number} radius - 球体半径
     * @param {number} scale - 缩放系数
     * @returns {THREE.Vector3} 3D坐标
     */
    // 修复基础坐标转换方法
    lonLatToVector3: function (
      lon,
      lat,
      altitude = 0,
      radius = 500,
      scale = 0.9
    ) {
      const effectiveRadius = radius * scale;

      // 转换为弧度
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 90) * (Math.PI / 180);

      // 计算基础球面坐标
      const x = effectiveRadius * Math.sin(phi) * Math.cos(theta);
      const z = effectiveRadius * Math.sin(phi) * Math.sin(theta);

      // Y坐标需要考虑高度偏移
      // 假设 altitude 是相对于拍摄点的高度（米）
      // 需要将米转换为球面坐标的偏移量
      const heightScale = 0.1; // 调整这个系数来控制高度影响
      const baseY = effectiveRadius * Math.cos(phi);
      const altitudeOffset = altitude * heightScale;

      const y = baseY + altitudeOffset;

      return new THREE.Vector3(x, y, z);
    },

    /**
     * 将3D坐标转换为相对于拍摄点的经纬度
     * @param {THREE.Vector3} position - 3D坐标
     * @param {number} radius - 球体半径
     * @returns {Object} 包含绝对经纬度的对象
     */
    vector3ToAbsoluteLonLat: function (position, radius = 500) {
      const relative = this.vector3ToLonLat(position, radius);

      if (!this.currentGeoReference) {
        return {
          longitude: relative.longitude,
          latitude: relative.latitude,
          relative: relative,
        };
      }

      // 将相对坐标转换回绝对坐标
      const absLon =
        this.currentGeoReference.longitude +
        relative.longitude /
          Math.cos((this.currentGeoReference.latitude * Math.PI) / 180);
      const absLat = this.currentGeoReference.latitude + relative.latitude;

      return {
        longitude: absLon,
        latitude: absLat,
        relative: relative,
      };
    },

    /**
     * 将3D坐标转换为经纬度
     * @param {THREE.Vector3} position - 3D坐标
     * @param {number} radius - 球体半径 (默认: 500)
     * @returns {Object} 包含经度、纬度、UV坐标和像素坐标的对象
     */
    vector3ToLonLat: function (position, radius = 500) {
      const { x, y, z } = position;

      // 计算球面坐标
      const actualRadius = Math.sqrt(x * x + y * y + z * z);
      const lon = Math.atan2(z, x); // 经度 (-π 到 π)
      const lat = Math.asin(y / actualRadius); // 纬度 (-π/2 到 π/2)

      // 转换为角度
      const longitude_deg = THREE.MathUtils.radToDeg(lon);
      const latitude_deg = THREE.MathUtils.radToDeg(lat);

      // 计算UV坐标 (0-1范围)
      const u = (lon + Math.PI) / (2 * Math.PI);
      const v = (Math.PI / 2 - lat) / Math.PI;

      return {
        longitude: longitude_deg,
        latitude: latitude_deg,
        uv: { u, v },
        radians: { lon, lat },
      };
    },

    /**
     * 将经纬度转换为UV坐标
     * @param {number} lon - 经度
     * @param {number} lat - 纬度
     * @returns {Object} UV坐标 {u, v}
     */
    lonLatToUV: function (lon, lat) {
      const u = (lon + 180) / 360;
      const v = (90 - lat) / 180;
      return { u, v };
    },

    /**
     * 将UV坐标转换为经纬度
     * @param {number} u - U坐标 (0-1)
     * @param {number} v - V坐标 (0-1)
     * @returns {Object} 经纬度 {longitude, latitude}
     */
    uvToLonLat: function (u, v) {
      const longitude = u * 360 - 180;
      const latitude = 90 - v * 180;
      return { longitude, latitude };
    },

    /**
     * 计算两个绝对经纬度点之间的距离（米）
     * @param {number} lon1 - 起点经度
     * @param {number} lat1 - 起点纬度
     * @param {number} lon2 - 终点经度
     * @param {number} lat2 - 终点纬度
     * @returns {number} 距离（米）
     */
    calculateDistance: function (lon1, lat1, lon2, lat2) {
      const R = 6371000; // 地球半径（米）
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },

    /**
     * 计算从拍摄点到目标点的方位角
     * @param {number} targetLon - 目标点经度
     * @param {number} targetLat - 目标点纬度
     * @returns {number} 方位角（度，0=北，90=东）
     */
    calculateBearing: function (targetLon, targetLat) {
      if (!this.currentGeoReference) return 0;

      const startLat = (this.currentGeoReference.latitude * Math.PI) / 180;
      const startLon = (this.currentGeoReference.longitude * Math.PI) / 180;
      const endLat = (targetLat * Math.PI) / 180;
      const endLon = (targetLon * Math.PI) / 180;

      const y = Math.sin(endLon - startLon) * Math.cos(endLat);
      const x =
        Math.cos(startLat) * Math.sin(endLat) -
        Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLon - startLon);
      let bearing = Math.atan2(y, x);

      // 转换为度并从北开始
      bearing = (bearing * 180) / Math.PI;
      bearing = (bearing + 360) % 360;

      return bearing;
    },
  };

  loadTextureLoader(loadTextureLoaderCount);
  //用来加载全景照片
  function loadTextureLoader(i) {
    if (d.photo[i].type == "VIDEO") {
      el.insertAdjacentHTML(
        "beforeend",
        '<video id="video-' +
          i +
          '" loop muted style="display: none;" crossOrigin="anonymous" playsinline ><source src="' +
          d.photo[i].url +
          '"></video>'
      );
      let videoId = "video-" + i;
      let videoDom = document.getElementById(videoId);
      videoDom.play();
      texture[i] = new THREE.VideoTexture(videoDom);
      //没有找到监听加载的办法，暂时使用延迟模拟回调
      setTimeout(() => {
        loadTextureLoaderEnd();
      }, 2000);
    } else {
      texture[i] = new THREE.TextureLoader().load(
        d.photo[i].url,
        // onLoad回调
        function () {
          loadTextureLoaderEnd();
        },

        // 目前暂不支持onProgress的回调
        function (e) {
          console.log(e);
        },

        // onError回调
        function (err) {
          console.error("An error happened.");
        }
      );
    }
  }
  //用来控制加载下一张全景照片
  var loadTextureMsg;
  function loadTextureLoaderEnd() {
    let i = loadTextureLoaderCount;
    console.log(texture);
    texture[i].panoName = d.photo[i].name;

    // 设置当前全景的地理参考（如果配置了的话）
    if (d.photo[i].geoReference) {
      CoordinateMapper.setGeoReference(d.photo[i].geoReference);
    }

    loadTextureMsg = {
      all: d.photo.length,
      loading: {
        id: i + 1,
        name: d.photo[i].name,
        geoReference: d.photo[i].geoReference, // 包含地理信息
      },
      Leftover: d.photo.length - i - 1,
    };
    if (d.photoLoad != null) {
      d.photoLoad(loadTextureMsg);
    }
    if (loadTextureLoaderCount == 0) {
      //初始化加载第一张图片
      switchPhotoN(0);
    }
    if (loadTextureLoaderCount < d.photo.length - 1) {
      loadTextureLoader(++loadTextureLoaderCount);
    }
  }

  /**
   * 切换全景照片
   * @param int i 选择照片张数
   * @return json status，正常返回OK，不正常返回ERROR；msg具体信息
   */
  function switchPhotoN(i) {
    let response = {
      status: "ERROR",
      msg: "系统出错",
    };

    if (i < d.photo.length && i >= 0) {
      //回调通知：注意全景图片换页事件开始，应该检查全景图片是否下载完毕，主要是用于做进度提示功能
      if (loadTextureMsg.all - loadTextureMsg.Leftover >= i + 1) {
        //已加载完成，无需等待
        if (d.switchLoad != null) {
          d.switchLoad({
            loading: {
              id: i + 1,
              name: d.photo[i].name,
            },
            status: "end",
          });
        }
        switchGo();
      } else {
        //未加载完成，请等待一秒后再尝试
        if (d.switchLoad != null) {
          d.switchLoad({
            loading: {
              id: i + 1,
              name: d.photo[i].name,
            },
            status: "loading",
          });
        }
        setTimeout(switchPhotoN, 1000, i);
      }

      function switchGo() {
        let fov;
        if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
          //手机端视角
          try {
            fov = d.photo[i].fov.phone;
          } catch (error) {
            fov = null;
          }
        } else {
          //pc端视角
          try {
            fov = d.photo[i].fov.pc;
          } catch (error) {
            fov = null;
          }
        }
        if (fov != null) {
          camera.fov = fov;
          camera.updateProjectionMatrix();
        } else {
          if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
            //手机端视角
            fov = 90;
          } else {
            //pc端视角
            fov = 60;
          }
          camera.fov = fov;
          camera.updateProjectionMatrix();
        }
        console.log(texture);
        material = new THREE.MeshBasicMaterial({ map: texture[i] });
        mesh.material = material;

        // 设置新的地理参考
        if (d.photo[i].geoReference) {
          CoordinateMapper.setGeoReference(d.photo[i].geoReference);
        }

        cleanHotspot();
        if (d.hotspot != null) {
          initHotspot();
        }
        response = {
          status: "OK",
          msg: "切换成功",
          geoReference: d.photo[i].geoReference, // 返回地理信息
        };
      }
    } else {
      response.msg = "无效的照片索引";
    }

    return response;
  }

  //初始化热点
  let hotspotAnimate_count = 1;
  let hotspotAnimate_temp = Array();
  const hotspotOriginalY = [];
  function initHotspot() {
    const currentPanoName = mesh.material.map.panoName;

    // 添加参考点（拍摄点位置）
    const refGeometry = new THREE.SphereGeometry(5);
    const refMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const refPoint = new THREE.Mesh(refGeometry, refMaterial);
    refPoint.position.set(0, 0, 0); // 拍摄点在球心
    refPoint.name = "reference_point";
    scene.add(refPoint);

    // 支持两种热点配置方式：绝对经纬度或相对坐标
    params.hotspot.forEach((hotspot, j) => {
      if (hotspot.source === currentPanoName) {
        if (
          hotspot.targetLon !== undefined &&
          hotspot.targetLat !== undefined
        ) {
          // 使用绝对经纬度创建热点
          createHotspotFromAbsoluteLonLat(hotspot);
        } else if (hotspot.lon !== undefined && hotspot.lat !== undefined) {
          // 使用相对经纬度创建热点（向后兼容）
          createHotspotFromLonLat(hotspot);
        } else if (hotspot.position) {
          // 使用3D坐标创建热点（向后兼容）
          createHotspotFromPosition(hotspot);
        }
      }
    });
  }

  /**
   * 根据绝对经纬度创建热点
   * @param {Object} hotspotConfig - 热点配置
   */
  function createHotspotFromAbsoluteLonLat(hotspotConfig) {
    const map = new THREE.TextureLoader().load(hotspotConfig.imgUrl);
    const material = new THREE.SpriteMaterial({ map: map });
    const sprite = new THREE.Sprite(material);

    // 使用绝对经纬度计算3D位置
    const position = CoordinateMapper.absoluteLonLatToVector3(
      hotspotConfig.targetLon,
      hotspotConfig.targetLat,
      hotspotConfig.altitude || 0, // 使用配置中的 altitude
      500,
      0.9
    );

    // 计算距离和方位角（用于调试）
    if (params.debug && CoordinateMapper.currentGeoReference) {
      const distance = CoordinateMapper.calculateDistance(
        CoordinateMapper.currentGeoReference.longitude,
        CoordinateMapper.currentGeoReference.latitude,
        hotspotConfig.targetLon,
        hotspotConfig.targetLat
      );

      const bearing = CoordinateMapper.calculateBearing(
        hotspotConfig.targetLon,
        hotspotConfig.targetLat
      );

      console.log(
        `热点距离: ${distance.toFixed(2)}米, 方位角: ${bearing.toFixed(2)}°`
      );
    }

    sprite.position.copy(position);
    sprite.scale.set(30, 30, 1);
    sprite.name = "hotspot";

    // 设置跳转目标
    for (let k = 0; k < params.photo.length; k++) {
      if (params.photo[k].name === hotspotConfig.jumpTo) {
        sprite.jumpTo = k;
        break;
      }
    }

    // 存储地理信息用于调试
    sprite.userData = {
      targetLon: hotspotConfig.targetLon,
      targetLat: hotspotConfig.targetLat,
      altitude: hotspotConfig.altitude || 0,
      config: hotspotConfig,
      type: "absolute_coordinate",
    };

    scene.add(sprite);
    hotspotOriginalY.push(sprite.position.y);
  }

  /**
   * 根据经纬度创建热点（相对坐标）
   * @param {Object} hotspotConfig - 热点配置
   */
  function createHotspotFromLonLat(hotspotConfig) {
    const map = new THREE.TextureLoader().load(hotspotConfig.imgUrl);
    const material = new THREE.SpriteMaterial({ map: map });
    const sprite = new THREE.Sprite(material);

    // 使用经纬度计算3D位置
    const position = CoordinateMapper.lonLatToVector3(
      hotspotConfig.lon,
      hotspotConfig.lat,
      500,
      0.9
    );

    sprite.position.copy(position);
    sprite.scale.set(30, 30, 1);
    sprite.name = "hotspot";

    // 设置跳转目标
    for (let k = 0; k < params.photo.length; k++) {
      if (params.photo[k].name === hotspotConfig.jumpTo) {
        sprite.jumpTo = k;
        break;
      }
    }

    // 存储原始信息用于调试
    sprite.userData = {
      originalLon: hotspotConfig.lon,
      originalLat: hotspotConfig.lat,
      config: hotspotConfig,
      type: "relative_coordinate",
    };

    scene.add(sprite);
    hotspotOriginalY.push(sprite.position.y);
  }

  /**
   * 根据3D位置创建热点（向后兼容）
   * @param {Object} hotspotConfig - 热点配置
   */
  function createHotspotFromPosition(hotspotConfig) {
    const map = new THREE.TextureLoader().load(hotspotConfig.imgUrl);
    const material = new THREE.SpriteMaterial({ map: map });
    const sprite = new THREE.Sprite(material);

    const position = new THREE.Vector3(
      hotspotConfig.position.x * 0.9,
      hotspotConfig.position.y * 0.9,
      hotspotConfig.position.z * 0.9
    );

    sprite.position.copy(position);
    sprite.scale.set(30, 30, 1);
    sprite.name = "hotspot";

    for (let k = 0; k < params.photo.length; k++) {
      if (params.photo[k].name === hotspotConfig.jumpTo) {
        sprite.jumpTo = k;
        break;
      }
    }

    sprite.userData = {
      config: hotspotConfig,
      type: "3d_position",
    };

    scene.add(sprite);
    hotspotOriginalY.push(sprite.position.y);
  }

  //清除热点
  function cleanHotspot() {
    let children = scene.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i].name == "hotspot") {
        scene.children.splice(i, 1);
        i--; //从一个数组中去掉一个元素会使得后面的元素下标前移1，所以下一个遍历的元素下标也需要减一，避免漏网之鱼
      }
    }
    hotspotOriginalY.length = 0;
  }

  //体感控制
  let devicecontrol;
  try {
    devicecontrol = new THREE.DeviceOrientationControls(camera);
  } catch (error) {
    devicecontrol = null;
  }

  //启动鼠标控制
  mouseController();
  //启动多点触控
  phoneController();

  //动画绑定
  // 修复后的动画函数
  function animate() {
    requestAnimationFrame(animate);

    // 修复热点摆动 - 使用正确的数组索引
    let hotspotIndex = 0;
    for (let i = 0; i < scene.children.length; i++) {
      if (scene.children[i].name == "hotspot") {
        // 确保有对应的原始Y坐标
        if (hotspotOriginalY[hotspotIndex] === undefined) {
          // 如果没有存储原始位置，就存储当前位置
          hotspotOriginalY[hotspotIndex] = scene.children[i].position.y;
        }

        if (hotspotAnimate_count >= 400) {
          hotspotAnimate_count = 1;
          // 使用正确的索引重置位置
          scene.children[i].position.y = hotspotOriginalY[hotspotIndex];
        }

        if (hotspotAnimate_count <= 200) {
          scene.children[i].position.y += 0.04;
        } else {
          scene.children[i].position.y -= 0.04;
        }

        hotspotAnimate_count++;
        hotspotIndex++;
      }
    }

    render();
  }
  animate();

  //镜头自由旋转
  let anglexoz = -90; //相机在xoz平面上的角度
  var rotateAnimateController = d.rotateAnimateController;
  function rotateAnimate() {
    if (
      rotateAnimateController == true &&
      d.DeviceOrientationControls == false
    ) {
      anglexoz += 0.1;
      if (anglexoz > 360) {
        anglexoz = 0;
      }
      let x = Math.cos((anglexoz * Math.PI) / 180) * 500;
      let z = Math.sin((anglexoz * Math.PI) / 180) * 500;
      camera.lookAt(x, 0, z);
      //console.log(anglexoz);
    }
  }
  setInterval(rotateAnimate, 1000 / 60); //60帧

  el.addEventListener("pointerdown", function () {
    if (d.MouseController) {
      rotateAnimateController = false;
    }
  });

  //手机端多点触控
  let mouseFovControllerSport = true; //用来开闭鼠标控制支持的，如果用户在进行放大手势，应该将鼠标视角控制锁定
  function phoneController() {
    let oldL = 0;
    let x1, x2, y1, y2, l;
    document.addEventListener(
      "touchstart",
      function (event) {
        if (!d.MouseController) {
          return;
        }
        if (event.touches.length == 2) {
          mouseFovControllerSport = false;
          x1 = event.touches[0].clientX;
          x2 = event.touches[1].clientX;
          y1 = event.touches[0].clientY;
          y2 = event.touches[1].clientY;
          oldL = Math.sqrt(
            Math.pow(Math.abs(x2 - x1), 2) + Math.pow(Math.abs(y2 - y1), 2)
          ); //求两点间长度
        } else {
          mouseFovControllerSport = true;
        }
      },
      false
    );
    document.addEventListener(
      "touchmove",
      function (event) {
        if (!d.MouseController) {
          return;
        }
        event.preventDefault(); // prevent scrolling
        event.stopPropagation();
        if (event.touches.length == 2) {
          x1 = event.touches[0].clientX;
          x2 = event.touches[1].clientX;
          y1 = event.touches[0].clientY;
          y2 = event.touches[1].clientY;

          l = Math.sqrt(
            Math.pow(Math.abs(x2 - x1), 2) + Math.pow(Math.abs(y2 - y1), 2)
          ); //求两点间长度

          let lAdd = l - oldL; //长度增量
          oldL = l;

          console.log(lAdd);
          const fov = camera.fov - lAdd * 0.3;
          camera.fov = THREE.MathUtils.clamp(fov, 10, 90);
          camera.updateProjectionMatrix();
        }
      },
      false
    );
  }

  //封装鼠标控制
  function mouseController() {
    //初始化鼠标控制用变量
    let isUserInteracting = false,
      onPointerDownMouseX = 0,
      onPointerDownMouseY = 0,
      lon = -90,
      onPointerDownLon = 0,
      lat = 0,
      onPointerDownLat = 0,
      phi = 0,
      theta = 0;

    //鼠标控制视角、响应热点交互
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onMouseMove(event) {
      if (!d.MouseController) {
        return;
      }
      // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
      mouse.x = (event.clientX / el.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / el.clientHeight) * 2 + 1;
      render();
    }

    //鼠标按下到松开期间有没有移动，如果没有移动说明点击的是热点，否则是移动视角
    let clientX, clientY;
    el.addEventListener("pointerdown", function (event) {
      if (!d.MouseController) {
        return;
      }
      clientX = event.clientX;
      clientY = event.clientY;
    });
    el.addEventListener("pointerup", function (event) {
      if (!d.MouseController) {
        return;
      }
      var distance = Math.sqrt(
        Math.pow(Math.abs(event.clientX - clientX), 2) +
          Math.pow(Math.abs(event.clientY - clientY), 2)
      ); //鼠标按下到松开期间移动距离
      if (distance <= 10) {
        //这是个容差设计，在手机端如果不给差值，很可能用户的点击和松开之间会有误差
        positionClick();
      }
    });

    // 在positionClick函数中修改
    function positionClick() {
      // 通过摄像机和鼠标位置更新射线
      raycaster.setFromCamera(mouse, camera);
      // 计算物体和射线的交点
      const intersects = raycaster.intersectObjects(scene.children);
      for (let i = 0; i < intersects.length; i++) {
        if (d.debug == true) {
          console.log("点击坐标：", intersects[i].point);
          // 计算三维点对应的二维贴图坐标
          const point = intersects[i].point;
          const textureWidth = mesh.material.map.image.width;
          const textureHeight = mesh.material.map.image.height;

          // 转换为球面坐标（经纬度）
          const radius = Math.sqrt(
            point.x * point.x + point.y * point.y + point.z * point.z
          );
          const lon = Math.atan2(point.z, point.x); // 经度
          const lat = Math.asin(point.y / radius); // 纬度

          // 将经纬度映射到UV坐标(0-1范围)
          const u = (lon + Math.PI) / (2 * Math.PI); // 0-1范围的水平坐标
          const v = (Math.PI / 2 - lat) / Math.PI; // 0-1范围的垂直坐标

          // 转换为图片像素坐标
          const pixelX = Math.floor(u * textureWidth);
          const pixelY = Math.floor(v * textureHeight);

          // console.log("二维贴图坐标(UV):", { u, v });
          // console.log("图片像素坐标:", { pixelX, pixelY });

          // 如果设置了地理参考，显示绝对坐标
          if (CoordinateMapper.currentGeoReference) {
            const absoluteCoords =
              CoordinateMapper.vector3ToAbsoluteLonLat(point);
            console.log("绝对经纬度:", {
              longitude: absoluteCoords.longitude,
              latitude: absoluteCoords.latitude,
            });
          }
        }
        //检测点击热点是否跳转场地
        if (intersects[i].object.jumpTo != null && i == 0) {
          switchPhotoN(intersects[i].object.jumpTo);
          console.log(scene);
        }
      }
    }

    el.style.touchAction = "none";
    el.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("wheel", onDocumentMouseWheel);
    //计算摄像机目前视角状态，保持当前状态，在当前状态上附加变化
    lon = -1 * THREE.MathUtils.radToDeg(camera.rotation.y) - 90; //经度
    lat = THREE.MathUtils.radToDeg(camera.rotation.x); //纬度
    function onPointerDown(event) {
      if (!d.MouseController) {
        return;
      }

      //console.log(camera);

      onMouseMove(event);
      if (event.isPrimary === false) return;
      isUserInteracting = true;

      onPointerDownMouseX = event.clientX;
      onPointerDownMouseY = event.clientY;

      onPointerDownLon = lon;
      onPointerDownLat = lat;

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    }

    function onPointerMove(event) {
      if (!d.MouseController) {
        return;
      }
      if (event.isPrimary === false) return;
      let rate; //触控灵敏度
      //想写个函数来线性计算这里的灵敏度，暂时没找到合适的函数
      if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
        //判断为手机
        rate = 0.4;
      } else {
        //判断为电脑
        rate = 0.1;
      }

      //缩放视角时 暂停相机旋转
      if (mouseFovControllerSport) {
        lon = (onPointerDownMouseX - event.clientX) * rate + onPointerDownLon;
        //console.log('calc0:'+onPointerDownLat);
        lat = (event.clientY - onPointerDownMouseY) * rate + onPointerDownLat;
        //console.log('calc1:'+lat);
        update();
      }
    }

    function onPointerUp() {
      if (!d.MouseController) {
        return;
      }
      if (event.isPrimary === false) return;
      isUserInteracting = false;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    }

    function onDocumentMouseWheel(event) {
      if (!d.MouseController) {
        return;
      }
      const fov = camera.fov + event.deltaY * 0.05;
      camera.fov = THREE.MathUtils.clamp(fov, 10, 75);
      camera.updateProjectionMatrix();
    }

    function update() {
      if (isUserInteracting === false) {
        //lon += 0.1;
      }
      //console.log('lon->' + lon, 'lat->' + lat);
      lat = Math.max(-85, Math.min(85, lat));
      phi = THREE.MathUtils.degToRad(90 - lat);
      theta = THREE.MathUtils.degToRad(lon);
      const x = 500 * Math.sin(phi) * Math.cos(theta);
      const y = 500 * Math.cos(phi);
      const z = 500 * Math.sin(phi) * Math.sin(theta);
      //console.log('x=' + x + 'y=' + y + 'z=' + z);
      //console.log('x=' + THREE.MathUtils.radToDeg(camera.rotation.x), 'y=' + THREE.MathUtils.radToDeg(camera.rotation.y));
      camera.lookAt(x, y, z);
    }
  }

  //渲染
  function render() {
    if (d.DeviceOrientationControls == true) {
      //检测陀螺仪状态，比如电脑不支持陀螺仪，回调一个消息告诉前台
      if (
        camera.rotation._x == -1.5707963267948966 &&
        camera.rotation._y == 0 &&
        camera.rotation._z == 0
      ) {
        //当相机对准这个坐标表示很可能设备不支持陀螺仪
        d.gyroSport(false);
      } else {
        d.gyroSport(true);
      }
      devicecontrol.update();
    }
    renderer.render(scene, camera);
  }

  //创建外部访问接口函数
  this.re = {
    /**
     * 宽高重设
     * @param doble width 宽度
     * @param double height 高度
     */
    resizeRendererToDisplaySize: function resizeRendererToDisplaySize(
      width,
      height
    ) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      el.style.width = width + "px";
      el.style.height = height + "px";
      renderer.domElement.style.width = width + "px";
      renderer.domElement.style.height = height + "px";
    },
    /**
     * 全景照片切换函数
     * 该函数执行不一定能立刻切换，可能因为照片没有下载完毕不能切换，请于开发文档关注此方法的回调函数
     * @param int i 需要切换哪张照片
     */
    switchPhoto: function switchPhoto(i) {
      return switchPhotoN(i - 1);
    },
    /**
     * 切换体感
     * @param bool e 体感控制开关，true表示打开，false表示关闭
     */
    switchGyro: function switchGyro(e) {
      d.DeviceOrientationControls = e;
    },

    /**
     * 切换鼠标控制
     * @param bool e 鼠标控制开关
     */
    seitchMouseController: function seitchMouseController(e) {
      d.MouseController = e;
    },
  };

  // 公共API
  this.api = {
    /**
     * 切换全景照片
     * @param {number} index - 照片索引 (从1开始)
     */
    switchPhoto: function (index) {
      return switchPhotoN(index - 1);
    },

    /**
     * 切换陀螺仪控制
     * @param {boolean} enable - 是否启用
     */
    switchGyro: function (enable) {
      params.DeviceOrientationControls = enable;
    },

    /**
     * 切换鼠标控制
     * @param {boolean} enable - 是否启用
     */
    switchMouseController: function (enable) {
      params.MouseController = enable;
    },

    /**
     * 调整渲染器尺寸
     * @param {number} width - 新宽度
     * @param {number} height - 新高度
     */
    resize: function (width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },

    /**
     * 获取坐标映射器
     */
    getCoordinateMapper: function () {
      return CoordinateMapper;
    },

    /**
     * 在指定经纬度添加热点（相对坐标）
     * @param {number} lon - 经度
     * @param {number} lat - 纬度
     * @param {string} imgUrl - 热点图片URL
     * @param {string} jumpTo - 跳转目标全景名称
     */
    addHotspot: function (lon, lat, imgUrl, jumpTo) {
      const hotspotConfig = {
        source: mesh.material.map.panoName,
        lon: lon,
        lat: lat,
        imgUrl: imgUrl,
        jumpTo: jumpTo,
      };

      createHotspotFromLonLat(hotspotConfig);
    },

    /**
     * 在指定绝对经纬度添加热点
     * @param {number} absLon - 绝对经度
     * @param {number} absLat - 绝对纬度
     * @param {string} imgUrl - 热点图片URL
     * @param {string} jumpTo - 跳转目标全景名称
     */
    addAbsoluteHotspot: function (absLon, absLat, imgUrl, jumpTo) {
      const hotspotConfig = {
        source: mesh.material.map.panoName,
        targetLon: absLon,
        targetLat: absLat,
        imgUrl: imgUrl,
        jumpTo: jumpTo,
      };

      createHotspotFromAbsoluteLonLat(hotspotConfig);
    },

    /**
     * 获取当前视角的经纬度
     * @returns {Object} 当前视角的经纬度
     */
    getCurrentViewLonLat: function () {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.multiplyScalar(500);
      return CoordinateMapper.vector3ToLonLat(direction);
    },

    /**
     * 获取当前视角的绝对经纬度
     * @returns {Object} 当前视角的绝对经纬度
     */
    getCurrentViewAbsoluteLonLat: function () {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.multiplyScalar(500);
      return CoordinateMapper.vector3ToAbsoluteLonLat(direction);
    },

    /**
     * 获取当前拍摄点的地理信息
     * @returns {Object} 当前拍摄点的地理参考
     */
    getCurrentGeoReference: function () {
      return CoordinateMapper.getGeoReference();
    },

    /**
     * 将相机看向指定经纬度
     * @param {number} lon - 经度
     * @param {number} lat - 纬度
     */
    lookAtLonLat: function (lon, lat) {
      const target = CoordinateMapper.lonLatToVector3(lon, lat);
      camera.lookAt(target);
    },

    /**
     * 将相机看向指定绝对经纬度
     * @param {number} absLon - 绝对经度
     * @param {number} absLat - 绝对纬度
     */
    lookAtAbsoluteLonLat: function (absLon, absLat) {
      const target = CoordinateMapper.absoluteLonLatToVector3(absLon, absLat);
      camera.lookAt(target);
    },

    /**
     * 计算到指定经纬度的距离和方位
     * @param {number} targetLon - 目标经度
     * @param {number} targetLat - 目标纬度
     * @returns {Object} 距离和方位信息
     */
    calculateTargetInfo: function (targetLon, targetLat) {
      if (!CoordinateMapper.currentGeoReference) {
        return { distance: 0, bearing: 0 };
      }

      const distance = CoordinateMapper.calculateDistance(
        CoordinateMapper.currentGeoReference.longitude,
        CoordinateMapper.currentGeoReference.latitude,
        targetLon,
        targetLat
      );

      const bearing = CoordinateMapper.calculateBearing(targetLon, targetLat);

      return { distance, bearing };
    },
  };
}
