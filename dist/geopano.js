/*
 * @Author: Maicro-bao baorong@airia.cn
 * @Description: 地理参考全景查看器 - 支持拍摄点经纬度配置
 * @FilePath: \VR360\dist\geopano.js
 */
function GeoPano(config) {
  // 选取渲染对象的根DOM
  const el = document.getElementById(config.el);
  const width = el.clientWidth;
  const height = el.clientHeight;

  // 参数处理与默认值
  const params = {
    DeviceOrientationControls: config.DeviceOrientationControls || false,
    MouseController: config.MouseController !== false,
    photo: config.photo || [],
    hotspot: config.hotspot || [],
    photoLoad: config.photoLoad || null,
    switchLoad: config.switchLoad || null,
    gyroSport: config.gyroSport || null,
    debug: config.debug || false,
    rotateAnimateController: config.rotateAnimateController || false,
  };

  // 初始化Three.js场景
  const scene = new THREE.Scene();

  // 根据设备类型设置FOV
  const isMobile = el.clientWidth <= 700 || el.clientWidth < el.clientHeight;
  const fov = isMobile ? 90 : 60;

  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });

  renderer.setSize(width, height);
  renderer.setClearColor(0x272727, 1.0);
  renderer.setPixelRatio(window.devicePixelRatio);
  el.appendChild(renderer.domElement);

  // 创建全景球体
  const geometry = new THREE.SphereBufferGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1); // 内外翻转
  const mesh = new THREE.Mesh(geometry);
  scene.add(mesh);

  // 纹理加载管理
  const textures = [];
  let currentTextureIndex = 0;
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
      radius = 500,
      scale = 0.9
    ) {
      if (!this.currentGeoReference) {
        console.warn("未设置拍摄点地理参考，使用默认转换");
        return this.lonLatToVector3(absLon, absLat, radius, scale);
      }

      // 计算相对于拍摄点的偏移量（简化版，适用于小范围）
      const deltaLon = absLon - this.currentGeoReference.longitude;
      const deltaLat = absLat - this.currentGeoReference.latitude;

      // 将地理偏移量转换为球面角度
      // 注意：这是简化计算，实际需要考虑地球曲率，但对于全景应用通常足够
      const lon =
        deltaLon *
        Math.cos((this.currentGeoReference.latitude * Math.PI) / 180);
      const lat = deltaLat;

      return this.lonLatToVector3(lon, lat, radius, scale);
    },

    /**
     * 将相对角度转换为3D球面坐标（基础方法）
     * @param {number} lon - 经度偏移量（度）
     * @param {number} lat - 纬度偏移量（度）
     * @param {number} radius - 球体半径
     * @param {number} scale - 缩放系数
     * @returns {THREE.Vector3} 3D坐标
     */
    lonLatToVector3: function (lon, lat, radius = 500, scale = 0.9) {
      const effectiveRadius = radius * scale;

      // 转换为球坐标
      const phi = (90 - lat) * (Math.PI / 180); // 极角 (0 到 π)
      const theta = (lon + 90) * (Math.PI / 180); // 方位角 (0 到 2π)

      const x = effectiveRadius * Math.sin(phi) * Math.cos(theta);
      const y = effectiveRadius * Math.cos(phi);
      const z = effectiveRadius * Math.sin(phi) * Math.sin(theta);

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
     * 将3D坐标转换为相对经纬度（基础方法）
     */
    vector3ToLonLat: function (position, radius = 500) {
      const { x, y, z } = position;

      const actualRadius = Math.sqrt(x * x + y * y + z * z);
      const lon = Math.atan2(z, x);
      const lat = Math.asin(y / actualRadius);

      const longitude_deg = THREE.MathUtils.radToDeg(lon);
      const latitude_deg = THREE.MathUtils.radToDeg(lat);

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
      const bearing = Math.atan2(y, x);

      return ((bearing * 180) / Math.PI + 360) % 360;
    },
  };

  // 加载纹理
  function loadTextureLoader(index) {
    if (index >= params.photo.length) return;

    const photo = params.photo[index];

    if (photo.type === "VIDEO") {
      // 视频纹理处理
      const videoHtml = `<video id="video-${index}" loop muted style="display: none;" crossOrigin="anonymous" playsinline>
        <source src="${photo.url}">
      </video>`;
      el.insertAdjacentHTML("beforeend", videoHtml);

      const videoDom = document.getElementById(`video-${index}`);
      videoDom.play();
      textures[index] = new THREE.VideoTexture(videoDom);

      setTimeout(() => loadTextureLoaderEnd(index), 2000);
    } else {
      // 图片纹理处理
      textures[index] = new THREE.TextureLoader().load(
        photo.url,
        () => loadTextureLoaderEnd(index),
        null,
        (err) => console.error("纹理加载错误:", err)
      );
    }
  }

  function loadTextureLoaderEnd(index) {
    const photo = params.photo[index];
    textures[index].panoName = photo.name;

    // 设置当前全景的地理参考
    if (photo.geoReference) {
      CoordinateMapper.setGeoReference(photo.geoReference);
    }

    const loadMsg = {
      all: params.photo.length,
      loading: {
        id: index + 1,
        name: photo.name,
        geoReference: photo.geoReference, // 包含地理信息
      },
      leftover: params.photo.length - index - 1,
    };

    if (params.photoLoad) {
      params.photoLoad(loadMsg);
    }

    if (index === 0) {
      switchPhotoN(0);
    }

    if (index < params.photo.length - 1) {
      loadTextureLoader(++loadTextureLoaderCount);
    }
  }

  // 切换全景照片
  function switchPhotoN(index) {
    if (index < 0 || index >= params.photo.length) {
      return { status: "ERROR", msg: "无效的照片索引" };
    }

    const photo = params.photo[index];

    // 检查加载状态
    const loadedCount = loadTextureLoaderCount + 1;
    if (loadedCount < index + 1) {
      if (params.switchLoad) {
        params.switchLoad({
          loading: { id: index + 1, name: photo.name },
          status: "loading",
        });
      }
      setTimeout(() => switchPhotoN(index), 1000);
      return { status: "LOADING", msg: "图片加载中" };
    }

    // 设置相机FOV
    let targetFov;
    if (photo.geoReference && photo.geoReference.fov) {
      if (isMobile && photo.geoReference.fov.phone) {
        targetFov = photo.geoReference.fov.phone;
      } else if (!isMobile && photo.geoReference.fov.pc) {
        targetFov = photo.geoReference.fov.pc;
      }
    }

    if (!targetFov) {
      targetFov = isMobile ? 90 : 60;
    }

    camera.fov = targetFov;
    camera.updateProjectionMatrix();

    // 应用新纹理
    const material = new THREE.MeshBasicMaterial({ map: textures[index] });
    mesh.material = material;

    // 设置新的地理参考
    if (photo.geoReference) {
      CoordinateMapper.setGeoReference(photo.geoReference);
    }

    // 清理并重新创建热点
    cleanHotspot();
    if (params.hotspot.length > 0) {
      initHotspot();
    }

    currentTextureIndex = index;

    if (params.switchLoad) {
      params.switchLoad({
        loading: {
          id: index + 1,
          name: photo.name,
          geoReference: photo.geoReference,
        },
        status: "end",
      });
    }

    return {
      status: "OK",
      msg: "切换成功",
      geoReference: photo.geoReference,
    };
  }

  // 初始化热点（使用绝对经纬度）
  let hotspotAnimateCount = 1;
  const hotspotOriginalY = [];

  function initHotspot() {
    const currentPanoName = mesh.material.map.panoName;

    params.hotspot.forEach((hotspot, j) => {
      if (hotspot.source === currentPanoName) {
        createHotspotFromAbsoluteLonLat(hotspot);
      }
    });
  }

  /**
   * 根据绝对经纬度创建热点
   */
  function createHotspotFromAbsoluteLonLat(hotspotConfig) {
    const map = new THREE.TextureLoader().load(hotspotConfig.imgUrl);
    const material = new THREE.SpriteMaterial({ map: map });
    const sprite = new THREE.Sprite(material);

    // 使用绝对经纬度计算3D位置
    let position;
    if (
      hotspotConfig.targetLon !== undefined &&
      hotspotConfig.targetLat !== undefined
    ) {
      position = CoordinateMapper.absoluteLonLatToVector3(
        hotspotConfig.targetLon,
        hotspotConfig.targetLat
      );

      // 计算距离和方位角（用于调试或显示）
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
    } else if (hotspotConfig.position) {
      // 向后兼容：使用已有的3D坐标
      position = new THREE.Vector3(
        hotspotConfig.position.x * 0.9,
        hotspotConfig.position.y * 0.9,
        hotspotConfig.position.z * 0.9
      );
    } else {
      console.warn("热点配置缺少位置信息:", hotspotConfig);
      return;
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
      config: hotspotConfig,
      type: "absolute_coordinate",
    };

    scene.add(sprite);
    hotspotOriginalY.push(sprite.position.y);
  }

  // 清理热点
  function cleanHotspot() {
    const children = scene.children;
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i].name === "hotspot") {
        scene.remove(children[i]);
      }
    }
    hotspotOriginalY.length = 0;
  }

  // 设备方向控制
  let deviceControl;
  try {
    deviceControl = new THREE.DeviceOrientationControls(camera);
  } catch (error) {
    deviceControl = null;
    if (params.gyroSport) {
      params.gyroSport(false);
    }
  }

  // 初始化控制器（简化版）
  function initMouseController() {
    console.log("鼠标控制器已初始化");
  }

  function initTouchController() {
    console.log("触摸控制器已初始化");
  }

  // 动画循环
  function animate() {
    requestAnimationFrame(animate);
    animateHotspots();
    render();
  }
  animate();

  // 热点动画
  function animateHotspots() {
    let hotspotIndex = 0;

    for (let i = 0; i < scene.children.length; i++) {
      if (scene.children[i].name === "hotspot") {
        const hotspot = scene.children[i];

        if (hotspotAnimateCount >= 400) {
          hotspotAnimateCount = 1;
          hotspot.position.y = hotspotOriginalY[hotspotIndex];
        }

        if (hotspotAnimateCount <= 200) {
          hotspot.position.y += 0.04;
        } else {
          hotspot.position.y -= 0.04;
        }

        hotspotAnimateCount++;
        hotspotIndex++;
      }
    }
  }

  // 渲染函数
  function render() {
    if (params.DeviceOrientationControls && deviceControl) {
      deviceControl.update();
    }
    renderer.render(scene, camera);
  }

  // 公共API
  this.api = {
    /**
     * 切换全景照片
     */
    switchPhoto: function (index) {
      return switchPhotoN(index - 1);
    },

    /**
     * 切换陀螺仪控制
     */
    switchGyro: function (enable) {
      params.DeviceOrientationControls = enable;
    },

    /**
     * 切换鼠标控制
     */
    switchMouseController: function (enable) {
      params.MouseController = enable;
    },

    /**
     * 调整渲染器尺寸
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
     * 在指定绝对经纬度添加热点
     */
    addHotspot: function (absLon, absLat, imgUrl, jumpTo) {
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
     * 获取当前拍摄点的地理信息
     */
    getCurrentGeoReference: function () {
      return CoordinateMapper.getGeoReference();
    },

    /**
     * 获取当前视角对应的绝对经纬度
     */
    getCurrentViewAbsoluteLonLat: function () {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.multiplyScalar(500);

      return CoordinateMapper.vector3ToAbsoluteLonLat(direction);
    },

    /**
     * 将相机看向指定绝对经纬度
     */
    lookAtAbsoluteLonLat: function (absLon, absLat) {
      const target = CoordinateMapper.absoluteLonLatToVector3(absLon, absLat);
      camera.lookAt(target);
    },

    /**
     * 计算到指定经纬度的距离和方位
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

  // 开始加载纹理
  if (params.photo.length > 0) {
    loadTextureLoader(loadTextureLoaderCount);
  }

  // 初始化控制器
  initMouseController();
  initTouchController();
}
