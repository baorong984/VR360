function TPano(dobj) {
  //选取渲染对象的根dom
  let el = document.getElementById(dobj.el);
  var width = el.clientWidth;
  var height = el.clientHeight;

  //地理坐标原点（全景拍摄点）
  let geoOrigin = {
    longitude: 0,
    latitude: 0,
    altitude: 0,
  };

  //参数处理
  if (dobj.DeviceOrientationControls == null) {
    dobj.DeviceOrientationControls = false;
  }
  if (dobj.MouseController == null) {
    dobj.MouseController = true;
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
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    // 添加以下设置
    depth: true,
    stencil: false,
    preserveDrawingBuffer: false,
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
  loadTextureLoader(loadTextureLoaderCount);

  function loadTextureLoader(i) {
    if (dobj.photo[i].type == "VIDEO") {
      el.insertAdjacentHTML(
        "beforeend",
        '<video id="video-' +
          i +
          '" loop muted style="display: none;" crossOrigin="anonymous" playsinline ><source src="' +
          dobj.photo[i].url +
          '"></video>'
      );
      let videoId = "video-" + i;
      let videoDom = document.getElementById(videoId);
      videoDom.play();
      texture[i] = new THREE.VideoTexture(videoDom);
      setTimeout(() => {
        loadTextureLoaderEnd(dobj.photo[i]);
      }, 2000);
    } else {
      texture[i] = new THREE.TextureLoader().load(
        dobj.photo[i].url,
        function () {
          loadTextureLoaderEnd(dobj.photo[i]);
        },
        function (e) {
          console.log(e);
        },
        function (err) {
          console.error("An error happened.");
        }
      );
    }
  }

  /**
   *@description: 加载纹理完成回调
   *@param:
   *@return: void
   *@author:  baorong
   *@Date: 2025-09-30 14:02:25
   */
  var loadTextureMsg;
  function loadTextureLoaderEnd(photo) {
    let i = loadTextureLoaderCount;
    const photo_name = photo.name;
    texture[i].panoName = photo_name;

    loadTextureMsg = {
      all: dobj.photo.length,
      loading: {
        id: i + 1,
        name: photo_name,
      },
      Leftover: dobj.photo.length - i - 1,
    };
    if (dobj.photoLoad != null) {
      dobj.photoLoad(loadTextureMsg);
    }
    if (loadTextureLoaderCount == 0) {
      switchPhotoN(0);
    }
    if (loadTextureLoaderCount < dobj.photo.length - 1) {
      loadTextureLoader(++loadTextureLoaderCount);
    }
  }

  function switchGo(i) {
    let photo = dobj.photo[i];
    //初始化中心经纬度
    geoOrigin.longitude = photo.geoReference?.longitude || 0;
    geoOrigin.latitude = photo.geoReference?.latitude || 0;
    geoOrigin.altitude = photo.geoReference?.altitude || 0;

    let fov;
    if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
      try {
        fov = photo.fov.phone;
      } catch (error) {
        fov = null;
      }
    } else {
      try {
        fov = photo.fov.pc;
      } catch (error) {
        fov = null;
      }
    }
    if (fov != null) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    } else {
      if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
        fov = 90;
      } else {
        fov = 60;
      }
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    console.log(texture);
    material = new THREE.MeshBasicMaterial({ map: texture[i] });
    mesh.material = material;
    // 在创建或更新mesh后添加旋转代码
    mesh.rotation.y = (Math.PI / 180) * 160; // 170度（弧度制）
    cleanHotspot();
    if (dobj.hotspot != null) {
      initHotspot(dobj.photo[i].img_id);
    }
    response = {
      status: "OK",
      msg: "切换成功",
    };
  }

  function switchPhotoN(i) {
    let response = {
      status: "ERROR",
      msg: "系统出错",
    };

    if (i < dobj.photo.length && i >= 0) {
      if (loadTextureMsg.all - loadTextureMsg.Leftover >= i + 1) {
        if (dobj.switchLoad != null) {
          dobj.switchLoad({
            loading: {
              id: i + 1,
              name: dobj.photo[i].name,
            },
            status: "end",
          });
        }
        switchGo(i);
      } else {
        if (dobj.switchLoad != null) {
          dobj.switchLoad({
            loading: {
              id: i + 1,
              name: dobj.photo[i].name,
            },
            status: "loading",
          });
        }
        setTimeout(switchPhotoN, 1000, i);
      }
    } else {
      response.msg = "无效的照片索引";
    }

    return response;
  }

  /**
   * 将地理坐标(经纬度,高度)转换为三维坐标(x,y,z)
   */
  function geoTo3D(
    longitude,
    latitude,
    altitude,
    originLon,
    originLat,
    originAlt
  ) {
    const R = 6371000; // 地球半径(米)

    // 将经纬度转换为弧度
    const lonRad = THREE.MathUtils.degToRad(longitude);
    const latRad = THREE.MathUtils.degToRad(latitude);
    const originLonRad = THREE.MathUtils.degToRad(originLon);
    const originLatRad = THREE.MathUtils.degToRad(originLat);

    // 计算相对于原点的偏移量
    const deltaLon = lonRad - originLonRad;
    const deltaLat = latRad - originLatRad;

    // 使用平面近似（适用于小范围）
    // 高度方向：y轴正方向（上）
    const x = deltaLon * R * Math.cos(originLatRad);
    const z = deltaLat * R;
    const y = altitude - originAlt;

    return new THREE.Vector3(x, y, z);
  }

  //生成热点
  let hotspotAnimate_count = 1;
  let hotspotAnimate_temp = Array();
  function initHotspot(img_id) {
    for (let j = 0; j < dobj.hotspot.length; j++) {
      // 只初始化当前照片的热点
      if (dobj.hotspot[j].details?.img_id == img_id) {
        continue;
      }
      let map = new THREE.TextureLoader().load(dobj.hotspot[j].imgUrl);

      // 优化的材质设置，防止热点被遮住
      let material = new THREE.SpriteMaterial({
        map: map,
        transparent: true,
        depthTest: false, // 禁用深度测试
        depthWrite: false, // 不写入深度缓冲区
        alphaTest: 0.1,
        blending: THREE.NormalBlending, // 使用正常混合模式
      });

      let sprite = new THREE.Sprite(material);

      // 处理地理坐标热点
      if (dobj.hotspot[j].geoReference) {
        const geoPos = dobj.hotspot[j].geoReference;
        const threeDPos = geoTo3D(
          geoPos.longitude,
          geoPos.latitude,
          geoPos.altitude,
          geoOrigin.longitude,
          geoOrigin.latitude,
          geoOrigin.altitude
        );
        // 补偿全景球的X轴翻转
        threeDPos.x = -threeDPos.x;

        // 将三维坐标投影到球面上，并增加向外偏移距离（从501增加到505）
        const direction = threeDPos.normalize();
        const spherePos = direction.multiplyScalar(505);

        sprite.position.copy(spherePos);
      }
      // 处理传统的三维坐标热点（向后兼容）
      else if (dobj.hotspot[j].position) {
        const position = dobj.hotspot[j].position;
        const direction = new THREE.Vector3(
          position.x,
          position.y,
          position.z
        ).normalize();

        // 沿着方向向量增加向外偏移距离（从0.91调整到0.95）
        sprite.position.set(
          position.x * 0.95,
          position.y * 0.95,
          position.z * 0.95
        );
      }

      sprite.scale.set(30, 30, 1);
      sprite.renderOrder = 9999; // 增加渲染顺序优先级
      sprite.name = "hotspot";

      //绑定额外的属性
      sprite.details = dobj.hotspot[j].details;
      //绑定跳转属性
      sprite.jumpTo = dobj.hotspot[j].jumpTo ? true : false;
      scene.add(sprite);
    }

    for (let i = 0; i < scene.children.length; i++) {
      if (scene.children[i].name == "hotspot") {
        hotspotAnimate_temp[i] = scene.children[i].position.y;
      }
    }
  }

  //清除热点
  function cleanHotspot() {
    let children = scene.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i].name == "hotspot") {
        scene.children.splice(i, 1);
        i--;
      }
    }
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
  function animate() {
    requestAnimationFrame(animate);

    //热点摆动
    for (let i = 0; i < scene.children.length; i++) {
      if (scene.children[i].name == "hotspot") {
        if (hotspotAnimate_count >= 400) {
          hotspotAnimate_count = 1;
          scene.children[i].position.y = hotspotAnimate_temp[i];
        }

        if (hotspotAnimate_count <= 200) {
          scene.children[i].position.y = scene.children[i].position.y + 0.04;
        } else {
          scene.children[i].position.y = scene.children[i].position.y - 0.04;
        }

        hotspotAnimate_count++;
      }
    }

    render();
  }
  animate();

  //镜头自由旋转
  let anglexoz = -90;
  var rotateAnimateController = dobj.rotateAnimateController;
  function rotateAnimate() {
    if (
      rotateAnimateController == true &&
      dobj.DeviceOrientationControls == false
    ) {
      anglexoz += 0.1;
      if (anglexoz > 360) {
        anglexoz = 0;
      }
      let x = Math.cos((anglexoz * Math.PI) / 180) * 500;
      let z = Math.sin((anglexoz * Math.PI) / 180) * 500;
      camera.lookAt(x, 0, z);
    }
  }
  setInterval(rotateAnimate, 1000 / 60);

  el.addEventListener("pointerdown", function () {
    if (dobj.MouseController) {
      rotateAnimateController = false;
    }
  });

  //手机端多点触控
  let mouseFovControllerSport = true;
  function phoneController() {
    let oldL = 0;
    let x1, x2, y1, y2, l;
    document.addEventListener(
      "touchstart",
      function (event) {
        if (!dobj.MouseController) {
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
          );
        } else {
          mouseFovControllerSport = true;
        }
      },
      false
    );
    document.addEventListener(
      "touchmove",
      function (event) {
        if (!dobj.MouseController) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.touches.length == 2) {
          x1 = event.touches[0].clientX;
          x2 = event.touches[1].clientX;
          y1 = event.touches[0].clientY;
          y2 = event.touches[1].clientY;

          l = Math.sqrt(
            Math.pow(Math.abs(x2 - x1), 2) + Math.pow(Math.abs(y2 - y1), 2)
          );

          let lAdd = l - oldL;
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
    let isUserInteracting = false,
      onPointerDownMouseX = 0,
      onPointerDownMouseY = 0,
      lon = -90,
      onPointerDownLon = 0,
      lat = 0,
      onPointerDownLat = 0,
      phi = 0,
      theta = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onMouseMove(event) {
      if (!dobj.MouseController) {
        return;
      }
      mouse.x = (event.clientX / el.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / el.clientHeight) * 2 + 1;
      render();
    }

    let clientX, clientY;
    el.addEventListener("pointerdown", function (event) {
      if (!dobj.MouseController) {
        return;
      }
      clientX = event.clientX;
      clientY = event.clientY;
    });
    el.addEventListener("pointerup", function (event) {
      if (!dobj.MouseController) {
        return;
      }
      var distance = Math.sqrt(
        Math.pow(Math.abs(event.clientX - clientX), 2) +
          Math.pow(Math.abs(event.clientY - clientY), 2)
      );
      if (distance <= 10) {
        positionClick();
      }
    });

    function positionClick() {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      for (let i = 0; i < intersects.length; i++) {
        const item = intersects[i].object;
        if (
          dobj.debug == true &&
          item.jumpTo == true &&
          item.name == "hotspot"
        ) {
          //点击的热点，判断是否有跳转
          if (dobj.onHotspotClick != null) {
            dobj.onHotspotClick(intersects[i].object.details);
          }
        }
      }
    }

    el.style.touchAction = "none";
    el.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("wheel", onDocumentMouseWheel);

    lon = -1 * THREE.MathUtils.radToDeg(camera.rotation.y) - 90;
    lat = THREE.MathUtils.radToDeg(camera.rotation.x);

    function onPointerDown(event) {
      if (!dobj.MouseController) {
        return;
      }

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
      if (!dobj.MouseController) {
        return;
      }
      if (event.isPrimary === false) return;
      let rate;
      if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
        rate = 0.4;
      } else {
        rate = 0.1;
      }

      if (mouseFovControllerSport) {
        lon = (onPointerDownMouseX - event.clientX) * rate + onPointerDownLon;
        lat = (event.clientY - onPointerDownMouseY) * rate + onPointerDownLat;
        update();
      }
    }

    function onPointerUp() {
      if (!dobj.MouseController) {
        return;
      }
      if (event.isPrimary === false) return;
      isUserInteracting = false;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    }

    function onDocumentMouseWheel(event) {
      if (!dobj.MouseController) {
        return;
      }
      const fov = camera.fov + event.deltaY * 0.05;
      camera.fov = THREE.MathUtils.clamp(fov, 10, 75);
      camera.updateProjectionMatrix();
    }

    function update() {
      if (isUserInteracting === false) {
      }
      lat = Math.max(-85, Math.min(85, lat));
      phi = THREE.MathUtils.degToRad(90 - lat);
      theta = THREE.MathUtils.degToRad(lon);
      const x = 500 * Math.sin(phi) * Math.cos(theta);
      const y = 500 * Math.cos(phi);
      const z = 500 * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(x, y, z);
    }
  }

  //渲染
  function render() {
    if (dobj.DeviceOrientationControls == true) {
      if (
        camera.rotation._x == -1.5707963267948966 &&
        camera.rotation._y == 0 &&
        camera.rotation._z == 0
      ) {
        dobj.gyroSport(false);
      } else {
        dobj.gyroSport(true);
      }
      devicecontrol.update();
    }
    renderer.render(scene, camera);
  }

  //创建外部访问接口函数
  this.re = {
    /**
     * 宽高重设
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
     */
    switchPhoto: function switchPhoto(i) {
      return switchPhotoN(i);
    },

    /**
     * 切换体感
     */
    switchGyro: function switchGyro(e) {
      dobj.DeviceOrientationControls = e;
    },

    /**
     * 切换鼠标控制
     */
    seitchMouseController: function seitchMouseController(e) {
      dobj.MouseController = e;
    },

    /**
     * 地理坐标转三维坐标
     */
    geoTo3D: function (longitude, latitude, altitude) {
      return geoTo3D(
        longitude,
        latitude,
        altitude,
        geoOrigin.longitude,
        geoOrigin.latitude,
        geoOrigin.altitude
      );
    },

    /**
     * 三维坐标转地理坐标
     */
    threeDToGeo: function (x, y, z) {
      const R = 6371000;
      const originLonRad = THREE.MathUtils.degToRad(geoOrigin.longitude);
      const originLatRad = THREE.MathUtils.degToRad(geoOrigin.latitude);

      const deltaLon = x / (R * Math.cos(originLatRad));
      const deltaLat = z / R;

      const longitude =
        geoOrigin.longitude + THREE.MathUtils.radToDeg(deltaLon);
      const latitude = geoOrigin.latitude + THREE.MathUtils.radToDeg(deltaLat);
      const altitude = geoOrigin.altitude + y;

      return { longitude, latitude, altitude };
    },
  };
}
